import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutoFlaggingService } from './auto-flagging.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { LabWorkflowService } from './lab-workflow.service';
import { VerificationService } from './verification.service';
import { LabWorkflowController } from './lab-workflow.controller';
import { VerificationController } from './verification.controller';
import { AddendumService } from './addendum.service';
import { AddendumController } from './addendum.controller';
import { DeltaCheckService } from './delta-check.service';
import { TatEscalationService } from './tat-escalation.service';
import { TatEscalationProcessor } from './tat-escalation.processor';
import { BpjsVerificationExpirationService } from '../order/bpjs-verification-expiration.service';
import { NotificationModule } from '../notification/notification.module';
import { QCModule } from '../qc/qc.module';
import { AuditModule } from '../audit/audit.module';
import { CriticalValueModule } from '../critical-value/critical-value.module';

@Module({
  imports: [
    forwardRef(() => NotificationModule),
    forwardRef(() => CriticalValueModule),
    QCModule,
    AuditModule,
    BullModule.registerQueue({ name: 'tat-escalation' }),
  ],
  controllers: [
    LabWorkflowController,
    VerificationController,
    AddendumController,
  ],
  providers: [
    OrderStateMachineService,
    LabWorkflowService,
    AutoFlaggingService,
    AddendumService,
    DeltaCheckService,
    VerificationService,
    BpjsVerificationExpirationService,
    TatEscalationService,
    TatEscalationProcessor,
  ],
  exports: [
    OrderStateMachineService,
    LabWorkflowService,
    AutoFlaggingService,
    AddendumService,
    DeltaCheckService,
    VerificationService,
    BpjsVerificationExpirationService,
    TatEscalationService,
  ],
})
export class LabWorkflowModule {}
