import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { TariffController } from './tariff.controller';
import { MasterDataService } from './master-data.service';
import { ReferenceMasterService } from './reference-master.service';
import {
  DoctorController,
  ClinicController,
  InsuranceController,
  EquipmentController,
  ReagentController,
  SampleTypeController,
  MeasurementUnitController,
} from './reference-master.controller';

@Module({
  controllers: [
    MasterDataController,
    TariffController,
    DoctorController,
    ClinicController,
    InsuranceController,
    EquipmentController,
    ReagentController,
    SampleTypeController,
    MeasurementUnitController,
  ],
  providers: [MasterDataService, ReferenceMasterService],
  exports: [MasterDataService, ReferenceMasterService],
})
export class MasterDataModule {}
