"use client";

import { useState, useMemo } from "react";
import {
  Percent,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RotateCcw,
  Clock,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  usePendingDiscountApprovals,
  useCreateDiscountApproval,
  useDecideDiscountApproval,
  type DiscountApprovalRequest,
} from "@/services/discount-approvals";

// ─── Constants ───────────────────────────────────────────────────────────────

const APPROVER_ROLES = ["MANAGER", "OWNER", "ADMIN", "SUPER_ADMIN"];
const REQUESTER_ROLES = ["KASIR", "CS", "ADMIN", "MANAGER", "OWNER", "SUPER_ADMIN"];

// ─── Decision Dialog ─────────────────────────────────────────────────────────

function DecisionDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmClassName,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
  loading?: boolean;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}) {
  const [comment, setComment] = useState("");
  const focusTrapRef = useFocusTrap(open, onCancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Komentar
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tambahkan komentar (opsional)..."
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
          />
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(comment)}
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

// ─── Request Form ────────────────────────────────────────────────────────────

function DiscountRequestForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateDiscountApproval();
  const [form, setForm] = useState({
    orderId: "",
    discountPercent: "",
    discountAmount: "",
    discountReason: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        orderId: form.orderId,
        discountPercent: parseFloat(form.discountPercent),
        discountAmount: parseFloat(form.discountAmount),
        discountReason: form.discountReason,
      },
      {
        onSuccess: () => {
          setForm({ orderId: "", discountPercent: "", discountAmount: "", discountReason: "" });
          onClose();
        },
      }
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand/30 bg-card p-5"
    >
      <h4 className="text-sm font-semibold text-foreground">
        Pengajuan Diskon Baru
      </h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Order ID *
          </label>
          <input
            type="text"
            required
            value={form.orderId}
            onChange={(e) => setForm({ ...form, orderId: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            placeholder="UUID Order yang ingin diberikan diskon"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Persentase Diskon (%) *
          </label>
          <input
            type="number"
            required
            min="0.01"
            max="100"
            step="0.01"
            value={form.discountPercent}
            onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            placeholder="e.g. 10"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Jumlah Diskon (Rp) *
          </label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.discountAmount}
            onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            placeholder="e.g. 50000"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Alasan Diskon *
          </label>
          <textarea
            required
            value={form.discountReason}
            onChange={(e) => setForm({ ...form, discountReason: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 resize-none"
            placeholder="Jelaskan alasan pengajuan diskon..."
          />
        </div>
      </div>

      {createMutation.error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Gagal mengajukan diskon. Periksa data dan coba lagi.
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
          Ajukan Diskon
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

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    PENDING: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      icon: Clock,
    },
    APPROVED: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      icon: CheckCircle2,
    },
    REJECTED: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      icon: XCircle,
    },
  };

  const style = styles[status] ?? styles.PENDING;
  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        style.bg,
        style.text
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

// ─── Pending Approval Card ───────────────────────────────────────────────────

function PendingApprovalCard({
  request,
  onApprove,
  onReject,
}: {
  request: DiscountApprovalRequest;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, comment: string) => void;
}) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const decideMutation = useDecideDiscountApproval();

  const payload = request.payload;

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-brand" />
              <span className="font-semibold text-foreground">
                Diskon {payload.discountPercent}%
              </span>
              <StatusBadge status={request.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Order: <span className="font-mono">{payload.orderId.slice(0, 8)}...</span>
              {" • "}
              Jumlah: <span className="font-semibold">Rp {Number(payload.discountAmount).toLocaleString("id-ID")}</span>
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>Level {request.currentLevel}/{request.maxLevel}</p>
            <p>
              {new Date(request.createdAt).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Alasan:</p>
          <p className="text-sm text-foreground">{payload.discountReason}</p>
        </div>

        {/* Steps History */}
        {request.steps && request.steps.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Riwayat:</p>
            {request.steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <MessageSquare className="h-3 w-3" />
                <span>
                  Level {step.level} — {step.action}
                  {step.comment && `: "${step.comment}"`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {request.status === "PENDING" && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowRejectDialog(true)}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
            >
              <XCircle className="h-4 w-4" />
              Tolak
            </button>
            <button
              onClick={() => setShowApproveDialog(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              <CheckCircle2 className="h-4 w-4" />
              Setujui
            </button>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <DecisionDialog
        open={showApproveDialog}
        title="Setujui Diskon"
        description={`Apakah Anda yakin ingin menyetujui diskon ${payload.discountPercent}% (Rp ${Number(payload.discountAmount).toLocaleString("id-ID")}) untuk order ini?`}
        confirmLabel="Ya, Setujui"
        confirmClassName="bg-primary hover:bg-brand-dark"
        loading={decideMutation.isPending}
        onConfirm={(comment) => {
          onApprove(request.id, comment);
          setShowApproveDialog(false);
        }}
        onCancel={() => setShowApproveDialog(false)}
      />

      {/* Reject Dialog */}
      <DecisionDialog
        open={showRejectDialog}
        title="Tolak Diskon"
        description={`Berikan alasan penolakan diskon ${payload.discountPercent}%.`}
        confirmLabel="Tolak"
        confirmClassName="bg-red-600 hover:bg-red-700"
        loading={decideMutation.isPending}
        onConfirm={(comment) => {
          onReject(request.id, comment);
          setShowRejectDialog(false);
        }}
        onCancel={() => setShowRejectDialog(false)}
      />
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DiscountApprovalPage() {
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);

  const {
    data: pendingData,
    isLoading,
    error,
    refetch,
  } = usePendingDiscountApprovals();
  const decideMutation = useDecideDiscountApproval();

  // Extract pending items from API response (handles envelope)
  const pendingItems = useMemo(() => {
    if (!pendingData) return [];
    const raw = pendingData as unknown as Record<string, unknown>;
    if (Array.isArray(raw)) return raw as DiscountApprovalRequest[];
    if (raw && typeof raw === "object") {
      if (Array.isArray(raw.data)) return raw.data as DiscountApprovalRequest[];
      if (
        raw.data &&
        typeof raw.data === "object" &&
        Array.isArray((raw.data as Record<string, unknown>).data)
      ) {
        return (raw.data as Record<string, unknown>).data as DiscountApprovalRequest[];
      }
    }
    return [];
  }, [pendingData]);

  const canRequest = user && REQUESTER_ROLES.includes(user.role);
  const canApprove = user && APPROVER_ROLES.includes(user.role);

  const handleApprove = (id: string, comment: string) => {
    decideMutation.mutate({ id, decision: "APPROVE", comment });
  };

  const handleReject = (id: string, comment: string) => {
    decideMutation.mutate({ id, decision: "REJECT", comment, reason: comment });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <RoleGuard allowedRoles={[...APPROVER_ROLES, ...REQUESTER_ROLES]}>
        <div className="space-y-6">
          <div className="h-16 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </RoleGuard>
    );
  }

  // Error state
  if (error) {
    return (
      <RoleGuard allowedRoles={[...APPROVER_ROLES, ...REQUESTER_ROLES]}>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-3 font-medium text-red-700 dark:text-red-300">
            Gagal memuat data approval diskon.
          </p>
          <button
            onClick={() => refetch()}
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
    <RoleGuard allowedRoles={[...APPROVER_ROLES, ...REQUESTER_ROLES]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Persetujuan Diskon
              </h2>
              <p className="text-xs text-muted-foreground">
                {pendingItems.length > 0
                  ? `${pendingItems.length} pengajuan menunggu persetujuan`
                  : "Kelola pengajuan diskon"}
              </p>
            </div>
          </div>
          {canRequest && !showRequestForm && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-all"
            >
              <Plus className="h-4 w-4" />
              Ajukan Diskon
            </button>
          )}
        </div>

        {/* Request Form */}
        {showRequestForm && (
          <DiscountRequestForm onClose={() => setShowRequestForm(false)} />
        )}

        {/* Pending Queue */}
        {canApprove && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Antrean Persetujuan
            </h3>
            {pendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 px-4 text-center">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  Tidak Ada Pengajuan Pending
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Semua pengajuan diskon telah diproses. Tidak ada yang menunggu persetujuan saat ini.
                </p>
              </div>
            ) : (
              pendingItems.map((request) => (
                <PendingApprovalCard
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
