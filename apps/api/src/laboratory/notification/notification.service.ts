import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationType, NotificationStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PdfGeneratorService, OrderWithDetails } from './pdf-generator.service';
import { WhatsAppService } from './whatsapp.service';
import { OrderStateMachineService } from '../lab-workflow/order-state-machine.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly whatsAppService: WhatsAppService,
    private readonly orderStateMachine: OrderStateMachineService,
    @InjectQueue('lab-pdf-generation')
    private readonly pdfQueue: Queue,
    @InjectQueue('lab-email-delivery')
    private readonly emailQueue: Queue,
    @InjectQueue('lab-whatsapp-delivery')
    private readonly whatsAppQueue: Queue,
  ) {}

  /**
   * Triggered after an order reaches APPROVED status.
   * Checks consent, generates PDF, and enqueues delivery jobs.
   */
  async triggerNotifications(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        orderDetails: {
          include: {
            test: {
              include: {
                referenceValues: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found, skipping notifications`);
      return;
    }

    // Check patient consent for digital notifications
    if (!order.patient.consentDigitalNotification) {
      this.logger.log(
        `Patient ${order.patient.mrn} has not consented to digital notifications. Skipping.`,
      );
      return;
    }

    // Generate PDF report
    const pdfBuffer = await this.pdfGeneratorService.generateReport(
      order as unknown as OrderWithDetails,
    );

    const hasEmail = !!order.patient.email;
    const hasValidPhone = this.whatsAppService.isValidPhone(order.patient.phone);

    // If no valid delivery channels, skip
    if (!hasEmail && !hasValidPhone) {
      this.logger.log(
        `Patient ${order.patient.mrn} has no valid email or phone. Skipping notifications.`,
      );
      return;
    }

    // Enqueue email delivery
    if (hasEmail) {
      const emailLog = await this.prisma.notificationLog.create({
        data: {
          orderId: order.id,
          type: NotificationType.EMAIL,
          recipient: order.patient.email!,
          status: NotificationStatus.PENDING,
        },
      });

      await this.emailQueue.add(
        'send-email',
        {
          notificationLogId: emailLog.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          email: order.patient.email,
          pdfBase64: pdfBuffer.toString('base64'),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(
        `Enqueued email notification for order ${order.orderNumber} to ${order.patient.email}`,
      );
    }

    // Enqueue WhatsApp delivery
    if (hasValidPhone) {
      const whatsappLog = await this.prisma.notificationLog.create({
        data: {
          orderId: order.id,
          type: NotificationType.WHATSAPP,
          recipient: order.patient.phone!,
          status: NotificationStatus.PENDING,
        },
      });

      await this.whatsAppQueue.add(
        'send-whatsapp',
        {
          notificationLogId: whatsappLog.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          phone: order.patient.phone,
          pdfBase64: pdfBuffer.toString('base64'),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );

      this.logger.log(
        `Enqueued WhatsApp notification for order ${order.orderNumber} to ${order.patient.phone}`,
      );
    }
  }

  /**
   * Called after a notification is successfully sent.
   * Checks if all notifications for the order are complete, and if so,
   * transitions the order from APPROVED to NOTIFIED.
   */
  async checkAndTransitionToNotified(orderId: string): Promise<void> {
    const notifications = await this.prisma.notificationLog.findMany({
      where: { orderId },
    });

    if (notifications.length === 0) return;

    const allCompleted = notifications.every(
      (n) =>
        n.status === NotificationStatus.SENT ||
        n.status === NotificationStatus.FAILED,
    );

    if (!allCompleted) return;

    const hasSent = notifications.some(
      (n) => n.status === NotificationStatus.SENT,
    );

    if (hasSent) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (order && order.status === OrderStatus.APPROVED) {
        try {
          await this.orderStateMachine.transition(
            orderId,
            OrderStatus.NOTIFIED,
            { userId: 'system' },
          );
          this.logger.log(
            `Order ${orderId} transitioned to NOTIFIED after all notifications sent`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to transition order ${orderId} to NOTIFIED: ${error}`,
          );
        }
      }
    }
  }
}
