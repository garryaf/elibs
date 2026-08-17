import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderSequenceService } from './order-sequence.service';
import { ClaimService } from './claim.service';
import { InsuranceRejectionService } from './insurance-rejection.service';
import { TariffResolverService } from './tariff-resolver.service';
import { OrderValidationGuard } from './order-validation.guard';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { BpjsApiService } from './bpjs-api.service';
import { BpjsVerificationExpirationService } from './bpjs-verification-expiration.service';
import { VisitModule } from '../visit/visit.module';
import { AuditModule } from '../audit/audit.module';
import { InsuranceModule } from '../../insurance/insurance.module';
import { LabWorkflowModule } from '../lab-workflow/lab-workflow.module';
import { BarcodeModule } from '../../common/barcode/barcode.module';

@Module({
  imports: [ConfigModule, VisitModule, AuditModule, InsuranceModule, LabWorkflowModule, BarcodeModule],
  controllers: [OrderController, MigrationController],
  providers: [OrderService, OrderSequenceService, ClaimService, InsuranceRejectionService, TariffResolverService, OrderValidationGuard, MigrationService, BpjsApiService, BpjsVerificationExpirationService],
  exports: [OrderService, OrderSequenceService, ClaimService, InsuranceRejectionService, TariffResolverService, OrderValidationGuard, MigrationService, BpjsApiService, BpjsVerificationExpirationService],
})
export class OrderModule {}
