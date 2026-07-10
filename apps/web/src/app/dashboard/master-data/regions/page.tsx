"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, RefreshCw, Search } from "lucide-react";
import { apiClient } from "@/lib/api";

interface Province {
  id: string;
  code: string;
  name: string;
}

export default function RegionsPage() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const loadProvinces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get<{ success: boolean; data: Province[] }>(
        "/api/v1/regions/provinsi"
      );
      const data = (res as any)?.data ?? [];
      setProvinces(Array.isArray(data) ? data : []);
    } catch {
      setError("Gagal memuat data provinsi. Silakan coba lagi.");
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProvinces();
  }, [loadProvinces]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      await apiClient.post("/api/v1/regions/sync");
      setSyncMessage("Sinkronisasi data wilayah berhasil.");
      loadProvinces();
    } catch {
      setSyncMessage("Gagal melakukan sinkronisasi. Silakan coba lagi.");
    } finally {
      setSyncing(false);
    }
  };

  const filteredProvinces = provinces.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari provinsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#6B8E6B]" />
          <span className="ml-3 text-sm text-slate-500">Memuat data provinsi...</span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
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
                  Nama Provinsi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProvinces.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    {search
                      ? "Tidak ada provinsi yang cocok dengan pencarian."
                      : "Belum ada data provinsi. Klik \"Sinkronisasi Data\" untuk memulai."}
                  </td>
                </tr>
              ) : (
                filteredProvinces.map((province, index) => (
                  <tr
                    key={province.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {province.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                      {province.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && filteredProvinces.length > 0 && (
        <p className="text-xs text-slate-400">
          Menampilkan {filteredProvinces.length} dari {provinces.length} provinsi
        </p>
      )}
    </div>
  );
}
