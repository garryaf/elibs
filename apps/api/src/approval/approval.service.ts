import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApprovalStatus, ApprovalType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../laboratory/audit/audit.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApproveApprovalDto } from './dto/approve-approval.dto';
import { RejectApprovalDto } from './dto/reject-approval.dto';
import { IApprovalService } from './interfaces/approval.interface';
import {
  resolveDiscountRoutingRule,
} from './discount-routing.config';
import { DiscountApprovalPayload } from './discount-approval.service';

@Injectable()
export class ApprovalService implements IApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new approval request.
   */
  async create(dto: CreateApprovalDto) {
    return this.prisma.approvalRequest.create({
      data: {
        requestType: dto.requestType,
        requesterId: dto.requesterId,
        maxLevel: dto.maxLevel ?? 1,
        payload: dto.payload as any,
      },
      include: { steps: true },
    });
  }

  /**
   * Approve the current level of an approval request.
   * If all levels are approved, mark the request as APPROVED.
   * For DISCOUNT requests, validates approver role and applies discount on final approval.
   */
  async approve(id: string, dto: ApproveApprovalDto) {
    const request = await this.findOneOrFail(id);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve request with status '${request.status}'. Only PENDING requests can be approved.`,
      );
    }

    // Validate the approver is authorized for the current level
    await this.validateApproverAuthorized(dto.approverId, request.currentLevel, request);

    // Record the approval step
    await this.prisma.approvalStep.create({
      data: {
        approvalRequestId: id,
        level: request.currentLevel,
        approverId: dto.approverId,
        action: 'APPROVED',
        comment: dto.comment,
      },
    });

    const newLevel = request.currentLevel + 1;

    // If all levels approved, mark as APPROVED
    if (newLevel > request.maxLevel) {
      const updatedRequest = await this.prisma.approvalRequest.update({
        where: { id },
        data: {
          currentLevel: newLevel,
          status: ApprovalStatus.APPROVED,
          resolvedAt: new Date(),
        },
        include: { steps: true },
      });

      // For DISCOUNT requests, apply discount to order on final approval (Requirement 9.3)
      if (request.requestType === ApprovalType.DISCOUNT) {
        await this.applyDiscountFromApproval(request.payload as unknown as DiscountApprovalPayload);
      }

      // Requirement 15.5: Explicit audit log for approval action
      await this.auditService.log(
        dto.approverId,
        'APPROVAL_APPROVED',
        'ApprovalRequest',
        id,
        { status: ApprovalStatus.PENDING, currentLevel: request.currentLevel },
        { status: ApprovalStatus.APPROVED, currentLevel: newLevel, requestType: request.requestType },
      );

      return updatedRequest;
    }

    // Otherwise, increment the current level
    return this.prisma.approvalRequest.update({
      where: { id },
      data: { currentLevel: newLevel },
      include: { steps: true },
    });
  }

  /**
   * Reject an approval request at any level.
   * Immediately sets the status to REJECTED.
   * For DISCOUNT requests, validates approver role before rejecting.
   */
  async reject(id: string, dto: RejectApprovalDto) {
    const request = await this.findOneOrFail(id);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Cannot reject request with status '${request.status}'. Only PENDING requests can be rejected.`,
      );
    }

    // Validate the approver is authorized for the current level
    await this.validateApproverAuthorized(dto.approverId, request.currentLevel, request);

    // Record the rejection step
    await this.prisma.approvalStep.create({
      data: {
        approvalRequestId: id,
        level: request.currentLevel,
        approverId: dto.approverId,
        action: 'REJECTED',
        comment: dto.comment,
      },
    });

    // Set status to REJECTED immediately
    const updatedRequest = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        reason: dto.reason,
        resolvedAt: new Date(),
      },
      include: { steps: true },
    });

    // Requirement 15.5: Explicit audit log for rejection action
    await this.auditService.log(
      dto.approverId,
      'APPROVAL_REJECTED',
      'ApprovalRequest',
      id,
      { status: ApprovalStatus.PENDING, currentLevel: request.currentLevel },
      { status: ApprovalStatus.REJECTED, reason: dto.reason, requestType: request.requestType },
    );

    return updatedRequest;
  }

  /**
   * List approval requests with optional filters.
   */
  async findAll(filters?: {
    requestType?: ApprovalType;
    status?: ApprovalStatus;
  }) {
    const where: any = {};

    if (filters?.requestType) {
      where.requestType = filters.requestType;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.approvalRequest.findMany({
      where,
      include: { steps: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single approval request by ID with its steps.
   */
  async findOne(id: string) {
    return this.findOneOrFail(id);
  }

  /**
   * Validate that the given level is the correct next level to approve.
   * Used internally to enforce sequential approval.
   */
  validateApprovalLevel(requestCurrentLevel: number, attemptedLevel: number) {
    if (attemptedLevel !== requestCurrentLevel) {
      throw new UnprocessableEntityException(
        `Cannot approve level ${attemptedLevel}. Current approval level is ${requestCurrentLevel}.`,
      );
    }
  }

  /**
   * Validate that the approver is authorized for the given level.
   * For DISCOUNT requests, validates role against DiscountRoutingConfig allowed roles.
   * For other types, any valid UUID is currently accepted (extensible for future types).
   *
   * Requirement 9.5: Validate approver's role against configured allowed roles.
   */
  private async validateApproverAuthorized(
    approverId: string,
    level: number,
    request?: { requestType: ApprovalType; payload: any },
  ) {
    if (!approverId) {
      throw new UnprocessableEntityException(
        `Approver ID is required for level ${level}.`,
      );
    }

    // For DISCOUNT requests, enforce role-based authorization
    if (request?.requestType === ApprovalType.DISCOUNT) {
      const payload = request.payload as unknown as DiscountApprovalPayload;
      const user = await this.prisma.user.findUnique({
        where: { id: approverId },
        select: { role: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID '${approverId}' not found.`);
      }

      const routingRule = resolveDiscountRoutingRule(payload.discountPercent);
      if (routingRule && !routingRule.allowedRoles.includes(user.role)) {
        throw new ForbiddenException(
          `User role '${user.role}' is not authorized to approve discounts of ${payload.discountPercent}%. ` +
          `Allowed roles: ${routingRule.allowedRoles.join(', ')}.`,
        );
      }
    }
  }

  /**
   * Apply discount to order when a DISCOUNT approval reaches final level.
   * Populates Order.discountAmount and Order.discountReason from the approval payload.
   *
   * Requirement 9.3: Populate Order.discountAmount and Order.discountReason
   * from approved request.
   */
  private async applyDiscountFromApproval(payload: DiscountApprovalPayload): Promise<void> {
    await this.prisma.order.update({
      where: { id: payload.orderId },
      data: {
        discountAmount: new Decimal(payload.discountAmount),
        discountReason: payload.discountReason,
      },
    });
  }

  private async findOneOrFail(id: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
      include: { steps: { orderBy: { actedAt: 'asc' } } },
    });

    if (!request) {
      throw new NotFoundException(`Approval request with ID '${id}' not found.`);
    }

    return request;
  }

  // ─── IApprovalService Implementation ──────────────────────────────────────────

  /**
   * Create an approval request via the interface contract.
   * Maps generic parameters to the internal CreateApprovalDto flow.
   */
  async createRequest(
    type: string,
    requesterId: string,
    payload: unknown,
    maxLevel?: number,
  ): Promise<{ id: string; status: string }> {
    const result = await this.prisma.approvalRequest.create({
      data: {
        requestType: type as ApprovalType,
        requesterId,
        maxLevel: maxLevel ?? 1,
        payload: payload as any,
      },
    });
    return { id: result.id, status: result.status };
  }

  /**
   * Get the status of an approval request via the interface contract.
   */
  async getRequestStatus(
    id: string,
  ): Promise<{ id: string; status: string; currentLevel: number }> {
    const request = await this.findOneOrFail(id);
    return {
      id: request.id,
      status: request.status,
      currentLevel: request.currentLevel,
    };
  }
}
