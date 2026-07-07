"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface TestInfo {
  code: string;
  name: string;
  unit: string;
}

interface OrderDetailItem {
  id: string;
  testId: string;
  status: string;
  resultValue: string | null;
  flag: string | null;
  comment: string | null;
  test: TestInfo;
}

interface PatientInfo {
  name: string;
  mrn: string;
  gender: string;
  dateOfBirth: string;
}

interface ApprovalOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  patient: PatientInfo;
  orderDetails: OrderDetailItem[];
}

/* ─── Flag Styling ─── */
const FLAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Normal" },
  LOW: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Low" },
  HIGH: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "High" },
  CRITICAL: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Critical" },
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
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

/* ─── Result Flag Badge ─── */
function FlagBadge({ flag }: { flag?: string | null }) {
  if (!flag) return null;
  const style = FLAG_STYLES[flag] ?? FLAG_STYLES.NORMAL;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
        style.bg,
        style.text
      )}
    >
      {style.label}
    </span>
  );
}

/* ─── Single Order Card ─── */
function ApprovalCard({
  order,
  onApprove,
  onReject,
}: {
  order: ApprovalOrder;
  onApprove: (orderId: string, interpretation: string) => Promise<void>;
  onReject: (orderId: string, reason: string) => Promise<void>;
}) {
  const [interpretation, setInterpretation] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const criticalCount = order.orderDetails.filter((d) => d.flag === "CRITICAL").length;
  const abnormalCount = order.orderDetails.filter(
    (d) => d.flag === "HIGH" || d.flag === "LOW"
  ).length;

  const handleApproveConfirm = async () => {
    setActionLoading(true);
    try {
      await onApprove(order.id, interpretation);
      setShowApproveDialog(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await onReject(order.id, rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason("");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-xs font-semibold text-primary">
              {order.orderNumber}
            </span>
            <h3 className="mt-1 font-bold text-foreground">{order.patient.name}</h3>
            <span className="text-xs text-muted-foreground">
              MRN: {order.patient.mrn}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} Critical
              </span>
            )}
            {abnormalCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {abnormalCount} Abnormal
              </span>
            )}
            <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              VERIFIED
            </span>
          </div>
        </div>

        {/* Test Results Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Test
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Hasil
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Satuan
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  Flag
                </th>
              </tr>
            </thead>
            <tbody>
              {order.orderDetails.map((detail) => (
                <tr key={detail.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {detail.test?.code ?? "-"}
                    </span>
                    <span className="ml-2 text-foreground">{detail.test?.name ?? "-"}</span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {detail.resultValue ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {detail.test?.unit ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <FlagBadge flag={detail.flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interpretation Text Field */}
        <div>
          <label
            htmlFor={`interp-${order.id}`}
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Interpretasi Klinis
          </label>
          <textarea
            id={`interp-${order.id}`}
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            placeholder="Tambahkan catatan interpretasi klinis..."
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Action Buttons */}
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
            className="flex items-center gap-2 rounded-lg bg-[oklch(0.55_0.08_145)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[oklch(0.50_0.08_145)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Setujui
          </button>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={showApproveDialog}
        title="Konfirmasi Approval"
        description="Apakah Anda yakin ingin menyetujui hasil pemeriksaan ini? Hasil akan dikirim ke pasien."
        confirmLabel="Ya, Setujui"
        confirmClassName="bg-[oklch(0.55_0.08_145)] hover:bg-[oklch(0.50_0.08_145)]"
        loading={actionLoading}
        onConfirm={handleApproveConfirm}
        onCancel={() => setShowApproveDialog(false)}
      />

      {/* Reject Confirmation Dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        title="Tolak Order"
        description="Berikan alasan penolakan agar analis dapat memperbaiki hasil."
        confirmLabel="Tolak"
        confirmClassName="bg-red-600 hover:bg-red-700"
        loading={actionLoading}
        onConfirm={handleRejectConfirm}
        onCancel={() => {
          setShowRejectDialog(false);
          setRejectionReason("");
        }}
      >
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Alasan penolakan..."
          rows={3}
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-none"
        />
      </ConfirmDialog>
    </>
  );
}

/* ─── Main Approval Page ─── */
export default function LabApprovalPage() {
  const [orders, setOrders] = useState<ApprovalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovalQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getApprovalQueue();
      const result = response as {
        success: boolean;
        data: { data: ApprovalOrder[]; meta: { total: number } };
      };
      setOrders(result.data.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: string }).message)
            : "Gagal memuat data approval queue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovalQueue();
  }, [fetchApprovalQueue]);

  const handleApprove = async (orderId: string, interpretation: string) => {
    await apiClient.approveOrder(orderId, {
      decision: "APPROVE",
      interpretation,
    });
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleReject = async (orderId: string, reason: string) => {
    await apiClient.approveOrder(orderId, {
      decision: "REJECT",
      rejectionReason: reason,
    });
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.55_0.08_145)]/10">
            <ClipboardCheck className="h-5 w-5 text-[oklch(0.55_0.08_145)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Doctor Approval</h2>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Memuat data..."
                : `${orders.length} order menunggu persetujuan`}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <Loader2 className="mx-auto h-10 w-10 text-muted-foreground/50 animate-spin" />
            <p className="mt-3 text-sm text-muted-foreground">
              Memuat data approval...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-red-200 dark:border-red-800 py-16 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchApprovalQueue}
              className="mt-4 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Tidak ada order yang menunggu approval
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <ApprovalCard
              key={order.id}
              order={order}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>
    </div>
  );
}
