import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { BarcodeModule } from '../../common/barcode';
import { ReceiptService } from './receipt.service';
import { BatchInvoiceController } from './batch-invoice.controller';
import { BatchInvoiceService } from './batch-invoice.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, BarcodeModule],
  controllers: [PaymentController, BatchInvoiceController],
  providers: [PaymentService, ReceiptService, BatchInvoiceService],
  exports: [PaymentService, ReceiptService, BatchInvoiceService],
})
export class PaymentModule {}
