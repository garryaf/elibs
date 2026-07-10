import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ReceiptData,
  ReceiptLineItem,
  CashReceipt,
  InsuranceReceipt,
  CorporateReceipt,
  SplitReceipt,
} from './dto/receipt.dto';

@Injectable()
export class ReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReceipt(orderId: string): Promise<ReceiptData> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: true,
        orderDetails: {
          include: { test: true },
        },
        insurance: true,
        orderInsurances: {
          include: { insurance: true },
        },
        paymentComponents: {
          include: { insurance: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const receiptNumber = this.generateReceiptNumber();
    const lineItems = this.buildLineItems(order.orderDetails);
    const totalAmount = Number(order.totalAmount);

    const baseReceipt = {
      receiptNumber,
      orderNumber: order.orderNumber,
      issuedAt: new Date().toISOString(),
      patient: {
        name: order.patient.name,
        mrn: order.patient.mrn,
        nik: order.patient.nik,
      },
      lineItems,
      totalAmount,
    };

    // Determine receipt type
    const receiptType = this.determineReceiptType(order);

    switch (receiptType) {
      case 'SPLIT':
        return this.buildSplitReceipt(baseReceipt, order);
      case 'INSURANCE':
        return this.buildInsuranceReceipt(baseReceipt, order);
      case 'CORPORATE':
        return this.buildCorporateReceipt(baseReceipt, order);
      default:
        return this.buildCashReceipt(baseReceipt, order);
    }
  }

  private determineReceiptType(order: {
    paymentMethod: PaymentMethod | null;
    paymentComponents: unknown[];
  }): 'CASH' | 'INSURANCE' | 'CORPORATE' | 'SPLIT' {
    // Split payment takes precedence if multiple components exist
    if (order.paymentComponents.length > 1) {
      return 'SPLIT';
    }

    switch (order.paymentMethod) {
      case PaymentMethod.INSURANCE:
      case PaymentMethod.BPJS:
      case PaymentMethod.INSURANCE_CASH_FALLBACK:
        return 'INSURANCE';
      case PaymentMethod.CORPORATE_DEFERRED:
        return 'CORPORATE';
      default:
        return 'CASH';
    }
  }

  private buildCashReceipt(
    baseReceipt: Omit<CashReceipt, 'type' | 'paymentMethod' | 'amountPaid' | 'change'>,
    order: { paymentMethod: PaymentMethod | null; amountPaid: unknown; totalAmount: unknown },
  ): CashReceipt {
    const amountPaid = order.amountPaid ? Number(order.amountPaid) : baseReceipt.totalAmount;
    const change = amountPaid - baseReceipt.totalAmount;

    return {
      ...baseReceipt,
      type: 'CASH',
      paymentMethod: order.paymentMethod ?? 'CASH',
      amountPaid,
      change: change > 0 ? change : 0,
    };
  }

  private buildInsuranceReceipt(
    baseReceipt: Omit<
      InsuranceReceipt,
      | 'type'
      | 'insuranceName'
      | 'insuranceCode'
      | 'claimReference'
      | 'coveredAmount'
      | 'patientCopay'
      | 'memberNumber'
      | 'isRejectionFallback'
      | 'rejectionReason'
    >,
    order: {
      paymentMethod: PaymentMethod | null;
      insurance: { name: string; code: string } | null;
      orderInsurances: Array<{
        claimReference: string | null;
        coveredAmount: unknown;
        copayAmount: unknown;
        memberNumber: string | null;
        rejectionReason: string | null;
        insurance: { name: string; code: string };
      }>;
      paymentComponents: Array<{
        amount: unknown;
        insurance: { name: string; code: string } | null;
      }>;
    },
  ): InsuranceReceipt {
    const isRejectionFallback =
      order.paymentMethod === PaymentMethod.INSURANCE_CASH_FALLBACK;

    // Get primary insurance info from orderInsurances or fallback to order.insurance
    const primaryOrderInsurance = order.orderInsurances[0];
    const insuranceName =
      primaryOrderInsurance?.insurance?.name ?? order.insurance?.name ?? 'Unknown';
    const insuranceCode =
      primaryOrderInsurance?.insurance?.code ?? order.insurance?.code ?? '';

    // Get coverage details from OrderInsurance or PaymentComponent
    let coveredAmount = 0;
    let patientCopay = 0;
    let claimReference: string | null = null;
    let memberNumber: string | null = null;
    let rejectionReason: string | null = null;

    if (primaryOrderInsurance) {
      coveredAmount = primaryOrderInsurance.coveredAmount
        ? Number(primaryOrderInsurance.coveredAmount)
        : 0;
      patientCopay = primaryOrderInsurance.copayAmount
        ? Number(primaryOrderInsurance.copayAmount)
        : 0;
      claimReference = primaryOrderInsurance.claimReference;
      memberNumber = primaryOrderInsurance.memberNumber;
      rejectionReason = primaryOrderInsurance.rejectionReason;
    } else if (order.paymentComponents.length > 0) {
      // Fallback: derive from payment components
      const insuranceComponent = order.paymentComponents.find(
        (c) => c.insurance !== null,
      );
      if (insuranceComponent) {
        coveredAmount = Number(insuranceComponent.amount);
        patientCopay = baseReceipt.totalAmount - coveredAmount;
      }
    }

    // If no copay calculated but we have a total, assume fully covered
    if (coveredAmount === 0 && !isRejectionFallback) {
      coveredAmount = baseReceipt.totalAmount;
    }

    return {
      ...baseReceipt,
      type: 'INSURANCE',
      insuranceName,
      insuranceCode,
      claimReference,
      coveredAmount,
      patientCopay,
      memberNumber,
      isRejectionFallback,
      rejectionReason: isRejectionFallback ? rejectionReason : null,
    };
  }

  private buildCorporateReceipt(
    baseReceipt: Omit<CorporateReceipt, 'type' | 'companyName' | 'companyCode' | 'billingNote'>,
    order: {
      insurance: { name: string; code: string } | null;
      orderInsurances: Array<{
        insurance: { name: string; code: string };
        notes: string | null;
      }>;
    },
  ): CorporateReceipt {
    const corporateInsurance = order.orderInsurances.find(
      (oi) => oi.insurance !== null,
    );

    const companyName =
      corporateInsurance?.insurance?.name ?? order.insurance?.name ?? 'Unknown';
    const companyCode =
      corporateInsurance?.insurance?.code ?? order.insurance?.code ?? '';
    const billingNote =
      corporateInsurance?.notes ?? 'Deferred billing — invoice will follow';

    return {
      ...baseReceipt,
      type: 'CORPORATE',
      companyName,
      companyCode,
      billingNote,
    };
  }

  private buildSplitReceipt(
    baseReceipt: Omit<SplitReceipt, 'type' | 'components'>,
    order: {
      paymentComponents: Array<{
        paymentMethod: PaymentMethod;
        amount: unknown;
        reference: string | null;
        insurance: { name: string; code: string } | null;
      }>;
    },
  ): SplitReceipt {
    const components = order.paymentComponents.map((comp) => ({
      paymentMethod: comp.paymentMethod,
      amount: Number(comp.amount),
      insuranceName: comp.insurance?.name,
      reference: comp.reference ?? undefined,
    }));

    return {
      ...baseReceipt,
      type: 'SPLIT',
      components,
    };
  }

  private buildLineItems(
    orderDetails: Array<{
      test: { name: string; code: string };
      price: unknown;
      discount: unknown;
      finalPrice: unknown;
    }>,
  ): ReceiptLineItem[] {
    return orderDetails.map((detail) => ({
      testName: detail.test.name,
      testCode: detail.test.code,
      price: Number(detail.price),
      discount: Number(detail.discount),
      finalPrice: Number(detail.finalPrice),
    }));
  }

  private generateReceiptNumber(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
    return `RCP-${datePart}-${randomPart}`;
  }
}
