/**
 * Batch Invoice Service — TanStack Query hooks for batch invoice management
 *
 * Provides hooks for listing, creating, viewing, and transitioning batch invoices.
 * Batch invoices group orders by insurance (via OrderInsurance junction with coverageType PRIMARY)
 * for corporate bulk claim submission.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BatchInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface BatchInvoice {
  id: string;
  invoiceNumber: string;
  insuranceId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  orderCount: number;
  status: BatchInvoiceStatus;
  dueDate: string | null;
  sentAt: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  insurance: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export interface BatchInvoiceDetail extends BatchInvoice {
  items: Array<{
    id: string;
    batchInvoiceId: string;
    orderId: string;
    order: {
      id: string;
      orderNumber: string;
      totalAmount: number;
      paidAt: string | null;
      patient: {
        id: string;
        name: string;
        mrn: string;
      };
    };
  }>;
}

export interface CreateBatchInvoicePayload {
  insuranceId: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  notes?: string;
}

export interface UpdateBatchInvoiceStatusPayload {
  status: BatchInvoiceStatus;
  paidAmount?: number;
  notes?: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const batchInvoiceKeys = {
  all: ["batch-invoices"] as const,
  lists: () => [...batchInvoiceKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...batchInvoiceKeys.lists(), params] as const,
  details: () => [...batchInvoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...batchInvoiceKeys.details(), id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBatchInvoices(params?: {
  insuranceId?: string;
  status?: BatchInvoiceStatus;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.insuranceId) qs.set("insuranceId", params.insuranceId);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: batchInvoiceKeys.list(params ?? {}),
    queryFn: () =>
      apiClient.get<{
        data: BatchInvoice[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/v1/batch-invoices${query}`),
  });
}

export function useBatchInvoice(id: string) {
  return useQuery({
    queryKey: batchInvoiceKeys.detail(id),
    queryFn: () => apiClient.get<BatchInvoiceDetail>(`/api/v1/batch-invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateBatchInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBatchInvoicePayload) =>
      apiClient.post<BatchInvoice>("/api/v1/batch-invoices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchInvoiceKeys.lists() });
    },
  });
}

export function useUpdateBatchInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateBatchInvoiceStatusPayload;
    }) => apiClient.put<BatchInvoice>(`/api/v1/batch-invoices/${id}/status`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: batchInvoiceKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: batchInvoiceKeys.detail(variables.id),
      });
    },
  });
}

export function useCancelBatchInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<BatchInvoice>(`/api/v1/batch-invoices/${id}/cancel`),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: batchInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchInvoiceKeys.detail(id) });
    },
  });
}
