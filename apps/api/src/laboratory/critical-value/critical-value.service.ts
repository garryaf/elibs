import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CriticalValueStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

/** Default escalation timeout in milliseconds (15 minutes) */
const DEFAULT_ESCALATION_TIMEOUT_MS = 15 * 60 * 1000;

@Injectable()
export class CriticalValueService {
  private readonly logger = new Logger(CriticalValueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('critical-value-escalation')
    private readonly escalationQueue: Queue,
  ) {}

  /**
   * Detect a critical value, create a CriticalValueLog, emit a WebSocket event,
   * and schedule a BullMQ escalation job.
   *
   * Returns the created CriticalValueLog, or null if the result is not critical.
   */
  async detectAndAlert(
    orderId: string,
    orderDetailId: string,
    resultValue: string,
    testId: string,
  ): Promise<any | null> {
    // Query the order to get patientId and clinicId context
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { patientId: true, clinicId: true, doctorId: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for critical value detection`);
      return null;
    }

    // Create CriticalValueLog with PENDING status
    const criticalValueLog = await this.prisma.criticalValueLog.create({
      data: {
        orderId,
        orderDetailId,
        testId,
        patientId: order.patientId,
        resultValue,
        notificationStatus: CriticalValueStatus.PENDING,
        clinicianId: order.doctorId,
      },
    });

    this.logger.log(
      `Critical value detected for order ${orderId}, test ${testId}: ${resultValue}`,
    );

    // Emit WebSocket event for real-time notification to clinician
    this.eventEmitter.emit('critical-value.new', {
      id: criticalValueLog.id,
      orderId,
      orderDetailId,
      testId,
      patientId: order.patientId,
      resultValue,
      clinicId: order.clinicId,
      clinicianId: order.doctorId,
      flaggedAt: criticalValueLog.flaggedAt,
    });

    // Update status to NOTIFIED after emitting event
    const updatedLog = await this.prisma.criticalValueLog.update({
      where: { id: criticalValueLog.id },
      data: {
        notificationStatus: CriticalValueStatus.NOTIFIED,
        notifiedAt: new Date(),
      },
    });

    // Schedule BullMQ escalation job with configurable timeout
    const escalationTimeout = await this.getEscalationTimeout();
    await this.escalationQueue.add(
      'escalate',
      { logId: criticalValueLog.id },
      {
        delay: escalationTimeout,
        jobId: `escalation-${criticalValueLog.id}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Scheduled escalation for critical value ${criticalValueLog.id} in ${escalationTimeout}ms`,
    );

    return updatedLog;
  }

  /**
   * Acknowledge a critical value notification.
   * Updates the status to ACKNOWLEDGED and cancels the scheduled escalation job.
   */
  async acknowledge(
    logId: string,
    userId: string,
    notes?: string,
  ): Promise<any> {
    const existing = await this.prisma.criticalValueLog.findUnique({
      where: { id: logId },
    });

    if (!existing) {
      throw new NotFoundException(`Critical value log ${logId} not found`);
    }

    // Update status to ACKNOWLEDGED
    const updatedLog = await this.prisma.criticalValueLog.update({
      where: { id: logId },
      data: {
        notificationStatus: CriticalValueStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        acknowledgmentNotes: notes,
      },
    });

    // Cancel the scheduled escalation job
    const jobId = `escalation-${logId}`;
    try {
      const job = await this.escalationQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled escalation job for critical value ${logId}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cancel escalation job ${jobId}: ${error}`,
      );
    }

    this.logger.log(
      `Critical value ${logId} acknowledged by user ${userId}`,
    );

    return updatedLog;
  }

  /**
   * Escalate a critical value notification by sending SMS via NotificationService.
   * Called by the BullMQ processor when the escalation timeout expires.
   */
  async escalate(logId: string): Promise<void> {
    const log = await this.prisma.criticalValueLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      this.logger.warn(`Critical value log ${logId} not found for escalation`);
      return;
    }

    // Skip escalation if already acknowledged
    if (log.notificationStatus === CriticalValueStatus.ACKNOWLEDGED) {
      this.logger.log(
        `Critical value ${logId} already acknowledged, skipping escalation`,
      );
      return;
    }

    // Update status to ESCALATED
    await this.prisma.criticalValueLog.update({
      where: { id: logId },
      data: {
        notificationStatus: CriticalValueStatus.ESCALATED,
        escalatedAt: new Date(),
        escalationMethod: 'SMS',
      },
    });

    // Send SMS notification via NotificationService
    if (log.clinicianId) {
      try {
        await this.notificationService.queueNotification(
          log.orderId,
          NotificationType.WHATSAPP,
          log.clinicianId,
          {
            subject: 'Critical Value Alert - Escalation',
            message: `URGENT: Critical value requires immediate attention. Order: ${log.orderId}, Test: ${log.testId}, Value: ${log.resultValue}. Please acknowledge immediately.`,
          },
        );
      } catch (error) {
        this.logger.error(
          `Failed to send escalation SMS for critical value ${logId}: ${error}`,
        );
      }
    }

    // Emit escalation event for WebSocket
    this.eventEmitter.emit('critical-value.escalated', {
      id: logId,
      orderId: log.orderId,
      testId: log.testId,
      patientId: log.patientId,
      resultValue: log.resultValue,
      escalatedAt: new Date(),
    });

    this.logger.log(`Critical value ${logId} escalated via SMS`);
  }

  /**
   * List critical value logs with optional filters.
   * Includes patient, test, and order relations for display.
   */
  async findAll(filters?: {
    status?: CriticalValueStatus;
    patientId?: string;
    orderId?: string;
    testId?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (filters?.status) {
      where.notificationStatus = filters.status;
    }
    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }
    if (filters?.orderId) {
      where.orderId = filters.orderId;
    }
    if (filters?.testId) {
      where.testId = filters.testId;
    }

    return this.prisma.criticalValueLog.findMany({
      where,
      orderBy: { flaggedAt: 'desc' },
      include: {
        patient: { select: { name: true, mrn: true } },
        test: { select: { name: true, code: true } },
        order: { select: { orderNumber: true } },
      },
    });
  }

  /**
   * Get all unacknowledged critical value logs, optionally filtered by clinicId.
   * Returns logs with notificationStatus in [PENDING, NOTIFIED].
   * Includes patient, test, and order relations for display.
   */
  async getUnacknowledged(clinicId?: string): Promise<any[]> {
    const baseWhere: any = {
      notificationStatus: {
        in: [CriticalValueStatus.PENDING, CriticalValueStatus.NOTIFIED],
      },
    };

    if (clinicId) {
      baseWhere.order = { clinicId };
    }

    return this.prisma.criticalValueLog.findMany({
      where: baseWhere,
      orderBy: { flaggedAt: 'desc' },
      include: {
        patient: { select: { name: true, mrn: true } },
        test: { select: { name: true, code: true } },
        order: { select: { orderNumber: true } },
      },
    });
  }

  /**
   * Retrieve the configurable escalation timeout from system settings.
   * Falls back to the default 15 minutes if not configured.
   */
  private async getEscalationTimeout(): Promise<number> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'critical_value.escalation_timeout_ms' },
      });

      if (setting?.value) {
        const timeout = parseInt(setting.value, 10);
        if (!isNaN(timeout) && timeout > 0) {
          return timeout;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to read escalation timeout setting, using default: ${error}`,
      );
    }

    return DEFAULT_ESCALATION_TIMEOUT_MS;
  }
}
