/**
 * Visit Service — TanStack Query hooks for visit domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const visitKeys = {
  all: ["visits"] as const,
  lists: () => [...visitKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...visitKeys.lists(), params] as const,
  detail: (id: string) => [...visitKeys.all, "detail", id] as const,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VisitListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  doctorId?: string;
  clinicId?: string;
}

export interface CreateVisitPayload {
  patientId: string;
  paymentMethod: string;
  doctorId?: string;
  clinicId?: string;
  insuranceId?: string;
  bpjsNumber?: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useVisits(params?: VisitListParams) {
  return useQuery({
    queryKey: visitKeys.list((params ?? {}) as Record<string, unknown>),
    queryFn: () => apiClient.getVisits(params),
  });
}

export function useVisit(id: string) {
  return useQuery({
    queryKey: visitKeys.detail(id),
    queryFn: () => apiClient.getVisit(id),
    enabled: !!id,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVisitPayload) => apiClient.createVisit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
    },
  });
}

export function useCancelVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.cancelVisit(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visitKeys.lists() });
    },
  });
}
