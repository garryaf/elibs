"use client";

import { useState, useMemo } from "react";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Plus,
  Activity,
  AlertTriangle,
  Calendar,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { WestgardChart } from "@/components/laboratory/westgard-chart";
import type { LeveyJenningsDataPoint } from "@/components/laboratory/westgard-chart";
import {
  useQCDashboard,
  useQCSamples,
  useLeveyJennings,
  useCreateQCSample,
} from "@/services/qc";
import type { QCTestStatus, QCSample, QCDashboardData } from "@/services/qc";

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function QCMetricCard({
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
        "flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md",
        accent && "border-brand/30"
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
          "text-2xl font-bold tracking-tight",
          accent ? "text-brand" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function QCStatusBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        passed
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      )}
    >
      {passed ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {passed ? "Pass" : "Fail"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Test Status Table
// ---------------------------------------------------------------------------

function TestStatusTable({ statuses }: { statuses: QCTestStatus[] }) {
  if (!statuses?.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada data QC status per tes.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              Kode Tes
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              Nama Tes
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              Status QC
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              Total Run
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              Pass Rate
            </th>
            <th className="px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
              Terakhir
            </th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((status) => (
            <tr
              key={status.testId}
              className="border-b border-border transition-colors hover:bg-brand/5"
            >
              <td className="px-4 py-3 font-mono text-xs font-semibold text-brand">
                {status.testCode}
              </td>
              <td className="px-4 py-3 text-foreground">{status.testName}</td>
              <td className="px-4 py-3">
                <QCStatusBadge passed={status.passed} />
                {!status.passed && status.violatedRule && (
                  <span className="ml-2 text-[11px] text-red-500">
                    ({status.violatedRule})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {status.totalRuns}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "font-semibold",
                    status.passRate >= 90
                      ? "text-green-600"
                      : status.passRate >= 70
                        ? "text-amber-600"
                        : "text-red-600"
                  )}
                >
                  {status.passRate.toFixed(0)}%
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {status.lastRunDate
                  ? new Date(status.lastRunDate).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample Management Section
// ---------------------------------------------------------------------------

function SampleList({ samples }: { samples: QCSample[] }) {
  if (!samples?.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Belum ada QC sample terdaftar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {samples.map((sample) => (
        <div
          key={sample.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                sample.isActive
                  ? "bg-brand/10 text-brand"
                  : "bg-muted text-muted-foreground"
              )}
            >
              L{sample.level}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {sample.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Lot: {sample.lotNumber}
                {sample.manufacturer && ` • ${sample.manufacturer}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Exp</p>
              <p className="text-xs font-medium text-foreground">
                {new Date(sample.expiryDate).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex h-2 w-2 rounded-full",
                sample.isActive ? "bg-green-500" : "bg-gray-400"
              )}
              title={sample.isActive ? "Active" : "Inactive"}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Register QC Sample Form (Modal-like inline form)
// ---------------------------------------------------------------------------

function RegisterSampleForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateQCSample();
  const [form, setForm] = useState({
    name: "",
    lotNumber: "",
    manufacturer: "",
    level: 1,
    expiryDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        name: form.name,
        lotNumber: form.lotNumber,
        manufacturer: form.manufacturer || undefined,
        level: form.level,
        expiryDate: form.expiryDate,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand/30 bg-card p-4"
    >
      <h4 className="text-sm font-semibold text-foreground">
        Registrasi QC Sample Baru
      </h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Nama Sample *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            placeholder="e.g. Normal Control Level 1"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Lot Number *
          </label>
          <input
            type="text"
            required
            value={form.lotNumber}
            onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            placeholder="e.g. LOT-2026-001"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Manufacturer
          </label>
          <input
            type="text"
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            placeholder="e.g. Bio-Rad"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Level *
          </label>
          <select
            value={form.level}
            onChange={(e) =>
              setForm({ ...form, level: Number(e.target.value) })
            }
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          >
            <option value={1}>Level 1 (Normal)</option>
            <option value={2}>Level 2 (Abnormal Low)</option>
            <option value={3}>Level 3 (Abnormal High)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Tanggal Expired *
          </label>
          <input
            type="date"
            required
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      {createMutation.error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="h-3.5 w-3.5" />
          Gagal mendaftarkan sample. Silakan coba lagi.
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:opacity-60"
        >
          {createMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          Simpan
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Levey-Jennings Section (chart for selected sample)
// ---------------------------------------------------------------------------

function LeveyJenningsSection({
  samples,
}: {
  samples: QCSample[];
}) {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    samples?.[0]?.id || ""
  );

  const { data: ljData, isLoading } = useLeveyJennings(selectedSampleId);

  // Safely extract chart data
  const chartData = useMemo(() => {
    if (!ljData) return null;
    const raw = ljData as any;
    // Handle nested envelope: { data: { mean, sd, dataPoints } } or direct
    const inner = raw?.data ?? raw;
    return {
      mean: inner?.mean ?? 0,
      sd: inner?.sd ?? 1,
      dataPoints: (inner?.dataPoints ?? []) as LeveyJenningsDataPoint[],
    };
  }, [ljData]);

  if (!samples?.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Pilih QC sample untuk menampilkan grafik Levey-Jennings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sample Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">
          QC Sample:
        </label>
        <select
          value={selectedSampleId}
          onChange={(e) => setSelectedSampleId(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
        >
          {samples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (Lot: {s.lotNumber}, Level {s.level})
            </option>
          ))}
        </select>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Memuat data grafik...</span>
          </div>
        </div>
      ) : chartData && chartData.dataPoints.length > 0 ? (
        <WestgardChart
          data={chartData.dataPoints}
          mean={chartData.mean}
          sd={chartData.sd}
          title="Levey-Jennings Chart"
          height={320}
        />
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-border">
          <div className="text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              Belum ada data QC run untuk sample ini.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main QC Dashboard Page
// ---------------------------------------------------------------------------

export default function QCDashboardPage() {
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useQCDashboard();

  const {
    data: samplesData,
    isLoading: samplesLoading,
  } = useQCSamples();

  // Extract from possible envelope
  const dashboard = useMemo(() => {
    if (!dashboardData) return null;
    const raw = dashboardData as any;
    const inner = raw?.data ?? raw;
    return inner as QCDashboardData;
  }, [dashboardData]);

  const samples = useMemo(() => {
    if (!samplesData) return [];
    const raw = samplesData as any;
    const inner = raw?.data ?? raw;
    return (Array.isArray(inner) ? inner : inner?.data ?? []) as QCSample[];
  }, [samplesData]);

  if (dashboardLoading || samplesLoading) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "ANALIS"]}>
        <div className="space-y-6">
          {/* Skeleton loading */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-border bg-card"
              />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </RoleGuard>
    );
  }

  if (dashboardError) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "ANALIS"]}>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-3 font-medium text-red-700 dark:text-red-300">
            Gagal memuat data QC Dashboard.
          </p>
          <button
            onClick={() => refetchDashboard()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <RotateCcw className="h-4 w-4" />
            Coba Lagi
          </button>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "ANALIS"]}>
      <div className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <QCMetricCard
            icon={FlaskConical}
            label="Total QC Samples"
            value={dashboard?.totalSamples ?? 0}
            accent
          />
          <QCMetricCard
            icon={Activity}
            label="Sample Aktif"
            value={dashboard?.activeSamples ?? 0}
          />
          <QCMetricCard
            icon={Calendar}
            label="Run Hari Ini"
            value={dashboard?.totalRunsToday ?? 0}
          />
          <QCMetricCard
            icon={CheckCircle2}
            label="Pass Rate"
            value={`${(dashboard?.passRate ?? 0).toFixed(0)}%`}
          />
        </div>

        {/* QC Status per Test */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Status QC per Tes
            </h2>
            {dashboard?.recentViolations && dashboard.recentViolations.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {dashboard.recentViolations.length} violasi terakhir
              </div>
            )}
          </div>
          <TestStatusTable statuses={dashboard?.testStatuses ?? []} />
        </div>

        {/* Levey-Jennings Chart */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Grafik Levey-Jennings (Westgard)
          </h2>
          <LeveyJenningsSection samples={samples} />
        </div>

        {/* QC Sample Management */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Manajemen QC Sample
            </h2>
            {!showRegisterForm && (
              <button
                onClick={() => setShowRegisterForm(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Sample
              </button>
            )}
          </div>

          {showRegisterForm && (
            <div className="mb-4">
              <RegisterSampleForm onClose={() => setShowRegisterForm(false)} />
            </div>
          )}

          <SampleList samples={samples} />
        </div>
      </div>
    </RoleGuard>
  );
}
