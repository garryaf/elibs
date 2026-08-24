"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Shield,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Search,
  Download,
  RefreshCw,
  X,
  TrendingUp,
  PenLine,
  Trash2,
  Plus,
  Timer,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  timestamp: string;
}

interface AuditFilters {
  entityName: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  entityId: string;
  userId: string;
}

interface AuditStats {
  totalToday: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  totalAll: number;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

const ENTITY_OPTIONS = [
  "Order",
  "OrderDetail",
  "Patient",
  "TestCategory",
  "TestMaster",
  "Panel",
  "Tariff",
  "Doctor",
  "Clinic",
  "Insurance",
  "Equipment",
  "Reagent",
  "User",
  "Visit",
  "PaymentComponent",
  "BatchInvoice",
  "PatientInsurance",
  "OrderInsurance",
  "SystemSetting",
];

// AT-FN-06: Static fallback action options (will be replaced by dynamic fetch)
const FALLBACK_ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "DISCOUNT_APPROVED",
  "DISCOUNT_REJECTED",
];

const INITIAL_FILTERS: AuditFilters = {
  entityName: "",
  action: "",
  dateFrom: "",
  dateTo: "",
  entityId: "",
  userId: "",
};

// AT-FN-07: Auto-refresh interval options (ms)
const REFRESH_INTERVALS = [
  { label: "Off", value: 0 },
  { label: "15s", value: 15000 },
  { label: "30s", value: 30000 },
  { label: "60s", value: 60000 },
];

// ─── Sort types ───────────────────────────────────────────────────────────────

type AuditSortField = "timestamp" | "action" | "entityName";
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    APPROVAL_APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    APPROVAL_REJECTED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    DISCOUNT_APPROVED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    DISCOUNT_REJECTED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors[action] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
    >
      {action}
    </span>
  );
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Field Label Mapping ──────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  notes: "Catatan",
  paidAt: "Waktu Bayar",
  paidBy: "Dibayar Oleh",
  status: "Status",
  barcode: "Barcode",
  visitId: "ID Kunjungan",
  clinicId: "Klinik",
  doctorId: "Dokter",
  priority: "Prioritas",
  createdAt: "Dibuat",
  patientId: "Pasien",
  updatedAt: "Diperbarui",
  amountPaid: "Jumlah Bayar",
  approvedAt: "Waktu Approve",
  approvedBy: "Diapprove Oleh",
  notifiedAt: "Waktu Notifikasi",
  rejectedAt: "Waktu Reject",
  rejectedBy: "Direject Oleh",
  verifiedAt: "Waktu Verifikasi",
  verifiedBy: "Diverifikasi Oleh",
  barcodeText: "Teks Barcode",
  cancelledAt: "Waktu Batal",
  cancelledBy: "Dibatalkan Oleh",
  discountAmount: "Jumlah Diskon",
  discountApprovedAt: "Diskon Diapprove",
  discountApprovedBy: "Diskon Oleh",
  discountReason: "Alasan Diskon",
  totalAmount: "Total",
  name: "Nama",
  email: "Email",
  phone: "Telepon",
  address: "Alamat",
  dateOfBirth: "Tanggal Lahir",
  gender: "Jenis Kelamin",
  medicalRecordNumber: "No. Rekam Medis",
  code: "Kode",
  description: "Deskripsi",
  price: "Harga",
  unit: "Satuan",
  category: "Kategori",
  isActive: "Aktif",
  referenceRange: "Nilai Rujukan",
  testCategoryId: "Kategori Tes",
  insuranceId: "Asuransi",
  insuranceType: "Tipe Asuransi",
  paymentMethod: "Metode Bayar",
  _settingKey: "Kunci Setting",
  value: "Nilai",
};

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

// ─── Value Formatting ─────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    if (UUID_REGEX.test(value)) return value.slice(0, 8) + "…";
    if (ISO_DATE_REGEX.test(value)) {
      const d = new Date(value);
      return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return value;
  }
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return value.toLocaleString("id-ID");
  return JSON.stringify(value);
}

// ─── JsonDiff Component ───────────────────────────────────────────────────────

function JsonDiff({
  oldValues,
  newValues,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  const [showAll, setShowAll] = useState(false);

  const allKeys = Array.from(
    new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ])
  );

  const changedKeys = allKeys.filter(
    (key) => JSON.stringify(oldValues?.[key]) !== JSON.stringify(newValues?.[key])
  );

  const unchangedCount = allKeys.length - changedKeys.length;
  const displayKeys = showAll ? allKeys : changedKeys;

  if (allKeys.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">Tidak ada data perubahan</p>
    );
  }

  if (changedKeys.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">Tidak ada field yang berubah</p>
    );
  }

  return (
    <div className="text-xs">
      {/* Summary */}
      <div className="mb-2 flex items-center gap-3">
        <span className="text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-amber-600 dark:text-amber-400">{changedKeys.length}</span>
          {" "}field berubah dari {allKeys.length} total
        </span>
        {unchangedCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-brand hover:underline transition-colors"
          >
            {showAll ? "Sembunyikan yang tidak berubah" : `Tampilkan semua (${allKeys.length})`}
          </button>
        )}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-2 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-1">
        <span>Field</span>
        <span>Nilai Lama</span>
        <span>Nilai Baru</span>
      </div>

      {/* Rows */}
      <div className="grid gap-0.5">
        {displayKeys.map((key) => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
          return (
            <div
              key={key}
              className={`grid grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-2 rounded px-2 py-1 ${
                changed
                  ? "bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-400"
                  : "opacity-50"
              }`}
            >
              <span
                className="font-medium text-slate-700 dark:text-slate-300 truncate"
                title={key}
              >
                {getFieldLabel(key)}
              </span>
              <span
                className="text-red-600 dark:text-red-400 truncate"
                title={oldVal !== undefined && oldVal !== null ? String(oldVal) : ""}
              >
                {formatFieldValue(oldVal)}
              </span>
              <span
                className="text-emerald-600 dark:text-emerald-400 truncate"
                title={newVal !== undefined && newVal !== null ? String(newVal) : ""}
              >
                {formatFieldValue(newVal)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${color}`}>
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] rounded-2xl bg-slate-200 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}

// ─── Pagination Helper ────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>(INITIAL_FILTERS);
  const [exporting, setExporting] = useState(false);

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ─── User options for filter dropdown ───────────────────────────────────────
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);

  // ─── AT-FN-06: Dynamic action options ───────────────────────────────────────
  const [actionOptions, setActionOptions] = useState<string[]>(FALLBACK_ACTION_OPTIONS);

  // ─── Debounced Entity ID (AT-UI-06) ─────────────────────────────────────────
  const [entityIdInput, setEntityIdInput] = useState("");
  const entityIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── AT-FN-07: Auto-refresh polling ─────────────────────────────────────────
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── AT-FN-01: Server-side Sorting ──────────────────────────────────────────
  const [sortField, setSortField] = useState<AuditSortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: AuditSortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(1); // Reset to page 1 on sort change
  };

  // ─── Fetch Logs (AT-FN-01: includes sortField/sortDir) ─────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAuditLogs({
        page,
        limit: 20,
        entityName: filters.entityName || undefined,
        entityId: filters.entityId || undefined,
        userId: filters.userId || undefined,
        action: filters.action || undefined,
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
        sortField,
        sortDir,
      });

      // Defensive extraction
      const envelope = (res as unknown as { data?: unknown })?.data ?? res;
      let data: AuditLog[] = [];
      let totalCount = 0;
      let pages = 1;

      if (envelope && typeof envelope === "object") {
        const env = envelope as Record<string, unknown>;
        if (Array.isArray(env.data)) {
          data = env.data as AuditLog[];
        } else if (Array.isArray(envelope)) {
          data = envelope as unknown as AuditLog[];
        }
        totalCount = (env.total as number) || 0;
        pages = (env.totalPages as number) || 1;
      }

      setLogs(data);
      setTotal(totalCount);
      setTotalPages(pages);
    } catch {
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filters, sortField, sortDir]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // ─── Fetch Stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiClient.getAuditStats();
      const envelope = (res as unknown as { data?: unknown })?.data ?? res;
      if (envelope && typeof envelope === "object") {
        setStats(envelope as AuditStats);
      }
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── AT-FN-06: Load dynamic action options ─────────────────────────────────
  useEffect(() => {
    async function loadActions() {
      try {
        const res = await apiClient.getAuditActions();
        const envelope = (res as unknown as { data?: unknown })?.data ?? res;
        if (Array.isArray(envelope) && envelope.length > 0) {
          setActionOptions(envelope as string[]);
        }
      } catch {
        // Keep fallback options
      }
    }
    loadActions();
  }, []);

  // ─── Load user options for filter dropdown ──────────────────────────────────
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await apiClient.getUsers({ limit: 200 });
        const envelope = (res as unknown as { data?: unknown })?.data ?? res;
        if (envelope && typeof envelope === "object") {
          const env = envelope as Record<string, unknown>;
          if (Array.isArray(env.data)) {
            setUserOptions(
              (
                env.data as Array<{
                  id: string;
                  name?: string | null;
                  email: string;
                }>
              ).map((u) => ({
                id: u.id,
                name: u.name ?? null,
                email: u.email,
              }))
            );
          }
        }
      } catch {
        // Silently fail
      }
    }
    loadUsers();
  }, []);

  // ─── AT-FN-07: Auto-refresh interval management ────────────────────────────
  useEffect(() => {
    // Clear existing interval
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    // Set new interval if enabled
    if (autoRefreshInterval > 0) {
      autoRefreshRef.current = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, autoRefreshInterval);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefreshInterval, fetchLogs, fetchStats]);

  // ─── Filter handlers ────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Debounced Entity ID input (AT-UI-06)
  const handleEntityIdChange = (value: string) => {
    setEntityIdInput(value);
    if (entityIdTimerRef.current) clearTimeout(entityIdTimerRef.current);
    entityIdTimerRef.current = setTimeout(() => {
      handleFilterChange("entityId", value);
    }, 300);
  };

  // Reset all filters (AT-UI-04)
  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setEntityIdInput("");
    setPage(1);
  };

  // Refresh (AT-UI-07)
  const handleRefresh = () => {
    fetchLogs();
    fetchStats();
  };

  // Export CSV (AT-UI-02 + AT-FN-04)
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await apiClient.exportAuditCsv({
        entityName: filters.entityName || undefined,
        entityId: filters.entityId || undefined,
        action: filters.action || undefined,
        userId: filters.userId || undefined,
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
        sortField,
        sortDir,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Export failed silently
    } finally {
      setExporting(false);
    }
  };

  // ─── AT-FN-02+03: User display from backend data ───────────────────────────
  function getUserDisplay(log: AuditLog): string {
    if (log.userId === SYSTEM_USER_ID) return "SYSTEM";
    if (log.userName) return log.userName;
    if (log.userEmail) return log.userEmail;
    return log.userId.slice(0, 8) + "…";
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <Shield className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Audit Trail
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Riwayat perubahan data sistem — hanya untuk ADMIN, SUPER_ADMIN &
                OWNER.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* AT-FN-07: Auto-refresh selector */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-2 py-1">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={autoRefreshInterval}
                onChange={(e) =>
                  setAutoRefreshInterval(Number(e.target.value))
                }
                className="bg-transparent text-xs font-medium text-muted-foreground outline-none cursor-pointer"
                title="Auto-refresh interval"
              >
                {REFRESH_INTERVALS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh data"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:border-brand/50 hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            {/* Export CSV button */}
            <button
              onClick={handleExportCsv}
              disabled={exporting || total === 0}
              title="Export ke CSV"
              className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all hover:border-brand/50 hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download
                className={`h-3.5 w-3.5 ${exporting ? "animate-pulse" : ""}`}
              />
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <StatsCardsSkeleton />
        ) : stats ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="Total Hari Ini"
              value={stats.totalToday}
              icon={TrendingUp}
              color="text-slate-700 dark:text-slate-300"
            />
            <StatsCard
              label="Create"
              value={stats.createCount}
              icon={Plus}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatsCard
              label="Update"
              value={stats.updateCount}
              icon={PenLine}
              color="text-blue-600 dark:text-blue-400"
            />
            <StatsCard
              label="Delete"
              value={stats.deleteCount}
              icon={Trash2}
              color="text-red-600 dark:text-red-400"
            />
          </div>
        ) : null}

        {/* Filters */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {/* Entity Filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Entitas
              </label>
              <select
                value={filters.entityName}
                onChange={(e) =>
                  handleFilterChange("entityName", e.target.value)
                }
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              >
                <option value="">Semua Entitas</option>
                {ENTITY_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter — AT-FN-06: Dynamic action options */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Aksi
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              >
                <option value="">Semua Aksi</option>
                {actionOptions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* User Filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                User
              </label>
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              >
                <option value="">Semua User</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              />
            </div>

            {/* Entity ID Search — Debounced (AT-UI-06) */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                ID Entitas
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ID..."
                  value={entityIdInput}
                  onChange={(e) => handleEntityIdChange(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          {/* Reset Filter Button (AT-UI-04) */}
          {hasActiveFilters && (
            <div className="mt-3 flex items-center">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-3 w-3" />
                Reset semua filter
              </button>
            </div>
          )}
        </div>

        {/* Total count + auto-refresh indicator */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {total.toLocaleString("id-ID")}
            </span>{" "}
            log
          </p>
          {autoRefreshInterval > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Auto-refresh {autoRefreshInterval / 1000}s
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16">
            <Shield className="h-12 w-12 text-slate-300 dark:text-slate-700" />
            <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              Tidak ada log audit ditemukan
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-600">
              Coba ubah filter atau rentang tanggal
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
                  <th className="w-8 px-3 py-3"></th>
                  <th
                    className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                    onClick={() => handleSort("timestamp")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Tanggal/Waktu
                      {sortField === "timestamp" ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-brand" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-brand" />
                        )
                      ) : (
                        <ChevronDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                    User
                  </th>
                  <th
                    className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                    onClick={() => handleSort("action")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Aksi
                      {sortField === "action" ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-brand" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-brand" />
                        )
                      ) : (
                        <ChevronDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                  <th
                    className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                    onClick={() => handleSort("entityName")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Entitas
                      {sortField === "entityName" ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-brand" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-brand" />
                        )
                      ) : (
                        <ChevronDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                    ID Entitas
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                    Ringkasan
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  const allFieldKeys = Array.from(new Set([
                    ...Object.keys(log.oldValues || {}),
                    ...Object.keys(log.newValues || {}),
                  ]));
                  const changeCount = allFieldKeys.filter(
                    (k) => JSON.stringify((log.oldValues as Record<string, unknown>)?.[k]) !== JSON.stringify((log.newValues as Record<string, unknown>)?.[k])
                  ).length;

                  return (
                    <tr key={log.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div
                          className={`border-b border-border transition-colors ${isExpanded ? "bg-slate-50 dark:bg-slate-900/30" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50"}`}
                        >
                          {/* Main row */}
                          <div
                            className="grid cursor-pointer select-none"
                            style={{
                              gridTemplateColumns:
                                "2rem 1fr 1fr 6rem 7rem 1fr 8rem",
                            }}
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : log.id)
                            }
                          >
                            <div className="flex items-center justify-center px-3 py-3">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate">
                              {formatTimestamp(log.timestamp)}
                            </div>
                            {/* AT-FN-02+03: User name from backend */}
                            <div className="px-4 py-3 truncate text-xs">
                              {log.userId === SYSTEM_USER_ID ? (
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  SYSTEM
                                </span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                  {getUserDisplay(log)}
                                </span>
                              )}
                            </div>
                            <div className="px-4 py-3">
                              <ActionBadge action={log.action} />
                            </div>
                            <div className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate">
                              {log.entityName}
                            </div>
                            <div className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate font-mono text-xs">
                              {log.entityId.slice(0, 12)}…
                            </div>
                            <div className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                              {changeCount} perubahan
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="border-t border-border bg-white px-6 py-4 dark:bg-slate-950">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Detail Perubahan
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-400">
                                    User: {getUserDisplay(log)} (
                                    {log.userId.slice(0, 8)}…)
                                  </span>
                                  {/* AT-FN-05: Deep-link to log */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/dashboard/audit-trail?logId=${log.id}`
                                      );
                                    }}
                                    title="Copy link ke log ini"
                                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Copy Link
                                  </button>
                                </div>
                              </div>
                              <JsonDiff
                                oldValues={log.oldValues}
                                newValues={log.newValues}
                              />
                              {log.ipAddress && (
                                <p className="mt-3 text-xs text-slate-400">
                                  IP Address:{" "}
                                  <span className="font-mono">
                                    {log.ipAddress}
                                  </span>
                                </p>
                              )}
                              <p className="mt-1 text-xs text-slate-400">
                                Log ID:{" "}
                                <span className="font-mono">{log.id}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination with page numbers (AT-UI-05) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-600">
              Halaman {page} dari {totalPages} (
              {total.toLocaleString("id-ID")} log)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {getPageNumbers(page, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span
                    key={`dots-${idx}`}
                    className="flex h-8 w-8 items-center justify-center text-xs text-slate-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      page === p
                        ? "bg-brand text-white shadow-sm"
                        : "border border-border text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
