import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ApprovalStatus, ApprovalType, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../laboratory/audit/audit.service';
import {
  resolveDiscountRoutingRule,
  DISCOUNT_ROUTING_CONFIG,
  DiscountRoutingRule,
} from './discount-routing.config';

/**
 * Payload shape stored in ApprovalRequest.payload for DISCOUNT requests.
 */
export interface DiscountApprovalPayload {
  orderId: string;
  discountPercent: number;
  discountAmount: number;
  discountReason: string;
  orderTotalAmount: number;
}

/**
 * Service handling DISCOUNT-specific approval workflow logic.
 *
 * Responsibilities:
 * - Create DISCOUNT approval requests with proper routing (maxLevel) based on discount percentage
 * - Validate approver's role against the configured allowed roles for the discount threshold
 * - Apply approved discount to the Order (populate discountAmount and discountReason)
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
@Injectable()
export class DiscountApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a DISCOUNT approval request with threshold-based routing.
   *
   * The maxLevel is automatically determined from DiscountRoutingConfig
   * based on the discount percentage.
   *
   * Requirement 9.4: Threshold-based routing via DiscountRoutingConfig
   */
  async createDiscountRequest(
    requesterId: string,
    orderId: string,
    discountPercent: number,
    discountAmount: number,
    discountReason: string,
  ) {
    if (discountPercent <= 0 || discountPercent > 100) {
      throw new BadRequestException(
        'Discount percentage must be between 0 (exclusive) and 100 (inclusive).',
      );
    }

    if (discountAmount <= 0) {
      throw new BadRequestException(
        'Discount amount must be greater than zero.',
      );
    }

    // Validate order exists and get total amount
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, totalAmount: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID '${orderId}' not found.`);
    }

    // Validate discount amount doesn't exceed order total
    if (new Decimal(discountAmount).gt(order.totalAmount)) {
      throw new BadRequestException(
        'Discount amount cannot exceed the order total amount.',
      );
    }

    // Resolve routing rule based on discount percentage
    const routingRule = resolveDiscountRoutingRule(discountPercent);
    if (!routingRule) {
      throw new BadRequestException(
        `No routing rule found for discount percentage ${discountPercent}%.`,
      );
    }

    // Check if there's already a pending discount request for this order
    const existingPending = await this.prisma.approvalRequest.findFirst({
      where: {
        requestType: ApprovalType.DISCOUNT,
        status: ApprovalStatus.PENDING,
        payload: {
          path: ['orderId'],
          equals: orderId,
        },
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'A pending discount approval request already exists for this order.',
      );
    }

    const payload: DiscountApprovalPayload = {
      orderId,
      discountPercent,
      discountAmount,
      discountReason,
      orderTotalAmount: Number(order.totalAmount),
    };

    return this.prisma.approvalRequest.create({
      data: {
        requestType: ApprovalType.DISCOUNT,
        requesterId,
        maxLevel: routingRule.requiredMaxLevel,
        payload: payload as any,
      },
      include: { steps: true },
    });
  }

  /**
   * Approve a DISCOUNT approval request at the current level.
   *
   * Validates the approver's role against the DiscountRoutingConfig allowed roles.
   * When final-level approval is reached, populates Order.discountAmount and Order.discountReason.
   *
   * Requirements: 9.3, 9.5
   */
  async approveDiscount(approvalRequestId: string, approverId: string) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { steps: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Approval request with ID '${approvalRequestId}' not found.`,
      );
    }

    if (request.requestType !== ApprovalType.DISCOUNT) {
      throw new BadRequestException(
        'This endpoint only handles DISCOUNT approval requests.',
      );
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException(
        `Cannot approve request with status '${request.status}'. Only PENDING requests can be approved.`,
      );
    }

    // Validate approver's role against configured allowed roles
    await this.validateApproverRole(approverId, request.payload as unknown as DiscountApprovalPayload);

    // Record the approval step
    await this.prisma.approvalStep.create({
      data: {
        approvalRequestId,
        level: request.currentLevel,
        approverId,
        action: 'APPROVED',
      },
    });

    const newLevel = request.currentLevel + 1;

    // If all levels approved, mark as APPROVED and apply discount to order
    if (newLevel > request.maxLevel) {
      const updatedRequest = await this.prisma.approvalRequest.update({
        where: { id: approvalRequestId },
        data: {
          currentLevel: newLevel,
          status: ApprovalStatus.APPROVED,
          resolvedAt: new Date(),
        },
        include: { steps: true },
      });

      // Apply discount to order (Requirement 9.3)
      await this.applyDiscountToOrder(request.payload as unknown as DiscountApprovalPayload);

      // Requirement 15.5: Explicit audit log for discount approval
      await this.auditService.log(
        approverId,
        'DISCOUNT_APPROVED',
        'ApprovalRequest',
        approvalRequestId,
        { status: ApprovalStatus.PENDING, currentLevel: request.currentLevel },
        {
          status: ApprovalStatus.APPROVED,
          currentLevel: newLevel,
          discountPercent: (request.payload as unknown as DiscountApprovalPayload).discountPercent,
          orderId: (request.payload as unknown as DiscountApprovalPayload).orderId,
        },
      );

      return updatedRequest;
    }

    // Otherwise, increment the current level
    return this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { currentLevel: newLevel },
      include: { steps: true },
    });
  }

  /**
   * Check if an order has an approved DISCOUNT ApprovalRequest.
   * Used by PaymentService to enforce Requirement 9.2.
   */
  async hasApprovedDiscountRequest(orderId: string): Promise<boolean> {
    const approvedRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        requestType: ApprovalType.DISCOUNT,
        status: ApprovalStatus.APPROVED,
        payload: {
          path: ['orderId'],
          equals: orderId,
        },
      },
    });

    return !!approvedRequest;
  }

  /**
   * Get the approved discount details for an order.
   * Returns null if no approved discount request exists.
   */
  async getApprovedDiscount(orderId: string): Promise<DiscountApprovalPayload | null> {
    const approvedRequest = await this.prisma.approvalRequest.findFirst({
      where: {
        requestType: ApprovalType.DISCOUNT,
        status: ApprovalStatus.APPROVED,
        payload: {
          path: ['orderId'],
          equals: orderId,
        },
      },
      orderBy: { resolvedAt: 'desc' },
    });

    if (!approvedRequest) {
      return null;
    }

    return approvedRequest.payload as unknown as DiscountApprovalPayload;
  }

  /**
   * Get the routing rule for a given discount percentage.
   * Useful for displaying required approval level info in the UI.
   */
  getRoutingRule(discountPercent: number): DiscountRoutingRule | null {
    return resolveDiscountRoutingRule(discountPercent);
  }

  /**
   * Validate the approver's role against DiscountRoutingConfig allowed roles.
   *
   * Requirement 9.5: Validate approver's role against configured allowed roles.
   */
  private async validateApproverRole(
    approverId: string,
    payload: DiscountApprovalPayload,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${approverId}' not found.`);
    }

    const routingRule = resolveDiscountRoutingRule(payload.discountPercent);
    if (!routingRule) {
      throw new BadRequestException(
        `No routing rule found for discount percentage ${payload.discountPercent}%.`,
      );
    }

    if (!routingRule.allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `User role '${user.role}' is not authorized to approve discounts of ${payload.discountPercent}%. ` +
        `Allowed roles: ${routingRule.allowedRoles.join(', ')}.`,
      );
    }
  }

  /**
   * Apply the approved discount to the Order.
   *
   * Requirement 9.3: Populate Order.discountAmount and Order.discountReason
   * from the approved ApprovalRequest payload.
   */
  private async applyDiscountToOrder(payload: DiscountApprovalPayload): Promise<void> {
    await this.prisma.order.update({
      where: { id: payload.orderId },
      data: {
        discountAmount: new Decimal(payload.discountAmount),
        discountReason: payload.discountReason,
      },
    });
  }
}
