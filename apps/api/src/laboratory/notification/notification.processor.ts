import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationService } from './notification.service';

export interface EmailJobData {
  notificationLogId: string;
  orderId: string;
  orderNumber: string;
  email: string;
  pdfBase64: string;
}

export interface WhatsAppJobData {
  notificationLogId: string;
  orderId: string;
  orderNumber: string;
  phone: string;
  pdfBase64: string;
}

@Processor('lab-email-delivery', { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { notificationLogId, orderId, orderNumber, email, pdfBase64 } =
      job.data;

    this.logger.log(
      `Processing email delivery for order ${orderNumber} to ${email}`,
    );

    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      await this.emailService.send(email, pdfBuffer, orderNumber);

      await this.prisma.notificationLog.update({
        where: { id: notificationLogId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          attempts: job.attemptsMade + 1,
        },
      });

      this.logger.log(
        `Email sent successfully for order ${orderNumber} to ${email}`,
      );

      // Check if all notifications are done and transition order
      await this.notificationService.checkAndTransitionToNotified(orderId);
    } catch (error) {
      await this.prisma.notificationLog.update({
        where: { id: notificationLogId },
        data: {
          attempts: job.attemptsMade + 1,
          lastError: error instanceof Error ? error.message : String(error),
          ...(job.attemptsMade + 1 >= (job.opts.attempts ?? 3)
            ? { status: NotificationStatus.FAILED }
            : {}),
        },
      });

      this.logger.error(
        `Email delivery failed for order ${orderNumber}: ${error}`,
      );

      // If this was the last attempt, still check for transition
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 3)) {
        await this.notificationService.checkAndTransitionToNotified(orderId);
      }

      throw error;
    }
  }
}

@Processor('lab-whatsapp-delivery', { concurrency: 2 })
export class WhatsAppProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job<WhatsAppJobData>): Promise<void> {
    const { notificationLogId, orderId, orderNumber, phone, pdfBase64 } =
      job.data;

    this.logger.log(
      `Processing WhatsApp delivery for order ${orderNumber} to ${phone}`,
    );

    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      await this.whatsAppService.send(phone, pdfBuffer, orderNumber);

      await this.prisma.notificationLog.update({
        where: { id: notificationLogId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          attempts: job.attemptsMade + 1,
        },
      });

      this.logger.log(
        `WhatsApp sent successfully for order ${orderNumber} to ${phone}`,
      );

      // Check if all notifications are done and transition order
      await this.notificationService.checkAndTransitionToNotified(orderId);
    } catch (error) {
      await this.prisma.notificationLog.update({
        where: { id: notificationLogId },
        data: {
          attempts: job.attemptsMade + 1,
          lastError: error instanceof Error ? error.message : String(error),
          ...(job.attemptsMade + 1 >= (job.opts.attempts ?? 3)
            ? { status: NotificationStatus.FAILED }
            : {}),
        },
      });

      this.logger.error(
        `WhatsApp delivery failed for order ${orderNumber}: ${error}`,
      );

      // If this was the last attempt, still check for transition
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 3)) {
        await this.notificationService.checkAndTransitionToNotified(orderId);
      }

      throw error;
    }
  }
}
