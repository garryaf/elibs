import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { TariffController } from './tariff.controller';
import { CalibrationController } from './calibration.controller';
import { ReferenceValueController } from './reference-value.controller';
import { QualitativeReferenceController } from './qualitative-reference.controller';
import { MasterDataService } from './master-data.service';
import { ReferenceMasterService } from './reference-master.service';
import { TariffResolverService } from './tariff-resolver.service';
import { BulkImportService } from './bulk-import/bulk-import.service';
import { BulkExportService } from './bulk-import/bulk-export.service';
import { BulkImportController } from './bulk-import/bulk-import.controller';
import { MASTER_DATA_QUERY_SERVICE } from './interfaces/master-data-query.interface';
import { PricingModule } from './pricing/pricing.module';
import {
  DoctorController,
  ClinicController,
  InsuranceController,
  EquipmentController,
  ReagentController,
  SampleTypeController,
  MeasurementUnitController,
  MethodController,
} from './reference-master.controller';

@Module({
  imports: [PricingModule],
  controllers: [
    MasterDataController,
    TariffController,
    BulkImportController,
    CalibrationController,
    ReferenceValueController,
    QualitativeReferenceController,
    DoctorController,
    ClinicController,
    InsuranceController,
    EquipmentController,
    ReagentController,
    SampleTypeController,
    MeasurementUnitController,
    MethodController,
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
    PricingModule,
    MASTER_DATA_QUERY_SERVICE,
  ],
})
export class MasterDataModule {}
