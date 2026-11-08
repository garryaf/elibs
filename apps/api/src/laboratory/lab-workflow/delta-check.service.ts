import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '@prisma/client';

export interface DeltaCheckResult {
  orderDetailId: string;
  testId: string;
  testName: string;
  currentValue: number;
  previousValue: number | null;
  percentageChange: number | null;
  thresholdExceeded: boolean;
  deltaAlertThreshold: number | null;
}

@Injectable()
export class DeltaCheckService {
  private readonly logger = new Logger(DeltaCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Perform a delta check for a single OrderDetail.
   * Queries the previous result for the same test and patient,
   * calculates percentage change, and triggers a notification
   * if the absolute percentage change exceeds the configured deltaAlertThreshold.
   */
  async performDeltaCheck(
    orderDetailId: string,
    orderId: string,
  ): Promise<DeltaCheckResult> {
    // Get the current order detail with test and order info
    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id: orderDetailId },
      include: {
        test: true,
        order: {
          select: { patientId: true, doctorId: true },
        },
      },
    });

    if (!orderDetail) {
      throw new Error(`OrderDetail ${orderDetailId} not found`);
    }

    const currentNumeric = parseFloat(orderDetail.resultValue ?? '');

    // Build a base result in case we cannot compute a delta
    const baseResult: DeltaCheckResult = {
      orderDetailId,
      testId: orderDetail.testId,
      testName: orderDetail.test.name,
      currentValue: currentNumeric,
      previousValue: null,
      percentageChange: null,
      thresholdExceeded: false,
      deltaAlertThreshold: orderDetail.test.deltaAlertThreshold
        ? Number(orderDetail.test.deltaAlertThreshold)
        : null,
    };

    // If the current result is not numeric, we cannot calculate a delta
    if (isNaN(currentNumeric)) {
      return baseResult;
    }

    // Query the most recent previous result for the same test and patient
    // Uses the composite index on (testId, resultEnteredAt DESC)
    const previousResult = await this.prisma.orderDetail.findFirst({
      where: {
        testId: orderDetail.testId,
        resultValue: { not: null },
        resultEnteredAt: { not: null },
        order: {
          patientId: orderDetail.order.patientId,
          id: { not: orderId },
        },
        id: { not: orderDetailId },
      },
      orderBy: { resultEnteredAt: 'desc' },
      select: {
        resultValue: true,
        resultEnteredAt: true,
      },
    });

    if (!previousResult || !previousResult.resultValue) {
      return baseResult;
    }

    const previousNumeric = parseFloat(previousResult.resultValue);

    if (isNaN(previousNumeric) || previousNumeric === 0) {
      // Cannot compute percentage change if previous is 0 or non-numeric
      return {
        ...baseResult,
        previousValue: isNaN(previousNumeric) ? null : previousNumeric,
      };
    }

    // Calculate percentage change: ((current - previous) / previous) * 100
    const percentageChange =
      ((currentNumeric - previousNumeric) / previousNumeric) * 100;

    const deltaAlertThreshold = orderDetail.test.deltaAlertThreshold
      ? Number(orderDetail.test.deltaAlertThreshold)
      : null;

    const thresholdExceeded =
      deltaAlertThreshold !== null &&
      Math.abs(percentageChange) > deltaAlertThreshold;

    const result: DeltaCheckResult = {
      orderDetailId,
      testId: orderDetail.testId,
      testName: orderDetail.test.name,
      currentValue: currentNumeric,
      previousValue: previousNumeric,
      percentageChange: Math.round(percentageChange * 100) / 100, // round to 2 decimals
      thresholdExceeded,
      deltaAlertThreshold,
    };

    // Trigger notification if threshold exceeded
    if (thresholdExceeded && orderDetail.order.doctorId) {
      await this.triggerDeltaAlert(
        orderId,
        orderDetail.test.name,
        percentageChange,
        deltaAlertThreshold,
        orderDetail.order.doctorId,
      );
    }

    return result;
  }

  /**
   * Perform delta checks for all OrderDetails in an order.
   * Returns an array of DeltaCheckResult for each numeric test in the order.
   */
  async performDeltaCheckForOrder(
    orderId: string,
  ): Promise<DeltaCheckResult[]> {
    const orderDetails = await this.prisma.orderDetail.findMany({
      where: {
        orderId,
        resultValue: { not: null },
      },
      select: { id: true },
    });

    const results: DeltaCheckResult[] = [];

    for (const detail of orderDetails) {
      try {
        const deltaResult = await this.performDeltaCheck(detail.id, orderId);
        results.push(deltaResult);
      } catch (error) {
        this.logger.warn(
          `Failed to perform delta check for OrderDetail ${detail.id}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * Trigger a notification to the responsible clinician when the delta check
   * threshold is exceeded.
   */
  private async triggerDeltaAlert(
    orderId: string,
    testName: string,
    percentageChange: number,
    threshold: number,
    clinicianId: string,
  ): Promise<void> {
    const direction = percentageChange > 0 ? 'naik' : 'turun';
    const absChange = Math.abs(Math.round(percentageChange * 100) / 100);

    const message =
      `PERINGATAN DELTA CHECK: Hasil pemeriksaan ${testName} ${direction} ${absChange}% ` +
      `dari hasil sebelumnya (ambang batas: ${threshold}%). ` +
      `Silakan periksa kembali hasil pasien.`;

    try {
      await this.notificationService.queueNotification(
        orderId,
        NotificationType.WHATSAPP,
        clinicianId,
        {
          subject: 'Delta Check Alert',
          message,
        },
      );

      this.logger.log(
        `Delta check alert triggered for order ${orderId}, test ${testName}: ${absChange}% change (threshold: ${threshold}%)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send delta check alert for order ${orderId}: ${error}`,
      );
    }
  }
}
