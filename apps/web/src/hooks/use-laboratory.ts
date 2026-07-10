"use client";

import { apiClient } from "@/lib/api";
import { useApi } from "./use-api";

/**
 * @deprecated Prefer hooks from `@/services/lab` and `@/services/dashboard` (React Query-based).
 */
export function useTests(params?: { page?: number; limit?: number }) {
  return useApi(
    () => apiClient.getTests({ ...params, limit: params?.limit || 200 }),
    [params?.page, params?.limit]
  );
}

export function useTestCategories(params?: { page?: number; limit?: number }) {
  return useApi(
    () => apiClient.getTestCategories({ ...params, limit: params?.limit || 100 }),
    [params?.page, params?.limit]
  );
}

export function useLabQueue(params?: { status?: string; search?: string }) {
  return useApi(
    () => apiClient.getLabQueue(params),
    [params?.status, params?.search]
  );
}

export function useApprovalQueue() {
  return useApi(() => apiClient.getApprovalQueue(), []);
}

export function useLabSummary() {
  return useApi(() => apiClient.getLabSummary(), []);
}

export function useLabVolume(params?: { startDate?: string; endDate?: string }) {
  return useApi(
    () => apiClient.getLabVolume(params),
    [params?.startDate, params?.endDate]
  );
}
