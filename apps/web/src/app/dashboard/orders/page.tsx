"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { SortField, SortDir } from "@/components/orders/OrderTable";
import Link from "next/link";
import { Search, Plus, TrendingUp, FlaskConical, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/order";
import { OrderTable } from "@/components/orders/OrderTable";
import { RoleGuard } from "@/components/guards/RoleGuard";

const STATUS_FILTERS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING_PAYMENT", label: "Belum Bayar" },
  { value: "PAID", label: "Lunas" },
  { value: "IN_ANALYSIS", label: "Analisa" },
  { value: "APPROVED", label: "Selesai" },
];

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
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
      const res = await apiClient.getOrders({ page, limit: PAGE_SIZE, status: statusFilter !== "ALL" ? statusFilter : undefined });

      // Defensive extraction: handle { data: { data: [], meta: {} } } envelope
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      let meta = { total: 0, page: 1, limit: PAGE_SIZE };

      if (envelope && typeof envelope === "object") {
        if ("data" in envelope) {
          const inner = (envelope as { data: unknown }).data;
          raw = Array.isArray(inner) ? inner : [];
        }
        if ("meta" in envelope) {
          const m = (envelope as { meta: unknown }).meta as Record<string, unknown>;
          meta = {
            total: Number(m.total) || 0,
            page: Number(m.page) || 1,
            limit: Number(m.limit) || PAGE_SIZE,
          };
        }
      } else if (Array.isArray(envelope)) {
        raw = envelope;
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
      setError("Gagal memuat data order. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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

    // Sort
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

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
    todayRevenue: orders
      .filter((o) => o.invoice?.paidAt && new Date(o.invoice.paidAt).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + (o.invoice?.total ?? 0), 0),
    completed: orders.filter((o) => o.status === "APPROVED" || o.status === "NOTIFIED").length,
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS", "KLINIK_PARTNER"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Order &amp; Kasir
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola permintaan pemeriksaan dan transaksi pembayaran pasien.
          </p>
        </div>
        <Link
          href="/dashboard/orders/new"
          id="order-new-btn"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Buat Order Baru
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Order Hari Ini", value: String(stats.total), sub: "order", color: "text-brand" },
          { label: "Menunggu Pembayaran", value: String(stats.pending), sub: "order", color: "text-amber-600 dark:text-amber-400" },
          { label: "Pendapatan Hari Ini", value: formatRupiah(stats.todayRevenue), sub: "lunas", color: "text-brand" },
          { label: "Order Selesai", value: String(stats.completed), sub: "order", color: "text-brand" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              <TrendingUp className="h-4 w-4 text-slate-300 dark:text-slate-700" />
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-600">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="order-search"
            type="text"
            placeholder="Cari nomor order atau nama pasien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`order-filter-${f.value.toLowerCase()}`}
              onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none ${
                statusFilter === f.value
                  ? "bg-brand text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-brand/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {search && (
        <p className="text-sm text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> hasil untuk &quot;<span className="font-semibold text-brand">{search}</span>&quot;
        </p>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="animate-pulse">
            {/* Header row */}
            <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-3">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
            </div>
            {/* Body rows */}
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
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 dark:border-red-900/50 dark:bg-red-950/20"
        >
          <AlertCircle className="h-12 w-12 text-red-400 dark:text-red-500" />
          <div className="text-center">
            <p className="font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
          <button
            onClick={() => loadOrders()}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Coba Lagi
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <FlaskConical className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Tidak ada order</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {search ? `Tidak ditemukan order untuk "${search}"` : "Belum ada order untuk filter ini."}
          </p>
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {page} dari {totalPages} ({total} order)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </button>

            {/* Page numbers */}
            {getPageNumbers(page, totalPages).map((p, idx) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs text-slate-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    page === p
                      ? "bg-brand text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
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

function getPageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}
