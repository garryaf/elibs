import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { MrnGeneratorService } from './mrn-generator.service';
import { RegionModule } from '../region/region.module';

@Module({
  imports: [RegionModule],
  controllers: [PatientController],
  providers: [PatientService, MrnGeneratorService],
  exports: [PatientService, MrnGeneratorService],
})
export class PatientModule {}
