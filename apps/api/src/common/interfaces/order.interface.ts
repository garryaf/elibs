/**
 * Order Module — Public Interface
 * Only these methods/types should be used by other modules.
 */
export interface IOrderService {
  findById(id: string): Promise<OrderInfo | null>;
  validateOrderExists(id: string): Promise<void>;
  validateOrderStatus(id: string, expectedStatus: string): Promise<void>;
}

export interface OrderInfo {
  id: string;
  orderNumber: string;
  patientId: string;
  status: string;
  totalAmount: number;
  insuranceId: string | null;
}
