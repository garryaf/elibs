"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "./api";

/**
 * Generic data-fetching hook with loading/error states.
 * Calls fetcher on mount and provides a refresh function.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      const apiErr = err as { message?: string; status?: number };
      if (apiErr.status === 401) {
        // Token expired — redirect to login
        localStorage.removeItem("elis_token");
        localStorage.removeItem("elis_user");
        document.cookie = "elis_authenticated=; path=/; max-age=0";
        window.location.href = "/";
        return;
      }
      setError(apiErr.message || "Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}

// ─── Specific Hooks ─────────────────────────────────────────────────────────

export function usePatients(params?: { page?: number; limit?: number; search?: string }) {
  return useApi(
    () => apiClient.getPatients(params),
    [params?.page, params?.limit, params?.search]
  );
}

export function useOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useApi(
    () => apiClient.getOrders(params),
    [params?.page, params?.limit, params?.status, params?.search]
  );
}

export function useOrder(id: string) {
  return useApi(() => apiClient.getOrder(id), [id]);
}

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
