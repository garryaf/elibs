import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovalStatus, ApprovalType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../laboratory/audit/audit.service';
import { DiscountApprovalService } from './discount-approval.service';
import { CreateDiscountApprovalDto } from './dto/create-discount-approval.dto';
import { DecideDiscountApprovalDto, DiscountDecision } from './dto/decide-discount-approval.dto';
import { resolveDiscountRoutingRule } from './discount-routing.config';

/**
 * Controller for discount-specific approval endpoints.
 *
 * Provides:
 * - POST /api/v1/approvals/discount — Request a discount approval
 * - GET /api/v1/approvals/discount/pending — Pending queue filtered by role/level
 * - POST /api/v1/approvals/discount/:id/decide — Approve/reject with comments
 *
 * Requirements: 9.6
 */
@ApiTags('Discount Approvals')
@ApiBearerAuth()
@Controller('api/v1/approvals/discount')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiscountApprovalController {
  constructor(
    private readonly discountApprovalService: DiscountApprovalService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * POST /api/v1/approvals/discount
   * Create a new discount approval request.
   *
   * Any authenticated user with KASIR, CS, ADMIN, MANAGER, OWNER, or SUPER_ADMIN
   * role can request a discount approval.
   */
  @Post()
  @Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Request a discount approval' })
  async requestDiscount(
    @Body() dto: CreateDiscountApprovalDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.discountApprovalService.createDiscountRequest(
      dto.requesterId || user.id,
      dto.orderId,
      dto.discountPercent,
      dto.discountAmount,
      dto.discountReason,
    );
  }

  /**
   * GET /api/v1/approvals/discount/pending
   * Get the pending discount approval queue filtered by the user's role.
   *
   * Only returns discount requests where the user's role is in the allowed
   * roles for the request's discount threshold level.
   */
  @Get('pending')
  @Roles(Role.MANAGER, Role.OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List pending discount approvals filtered by role/level' })
  async getPendingDiscounts(
    @CurrentUser() user: { id: string; role: Role },
  ) {
    // Fetch all pending DISCOUNT approval requests
    const pendingRequests = await this.prisma.approvalRequest.findMany({
      where: {
        requestType: ApprovalType.DISCOUNT,
        status: ApprovalStatus.PENDING,
      },
      include: {
        steps: { orderBy: { actedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by user's role against the routing config allowed roles
    return pendingRequests.filter((request) => {
      const payload = request.payload as any;
      if (!payload?.discountPercent) return false;

      const routingRule = resolveDiscountRoutingRule(payload.discountPercent);
      if (!routingRule) return false;

      return routingRule.allowedRoles.includes(user.role);
    });
  }

  /**
   * POST /api/v1/approvals/discount/:id/decide
   * Approve or reject a pending discount approval request with comments.
   *
   * Only MANAGER, OWNER, ADMIN, or SUPER_ADMIN roles can decide on discount requests.
   * The approver's role is further validated against the discount routing config.
   */
  @Post(':id/decide')
  @Roles(Role.MANAGER, Role.OWNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a discount approval request' })
  async decideDiscount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideDiscountApprovalDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    if (dto.decision === DiscountDecision.APPROVE) {
      // Use the existing approve flow from DiscountApprovalService
      return this.discountApprovalService.approveDiscount(id, user.id);
    }

    // For rejection, record the step and update status
    return this.rejectDiscount(id, user.id, dto.reason, dto.comment);
  }

  /**
   * Reject a discount approval request.
   * Validates the approver's role, records the rejection step,
   * and sets the request status to REJECTED.
   */
  private async rejectDiscount(
    approvalRequestId: string,
    approverId: string,
    reason?: string,
    comment?: string,
  ) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: { steps: true },
    });

    if (!request) {
      throw new ForbiddenException(
        `Approval request with ID '${approvalRequestId}' not found.`,
      );
    }

    if (request.requestType !== ApprovalType.DISCOUNT) {
      throw new ForbiddenException(
        'This endpoint only handles DISCOUNT approval requests.',
      );
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ForbiddenException(
        `Cannot reject request with status '${request.status}'. Only PENDING requests can be rejected.`,
      );
    }

    // Validate approver's role against routing config
    const payload = request.payload as any;
    const userRecord = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { role: true },
    });

    if (!userRecord) {
      throw new ForbiddenException(`User with ID '${approverId}' not found.`);
    }

    const routingRule = resolveDiscountRoutingRule(payload.discountPercent);
    if (routingRule && !routingRule.allowedRoles.includes(userRecord.role)) {
      throw new ForbiddenException(
        `User role '${userRecord.role}' is not authorized to reject discounts of ${payload.discountPercent}%. ` +
        `Allowed roles: ${routingRule.allowedRoles.join(', ')}.`,
      );
    }

    // Record the rejection step
    await this.prisma.approvalStep.create({
      data: {
        approvalRequestId,
        level: request.currentLevel,
        approverId,
        action: 'REJECTED',
        comment: comment || reason,
      },
    });

    // Update request status to REJECTED
    const updatedRequest = await this.prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: ApprovalStatus.REJECTED,
        reason: reason || comment,
        resolvedAt: new Date(),
      },
      include: { steps: { orderBy: { actedAt: 'asc' } } },
    });

    // Requirement 15.5: Explicit audit log for discount rejection
    await this.auditService.log(
      approverId,
      'DISCOUNT_REJECTED',
      'ApprovalRequest',
      approvalRequestId,
      { status: ApprovalStatus.PENDING, currentLevel: request.currentLevel },
      {
        status: ApprovalStatus.REJECTED,
        reason: reason || comment,
        discountPercent: payload.discountPercent,
        orderId: payload.orderId,
      },
    );

    return updatedRequest;
  }
}
