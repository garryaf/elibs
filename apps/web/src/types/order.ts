export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "SAMPLE_COLLECTED"
  | "IN_ANALYSIS"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethod = "CASH" | "TRANSFER" | "EDC";

export interface TestMaster {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  minRef?: number;
  maxRef?: number;
  turnaroundHours: number; // expected TAT
}

export interface OrderDetail {
  id: string;
  testId: string;
  test: TestMaster;
  qty: number;
  price: number;
  resultValue?: number | string;
  resultFlag?: "NORMAL" | "LOW" | "HIGH" | "CRITICAL";
  status?: "PENDING" | "COMPLETED";
}

export interface Invoice {
  id: string;
  orderId: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paidAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  status: OrderStatus;
  details: OrderDetail[];
  invoice?: Invoice;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  clinicalInterpretation?: string;
  approvedAt?: string;
  approvedBy?: string;
}
