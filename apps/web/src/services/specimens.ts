/**
 * Specimen Service — TanStack Query hooks for specimen tracking domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, STORAGE_KEYS } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SampleCondition =
  | "ACCEPTABLE"
  | "HEMOLYZED"
  | "LIPEMIC"
  | "CLOTTED"
  | "INSUFFICIENT"
  | "OTHER";

export interface Specimen {
  id: string;
  orderId: string;
  sampleTypeCode: string;
  barcode: string;
  condition: SampleCondition;
  rejectionReason?: string | null;
  transportTemperature?: number | null;
  temperatureCompliant?: boolean | null;
  collectedAt?: string | null;
  collectedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    patient?: {
      id: string;
      name: string;
      mrn: string;
    };
  };
  collectionAttempts?: CollectionAttempt[];
  handoffs?: CustodyHandoff[];
}

export interface CollectionAttempt {
  id: string;
  orderId: string;
  specimenId: string;
  sampleCondition: SampleCondition;
  rejectionReason?: string | null;
  collectedBy: string;
  attemptedAt: string;
}

export interface CustodyHandoff {
  id: string;
  specimenId: string;
  fromUserId: string;
  toUserId: string;
  handoffAt: string;
  notes?: string | null;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const specimenKeys = {
  all: ["specimens"] as const,
  list: (params?: Record<string, unknown>) =>
    [...specimenKeys.all, "list", params] as const,
  byOrder: (orderId: string) =>
    [...specimenKeys.all, "order", orderId] as const,
  detail: (id: string) => [...specimenKeys.all, "detail", id] as const,
  history: (id: string) => [...specimenKeys.all, "history", id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch all specimens across orders (uses a custom listing endpoint).
 * Falls back to listing by iterating orders if needed.
 */
export function useSpecimens(params?: {
  page?: number;
  limit?: number;
  search?: string;
  condition?: SampleCondition;
}) {
  return useQuery({
    queryKey: specimenKeys.list(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.search) qs.set("search", params.search);
      if (params?.condition) qs.set("condition", params.condition);
      return apiClient.get(`/api/v1/specimens?${qs.toString()}`);
    },
  });
}

/**
 * Fetch a single specimen detail with history and handoffs
 */
export function useSpecimenDetail(id: string) {
  return useQuery({
    queryKey: specimenKeys.detail(id),
    queryFn: () => apiClient.get<Specimen>(`/api/v1/specimens/${id}`),
    enabled: !!id,
  });
}

/**
 * Regenerate barcode for a specimen
 */
export function useRegenerateBarcode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (specimenId: string) =>
      apiClient.post(`/api/v1/specimens/${specimenId}/regenerate-barcode`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: specimenKeys.all });
    },
  });
}

/**
 * Generate batch labels (returns a blob for download)
 */
export function useBatchLabels() {
  return useMutation({
    mutationFn: async (specimenIds: string[]) => {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.TOKEN)
          : null;
      const response = await fetch("/api/v1/specimens/batch-labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ specimenIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate batch labels");
      }

      return response.blob();
    },
  });
}
