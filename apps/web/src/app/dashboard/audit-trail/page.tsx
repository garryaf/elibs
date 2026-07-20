"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Shield, ChevronDown, ChevronUp, ChevronRight, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  userId: string;
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
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
];

const ACTION_OPTIONS = ["CREATE", "UPDATE", "DELETE"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors[action] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
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

function JsonDiff({ oldValues, newValues }: { oldValues: Record<string, unknown> | null; newValues: Record<string, unknown> | null }) {
  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ]);

  if (allKeys.size === 0) {
    return <p className="text-xs text-slate-400 italic">Tidak ada data perubahan</p>;
  }

  return (
    <div className="grid gap-2 text-xs">
      <div className="grid grid-cols-3 gap-2 font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-1">
        <span>Field</span>
        <span>Nilai Lama</span>
        <span>Nilai Baru</span>
      </div>
      {Array.from(allKeys).map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
        return (
          <div
            key={key}
            className={`grid grid-cols-3 gap-2 rounded px-1 py-0.5 ${changed ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}
          >
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{key}</span>
            <span className="text-red-600 dark:text-red-400 truncate">
              {oldVal !== undefined ? JSON.stringify(oldVal) : "—"}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 truncate">
              {newVal !== undefined ? JSON.stringify(newVal) : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}


// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({
    entityName: "",
    action: "",
    dateFrom: "",
    dateTo: "",
    entityId: "",
  });

  // ─── Sorting ────────────────────────────────────────────────────────────────
  type AuditSortField = "timestamp" | "action" | "entityName";
  type SortDir = "asc" | "desc";
  const [sortField, setSortField] = useState<AuditSortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: AuditSortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedLogs = useMemo(() => {
    const sorted = [...logs];
    sorted.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortField) {
        case "timestamp":
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        case "action":
          aVal = a.action;
          bVal = b.action;
          break;
        case "entityName":
          aVal = a.entityName;
          bVal = b.entityName;
          break;
        default:
          return 0;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [logs, sortField, sortDir]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getAuditLogs({
        page,
        limit: 20,
        entityName: filters.entityName || undefined,
        action: filters.action || undefined,
        startDate: filters.dateFrom || undefined,
        endDate: filters.dateTo || undefined,
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
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced filter change resets page
  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "OWNER", "ADMIN"]}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
            <Shield className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Audit Trail
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Riwayat perubahan data sistem — hanya untuk ADMIN & SUPER_ADMIN.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Entity Filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Entitas
            </label>
            <select
              value={filters.entityName}
              onChange={(e) => handleFilterChange("entityName", e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
            >
              <option value="">Semua Entitas</option>
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
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
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
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

          {/* Entity ID Search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              ID Entitas
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID..."
                value={filters.entityId}
                onChange={(e) => handleFilterChange("entityId", e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-card pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Total count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total: <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span> log
        </p>
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
                    {sortField === "timestamp" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-brand" /> : <ChevronDown className="h-3 w-3 text-brand" />) : <ChevronDown className="h-3 w-3 opacity-30" />}
                  </span>
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  User ID
                </th>
                <th
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                  onClick={() => handleSort("action")}
                >
                  <span className="inline-flex items-center gap-1">
                    Aksi
                    {sortField === "action" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-brand" /> : <ChevronDown className="h-3 w-3 text-brand" />) : <ChevronDown className="h-3 w-3 opacity-30" />}
                  </span>
                </th>
                <th
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                  onClick={() => handleSort("entityName")}
                >
                  <span className="inline-flex items-center gap-1">
                    Entitas
                    {sortField === "entityName" ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-brand" /> : <ChevronDown className="h-3 w-3 text-brand" />) : <ChevronDown className="h-3 w-3 opacity-30" />}
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
              {sortedLogs.map((log) => {
                const isExpanded = expandedRow === log.id;
                const changeCount =
                  new Set([
                    ...Object.keys(log.oldValues || {}),
                    ...Object.keys(log.newValues || {}),
                  ]).size;

                return (
                  <tr key={log.id} className="group">
                    <td colSpan={7} className="p-0">
                      <div
                        className={`border-b border-border transition-colors ${isExpanded ? "bg-slate-50 dark:bg-slate-900/30" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20"}`}
                      >
                        {/* Main row */}
                        <div
                          className="grid cursor-pointer select-none"
                          style={{ gridTemplateColumns: "2rem 1fr 1fr 5rem 7rem 1fr 8rem" }}
                          onClick={() => setExpandedRow(isExpanded ? null : log.id)}
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
                          <div className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate font-mono text-xs">
                            {log.userId.slice(0, 8)}…
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
                            {changeCount} field{changeCount !== 1 ? "s" : ""}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-border bg-white px-6 py-4 dark:bg-slate-950">
                            <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Detail Perubahan
                            </div>
                            <JsonDiff oldValues={log.oldValues} newValues={log.newValues} />
                            {log.ipAddress && (
                              <p className="mt-3 text-xs text-slate-400">
                                IP Address: <span className="font-mono">{log.ipAddress}</span>
                              </p>
                            )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
