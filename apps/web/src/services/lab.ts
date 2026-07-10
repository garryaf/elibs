/**
 * Lab Service — TanStack Query hooks for laboratory workflow domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const labKeys = {
  all: ["lab"] as const,
  queue: (params?: Record<string, unknown>) => [...labKeys.all, "queue", params] as const,
  approvalQueue: (params?: Record<string, unknown>) => [...labKeys.all, "approval-queue", params] as const,
  deltaCheck: (orderId: string) => [...labKeys.all, "delta-check", orderId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useLabQueue(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: labKeys.queue(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.status) qs.set("status", params.status);
      return apiClient.get(`/api/v1/lab/queue?${qs.toString()}`);
    },
  });
}

export function useApprovalQueue(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: labKeys.approvalQueue(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      return apiClient.get(`/api/v1/lab/approval-queue?${qs.toString()}`);
    },
  });
}

export function useDeltaCheck(orderId: string) {
  return useQuery({
    queryKey: labKeys.deltaCheck(orderId),
    queryFn: () => apiClient.get(`/api/v1/lab/${orderId}/delta-check`),
    enabled: !!orderId,
  });
}

export function useConfirmSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: unknown }) =>
      apiClient.post(`/api/v1/lab/${orderId}/sample`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
    },
  });
}

export function useEnterResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: unknown }) =>
      apiClient.put(`/api/v1/lab/${orderId}/results`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
    },
  });
}

export function useVerifyResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, notes }: { orderId: string; notes?: string }) =>
      apiClient.post(`/api/v1/lab/${orderId}/verify`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
      queryClient.invalidateQueries({ queryKey: labKeys.approvalQueue() });
    },
  });
}

export function useApproveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, interpretation }: { orderId: string; interpretation?: string }) =>
      apiClient.post(`/api/v1/lab/${orderId}/approve`, { interpretation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.approvalQueue() });
    },
  });
}
