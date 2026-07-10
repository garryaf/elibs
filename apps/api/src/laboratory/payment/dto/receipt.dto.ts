export interface ReceiptLineItem {
  testName: string;
  testCode: string;
  price: number;
  discount: number;
  finalPrice: number;
}

export interface BaseReceipt {
  type: 'CASH' | 'INSURANCE' | 'CORPORATE' | 'SPLIT';
  receiptNumber: string; // RCP-YYYYMMDD-XXXX
  orderNumber: string;
  issuedAt: string;
  patient: { name: string; mrn: string; nik: string };
  lineItems: ReceiptLineItem[];
  totalAmount: number;
}

export interface CashReceipt extends BaseReceipt {
  type: 'CASH';
  paymentMethod: string;
  amountPaid: number;
  change: number;
}

export interface InsuranceReceipt extends BaseReceipt {
  type: 'INSURANCE';
  insuranceName: string;
  insuranceCode: string;
  claimReference: string | null;
  coveredAmount: number;
  patientCopay: number;
  memberNumber: string | null;
  isRejectionFallback: boolean;
  rejectionReason: string | null;
}

export interface CorporateReceipt extends BaseReceipt {
  type: 'CORPORATE';
  companyName: string;
  companyCode: string;
  billingNote: string;
}

export interface SplitReceipt extends BaseReceipt {
  type: 'SPLIT';
  components: Array<{
    paymentMethod: string;
    amount: number;
    insuranceName?: string;
    reference?: string;
  }>;
}

export type ReceiptData =
  | CashReceipt
  | InsuranceReceipt
  | CorporateReceipt
  | SplitReceipt;
