"use client";

import { apiClient } from "@/lib/api";
import { useApi } from "./use-api";

/**
 * @deprecated Prefer `useOrders`/`useOrder` from `@/services/orders` (React Query-based).
 */
export function useOrders(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useApi(
    () => apiClient.getOrders(params),
    [params?.page, params?.limit, params?.status, params?.search]
  );
}

export function useOrder(id: string) {
  return useApi(() => apiClient.getOrder(id), [id]);
}
