"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  FlaskConical,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ShieldCheck,
  Barcode,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Printer,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Square,
  XCircle,
  History,
  Calendar,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useLabQueue, useLabQueueStats, useLabQueueHistory, useConfirmSample, useVerifyResults, useRecallOrder, useMyWorkload, labKeys } from "@/services/lab";
import { apiClient } from "@/lib/api";
import {
  LabStatusBadge,
  type OrderStatus,
} from "@/components/laboratory/lab-status-badge";
import { RoleGuard } from "@/components/guards/RoleGuard";

// ---------- UX-GAP-05: Focus Trap Hook ----------

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => !el.hasAttribute("disabled"));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Focus first focusable element on open
    const focusable = getFocusable();
    if (focusable.length > 0) {
      setTimeout(() => focusable[0].focus(), 50);
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// ---------- Types ----------

interface LabQueueOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  status: OrderStatus;
  priority?: string;
  createdAt: string;
  paidAt?: string;
  sampleCollectedAt?: string;
  barcodeImage?: string;
  sampleCondition?: string;
  rejectedReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  interpretation?: string;
  rejectionCount?: number;
  totalAmount: number;
  details: {
    id: string;
    testId: string;
    testCode: string;
    testName: string;
    status: string;
    flag?: string;
    tatMinutes?: number;
    resultType?: string;
  }[];
}

// ---------- Constants ----------

type QueueTab = "ALL" | "PAID" | "SAMPLE_COLLECTED" | "IN_ANALYSIS" | "VERIFIED" | "RESAMPLE" | "COMPLETED_TODAY" | "HISTORY";

const QUEUE_TABS: { id: QueueTab; label: string; icon: React.ElementType }[] = [
  { id: "ALL", label: "Semua", icon: Clock },
  { id: "PAID", label: "Terbayar", icon: CreditCard },
  { id: "RESAMPLE", label: "Re-sampling", icon: AlertTriangle },
  { id: "SAMPLE_COLLECTED", label: "Sampel Diterima", icon: Barcode },
  { id: "IN_ANALYSIS", label: "Proses Analisa", icon: FlaskConical },
  { id: "VERIFIED", label: "Terverifikasi", icon: ShieldCheck },
  { id: "COMPLETED_TODAY", label: "Selesai Hari Ini", icon: CheckCircle2 },
  { id: "HISTORY", label: "Riwayat", icon: History },
];

const PAGE_SIZE = 10;

const SAMPLE_CONDITIONS = [
  { value: "ACCEPTABLE", label: "Acceptable (Layak)", color: "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-900/20 dark:border-green-800" },
  { value: "LIPEMIC", label: "Lipemik", color: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800" },
  { value: "HEMOLYTIC", label: "Hemolisis", color: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800" },
  { value: "CLOTTED", label: "Beku (Clotted)", color: "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-800" },
  { value: "INSUFFICIENT", label: "Volume Kurang", color: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-900/20 dark:border-orange-800" },
  { value: "OTHER", label: "Lainnya (Tolak)", color: "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700" },
];

// ---------- Helpers ----------

function mapApiOrder(o: Record<string, unknown>): LabQueueOrder {
  const patient = o.patient as Record<string, unknown> | undefined;
  const orderDetails = (o.orderDetails ?? o.details ?? []) as Record<string, unknown>[];
  return {
    id: o.id as string,
    orderNumber: o.orderNumber as string,
    patientId: (o.patientId as string) ?? (patient?.id as string) ?? "",
    patientName: (patient?.name as string) ?? "",
    patientMrn: (patient?.mrn as string) ?? "",
    status: o.status as OrderStatus,
    priority: o.priority as string | undefined,
    createdAt: o.createdAt as string,
    paidAt: o.paidAt as string | undefined,
    sampleCollectedAt: o.sampleCollectedAt as string | undefined,
    barcodeImage: o.barcodeImage as string | undefined,
    sampleCondition: o.sampleCondition as string | undefined,
    rejectedReason: (o.rejectedReason as string) ?? (o.rejectionReason as string) ?? undefined,
    approvedAt: o.approvedAt as string | undefined,
    approvedBy: o.approvedBy as string | undefined,
    interpretation: o.interpretation as string | undefined,
    rejectionCount: Number(o.rejectionCount) || 0,
    totalAmount: Number(o.totalAmount) || 0,
    details: orderDetails.map((d) => {
      const test = d.test as Record<string, unknown> | undefined;
      return {
        id: d.id as string,
        testId: d.testId as string,
        testCode: (test?.code as string) ?? "",
        testName: (test?.name as string) ?? "",
        status: d.status as string,
        flag: (d.flag as string) ?? undefined,
        tatMinutes: (test?.tatMinutes as number) ?? undefined,
        resultType: (test?.resultType as string) ?? "NUMERIC",
      };
    }),
  };
}

function getElapsedTime(since: string): string {
  const ms = Date.now() - new Date(since).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMins = minutes % 60;
  if (hours < 24) return `${hours}j ${remainMins}m`;
  const days = Math.floor(hours / 24);
  return `${days}h ${hours % 24}j`;
}

function isTatOverdue(order: LabQueueOrder): boolean {
  const maxTat = Math.max(...order.details.map((d) => d.tatMinutes || 0).filter(Boolean));
  if (!maxTat) return false;
  const sinceTime = order.sampleCollectedAt || order.paidAt || order.createdAt;
  const elapsed = (Date.now() - new Date(sinceTime).getTime()) / 60000;
  return elapsed > maxTat;
}

// ---------- useOrderRowState Hook ----------

function useOrderRowState(
  order: LabQueueOrder,
  isFocused: boolean,
  rowIndex: number,
  totalRows: number,
  onToggle: () => void,
  onSelect: () => void,
  onFocusRow: (index: number) => void,
  confirmSampleMutation: ReturnType<typeof useConfirmSample>,
  queryClient: ReturnType<typeof useQueryClient>
) {
  // Dialog & feedback state
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [showSampleDialog, setShowSampleDialog] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<string>("ACCEPTABLE");
  const [rejectionReason, setRejectionReason] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeVerified, setBarcodeVerified] = useState(false);

  // BP-LAB-03: Rerun state
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const [rerunTestId, setRerunTestId] = useState<string | null>(null);
  const [rerunReason, setRerunReason] = useState("");
  const [rerunSubmitting, setRerunSubmitting] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);

  // UX-GAP-05: Focus trap refs for dialogs
  const sampleDialogRef = useFocusTrap(showSampleDialog);
  const rerunDialogRef = useFocusTrap(showRerunDialog);

  // UX-LAB-05: TAT indicator
  const tatOverdue = isTatOverdue(order);
  const elapsed = getElapsedTime(order.sampleCollectedAt || order.paidAt || order.createdAt);

  // UX-GAP-07: Rejected sample needing re-sampling
  const isRejectedSample = order.sampleCondition && order.sampleCondition !== "ACCEPTABLE" && order.status === "PAID";

  // BP-GAP-01: Order rejected by doctor (sent back to IN_ANALYSIS)
  const isDoctorRejected = !!order.rejectedReason && order.status === "IN_ANALYSIS";

  // DATA-GAP-08: CITO priority check
  const isCito = order.priority === "CITO" || order.priority === "URGENT";

  // DATA-GAP-10: Progress indicator for IN_ANALYSIS orders
  const resultsCompleted = order.details.filter((d) => d.status === "RESULT_ENTERED" || d.status === "VERIFIED" || d.status === "APPROVED").length;
  const resultsTotal = order.details.length;
  const allResultsEntered = resultsCompleted === resultsTotal && resultsTotal > 0;

  // DATA-GAP-11: Dual-approval indicator (CRITICAL flags in details)
  const hasCriticalFlag = order.details.some((d) => d.flag === "CRITICAL");

  // UX-LAB-02: Sample confirmation handler
  const handleConfirmSample = async () => {
    setConfirmError(null);
    try {
      const payload: { sampleCondition: string; rejectionReason?: string; notes?: string } = {
        sampleCondition: selectedCondition,
      };
      if (selectedCondition !== "ACCEPTABLE" && rejectionReason.trim()) {
        payload.rejectionReason = rejectionReason.trim();
      }
      await confirmSampleMutation.mutateAsync({ orderId: order.id, data: payload as any });
      setConfirmSuccess(true);
      setShowSampleDialog(false);
      // No window.location.reload() — TanStack Query handles cache invalidation
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setConfirmError(apiErr?.message || "Gagal konfirmasi sampel");
    }
  };

  const handlePrintBarcode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBarcodeError(null);
    try {
      const token = localStorage.getItem("elis_token") || localStorage.getItem("token") || sessionStorage.getItem("token") || "";
      const res = await fetch(`/api/v1/orders/${order.id}/barcode.png`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const barcodeDataUrl = URL.createObjectURL(blob);
      const printWindow = window.open("", "_blank");
      if (!printWindow) { setBarcodeError("Popup blocker aktif"); URL.revokeObjectURL(barcodeDataUrl); return; }
      printWindow.document.write(`<html><head><title>Barcode ${order.orderNumber}</title><style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace}img{max-width:100%;height:auto}.label{margin-top:5px;font-size:12px;font-weight:bold}@page{size:auto;margin:0}</style></head><body><img src="${barcodeDataUrl}" /><div class="label">${order.orderNumber}</div><script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script></body></html>`);
      printWindow.document.close();
    } catch { setBarcodeError("Gagal memuat barcode"); }
  };

  // BP-LAB-03: Rerun submit handler
  const handleRerunSubmit = async () => {
    if (!rerunTestId || !rerunReason) return;
    setRerunSubmitting(true);
    setRerunError(null);
    try {
      await apiClient.post(`/api/v1/lab-workflow/order-details/${rerunTestId}/rerun`, { reason: rerunReason });
      setShowRerunDialog(false);
      setRerunTestId(null);
      setRerunReason("");
      // UX-GAP-03: Properly invalidate cache
      queryClient.invalidateQueries({ queryKey: labKeys.queue() });
      queryClient.invalidateQueries({ queryKey: labKeys.queueStats() });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setRerunError(e?.message || "Gagal submit rerun. Coba lagi.");
    } finally {
      setRerunSubmitting(false);
    }
  };

  // UX-GAP-01: Keyboard handler for row navigation
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        onToggle();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (rowIndex < totalRows - 1) onFocusRow(rowIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (rowIndex > 0) onFocusRow(rowIndex - 1);
        break;
      case "s":
        // 's' to select (for PAID orders)
        if (order.status === "PAID") {
          e.preventDefault();
          onSelect();
        }
        break;
    }
  };

  // UX-GAP-01: Auto-focus row ref
  const rowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.focus();
    }
  }, [isFocused]);

  return {
    // State
    confirmSuccess, confirmError, barcodeError, setBarcodeError,
    showSampleDialog, setShowSampleDialog,
    selectedCondition, setSelectedCondition,
    rejectionReason, setRejectionReason,
    barcodeInput, setBarcodeInput,
    barcodeVerified, setBarcodeVerified,
    showRerunDialog, setShowRerunDialog,
    rerunTestId, setRerunTestId,
    rerunReason, setRerunReason,
    rerunSubmitting, rerunError,
    // Computed flags
    tatOverdue, elapsed,
    isRejectedSample, isDoctorRejected, isCito,
    resultsCompleted, resultsTotal, allResultsEntered, hasCriticalFlag,
    // Handlers
    handleConfirmSample, handlePrintBarcode, handleRerunSubmit, handleRowKeyDown,
    // Refs
    rowRef, sampleDialogRef, rerunDialogRef,
  };
}

// ---------- RerunDialog Component ----------

interface RerunDialogProps {
  show: boolean;
  order: LabQueueOrder;
  rerunTestId: string | null;
  rerunReason: string;
  rerunSubmitting: boolean;
  rerunError: string | null;
  dialogRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onSelectTest: (id: string) => void;
  onChangeReason: (reason: string) => void;
  onSubmit: () => void;
}

function RerunDialog({
  show, order, rerunTestId, rerunReason, rerunSubmitting, rerunError,
  dialogRef, onClose, onSelectTest, onChangeReason, onSubmit,
}: RerunDialogProps) {
  if (!show) return null;
  return (
    // BP-LAB-03: Rerun Dialog (UX-GAP-05: with focus trap)
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()} data-dialog-open>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={dialogRef} className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="rerun-dialog-title">
        <h3 id="rerun-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">Request Rerun</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pilih parameter yang perlu diulang
        </p>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Parameter</label>
          <div className="space-y-1.5">
            {order.details.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectTest(d.id)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition",
                  rerunTestId === d.id
                    ? "border-brand bg-brand/10 text-brand ring-1 ring-brand/30"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                <span className="font-mono text-xs">{d.testCode}</span> — {d.testName}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="rerun-reason" className="text-xs font-bold uppercase tracking-wide text-slate-500">Alasan Rerun</label>
          <select
            id="rerun-reason"
            value={rerunReason}
            onChange={(e) => onChangeReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Pilih alasan...</option>
            <option value="QC_FAILURE">QC Failure</option>
            <option value="SPECIMEN_ISSUE">Masalah Spesimen</option>
            <option value="EQUIPMENT_ERROR">Error Alat</option>
            <option value="OPERATOR_ERROR">Error Operator</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>

        {/* Error message */}
        {rerunError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {rerunError}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={!rerunTestId || !rerunReason || rerunSubmitting}
            className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {rerunSubmitting ? "Memproses..." : "Submit Rerun"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- SampleConditionDialog Component ----------

interface SampleConditionDialogProps {
  show: boolean;
  order: LabQueueOrder;
  selectedCondition: string;
  rejectionReason: string;
  barcodeInput: string;
  barcodeVerified: boolean;
  confirmError: string | null;
  isPending: boolean;
  dialogRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onSelectCondition: (cond: string) => void;
  onChangeRejectionReason: (r: string) => void;
  onChangeBarcodeInput: (val: string, verified: boolean) => void;
  onConfirm: () => void;
}

function SampleConditionDialog({
  show, order, selectedCondition, rejectionReason, barcodeInput, barcodeVerified,
  confirmError, isPending, dialogRef,
  onClose, onSelectCondition, onChangeRejectionReason, onChangeBarcodeInput, onConfirm,
}: SampleConditionDialogProps) {
  if (!show) return null;
  return (
    // Sample Condition Dialog (UX-GAP-05: with focus trap)
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()} data-dialog-open>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-dialog-title"
        onKeyDown={(e) => {
          // UX-GAP-02: Ctrl+Enter to confirm in dialog
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            if (barcodeVerified && (selectedCondition === "ACCEPTABLE" || rejectionReason.trim())) {
              onConfirm();
            }
          }
          // Escape to close
          if (e.key === "Escape") {
            onClose();
          }
        }}
      >
        <h3 id="sample-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">Konfirmasi Kondisi Sampel</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Order <span className="font-semibold text-brand">{order.orderNumber}</span> — {order.patientName}
        </p>

        {/* BP-LAB-01: Barcode Verification */}
        <div className="mt-4 space-y-2">
          <label htmlFor="barcode-verify" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Verifikasi Barcode Sampel
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="barcode-verify"
                type="text"
                value={barcodeInput}
                onChange={(e) => {
                  const val = e.target.value;
                  onChangeBarcodeInput(val, val.trim().toUpperCase() === order.orderNumber.toUpperCase());
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onChangeBarcodeInput(barcodeInput, barcodeInput.trim().toUpperCase() === order.orderNumber.toUpperCase());
                  }
                }}
                placeholder="Scan atau ketik nomor barcode..."
                autoFocus
                className={cn(
                  "h-10 w-full rounded-xl border pl-10 pr-4 text-sm font-mono outline-none transition-all placeholder:text-slate-400 focus:ring-1",
                  barcodeVerified
                    ? "border-green-400 bg-green-50 focus:border-green-500 focus:ring-green-200 dark:border-green-600 dark:bg-green-900/20"
                    : barcodeInput && !barcodeVerified
                      ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200 dark:border-red-700 dark:bg-red-900/20"
                      : "border-slate-200 bg-white focus:border-brand focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800"
                )}
              />
            </div>
            {barcodeVerified && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
          </div>
          {barcodeInput && !barcodeVerified && (
            <p className="text-xs text-red-600 dark:text-red-400">Barcode tidak cocok dengan order {order.orderNumber}</p>
          )}
          {!barcodeInput && (
            <p className="text-xs text-slate-400">Scan barcode pada tabung sampel untuk verifikasi identitas pasien</p>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Kondisi Sampel</label>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_CONDITIONS.map((cond) => (
              <button
                key={cond.value}
                type="button"
                onClick={() => onSelectCondition(cond.value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                  selectedCondition === cond.value
                    ? cond.color + " ring-2 ring-brand/30"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                )}
              >
                {cond.label}
              </button>
            ))}
          </div>
        </div>
        {selectedCondition !== "ACCEPTABLE" && (
          <div className="mt-4">
            <label htmlFor="rejection-reason" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Alasan Penolakan</label>
            <textarea
              id="rejection-reason"
              rows={2}
              value={rejectionReason}
              onChange={(e) => onChangeRejectionReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan sampel..."
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}
        {selectedCondition !== "ACCEPTABLE" && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Sampel akan ditandai <strong>ditolak</strong>. Order memerlukan pengambilan ulang.
            </p>
          </div>
        )}
        {confirmError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{confirmError}</div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">Batal</button>
            <button
              onClick={onConfirm}
              disabled={isPending || !barcodeVerified || (selectedCondition !== "ACCEPTABLE" && !rejectionReason.trim())}
              className={cn("flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50", selectedCondition === "ACCEPTABLE" ? "bg-brand hover:bg-brand-dark" : "bg-red-600 hover:bg-red-700")}
            >
              {isPending ? "Memproses..." : selectedCondition === "ACCEPTABLE" ? "Terima Sampel" : "Tolak Sampel"}
            </button>
          </div>
          {/* UX-GAP-02: Keyboard shortcut hint */}
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
            Tekan <kbd className="rounded border border-slate-300 px-1 py-0.5 font-mono text-[9px] dark:border-slate-600">Ctrl+Enter</kbd> untuk konfirmasi cepat
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- OrderExpandedDetail Component ----------

interface OrderExpandedDetailProps {
  order: LabQueueOrder;
  isDoctorRejected: boolean;
  confirmError: string | null;
  barcodeError: string | null;
  confirmSuccess: boolean;
  selectedCondition: string;
  allResultsEntered: boolean;
  activeTab: QueueTab;
  confirmSampleMutation: ReturnType<typeof useConfirmSample>;
  verifyMutation: ReturnType<typeof useVerifyResults>;
  recallMutation: ReturnType<typeof useRecallOrder>;
  handlePrintBarcode: (e: React.MouseEvent) => void;
  onOpenSampleDialog: () => void;
  onOpenRerunDialog: () => void;
  rerunDialog: React.ReactNode;
  sampleDialog: React.ReactNode;
}

function OrderExpandedDetail({
  order, isDoctorRejected, confirmError, barcodeError, confirmSuccess, selectedCondition,
  allResultsEntered, activeTab, confirmSampleMutation, verifyMutation, recallMutation,
  handlePrintBarcode, onOpenSampleDialog, onOpenRerunDialog,
  rerunDialog, sampleDialog,
}: OrderExpandedDetailProps) {
  return (
    <>
      {/* 3-column info grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Patient Info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <User className="h-3.5 w-3.5" /> Informasi Pasien
          </div>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Nama:</span> <span className="font-medium text-foreground">{order.patientName}</span></p>
            <p><span className="text-muted-foreground">MRN:</span> <span className="font-mono text-foreground">{order.patientMrn}</span></p>
            <p><span className="text-muted-foreground">Total:</span> <span className="font-medium text-foreground">Rp {order.totalAmount.toLocaleString("id-ID")}</span></p>
          </div>
        </div>

        {/* Barcode */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Barcode className="h-3.5 w-3.5" /> Barcode
          </div>
          {(order.barcodeImage || order.status !== "PENDING_PAYMENT") ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-full items-center justify-center rounded-lg bg-white p-2">
                <AuthenticatedBarcodeImage orderId={order.id} orderNumber={order.orderNumber} />
              </div>
              <button onClick={handlePrintBarcode} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <Printer className="h-3.5 w-3.5" /> Cetak Barcode
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Barcode belum tersedia</p>
          )}
        </div>

        {/* Test List */}
        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" /> Daftar Tes ({order.details.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {order.details.map((d) => (
              <span
                key={d.id}
                className={cn(
                  "rounded-md px-2 py-1 font-mono text-[11px] font-semibold inline-flex items-center gap-1",
                  d.status === "RESULT_ENTERED" || d.status === "VERIFIED" || d.status === "APPROVED"
                    ? "bg-brand/10 text-brand dark:bg-brand-light dark:text-brand"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}
                title={`${d.testName} (${d.resultType === "QUALITATIVE" ? "Kualitatif" : d.resultType === "TEXT" ? "Teks" : "Numerik"})`}
              >
                {d.testCode}
                {d.resultType === "QUALITATIVE" && <span className="text-[8px] font-bold opacity-60">Q</span>}
                {d.resultType === "TEXT" && <span className="text-[8px] font-bold opacity-60">T</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* BP-GAP-01: Doctor rejection reason banner */}
      {isDoctorRejected && order.rejectedReason && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" /> Catatan Dokter (Alasan Penolakan)
          </div>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {order.rejectedReason}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {confirmError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5" /> {confirmError}
          </div>
        )}
        {barcodeError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="h-3.5 w-3.5" /> {barcodeError}
          </div>
        )}
        {confirmSuccess && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {selectedCondition === "ACCEPTABLE" ? "Sampel diterima!" : "Sampel ditolak."}
          </div>
        )}
        {order.status === "PAID" && !confirmSuccess && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenSampleDialog(); }}
            disabled={confirmSampleMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            <Barcode className="h-4 w-4" /> Konfirmasi Sampel
          </button>
        )}
        {(order.status === "SAMPLE_COLLECTED" || order.status === "IN_ANALYSIS") && (
          <a href={`/dashboard/laboratory/results/${order.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]">
            <FlaskConical className="h-4 w-4" /> {order.status === "SAMPLE_COLLECTED" ? "Input Hasil" : allResultsEntered ? "Lihat Hasil" : "Lanjut Input"}
          </a>
        )}
        {/* DATA-GAP-07: Quick verify from queue for IN_ANALYSIS with all results entered */}
        {order.status === "IN_ANALYSIS" && allResultsEntered && activeTab !== "COMPLETED_TODAY" && activeTab !== "HISTORY" && (
          <button
            onClick={(e) => { e.stopPropagation(); verifyMutation.mutate({ orderId: order.id }); }}
            disabled={verifyMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
          >
            {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verifikasi
          </button>
        )}
        {/* BP-LAB-03: Rerun button for IN_ANALYSIS orders */}
        {order.status === "IN_ANALYSIS" && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenRerunDialog(); }}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition-all hover:bg-amber-100 active:scale-[0.98] dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          >
            <RotateCcw className="h-4 w-4" /> Request Rerun
          </button>
        )}
        {/* Rerun count indicator */}
        {order.details.some((d) => (d as any).rerunCount > 0) && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <RotateCcw className="h-3 w-3" />
            Rerun: {order.details.filter((d) => (d as any).rerunCount > 0).length} tes
          </span>
        )}
        {order.status === "VERIFIED" && (
          <a href="/dashboard/laboratory/approval" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md active:scale-[0.98]">
            <ShieldCheck className="h-4 w-4" /> Menunggu Approval Dokter
          </a>
        )}
        {/* Task 3.2: Recall button for APPROVED/NOTIFIED orders (< 24 hours) */}
        {(order.status === "APPROVED" || order.status === "NOTIFIED") && order.approvedAt && (
          (() => {
            const hoursSince = (Date.now() - new Date(order.approvedAt).getTime()) / (1000 * 60 * 60);
            if (hoursSince > 24) return null;
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const reason = window.prompt("Alasan recall order ini untuk koreksi:");
                  if (reason && reason.trim()) {
                    recallMutation.mutate({ orderId: order.id, reason: reason.trim() });
                  }
                }}
                disabled={recallMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition-all hover:bg-amber-100 active:scale-[0.98] disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
              >
                {recallMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Recall
              </button>
            );
          })()
        )}
        {/* Task 3.3: Reprint button for APPROVED/NOTIFIED orders */}
        {(order.status === "APPROVED" || order.status === "NOTIFIED") && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const token = localStorage.getItem("elis_token") || localStorage.getItem("token") || sessionStorage.getItem("token") || "";
              window.open(`/api/v1/orders/${order.id}/report/pdf?token=${encodeURIComponent(token)}`, "_blank");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-brand/5 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" /> Cetak Hasil
          </button>
        )}
        {/* DATA-GAP-09: Rejection count badge */}
        {order.rejectionCount && order.rejectionCount > 1 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" />
            Ditolak {order.rejectionCount}x
          </span>
        )}
      </div>

      {/* Dialogs rendered here (inside expanded detail) */}
      {rerunDialog}
      {sampleDialog}
    </>
  );
}

// ---------- Main Component ----------

export default function LaboratoryQueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTab>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // UX-GAP-06: Bulk confirmation dialog state
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  // UX-GAP-04: Bulk reject state
  const [bulkMode, setBulkMode] = useState<"accept" | "reject">("accept");
  const [bulkRejectCondition, setBulkRejectCondition] = useState<string>("LIPEMIC");
  const [bulkRejectReason, setBulkRejectReason] = useState("");
  // FUNC-GAP-04: Bulk barcode verification checkbox
  const [bulkBarcodeVerified, setBulkBarcodeVerified] = useState(false);
  // UX-GAP-01: Focused row index for keyboard navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  // Bulk operation error feedback
  const [bulkError, setBulkError] = useState<string | null>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  // DATA-GAP-04: History tab state
  const [historyDateFrom, setHistoryDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [historyDateTo, setHistoryDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [historyStatus, setHistoryStatus] = useState<string>("ALL");

  // DATA-GAP-03: Track auto-approved orders for visual feedback
  const [autoApprovedToast, setAutoApprovedToast] = useState<{ orderNumbers: string[]; count: number } | null>(null);

  const queryClient = useQueryClient();

  // Debounce search (UX-LAB-03: server-side search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // UX-LAB-03: Send search to API (server-side)
  const { data: queryData, isLoading, error: queryError, refetch } = useLabQueue({
    page,
    limit: PAGE_SIZE,
    status: activeTab !== "ALL" && activeTab !== "HISTORY" ? activeTab : undefined,
    search: debouncedSearch || undefined,
  });

  // DATA-GAP-04: History tab query (separate endpoint)
  const { data: historyData, isLoading: historyLoading } = useLabQueueHistory({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    dateFrom: historyDateFrom,
    dateTo: historyDateTo,
    status: historyStatus !== "ALL" ? historyStatus : undefined,
  });

  // UX-LAB-04: Get accurate tab counts from dedicated stats endpoint
  const { data: statsData } = useLabQueueStats();

  // UX-LAB-02: Use mutation hook for sample confirmation
  const confirmSampleMutation = useConfirmSample();

  // Task 2.3: Verify mutation for quick-action
  const verifyMutation = useVerifyResults();

  // Task 3.1: Recall mutation
  const recallMutation = useRecallOrder();

  // Task 3.5: Workload summary
  const { data: workloadData } = useMyWorkload();

  // UX-GAP-02: Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      // Don't fire if a dialog is open
      if (document.querySelector("[data-dialog-open]")) return;

      // Number keys 1-6 switch tabs
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const numKey = parseInt(e.key);
        if (numKey >= 1 && numKey <= QUEUE_TABS.length) {
          e.preventDefault();
          handleTabChange(QUEUE_TABS[numKey - 1].id);
          return;
        }
      }

      // Ctrl+R or F5 to refresh queue
      if ((e.ctrlKey && e.key === "r") || e.key === "F5") {
        e.preventDefault();
        refetch();
        return;
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [refetch]);

  // Extract data from query response
  const { orders, totalItems } = useMemo(() => {
    // Use history data when on HISTORY tab
    const sourceData = activeTab === "HISTORY" ? historyData : queryData;
    const envelope = sourceData as unknown;
    let items: LabQueueOrder[] = [];
    let total = 0;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      const inner = (env.data ?? env) as Record<string, unknown>;

      if (Array.isArray(inner)) {
        items = (inner as Record<string, unknown>[]).map(mapApiOrder);
        total = items.length;
      } else if (inner && typeof inner === "object") {
        const dataArr = (inner as Record<string, unknown>).data;
        if (Array.isArray(dataArr)) {
          items = (dataArr as Record<string, unknown>[]).map(mapApiOrder);
          const meta = (inner as Record<string, unknown>).meta as Record<string, unknown> | undefined;
          total = Number(meta?.total) || items.length;
        }
      }
    }

    return { orders: items, totalItems: total };
  }, [queryData, historyData, activeTab]);

  // DATA-GAP-03: Detect orders that disappeared (likely auto-approved or completed)
  const prevContextRef = useRef<{ tab: QueueTab; page: number; search: string; ids: Set<string> }>({
    tab: "ALL", page: 1, search: "", ids: new Set(),
  });
  useEffect(() => {
    if (isLoading) return;
    const currentIds = new Set(orders.map((o) => o.id));
    const prev = prevContextRef.current;

    // Only detect disappearances if tab, page, and search haven't changed (same context)
    if (prev.tab === activeTab && prev.page === page && prev.search === debouncedSearch && prev.ids.size > 0) {
      const disappeared = Array.from(prev.ids).filter((id) => !currentIds.has(id));
      if (disappeared.length > 0) {
        setAutoApprovedToast({ orderNumbers: [], count: disappeared.length });
        setTimeout(() => setAutoApprovedToast(null), 6000);
      }
    }

    prevContextRef.current = { tab: activeTab, page, search: debouncedSearch, ids: currentIds };
  }, [orders, isLoading, activeTab, page, debouncedSearch]);

  // UX-LAB-04: Extract stats from API
  const tabCounts = useMemo(() => {
    const defaults: Record<QueueTab, number> = { ALL: 0, PAID: 0, RESAMPLE: 0, SAMPLE_COLLECTED: 0, IN_ANALYSIS: 0, VERIFIED: 0, COMPLETED_TODAY: 0, HISTORY: 0 };
    if (!statsData) return { ...defaults, ALL: totalItems };

    const raw = statsData as unknown as Record<string, unknown>;
    const data = (raw?.data ?? raw) as Record<string, unknown>;
    if (data && typeof data === "object" && "PAID" in data) {
      return {
        ALL: Number(data.ALL) || 0,
        PAID: Number(data.PAID) || 0,
        RESAMPLE: Number(data.RESAMPLE) || 0,
        SAMPLE_COLLECTED: Number(data.SAMPLE_COLLECTED) || 0,
        IN_ANALYSIS: Number(data.IN_ANALYSIS) || 0,
        VERIFIED: Number(data.VERIFIED) || 0,
        COMPLETED_TODAY: Number(data.COMPLETED_TODAY) || 0,
        HISTORY: 0, // History doesn't need a count badge
      };
    }
    return { ...defaults, ALL: totalItems };
  }, [statsData, totalItems]);

  const error = queryError ? "Gagal memuat data antrian laboratorium." : null;
  const currentLoading = activeTab === "HISTORY" ? historyLoading : isLoading;

  const handleTabChange = (tab: QueueTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds(new Set());
  };

  // Reset page on search change
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  // UX-LAB-06: Bulk selection
  const paidOrders = orders.filter((o) => o.status === "PAID");
  const allPaidSelected = paidOrders.length > 0 && paidOrders.every((o) => selectedIds.has(o.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPaidSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paidOrders.map((o) => o.id)));
    }
  };

  // UX-LAB-06: Bulk confirm handler (with UX-GAP-06 confirmation dialog)
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;
    setBulkConfirming(true);
    setBulkError(null);
    const ids = Array.from(selectedIds);
    const errors: string[] = [];

    if (bulkMode === "accept") {
      for (const id of ids) {
        try {
          await confirmSampleMutation.mutateAsync({ orderId: id, data: { sampleCondition: "ACCEPTABLE" as const } });
        } catch (err: unknown) {
          const e = err as { message?: string };
          errors.push(e?.message || id);
        }
      }
    } else {
      // UX-GAP-04: Bulk reject
      for (const id of ids) {
        try {
          await confirmSampleMutation.mutateAsync({
            orderId: id,
            data: { sampleCondition: bulkRejectCondition as any, rejectionReason: bulkRejectReason } as any,
          });
        } catch (err: unknown) {
          const e = err as { message?: string };
          errors.push(e?.message || id);
        }
      }
    }

    setSelectedIds(new Set());
    setBulkConfirming(false);
    setShowBulkConfirmDialog(false);
    setBulkMode("accept");
    setBulkRejectCondition("LIPEMIC");
    setBulkRejectReason("");
    setBulkBarcodeVerified(false);

    if (errors.length > 0) {
      setBulkError(`${errors.length} order gagal diproses. Silakan coba lagi.`);
    }
  };

  // UX-GAP-06: Focus trap ref for bulk confirm dialog
  const bulkDialogRef = useFocusTrap(showBulkConfirmDialog);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "SAMPLING", "ANALIS"]}>
    <div className="space-y-6">
      {/* DATA-GAP-03: Auto-approve / order completed toast notification */}
      {autoApprovedToast && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/60">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {autoApprovedToast.count === 1
              ? "1 order telah selesai diproses dan dipindahkan dari antrian."
              : `${autoApprovedToast.count} order telah selesai diproses dan dipindahkan dari antrian.`}
          </div>
          <button
            onClick={() => setAutoApprovedToast(null)}
            className="shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            aria-label="Tutup notifikasi"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* DATA-GAP-12: Workload summary cards */}
      {workloadData ? (() => {
        const raw = workloadData as unknown as Record<string, unknown>;
        const w = (raw?.data ?? raw) as Record<string, unknown>;
        const items = [
          { label: "Sampling", value: Number(w?.sampledToday) || 0, color: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20" },
          { label: "Analisa", value: Number(w?.analyzedToday) || 0, color: "text-brand bg-brand/10 dark:text-brand dark:bg-brand/20" },
          { label: "Verifikasi", value: Number(w?.verifiedToday) || 0, color: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/20" },
          { label: "Approval", value: Number(w?.approvedToday) || 0, color: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20" },
        ];
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <div key={item.label} className={cn("flex items-center gap-3 rounded-xl border border-border px-4 py-2.5", item.color)}>
                <span className="text-2xl font-bold">{item.value}</span>
                <span className="text-xs font-medium opacity-80">{item.label} hari ini</span>
              </div>
            ))}
          </div>
        );
      })() : null}

      {/* Status filter tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {QUEUE_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
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
                {tab.id !== "HISTORY" && (
                <span
                  className={cn(
                    "ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                    isActive ? "bg-white/20 text-white" : "bg-brand/10 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search — UX-LAB-03: server-side */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari order, pasien, MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
            aria-label="Search lab queue"
          />
        </div>
      </div>

      {/* UX-LAB-06: Bulk action bar (with UX-GAP-04 reject + UX-GAP-06 confirmation) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 dark:bg-brand/10">
          <CheckSquare className="h-4 w-4 text-brand" />
          <span className="text-sm font-medium text-brand">{selectedIds.size} order dipilih</span>
          {bulkError && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> {bulkError}
            </span>
          )}
          <button
            onClick={() => { setBulkMode("accept"); setShowBulkConfirmDialog(true); }}
            disabled={bulkConfirming}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {bulkConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Barcode className="h-3.5 w-3.5" />}
            Konfirmasi Acceptable
          </button>
          <button
            onClick={() => { setBulkMode("reject"); setShowBulkConfirmDialog(true); }}
            disabled={bulkConfirming}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"
          >
            <XCircle className="h-3.5 w-3.5" />
            Tolak Batch
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Batal
          </button>
        </div>
      )}

      {/* UX-GAP-06: Bulk Confirmation Dialog */}
      {showBulkConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-dialog-open>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBulkConfirmDialog(false)} />
          <div ref={bulkDialogRef} className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="bulk-dialog-title">
            <h3 id="bulk-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {bulkMode === "accept" ? "Konfirmasi Batch" : "Tolak Batch Sampel"}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {bulkMode === "accept"
                ? `Yakin konfirmasi ${selectedIds.size} sampel sebagai Acceptable? Aksi ini tidak dapat dibatalkan.`
                : `Tolak ${selectedIds.size} sampel. Pilih kondisi dan alasan penolakan.`}
            </p>

            {/* FUNC-GAP-04: Barcode verification safety check for bulk accept */}
            {bulkMode === "accept" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Pastikan semua tabung sampel berikut telah diverifikasi identitasnya melalui barcode:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {orders.filter((o) => selectedIds.has(o.id)).map((o) => (
                      <span key={o.id} className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-900 shadow-sm border border-amber-200 dark:bg-slate-800 dark:text-amber-200 dark:border-amber-700">
                        {o.orderNumber}
                      </span>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkBarcodeVerified}
                    onChange={(e) => setBulkBarcodeVerified(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/50 dark:border-slate-600"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Saya telah memverifikasi barcode pada <strong>semua {selectedIds.size} tabung sampel</strong> dan memastikan identitas pasien sesuai dengan order.
                  </span>
                </label>
              </div>
            )}

            {/* UX-GAP-04: Reject options */}
            {bulkMode === "reject" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Kondisi Sampel</label>
                  <select
                    value={bulkRejectCondition}
                    onChange={(e) => setBulkRejectCondition(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {SAMPLE_CONDITIONS.filter((c) => c.value !== "ACCEPTABLE").map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Alasan Penolakan</label>
                  <textarea
                    rows={2}
                    value={bulkRejectReason}
                    onChange={(e) => setBulkRejectReason(e.target.value)}
                    placeholder="Jelaskan alasan penolakan batch..."
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowBulkConfirmDialog(false); setBulkRejectReason(""); setBulkBarcodeVerified(false); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={bulkConfirming || (bulkMode === "accept" && !bulkBarcodeVerified) || (bulkMode === "reject" && !bulkRejectReason.trim())}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-50",
                  bulkMode === "accept" ? "bg-brand hover:bg-brand-dark" : "bg-red-600 hover:bg-red-700"
                )}
              >
                {bulkConfirming ? "Memproses..." : bulkMode === "accept" ? `Konfirmasi ${selectedIds.size} Sampel` : `Tolak ${selectedIds.size} Sampel`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATA-GAP-04: History date range filter */}
      {activeTab === "HISTORY" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Dari:</label>
            <input
              type="date"
              value={historyDateFrom}
              onChange={(e) => { setHistoryDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Sampai:</label>
            <input
              type="date"
              value={historyDateTo}
              onChange={(e) => { setHistoryDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">Status:</label>
            <select
              value={historyStatus}
              onChange={(e) => { setHistoryStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            >
              <option value="ALL">Semua Status</option>
              <option value="APPROVED">Selesai (Approved)</option>
              <option value="NOTIFIED">Terkirim (Notified)</option>
              <option value="CANCELLED">Dibatalkan</option>
              <option value="PAID">Terbayar</option>
              <option value="IN_ANALYSIS">Proses Analisa</option>
              <option value="VERIFIED">Terverifikasi</option>
            </select>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-brand/5">
              {/* UX-LAB-06: Bulk select checkbox */}
              <th className="w-10 px-3 py-3">
                {paidOrders.length > 0 && (
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-brand" aria-label="Select all">
                    {allPaidSelected ? <CheckSquare className="h-4 w-4 text-brand" /> : <Square className="h-4 w-4" />}
                  </button>
                )}
              </th>
              <th className="px-4 py-3 font-semibold text-brand">No. Order</th>
              <th className="px-4 py-3 font-semibold text-brand">Pasien</th>
              <th className="px-4 py-3 font-semibold text-brand hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 font-semibold text-brand hidden md:table-cell">Waktu</th>
              <th className="px-4 py-3 font-semibold text-brand text-right">Tes</th>
              <th className="w-10 px-4 py-3" aria-label="Expand"></th>
            </tr>
          </thead>
          <tbody ref={tableBodyRef} role="rowgroup">
            {currentLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    Memuat antrian...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3" role="alert">
                    <AlertCircle className="h-10 w-10 text-red-400 dark:text-red-500" />
                    <p className="font-medium text-red-700 dark:text-red-300">{error}</p>
                    <button onClick={() => refetch()} className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                      Coba Lagi
                    </button>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
                      <FlaskConical className="h-8 w-8 text-brand" />
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {debouncedSearch || activeTab !== "ALL" ? "Antrean Tidak Ditemukan" : "Antrean Laboratorium Kosong"}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                      {debouncedSearch || activeTab !== "ALL"
                        ? "Tidak ada order yang sesuai dengan pencarian atau filter."
                        : "Semua pemeriksaan saat ini sudah diproses."}
                    </p>
                    {(debouncedSearch || activeTab !== "ALL") && (
                      <button
                        onClick={() => { setSearch(""); handleTabChange("ALL"); }}
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
              orders.map((order, index) => {
                const isExpanded = expandedOrderId === order.id;
                const isSelected = selectedIds.has(order.id);
                return (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isExpanded={isExpanded}
                    isSelected={isSelected}
                    isFocused={focusedRowIndex === index}
                    rowIndex={index}
                    totalRows={orders.length}
                    activeTab={activeTab}
                    onToggle={() => toggleExpand(order.id)}
                    onSelect={() => toggleSelect(order.id)}
                    onFocusRow={setFocusedRowIndex}
                    confirmSampleMutation={confirmSampleMutation}
                    verifyMutation={verifyMutation}
                    recallMutation={recallMutation}
                    queryClient={queryClient}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {orders.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems} order
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[80px] text-center text-sm font-medium text-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}

// ---------- Authenticated Barcode Image ----------

function AuthenticatedBarcodeImage({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("elis_token") || localStorage.getItem("token") || sessionStorage.getItem("token") : null;
    fetch(`/api/v1/orders/${orderId}/barcode.png`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => { if (!res.ok) throw new Error("Failed"); return res.blob(); })
      .then((blob) => { if (!cancelled) setDataUrl(URL.createObjectURL(blob)); })
      .catch(() => { if (!cancelled) setDataUrl(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (loading) return <div className="h-12 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />;
  if (!dataUrl) return <p className="text-xs text-muted-foreground italic">Gagal memuat barcode</p>;
  return <img src={dataUrl} alt={`Barcode ${orderNumber}`} className="max-h-full object-contain" />;
}

// ---------- OrderRow Sub-component ----------

interface OrderRowProps {
  order: LabQueueOrder;
  isExpanded: boolean;
  isSelected: boolean;
  isFocused: boolean;
  rowIndex: number;
  totalRows: number;
  activeTab: QueueTab;
  onToggle: () => void;
  onSelect: () => void;
  onFocusRow: (index: number) => void;
  confirmSampleMutation: ReturnType<typeof useConfirmSample>;
  verifyMutation: ReturnType<typeof useVerifyResults>;
  recallMutation: ReturnType<typeof useRecallOrder>;
  queryClient: ReturnType<typeof useQueryClient>;
}

function OrderRow({ order, isExpanded, isSelected, isFocused, rowIndex, totalRows, activeTab, onToggle, onSelect, onFocusRow, confirmSampleMutation, verifyMutation, recallMutation, queryClient }: OrderRowProps) {
  const {
    confirmSuccess, confirmError, barcodeError,
    showSampleDialog, setShowSampleDialog,
    selectedCondition, setSelectedCondition,
    rejectionReason, setRejectionReason,
    barcodeInput, setBarcodeInput, barcodeVerified, setBarcodeVerified,
    showRerunDialog, setShowRerunDialog,
    rerunTestId, setRerunTestId,
    rerunReason, setRerunReason,
    rerunSubmitting, rerunError,
    tatOverdue, elapsed,
    isRejectedSample, isDoctorRejected, isCito,
    resultsCompleted, resultsTotal, allResultsEntered, hasCriticalFlag,
    handleConfirmSample, handlePrintBarcode, handleRerunSubmit, handleRowKeyDown,
    rowRef, sampleDialogRef, rerunDialogRef,
  } = useOrderRowState(order, isFocused, rowIndex, totalRows, onToggle, onSelect, onFocusRow, confirmSampleMutation, queryClient);

  return (
    <>
      <tr
        ref={rowRef}
        onClick={onToggle}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="row"
        aria-expanded={isExpanded}
        className={cn(
          "cursor-pointer border-b border-border transition-colors hover:bg-brand/5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50",
          isExpanded && "bg-brand/5",
          isSelected && "bg-brand/10",
          // UX-GAP-07: Prominent styling for rejected samples
          isRejectedSample && "border-l-4 border-l-red-400 bg-red-50/50 hover:bg-red-50 dark:border-l-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/30",
          // BP-GAP-01: Prominent styling for doctor-rejected orders
          isDoctorRejected && "border-l-4 border-l-amber-400 bg-amber-50/50 hover:bg-amber-50 dark:border-l-amber-500 dark:bg-amber-950/20 dark:hover:bg-amber-950/30"
        )}
      >
        {/* UX-LAB-06: Checkbox */}
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          {order.status === "PAID" && activeTab !== "COMPLETED_TODAY" && (
            <button onClick={onSelect} className="text-muted-foreground hover:text-brand" aria-label={`Select ${order.orderNumber}`}>
              {isSelected ? <CheckSquare className="h-4 w-4 text-brand" /> : <Square className="h-4 w-4" />}
            </button>
          )}
          {activeTab === "COMPLETED_TODAY" && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-semibold text-brand">{order.orderNumber}</span>
          {/* UX-GAP-07: Enhanced rejected sample indicator */}
          {isRejectedSample && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">
              <AlertTriangle className="h-3 w-3" /> Re-sampling
            </span>
          )}
          {/* BP-GAP-01: Doctor-rejected order indicator */}
          {isDoctorRejected && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <RotateCcw className="h-3 w-3" /> Perlu Revisi
            </span>
          )}
          {/* DATA-GAP-08: CITO/URGENT priority badge */}
          {isCito && (
            <span className={cn(
              "ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold text-white",
              order.priority === "CITO" ? "bg-red-600" : "bg-orange-500"
            )}>
              {order.priority === "CITO" ? "CITO" : "URGENT"}
            </span>
          )}
          {/* DATA-GAP-11: Dual-approval indicator for VERIFIED orders */}
          {hasCriticalFlag && order.status === "VERIFIED" && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" title="Order ini mengandung hasil CRITICAL dan membutuhkan persetujuan 2 dokter">
              <ShieldAlert className="h-3 w-3" /> Dual Approval
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{order.patientName}</p>
          <p className="text-xs text-muted-foreground">{order.patientMrn}</p>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          {activeTab === "COMPLETED_TODAY" ? (
            <div className="flex flex-col">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Selesai
              </span>
              {order.approvedAt && (
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(order.approvedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          ) : (
            <LabStatusBadge status={order.status} />
          )}
        </td>
        {/* UX-LAB-05: TAT column with elapsed time */}
        <td className="px-4 py-3 hidden md:table-cell">
          {activeTab === "COMPLETED_TODAY" ? (
            <div className="flex flex-col text-xs text-muted-foreground">
              <span>{order.approvedAt ? new Date(order.approvedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Clock className={cn("h-3 w-3", tatOverdue ? "text-red-500" : "text-muted-foreground")} />
              <span className={cn("text-xs font-medium", tatOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                {elapsed}
              </span>
              {tatOverdue && (
                <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  OVERDUE
                </span>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {/* DATA-GAP-10: Progress indicator for IN_ANALYSIS/SAMPLE_COLLECTED */}
          {(order.status === "IN_ANALYSIS" || order.status === "SAMPLE_COLLECTED") && resultsTotal > 0 ? (
            <div className="flex items-center justify-end gap-2">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${(resultsCompleted / resultsTotal) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{resultsCompleted}/{resultsTotal}</span>
            </div>
          ) : (
            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand/10 px-2 text-xs font-bold text-brand">
              {order.details.length}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="border-b border-border bg-brand/[0.02]">
          <td colSpan={7} className="px-4 py-4">
            <OrderExpandedDetail
              order={order}
              isDoctorRejected={isDoctorRejected}
              confirmError={confirmError}
              barcodeError={barcodeError}
              confirmSuccess={confirmSuccess}
              selectedCondition={selectedCondition}
              allResultsEntered={allResultsEntered}
              activeTab={activeTab}
              confirmSampleMutation={confirmSampleMutation}
              verifyMutation={verifyMutation}
              recallMutation={recallMutation}
              handlePrintBarcode={handlePrintBarcode}
              onOpenSampleDialog={() => setShowSampleDialog(true)}
              onOpenRerunDialog={() => setShowRerunDialog(true)}
              rerunDialog={
                <RerunDialog
                  show={showRerunDialog}
                  order={order}
                  rerunTestId={rerunTestId}
                  rerunReason={rerunReason}
                  rerunSubmitting={rerunSubmitting}
                  rerunError={rerunError}
                  dialogRef={rerunDialogRef}
                  onClose={() => { setShowRerunDialog(false); setRerunTestId(null); setRerunReason(""); }}
                  onSelectTest={setRerunTestId}
                  onChangeReason={setRerunReason}
                  onSubmit={handleRerunSubmit}
                />
              }
              sampleDialog={
                <SampleConditionDialog
                  show={showSampleDialog}
                  order={order}
                  selectedCondition={selectedCondition}
                  rejectionReason={rejectionReason}
                  barcodeInput={barcodeInput}
                  barcodeVerified={barcodeVerified}
                  confirmError={confirmError}
                  isPending={confirmSampleMutation.isPending}
                  dialogRef={sampleDialogRef}
                  onClose={() => { setShowSampleDialog(false); setSelectedCondition("ACCEPTABLE"); setRejectionReason(""); setBarcodeInput(""); setBarcodeVerified(false); }}
                  onSelectCondition={setSelectedCondition}
                  onChangeRejectionReason={setRejectionReason}
                  onChangeBarcodeInput={(val, verified) => { setBarcodeInput(val); setBarcodeVerified(verified); }}
                  onConfirm={handleConfirmSample}
                />
              }
            />
          </td>
        </tr>
      )}
    </>
  );
}
