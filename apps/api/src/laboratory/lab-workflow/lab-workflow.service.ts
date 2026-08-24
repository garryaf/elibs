import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, SampleCondition, Flag } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { AutoFlaggingService } from './auto-flagging.service';
import { DeltaCheckService } from './delta-check.service';
import { NotificationService } from '../notification/notification.service';
import { BpjsVerificationExpirationService } from '../order/bpjs-verification-expiration.service';
import { CriticalValueService } from '../critical-value/critical-value.service';
import { ConfirmSampleDto } from './dto/confirm-sample.dto';
import { EnterResultsDto } from './dto/enter-results.dto';
import { VerifyResultsDto } from './dto/verify-results.dto';
import { ApproveOrderDto } from './dto/approve-order.dto';

@Injectable()
export class LabWorkflowService {
  private readonly logger = new Logger(LabWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStateMachine: OrderStateMachineService,
    private readonly autoFlaggingService: AutoFlaggingService,
    private readonly deltaCheckService: DeltaCheckService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly bpjsVerificationExpirationService: BpjsVerificationExpirationService,
    private readonly criticalValueService: CriticalValueService,
  ) {}

  async confirmSample(orderId: string, dto: ConfirmSampleDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true, orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: 'Order must be in PAID status for sample collection',
      });
    }

    // Check BPJS verification expiration — block specimen collection if expired (Requirement 6.3)
    const bpjsDetailForExpiry = await this.prisma.bpjsOrderDetail.findUnique({
      where: { orderId },
    });

    if (bpjsDetailForExpiry) {
      const verificationCheck = await this.bpjsVerificationExpirationService.checkVerificationValidity(orderId);

      if (verificationCheck.isExpired) {
        throw new BadRequestException({
          errorCode: 'ERR_BPJS_VERIFICATION_EXPIRED',
          message: verificationCheck.message || 'Verifikasi BPJS telah kedaluwarsa. Silakan lakukan verifikasi ulang sebelum pengambilan sampel.',
        });
      }
    }

    // Check insurance pre-authorization requirement via OrderInsurance junction table
    // (Requirement 6.4: Use OrderInsurance junction instead of deprecated Order.insuranceId)
    const primaryOrderInsurance = await this.prisma.orderInsurance.findFirst({
      where: { orderId, coverageType: 'PRIMARY' },
    });

    if (primaryOrderInsurance) {
      const testsRequiringPreAuth = await this.prisma.orderDetail.findMany({
        where: { orderId, test: { requiresInsurancePreAuth: true } },
        include: { test: { select: { id: true, name: true, code: true } } },
      });

      if (testsRequiringPreAuth.length > 0) {
        // If we reach here and bpjsDetail exists, it's guaranteed not expired (checked above)
        const isVerified = bpjsDetailForExpiry?.verificationStatus === 'VERIFIED';

        // Check if any OrderInsurance claim is at least submitted
        const hasClaimApproval =
          ['APPROVED', 'PARTIALLY_APPROVED', 'SUBMITTED', 'UNDER_REVIEW'].includes(primaryOrderInsurance.claimStatus);

        if (!isVerified && !hasClaimApproval) {
          const testNames = testsRequiringPreAuth.map((od) => od.test.name).join(', ');
          throw new BadRequestException({
            errorCode: 'ERR_PRE_AUTH_REQUIRED',
            message: `Pemeriksaan berikut memerlukan pre-otorisasi asuransi sebelum pengambilan sampel: ${testNames}. Pastikan verifikasi BPJS/asuransi telah dilakukan.`,
          });
        }
      }
    }

    if (!order.barcode || (!order.barcodeImage && !order.barcodeText)) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Order must have a valid barcode before sample collection',
      });
    }

    if (dto.sampleCondition === SampleCondition.ACCEPTABLE) {
      const updatedOrder = await this.orderStateMachine.transition(
        orderId,
        OrderStatus.SAMPLE_COLLECTED,
        { userId },
      );

      await this.prisma.order.update({
        where: { id: orderId },
        data: { sampleCondition: dto.sampleCondition },
      });

      return {
        ...updatedOrder,
        sampleCondition: dto.sampleCondition,
      };
    }

    // Sample condition is not acceptable - keep PAID status, record rejection
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        sampleCondition: dto.sampleCondition,
        rejectionReason: dto.rejectionReason ?? null,
      },
      include: { patient: true, orderDetails: true },
    });

    return updatedOrder;
  }

  async enterResults(orderId: string, dto: EnterResultsDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true, orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (
      order.status !== OrderStatus.SAMPLE_COLLECTED &&
      order.status !== OrderStatus.IN_ANALYSIS
    ) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: 'Order must be in SAMPLE_COLLECTED or IN_ANALYSIS status for result entry',
      });
    }

    const now = new Date();
    const patientAge = this.calculateAge(order.patient.dateOfBirth);
    const patientGender = order.patient.gender;

    for (const entry of dto.results) {
      const orderDetail = order.orderDetails.find(
        (od) => od.id === entry.orderDetailId,
      );

      if (!orderDetail) {
        throw new BadRequestException({
          errorCode: 'ERR_VALIDATION',
          message: `OrderDetail ${entry.orderDetailId} not found or does not belong to this order`,
        });
      }

      let flag = null;
      const numericValue = parseFloat(entry.resultValue);

      if (!isNaN(numericValue)) {
        flag = await this.autoFlaggingService.calculateFlag(
          numericValue,
          orderDetail.testId,
          patientAge,
          patientGender,
        );
      } else {
        // BP-MD-05: For non-numeric values (qualitative/text), try qualitative flagging
        flag = await this.autoFlaggingService.calculateFlag(
          entry.resultValue,
          orderDetail.testId,
          patientAge,
          patientGender,
        );
      }

      await this.prisma.orderDetail.update({
        where: { id: entry.orderDetailId },
        data: {
          resultValue: entry.resultValue,
          flag,
          resultEnteredAt: now,
          resultEnteredBy: userId,
          status: 'RESULT_ENTERED',
          comment: entry.comment ?? null,
        },
      });

      // Critical Value Alert: trigger detection if result is CRITICAL
      if (flag === Flag.CRITICAL) {
        await this.criticalValueService.detectAndAlert(
          orderId,
          entry.orderDetailId,
          entry.resultValue,
          orderDetail.testId,
        ).catch((err) => {
          this.logger.warn(
            `Failed to trigger critical value alert for order ${orderId}, detail ${entry.orderDetailId}: ${err.message}`,
          );
        });
      }
    }

    // Check if ALL OrderDetails now have resultValue
    const updatedOrderDetails = await this.prisma.orderDetail.findMany({
      where: { orderId },
    });

    const allHaveResults = updatedOrderDetails.every(
      (od) => od.resultValue !== null,
    );

    // If all have results and order is SAMPLE_COLLECTED → transition to IN_ANALYSIS
    if (allHaveResults && order.status === OrderStatus.SAMPLE_COLLECTED) {
      await this.orderStateMachine.transition(
        orderId,
        OrderStatus.IN_ANALYSIS,
        { userId },
      );
    }

    // Return updated order
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        orderDetails: { include: { test: true } },
      },
    });
  }

  async verifyResults(orderId: string, dto: VerifyResultsDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: { include: { test: true } } },
    });

    if (!order) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (order.status !== OrderStatus.IN_ANALYSIS) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: 'Order must be in IN_ANALYSIS status for verification',
      });
    }

    const allHaveResults = order.orderDetails.every(
      (od) => od.resultValue !== null,
    );

    if (!allHaveResults) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'All results must be entered before verification',
      });
    }

    const updatedOrder = await this.orderStateMachine.transition(
      orderId,
      OrderStatus.VERIFIED,
      { userId, reason: dto.verificationNotes },
    );

    // Auto-approve if all tests do not require doctor approval
    const autoApproved = await this.autoApproveIfEligible(orderId, userId);
    if (autoApproved) {
      const approvedOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { patient: true, orderDetails: true },
      });
      // HIGH-014: Explicitly indicate status change in auto-approval response
      return {
        ...approvedOrder,
        statusChange: {
          from: OrderStatus.VERIFIED,
          to: OrderStatus.APPROVED,
          autoApproved: true,
        },
      };
    }

    return updatedOrder;
  }

  async approveOrder(orderId: string, dto: ApproveOrderDto, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    if (!order.visitId) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: `Order ${orderId} has no visit linkage. Traceability chain broken: Visit → Order required.`,
      });
    }

    if (order.status !== OrderStatus.VERIFIED) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: 'Order must be in VERIFIED status for approval',
      });
    }

    if (dto.decision === 'APPROVE') {
      // Requirement 12.1: Check if order contains CRITICAL-flagged results
      const hasCritical = order.orderDetails.some(
        (od) => od.flag === 'CRITICAL',
      );

      // If order has critical results and second-level approval has not yet been given
      if (hasCritical && !order.secondApprovalRequired) {
        // First approval: mark as requiring second-level approval
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            secondApprovalRequired: true,
            approvedBy: userId,
            approvedAt: new Date(),
            interpretation: dto.interpretation ?? null,
          },
        });

        return {
          ...order,
          secondApprovalRequired: true,
          statusChange: {
            from: OrderStatus.VERIFIED,
            to: OrderStatus.VERIFIED,
            awaitingSecondApproval: true,
          },
          message: 'Order contains CRITICAL results. Second-level approval required before final release.',
        };
      }

      // If second-level approval is being provided
      if (hasCritical && order.secondApprovalRequired && dto.secondLevelApproval) {
        const now = new Date();
        const updatedOrder = await this.orderStateMachine.transition(
          orderId,
          OrderStatus.APPROVED,
          {
            userId,
            metadata: { interpretation: dto.interpretation, secondLevelApproval: true },
          },
        );

        // Record second-level approver
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            secondApprovalBy: userId,
            secondApprovalAt: now,
          },
        });

        // Fire-and-forget: trigger notifications without blocking the approval response
        this.notificationService.triggerNotifications(orderId).catch((error) => {
          this.logger.error(
            `Failed to trigger notifications for order ${orderId}: ${error.message}`,
            error.stack,
          );
        });

        // Evaluate visit completion after second-level approval
        if (order.visitId) {
          this.evaluateVisitCompletion(order.visitId).catch(() => {});
        }

        return {
          ...updatedOrder,
          secondApprovalBy: userId,
          secondApprovalAt: now,
          statusChange: {
            from: OrderStatus.VERIFIED,
            to: OrderStatus.APPROVED,
            autoApproved: false,
            secondLevelApproval: true,
          },
        };
      }

      // If second-level approval is required but not provided yet
      if (hasCritical && order.secondApprovalRequired && !dto.secondLevelApproval) {
        throw new BadRequestException({
          errorCode: 'ERR_SECOND_APPROVAL_REQUIRED',
          message: 'Order contains CRITICAL results and requires second-level approval. Set secondLevelApproval=true to confirm.',
        });
      }

      // Non-critical order: proceed with normal approval
      const updatedOrder = await this.orderStateMachine.transition(
        orderId,
        OrderStatus.APPROVED,
        {
          userId,
          metadata: { interpretation: dto.interpretation },
        },
      );

      // Fire-and-forget: trigger notifications without blocking the approval response
      this.notificationService.triggerNotifications(orderId).catch((error) => {
        this.logger.error(
          `Failed to trigger notifications for order ${orderId}: ${error.message}`,
          error.stack,
        );
      });

      // Evaluate visit completion after approval
      if (order.visitId) {
        this.evaluateVisitCompletion(order.visitId).catch(() => {});
      }

      // HIGH-014: Explicitly indicate status change in approval response
      return {
        ...updatedOrder,
        statusChange: {
          from: OrderStatus.VERIFIED,
          to: OrderStatus.APPROVED,
          autoApproved: false,
        },
      };
    }

    // REJECT: transition back to IN_ANALYSIS
    // Reset second approval state on rejection
    if (order.secondApprovalRequired) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          secondApprovalRequired: false,
          secondApprovalBy: null,
          secondApprovalAt: null,
        },
      });
    }

    const updatedOrder = await this.orderStateMachine.transition(
      orderId,
      OrderStatus.IN_ANALYSIS,
      { userId, reason: dto.rejectionReason },
    );

    // Record the rejection reason on the order
    await this.prisma.order.update({
      where: { id: orderId },
      data: { rejectedReason: dto.rejectionReason },
    });

    return {
      ...updatedOrder,
      rejectedReason: dto.rejectionReason,
      statusChange: {
        from: OrderStatus.VERIFIED,
        to: OrderStatus.IN_ANALYSIS,
        autoApproved: false,
      },
    };
  }

  /**
   * Recall an approved/notified order back to IN_ANALYSIS for correction.
   * Only allowed within 24 hours of approval.
   * DATA-GAP-06: Recall/Amendment mechanism
   */
  async recallOrder(orderId: string, reason: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { patient: true, orderDetails: true },
    });

    if (!order) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    if (order.status !== OrderStatus.APPROVED && order.status !== OrderStatus.NOTIFIED) {
      throw new BadRequestException({
        errorCode: 'ERR_INVALID_STATE',
        message: 'Only APPROVED or NOTIFIED orders can be recalled',
      });
    }

    // Check 24-hour window
    if (order.approvedAt) {
      const hoursSinceApproval = (Date.now() - new Date(order.approvedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceApproval > 24) {
        throw new BadRequestException({
          errorCode: 'ERR_RECALL_EXPIRED',
          message: 'Batas waktu recall telah terlewat (maksimal 24 jam setelah approval)',
        });
      }
    }

    if (!reason || !reason.trim()) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'Reason is required for recall',
      });
    }

    const updatedOrder = await this.orderStateMachine.transition(
      orderId,
      OrderStatus.IN_ANALYSIS,
      { userId, reason: reason.trim() },
    );

    return {
      ...updatedOrder,
      statusChange: {
        from: order.status,
        to: OrderStatus.IN_ANALYSIS,
        recalled: true,
        recallReason: reason.trim(),
      },
    };
  }

  /**
   * Get workload summary for current user today.
   * DATA-GAP-12: Workload summary per shift/user
   */
  async getMyWorkload(userId: string, clinicId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseWhere: any = { createdAt: { gte: todayStart } };
    if (clinicId) baseWhere.clinicId = clinicId;

    const [sampledToday, analyzedToday, verifiedToday, approvedToday] = await Promise.all([
      this.prisma.order.count({
        where: { ...baseWhere, sampleCollectedBy: userId, sampleCollectedAt: { gte: todayStart } },
      }),
      this.prisma.orderDetail.count({
        where: { resultEnteredBy: userId, resultEnteredAt: { gte: todayStart } },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, verifiedBy: userId, verifiedAt: { gte: todayStart } },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, approvedBy: userId, approvedAt: { gte: todayStart } },
      }),
    ]);

    return { sampledToday, analyzedToday, verifiedToday, approvedToday };
  }

  async getApprovalQueue(page: number = 1, limit: number = 20, clinicId?: string, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      status: OrderStatus.VERIFIED,
    };

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          patient: true,
          orderDetails: {
            include: { test: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Requirement 17.3: Add hasCritical computed indicator
    // Requirement 17.2: Sort CRITICAL-flagged orders above non-critical
    const enrichedData = data.map((order) => {
      const hasCritical = order.orderDetails.some(
        (od) => od.flag === 'CRITICAL',
      );
      return {
        ...order,
        hasCritical,
      };
    });

    // Sort: CRITICAL-flagged orders first, then by createdAt ascending
    enrichedData.sort((a, b) => {
      if (a.hasCritical && !b.hasCritical) return -1;
      if (!a.hasCritical && b.hasCritical) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return {
      data: enrichedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async autoApproveIfEligible(orderId: string, userId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: { include: { test: true } } },
    });

    if (!order || order.status !== OrderStatus.VERIFIED) {
      return false;
    }

    const allSkipApproval = order.orderDetails.every(
      (od) => od.test.requiresDoctorApproval === false,
    );

    if (!allSkipApproval) {
      return false;
    }

    // Patient safety: do NOT auto-approve if any result is flagged HIGH or CRITICAL
    // These results require doctor review regardless of test configuration
    // Also block auto-approve if any result has flag=null (no reference values configured)
    // as this indicates the system cannot determine if the result is normal
    const hasAbnormalOrUnflaggedResult = order.orderDetails.some(
      (od) => od.flag === 'HIGH' || od.flag === 'CRITICAL' || od.flag === null,
    );

    if (hasAbnormalOrUnflaggedResult) {
      this.logger.log(
        `Order ${orderId} not auto-approved: contains HIGH/CRITICAL flagged results or unflagged results (no reference values) requiring doctor review`,
      );
      return false;
    }

    await this.orderStateMachine.transition(
      orderId,
      OrderStatus.APPROVED,
      { userId, metadata: { interpretation: 'Auto-approved: no tests require doctor approval, all results normal' } },
    );

    // Fire-and-forget: trigger notifications without blocking the approval response
    this.notificationService.triggerNotifications(orderId).catch((error) => {
      this.logger.error(
        `Failed to trigger notifications for auto-approved order ${orderId}: ${error.message}`,
        error.stack,
      );
    });

    // Evaluate if the visit should be marked as COMPLETED
    if (order.visitId) {
      this.evaluateVisitCompletion(order.visitId).catch(() => {});
    }

    return true;
  }

  /**
   * Evaluate if a visit should transition to COMPLETED.
   * A visit is complete when ALL its orders are in a terminal state
   * (APPROVED, NOTIFIED, or CANCELLED).
   */
  private async evaluateVisitCompletion(visitId: string): Promise<void> {
    try {
      const visit = await this.prisma.visit.findUnique({
        where: { id: visitId },
        select: { id: true, status: true },
      });

      if (!visit || visit.status !== 'IN_PROGRESS') return;

      const orders = await this.prisma.order.findMany({
        where: { visitId },
        select: { status: true },
      });

      if (orders.length === 0) return;

      const allTerminal = orders.every(
        (o) =>
          o.status === OrderStatus.APPROVED ||
          o.status === OrderStatus.NOTIFIED ||
          o.status === OrderStatus.CANCELLED,
      );

      if (allTerminal) {
        await this.prisma.visit.update({
          where: { id: visitId },
          data: { status: 'COMPLETED' },
        });
        this.logger.log(`Visit ${visitId} auto-transitioned to COMPLETED (all orders terminal)`);
      }
    } catch (error) {
      this.logger.warn(`Failed to evaluate visit completion for ${visitId}: ${error}`);
    }
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }
    return age;
  }

  async getQueue(page: number = 1, limit: number = 20, clinicId?: string, search?: string, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};

    // Status filter — support special "RESAMPLE" pseudo-status
    if (status === 'RESAMPLE') {
      // Show orders that need re-sampling (rejected samples still in PAID status)
      where.status = OrderStatus.PAID;
      where.sampleCondition = { not: null, notIn: ['ACCEPTABLE'] };
    } else if (status === 'COMPLETED_TODAY') {
      // DATA-GAP-01: Show orders completed (approved/notified) today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      where.status = { in: [OrderStatus.APPROVED, OrderStatus.NOTIFIED] };
      where.approvedAt = { gte: todayStart };
    } else if (status && ['PAID', 'SAMPLE_COLLECTED', 'IN_ANALYSIS', 'VERIFIED'].includes(status)) {
      where.status = status;
    } else {
      // Default: show all lab-relevant statuses (including VERIFIED for consistency with stats)
      where.status = {
        in: [OrderStatus.PAID, OrderStatus.SAMPLE_COLLECTED, OrderStatus.IN_ANALYSIS, OrderStatus.VERIFIED],
      };
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: status === 'COMPLETED_TODAY' ? { approvedAt: 'desc' } : { createdAt: 'desc' },
        include: {
          patient: true,
          orderDetails: {
            include: { test: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // DATA-GAP-09: Add rejection count for orders in RESAMPLE or general view
    const orderIds = data.map((o) => o.id);
    let rejectionCounts: Record<string, number> = {};
    if (orderIds.length > 0) {
      try {
        const attempts = await this.prisma.sampleCollectionAttempt.groupBy({
          by: ['orderId'],
          where: {
            orderId: { in: orderIds },
            sampleCondition: { not: 'ACCEPTABLE' },
          },
          _count: { id: true },
        });
        rejectionCounts = Object.fromEntries(
          attempts.map((a) => [a.orderId, a._count.id]),
        );
      } catch {
        // SampleCollectionAttempt table may not exist yet — graceful fallback
      }
    }

    return {
      data: data.map((order) => ({
        ...order,
        rejectionCount: rejectionCounts[order.id] || 0,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQueueStats(clinicId?: string) {
    const baseWhere: any = {};
    if (clinicId) {
      baseWhere.clinicId = clinicId;
    }

    // DATA-GAP-01: Include completed today count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [paid, sampleCollected, inAnalysis, verified, resample, completedToday] = await Promise.all([
      this.prisma.order.count({ where: { ...baseWhere, status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { ...baseWhere, status: OrderStatus.SAMPLE_COLLECTED } }),
      this.prisma.order.count({ where: { ...baseWhere, status: OrderStatus.IN_ANALYSIS } }),
      this.prisma.order.count({ where: { ...baseWhere, status: OrderStatus.VERIFIED } }),
      this.prisma.order.count({ where: { ...baseWhere, status: OrderStatus.PAID, sampleCondition: { not: null, notIn: ['ACCEPTABLE'] } } }),
      this.prisma.order.count({ where: { ...baseWhere, status: { in: [OrderStatus.APPROVED, OrderStatus.NOTIFIED] }, approvedAt: { gte: todayStart } } }),
    ]);

    return {
      PAID: paid,
      SAMPLE_COLLECTED: sampleCollected,
      IN_ANALYSIS: inAnalysis,
      VERIFIED: verified,
      RESAMPLE: resample,
      COMPLETED_TODAY: completedToday,
      ALL: paid + sampleCollected + inAnalysis + verified,
    };
  }

  async getQueueHistory(
    page: number = 1,
    limit: number = 10,
    clinicId?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Date range filter (default: 7 days, max: 90 days)
    const now = new Date();
    const maxPast = new Date(now);
    maxPast.setDate(maxPast.getDate() - 90);

    let fromDate: Date;
    let toDate: Date;

    if (dateFrom) {
      fromDate = new Date(dateFrom);
      if (fromDate < maxPast) fromDate = maxPast;
    } else {
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 7);
    }
    fromDate.setHours(0, 0, 0, 0);

    if (dateTo) {
      toDate = new Date(dateTo);
    } else {
      toDate = new Date(now);
    }
    toDate.setHours(23, 59, 59, 999);

    where.createdAt = { gte: fromDate, lte: toDate };

    // Status filter — allow all statuses for history
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { mrn: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          orderDetails: {
            include: { test: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dateFrom: fromDate.toISOString(),
        dateTo: toDate.toISOString(),
      },
    };
  }

  async getDeltaCheck(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: { include: { test: true } } },
    });

    if (!order) {
      throw new NotFoundException({ errorCode: 'ERR_NOT_FOUND', message: 'Order not found' });
    }

    // Use DeltaCheckService to get enriched results with percentageChange
    const deltaResults = await this.deltaCheckService.performDeltaCheckForOrder(orderId);

    // Combine delta results with full history for backwards compatibility
    const results = [];

    for (const detail of order.orderDetails) {
      const deltaResult = deltaResults.find((r) => r.orderDetailId === detail.id);

      const history = await this.prisma.orderDetail.findMany({
        where: {
          testId: detail.testId,
          resultValue: { not: null },
          order: {
            patientId: order.patientId,
            id: { not: orderId },
          },
        },
        take: 5,
        orderBy: { resultEnteredAt: 'desc' },
        include: { order: { select: { orderNumber: true } } },
      });

      results.push({
        testId: detail.testId,
        testName: detail.test.name,
        currentValue: detail.resultValue,
        percentageChange: deltaResult?.percentageChange ?? null,
        previousValue: deltaResult?.previousValue ?? null,
        thresholdExceeded: deltaResult?.thresholdExceeded ?? false,
        deltaAlertThreshold: deltaResult?.deltaAlertThreshold ?? null,
        history: history.map((h) => ({
          resultValue: h.resultValue,
          flag: h.flag,
          resultDate: h.resultEnteredAt,
          orderNumber: h.order.orderNumber,
        })),
      });
    }

    return results;
  }
}
