/**
 * Refund Service — TanStack Query hooks for refund processing domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RefundStatus = "PENDING" | "APPROVED" | "PROCESSED" | "REJECTED";

export type PaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "EDC"
  | "INSURANCE"
  | "BPJS"
  | "INSURANCE_CASH_FALLBACK"
  | "CORPORATE_DEFERRED";

export interface Refund {
  id: string;
  orderId: string;
  amount: number | string;
  reason: string;
  status: RefundStatus;
  refundMethod?: PaymentMethod | null;
  processedAt?: string | null;
  processedBy?: string | null;
  reference?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount?: number | string;
    amountPaid?: number | string;
    patient?: {
      id: string;
      name: string;
      mrn: string;
    };
  };
}

export interface CreateRefundPayload {
  orderId: string;
  amount: number;
  reason: string;
  refundMethod?: PaymentMethod;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const refundKeys = {
  all: ["refunds"] as const,
  list: (params?: Record<string, unknown>) =>
    [...refundKeys.all, "list", params] as const,
  byOrder: (orderId: string) =>
    [...refundKeys.all, "order", orderId] as const,
  detail: (id: string) => [...refundKeys.all, "detail", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch refunds list — queries all orders that have refunds.
 * Uses a dedicated listing endpoint if available, otherwise fetches order-level refunds.
 */
export function useRefunds(params?: {
  page?: number;
  limit?: number;
  status?: RefundStatus;
  search?: string;
}) {
  return useQuery({
    queryKey: refundKeys.list(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.status) qs.set("status", params.status);
      if (params?.search) qs.set("search", params.search);
      return apiClient.get(`/api/v1/refunds?${qs.toString()}`);
    },
  });
}

/**
 * Fetch refunds for a specific order
 */
export function useRefundsByOrder(orderId: string) {
  return useQuery({
    queryKey: refundKeys.byOrder(orderId),
    queryFn: () => apiClient.get(`/api/v1/orders/${orderId}/refunds`),
    enabled: !!orderId,
  });
}

/**
 * Create a refund for an order
 */
export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, amount, reason, refundMethod }: CreateRefundPayload) =>
      apiClient.post(`/api/v1/orders/${orderId}/refund`, {
        amount,
        reason,
        refundMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: refundKeys.all });
    },
  });
}

/**
 * Search orders for refund form (by order number)
 */
export function useOrderSearch(search: string) {
  return useQuery({
    queryKey: ["orders", "search", search],
    queryFn: () => apiClient.get(`/api/v1/orders?search=${encodeURIComponent(search)}&limit=10`),
    enabled: search.length >= 2,
  });
}
