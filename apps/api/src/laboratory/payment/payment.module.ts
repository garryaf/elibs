import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { BarcodeService } from './barcode.service';
import { ReceiptService } from './receipt.service';
import { BatchInvoiceController } from './batch-invoice.controller';
import { BatchInvoiceService } from './batch-invoice.service';

@Module({
  controllers: [PaymentController, BatchInvoiceController],
  providers: [PaymentService, BarcodeService, ReceiptService, BatchInvoiceService],
  exports: [PaymentService, BarcodeService, ReceiptService, BatchInvoiceService],
})
export class PaymentModule {}
