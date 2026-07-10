import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ClaimStatus,
  OrderStatus,
  PaymentMethod,
  NotificationType,
  NotificationStatus,
} from '@prisma/client';

/**
 * InsuranceRejectionService handles the 72-hour cash fallback workflow
 * triggered when an insurance claim is rejected.
 *
 * Workflow:
 * 1. Claim rejected → initiateClaimRejectionFallback()
 *    - Creates notification log for patient
 *    - Records fallback deadline (rejectedAt + 72h)
 * 2. Scheduled/manual check → checkOverduePayments()
 *    - Transitions unpaid orders past 72h to PAYMENT_OVERDUE
 * 3. Patient pays → processFallbackPayment()
 *    - Records PaymentComponent with INSURANCE_CASH_FALLBACK method
 *    - Links payment to original rejected claim via reference
 */
const FALLBACK_WINDOW_HOURS = 72;

@Injectable()
export class InsuranceRejectionService {
  private readonly logger = new Logger(InsuranceRejectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initiate the 72-hour cash fallback workflow after a claim rejection.
   * Creates a notification log entry for the patient and returns deadline info.
   */
  async initiateClaimRejectionFallback(orderInsuranceId: string) {
    const orderInsurance = await this.prisma.orderInsurance.findUnique({
      where: { id: orderInsuranceId },
      include: {
        order: {
          include: {
            patient: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
    });

    if (!orderInsurance) {
      throw new NotFoundException('Order insurance record not found');
    }

    if (orderInsurance.claimStatus !== ClaimStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot initiate fallback: claim status is ${orderInsurance.claimStatus}, expected REJECTED`,
      );
    }

    if (!orderInsurance.rejectedAt) {
      throw new BadRequestException('Claim rejection timestamp is missing');
    }

    const fallbackDeadline = this.computeFallbackDeadline(orderInsurance.rejectedAt);
    const patient = orderInsurance.order.patient;

    // Create notification log entry for the patient
    const notification = await this.prisma.notificationLog.create({
      data: {
        orderId: orderInsurance.orderId,
        type: NotificationType.WHATSAPP, // Default channel; actual sending handled externally
        recipient: patient.phone || patient.email || patient.name,
        status: NotificationStatus.PENDING,
      },
    });

    this.logger.log(
      `Fallback workflow initiated for order ${orderInsurance.orderId}. ` +
      `Deadline: ${fallbackDeadline.toISOString()}. Notification: ${notification.id}`,
    );

    return {
      orderInsuranceId: orderInsurance.id,
      orderId: orderInsurance.orderId,
      patientName: patient.name,
      rejectedAt: orderInsurance.rejectedAt,
      rejectionReason: orderInsurance.rejectionReason,
      fallbackDeadline,
      notificationId: notification.id,
    };
  }

  /**
   * Check for orders that have exceeded the 72-hour fallback payment window.
   * Transitions them from PENDING_PAYMENT to PAYMENT_OVERDUE.
   */
  async checkOverduePayments(): Promise<{ overdueCount: number; updatedOrders: string[] }> {
    const cutoffTime = new Date(Date.now() - FALLBACK_WINDOW_HOURS * 60 * 60 * 1000);

    // Find orders where claim is rejected, rejection is older than 72h, and still pending payment
    const overdueOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        orderInsurances: {
          some: {
            claimStatus: ClaimStatus.REJECTED,
            rejectedAt: {
              lt: cutoffTime,
            },
          },
        },
      },
      select: { id: true, orderNumber: true },
    });

    if (overdueOrders.length === 0) {
      return { overdueCount: 0, updatedOrders: [] };
    }

    const orderIds = overdueOrders.map((o) => o.id);

    // Batch update to PAYMENT_OVERDUE
    await this.prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: OrderStatus.PAYMENT_OVERDUE },
    });

    this.logger.warn(
      `Transitioned ${orderIds.length} order(s) to PAYMENT_OVERDUE: ${overdueOrders.map((o) => o.orderNumber).join(', ')}`,
    );

    return {
      overdueCount: orderIds.length,
      updatedOrders: orderIds,
    };
  }

  /**
   * List orders that are in PAYMENT_OVERDUE status (for KASIR/ADMIN dashboard).
   */
  async getOverdueOrders() {
    const orders = await this.prisma.order.findMany({
      where: { status: OrderStatus.PAYMENT_OVERDUE },
      include: {
        patient: { select: { id: true, mrn: true, name: true, phone: true } },
        orderInsurances: {
          where: { claimStatus: ClaimStatus.REJECTED },
          include: {
            insurance: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    return {
      data: orders.map((order) => {
        const rejectedClaim = order.orderInsurances[0];
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          patientMrn: order.patient.mrn,
          patientName: order.patient.name,
          patientPhone: order.patient.phone,
          totalAmount: order.totalAmount,
          rejectedAt: rejectedClaim?.rejectedAt,
          rejectionReason: rejectedClaim?.rejectionReason,
          insuranceName: rejectedClaim?.insurance?.name,
          fallbackDeadline: rejectedClaim?.rejectedAt
            ? this.computeFallbackDeadline(rejectedClaim.rejectedAt)
            : null,
        };
      }),
      total: orders.length,
    };
  }

  /**
   * Process a fallback cash payment after an insurance claim was rejected.
   * Creates a PaymentComponent with INSURANCE_CASH_FALLBACK method and links
   * it to the original rejected claim via reference.
   */
  async processFallbackPayment(
    orderId: string,
    amount: number,
    userId: string,
    reference?: string,
    notes?: string,
  ) {
    // 1. Validate order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderInsurances: {
          where: { claimStatus: ClaimStatus.REJECTED },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 2. Validate order has a rejected claim
    if (order.orderInsurances.length === 0) {
      throw new BadRequestException(
        'Order does not have a rejected insurance claim. Fallback payment requires a prior claim rejection.',
      );
    }

    // 3. Validate order is in an eligible status
    const eligibleStatuses: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAYMENT_OVERDUE,
    ];
    if (!eligibleStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order status is ${order.status}. Fallback payment only allowed for PENDING_PAYMENT or PAYMENT_OVERDUE orders.`,
      );
    }

    const rejectedClaim = order.orderInsurances[0];

    // 4. Create PaymentComponent and update order in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create payment component linked to the rejected claim
      const paymentComponent = await tx.paymentComponent.create({
        data: {
          orderId,
          paymentMethod: PaymentMethod.INSURANCE_CASH_FALLBACK,
          amount,
          insuranceId: rejectedClaim.insuranceId,
          reference: reference || `FALLBACK-${rejectedClaim.claimReference || rejectedClaim.id}`,
          notes: notes || `Cash fallback payment after claim rejection (${rejectedClaim.rejectionReason || 'no reason'})`,
        },
      });

      // Update order to PAID status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentMethod: PaymentMethod.INSURANCE_CASH_FALLBACK,
          amountPaid: amount,
          paidAt: new Date(),
        },
        include: {
          patient: { select: { id: true, mrn: true, name: true } },
          paymentComponents: true,
          orderInsurances: {
            include: {
              insurance: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      return { order: updatedOrder, paymentComponent };
    });

    this.logger.log(
      `Fallback payment processed for order ${orderId}. Amount: ${amount}. ` +
      `Linked to rejected claim: ${rejectedClaim.id}`,
    );

    return result;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Compute the fallback payment deadline: rejectedAt + 72 hours.
   */
  private computeFallbackDeadline(rejectedAt: Date): Date {
    return new Date(rejectedAt.getTime() + FALLBACK_WINDOW_HOURS * 60 * 60 * 1000);
  }
}
