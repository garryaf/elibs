import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { NotificationService } from './notification.service';
import { NotConfiguredError } from './exceptions';

export interface EmailJobData {
  notificationLogId: string;
  orderId: string;
  orderNumber: string;
  email: string;
  pdfBase64: string;
  /** When set to 'doctor_referral', uses doctor-specific email template */
  recipientType?: 'patient' | 'doctor_referral';
  /** Patient name — required for doctor_referral emails */
  patientName?: string;
  /** Doctor name — required for doctor_referral emails */
  doctorName?: string;
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
    const { notificationLogId, orderId, orderNumber, email, pdfBase64, recipientType, patientName, doctorName } =
      job.data;

    this.logger.log(
      `Processing email delivery for order ${orderNumber} to ${email}`,
    );

    // Set status to PROCESSING during active delivery
    await this.prisma.notificationLog.update({
      where: { id: notificationLogId },
      data: { status: NotificationStatus.PROCESSING },
    });

    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      if (recipientType === 'doctor_referral' && patientName && doctorName) {
        await this.emailService.sendToDoctorReferral(email, pdfBuffer, orderNumber, patientName, doctorName);
      } else {
        await this.emailService.send(email, pdfBuffer, orderNumber);
      }

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
      // NotConfiguredError: immediately mark as FAILED, do not retry
      if (error instanceof NotConfiguredError) {
        await this.prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: {
            status: NotificationStatus.FAILED,
            attempts: job.attemptsMade + 1,
            lastError: error.message,
          },
        });

        this.logger.warn(
          `Email delivery failed for order ${orderNumber}: ${error.message}`,
        );

        await this.notificationService.checkAndTransitionToNotified(orderId);
        // Do not rethrow — no point retrying a configuration error
        return;
      }

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

    // Set status to PROCESSING during active delivery
    await this.prisma.notificationLog.update({
      where: { id: notificationLogId },
      data: { status: NotificationStatus.PROCESSING },
    });

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
      // NotConfiguredError: immediately mark as FAILED, do not retry
      if (error instanceof NotConfiguredError) {
        await this.prisma.notificationLog.update({
          where: { id: notificationLogId },
          data: {
            status: NotificationStatus.FAILED,
            attempts: job.attemptsMade + 1,
            lastError: error.message,
          },
        });

        this.logger.warn(
          `WhatsApp delivery failed for order ${orderNumber}: ${error.message}`,
        );

        await this.notificationService.checkAndTransitionToNotified(orderId);
        // Do not rethrow — no point retrying a configuration error
        return;
      }

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
