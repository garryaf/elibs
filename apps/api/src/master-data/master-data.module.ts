import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { TariffController } from './tariff.controller';
import { MasterDataService } from './master-data.service';
import { ReferenceMasterService } from './reference-master.service';
import { TariffResolverService } from './tariff-resolver.service';
import { BulkImportService } from './bulk-import/bulk-import.service';
import { BulkExportService } from './bulk-import/bulk-export.service';
import { BulkImportController } from './bulk-import/bulk-import.controller';
import { MASTER_DATA_QUERY_SERVICE } from './interfaces/master-data-query.interface';
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
    BulkImportController,
    DoctorController,
    ClinicController,
    InsuranceController,
    EquipmentController,
    ReagentController,
    SampleTypeController,
    MeasurementUnitController,
  ],
  providers: [
    MasterDataService,
    ReferenceMasterService,
    TariffResolverService,
    BulkImportService,
    BulkExportService,
    {
      provide: MASTER_DATA_QUERY_SERVICE,
      useExisting: MasterDataService,
    },
  ],
  exports: [
    MasterDataService,
    ReferenceMasterService,
    TariffResolverService,
    MASTER_DATA_QUERY_SERVICE,
  ],
})
export class MasterDataModule {}
