/**
 * Reference Value Service — TanStack Query hooks for reference value management
 *
 * Reference values define normal/critical ranges per test, segmented by gender and age.
 * Backend endpoints: GET/POST/PUT/DELETE /api/v1/master/tests/:testId/reference-values
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Gender = "MALE" | "FEMALE";

export interface ReferenceValue {
  id: string;
  testId: string;
  gender: Gender;
  minAge: number;
  maxAge: number;
  minRef: string | number;
  maxRef: string | number;
  criticalMin: string | number | null;
  criticalMax: string | number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReferenceValuePayload {
  gender: Gender;
  minAge?: number;
  maxAge?: number;
  minRef: number;
  maxRef: number;
  criticalMin?: number | null;
  criticalMax?: number | null;
}

export interface UpdateReferenceValuePayload extends CreateReferenceValuePayload {
  id: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const referenceValueKeys = {
  all: ["reference-values"] as const,
  byTest: (testId: string) => [...referenceValueKeys.all, "test", testId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch reference values for a specific test
 */
export function useReferenceValues(testId: string) {
  return useQuery({
    queryKey: referenceValueKeys.byTest(testId),
    queryFn: () =>
      apiClient.get<ReferenceValue[]>(`/api/v1/master/tests/${testId}/reference-values`),
    enabled: !!testId,
  });
}

/**
 * Create a reference value for a test
 */
export function useCreateReferenceValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      data,
    }: {
      testId: string;
      data: CreateReferenceValuePayload;
    }) => apiClient.post<ReferenceValue>(`/api/v1/master/tests/${testId}/reference-values`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: referenceValueKeys.byTest(variables.testId),
      });
    },
  });
}

/**
 * Update a reference value
 */
export function useUpdateReferenceValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      id,
      data,
    }: {
      testId: string;
      id: string;
      data: CreateReferenceValuePayload;
    }) =>
      apiClient.put<ReferenceValue>(
        `/api/v1/master/tests/${testId}/reference-values/${id}`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: referenceValueKeys.byTest(variables.testId),
      });
    },
  });
}

/**
 * Delete a reference value
 */
export function useDeleteReferenceValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, id }: { testId: string; id: string }) =>
      apiClient.delete(`/api/v1/master/tests/${testId}/reference-values/${id}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: referenceValueKeys.byTest(variables.testId),
      });
    },
  });
}
