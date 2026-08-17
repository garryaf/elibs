"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { SortField, SortDir } from "@/components/orders/OrderTable";
import { Search, FlaskConical, ChevronLeft, ChevronRight, AlertCircle, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/order";
import { OrderTable } from "@/components/orders/OrderTable";
import { RoleGuard } from "@/components/guards/RoleGuard";

const PAGE_SIZE = 20;

export default function LabHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const loadOrders = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // Fetch only APPROVED orders
      const res = await apiClient.getOrders({ page, limit: PAGE_SIZE, status: "APPROVED" });

      const raw_response = res as unknown as Record<string, unknown>;
      let raw: unknown[] = [];
      let meta = { total: 0, page: 1, limit: PAGE_SIZE };

      if (raw_response && typeof raw_response === "object" && !Array.isArray(raw_response)) {
        const innerData = raw_response.data;
        const innerMeta = raw_response.meta as Record<string, unknown> | undefined;

        if (Array.isArray(innerData)) {
          raw = innerData;
        } else if (innerData && typeof innerData === "object" && "data" in (innerData as object)) {
          const nested = innerData as Record<string, unknown>;
          raw = Array.isArray(nested.data) ? nested.data as unknown[] : [];
          if (nested.meta) {
            const m = nested.meta as Record<string, unknown>;
            meta = { total: Number(m.total) || 0, page: Number(m.page) || 1, limit: Number(m.limit) || PAGE_SIZE };
          }
        }

        if (innerMeta) {
          meta = { total: Number(innerMeta.total) || 0, page: Number(innerMeta.page) || 1, limit: Number(innerMeta.limit) || PAGE_SIZE };
        }
      } else if (Array.isArray(raw_response)) {
        raw = raw_response;
        meta = { total: raw_response.length, page: 1, limit: PAGE_SIZE };
      }

      const mapped: Order[] = (raw as Record<string, unknown>[]).map((o) => ({
        id: o.id as string,
        orderNumber: o.orderNumber as string,
        patientId: (o as { patient?: { id?: string } }).patient?.id || (o.patientId as string) || "",
        patientName: (o as { patient?: { name?: string } }).patient?.name || "",
        patientMrn: (o as { patient?: { mrn?: string } }).patient?.mrn || "",
        status: o.status as OrderStatus,
        details: ((o as { orderDetails?: unknown[] }).orderDetails || []) as Order["details"],
        totalAmount: Number(o.totalAmount) || 0,
        createdAt: o.createdAt as string,
        updatedAt: o.updatedAt as string,
      }));

      setOrders(mapped);
      setTotal(meta.total);
      setTotalPages(Math.ceil(meta.total / PAGE_SIZE) || 1);
    } catch {
      setOrders([]);
      setTotal(0);
      setTotalPages(1);
      setError("Gagal memuat riwayat hasil laboratorium. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    let result = orders.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.patientName || "").toLowerCase().includes(q) ||
        (o.patientMrn || "").toLowerCase().includes(q);
      return matchSearch;
    });

    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortField) {
        case "orderNumber":
          aVal = a.orderNumber;
          bVal = b.orderNumber;
          break;
        case "patientName":
          aVal = (a.patientName || "").toLowerCase();
          bVal = (b.patientName || "").toLowerCase();
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "totalAmount":
          aVal = a.totalAmount;
          bVal = b.totalAmount;
          break;
        case "createdAt":
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [orders, search, sortField, sortDir]);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS", "DOKTER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Riwayat & Cetak Hasil
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daftar pemeriksaan laboratorium yang sudah selesai dan siap untuk dicetak.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nomor order atau nama pasien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>
        </div>

        {/* Status Count Text */}
        {!loading && !error && filtered.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{filtered.length}</span> order siap cetak
            {search && <span> untuk &quot;<span className="font-semibold text-primary">{search}</span>&quot;</span>}
          </p>
        )}

        {/* Table / Loading / Error State */}
        {loading ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="animate-pulse">
              <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-3">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-28 rounded bg-muted" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-b border-border px-4 py-4 last:border-0">
                  <div className="h-4 w-24 rounded bg-muted/60" />
                  <div className="h-4 w-32 rounded bg-muted/60" />
                  <div className="h-4 w-20 rounded bg-muted/60" />
                  <div className="h-4 w-28 rounded bg-muted/60" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 dark:border-red-900/50 dark:bg-red-950/20">
            <AlertCircle className="h-12 w-12 text-red-400 dark:text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
            <button
              onClick={() => loadOrders()}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Coba Lagi
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 px-4 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FlaskConical className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {search ? "Hasil Tidak Ditemukan" : "Belum Ada Order Selesai"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
              {search
                ? `Tidak ada order yang cocok dengan pencarian "${search}".`
                : "Saat ini tidak ada order laboratorium dengan status Disetujui (Selesai)."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Bersihkan Pencarian
              </button>
            )}
          </div>
        ) : (
          <OrderTable
            orders={filtered}
            sortField={sortField}
            sortDir={sortDir}
            onSort={(field) => {
              if (field === sortField) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setSortField(field);
                setSortDir("desc");
              }
            }}
          />
        )}

        {/* Pagination */}
        {!loading && orders.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPages} ({total} order)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Sebelumnya
              </button>

              {getPageNumbers(page, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-xs text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      page === p
                        ? "bg-primary text-white shadow-sm"
                        : "border border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
