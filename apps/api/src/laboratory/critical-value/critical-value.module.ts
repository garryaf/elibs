import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationModule } from '../notification/notification.module';
import { CriticalValueService } from './critical-value.service';
import { CriticalValueController } from './critical-value.controller';
import { CriticalValueEscalationProcessor } from './critical-value-escalation.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'critical-value-escalation' }),
    NotificationModule,
  ],
  controllers: [CriticalValueController],
  providers: [CriticalValueService, CriticalValueEscalationProcessor],
  exports: [CriticalValueService],
})
export class CriticalValueModule {}
