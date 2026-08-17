/**
 * Price Lists Service — TanStack Query hooks for price list management
 *
 * Endpoints:
 * - GET /api/v1/master/price-lists — List active price lists
 * - POST /api/v1/master/price-lists — Create price list
 * - PATCH /api/v1/master/price-lists/:id — Update price list
 * - POST /api/v1/master/price-lists/:id/items — Add items to price list
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PriceListType = "CORPORATE" | "INSURANCE" | "PROMOTION" | "PACKAGE";

export interface PriceList {
  id: string;
  name: string;
  description: string | null;
  type: PriceListType;
  entityId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: PriceListItem[];
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  testId: string;
  price: number;
  discount: number;
  test?: { id: string; name: string; code: string };
}

export interface CreatePriceListPayload {
  name: string;
  description?: string;
  type: PriceListType;
  entityId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface UpdatePriceListPayload {
  name?: string;
  description?: string;
  type?: PriceListType;
  entityId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface AddPriceListItemPayload {
  testId: string;
  price: number;
  discount?: number;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const priceListKeys = {
  all: ["price-lists"] as const,
  lists: () => [...priceListKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...priceListKeys.lists(), params] as const,
  details: () => [...priceListKeys.all, "detail"] as const,
  detail: (id: string) => [...priceListKeys.details(), id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function usePriceLists(params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: PriceListType;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.type) qs.set("type", params.type);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: priceListKeys.list(params ?? {}),
    queryFn: () =>
      apiClient.get<{ data: PriceList[]; meta: { total: number; page: number; limit: number } }>(
        `/api/v1/master/price-lists${query}`
      ),
  });
}

export function usePriceList(id: string | null) {
  return useQuery({
    queryKey: priceListKeys.detail(id ?? ""),
    queryFn: () => apiClient.get<PriceList>(`/api/v1/master/price-lists/${id}`),
    enabled: !!id,
  });
}

export function useCreatePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePriceListPayload) =>
      apiClient.post<PriceList>("/api/v1/master/price-lists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
    },
  });
}

export function useUpdatePriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePriceListPayload }) =>
      apiClient.patch<PriceList>(`/api/v1/master/price-lists/${id}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(variables.id) });
    },
  });
}

export function useAddPriceListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ priceListId, data }: { priceListId: string; data: AddPriceListItemPayload }) =>
      apiClient.post<PriceListItem>(`/api/v1/master/price-lists/${priceListId}/items`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: priceListKeys.detail(variables.priceListId) });
      queryClient.invalidateQueries({ queryKey: priceListKeys.lists() });
    },
  });
}
