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
  Shield,
  Stethoscope,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";

// ─── Types ─────────────────────────────────────────────────────────────────

type ReportType = "daily" | "monthly" | "patient" | "test" | "revenue" | "tat" | "insurance" | "doctor" | "clinic";

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
  {
    id: "insurance",
    label: "Klaim Asuransi",
    description: "Ringkasan klaim asuransi per provider",
    icon: Shield,
    color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300",
  },
  {
    id: "doctor",
    label: "Per Dokter",
    description: "Volume order dan revenue per dokter perujuk",
    icon: Stethoscope,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300",
  },
  {
    id: "clinic",
    label: "Per Klinik",
    description: "Volume order dan revenue per klinik mitra",
    icon: Building2,
    color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300",
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
  const { toasts, warning, error: showError, dismiss } = useToast();

  useEffect(() => {
    setLoading(true);
    let type: Parameters<typeof apiClient.getReport>[0] | null = null;
    
    switch (selectedReport) {
      case "revenue": type = "revenue-summary"; break;
      case "monthly": type = "orders-by-payment-method"; break;
      case "daily": type = "orders-by-status"; break;
      case "test": type = "top-tests"; break;
      case "patient": type = "new-patients"; break;
      case "tat": type = "turnaround-time"; break;
      case "insurance": type = "insurance-claims"; break;
      case "doctor": type = "by-referring-doctor"; break;
      case "clinic": type = "by-referring-clinic"; break;
    }

    if (type) {
      apiClient
        .getReport(type, { startDate: dateFrom, endDate: dateTo })
        .then((res) => {
          setSummary((res?.data ?? res) as Record<string, unknown>);
        })
        .catch(() => setSummary(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [selectedReport, dateFrom, dateTo]);

  const handleDownloadPdf = async () => {
    let type: "revenue-summary" | "orders-by-status" | null = null;
    if (selectedReport === "revenue") type = "revenue-summary";
    else if (selectedReport === "daily") type = "orders-by-status";
    
    if (!type) return;
    
    try {
      const blob = await apiClient.getReportPdf(type, { startDate: dateFrom, endDate: dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${dateFrom}-to-${dateTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError("Gagal mengunduh PDF.");
    }
  };

  const handleDownloadCsv = () => {
    if (!summary) return;

    // Extract data array from summary
    const dataArray = (summary.data ?? summary.daily ?? []) as Array<Record<string, unknown>>;
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      showError("Tidak ada data untuk diexport.");
      return;
    }

    // Build CSV from first item's keys
    const headers = Object.keys(dataArray[0]).filter((k) => typeof dataArray[0][k] !== "object");
    const csvRows = [
      headers.join(","),
      ...dataArray.map((row) =>
        headers.map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          // Escape CSV values containing commas or quotes
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-${selectedReport}-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPdfSupported = selectedReport === "revenue" || selectedReport === "daily";

  const config = REPORT_CONFIGS.find((r) => r.id === selectedReport)!;

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR"]}>
    <div className="space-y-6">
      {/* Toast Messages */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={!summary}
            title="Export data sebagai CSV"
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
              summary
                ? "border border-brand text-brand hover:bg-brand/5 dark:border-brand dark:text-brand"
                : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            )}>
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button 
            onClick={handleDownloadPdf}
            disabled={!isPdfSupported}
            title={isPdfSupported ? "Unduh laporan sebagai PDF" : "Export PDF hanya tersedia untuk Laporan Harian dan Pendapatan"}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-[0.98]",
              isPdfSupported
                ? "bg-brand text-white shadow-brand/20 hover:bg-brand-dark"
                : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            )}>
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
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
        {/* Quick preset buttons */}
        {[
          { label: "7 Hari", days: 7 },
          { label: "30 Hari", days: 30 },
          { label: "Bulan Ini", days: 0 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              const today = new Date();
              const to = today.toISOString().slice(0, 10);
              let from: string;
              if (preset.days === 0) {
                // Bulan ini
                from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
              } else {
                const d = new Date();
                d.setDate(d.getDate() - preset.days);
                from = d.toISOString().slice(0, 10);
              }
              setDateFrom(from);
              setDateTo(to);
            }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand dark:hover:text-brand"
          >
            {preset.label}
          </button>
        ))}
        <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
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
            <div className="space-y-4 py-6">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
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

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      accent
        ? "border-brand/30 bg-brand/5 dark:border-brand/20 dark:bg-brand/10"
        : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
    )}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn("mt-1 text-xl font-bold", accent ? "text-brand" : "text-slate-900 dark:text-white")}>{value}</p>
    </div>
  );
}

// ─── Status label mapping for better readability ────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu Pembayaran",
  PAID: "Sudah Bayar",
  DEPOSIT_RECEIVED: "Deposit Diterima",
  SAMPLE_COLLECTED: "Sampel Diambil",
  IN_ANALYSIS: "Dalam Analisis",
  VERIFIED: "Terverifikasi",
  APPROVED: "Disetujui Dokter",
  NOTIFIED: "Hasil Dikirim",
  CANCELLED: "Dibatalkan",
  PAYMENT_OVERDUE: "Jatuh Tempo",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  DEPOSIT_RECEIVED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  SAMPLE_COLLECTED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_ANALYSIS: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  VERIFIED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  APPROVED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  NOTIFIED: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  PAYMENT_OVERDUE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

function formatRupiahLocal(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
}

// ─── Mini Chart Components for Report Visualization (#14) ───────────────────

/** Horizontal bar chart for categorical data */
function MiniBarChart({ data, colorClass = "bg-brand" }: { data: { label: string; value: number }[]; colorClass?: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-28 truncate text-xs font-medium text-slate-600 dark:text-slate-400" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", colorClass)}
              style={{ width: `${(item.value / maxVal) * 100}%` }}
            />
          </div>
          <span className="w-12 text-right text-xs font-bold text-slate-900 dark:text-white">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Simple SVG donut chart for status distribution */
function MiniDonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
        {data.map((item, i) => {
          const strokeLen = (item.value / total) * circumference;
          const segment = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={`${strokeLen} ${circumference - strokeLen}`}
              strokeDashoffset={-offset}
              className={item.color}
              transform="rotate(-90 50 50)"
            />
          );
          offset += strokeLen;
          return segment;
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 dark:fill-white text-[11px] font-bold">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", item.color.replace("text-", "bg-"))} />
            <span className="text-xs text-slate-600 dark:text-slate-400">{item.label}</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Simple SVG line sparkline for daily revenue data */
function MiniLineChart({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const w = 100;
  const h = 40;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - (d.value / maxVal) * (h - 4),
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full">
      <path d={area} className="fill-brand/10 dark:fill-brand/20" />
      <path d={path} fill="none" className="stroke-brand" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReportContent({ summary }: { summary: Record<string, unknown> }) {
  // ─── Revenue summary format (totalRevenue, totalOrders, daily: [...]) ──
  const dailyArray = summary.daily as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(dailyArray) && dailyArray.length > 0 && summary.totalRevenue !== undefined) {
    const totalRevenue = Number(summary.totalRevenue ?? 0);
    const totalOrders = Number(summary.totalOrders ?? 0);
    const lineData = dailyArray.map((d) => ({
      date: String(d.date ?? ""),
      value: Number(d.revenue ?? 0),
    }));
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard label="Total Pendapatan" value={formatRupiahLocal(totalRevenue)} accent />
          <SummaryCard label="Total Order" value={String(totalOrders)} />
          <SummaryCard label="Rata-rata/Hari" value={formatRupiahLocal(Math.round(totalRevenue / Math.max(dailyArray.length, 1)))} />
        </div>
        {/* Revenue trend line chart */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tren Pendapatan Harian</h4>
          <MiniLineChart data={lineData} />
        </div>
        {/* Daily table */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Rincian Harian</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Tanggal</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Order</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dailyArray.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{String(d.date ?? "-")}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{String(d.orderCount ?? "-")}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">{formatRupiahLocal(Number(d.revenue ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{totalOrders}</td>
                  <td className="px-4 py-3 text-right font-bold text-brand">{formatRupiahLocal(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Legacy lab summary format (totalOrdersToday, ordersByStatus as object) ──
  const isLegacyLabSummary = summary.totalOrdersToday !== undefined || summary.averageTatMinutes !== undefined;

  if (isLegacyLabSummary) {
    const ordersByStatus = summary.ordersByStatus as Record<string, number> | undefined;
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total Order" value={String(Number(summary.totalOrdersToday ?? 0))} accent />
          <SummaryCard label="Rata-rata TAT" value={`${Number(summary.averageTatMinutes ?? summary.avgTat ?? 0)} menit`} />
          <SummaryCard label="Pending Approval" value={String(Number(summary.pendingApproval ?? 0))} />
          <SummaryCard label="Dalam Antrian" value={String(Number(summary.totalInQueue ?? 0))} />
        </div>
        {ordersByStatus && (
          <StatusBreakdownGrid data={Object.entries(ordersByStatus).map(([status, count]) => ({ status, count }))} />
        )}
      </div>
    );
  }

  // ─── Standard report format: { total, data: [{status/name/..., count/...}], startDate, endDate } ──
  const total = summary.total as number | undefined;
  const dataArray = summary.data as Array<Record<string, unknown>> | undefined;

  if (Array.isArray(dataArray) && dataArray.length > 0) {
    // Detect data shape
    const firstItem = dataArray[0];
    const hasStatus = "status" in firstItem && "count" in firstItem;
    const hasTestName = "testName" in firstItem || "testCode" in firstItem;
    const hasName = "name" in firstItem;
    const hasRevenue = "revenue" in firstItem || "totalRevenue" in firstItem || "amount" in firstItem;
    const hasAvgTat = "avgTat" in firstItem || "avgMinutes" in firstItem;

    // ── Status-based report (Laporan Harian / orders-by-status) ──
    if (hasStatus) {
      const statusData = dataArray as Array<{ status: string; count: number }>;
      const sorted = [...statusData].sort((a, b) => b.count - a.count);
      const donutColors = ["text-blue-500", "text-amber-500", "text-green-500", "text-indigo-500", "text-purple-500", "text-rose-500", "text-cyan-500", "text-slate-400"];
      const donutData = sorted.slice(0, 7).map((d, i) => ({
        label: STATUS_LABELS[d.status] ?? d.status.replace(/_/g, " "),
        value: d.count,
        color: donutColors[i % donutColors.length],
      }));
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Order" value={String(total ?? statusData.reduce((s, d) => s + d.count, 0))} accent />
            <SummaryCard label="Jumlah Status" value={`${statusData.length} kategori`} />
            <SummaryCard label="Terbanyak" value={sorted.length > 0 ? `${STATUS_LABELS[sorted[0].status] ?? sorted[0].status} (${sorted[0].count})` : "-"} />
          </div>
          {/* Donut chart visualization */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Distribusi Visual</h4>
            <MiniDonutChart data={donutData} />
          </div>
          <StatusBreakdownGrid data={statusData} />
        </div>
      );
    }

    // ── Test-based report (Laporan Pemeriksaan / top-tests) ──
    if (hasTestName) {
      const testData = dataArray as Array<Record<string, unknown>>;
      const totalRevenue = testData.reduce((s, d) => s + Number(d.totalRevenue ?? d.revenue ?? 0), 0);
      const totalOrders = testData.reduce((s, d) => s + Number(d.orderCount ?? d.count ?? 0), 0);
      // Bar chart data for top tests
      const barData = testData.slice(0, 10).map((d) => ({
        label: String(d.testCode ?? d.testName ?? ""),
        value: Number(d.orderCount ?? d.count ?? 0),
      }));
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Pendapatan" value={formatRupiahLocal(totalRevenue)} accent />
            <SummaryCard label="Jumlah Jenis Tes" value={String(testData.length)} />
            <SummaryCard label="Total Order Pemeriksaan" value={String(totalOrders)} />
          </div>
          {/* Bar chart visualization */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Top Pemeriksaan (Volume)</h4>
            <MiniBarChart data={barData} colorClass="bg-amber-500" />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Rincian per Pemeriksaan</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Kode</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Nama Pemeriksaan</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Jumlah Order</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {testData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {String(item.testCode ?? "-")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {String(item.testName ?? item.name ?? `Tes ${i + 1}`)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                        {String(item.orderCount ?? item.count ?? "-")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatRupiahLocal(Number(item.totalRevenue ?? item.revenue ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{totalOrders}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand">{formatRupiahLocal(totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ── Revenue report ──
    if (hasRevenue) {
      const revenueData = dataArray as Array<Record<string, unknown>>;
      const totalRevenue = revenueData.reduce((s, d) => s + Number(d.revenue ?? d.totalRevenue ?? d.amount ?? 0), 0);
      // Check if data has 'date' field for line chart (daily revenue breakdown)
      const hasDateField = "date" in revenueData[0];
      const lineData = hasDateField
        ? revenueData.map((d) => ({ date: String(d.date), value: Number(d.revenue ?? d.totalRevenue ?? d.amount ?? 0) }))
        : [];
      // Bar chart for revenue by category
      const barData = revenueData.slice(0, 8).map((d) => ({
        label: String(d.name ?? d.paymentMethod ?? d.category ?? d.date ?? "").replace(/_/g, " "),
        value: Number(d.revenue ?? d.totalRevenue ?? d.amount ?? 0),
      }));
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Pendapatan" value={formatRupiahLocal(totalRevenue)} accent />
            <SummaryCard label="Jumlah Kategori" value={String(revenueData.length)} />
            {total !== undefined && <SummaryCard label="Total Transaksi" value={String(total)} />}
          </div>
          {/* Chart visualization */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {hasDateField ? "Tren Pendapatan Harian" : "Pendapatan per Kategori"}
            </h4>
            {lineData.length > 1 ? (
              <MiniLineChart data={lineData} />
            ) : (
              <MiniBarChart data={barData} colorClass="bg-rose-500" />
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Rincian Pendapatan</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Kategori</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Jumlah</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {revenueData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {String(item.name ?? item.testName ?? item.paymentMethod ?? item.category ?? item.label ?? `Item ${i + 1}`).replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                        {item.count !== undefined ? String(item.count) : (item.orderCount !== undefined ? String(item.orderCount) : "-")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatRupiahLocal(Number(item.revenue ?? item.totalRevenue ?? item.amount ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                      {total ?? revenueData.reduce((s, d) => s + Number(d.count ?? d.orderCount ?? 0), 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand">
                      {formatRupiahLocal(totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ── TAT report ──
    if (hasAvgTat) {
      const tatData = dataArray as Array<Record<string, unknown>>;
      return (
        <div className="space-y-6">
          {total !== undefined && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Total Data" value={String(total)} accent />
            </div>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Turnaround Time per Kategori</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Kategori</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Rata-rata (menit)</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Jumlah Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tatData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {String(item.name ?? item.category ?? item.testCategory ?? `Kategori ${i + 1}`)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {Number(item.avgTat ?? item.avgMinutes ?? 0).toFixed(0)} menit
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                        {item.count !== undefined ? String(item.count) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ── Name-based report (top tests, patients, etc.) ──
    if (hasName) {
      const namedData = dataArray as Array<Record<string, unknown>>;
      return (
        <div className="space-y-6">
          {total !== undefined && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard label="Total" value={String(total)} accent />
              <SummaryCard label="Jumlah Item" value={String(namedData.length)} />
            </div>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Daftar Data</h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">Nama</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-400">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {namedData.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {String(item.name ?? item.testName ?? item.patientName ?? `Item ${i + 1}`)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {String(item.count ?? item.total ?? item.value ?? "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ── Generic array fallback — render as table from first item keys ──
    const columns = Object.keys(firstItem);
    return (
      <div className="space-y-6">
        {total !== undefined && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard label="Total" value={String(total)} accent />
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {col.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dataArray.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30 even:bg-slate-50/50 dark:even:bg-slate-900/30">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-slate-900 dark:text-white whitespace-nowrap">
                        {String(item[col] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Object with ordersByStatus nested (another legacy shape) ──
  if (summary.ordersByStatus && typeof summary.ordersByStatus === "object") {
    const ordersByStatus = summary.ordersByStatus as Record<string, number>;
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summary.totalOrdersToday !== undefined && <SummaryCard label="Total Order" value={String(summary.totalOrdersToday)} accent />}
          {total !== undefined && <SummaryCard label="Total" value={String(total)} accent />}
        </div>
        <StatusBreakdownGrid data={Object.entries(ordersByStatus).map(([status, count]) => ({ status, count }))} />
      </div>
    );
  }

  // ─── Fallback: unknown shape — render key/value pairs nicely ──
  const entries = Object.entries(summary).filter(([k]) => k !== "startDate" && k !== "endDate");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, value]) => {
          if (typeof value === "object" && value !== null) return null;
          return (
            <SummaryCard
              key={key}
              label={key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
              value={String(value)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Breakdown Grid (reusable) ───────────────────────────────────────

function StatusBreakdownGrid({ data }: { data: Array<{ status: string; count: number }> }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const totalCount = sorted.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Distribusi per Status</h3>
      <div className="space-y-2">
        {sorted.map(({ status, count }) => {
          const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0";
          const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
          const colorClass = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

          return (
            <div key={status} className="flex items-center gap-3">
              {/* Label badge */}
              <span className={cn("inline-flex min-w-[140px] items-center justify-center rounded-lg px-2.5 py-1 text-xs font-semibold", colorClass)}>
                {label}
              </span>
              {/* Progress bar */}
              <div className="flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              {/* Count & percentage */}
              <div className="flex min-w-[80px] items-center justify-end gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
                <span className="text-xs text-slate-400">({percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
