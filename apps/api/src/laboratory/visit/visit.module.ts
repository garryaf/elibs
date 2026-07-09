import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { VisitController } from './visit.controller';
import { VisitService } from './visit.service';
import { VisitNumberGeneratorService } from './visit-number-generator.service';

@Module({
  imports: [AuditModule],
  controllers: [VisitController],
  providers: [VisitService, VisitNumberGeneratorService],
  exports: [VisitService],
})
export class VisitModule {}
