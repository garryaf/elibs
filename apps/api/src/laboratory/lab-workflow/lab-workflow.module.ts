import { Module } from '@nestjs/common';
import { AutoFlaggingService } from './auto-flagging.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { LabWorkflowService } from './lab-workflow.service';
import { LabWorkflowController } from './lab-workflow.controller';

@Module({
  controllers: [LabWorkflowController],
  providers: [OrderStateMachineService, LabWorkflowService, AutoFlaggingService],
  exports: [OrderStateMachineService, LabWorkflowService, AutoFlaggingService],
})
export class LabWorkflowModule {}
