import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationController, WhatsAppDeliveryController } from './notification.controller';
import { PdfReportController } from './pdf-report.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { PdfReportProcessor } from './pdf-report.processor';
import { PdfReportCacheService } from './pdf-report-cache.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailProcessor, WhatsAppProcessor } from './notification.processor';
import { LabWorkflowModule } from '../lab-workflow/lab-workflow.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'lab-pdf-generation' },
      { name: 'lab-email-delivery' },
      { name: 'lab-whatsapp-delivery' },
    ),
    forwardRef(() => LabWorkflowModule),
    AuditModule,
  ],
  controllers: [NotificationController, WhatsAppDeliveryController, PdfReportController],
  providers: [
    NotificationService,
    PdfGeneratorService,
    PdfReportProcessor,
    PdfReportCacheService,
    EmailService,
    WhatsAppService,
    EmailProcessor,
    WhatsAppProcessor,
  ],
  exports: [NotificationService, WhatsAppService, EmailService, PdfGeneratorService, PdfReportCacheService],
})
export class NotificationModule {}
