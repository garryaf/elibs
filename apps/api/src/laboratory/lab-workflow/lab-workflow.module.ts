import { Module, forwardRef } from '@nestjs/common';
import { AutoFlaggingService } from './auto-flagging.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { LabWorkflowService } from './lab-workflow.service';
import { LabWorkflowController } from './lab-workflow.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  controllers: [LabWorkflowController],
  providers: [OrderStateMachineService, LabWorkflowService, AutoFlaggingService],
  exports: [OrderStateMachineService, LabWorkflowService, AutoFlaggingService],
})
export class LabWorkflowModule {}
