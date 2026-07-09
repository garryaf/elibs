"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { Order, OrderStatus } from "@/types/order";
import { OrderTable } from "@/components/orders/OrderTable";

const STATUS_FILTERS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING_PAYMENT", label: "Belum Bayar" },
  { value: "PAID", label: "Lunas" },
  { value: "IN_ANALYSIS", label: "Analisa" },
  { value: "APPROVED", label: "Selesai" },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiClient.getOrders({ limit: 100, status: statusFilter !== "ALL" ? statusFilter : undefined });
      // Defensive extraction: handle both { data: { data: [] } } and { data: [] } shapes
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
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
    } catch {
      setOrders([]);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.patientName || "").toLowerCase().includes(q) ||
        (o.patientMrn || "").toLowerCase().includes(q);
      return matchSearch;
    });
  }, [orders, search]);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
    todayRevenue: orders
      .filter((o) => o.invoice?.paidAt && new Date(o.invoice.paidAt).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + (o.invoice?.total ?? 0), 0),
    completed: orders.filter((o) => o.status === "APPROVED" || o.status === "NOTIFIED").length,
  };

  return (
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
          className="inline-flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Buat Order Baru
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Order Hari Ini", value: String(stats.total), sub: "order", color: "text-[#6B8E6B]" },
          { label: "Menunggu Pembayaran", value: String(stats.pending), sub: "order", color: "text-amber-600 dark:text-amber-400" },
          { label: "Pendapatan Hari Ini", value: formatRupiah(stats.todayRevenue), sub: "lunas", color: "text-[#6B8E6B]" },
          { label: "Order Selesai", value: String(stats.completed), sub: "order", color: "text-[#6B8E6B]" },
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
            className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-[#6B8E6B] focus:ring-1 focus:ring-[#6B8E6B]/30 text-foreground"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`order-filter-${f.value.toLowerCase()}`}
              onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? "bg-[#6B8E6B] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-[#6B8E6B]/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {search && (
        <p className="text-sm text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> hasil untuk &quot;<span className="font-semibold text-[#6B8E6B]">{search}</span>&quot;
        </p>
      )}

      <OrderTable orders={filtered} />
    </div>
  );
}
