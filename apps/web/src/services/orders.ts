/**
 * Order Service — TanStack Query hooks for order domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  insurances: (id: string) => [...orderKeys.all, "insurances", id] as const,
  claims: (id: string) => [...orderKeys.all, "claims", id] as const,
  bpjs: (id: string) => [...orderKeys.all, "bpjs", id] as const,
  payments: (id: string) => [...orderKeys.all, "payments", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useOrders(params?: { page?: string; limit?: string; status?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: orderKeys.list(params ?? {}),
    queryFn: () => apiClient.get(`/api/v1/orders?${new URLSearchParams(params as any).toString()}`),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient.get(`/api/v1/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/api/v1/orders/${id}/cancel`, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}

export function useOrderClaims(orderId: string) {
  return useQuery({
    queryKey: orderKeys.claims(orderId),
    queryFn: () => apiClient.get(`/api/v1/orders/${orderId}/claims`),
    enabled: !!orderId,
  });
}

export function useOrderInsurances(orderId: string) {
  return useQuery({
    queryKey: orderKeys.insurances(orderId),
    queryFn: () => apiClient.get(`/api/v1/orders/${orderId}/insurances`),
    enabled: !!orderId,
  });
}
