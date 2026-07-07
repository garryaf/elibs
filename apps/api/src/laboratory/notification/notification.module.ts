import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { EmailService } from './email.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailProcessor, WhatsAppProcessor } from './notification.processor';
import { LabWorkflowModule } from '../lab-workflow/lab-workflow.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'lab-pdf-generation' },
      { name: 'lab-email-delivery' },
      { name: 'lab-whatsapp-delivery' },
    ),
    LabWorkflowModule,
  ],
  providers: [
    NotificationService,
    PdfGeneratorService,
    EmailService,
    WhatsAppService,
    EmailProcessor,
    WhatsAppProcessor,
  ],
  exports: [NotificationService, WhatsAppService],
})
export class NotificationModule {}
