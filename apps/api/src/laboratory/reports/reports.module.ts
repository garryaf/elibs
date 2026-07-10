import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfReportService } from './pdf-report.service';
import { InsuranceAnalyticsController } from './insurance-analytics.controller';
import { InsuranceAnalyticsService } from './insurance-analytics.service';

@Module({
  controllers: [ReportsController, InsuranceAnalyticsController],
  providers: [ReportsService, PdfReportService, InsuranceAnalyticsService],
  exports: [ReportsService, PdfReportService, InsuranceAnalyticsService],
})
export class ReportsModule {}
