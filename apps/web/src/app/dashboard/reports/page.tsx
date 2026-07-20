"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  FileText,
  Users,
  FlaskConical,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";

// ─── Types ─────────────────────────────────────────────────────────────────

type ReportType = "daily" | "monthly" | "patient" | "test" | "revenue" | "tat";

interface ReportConfig {
  id: ReportType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    id: "daily",
    label: "Laporan Harian",
    description: "Ringkasan aktivitas lab per hari",
    icon: Calendar,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300",
  },
  {
    id: "monthly",
    label: "Laporan Bulanan",
    description: "Statistik performa lab per bulan",
    icon: BarChart3,
    color: "text-brand bg-brand/10 dark:bg-brand/10 dark:text-brand",
  },
  {
    id: "patient",
    label: "Laporan Pasien",
    description: "Distribusi pasien per wilayah dan demografi",
    icon: Users,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300",
  },
  {
    id: "test",
    label: "Laporan Pemeriksaan",
    description: "Volume pemeriksaan per jenis tes",
    icon: FlaskConical,
    color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300",
  },
  {
    id: "revenue",
    label: "Laporan Pendapatan",
    description: "Revenue per periode, metode bayar, dan asuransi",
    icon: TrendingUp,
    color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300",
  },
  {
    id: "tat",
    label: "Laporan TAT",
    description: "Turnaround time rata-rata per kategori",
    icon: Clock,
    color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300",
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("daily");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiClient
      .getLabSummary()
      .then((res) => {
        setSummary((res?.data ?? res) as Record<string, unknown>);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  const config = REPORT_CONFIGS.find((r) => r.id === selectedReport)!;

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR"]}>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Laporan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate dan unduh laporan operasional laboratorium.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark active:scale-[0.98]">
          <Download className="h-4 w-4" />
          Export PDF
        </button>
      </div>

      {/* Report Type Selection */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CONFIGS.map((report) => {
          const Icon = report.icon;
          const isActive = selectedReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                isActive
                  ? "border-brand/50 bg-brand/5 ring-1 ring-brand/30 dark:border-brand dark:bg-brand/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", report.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", isActive ? "text-brand dark:text-brand" : "text-slate-900 dark:text-white")}>
                  {report.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{report.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Periode:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <span className="text-sm text-slate-400">s/d</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Report Content */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.color)}>
              <config.icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{config.label}</h2>
              <p className="text-xs text-slate-500">Periode: {dateFrom} — {dateTo}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-8 w-8 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : summary ? (
            <ReportContent summary={summary} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-500">Belum ada data untuk periode ini</p>
              <p className="text-xs text-slate-400">Pilih rentang tanggal yang berbeda atau coba lagi nanti.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function ReportContent({ summary }: { summary: Record<string, unknown> }) {
  const ordersByStatus = summary.ordersByStatus as Record<string, number> | undefined;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Order" value={String(Number(summary.totalOrdersToday ?? 0))} />
        <SummaryCard label="Rata-rata TAT" value={`${Number(summary.averageTatMinutes ?? summary.avgTat ?? 0)} menit`} />
        <SummaryCard label="Pending Approval" value={String(Number(summary.pendingApproval ?? 0))} />
        <SummaryCard label="Dalam Antrian" value={String(Number(summary.totalInQueue ?? 0))} />
      </div>

      {ordersByStatus && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Breakdown per Status</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{status.replace(/_/g, " ")}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
