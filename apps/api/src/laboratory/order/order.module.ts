import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TariffResolverService } from './tariff-resolver.service';

@Module({
  controllers: [OrderController],
  providers: [OrderService, TariffResolverService],
  exports: [OrderService, TariffResolverService],
})
export class OrderModule {}
