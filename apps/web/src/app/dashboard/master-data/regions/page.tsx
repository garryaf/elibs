"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, RefreshCw, Search, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegionItem {
  id: string;
  code: string;
  name: string;
}

interface RegionResponse {
  success: boolean;
  data: RegionItem[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

type TabLevel = "provinsi" | "kabupaten-kota" | "kecamatan" | "kelurahan-desa";

const TAB_CONFIG: { key: TabLevel; label: string; parentLabel: string }[] = [
  { key: "provinsi", label: "Provinsi", parentLabel: "" },
  { key: "kabupaten-kota", label: "Kabupaten / Kota", parentLabel: "Provinsi" },
  { key: "kecamatan", label: "Kecamatan", parentLabel: "Kabupaten/Kota" },
  { key: "kelurahan-desa", label: "Kelurahan / Desa", parentLabel: "Kecamatan" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegionsPage() {
  const [activeTab, setActiveTab] = useState<TabLevel>("provinsi");
  const [items, setItems] = useState<RegionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  // Selection state for cascading
  const [selectedProvinsi, setSelectedProvinsi] = useState<RegionItem | null>(null);
  const [selectedKabupatenKota, setSelectedKabupatenKota] = useState<RegionItem | null>(null);
  const [selectedKecamatan, setSelectedKecamatan] = useState<RegionItem | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);

      // Add parent filter based on active tab
      if (activeTab === "kabupaten-kota" && selectedProvinsi) {
        params.set("provinsiId", selectedProvinsi.id);
      } else if (activeTab === "kecamatan" && selectedKabupatenKota) {
        params.set("kabupatenKotaId", selectedKabupatenKota.id);
      } else if (activeTab === "kelurahan-desa" && selectedKecamatan) {
        params.set("kecamatanId", selectedKecamatan.id);
      }

      const res = await apiClient.get<RegionResponse>(
        `/api/v1/regions/${activeTab}?${params.toString()}`
      );

      // Handle various response shapes
      const resAny = res as any;
      let data: RegionItem[] = [];
      let meta = { total: 0, page: 1, limit: 50, totalPages: 0 };

      if (Array.isArray(resAny?.data)) {
        data = resAny.data;
        meta = resAny.meta || meta;
      } else if (resAny?.data?.data && Array.isArray(resAny.data.data)) {
        data = resAny.data.data;
        meta = resAny.data.meta || meta;
      } else if (Array.isArray(resAny)) {
        data = resAny;
      }

      setItems(data);
      setTotal(meta.total || data.length);
      setTotalPages(meta.totalPages || 1);
    } catch {
      setError("Gagal memuat data. Silakan coba lagi.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, selectedProvinsi, selectedKabupatenKota, selectedKecamatan]);

  useEffect(() => {
    // Only load child tabs if parent is selected
    if (activeTab === "kabupaten-kota" && !selectedProvinsi) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (activeTab === "kecamatan" && !selectedKabupatenKota) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (activeTab === "kelurahan-desa" && !selectedKecamatan) {
      setItems([]);
      setLoading(false);
      return;
    }
    loadData();
  }, [loadData, activeTab, selectedProvinsi, selectedKabupatenKota, selectedKecamatan]);

  // Reset page and search when tab changes
  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [activeTab]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      await apiClient.post("/api/v1/regions/sync");
      setSyncMessage("Sinkronisasi data wilayah berhasil.");
      loadData();
    } catch {
      setSyncMessage("Gagal melakukan sinkronisasi. Silakan coba lagi.");
    } finally {
      setSyncing(false);
    }
  };

  const handleTabChange = (tab: TabLevel) => {
    setActiveTab(tab);
  };

  const handleRowClick = (item: RegionItem) => {
    if (activeTab === "provinsi") {
      setSelectedProvinsi(item);
      setSelectedKabupatenKota(null);
      setSelectedKecamatan(null);
      setActiveTab("kabupaten-kota");
    } else if (activeTab === "kabupaten-kota") {
      setSelectedKabupatenKota(item);
      setSelectedKecamatan(null);
      setActiveTab("kecamatan");
    } else if (activeTab === "kecamatan") {
      setSelectedKecamatan(item);
      setActiveTab("kelurahan-desa");
    }
  };

  // Build breadcrumb from selection
  const breadcrumbs: { label: string; onClick?: () => void }[] = [];
  if (selectedProvinsi) {
    breadcrumbs.push({
      label: selectedProvinsi.name,
      onClick: () => {
        setActiveTab("kabupaten-kota");
        setSelectedKabupatenKota(null);
        setSelectedKecamatan(null);
      },
    });
  }
  if (selectedKabupatenKota) {
    breadcrumbs.push({
      label: selectedKabupatenKota.name,
      onClick: () => {
        setActiveTab("kecamatan");
        setSelectedKecamatan(null);
      },
    });
  }
  if (selectedKecamatan) {
    breadcrumbs.push({
      label: selectedKecamatan.name,
    });
  }

  const currentTabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const needsParent =
    (activeTab === "kabupaten-kota" && !selectedProvinsi) ||
    (activeTab === "kecamatan" && !selectedKabupatenKota) ||
    (activeTab === "kelurahan-desa" && !selectedKecamatan);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Master Wilayah Indonesia
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data provinsi, kabupaten/kota, kecamatan, dan kelurahan/desa.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5a7a5a] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Menyinkronkan..." : "Sinkronisasi Data"}
        </button>
      </div>

      {/* Sync message */}
      {syncMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            syncMessage.includes("berhasil")
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {syncMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-[#6B8E6B] text-[#6B8E6B]"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Breadcrumb navigation */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <button
            onClick={() => {
              setActiveTab("provinsi");
              setSelectedProvinsi(null);
              setSelectedKabupatenKota(null);
              setSelectedKecamatan(null);
            }}
            className="hover:text-[#6B8E6B] transition-colors"
          >
            Semua Provinsi
          </button>
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              {bc.onClick ? (
                <button
                  onClick={bc.onClick}
                  className="hover:text-[#6B8E6B] transition-colors"
                >
                  {bc.label}
                </button>
              ) : (
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {bc.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={`Cari ${currentTabConfig.label.toLowerCase()}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Needs parent selection notice */}
      {needsParent && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih <strong>{currentTabConfig.parentLabel}</strong> terlebih dahulu
            untuk melihat data {currentTabConfig.label.toLowerCase()}.
          </p>
          <button
            onClick={() => {
              // Navigate to parent tab
              const parentTabIndex = TAB_CONFIG.findIndex((t) => t.key === activeTab) - 1;
              if (parentTabIndex >= 0) {
                setActiveTab(TAB_CONFIG[parentTabIndex].key);
              }
            }}
            className="mt-3 text-sm font-medium text-[#6B8E6B] hover:underline"
          >
            ← Kembali ke {TAB_CONFIG[TAB_CONFIG.findIndex((t) => t.key === activeTab) - 1]?.label || "Provinsi"}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#6B8E6B]" />
          <span className="ml-3 text-sm text-slate-500">
            Memuat data {currentTabConfig.label.toLowerCase()}...
          </span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && !needsParent && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  No
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Kode
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                  Nama {currentTabConfig.label}
                </th>
                {activeTab !== "kelurahan-desa" && (
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab !== "kelurahan-desa" ? 4 : 3}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    {search
                      ? `Tidak ada ${currentTabConfig.label.toLowerCase()} yang cocok dengan pencarian.`
                      : `Belum ada data ${currentTabConfig.label.toLowerCase()}. Klik "Sinkronisasi Data" untuk memulai.`}
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      activeTab !== "kelurahan-desa" ? "cursor-pointer" : ""
                    }`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-4 py-3 text-slate-500">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {item.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      {item.name}
                    </td>
                    {activeTab !== "kelurahan-desa" && (
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-[#6B8E6B] hover:underline">
                          Lihat Detail <ChevronRight className="h-3 w-3" />
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && !needsParent && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Menampilkan {items.length} dari {total} {currentTabConfig.label.toLowerCase()}
            {" "}(halaman {page} dari {totalPages})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              ← Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      )}

      {/* Summary for single page */}
      {!loading && !error && !needsParent && totalPages <= 1 && items.length > 0 && (
        <p className="text-xs text-slate-400">
          Menampilkan {items.length} {currentTabConfig.label.toLowerCase()}
        </p>
      )}
    </div>
  );
}
