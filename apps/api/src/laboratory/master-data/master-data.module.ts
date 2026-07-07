import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { TariffController } from './tariff.controller';
import { MasterDataService } from './master-data.service';

@Module({
  controllers: [MasterDataController, TariffController],
  providers: [MasterDataService],
  exports: [MasterDataService],
})
export class MasterDataModule {}
