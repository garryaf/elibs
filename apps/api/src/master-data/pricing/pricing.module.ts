import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { BulkPricingController } from './bulk-pricing.controller';
import { BulkPricingService } from './bulk-pricing.service';
import { AuditModule } from '../../laboratory/audit/audit.module';

/**
 * PricingModule provides the consolidated PricingService for multi-tier
 * price resolution across the application, along with HTTP endpoints
 * for managing price lists, bulk adjustments, and price history.
 *
 * Requirements: 7.1, 7.2, 7.3, Bulk Pricing, Price Audit Trail
 */
@Module({
  imports: [AuditModule],
  controllers: [PricingController, BulkPricingController],
  providers: [PricingService, BulkPricingService],
  exports: [PricingService, BulkPricingService],
})
export class PricingModule {}
