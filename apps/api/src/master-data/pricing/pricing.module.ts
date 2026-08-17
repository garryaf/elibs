import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

/**
 * PricingModule provides the consolidated PricingService for multi-tier
 * price resolution across the application, along with HTTP endpoints
 * for managing price lists.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
