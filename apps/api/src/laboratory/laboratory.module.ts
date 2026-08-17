import { Module } from '@nestjs/common';
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
import { SpecimenModule } from './specimen/specimen.module';
import { QCModule } from './qc/qc.module';
import { CriticalValueModule } from './critical-value/critical-value.module';
import { AnalyzerModule } from './analyzer/analyzer.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
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
    SpecimenModule,
    QCModule,
    CriticalValueModule,
    AnalyzerModule,
    PortalModule,
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
    SpecimenModule,
    QCModule,
    CriticalValueModule,
    AnalyzerModule,
    PortalModule,
  ],
})
export class LaboratoryModule {}
