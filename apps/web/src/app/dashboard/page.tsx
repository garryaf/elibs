"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Banknote,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  ExternalLink,
  Plus,
  UserPlus,
  FlaskConical,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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

interface VolumePoint {
  date: string;
  count: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
  orderCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 60; // seconds

type DateRangePreset = 7 | 14 | 30;

const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 7, label: "7 Hari" },
  { value: 14, label: "14 Hari" },
  { value: 30, label: "30 Hari" },
];

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
    className: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand",
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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/** Fill missing dates in a date-sorted array so every day has an entry (count: 0 for missing days) */
function fillMissingDates(data: VolumePoint[], days: number): VolumePoint[] {
  if (data.length === 0) return data;
  const map = new Map(data.map((d) => [d.date, d.count]));
  const filled: VolumePoint[] = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000);
    const dateKey = d.toISOString().slice(0, 10);
    filled.push({ date: dateKey, count: map.get(dateKey) ?? 0 });
  }
  return filled;
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

function ChartSkeleton() {
  return (
    <div className="flex h-48 items-end gap-[2px] px-2">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-slate-200 dark:bg-slate-800"
          style={{ height: `${20 + Math.random() * 60}%` }}
        />
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

// ─── Chart Components ─────────────────────────────────────────────────────────

function RevenueLineChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Belum ada data pendapatan untuk periode ini
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);

  // SVG line chart
  const width = 100;
  const height = 100;
  const padding = { top: 5, bottom: 5, left: 0, right: 0 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - (d.revenue / maxRevenue) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {formatShortCurrency(totalRevenue)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Total {data.length} hari
        </p>
      </div>
      <div className="relative h-48 w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          {/* Area fill */}
          <path
            d={areaPath}
            className="fill-brand/10 dark:fill-brand/20"
          />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            className="stroke-brand"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1"
              className="fill-brand"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {/* Hover tooltip layer */}
        <div className="absolute inset-0 flex">
          {points.map((p, i) => (
            <div
              key={i}
              className="group relative flex-1"
            >
              <div className="pointer-events-none absolute -top-1 left-1/2 hidden -translate-x-1/2 group-hover:flex flex-col items-center z-10">
                <span className="whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white dark:bg-slate-200 dark:text-slate-900">
                  {formatDateShort(p.date)}: {formatShortCurrency(p.revenue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>{formatDateShort(data[0].date)}</span>
        <span>{formatDateShort(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

function VolumeBarChart({ data }: { data: VolumePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Belum ada data volume untuk periode ini
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalOrders = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {totalOrders.toLocaleString("id-ID")} order
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Rata-rata {Math.round(totalOrders / Math.max(data.length, 1))}/hari
        </p>
      </div>
      <div className="flex h-48 items-end gap-[2px]">
        {data.map((point) => {
          const heightPct = (point.count / maxCount) * 100;
          return (
            <div
              key={point.date}
              className="group relative flex flex-1 flex-col items-center justify-end"
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-8 hidden group-hover:flex flex-col items-center z-10">
                <span className="whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] text-white dark:bg-slate-200 dark:text-slate-900">
                  {formatDateShort(point.date)}: {point.count}
                </span>
              </div>
              <div
                className="w-full rounded-t bg-indigo-500 opacity-80 transition-opacity hover:opacity-100 dark:bg-indigo-400 min-h-[2px]"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>{formatDateShort(data[0].date)}</span>
        <span>{formatDateShort(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

// ─── Region Distribution Chart ────────────────────────────────────────────

function RegionDistributionChart({ data }: { data: { id: string; name: string; count: number }[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map((d) => d.count), 1);
  const totalPatients = sorted.reduce((sum, d) => sum + d.count, 0);

  // Show top 8, group the rest
  const topItems = sorted.slice(0, 8);
  const otherCount = sorted.slice(8).reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-bold text-slate-900 dark:text-white">
          {totalPatients.toLocaleString("id-ID")} pasien
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {sorted.length} wilayah
        </p>
      </div>
      <div className="space-y-2">
        {topItems.map((item) => {
          const pct = (item.count / maxCount) * 100;
          return (
            <div key={item.id} className="flex items-center gap-3">
              <span className="w-32 truncate text-xs font-medium text-slate-700 dark:text-slate-300" title={item.name}>
                {item.name}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 dark:bg-purple-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-slate-900 dark:text-white">
                {item.count}
              </span>
            </div>
          );
        })}
        {otherCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-32 truncate text-xs font-medium text-slate-400 dark:text-slate-500 italic">
              Lainnya
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-slate-300 dark:bg-slate-600 transition-all"
                style={{ width: `${(otherCount / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
              {otherCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const userRole = user?.role ?? "KASIR";
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  // Date range for charts
  const [dateRange, setDateRange] = useState<DateRangePreset>(14);
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Region distribution
  const [regionData, setRegionData] = useState<{ id: string; name: string; count: number }[]>([]);
  const [regionLoading, setRegionLoading] = useState(true);

  // Comparison metrics (#26)
  const [compMetrics, setCompMetrics] = useState<Record<string, unknown> | null>(null);
  // Phased TAT + SLA (#23, #27)
  const [phasedTat, setPhasedTat] = useState<Record<string, unknown> | null>(null);
  // Workload distribution (#28)
  const [workload, setWorkload] = useState<{ analysts: { name: string; orderCount: number }[] } | null>(null);
  // Revenue breakdown (#20)
  const [revBreakdown, setRevBreakdown] = useState<Record<string, unknown> | null>(null);

  const dateRangeParams = useMemo(() => {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - dateRange * 86400000).toISOString().slice(0, 10);
    return { startDate, endDate };
  }, [dateRange]);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [summaryRes, ordersRes] = await Promise.all([
        apiClient.getExecutiveSummary(),
        apiClient.getRecentOrders(),
      ]);

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

  // Fetch chart data when date range changes
  const fetchChartData = useCallback(async () => {
    setChartsLoading(true);
    try {
      const [volumeRes, revenueRes] = await Promise.all([
        apiClient.getLabVolume(dateRangeParams),
        apiClient.getReport("revenue-summary", dateRangeParams),
      ]);

      // Volume data — fill missing dates so chart doesn't compress
      const volumeRaw = (volumeRes?.data ?? volumeRes) as unknown;
      if (Array.isArray(volumeRaw)) {
        setVolumeData(fillMissingDates(volumeRaw as VolumePoint[], dateRange));
      } else {
        setVolumeData([]);
      }

      // Revenue data — backend returns { daily: [{date, revenue, orderCount}], ... }
      const revenueRaw = (revenueRes?.data ?? revenueRes) as Record<string, unknown>;
      const dailyRevenue = revenueRaw?.daily;
      if (Array.isArray(dailyRevenue)) {
        setRevenueData(dailyRevenue as RevenuePoint[]);
      } else {
        setRevenueData([]);
      }
    } catch {
      setVolumeData([]);
      setRevenueData([]);
    } finally {
      setChartsLoading(false);
    }
  }, [dateRangeParams]);

  // Fetch region distribution (independent of date range)
  const fetchRegionData = useCallback(async () => {
    setRegionLoading(true);
    try {
      const res = await apiClient.getRegionDistribution();
      const raw = (res?.data ?? res) as unknown;
      if (Array.isArray(raw)) {
        setRegionData(raw as { id: string; name: string; count: number }[]);
      } else {
        setRegionData([]);
      }
    } catch {
      setRegionData([]);
    } finally {
      setRegionLoading(false);
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

  // Fetch charts on mount and when date range changes
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Fetch region distribution on mount
  useEffect(() => {
    fetchRegionData();
  }, [fetchRegionData]);

  // Fetch additional analytics on mount (comparison, SLA, workload, revenue)
  useEffect(() => {
    // Only fetch if user has management role
    const mgmtRoles = ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR"];
    if (!mgmtRoles.includes(userRole)) return;

    apiClient.getComparisonMetrics().then((res) => {
      setCompMetrics((res?.data ?? res) as Record<string, unknown>);
    }).catch(() => {});

    apiClient.getPhasedTat().then((res) => {
      setPhasedTat((res?.data ?? res) as Record<string, unknown>);
    }).catch(() => {});

    apiClient.getWorkloadDistribution().then((res) => {
      setWorkload((res?.data ?? res) as { analysts: { name: string; orderCount: number }[] });
    }).catch(() => {});

    apiClient.getRevenueBreakdown().then((res) => {
      setRevBreakdown((res?.data ?? res) as Record<string, unknown>);
    }).catch(() => {});
  }, [userRole]);

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
    fetchChartData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selamat datang di Enterprise Laboratory Information System
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          {/* Live indicator pulse */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>
              {lastUpdated ? `${relativeTime(lastUpdated.toISOString())}` : "Memuat..."}
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

      {/* Quick Action Buttons (#5) — role-aware */}
      <div className="flex flex-wrap items-center gap-2">
        {["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS"].includes(userRole) && (
          <Link
            href="/dashboard/registration"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand dark:hover:text-brand"
          >
            <UserPlus className="h-4 w-4" />
            Registrasi Pasien
          </Link>
        )}
        {["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS"].includes(userRole) && (
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand dark:hover:text-brand"
          >
            <Plus className="h-4 w-4" />
            Buat Order
          </Link>
        )}
        {["SUPER_ADMIN", "ADMIN", "ANALIS", "SAMPLING"].includes(userRole) && (
          <Link
            href="/dashboard/laboratory/queue"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand dark:hover:text-brand"
          >
            <FlaskConical className="h-4 w-4" />
            Antrian Lab
          </Link>
        )}
        {["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR"].includes(userRole) && (
          <Link
            href="/dashboard/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand dark:hover:text-brand"
          >
            <FileText className="h-4 w-4" />
            Laporan
          </Link>
        )}
      </div>

      {/* KPI Cards — role-aware (#24) */}
      {loading ? (
        <KPISkeleton />
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pasien Hari Ini — visible to all */}
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

          {/* Pendapatan — visible to OWNER, MANAGER, ADMIN, KASIR, SUPER_ADMIN */}
          {["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR"].includes(userRole) && (
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
              <div className="rounded-lg bg-brand/10 p-3 text-brand dark:bg-brand/20 dark:text-brand">
                <Banknote className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Bulan ini: {formatShortCurrency(summary.totalRevenueMonth)}
            </p>
          </div>
          )}

          {/* Hasil Kritis — visible to ADMIN, ANALIS, DOKTER, SUPER_ADMIN */}
          {["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "ANALIS", "DOKTER"].includes(userRole) && (
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
          )}

          {/* Selesai Hari Ini — visible to all */}
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

      {/* Critical Values Alert (#25) — only for roles that deal with lab results */}
      {!loading && summary && summary.criticalResults > 0 && ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "ANALIS", "DOKTER"].includes(userRole) && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {summary.criticalResults} Hasil Kritis Hari Ini
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Terdapat hasil pemeriksaan dengan nilai kritis yang memerlukan tindakan segera.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/laboratory/critical-values"
            className="flex items-center gap-1.5 rounded-lg bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            Lihat Detail
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Date Range Filter + Charts Section */}
      <div className="space-y-4">
        {/* Date Range Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Tren Periode</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {DATE_RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setDateRange(preset.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  dateRange === preset.value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue Line Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-brand/10 p-2 text-brand">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Tren Pendapatan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Revenue harian {dateRange} hari terakhir
                </p>
              </div>
            </div>
            {chartsLoading ? <ChartSkeleton /> : <RevenueLineChart data={revenueData} />}
          </div>

          {/* Volume Bar Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Volume Order
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Jumlah order harian {dateRange} hari terakhir
                </p>
              </div>
            </div>
            {chartsLoading ? <ChartSkeleton /> : <VolumeBarChart data={volumeData} />}
          </div>
        </div>
      </div>

      {/* Region Distribution Widget */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Distribusi Pasien per Wilayah
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Berdasarkan provinsi tempat tinggal
            </p>
          </div>
        </div>
        {regionLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : regionData.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            Belum ada data distribusi wilayah
          </div>
        ) : (
          <RegionDistributionChart data={regionData} />
        )}
      </div>

      {/* Comparison Metrics (#26), SLA (#27), Revenue Breakdown (#20), Workload (#28) */}
      {["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"].includes(userRole) && (
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Comparison Metrics (#26) */}
        {compMetrics && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Perbandingan (vs Kemarin)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Order", data: compMetrics.orders as Record<string, unknown> },
              { label: "Revenue", data: compMetrics.revenue as Record<string, unknown> },
              { label: "Pasien (Minggu)", data: compMetrics.patients as Record<string, unknown> },
              { label: "Revenue (Bulan)", data: compMetrics.monthlyRevenue as Record<string, unknown> },
            ].map((item) => {
              const delta = Number(item.data?.delta ?? 0);
              const isPositive = delta >= 0;
              return (
                <div key={item.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {String(item.data?.today ?? item.data?.thisWeek ?? item.data?.thisMonth ?? 0)}
                    </span>
                    <span className={cn("text-xs font-semibold", isPositive ? "text-green-600" : "text-red-500")}>
                      {isPositive ? "↑" : "↓"} {Math.abs(delta)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* SLA Monitoring (#27) + Phased TAT (#23) */}
        {phasedTat && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            SLA & Turnaround Time
          </h3>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">SLA Compliance</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {String(phasedTat.slaCompliance ?? 0)}%
              </p>
              <p className="text-[10px] text-slate-400">Target: {String(phasedTat.slaTargetMinutes ?? 120)} menit</p>
            </div>
            <div className="flex-1 text-right">
              <span className="text-xs text-green-600 dark:text-green-400">✓ {String(phasedTat.ordersWithinSla ?? 0)} dalam SLA</span>
              <br />
              <span className="text-xs text-red-500 dark:text-red-400">✗ {String(phasedTat.ordersExceedingSla ?? 0)} melebihi</span>
            </div>
          </div>
          {/* Phase breakdown */}
          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rata-rata per Fase</p>
            {(() => {
              const phases = phasedTat.phases as Record<string, number> | undefined;
              if (!phases) return null;
              const items = [
                { label: "Registrasi → Sampel", value: phases.registration_to_sample },
                { label: "Sampel → Verifikasi", value: phases.sample_to_verification },
                { label: "Verifikasi → Approval", value: phases.verification_to_approval },
                { label: "Total (end-to-end)", value: phases.total },
              ];
              const maxVal = Math.max(...items.map((i) => i.value), 1);
              return items.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-36 truncate text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-cyan-500" style={{ width: `${(item.value / maxVal) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs font-semibold text-slate-900 dark:text-white">{item.value}m</span>
                </div>
              ));
            })()}
          </div>
        </div>
        )}

        {/* Revenue Breakdown (#20) */}
        {revBreakdown && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Revenue Breakdown (Bulan Ini)
          </h3>
          <div className="space-y-3">
            {[
              { label: "Total Tagihan", value: Number(revBreakdown.totalBilled ?? 0), color: "bg-slate-500" },
              { label: "Terbayar", value: Number(revBreakdown.totalPaid ?? 0), color: "bg-green-500" },
              { label: "Diskon", value: Number(revBreakdown.totalDiscount ?? 0), color: "bg-amber-500" },
              { label: "Outstanding", value: Number(revBreakdown.outstanding ?? 0), color: "bg-red-500" },
            ].map((item) => {
              const maxVal = Number(revBreakdown.totalBilled ?? 1);
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={cn("h-full rounded-full", item.color)} style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%` }} />
                  </div>
                  <span className="w-24 text-right text-xs font-semibold text-slate-900 dark:text-white">
                    {formatShortCurrency(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            {String(revBreakdown.outstandingOrderCount ?? 0)} order belum dibayar
          </p>
        </div>
        )}

        {/* Workload Distribution (#28) */}
        {workload && workload.analysts && workload.analysts.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
            Beban Kerja Analis (30 Hari)
          </h3>
          <div className="space-y-2">
            {(() => {
              const analysts = workload.analysts;
              const maxCount = Math.max(...analysts.map((a) => a.orderCount), 1);
              return analysts.slice(0, 8).map((analyst, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs font-medium text-slate-700 dark:text-slate-300" title={analyst.name}>
                    {analyst.name}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${(analyst.orderCount / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-900 dark:text-white">
                    {analyst.orderCount}
                  </span>
                </div>
              ));
            })()}
          </div>
        </div>
        )}
      </div>
      )}

      {/* Recent Orders Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">Order Terbaru</h2>
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark transition-colors"
          >
            Lihat Semua
            <ExternalLink className="h-3 w-3" />
          </Link>
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
