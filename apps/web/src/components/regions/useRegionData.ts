"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegionItem {
  id: string;
  name: string;
}

interface RegionResponse {
  success: boolean;
  data: RegionItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface UseRegionDataOptions {
  endpoint: string;
  parentId?: string;
  /** If true, fetch is skipped until parentId is provided */
  requiresParent?: boolean;
}

interface UseRegionDataResult {
  items: RegionItem[];
  isLoading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  retry: () => void;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: RegionItem[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): RegionItem[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: RegionItem[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRegionData({
  endpoint,
  parentId,
  requiresParent = false,
}: UseRegionDataOptions): UseRegionDataResult {
  const [items, setItems] = useState<RegionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  const fetchData = useCallback(async () => {
    // Skip fetching if parent is required but not provided
    if (requiresParent && !parentId) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Build cache key
    const cacheKey = `${endpoint}:${parentId || ""}:${debouncedSearch}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setItems(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Build query string
      const params = new URLSearchParams();
      if (parentId) {
        // Determine the parent param name based on endpoint
        if (endpoint.includes("kabupaten-kota")) {
          params.set("provinsiId", parentId);
        } else if (endpoint.includes("kecamatan")) {
          params.set("kabupatenKotaId", parentId);
        } else if (endpoint.includes("kelurahan-desa")) {
          params.set("kecamatanId", parentId);
        }
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      params.set("page", "1");
      params.set("limit", "50");

      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await apiClient.get<RegionResponse>(
        `/api/v1/regions/${endpoint}${query}`
      );

      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setItems(data);
        setCache(cacheKey, data);
      } else {
        setItems([]);
      }
      setError(null);
    } catch (err: unknown) {
      // Ignore aborted requests
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Gagal memuat data wilayah. Silakan coba lagi.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, parentId, debouncedSearch, requiresParent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset search and items when parent changes
  useEffect(() => {
    setSearch("");
    setDebouncedSearch("");
  }, [parentId]);

  const retry = useCallback(() => {
    // Clear cache for this key to force refetch
    const cacheKey = `${endpoint}:${parentId || ""}:${debouncedSearch}`;
    cache.delete(cacheKey);
    fetchData();
  }, [endpoint, parentId, debouncedSearch, fetchData]);

  return { items, isLoading, error, search, setSearch, retry };
}
