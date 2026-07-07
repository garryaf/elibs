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
  { value: "COMPLETED", label: "Selesai" },
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
      const raw = (res?.data as { data?: unknown[] })?.data ?? [];
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
    completed: orders.filter((o) => o.status === "COMPLETED").length,
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
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Buat Order Baru
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Order Hari Ini", value: String(stats.total), sub: "order", color: "text-blue-600 dark:text-blue-400" },
          { label: "Menunggu Pembayaran", value: String(stats.pending), sub: "order", color: "text-amber-600 dark:text-amber-400" },
          { label: "Pendapatan Hari Ini", value: formatRupiah(stats.todayRevenue), sub: "lunas", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Order Selesai", value: String(stats.completed), sub: "order", color: "text-violet-600 dark:text-violet-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
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
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`order-filter-${f.value.toLowerCase()}`}
              onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {search && (
        <p className="text-sm text-slate-500">
          Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{filtered.length}</span> hasil untuk &quot;<span className="font-semibold text-emerald-600">{search}</span>&quot;
        </p>
      )}

      <OrderTable orders={filtered} />
    </div>
  );
}
