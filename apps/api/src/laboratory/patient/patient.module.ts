import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { MrnGeneratorService } from './mrn-generator.service';
import { RegionModule } from '../region/region.module';
import { AuditModule } from '../audit/audit.module';
import { InsuranceModule } from '../../insurance/insurance.module';

@Module({
  imports: [RegionModule, AuditModule, InsuranceModule],
  controllers: [PatientController],
  providers: [PatientService, MrnGeneratorService],
  exports: [PatientService, MrnGeneratorService],
})
export class PatientModule {}
