"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { DeltaCheckBadge } from "@/components/laboratory/delta-check-badge";
import { PriorityBadge } from "@/components/laboratory/priority-badge";

/* ─── Types ─── */

type RerunReason = "QC_FAILURE" | "SPECIMEN_ISSUE" | "EQUIPMENT_ERROR" | "OPERATOR_ERROR" | "OTHER";

interface TestInfo {
  code: string;
  name: string;
  unit: string | null;
}

interface OrderDetailItem {
  id: string;
  testId: string;
  status: string;
  resultValue: string | null;
  flag: string | null;
  comment: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectedAt: string | null;
  rerunCount: number;
  percentageChange?: number | null;
  test: TestInfo;
}

interface PatientInfo {
  name: string;
  mrn: string;
  gender: string;
  dateOfBirth: string;
}

interface VerificationOrder {
  id: string;
  orderNumber: string;
  status: string;
  priority: string | null;
  createdAt: string;
  hasCritical?: boolean;
  patient: PatientInfo;
  orderDetails: OrderDetailItem[];
}

/* ─── Constants ─── */

const RERUN_REASONS: { value: RerunReason; label: string }[] = [
  { value: "QC_FAILURE", label: "Kegagalan QC" },
  { value: "SPECIMEN_ISSUE", label: "Masalah Spesimen" },
  { value: "EQUIPMENT_ERROR", label: "Error Peralatan" },
  { value: "OPERATOR_ERROR", label: "Error Operator" },
  { value: "OTHER", label: "Lainnya" },
];

/* ─── Flag Styling ─── */

const FLAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Normal" },
  LOW: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Low" },
  HIGH: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "High" },
  CRITICAL: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Critical" },
};

/* ─── Detail Status Styling ─── */

const DETAIL_STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-gray-100 dark:bg-gray-800/50", text: "text-gray-600 dark:text-gray-400", label: "Belum Verifikasi" },
  VERIFIED: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Terverifikasi" },
  REJECTED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Ditolak" },
  RERUN: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Rerun" },
};

/* ─── Confirmation Dialog ─── */

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmClassName,
  loading,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const focusTrapRef = useFocusTrap(open, onCancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={focusTrapRef} role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {children}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50",
              confirmClassName
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Flag Badge ─── */

function FlagBadge({ flag }: { flag?: string | null }) {
  if (!flag) return null;
  const style = FLAG_STYLES[flag] ?? FLAG_STYLES.NORMAL;
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

/* ─── Detail Status Badge ─── */

function DetailStatusBadge({ status }: { status: string }) {
  const style = DETAIL_STATUS_STYLES[status] ?? DETAIL_STATUS_STYLES.PENDING;
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold", style.bg, style.text)}>
      {style.label}
    </span>
  );
}

/* ─── Per-Parameter Verification Row ─── */

function ParameterVerificationRow({
  detail,
  onVerify,
  onReject,
  onRerun,
}: {
  detail: OrderDetailItem;
  onVerify: (detailId: string, notes: string) => Promise<void>;
  onReject: (detailId: string, reason: string, notes: string) => Promise<void>;
  onRerun: (detailId: string, rerunReason: RerunReason, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rerunReason, setRerunReason] = useState<RerunReason>("QC_FAILURE");
  const [rerunNotes, setRerunNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const isVerified = detail.verifiedAt !== null;
  const isRejected = detail.rejectedAt !== null;
  const isPending = !isVerified && !isRejected;

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      await onVerify(detail.id, notes);
      setNotes("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await onReject(detail.id, rejectionReason, notes);
      setShowRejectDialog(false);
      setRejectionReason("");
      setNotes("");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRerunConfirm = async () => {
    setActionLoading(true);
    try {
      await onRerun(detail.id, rerunReason, rerunNotes);
      setShowRerunDialog(false);
      setRerunNotes("");
    } finally {
      setActionLoading(false);
    }
  };

  const detailStatus = isVerified ? "VERIFIED" : isRejected ? "REJECTED" : detail.rerunCount > 0 ? "RERUN" : "PENDING";

  return (
    <>
      <tr className={cn(
        "border-b border-border last:border-0 transition-colors",
        detail.flag === "CRITICAL" && "bg-red-50/50 dark:bg-red-950/10"
      )}>
        {/* Test Info */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">
              {detail.test?.code ?? "-"}
            </span>
            <span className="text-sm text-foreground">{detail.test?.name ?? "-"}</span>
          </div>
        </td>

        {/* Result Value */}
        <td className="px-3 py-3">
          <span className="font-semibold text-foreground text-sm">
            {detail.resultValue ?? "-"}
          </span>
          {detail.test?.unit && (
            <span className="ml-1 text-xs text-muted-foreground">{detail.test.unit}</span>
          )}
        </td>

        {/* Flag */}
        <td className="px-3 py-3">
          <FlagBadge flag={detail.flag} />
        </td>

        {/* Delta Check */}
        <td className="px-3 py-3">
          <DeltaCheckBadge percentageChange={detail.percentageChange} />
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <DetailStatusBadge status={detailStatus} />
            {detail.rerunCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                (rerun: {detail.rerunCount}x)
              </span>
            )}
          </div>
        </td>

        {/* Verification Notes */}
        <td className="px-3 py-3">
          {isPending && (
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan verifikasi..."
              className="h-7 w-full max-w-[180px] rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3">
          {isPending && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                title="Verifikasi"
              >
                <CheckCircle2 className="h-3 w-3" />
                Verify
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                title="Tolak"
              >
                <XCircle className="h-3 w-3" />
                Reject
              </button>
              <button
                onClick={() => setShowRerunDialog(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                title="Rerun"
              >
                <RotateCcw className="h-3 w-3" />
                Rerun
              </button>
            </div>
          )}
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              Rejected
            </span>
          )}
        </td>
      </tr>

      {/* Reject Dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        title="Tolak Parameter"
        description="Berikan alasan penolakan untuk parameter ini."
        confirmLabel="Tolak"
        confirmClassName="bg-red-600 hover:bg-red-700"
        loading={actionLoading}
        onConfirm={handleRejectConfirm}
        onCancel={() => { setShowRejectDialog(false); setRejectionReason(""); }}
      >
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Alasan penolakan..."
          rows={3}
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
        />
      </ConfirmDialog>

      {/* Rerun Dialog */}
      <ConfirmDialog
        open={showRerunDialog}
        title="Permintaan Rerun"
        description="Pilih alasan rerun untuk parameter ini."
        confirmLabel="Kirim Rerun"
        confirmClassName="bg-blue-600 hover:bg-blue-700"
        loading={actionLoading}
        onConfirm={handleRerunConfirm}
        onCancel={() => { setShowRerunDialog(false); setRerunNotes(""); }}
      >
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Alasan Rerun
            </label>
            <select
              value={rerunReason}
              onChange={(e) => setRerunReason(e.target.value as RerunReason)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {RERUN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={rerunNotes}
            onChange={(e) => setRerunNotes(e.target.value)}
            placeholder="Catatan tambahan (opsional)..."
            rows={2}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}

/* ─── Order Verification Card ─── */

function VerificationCard({
  order,
  onVerifyDetail,
  onRejectDetail,
  onRerunDetail,
  onRefresh,
}: {
  order: VerificationOrder;
  onVerifyDetail: (detailId: string, notes: string) => Promise<void>;
  onRejectDetail: (detailId: string, reason: string, notes: string) => Promise<void>;
  onRerunDetail: (detailId: string, rerunReason: RerunReason, notes: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const criticalCount = (order.orderDetails ?? []).filter((d) => d.flag === "CRITICAL").length;
  const verifiedCount = (order.orderDetails ?? []).filter((d) => d.verifiedAt !== null).length;
  const totalCount = (order.orderDetails ?? []).length;

  return (
    <div className={cn(
      "rounded-2xl border bg-card p-5 space-y-4",
      order.hasCritical ? "border-red-200 dark:border-red-800" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">
              {order.orderNumber}
            </span>
            <PriorityBadge priority={order.priority} />
          </div>
          <h3 className="mt-1 font-bold text-foreground">{order.patient?.name ?? "-"}</h3>
          <span className="text-xs text-muted-foreground">
            MRN: {order.patient?.mrn ?? "-"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" />
              {criticalCount} Critical
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {verifiedCount}/{totalCount} verified
          </span>
        </div>
      </div>

      {/* Per-Parameter Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Test</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hasil</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Flag</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Delta</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Catatan</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {(order.orderDetails ?? []).map((detail) => (
              <ParameterVerificationRow
                key={detail.id}
                detail={detail}
                onVerify={onVerifyDetail}
                onReject={onRejectDetail}
                onRerun={onRerunDetail}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {verifiedCount}/{totalCount} parameter terverifikasi
          </span>
        </div>
        {verifiedCount === totalCount && totalCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Semua Terverifikasi
          </span>
        )}
      </div>
    </div>
  );
}


/* ─── Main Verification Page ─── */

export default function PerParameterVerificationPage() {
  const [orders, setOrders] = useState<VerificationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders that are IN_ANALYSIS status (ready for parameter-level verification)
      const response = await apiClient.getOrders({ status: "IN_ANALYSIS" });
      const raw = response as unknown as Record<string, unknown>;
      let items: VerificationOrder[] = [];

      if (Array.isArray(raw)) {
        items = raw as VerificationOrder[];
      } else if (raw && typeof raw === "object") {
        if (Array.isArray(raw.data)) {
          items = raw.data as VerificationOrder[];
        } else if (raw.data && typeof raw.data === "object" && Array.isArray((raw.data as Record<string, unknown>).data)) {
          items = (raw.data as Record<string, unknown>).data as VerificationOrder[];
        }
      }

      // Compute hasCritical indicator per order
      items = items.map((order) => ({
        ...order,
        hasCritical: (order.orderDetails ?? []).some((d) => d.flag === "CRITICAL"),
      }));

      // Sort: CRITICAL-flagged orders above non-critical (Requirement 17.2)
      items.sort((a, b) => {
        // Critical orders first
        if (a.hasCritical && !b.hasCritical) return -1;
        if (!a.hasCritical && b.hasCritical) return 1;
        // Then by priority (CITO > URGENT > ROUTINE)
        const priorityWeight = (p: string | null) => {
          if (p === "CITO") return 3;
          if (p === "URGENT") return 2;
          return 1;
        };
        const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (pDiff !== 0) return pDiff;
        // Then by creation date (oldest first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      setOrders(items);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Gagal memuat data verifikasi";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVerificationQueue();
  }, [fetchVerificationQueue]);

  const handleVerifyDetail = async (detailId: string, notes: string) => {
    await apiClient.verifyOrderDetail(detailId, { verificationNotes: notes || undefined });
    fetchVerificationQueue();
  };

  const handleRejectDetail = async (detailId: string, reason: string, notes: string) => {
    await apiClient.rejectOrderDetail(detailId, { reason, notes: notes || undefined });
    fetchVerificationQueue();
  };

  const handleRerunDetail = async (detailId: string, rerunReason: RerunReason, notes: string) => {
    await apiClient.rerunOrderDetail(detailId, { rerunReason, notes: notes || undefined });
    fetchVerificationQueue();
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "ANALIS"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Verifikasi Per-Parameter</h2>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Memuat data..."
                  : `${orders.length} order menunggu verifikasi parameter`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-border py-8 px-6">
              <div className="space-y-4">
                <div className="mx-auto h-5 w-48 animate-pulse rounded bg-muted" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-xl border border-border p-4">
                      <div className="h-5 w-5 animate-pulse rounded bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-64 animate-pulse rounded bg-muted" />
                      </div>
                      <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-red-200 dark:border-red-800 py-16 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchVerificationQueue}
                className="mt-4 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 px-4 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ClipboardCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>
              <h3 className="text-base font-bold text-foreground">
                Antrean Verifikasi Kosong
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                Tidak ada order yang menunggu verifikasi parameter saat ini.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <VerificationCard
                key={order.id}
                order={order}
                onVerifyDetail={handleVerifyDetail}
                onRejectDetail={handleRejectDetail}
                onRerunDetail={handleRerunDetail}
                onRefresh={fetchVerificationQueue}
              />
            ))
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
