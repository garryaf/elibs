import {
  Injectable,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, ApprovalType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApproveApprovalDto } from './dto/approve-approval.dto';
import { RejectApprovalDto } from './dto/reject-approval.dto';
import { IApprovalService } from './interfaces/approval.interface';

@Injectable()
export class ApprovalService implements IApprovalService {
  constructor(private readonly prisma: PrismaService) {}

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
   */
  async approve(id: string, dto: ApproveApprovalDto) {
    const request = await this.findOneOrFail(id);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve request with status '${request.status}'. Only PENDING requests can be approved.`,
      );
    }

    // Validate the approver is authorized for the current level
    this.validateApproverAuthorized(dto.approverId, request.currentLevel);

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
      return this.prisma.approvalRequest.update({
        where: { id },
        data: {
          currentLevel: newLevel,
          status: ApprovalStatus.APPROVED,
          resolvedAt: new Date(),
        },
        include: { steps: true },
      });
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
   */
  async reject(id: string, dto: RejectApprovalDto) {
    const request = await this.findOneOrFail(id);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Cannot reject request with status '${request.status}'. Only PENDING requests can be rejected.`,
      );
    }

    // Validate the approver is authorized for the current level
    this.validateApproverAuthorized(dto.approverId, request.currentLevel);

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
    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        reason: dto.reason,
        resolvedAt: new Date(),
      },
      include: { steps: true },
    });
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
   * For now, any valid UUID is considered authorized.
   * This can be enhanced with role/permission checks later.
   */
  private validateApproverAuthorized(approverId: string, level: number) {
    // Authorization validation placeholder.
    // In a full implementation, this would check if the approver
    // has the correct role/permission for the given approval level.
    if (!approverId) {
      throw new UnprocessableEntityException(
        `Approver ID is required for level ${level}.`,
      );
    }
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
