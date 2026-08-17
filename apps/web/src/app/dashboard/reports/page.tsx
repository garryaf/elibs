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
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";

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
    
    if (!type) {
      warning("Export PDF hanya tersedia untuk Laporan Pendapatan dan Harian.");
      return;
    }
    
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
        <button 
          onClick={handleDownloadPdf}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark active:scale-[0.98]">
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

function ReportContent({ summary }: { summary: Record<string, unknown> }) {
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
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Order" value={String(total ?? statusData.reduce((s, d) => s + d.count, 0))} accent />
            <SummaryCard label="Jumlah Status" value={`${statusData.length} kategori`} />
            <SummaryCard label="Terbanyak" value={statusData.length > 0 ? `${STATUS_LABELS[statusData.sort((a, b) => b.count - a.count)[0].status] ?? statusData[0].status} (${statusData[0].count})` : "-"} />
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
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Pendapatan" value={formatRupiahLocal(totalRevenue)} accent />
            <SummaryCard label="Jumlah Jenis Tes" value={String(testData.length)} />
            <SummaryCard label="Total Order Pemeriksaan" value={String(totalOrders)} />
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
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryCard label="Total Pendapatan" value={formatRupiahLocal(totalRevenue)} accent />
            <SummaryCard label="Jumlah Kategori" value={String(revenueData.length)} />
            {total !== undefined && <SummaryCard label="Total Transaksi" value={String(total)} />}
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
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
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
