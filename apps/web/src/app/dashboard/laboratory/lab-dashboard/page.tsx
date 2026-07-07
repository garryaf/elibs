"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  Clock,
  ShieldCheck,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LabSummary {
  totalOrdersToday: number;
  averageTatMinutes: number;
  pendingApproval: number;
  totalInQueue: number;
  ordersByStatus: Record<string, number>;
}

interface VolumePoint {
  date: string; // YYYY-MM-DD
  count: number;
}

// ---------------------------------------------------------------------------
// Fallback data — used when API is loading or fails
// ---------------------------------------------------------------------------

const EMPTY_SUMMARY: LabSummary = {
  totalOrdersToday: 0,
  averageTatMinutes: 0,
  pendingApproval: 0,
  totalInQueue: 0,
  ordersByStatus: {},
};

function generateMockVolume(days: number): VolumePoint[] {
  const points: VolumePoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toISOString().slice(0, 10),
      count: Math.floor(20 + Math.random() * 30),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Status color mapping (Sage Green accent palette)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-500",
  PAID: "bg-blue-500",
  SAMPLE_COLLECTED: "bg-indigo-500",
  IN_ANALYSIS: "bg-[oklch(0.55_0.08_145)]",
  VERIFIED: "bg-[oklch(0.55_0.06_90)]",
  APPROVED: "bg-emerald-500",
  NOTIFIED: "bg-green-500",
  CANCELLED: "bg-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Bayar",
  PAID: "Terbayar",
  SAMPLE_COLLECTED: "Sampel Diterima",
  IN_ANALYSIS: "Proses Analisa",
  VERIFIED: "Terverifikasi",
  APPROVED: "Disetujui",
  NOTIFIED: "Terkirim",
  CANCELLED: "Dibatalkan",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md",
        accent && "border-[oklch(0.55_0.08_145)]/30"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span
        className={cn(
          "text-3xl font-bold tracking-tight",
          accent ? "text-[oklch(0.55_0.08_145)]" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatTat(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

// Simple CSS bar chart — no external library needed
function VolumeChart({ data }: { data: VolumePoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[2px] h-40 w-full">
      {data.map((point) => {
        const heightPct = (point.count / max) * 100;
        return (
          <div
            key={point.date}
            className="group relative flex-1 flex flex-col items-center justify-end"
          >
            {/* Tooltip */}
            <div className="absolute -top-8 hidden group-hover:flex flex-col items-center z-10">
              <span className="rounded bg-foreground/90 px-2 py-0.5 text-[10px] text-background whitespace-nowrap">
                {point.date}: {point.count}
              </span>
            </div>
            <div
              className="w-full rounded-t bg-[oklch(0.55_0.08_145)] opacity-80 hover:opacity-100 transition-opacity min-h-[2px]"
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function QueueCards({
  ordersByStatus,
}: {
  ordersByStatus: Record<string, number>;
}) {
  // Only show statuses that represent "in queue" (active workflow statuses)
  const queueStatuses = [
    "PAID",
    "SAMPLE_COLLECTED",
    "IN_ANALYSIS",
    "VERIFIED",
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {queueStatuses.map((status) => (
        <div
          key={status}
          className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4"
        >
          <div className={cn("h-2 w-2 rounded-full", STATUS_COLORS[status])} />
          <span className="text-2xl font-bold text-foreground">
            {ordersByStatus[status] ?? 0}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground text-center">
            {STATUS_LABELS[status]}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBreakdown({
  ordersByStatus,
}: {
  ordersByStatus: Record<string, number>;
}) {
  const total = Object.values(ordersByStatus).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-2">
      {Object.entries(ordersByStatus).map(([status, count]) => (
        <div key={status} className="flex items-center gap-3">
          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_COLORS[status])} />
          <span className="text-xs font-medium text-muted-foreground w-28 truncate">
            {STATUS_LABELS[status] ?? status}
          </span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", STATUS_COLORS[status])}
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-foreground w-6 text-right">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range options
// ---------------------------------------------------------------------------

type DateRange = 7 | 14 | 30 | 60;

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: 7, label: "7 Hari" },
  { value: 14, label: "14 Hari" },
  { value: 30, label: "30 Hari" },
  { value: 60, label: "60 Hari" },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function LabDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [summary, setSummary] = useState<LabSummary>(EMPTY_SUMMARY);
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([]);

  // Fetch summary from real API
  useEffect(() => {
    apiClient.getLabSummary().then((res) => {
      const d = (res?.data ?? res) as Record<string, unknown>;
      setSummary({
        totalOrdersToday: (d.totalOrdersToday as number) || 0,
        averageTatMinutes: (d.averageTatMinutes as number) || (d.avgTat as number) || 0,
        pendingApproval: (d.pendingApproval as number) || 0,
        totalInQueue: (d.totalInQueue as number) || 0,
        ordersByStatus: (d.ordersByStatus as Record<string, number>) || {},
      });
    }).catch(() => { /* keep empty summary */ });
  }, []);

  // Fetch volume from real API
  useEffect(() => {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - dateRange * 86400000).toISOString().slice(0, 10);
    apiClient.getLabVolume({ startDate, endDate }).then((res) => {
      const d = (res?.data ?? res) as unknown;
      if (Array.isArray(d)) {
        setVolumeData(d as VolumePoint[]);
      } else {
        setVolumeData(generateMockVolume(dateRange));
      }
    }).catch(() => {
      setVolumeData(generateMockVolume(dateRange));
    });
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Summary Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={ClipboardList}
          label="Total Order Hari Ini"
          value={summary.totalOrdersToday}
          accent
        />
        <MetricCard
          icon={Clock}
          label="Rata-rata TAT"
          value={formatTat(summary.averageTatMinutes)}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Menunggu Approval"
          value={summary.pendingApproval}
        />
        <MetricCard
          icon={Users}
          label="Total Dalam Antrian"
          value={summary.totalInQueue}
        />
      </div>

      {/* Bento Grid: Status Breakdown + Queue Counts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders by Status */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Order per Status
          </h2>
          <StatusBreakdown ordersByStatus={summary.ordersByStatus} />
        </div>

        {/* Real-time Queue Counts */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Antrian Aktif
          </h2>
          <QueueCards ordersByStatus={summary.ordersByStatus} />
        </div>
      </div>

      {/* Volume Over Time */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Volume Order
            </h2>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-0.5">
            {DATE_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  dateRange === range.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <VolumeChart data={volumeData} />
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{volumeData[0]?.date}</span>
          <span>{volumeData[volumeData.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
