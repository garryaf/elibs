import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { BarcodeModule } from '../../common/barcode';
import { ReceiptService } from './receipt.service';
import { ReceiptSequenceService } from './receipt-sequence.service';
import { InvoiceService } from './invoice.service';
import { RefundService } from './refund.service';
import { BatchInvoiceController } from './batch-invoice.controller';
import { BatchInvoiceService } from './batch-invoice.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';
import { AuditModule } from '../audit/audit.module';
import { LabWorkflowModule } from '../lab-workflow/lab-workflow.module';
import { ApprovalModule } from '../../approval/approval.module';

@Module({
  imports: [AuditModule, BarcodeModule, LabWorkflowModule, ApprovalModule],
  controllers: [PaymentController, BatchInvoiceController, ReconciliationController],
  providers: [PaymentService, ReceiptService, ReceiptSequenceService, InvoiceService, RefundService, BatchInvoiceService, ReconciliationService],
  exports: [PaymentService, ReceiptService, ReceiptSequenceService, InvoiceService, RefundService, BatchInvoiceService, ReconciliationService],
})
export class PaymentModule {}
