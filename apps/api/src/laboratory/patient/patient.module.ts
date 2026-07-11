import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { MrnGeneratorService } from './mrn-generator.service';
import { RegionModule } from '../region/region.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [RegionModule, AuditModule],
  controllers: [PatientController],
  providers: [PatientService, MrnGeneratorService],
  exports: [PatientService, MrnGeneratorService],
})
export class PatientModule {}
