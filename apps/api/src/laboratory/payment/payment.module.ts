import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { BarcodeService } from './barcode.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, BarcodeService],
  exports: [PaymentService, BarcodeService],
})
export class PaymentModule {}
