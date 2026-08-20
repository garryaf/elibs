import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Structured invoice line item
 */
export interface InvoiceLineItem {
  no: number;
  testCode: string;
  testName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  amount: number;
}

/**
 * Structured invoice document representing requirement 8.7
 */
export interface InvoiceDocument {
  invoiceNumber: string;
  header: {
    clinicName: string;
    clinicAddress: string | null;
    clinicPhone: string | null;
    clinicEmail: string | null;
    invoiceDate: string;
    orderNumber: string;
  };
  patient: {
    name: string;
    mrn: string;
    nik: string | null;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: {
    dueDate: string;
    paymentMethod: string | null;
    notes: string;
  };
}

@Injectable()
export class InvoiceService {
  /**
   * Indonesian PPN tax rate (11%).
   * Pricing is TAX-INCLUSIVE: the order totalAmount already includes tax.
   * Invoice displays the tax component extracted from the inclusive price.
   */
  private readonly TAX_RATE = 0.11;

  /** Default payment terms note */
  private readonly DEFAULT_PAYMENT_TERMS =
    'Pembayaran dilakukan sebelum pengambilan hasil. Bukti pembayaran wajib disimpan.';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a structured invoice document for an order.
   * Produces invoiceNumber (INV-YYYYMMDD-XXXX), header, line items,
   * and tax breakdown (tax-inclusive: total = order.totalAmount).
   *
   * Tax-inclusive formula:
   *   total = order.totalAmount (what customer pays)
   *   taxableAmount = total / (1 + taxRate)
   *   taxAmount = total - taxableAmount
   */
  async generateInvoice(orderId: string): Promise<InvoiceDocument> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        clinic: true,
        orderDetails: {
          include: { test: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const invoiceNumber = this.generateInvoiceNumber(order.createdAt);

    const lineItems = this.buildLineItems(order.orderDetails);

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = order.discountAmount
      ? Number(order.discountAmount)
      : 0;

    // Tax-inclusive approach: total is what the customer actually pays
    // The tax is embedded within the price, not added on top
    const total = subtotal - discountAmount;
    const taxableAmount = Math.round(total / (1 + this.TAX_RATE));
    const taxAmount = total - taxableAmount;

    // Due date: 7 days from order creation (or invoice date for paid orders)
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice: InvoiceDocument = {
      invoiceNumber,
      header: {
        clinicName: order.clinic?.name ?? 'eLIS Laboratory',
        clinicAddress: order.clinic?.address ?? null,
        clinicPhone: order.clinic?.phone ?? null,
        clinicEmail: order.clinic?.email ?? null,
        invoiceDate: order.createdAt.toISOString().slice(0, 10),
        orderNumber: order.orderNumber,
      },
      patient: {
        name: order.patient.name,
        mrn: order.patient.mrn,
        nik: order.patient.nik ?? null,
      },
      lineItems,
      subtotal,
      discountAmount,
      taxableAmount,
      taxRate: this.TAX_RATE,
      taxAmount,
      total,
      paymentTerms: {
        dueDate: dueDate.toISOString().slice(0, 10),
        paymentMethod: order.paymentMethod ?? null,
        notes: this.DEFAULT_PAYMENT_TERMS,
      },
    };

    return invoice;
  }

  /**
   * Generate invoice number in format INV-YYYYMMDD-XXXX
   * Uses order creation date + random sequence (deterministic per request).
   * For production, this should use a sequence table similar to ReceiptSequence.
   */
  private generateInvoiceNumber(referenceDate: Date): string {
    const datePart = referenceDate.toISOString().slice(0, 10).replace(/-/g, '');
    const sequencePart = Math.floor(1000 + Math.random() * 9000).toString();
    return `INV-${datePart}-${sequencePart}`;
  }

  /**
   * Build structured line items from OrderDetails
   */
  private buildLineItems(
    orderDetails: Array<{
      test: { name: string; code: string };
      price: unknown;
      discount: unknown;
      finalPrice: unknown;
    }>,
  ): InvoiceLineItem[] {
    return orderDetails.map((detail, index) => ({
      no: index + 1,
      testCode: detail.test.code,
      testName: detail.test.name,
      quantity: 1,
      unitPrice: Number(detail.price),
      discount: Number(detail.discount),
      amount: Number(detail.finalPrice),
    }));
  }
}
