import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SpecimenController } from './specimen.controller';
import { SpecimenService } from './specimen.service';

@Module({
  imports: [AuditModule],
  controllers: [SpecimenController],
  providers: [SpecimenService],
  exports: [SpecimenService],
})
export class SpecimenModule {}
