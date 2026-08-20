"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import type { SortField, SortDir } from "@/components/orders/OrderTable";
import Link from "next/link";
import { Search, Plus, TrendingUp, FlaskConical, ChevronLeft, ChevronRight, AlertCircle, CalendarDays, X, Download, Printer, BellRing } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/order";
import { OrderTable } from "@/components/orders/OrderTable";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { useAuth } from "@/lib/auth-context";
import { StatsCardsSkeleton, ActiveFilters, type ActiveFilterItem } from "@/components";

const STATUS_FILTERS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING_PAYMENT", label: "Belum Bayar" },
  { value: "DEPOSIT_RECEIVED", label: "Deposit" },
  { value: "PAID", label: "Lunas" },
  { value: "SAMPLE_COLLECTED", label: "Sampel" },
  { value: "IN_ANALYSIS", label: "Analisa" },
  { value: "VERIFIED", label: "Terverifikasi" },
  { value: "APPROVED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const PAGE_SIZE = 20;

interface OrderStats {
  totalOrders: number;
  pendingPayment: number;
  todayRevenue: number;
  completed: number;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Date range filter
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Stats from API (aggregated from DB, not page-level)
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // New order notification (polling)
  const [newOrderAlert, setNewOrderAlert] = useState<{ count: number; show: boolean }>({ count: 0, show: false });
  const prevPendingRef = useRef<number | null>(null);

  // Roles that can create orders
  const canCreateOrder = user && ["SUPER_ADMIN", "ADMIN", "KASIR", "CS", "OWNER", "MANAGER", "KLINIK_PARTNER"].includes(user.role);

  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    if (search.trim()) {
      items.push({
        id: "search",
        label: "Pencarian",
        value: `"${search.trim()}"`,
        onRemove: () => {
          setSearch("");
          setDebouncedSearch("");
        },
      });
    }
    if (statusFilter !== "ALL") {
      const label = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label || statusFilter;
      items.push({
        id: "status",
        label: "Status",
        value: label,
        onRemove: () => setStatusFilter("ALL"),
      });
    }
    if (startDate) {
      items.push({
        id: "startDate",
        label: "Dari",
        value: new Date(startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        onRemove: () => setStartDate(""),
      });
    }
    if (endDate) {
      items.push({
        id: "endDate",
        label: "Sampai",
        value: new Date(endDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        onRemove: () => setEndDate(""),
      });
    }
    return items;
  }, [search, statusFilter, startDate, endDate]);

  const handleResetAllFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  // Debounce search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // Load stats from dedicated API endpoint (aggregated from DB)
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiClient.getOrderStats();
      const raw = res as unknown as Record<string, unknown>;
      // Handle { data: {...} } or direct object
      let data: Record<string, unknown> | null = null;
      if (raw && typeof raw === "object" && "totalOrders" in raw) {
        data = raw;
      } else if (raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object") {
        data = raw.data as Record<string, unknown>;
      }
      if (data) {
        const newPending = Number(data.pendingPayment) || 0;

        // Detect new orders: if pendingPayment increased since last check
        if (prevPendingRef.current !== null && newPending > prevPendingRef.current) {
          const diff = newPending - prevPendingRef.current;
          setNewOrderAlert({ count: diff, show: true });
        }
        prevPendingRef.current = newPending;

        setStats({
          totalOrders: Number(data.totalOrders) || 0,
          pendingPayment: newPending,
          todayRevenue: Number(data.todayRevenue) || 0,
          completed: Number(data.completed) || 0,
        });
      }
    } catch {
      // Stats failed — use fallback from page data
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.getOrders({
        page,
        limit: PAGE_SIZE,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: debouncedSearch || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // After unwrapResponse, res is typically { data: [...], meta: {...} }
      // But could also be the raw array if double-unwrapped
      const raw_response = res as unknown as Record<string, unknown>;
      let raw: unknown[] = [];
      let meta = { total: 0, page: 1, limit: PAGE_SIZE };

      // Case 1: { data: [...], meta: {...} } — standard paginated response
      if (raw_response && typeof raw_response === "object" && !Array.isArray(raw_response)) {
        const innerData = raw_response.data;
        const innerMeta = raw_response.meta as Record<string, unknown> | undefined;

        if (Array.isArray(innerData)) {
          raw = innerData;
        } else if (innerData && typeof innerData === "object" && "data" in (innerData as object)) {
          // Nested: { data: { data: [...], meta: {...} } }
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
      }
      // Case 2: response is directly an array
      else if (Array.isArray(raw_response)) {
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
      setError("Gagal memuat data order. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Load stats on mount and when orders change (to refresh after payment)
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Poll for new orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Refresh stats when orders are loaded (covers payment changes)
  useEffect(() => {
    if (!loading) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, startDate, endDate]);

  const filtered = useMemo(() => {
    let result = [...orders];

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
  }, [orders, sortField, sortDir]);

  // Derive display stats: prefer API stats, fallback to page data
  const displayStats = stats ?? {
    totalOrders: total,
    pendingPayment: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
    todayRevenue: 0,
    completed: orders.filter((o) => o.status === "APPROVED" || o.status === "NOTIFIED").length,
  };

  // ─── Export & Print Handlers ────────────────────────────────────────────────

  const handleExportCSV = useCallback(() => {
    if (filtered.length === 0) return;

    const STATUS_LABEL: Record<string, string> = {
      PENDING_PAYMENT: "Belum Bayar",
      DEPOSIT_RECEIVED: "Deposit",
      PAID: "Lunas",
      SAMPLE_COLLECTED: "Sampel Diambil",
      IN_ANALYSIS: "Analisa",
      VERIFIED: "Terverifikasi",
      APPROVED: "Selesai",
      NOTIFIED: "Terkirim",
      CANCELLED: "Dibatalkan",
      PAYMENT_OVERDUE: "Jatuh Tempo",
    };

    const headers = ["No. Order", "Pasien", "MRN", "Status", "Total (Rp)", "Tgl. Buat"];
    const rows = filtered.map((o) => [
      o.orderNumber,
      `"${o.patientName}"`,
      o.patientMrn,
      STATUS_LABEL[o.status] || o.status,
      String(o.totalAmount),
      new Date(o.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filtered]);

  const handlePrintList = useCallback(() => {
    window.print();
  }, []);

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
        {canCreateOrder && (
          <Link
            href="/dashboard/orders/new"
            id="order-new-btn"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Buat Order Baru
          </Link>
        )}
      </div>

      {/* New Order Notification Banner */}
      {newOrderAlert.show && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <BellRing className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              {newOrderAlert.count} order baru menunggu pembayaran
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Klik &quot;Refresh&quot; untuk memuat data terbaru.
            </p>
          </div>
          <button
            onClick={() => { setNewOrderAlert({ count: 0, show: false }); loadOrders(); }}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={() => setNewOrderAlert({ count: 0, show: false })}
            className="rounded-lg p-1.5 text-blue-400 transition hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      {statsLoading && loading ? (
        <StatsCardsSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Order", value: String(displayStats.totalOrders), sub: "order", color: "text-brand" },
            { label: "Menunggu Pembayaran", value: String(displayStats.pendingPayment), sub: "order", color: "text-amber-600 dark:text-amber-400" },
            { label: "Pendapatan Hari Ini", value: formatRupiah(Number(displayStats.todayRevenue)), sub: "lunas hari ini", color: "text-brand" },
            { label: "Order Selesai", value: String(displayStats.completed), sub: "order", color: "text-brand" },
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
      )}

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

      {/* Date Range Filter + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rentang Tanggal:</span>
          </div>
        <div className="flex items-center gap-2">
          <input
            id="order-date-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <span className="text-xs text-slate-400">—</span>
          <input
            id="order-date-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              title="Hapus filter tanggal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        </div>

        {/* Export & Print Actions */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            id="order-export-csv"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:border-brand/50 hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            title="Export ke CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            id="order-print-list"
            onClick={handlePrintList}
            disabled={filtered.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:border-brand/50 hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            title="Print daftar order"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Active Filters Bar */}
      <ActiveFilters
        items={activeFilterItems}
        onResetAll={handleResetAllFilters}
      />

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
