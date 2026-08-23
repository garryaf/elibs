import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Role, NotificationType, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TatEscalationJobData, TatEscalationService } from './tat-escalation.service';

/**
 * BullMQ processor for the `tat-escalation` queue.
 *
 * Handles two job types:
 * 1. 'check-overdue': Repeatable job that runs every 5 minutes to find overdue orders
 * 2. 'notify-overdue': Sends notification to managers for a specific overdue order
 *
 * BP-GAP-02: Time-based auto-escalation for TAT overdue orders.
 */
@Processor('tat-escalation', { concurrency: 2 })
export class TatEscalationProcessor extends WorkerHost {
  private readonly logger = new Logger(TatEscalationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tatEscalationService: TatEscalationService,
  ) {
    super();
  }

  async process(job: Job<TatEscalationJobData | Record<string, never>>): Promise<void> {
    if (job.name === 'check-overdue') {
      // Periodic check for overdue orders
      await this.tatEscalationService.checkOverdueOrders();
      return;
    }

    if (job.name === 'notify-overdue') {
      const { orderId, orderNumber, patientName, maxTatMinutes, elapsedMinutes } = job.data as TatEscalationJobData;
      await this.processNotification(orderId, orderNumber, patientName, maxTatMinutes, elapsedMinutes);
      return;
    }

    this.logger.warn(`Unknown job name: ${job.name}`);
  }

  private async processNotification(
    orderId: string,
    orderNumber: string,
    patientName: string,
    maxTatMinutes: number,
    elapsedMinutes: number,
  ): Promise<void> {
    this.logger.log(
      `Processing TAT escalation notification for ${orderNumber}: ${elapsedMinutes}m / ${maxTatMinutes}m`,
    );

    try {
      // Find manager/admin users to notify
      const managers = await this.prisma.user.findMany({
        where: {
          role: { in: [Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN] },
          deletedAt: null,
        },
        select: { id: true, email: true, name: true, role: true },
      });

      if (managers.length === 0) {
        this.logger.warn('No managers found for TAT escalation notification');
        return;
      }

      // Create notification log for each manager
      for (const manager of managers) {
        await this.prisma.notificationLog.create({
          data: {
            orderId,
            type: NotificationType.EMAIL,
            recipient: manager.email,
            status: NotificationStatus.PENDING,
            attempts: 0,
          },
        });
      }

      this.logger.log(
        `TAT escalation notifications queued for ${managers.length} manager(s) for order ${orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `TAT escalation processing failed for ${orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error; // Retry via BullMQ
    }
  }
}
