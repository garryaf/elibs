import { Module } from '@nestjs/common';
import { MasterDataModule } from './master-data/master-data.module';
import { AuditModule } from './audit/audit.module';
import { PatientModule } from './patient/patient.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { LabWorkflowModule } from './lab-workflow/lab-workflow.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notification/notification.module';
import { RegionModule } from './region/region.module';
import { VisitModule } from './visit/visit.module';
import { ReportsModule } from './reports/reports.module';

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
    RegionModule,
    VisitModule,
    ReportsModule,
  ],
  exports: [
    AuditModule,
    PatientModule,
    OrderModule,
    PaymentModule,
    LabWorkflowModule,
    DashboardModule,
    NotificationModule,
    RegionModule,
    VisitModule,
    ReportsModule,
  ],
})
export class LaboratoryModule {}
