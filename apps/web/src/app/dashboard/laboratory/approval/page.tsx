"use client";

import { useState, useMemo } from "react";
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import { cn } from "@/lib/utils";
import { LabStatusBadge } from "@/components/laboratory/lab-status-badge";
import type { Order, OrderDetail } from "@/types/order";

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
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmClassName: string;
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
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={cn("rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors", confirmClassName)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Result Flag Badge ─── */
function FlagBadge({ flag }: { flag?: string }) {
  if (!flag) return null;
  const style = FLAG_STYLES[flag] ?? FLAG_STYLES.NORMAL;
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase", style.bg, style.text)}>
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
  order: Order;
  onApprove: (orderId: string, interpretation: string) => void;
  onReject: (orderId: string, reason: string) => void;
}) {
  const [interpretation, setInterpretation] = useState(order.clinicalInterpretation ?? "");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const criticalCount = order.details.filter((d) => d.resultFlag === "CRITICAL").length;
  const abnormalCount = order.details.filter((d) => d.resultFlag === "HIGH" || d.resultFlag === "LOW").length;

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="font-mono text-xs font-semibold text-primary">
              {order.orderNumber}
            </span>
            <h3 className="mt-1 font-bold text-foreground">{order.patientName}</h3>
            <span className="text-xs text-muted-foreground">MRN: {order.patientMrn}</span>
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
            <LabStatusBadge status="VERIFIED" />
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3">
            {order.notes}
          </p>
        )}

        {/* Test Results Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Test</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Hasil</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Satuan</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ref. Range</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Flag</th>
              </tr>
            </thead>
            <tbody>
              {order.details.map((detail: OrderDetail) => (
                <tr key={detail.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs font-semibold text-primary">{detail.test.code}</span>
                    <span className="ml-2 text-foreground">{detail.test.name}</span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-foreground">
                    {detail.resultValue ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{detail.test.unit}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {detail.test.minRef !== undefined && detail.test.maxRef !== undefined
                      ? `${detail.test.minRef} – ${detail.test.maxRef}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <FlagBadge flag={detail.resultFlag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Interpretation Text Field */}
        <div>
          <label htmlFor={`interp-${order.id}`} className="block text-xs font-medium text-muted-foreground mb-1">
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
            Reject
          </button>
          <button
            onClick={() => setShowApproveDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-[oklch(0.55_0.08_145)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[oklch(0.50_0.08_145)]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </button>
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={showApproveDialog}
        title="Konfirmasi Approval"
        description="Apakah Anda yakin ingin menyetujui hasil pemeriksaan ini? Hasil akan dikirim ke pasien."
        confirmLabel="Ya, Approve"
        confirmClassName="bg-[oklch(0.55_0.08_145)] hover:bg-[oklch(0.50_0.08_145)]"
        onConfirm={() => {
          onApprove(order.id, interpretation);
          setShowApproveDialog(false);
        }}
        onCancel={() => setShowApproveDialog(false)}
      />

      {/* Reject Confirmation Dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        title="Reject Order"
        description="Berikan alasan penolakan agar analis dapat memperbaiki hasil."
        confirmLabel="Reject"
        confirmClassName="bg-red-600 hover:bg-red-700"
        onConfirm={() => {
          if (rejectionReason.trim()) {
            onReject(order.id, rejectionReason);
            setShowRejectDialog(false);
            setRejectionReason("");
          }
        }}
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
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  const pendingOrders = useMemo(() => {
    return MOCK_ORDERS.filter(
      (o) => o.status === "VERIFIED" && !processedIds.has(o.id)
    );
  }, [processedIds]);

  const handleApprove = async (orderId: string, interpretation: string) => {
    // In production: POST /api/v1/lab/:orderId/approve
    // { decision: "APPROVE", interpretation }
    console.log("[Approval] Approving order:", orderId, { interpretation });
    setProcessedIds((prev) => new Set(prev).add(orderId));
  };

  const handleReject = async (orderId: string, reason: string) => {
    // In production: POST /api/v1/lab/:orderId/approve
    // { decision: "REJECT", rejectionReason: reason }
    console.log("[Approval] Rejecting order:", orderId, { reason });
    setProcessedIds((prev) => new Set(prev).add(orderId));
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
              {pendingOrders.length} order menunggu persetujuan
            </p>
          </div>
        </div>
      </div>

      {/* Order Cards */}
      <div className="space-y-4">
        {pendingOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Semua order telah diproses. Tidak ada yang menunggu approval.
            </p>
          </div>
        ) : (
          pendingOrders.map((order) => (
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
