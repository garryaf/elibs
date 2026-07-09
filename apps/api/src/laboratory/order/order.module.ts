import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { TariffResolverService } from './tariff-resolver.service';
import { VisitModule } from '../visit/visit.module';

@Module({
  imports: [VisitModule],
  controllers: [OrderController],
  providers: [OrderService, TariffResolverService],
  exports: [OrderService, TariffResolverService],
})
export class OrderModule {}
