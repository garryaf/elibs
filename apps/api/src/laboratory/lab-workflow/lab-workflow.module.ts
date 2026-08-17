import { Module, forwardRef } from '@nestjs/common';
import { AutoFlaggingService } from './auto-flagging.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { LabWorkflowService } from './lab-workflow.service';
import { VerificationService } from './verification.service';
import { LabWorkflowController } from './lab-workflow.controller';
import { VerificationController } from './verification.controller';
import { AddendumService } from './addendum.service';
import { AddendumController } from './addendum.controller';
import { DeltaCheckService } from './delta-check.service';
import { BpjsVerificationExpirationService } from '../order/bpjs-verification-expiration.service';
import { NotificationModule } from '../notification/notification.module';
import { QCModule } from '../qc/qc.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => NotificationModule), QCModule, AuditModule],
  controllers: [LabWorkflowController, VerificationController, AddendumController],
  providers: [OrderStateMachineService, LabWorkflowService, AutoFlaggingService, AddendumService, DeltaCheckService, VerificationService, BpjsVerificationExpirationService],
  exports: [OrderStateMachineService, LabWorkflowService, AutoFlaggingService, AddendumService, DeltaCheckService, VerificationService, BpjsVerificationExpirationService],
})
export class LabWorkflowModule {}
