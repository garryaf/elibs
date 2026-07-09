"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Banknote,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecutiveSummary {
  patientsToday: number;
  totalPatients: number;
  revenueToday: number;
  totalRevenueMonth: number;
  criticalResults: number;
  pendingSampleCollection: number;
  completedToday: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  patient: { name: string; mrn: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60; // seconds

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: "Menunggu Bayar",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  PAID: {
    label: "Terbayar",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  SAMPLE_COLLECTED: {
    label: "Sampel Diterima",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  IN_ANALYSIS: {
    label: "Proses Analisa",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  VERIFIED: {
    label: "Terverifikasi",
    className: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  },
  APPROVED: {
    label: "Disetujui",
    className: "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#6B8E6B]",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
});

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)} rb`;
  return formatCurrency.format(value);
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "baru saja";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  return `${Math.floor(diffSec / 86400)} hari lalu`;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="mt-4 h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [summaryRes, ordersRes] = await Promise.all([
        apiClient.getExecutiveSummary(),
        apiClient.getRecentOrders(),
      ]);

      // Handle TransformInterceptor envelope: response is { success, data }
      // data may be nested if double-wrapped, use safe access
      const summaryData = (summaryRes?.data ?? summaryRes) as ExecutiveSummary;
      const ordersData = (ordersRes?.data ?? ordersRes) as RecentOrder[];

      setSummary(summaryData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Gagal memuat data dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCountdown(REFRESH_INTERVAL);
    }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setCountdown(REFRESH_INTERVAL);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selamat datang di Enterprise Laboratory Information System
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>
              {lastUpdated ? `Diperbarui: ${relativeTime(lastUpdated.toISOString())}` : "Memuat..."}
            </span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            ({countdown}s)
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900/70"
          >
            <RefreshCw className="h-3 w-3" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <KPISkeleton />
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pasien Hari Ini */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Pasien Hari Ini
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {summary.patientsToday}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Total: {summary.totalPatients.toLocaleString("id-ID")} pasien
            </p>
          </div>

          {/* Pendapatan Hari Ini */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Pendapatan Hari Ini
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {formatShortCurrency(summary.revenueToday)}
                </p>
              </div>
              <div className="rounded-lg bg-[#6B8E6B]/10 p-3 text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#6B8E6B]">
                <Banknote className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Bulan ini: {formatShortCurrency(summary.totalRevenueMonth)}
            </p>
          </div>

          {/* Hasil Kritis */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Hasil Kritis
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {summary.criticalResults}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Perlu tindak lanjut segera
            </p>
          </div>

          {/* Selesai Hari Ini */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Selesai Hari Ini
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {summary.completedToday}
                </p>
              </div>
              <div className="rounded-lg bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Pending sampel: {summary.pendingSampleCollection}
            </p>
          </div>
        </div>
      ) : null}

      {/* Recent Orders Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Order Terbaru</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>5 order terakhir</span>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Belum ada order hari ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    No. Order
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Pasien
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Jumlah
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.slice(0, 5).map((order) => {
                  const badge = STATUS_BADGE[order.status] ?? {
                    label: order.status,
                    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  };
                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {order.patient?.name ?? "-"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {order.patient?.mrn ?? ""}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-700 dark:text-slate-300">
                        {formatCurrency.format(Number(order.totalAmount) || 0)}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
                        {relativeTime(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
