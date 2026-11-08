import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface TatEscalationJobData {
  orderId: string;
  orderNumber: string;
  patientName: string;
  maxTatMinutes: number;
  elapsedMinutes: number;
}

/**
 * TAT Escalation Service (BP-GAP-02)
 *
 * Monitors orders in the lab workflow for TAT (Turnaround Time) breaches.
 * When an order exceeds its configured TAT threshold:
 * 1. Marks the order as TAT-overdue in the database
 * 2. Queues a notification job to alert managers/supervisors
 * 3. Logs an audit event for SLA tracking
 *
 * Uses BullMQ repeatable job (every 5 minutes) instead of @nestjs/schedule.
 */
@Injectable()
export class TatEscalationService implements OnModuleInit {
  private readonly logger = new Logger(TatEscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @InjectQueue('tat-escalation')
    private readonly tatQueue: Queue,
  ) {}

  /**
   * On module init, schedule a repeatable job to check for overdue orders every 5 minutes.
   */
  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;

    try {
      // Remove any existing repeatable job to avoid duplicates on restart
      const existingJobs = await this.tatQueue.getRepeatableJobs();
      for (const job of existingJobs) {
        if (job.name === 'check-overdue') {
          await this.tatQueue.removeRepeatableByKey(job.key);
        }
      }

      // Schedule repeatable job: every 5 minutes
      await this.tatQueue.add(
        'check-overdue',
        {},
        {
          repeat: { every: 5 * 60 * 1000 }, // 5 minutes
          removeOnComplete: true,
          removeOnFail: 10,
        },
      );

      this.logger.log('TAT escalation checker scheduled (every 5 minutes)');
    } catch (error) {
      this.logger.error(
        `Failed to schedule TAT escalation job: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check for TAT-overdue orders. Called by the processor on schedule.
   */
  async checkOverdueOrders(): Promise<void> {
    this.logger.debug('Checking for TAT-overdue orders...');

    try {
      const overdueOrders = await this.findOverdueOrders();

      if (overdueOrders.length === 0) {
        this.logger.debug('No TAT-overdue orders found');
        return;
      }

      this.logger.log(`Found ${overdueOrders.length} TAT-overdue order(s)`);

      for (const order of overdueOrders) {
        await this.escalateOrder(order);
      }
    } catch (error) {
      this.logger.error(
        `TAT escalation check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find orders that have exceeded their TAT threshold.
   * Considers orders in SAMPLE_COLLECTED or IN_ANALYSIS status
   * where the elapsed time since sample collection exceeds the max TAT
   * of all tests in the order.
   */
  private async findOverdueOrders() {
    const now = new Date();

    // Get orders in lab processing stages that haven't been escalated yet
    const activeOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.SAMPLE_COLLECTED, OrderStatus.IN_ANALYSIS] },
        sampleCollectedAt: { not: null },
        tatEscalatedAt: null, // Not yet escalated
      },
      include: {
        patient: { select: { name: true, mrn: true } },
        orderDetails: {
          include: {
            test: { select: { name: true, tatMinutes: true } },
          },
        },
      },
    });

    const overdueOrders: Array<{
      id: string;
      orderNumber: string;
      patientName: string;
      patientMrn: string;
      status: OrderStatus;
      sampleCollectedAt: Date;
      maxTatMinutes: number;
      elapsedMinutes: number;
    }> = [];

    for (const order of activeOrders) {
      const maxTat = Math.max(
        ...order.orderDetails
          .map((od) => od.test?.tatMinutes || 0)
          .filter(Boolean),
      );

      if (maxTat === 0) continue; // No TAT configured for any test

      const elapsed =
        (now.getTime() - order.sampleCollectedAt!.getTime()) / 60000;

      if (elapsed > maxTat) {
        overdueOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          patientName: order.patient.name,
          patientMrn: order.patient.mrn,
          status: order.status,
          sampleCollectedAt: order.sampleCollectedAt!,
          maxTatMinutes: maxTat,
          elapsedMinutes: Math.round(elapsed),
        });
      }
    }

    return overdueOrders;
  }

  /**
   * Escalate a single overdue order:
   * 1. Mark tatEscalatedAt on the order
   * 2. Queue notification to managers
   * 3. Log audit event
   */
  private async escalateOrder(order: {
    id: string;
    orderNumber: string;
    patientName: string;
    maxTatMinutes: number;
    elapsedMinutes: number;
  }): Promise<void> {
    try {
      // Mark the order as TAT-escalated to prevent duplicate notifications
      await this.prisma.order.update({
        where: { id: order.id },
        data: { tatEscalatedAt: new Date() },
      });

      // Queue the notification job
      await this.tatQueue.add(
        'notify-overdue',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          patientName: order.patientName,
          maxTatMinutes: order.maxTatMinutes,
          elapsedMinutes: order.elapsedMinutes,
        } satisfies TatEscalationJobData,
        {
          jobId: `tat-notify-${order.id}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      // Audit log
      await this.auditService.log(
        'SYSTEM',
        'TAT_ESCALATION',
        'Order',
        order.id,
        { maxTatMinutes: order.maxTatMinutes },
        {
          elapsedMinutes: order.elapsedMinutes,
          escalatedAt: new Date().toISOString(),
        },
      );

      this.logger.warn(
        `TAT OVERDUE: Order ${order.orderNumber} (${order.patientName}) — elapsed ${order.elapsedMinutes}m / max ${order.maxTatMinutes}m`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to escalate order ${order.orderNumber}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
