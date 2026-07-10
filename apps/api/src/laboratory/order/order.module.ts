import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ClaimService } from './claim.service';
import { InsuranceRejectionService } from './insurance-rejection.service';
import { TariffResolverService } from './tariff-resolver.service';
import { OrderValidationGuard } from './order-validation.guard';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { VisitModule } from '../visit/visit.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [VisitModule, AuditModule],
  controllers: [OrderController, MigrationController],
  providers: [OrderService, ClaimService, InsuranceRejectionService, TariffResolverService, OrderValidationGuard, MigrationService],
  exports: [OrderService, ClaimService, InsuranceRejectionService, TariffResolverService, OrderValidationGuard, MigrationService],
})
export class OrderModule {}
