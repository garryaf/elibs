import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrderStatus, OrderDetailStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QCService } from '../qc/qc.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { RejectDetailDto, RerunReason } from './dto/reject-detail.dto';
import { RerunRequestDto } from './dto/rerun-request.dto';

export { RerunReason };

/**
 * VerificationService handles per-parameter (OrderDetail-level) verification,
 * rejection, and rerun workflows.
 *
 * Requirements addressed:
 * - 4.1: Individual OrderDetail verification
 * - 4.2: Rejection with reason enum and rerun request
 * - 4.3: Order → VERIFIED only when all OrderDetails verified
 * - 4.5: QC validation check before allowing verification
 * - 4.6: Track rerunCount, rerunReason, previousResults
 * - 4.7: Log verifier's real userId (not SYSTEM)
 * - 4.8: Accept and store verificationNotes
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly qcService: QCService,
    private readonly orderStateMachine: OrderStateMachineService,
  ) {}

  /**
   * Verify an individual OrderDetail parameter.
   * Checks QC validity before allowing verification.
   * Logs the verifier's real userId for regulatory compliance.
   *
   * @param orderDetailId - The OrderDetail to verify
   * @param userId - The real userId of the verifier
   * @param notes - Optional verification notes from the UI
   */
  async verifyDetail(
    orderDetailId: string,
    userId: string,
    notes?: string,
  ) {
    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id: orderDetailId },
      include: { order: true, test: true },
    });

    if (!orderDetail) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'OrderDetail not found',
      });
    }

    if (orderDetail.status !== OrderDetailStatus.RESULT_ENTERED) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `OrderDetail must be in RESULT_ENTERED status for verification, current status: ${orderDetail.status}`,
      });
    }

    if (!orderDetail.resultValue) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Result must be entered before verification',
      });
    }

    // Requirement 4.5: Check QC validity before allowing verification
    const qcValid = await this.qcService.isQCValid(orderDetail.testId);
    if (!qcValid) {
      throw new BadRequestException({
        errorCode: 'ERR_QC_INVALID',
        message: `QC validation failed for test ${orderDetail.test.name}. Verification blocked until QC passes Westgard rules.`,
      });
    }

    const now = new Date();
    const oldValues = {
      status: orderDetail.status,
      verifiedAt: orderDetail.verifiedAt,
      verifiedBy: orderDetail.verifiedBy,
    };

    // Verify the individual OrderDetail
    const updatedDetail = await this.prisma.orderDetail.update({
      where: { id: orderDetailId },
      data: {
        status: OrderDetailStatus.VERIFIED,
        verifiedAt: now,
        verifiedBy: userId,
      },
      include: { order: true, test: true },
    });

    // Requirement 4.7: Log verifier's real userId
    await this.auditService.log(
      userId,
      'VERIFY_DETAIL',
      'OrderDetail',
      orderDetailId,
      oldValues,
      {
        status: OrderDetailStatus.VERIFIED,
        verifiedAt: now.toISOString(),
        verifiedBy: userId,
        verificationNotes: notes ?? null,
      },
    );

    // Requirement 4.3: Check if all OrderDetails are now verified
    // and transition Order to VERIFIED if so
    await this.checkOrderVerificationComplete(orderDetail.orderId);

    return updatedDetail;
  }

  /**
   * Reject an individual OrderDetail with a reason enum.
   * The rejection reason must be one of: QC_FAILURE, SPECIMEN_ISSUE,
   * EQUIPMENT_ERROR, OPERATOR_ERROR, OTHER.
   *
   * @param orderDetailId - The OrderDetail to reject
   * @param dto - Rejection details (reason, notes)
   * @param userId - The real userId performing the rejection
   */
  async rejectDetail(
    orderDetailId: string,
    dto: RejectDetailDto,
    userId: string,
  ) {
    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id: orderDetailId },
      include: { order: true, test: true },
    });

    if (!orderDetail) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'OrderDetail not found',
      });
    }

    if (
      orderDetail.status !== OrderDetailStatus.RESULT_ENTERED &&
      orderDetail.status !== OrderDetailStatus.VERIFIED
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: `OrderDetail must be in RESULT_ENTERED or VERIFIED status for rejection, current status: ${orderDetail.status}`,
      });
    }

    const now = new Date();
    const oldValues = {
      status: orderDetail.status,
      rejectedAt: orderDetail.rejectedAt,
      rejectedBy: orderDetail.rejectedBy,
      rejectionReason: orderDetail.rejectionReason,
    };

    const updatedDetail = await this.prisma.orderDetail.update({
      where: { id: orderDetailId },
      data: {
        status: OrderDetailStatus.RESULT_ENTERED,
        rejectedAt: now,
        rejectedBy: userId,
        rejectionReason: dto.reason,
        // Clear verification if previously verified
        verifiedAt: null,
        verifiedBy: null,
      },
      include: { order: true, test: true },
    });

    await this.auditService.log(
      userId,
      'REJECT_DETAIL',
      'OrderDetail',
      orderDetailId,
      oldValues,
      {
        status: OrderDetailStatus.RESULT_ENTERED,
        rejectedAt: now.toISOString(),
        rejectedBy: userId,
        rejectionReason: dto.reason,
        rejectionNotes: dto.notes ?? null,
      },
    );

    return updatedDetail;
  }

  /**
   * Request a rerun for an OrderDetail.
   * Tracks rerunCount, rerunReason, and stores previousResults in JSON.
   *
   * @param orderDetailId - The OrderDetail to rerun
   * @param dto - Rerun request details (reason, notes)
   * @param userId - The real userId requesting the rerun
   */
  async requestRerun(
    orderDetailId: string,
    dto: RerunRequestDto,
    userId: string,
  ) {
    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id: orderDetailId },
      include: { order: true, test: true },
    });

    if (!orderDetail) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'OrderDetail not found',
      });
    }

    if (!orderDetail.resultValue) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Cannot request rerun when no result has been entered',
      });
    }

    // Build the previous result entry to store in history
    const previousResultEntry = {
      value: orderDetail.resultValue,
      flag: orderDetail.flag,
      enteredAt: orderDetail.resultEnteredAt?.toISOString() ?? null,
      enteredBy: orderDetail.resultEnteredBy,
    };

    // Get existing previousResults array or start fresh
    const existingPreviousResults = Array.isArray(orderDetail.previousResults)
      ? (orderDetail.previousResults as Prisma.JsonArray)
      : [];

    const updatedPreviousResults: Prisma.JsonArray = [
      ...existingPreviousResults,
      previousResultEntry as unknown as Prisma.JsonValue,
    ];

    const newRerunCount = orderDetail.rerunCount + 1;

    const oldValues = {
      status: orderDetail.status,
      rerunCount: orderDetail.rerunCount,
      rerunReason: orderDetail.rerunReason,
      resultValue: orderDetail.resultValue,
      flag: orderDetail.flag,
    };

    // Reset the result and mark for rerun
    const updatedDetail = await this.prisma.orderDetail.update({
      where: { id: orderDetailId },
      data: {
        status: OrderDetailStatus.PENDING,
        rerunCount: newRerunCount,
        rerunReason: dto.reason,
        previousResults: updatedPreviousResults,
        // Clear current result for re-entry
        resultValue: null,
        flag: null,
        resultEnteredAt: null,
        resultEnteredBy: null,
        // Clear verification/rejection state
        verifiedAt: null,
        verifiedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      },
      include: { order: true, test: true },
    });

    await this.auditService.log(
      userId,
      'REQUEST_RERUN',
      'OrderDetail',
      orderDetailId,
      oldValues,
      {
        status: OrderDetailStatus.PENDING,
        rerunCount: newRerunCount,
        rerunReason: dto.reason,
        rerunNotes: dto.notes ?? null,
        previousResults: updatedPreviousResults,
      },
    );

    this.logger.log(
      `Rerun #${newRerunCount} requested for OrderDetail ${orderDetailId} by user ${userId}, reason: ${dto.reason}`,
    );

    return updatedDetail;
  }

  /**
   * Check if all OrderDetails in an Order are verified.
   * If all are verified, transitions the Order to VERIFIED status.
   *
   * @param orderId - The Order to check
   * @returns true if order was transitioned to VERIFIED, false otherwise
   */
  async checkOrderVerificationComplete(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Only attempt transition if order is in IN_ANALYSIS status
    if (order.status !== OrderStatus.IN_ANALYSIS) {
      return false;
    }

    // Check if ALL OrderDetails have status VERIFIED
    const allVerified = order.orderDetails.every(
      (od) => od.status === OrderDetailStatus.VERIFIED,
    );

    if (!allVerified) {
      return false;
    }

    // All OrderDetails are verified — transition Order to VERIFIED
    // Use the first verifier's userId as context (the last person to verify completes it)
    const lastVerified = order.orderDetails
      .filter((od) => od.verifiedAt !== null)
      .sort((a, b) => {
        const aTime = a.verifiedAt?.getTime() ?? 0;
        const bTime = b.verifiedAt?.getTime() ?? 0;
        return bTime - aTime;
      })[0];

    const verifierUserId = lastVerified?.verifiedBy ?? 'SYSTEM';

    await this.orderStateMachine.transition(orderId, OrderStatus.VERIFIED, {
      userId: verifierUserId,
    });

    this.logger.log(
      `All OrderDetails verified for Order ${orderId}. Order transitioned to VERIFIED.`,
    );

    return true;
  }
}
