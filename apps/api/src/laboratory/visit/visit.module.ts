import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InsuranceModule } from '../../insurance/insurance.module';
import { VisitController } from './visit.controller';
import { VisitService } from './visit.service';
import { VisitNumberGeneratorService } from './visit-number-generator.service';

@Module({
  imports: [AuditModule, InsuranceModule],
  controllers: [VisitController],
  providers: [VisitService, VisitNumberGeneratorService],
  exports: [VisitService, VisitNumberGeneratorService],
})
export class VisitModule {}
