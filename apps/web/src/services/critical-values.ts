/**
 * Critical Values Service — TanStack Query hooks for critical value alerting
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CriticalValueStatus =
  | "PENDING"
  | "NOTIFIED"
  | "ACKNOWLEDGED"
  | "ESCALATED";

export interface CriticalValueLog {
  id: string;
  orderId: string;
  orderDetailId: string;
  testId: string;
  patientId: string;
  resultValue: string;
  flaggedAt: string;
  notificationStatus: CriticalValueStatus;
  notifiedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgmentNotes?: string;
  escalatedAt?: string;
  escalationMethod?: string;
  clinicianId?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  patient?: { name: string; mrn: string };
  test?: { name: string; code: string };
  order?: { orderNumber: string };
}

export interface AcknowledgeCriticalValuePayload {
  notes?: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const criticalValueKeys = {
  all: ["critical-values"] as const,
  list: (params?: Record<string, unknown>) =>
    [...criticalValueKeys.all, "list", params] as const,
  unacknowledged: () => [...criticalValueKeys.all, "unacknowledged"] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCriticalValues(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: criticalValueKeys.list(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.status) qs.set("status", params.status);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      return apiClient.get(`/api/v1/critical-values${query}`);
    },
  });
}

export function useUnacknowledgedCriticalValues() {
  return useQuery({
    queryKey: criticalValueKeys.unacknowledged(),
    queryFn: () => apiClient.get("/api/v1/critical-values/unacknowledged"),
    refetchInterval: 30000, // Poll every 30s as fallback to WebSocket
  });
}

export function useAcknowledgeCriticalValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: AcknowledgeCriticalValuePayload;
    }) => apiClient.post(`/api/v1/critical-values/${id}/acknowledge`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: criticalValueKeys.all });
    },
  });
}
