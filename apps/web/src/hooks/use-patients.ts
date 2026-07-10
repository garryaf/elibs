"use client";

import { apiClient } from "@/lib/api";
import { useApi } from "./use-api";

/**
 * @deprecated Prefer `usePatients` from `@/services/patients` (React Query-based).
 */
export function usePatients(params?: { page?: number; limit?: number; search?: string }) {
  return useApi(
    () => apiClient.getPatients(params),
    [params?.page, params?.limit, params?.search]
  );
}
