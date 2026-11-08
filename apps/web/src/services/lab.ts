/**
 * Lab Service — TanStack Query hooks for laboratory workflow domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const labKeys = {
  all: ["lab"] as const,
  queue: (params?: Record<string, unknown>) => [...labKeys.all, "queue", params] as const,
  queueStats: () => [...labKeys.all, "queue-stats"] as const,
  queueHistory: (params?: Record<string, unknown>) => [...labKeys.all, "queue-history", params] as const,
  approvalQueue: (params?: Record<string, unknown>) => [...labKeys.all, "approval-queue", params] as const,
  deltaCheck: (orderId: string) => [...labKeys.all, "delta-check", orderId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useLabQueue(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: labKeys.queue(params),
    queryFn: () => apiClient.getLabQueue(params),
  });
}

export function useLabQueueStats() {
  return useQuery({
    queryKey: labKeys.queueStats(),
    queryFn: () => apiClient.get("/api/v1/lab/queue/stats"),
  });
}

export function useLabQueueHistory(params?: { page?: number; limit?: number; search?: string; dateFrom?: string; dateTo?: string; status?: string }) {
  return useQuery({
    queryKey: labKeys.queueHistory(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.search) qs.set("search", params.search);
      if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
      if (params?.dateTo) qs.set("dateTo", params.dateTo);
      if (params?.status) qs.set("status", params.status);
      return apiClient.get(`/api/v1/lab/queue/history?${qs.toString()}`);
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

// ─── Mutation Payload Types ───────────────────────────────────────────────────

export type SampleCondition = 'ACCEPTABLE' | 'LIPEMIC' | 'HEMOLYTIC' | 'CLOTTED' | 'INSUFFICIENT';

export interface ConfirmSamplePayload {
  sampleCondition: SampleCondition;
  notes?: string;
}

export interface ResultEntry {
  orderDetailId: string;
  resultValue: string;
}

export interface EnterResultsPayload {
  results: ResultEntry[];
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useConfirmSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: ConfirmSamplePayload }) =>
      apiClient.collectSample(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
      queryClient.invalidateQueries({ queryKey: labKeys.queueStats() });
    },
  });
}

export function useEnterResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: EnterResultsPayload }) =>
      apiClient.enterResults(orderId, data.results),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
    },
  });
}

export function useVerifyResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string; verificationNotes?: string }) =>
      apiClient.verifyResults(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
      queryClient.invalidateQueries({ queryKey: labKeys.queueStats() });
      queryClient.invalidateQueries({ queryKey: labKeys.approvalQueue() });
    },
  });
}

// ─── Approve/Reject Order Types ──────────────────────────────────────────────

export interface ApproveOrderPayload {
  decision: 'APPROVE' | 'REJECT';
  interpretation?: string;
  rejectionReason?: string;
}

export function useApproveOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: ApproveOrderPayload }) =>
      apiClient.approveOrder(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.approvalQueue() });
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
      queryClient.invalidateQueries({ queryKey: labKeys.queueStats() });
    },
  });
}

// ─── Recall Order ────────────────────────────────────────────────────────────

export function useRecallOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiClient.post(`/api/v1/lab/${orderId}/recall`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
      queryClient.invalidateQueries({ queryKey: labKeys.queueStats() });
      queryClient.invalidateQueries({ queryKey: labKeys.queueHistory() });
    },
  });
}

// ─── Workload Summary ────────────────────────────────────────────────────────

export function useMyWorkload() {
  return useQuery({
    queryKey: [...labKeys.all, "my-workload"] as const,
    queryFn: () => apiClient.get("/api/v1/lab/queue/my-workload"),
    refetchInterval: 60000, // Refresh every 60 seconds
  });
}
