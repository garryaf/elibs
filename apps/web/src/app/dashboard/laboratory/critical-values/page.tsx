"use client";

import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Search,
  RotateCcw,
  Wifi,
  WifiOff,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  CriticalValueBadge,
  type CriticalValueStatus,
} from "@/components/laboratory/critical-value-badge";
import {
  useUnacknowledgedCriticalValues,
  useCriticalValues,
  useAcknowledgeCriticalValue,
  type CriticalValueLog,
} from "@/services/critical-values";
import {
  useCriticalValueSocket,
  type CriticalValueAlert,
} from "@/hooks/use-critical-value-socket";

// ---------- Constants ----------

type FilterTab = "ALL" | "PENDING" | "NOTIFIED" | "ESCALATED" | "ACKNOWLEDGED";

const FILTER_TABS: {
  id: FilterTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "ALL", label: "Semua", icon: Clock },
  { id: "PENDING", label: "Pending", icon: AlertTriangle },
  { id: "NOTIFIED", label: "Terkirim", icon: Bell },
  { id: "ESCALATED", label: "Eskalasi", icon: AlertTriangle },
  { id: "ACKNOWLEDGED", label: "Dikonfirmasi", icon: CheckCircle2 },
];

const PAGE_SIZE = 10;

// ---------- Helper ----------

function mapCriticalValueLog(item: any): CriticalValueLog {
  return {
    id: item.id,
    orderId: item.orderId,
    orderDetailId: item.orderDetailId,
    testId: item.testId,
    patientId: item.patientId,
    resultValue: item.resultValue,
    flaggedAt: item.flaggedAt,
    notificationStatus: item.notificationStatus,
    notifiedAt: item.notifiedAt,
    acknowledgedAt: item.acknowledgedAt,
    acknowledgedBy: item.acknowledgedBy,
    acknowledgmentNotes: item.acknowledgmentNotes,
    escalatedAt: item.escalatedAt,
    escalationMethod: item.escalationMethod,
    clinicianId: item.clinicianId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    patient: item.patient,
    test: item.test,
    order: item.order,
  };
}

// ---------- Component ----------

export default function CriticalValueDashboardPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [acknowledgeId, setAcknowledgeId] = useState<string | null>(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState("");
  const [realtimeAlerts, setRealtimeAlerts] = useState<CriticalValueAlert[]>(
    []
  );

  // ─── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: queryData,
    isLoading,
    error: queryError,
    refetch,
  } = useCriticalValues({
    page,
    limit: PAGE_SIZE,
    status: activeTab !== "ALL" ? activeTab : undefined,
  });

  const acknowledgeMutation = useAcknowledgeCriticalValue();

  // ─── WebSocket real-time updates ────────────────────────────────────────────
  const handleNewAlert = useCallback((alert: CriticalValueAlert) => {
    setRealtimeAlerts((prev) => {
      // Avoid duplicate by id
      if (prev.some((a) => a.id === alert.id)) return prev;
      return [alert, ...prev];
    });
  }, []);

  const handleEscalated = useCallback((alert: CriticalValueAlert) => {
    setRealtimeAlerts((prev) => {
      const existing = prev.findIndex((a) => a.id === alert.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...alert };
        return updated;
      }
      return [alert, ...prev];
    });
    // Also refetch to update the main list
    refetch();
  }, [refetch]);

  const { isConnected } = useCriticalValueSocket({
    onNewAlert: handleNewAlert,
    onEscalated: handleEscalated,
    enabled: true,
  });

  // ─── Parse response data ────────────────────────────────────────────────────
  const { alerts, totalItems } = useMemo(() => {
    const envelope = queryData as unknown;
    let items: CriticalValueLog[] = [];
    let total = 0;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      const inner = (env.data ?? env) as Record<string, unknown>;

      if (Array.isArray(inner)) {
        items = (inner as unknown[]).map(mapCriticalValueLog);
        total = items.length;
      } else if (inner && typeof inner === "object") {
        const dataArr = (inner as Record<string, unknown>).data;
        if (Array.isArray(dataArr)) {
          items = dataArr.map(mapCriticalValueLog);
          const meta = (inner as Record<string, unknown>).meta as
            | Record<string, unknown>
            | undefined;
          total = Number(meta?.total) || items.length;
        }
      }
    }

    return { alerts: items, totalItems: total };
  }, [queryData]);

  // ─── Client-side search filter ──────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    if (!search.trim()) return alerts;
    const q = search.toLowerCase().trim();
    return alerts.filter(
      (a) =>
        a.resultValue.toLowerCase().includes(q) ||
        a.patient?.name?.toLowerCase().includes(q) ||
        a.patient?.mrn?.toLowerCase().includes(q) ||
        a.test?.name?.toLowerCase().includes(q) ||
        a.test?.code?.toLowerCase().includes(q) ||
        a.order?.orderNumber?.toLowerCase().includes(q)
    );
  }, [alerts, search]);

  // ─── Acknowledge handler ────────────────────────────────────────────────────
  const handleAcknowledge = async () => {
    if (!acknowledgeId) return;
    try {
      await acknowledgeMutation.mutateAsync({
        id: acknowledgeId,
        data: { notes: acknowledgeNotes || undefined },
      });
      setAcknowledgeId(null);
      setAcknowledgeNotes("");
      // Remove from realtime alerts if present
      setRealtimeAlerts((prev) => prev.filter((a) => a.id !== acknowledgeId));
    } catch {
      // Error handled by mutation state
    }
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const error = queryError
    ? "Gagal memuat data critical values. Silakan coba lagi."
    : null;

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "DOKTER", "ANALIS"]}>
      <div className="space-y-6">
        {/* Header with connection status */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Critical Value Alerts
            </h2>
            <p className="text-sm text-muted-foreground">
              Nilai kritis yang membutuhkan tindakan segera
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected() ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-muted bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Real-time new alerts banner */}
        {realtimeAlerts.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
                <span className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {realtimeAlerts.length} alert baru diterima secara real-time
                </span>
              </div>
              <button
                onClick={() => {
                  setRealtimeAlerts([]);
                  refetch();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none",
                    isActive
                      ? "bg-brand text-white shadow-sm"
                      : "text-muted-foreground hover:bg-brand/10 hover:text-brand"
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari pasien, tes, order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
              aria-label="Search critical values"
            />
          </div>
        </div>

        {/* Alerts Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-red-50/50 dark:bg-red-900/10">
                <th className="px-4 py-3 font-semibold text-foreground">
                  Pasien
                </th>
                <th className="px-4 py-3 font-semibold text-foreground">
                  Tes
                </th>
                <th className="px-4 py-3 font-semibold text-foreground hidden sm:table-cell">
                  Hasil
                </th>
                <th className="px-4 py-3 font-semibold text-foreground hidden md:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-foreground hidden lg:table-cell">
                  Waktu
                </th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      {/* Skeleton loading */}
                      <div className="w-full max-w-md space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-12 w-full animate-pulse rounded-lg bg-muted"
                          />
                        ))}
                      </div>
                      <span className="text-sm">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div
                      className="flex flex-col items-center gap-3"
                      role="alert"
                    >
                      <AlertTriangle className="h-10 w-10 text-red-400 dark:text-red-500" />
                      <p className="font-medium text-red-700 dark:text-red-300">
                        {error}
                      </p>
                      <button
                        onClick={() => refetch()}
                        className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-muted-foreground"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">
                        {search || activeTab !== "ALL"
                          ? "Tidak Ada Hasil"
                          : "Tidak Ada Alert Aktif"}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                        {search || activeTab !== "ALL"
                          ? "Tidak ada critical value yang sesuai dengan filter."
                          : "Semua critical values telah dikonfirmasi. Sistem akan memberitahu saat ada nilai kritis baru."}
                      </p>
                      {(search || activeTab !== "ALL") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            handleTabChange("ALL");
                          }}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-sm"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <CriticalValueRow
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={() => {
                      setAcknowledgeId(alert.id);
                      setAcknowledgeNotes("");
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalItems > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan{" "}
              {filteredAlerts.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems} alert
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40 disabled:hover:bg-card"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[80px] text-center text-sm font-medium text-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40 disabled:hover:bg-card"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Acknowledge Modal */}
        {acknowledgeId && (
          <AcknowledgeModal
            isOpen={!!acknowledgeId}
            notes={acknowledgeNotes}
            onNotesChange={setAcknowledgeNotes}
            onConfirm={handleAcknowledge}
            onCancel={() => {
              setAcknowledgeId(null);
              setAcknowledgeNotes("");
            }}
            isLoading={acknowledgeMutation.isPending}
            error={
              acknowledgeMutation.isError
                ? "Gagal mengkonfirmasi. Silakan coba lagi."
                : undefined
            }
          />
        )}
      </div>
    </RoleGuard>
  );
}

// ---------- CriticalValueRow Sub-component ----------

interface CriticalValueRowProps {
  alert: CriticalValueLog;
  onAcknowledge: () => void;
}

function CriticalValueRow({ alert, onAcknowledge }: CriticalValueRowProps) {
  const isActionable =
    alert.notificationStatus === "PENDING" ||
    alert.notificationStatus === "NOTIFIED" ||
    alert.notificationStatus === "ESCALATED";

  return (
    <tr
      className={cn(
        "border-b border-border transition-colors",
        isActionable
          ? "bg-red-50/30 hover:bg-red-50/60 dark:bg-red-900/5 dark:hover:bg-red-900/10"
          : "hover:bg-muted/50"
      )}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">
            {alert.patient?.name || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {alert.patient?.mrn || ""}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-foreground">
            {alert.test?.name || "—"}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {alert.test?.code || ""}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-800 dark:bg-red-900/30 dark:text-red-300">
          {alert.resultValue}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <CriticalValueBadge
          status={alert.notificationStatus as CriticalValueStatus}
        />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
        <div className="text-xs">
          <p>
            {new Date(alert.flaggedAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p>
            {new Date(alert.flaggedAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {isActionable ? (
          <button
            onClick={onAcknowledge}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Konfirmasi
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {alert.acknowledgedAt
              ? new Date(alert.acknowledgedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

// ---------- AcknowledgeModal Sub-component ----------

interface AcknowledgeModalProps {
  isOpen: boolean;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}

function AcknowledgeModal({
  isOpen,
  notes,
  onNotesChange,
  onConfirm,
  onCancel,
  isLoading,
  error,
}: AcknowledgeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="acknowledge-title"
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="acknowledge-title"
          className="text-lg font-bold text-foreground"
        >
          Konfirmasi Critical Value
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan catatan untuk mengkonfirmasi bahwa Anda telah mengetahui dan
          mengambil tindakan atas nilai kritis ini.
        </p>

        <div className="mt-4">
          <label
            htmlFor="acknowledge-notes"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Catatan{" "}
            <span className="text-muted-foreground font-normal">
              (opsional)
            </span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea
              id="acknowledge-notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Tindakan yang diambil, catatan klinis..."
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background pl-9 pr-4 pt-2.5 pb-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {error && (
          <div
            className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300"
            role="alert"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Mengkonfirmasi...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Konfirmasi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
