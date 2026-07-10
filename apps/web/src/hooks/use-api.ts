"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Generic data-fetching hook with loading/error states.
 * Calls fetcher on mount and provides a refresh function.
 *
 * @deprecated Prefer using React Query hooks from `@/services` for new code.
 * This hook is kept for backward compatibility.
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
