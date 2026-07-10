/**
 * Payment Module — Public Interface
 * Only these methods/types should be used by other modules.
 */
export interface IPaymentService {
  processPayment(orderId: string, dto: any, userId: string): Promise<any>;
  getPaymentComponents(orderId: string): Promise<PaymentComponentInfo[]>;
}

export interface PaymentComponentInfo {
  id: string;
  orderId: string;
  paymentMethod: string;
  amount: number;
  insuranceId: string | null;
}
