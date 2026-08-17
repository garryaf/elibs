import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';
import { AnalyzerController } from './analyzer.controller';
import { AnalyzerService } from './analyzer.service';
import { AnalyzerImportProcessor } from './analyzer-import.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'analyzer-batch-import' }),
    AuditModule,
  ],
  controllers: [AnalyzerController],
  providers: [AnalyzerService, AnalyzerImportProcessor],
  exports: [AnalyzerService],
})
export class AnalyzerModule {}
