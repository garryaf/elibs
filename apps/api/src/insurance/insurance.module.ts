import { Module } from '@nestjs/common';
import { InsuranceConsolidationService } from './insurance-consolidation.service';
import { InsuranceMigrationService } from './insurance-migration.service';

@Module({
  providers: [InsuranceConsolidationService, InsuranceMigrationService],
  exports: [InsuranceConsolidationService, InsuranceMigrationService],
})
export class InsuranceModule {}
