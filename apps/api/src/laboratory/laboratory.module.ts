import { Module } from '@nestjs/common';
import { MasterDataModule } from './master-data/master-data.module';
import { AuditModule } from './audit/audit.module';
import { PatientModule } from './patient/patient.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { LabWorkflowModule } from './lab-workflow/lab-workflow.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    MasterDataModule,
    AuditModule,
    PatientModule,
    OrderModule,
    PaymentModule,
    LabWorkflowModule,
    DashboardModule,
    NotificationModule,
  ],
  exports: [
    AuditModule,
    PatientModule,
    OrderModule,
    PaymentModule,
    LabWorkflowModule,
    DashboardModule,
    NotificationModule,
  ],
})
export class LaboratoryModule {}
