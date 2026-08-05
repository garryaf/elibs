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

export function useOrderBpjs(orderId: string) {
  return useQuery({
    queryKey: orderKeys.bpjs(orderId),
    queryFn: () => apiClient.get(`/api/v1/orders/${orderId}/bpjs`),
    enabled: !!orderId,
  });
}

export function useCreateBpjsDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.post(`/api/v1/orders/${id}/bpjs`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.bpjs(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}

export function useUpdateBpjsDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.put(`/api/v1/orders/${id}/bpjs`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.bpjs(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}

export function useVerifyBpjs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.post(`/api/v1/orders/${id}/bpjs/verify`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.bpjs(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
    },
  });
}

// ─── Claim Hooks ─────────────────────────────────────────────────────────────

export function useSubmitClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: { orderInsuranceId: string; claimReference?: string } }) =>
      apiClient.post(`/api/v1/orders/${orderId}/claims/submit`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.claims(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    },
  });
}

export function useReviewClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, orderId }: { claimId: string; orderId: string }) =>
      apiClient.put(`/api/v1/orders/claims/${claimId}/review`, {}),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.claims(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    },
  });
}

export function useApproveClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, orderId, data }: { claimId: string; orderId: string; data: { coveredAmount: number; copayAmount?: number; notes?: string } }) =>
      apiClient.put(`/api/v1/orders/claims/${claimId}/approve`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.claims(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    },
  });
}

export function usePartiallyApproveClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, orderId, data }: { claimId: string; orderId: string; data: { coveredAmount: number; copayAmount?: number; notes?: string } }) =>
      apiClient.put(`/api/v1/orders/claims/${claimId}/partially-approve`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.claims(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    },
  });
}

export function useRejectClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, orderId, data }: { claimId: string; orderId: string; data: { rejectionReason: string } }) =>
      apiClient.put(`/api/v1/orders/claims/${claimId}/reject`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.claims(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    },
  });
}

export function useMarkClaimPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, orderId }: { claimId: string; orderId: string }) =>
      apiClient.put(`/api/v1/orders/claims/${claimId}/paid`, {}),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.claims(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
    },
  });
}
