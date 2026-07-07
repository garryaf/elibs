import { Module } from '@nestjs/common';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { RegionSyncService } from './region-sync.service';
import { RegionValidationService } from './region-validation.service';

@Module({
  controllers: [RegionController],
  providers: [RegionService, RegionSyncService, RegionValidationService],
  exports: [RegionService, RegionSyncService, RegionValidationService],
})
export class RegionModule {}
