/**
 * Patient Service — TanStack Query hooks for patient domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, "detail"] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  insurances: (id: string) => [...patientKeys.all, "insurances", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function usePatients(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: patientKeys.list(params ?? {}),
    queryFn: () => apiClient.getPatients(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => apiClient.get(`/api/v1/patients/${id}`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.createPatient(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.updatePatient(id, data as any),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
    },
  });
}
