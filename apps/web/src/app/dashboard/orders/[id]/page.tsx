"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Printer, User,
  CreditCard, Banknote, Building2, ReceiptText,
  FlaskConical, Clock, Loader2, Split, Landmark, ShieldCheck, AlertTriangle
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { PaymentMethod } from "@/types/order";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { BpjsForm } from "@/components/orders/bpjs-form";
import { ClaimsForm } from "@/components/orders/claims-form";
import { SplitPaymentForm } from "@/components/orders/split-payment-form";
import { PatientAvatar } from "@/components/patients/PatientAvatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

// ─── Local types matching API response ──────────────────────────────────────

interface OrderDetailApi {
  id: string;
  testId: string;
  status: string;
  resultValue?: number | string;
  flag?: "NORMAL" | "LOW" | "HIGH" | "CRITICAL";
  price: number;
  discount: number;
  finalPrice: number;
  test: {
    code: string;
    name: string;
    unit: string;
  };
}

interface OrderApi {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  paymentMethod?: string;
  amountPaid?: number;
  paidAt?: string;
  barcode?: string;
  barcodeImage?: string;
  depositAmount?: number;
  discountAmount?: number;
  patient: {
    name: string;
    mrn: string;
  };
  orderDetails: OrderDetailApi[];
  orderInsurances?: Array<{ claimStatus: string }>;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "CASH", label: "Tunai", icon: Banknote, desc: "Pembayaran uang tunai" },
  { value: "TRANSFER", label: "Transfer Bank", icon: Building2, desc: "Via m-banking / i-banking" },
  { value: "EDC", label: "EDC / Kartu", icon: CreditCard, desc: "Debit / Kredit / QRIS" },
  { value: "INSURANCE", label: "Asuransi", icon: ShieldCheck, desc: "Klaim asuransi swasta" },
  { value: "BPJS", label: "BPJS", icon: Landmark, desc: "Jaminan kesehatan nasional" },
  { value: "INSURANCE_CASH_FALLBACK", label: "Asuransi (Tunai Fallback)", icon: Banknote, desc: "Tunai pengganti klaim ditolak" },
  { value: "CORPORATE_DEFERRED", label: "Korporat (Tertunda)", icon: Building2, desc: "Tagihan korporat ditangguhkan" },
];

/* ────────────────────────────────────────────────────────────────
   NUMPAD COMPONENT
──────────────────────────────────────────────────────────────── */
function Numpad({ onPress }: { onPress: (v: string) => void }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "000", "0", "⌫"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button
          key={k}
          id={`numpad-${k}`}
          onClick={() => onPress(k)}
          className={cn(
            "flex h-12 items-center justify-center rounded-xl border text-base font-semibold transition-all active:scale-95",
            k === "⌫"
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-brand/50 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand dark:hover:text-brand"
          )}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   SUCCESS MODAL
──────────────────────────────────────────────────────────────── */
function SuccessModal({ order, onClose }: { order: OrderApi; onClose: () => void }) {
  const handlePrint = () => {
    // Open receipt in new window for printing
    const printWindow = window.open(`/dashboard/orders/${order.id}/report?print=1`, "_blank");
    if (!printWindow) {
      // Fallback: navigate to receipt page
      window.location.href = `/dashboard/orders/${order.id}/report`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
          <CheckCircle2 className="h-9 w-9 text-brand" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pembayaran Berhasil!</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Order <span className="font-semibold text-brand">{order.orderNumber}</span> telah lunas.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Bayar</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(Number(order.totalAmount))}</span>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            id="payment-success-print"
            onClick={handlePrint}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Printer className="h-4 w-4" /> Cetak
          </button>
          <button
            id="payment-success-close"
            onClick={onClose}
            className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ORDER STATUS TIMELINE
──────────────────────────────────────────────────────────────── */
const ORDER_WORKFLOW_STEPS = [
  { status: "PENDING_PAYMENT", label: "Pembayaran", icon: CreditCard },
  { status: "PAID", label: "Lunas", icon: CheckCircle2 },
  { status: "SAMPLE_COLLECTED", label: "Sampel", icon: FlaskConical },
  { status: "IN_ANALYSIS", label: "Analisa", icon: FlaskConical },
  { status: "VERIFIED", label: "Verifikasi", icon: CheckCircle2 },
  { status: "APPROVED", label: "Selesai", icon: CheckCircle2 },
] as const;

function OrderStatusTimeline({ currentStatus }: { currentStatus: string }) {
  // Map status to step index (how far along the workflow)
  const STATUS_ORDER: Record<string, number> = {
    PENDING_PAYMENT: 0,
    PAYMENT_OVERDUE: 0,
    DEPOSIT_RECEIVED: 0,
    PAID: 1,
    SAMPLE_COLLECTED: 2,
    IN_ANALYSIS: 3,
    VERIFIED: 4,
    APPROVED: 5,
    NOTIFIED: 5,
    CANCELLED: -1,
  };

  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  if (currentStatus === "CANCELLED") {
    return null; // Don't show timeline for cancelled orders
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between overflow-x-auto gap-0">
        {ORDER_WORKFLOW_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const isLast = idx === ORDER_WORKFLOW_STEPS.length - 1;

          return (
            <div key={step.status} className="flex flex-1 items-center min-w-0">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                    isCurrent
                      ? "border-brand bg-brand text-white shadow-sm shadow-brand/30"
                      : isCompleted
                        ? "border-brand/50 bg-brand/10 text-brand dark:border-brand/40 dark:bg-brand/20"
                        : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    isCurrent
                      ? "text-brand font-semibold"
                      : isCompleted
                        ? "text-brand/70 dark:text-brand/60"
                        : "text-slate-400 dark:text-slate-600"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1.5 rounded-full transition-all",
                    idx < currentIndex
                      ? "bg-brand/40 dark:bg-brand/30"
                      : "bg-slate-200 dark:bg-slate-700"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   NEXT STEP ACTION PANEL — Contextual workflow guidance
──────────────────────────────────────────────────────────────── */
function NextStepPanel({ order }: { order: OrderApi }) {
  const status = order.status;

  // Don't show for terminal states or pre-payment
  if (status === "PENDING_PAYMENT" || status === "PAYMENT_OVERDUE" || status === "DEPOSIT_RECEIVED" || status === "NOTIFIED" || status === "CANCELLED") {
    return null;
  }

  const steps: Record<string, { title: string; description: string; action: string; href: string; icon: React.ElementType; color: string }> = {
    PAID: {
      title: "Langkah Berikutnya: Pengambilan Sampel",
      description: "Order sudah lunas. Sampel pasien perlu diambil dan dikonfirmasi di menu Antrian Laboratorium.",
      action: "Buka Antrian Lab",
      href: "/dashboard/laboratory/queue",
      icon: FlaskConical,
      color: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
    },
    SAMPLE_COLLECTED: {
      title: "Langkah Berikutnya: Input Hasil Pemeriksaan",
      description: "Sampel sudah diterima. Analis dapat mulai menginput hasil pemeriksaan.",
      action: "Input Hasil",
      href: `/dashboard/laboratory/results/${order.id}`,
      icon: FlaskConical,
      color: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
    },
    IN_ANALYSIS: {
      title: "Langkah Berikutnya: Verifikasi Hasil",
      description: "Hasil sedang diinput/diproses. Setelah semua parameter terisi, analis dapat memverifikasi.",
      action: "Lihat Hasil",
      href: `/dashboard/laboratory/results/${order.id}`,
      icon: ShieldCheck,
      color: "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/40",
    },
    VERIFIED: {
      title: "Langkah Berikutnya: Approval Dokter",
      description: "Hasil telah diverifikasi analis. Menunggu persetujuan dokter penanggung jawab.",
      action: "Buka Approval",
      href: "/dashboard/laboratory/approval",
      icon: ShieldCheck,
      color: "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40",
    },
    APPROVED: {
      title: "Order Selesai",
      description: "Hasil pemeriksaan telah disetujui. Laporan dapat dicetak atau dikirim ke pasien.",
      action: "Cetak Laporan",
      href: `/api/v1/orders/${order.id}/report/pdf`,
      icon: CheckCircle2,
      color: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
    },
  };

  const step = steps[status];
  if (!step) return null;

  const Icon = step.icon;

  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", step.color)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm dark:bg-slate-900/50">
            <Icon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{step.title}</h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{step.description}</p>
          </div>
        </div>
        <a
          href={step.href}
          target={status === "APPROVED" ? "_blank" : undefined}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
        >
          <Icon className="h-4 w-4" />
          {step.action}
        </a>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   PAYMENT HISTORY TIMELINE
──────────────────────────────────────────────────────────────── */
interface PaymentComponentItem {
  id: string;
  paymentMethod: string;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  insurance?: { name: string; code: string } | null;
}

function PaymentHistory({ orderId }: { orderId: string }) {
  const [components, setComponents] = useState<PaymentComponentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getPaymentHistory(orderId).then((res) => {
      const raw = res as unknown as Record<string, unknown>;
      let data: unknown[] = [];
      if (Array.isArray(raw)) {
        data = raw;
      } else if (raw && typeof raw === "object" && "data" in raw) {
        const inner = raw.data;
        if (Array.isArray(inner)) data = inner;
        else if (inner && typeof inner === "object" && "data" in (inner as object)) {
          const nested = (inner as Record<string, unknown>).data;
          if (Array.isArray(nested)) data = nested;
        }
      }
      setComponents(data as PaymentComponentItem[]);
    }).catch(() => {
      setComponents([]);
    }).finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="h-4 w-40 animate-pulse rounded bg-muted mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-3 w-3 rounded-full animate-pulse bg-muted mt-1" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (components.length === 0) return null;

  const METHOD_LABELS: Record<string, string> = {
    CASH: "Tunai",
    TRANSFER: "Transfer Bank",
    EDC: "EDC / Kartu",
    INSURANCE: "Asuransi",
    BPJS: "BPJS",
    INSURANCE_CASH_FALLBACK: "Tunai (Fallback Asuransi)",
    CORPORATE_DEFERRED: "Korporat (Tertunda)",
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <ReceiptText className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Riwayat Pembayaran ({components.length} komponen)
        </span>
      </div>
      <div className="p-5">
        <div className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200 dark:before:bg-slate-700">
          {components.map((comp, idx) => (
            <div key={comp.id} className="relative">
              {/* Timeline dot */}
              <div className={cn(
                "absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2",
                idx === 0
                  ? "border-brand bg-brand/20"
                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
              )} />
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {METHOD_LABELS[comp.paymentMethod] || comp.paymentMethod}
                  </span>
                  <span className="text-sm font-bold text-brand">
                    {formatRupiah(Number(comp.amount))}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {new Date(comp.paidAt).toLocaleString("id-ID", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  {comp.reference && (
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      Ref: {comp.reference}
                    </span>
                  )}
                  {comp.insurance && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {comp.insurance.name}
                    </span>
                  )}
                </div>
                {comp.notes && (
                  <p className="mt-1.5 text-xs italic text-slate-400 dark:text-slate-500">{comp.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   MAIN POS PAGE
──────────────────────────────────────────────────────────────── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // Roles that can process payments (have payments:process permission)
  const canProcessPayment = user && ["SUPER_ADMIN", "ADMIN", "KASIR"].includes(user.role);

  const [order, setOrder] = useState<OrderApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [discount, setDiscount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<"single" | "split" | "deposit">("single");
  const [depositInput, setDepositInput] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [showConfirmPay, setShowConfirmPay] = useState(false);

  // Discount approval state
  const [discountApproval, setDiscountApproval] = useState<{
    exists: boolean;
    status: string | null;
    data: { discountAmount?: number; discountReason?: string } | null;
  } | null>(null);
  const [discountReason, setDiscountReason] = useState("");
  const [isRequestingDiscount, setIsRequestingDiscount] = useState(false);
  const [discountApprovalError, setDiscountApprovalError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    apiClient
      .getOrder(id)
      .then((res) => {
        // unwrapResponse strips the { success, message, data } envelope
        // so res is either the order directly or { data: order } if double-wrapped
        const raw = res as unknown as Record<string, unknown>;
        let data: OrderApi | null = null;
        if (raw && typeof raw === 'object' && 'orderNumber' in raw) {
          // Already unwrapped - res IS the order
          data = raw as unknown as OrderApi;
        } else if (raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object') {
          // Still wrapped: { data: OrderApi }
          data = raw.data as OrderApi;
        }
        setOrder(data);
      })
      .catch((err) => {
        setError(err?.message || "Gagal memuat data order");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Load discount approval status for this order
  useEffect(() => {
    if (!id) return;
    apiClient.getDiscountApprovalForOrder(id).then((res) => {
      const raw = res as unknown as Record<string, unknown>;
      let data: Record<string, unknown> | null = null;
      if (raw && typeof raw === "object" && "exists" in raw) {
        data = raw;
      } else if (raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object") {
        data = raw.data as Record<string, unknown>;
      }
      if (data) {
        setDiscountApproval({
          exists: !!data.exists,
          status: (data.status as string) || null,
          data: (data.data as { discountAmount?: number; discountReason?: string }) || null,
        });
      }
    }).catch(() => {
      // Silently fail — approval status not critical for page load
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] space-y-6 p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
        </div>
        {/* Content cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
        {/* Table skeleton */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="h-5 w-36 animate-pulse rounded bg-muted mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ReceiptText className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500">{error || "Order tidak ditemukan."}</p>
        <button onClick={() => router.back()} className="text-sm text-brand hover:underline">Kembali</button>
      </div>
    );
  }

  const subtotal = order.orderDetails.reduce((s, d) => s + Number(d.price), 0);
  const discountAmount = discount ? parseFloat(discount.replace(/\D/g, "")) : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const cashPaid = parseInt(cashInput.replace(/\D/g, "") || "0", 10);
  const change = Math.max(0, cashPaid - total);
  const canPay = (order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_OVERDUE" || order.status === "DEPOSIT_RECEIVED") && (paymentMethod !== "CASH" || cashPaid >= total);

  const handleNumpad = (k: string) => {
    setCashInput((prev) => {
      const digits = prev.replace(/\D/g, "");
      if (k === "⌫") return digits.slice(0, -1);
      const next = digits + k;
      return parseInt(next, 10).toLocaleString("id-ID");
    });
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      await apiClient.payOrder(id, {
        paymentMethod,
        amountPaid: paymentMethod === "CASH" ? cashPaid : total,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
      });
      // Reload order to get updated state
      const res = await apiClient.getOrder(id);
      const raw = res as unknown as Record<string, unknown>;
      let data: OrderApi | null = null;
      if (raw && typeof raw === 'object' && 'orderNumber' in raw) {
        data = raw as unknown as OrderApi;
      } else if (raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object') {
        data = raw.data as OrderApi;
      }
      if (data) setOrder(data);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Pembayaran gagal";
      setPayError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const alreadyPaid = order.status !== "PENDING_PAYMENT" && order.status !== "PAYMENT_OVERDUE" && order.status !== "DEPOSIT_RECEIVED";

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            id="order-detail-back"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {order.orderNumber}
              </h1>
              <OrderStatusBadge status={order.status as import("@/types/order").OrderStatus} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        {/* Order Status Timeline */}
        <OrderStatusTimeline currentStatus={order.status} />

        {/* Next Step Action Panel — contextual workflow guidance */}
        <NextStepPanel order={order} />

        {/* POS Layout */}
        <div className="grid gap-5 lg:grid-cols-5">

          {/* LEFT: Invoice Detail */}
          <div className="space-y-4 lg:col-span-3">

            {/* Patient info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <User className="h-3.5 w-3.5" /> Informasi Pasien
              </div>
              <div className="flex items-center gap-3">
                <PatientAvatar name={order.patient.name} size="md" className="h-10 w-10 text-sm" />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{order.patient.name}</div>
                  <div className="font-mono text-xs text-brand">{order.patient.mrn}</div>
                </div>
              </div>
            </div>

            {/* BPJS Details */}
            {order.paymentMethod === "BPJS" && (
              <BpjsForm orderId={order.id} />
            )}

            {/* Claims Form */}
            <ClaimsForm orderId={order.id} orderTotal={order.totalAmount} />

            {/* Fallback Payment – shown when at least one claim was rejected */}
            {order.orderInsurances?.some((oi) => oi.claimStatus === "rejected") && (
              <SplitPaymentForm
                orderId={order.id}
                orderTotal={order.totalAmount}
                isFallback
                onSuccess={() => {
                  apiClient.getOrder(id).then((res) => {
                    const raw = res as unknown as Record<string, unknown>;
                    if (raw && "orderNumber" in raw) setOrder(raw as unknown as OrderApi);
                    else if (raw?.data && typeof raw.data === "object") setOrder(raw.data as OrderApi);
                  });
                }}
              />
            )}

            {/* Deposit Info Banner — shown when deposit has been received */}
            {order.status === "DEPOSIT_RECEIVED" && order.depositAmount && (
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-800 dark:bg-cyan-900/20">
                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                  <Banknote className="h-5 w-5" />
                  <span className="font-semibold">Deposit Telah Diterima</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Deposit Dibayar</p>
                    <p className="font-bold text-cyan-700 dark:text-cyan-300">{formatRupiah(Number(order.depositAmount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Total Tagihan</p>
                    <p className="font-bold text-cyan-700 dark:text-cyan-300">{formatRupiah(Number(order.totalAmount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70">Sisa Tagihan</p>
                    <p className="font-bold text-red-600 dark:text-red-400">
                      {formatRupiah(Math.max(0, Number(order.totalAmount) - Number(order.depositAmount)))}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-cyan-600 dark:text-cyan-400">
                  Lakukan pelunasan untuk melanjutkan proses pemeriksaan laboratorium.
                </p>
              </div>
            )}

            {/* Test items */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 mt-4">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <FlaskConical className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Daftar Pemeriksaan ({order.orderDetails.length} item)
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.orderDetails.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {d.test.code}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.test.name}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          {d.test.unit}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatRupiah(Number(d.price))}</span>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Diskon</span>
                  <div className="flex items-center gap-2">
                    {!alreadyPaid ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          id="order-discount-input"
                          type="text"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))}
                          placeholder="0"
                          disabled={discountApproval?.exists && discountApproval.status === "APPROVED"}
                          className="h-7 w-28 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        />
                        {discountAmount > 0 && !discountApproval?.exists && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400" title="Diskon memerlukan persetujuan">
                            *perlu approval
                          </span>
                        )}
                        {discountApproval?.exists && discountApproval.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Disetujui
                          </span>
                        )}
                        {discountApproval?.exists && discountApproval.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" /> Menunggu
                          </span>
                        )}
                        {discountApproval?.exists && discountApproval.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" /> Ditolak
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-brand">-{formatRupiah(discountAmount)}</span>
                    )}
                  </div>
                </div>
                {/* Discount approval workflow */}
                {!alreadyPaid && discountAmount > 0 && (
                  <div className="space-y-2">
                    {/* Case 1: No approval request yet — show form to request */}
                    {!discountApproval?.exists && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          Diskon memerlukan persetujuan Manager/Owner
                        </p>
                        <div className="space-y-2">
                          <input
                            id="discount-reason-input"
                            type="text"
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            placeholder="Alasan diskon (wajib diisi)..."
                            className="h-8 w-full rounded-lg border border-amber-300 bg-white px-3 text-xs outline-none placeholder:text-slate-400 focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-amber-700 dark:bg-slate-900 dark:text-white"
                          />
                          {discountApprovalError && (
                            <p className="text-[11px] text-red-600 dark:text-red-400">{discountApprovalError}</p>
                          )}
                          <button
                            id="discount-request-btn"
                            onClick={async () => {
                              if (!discountReason.trim()) {
                                setDiscountApprovalError("Alasan diskon wajib diisi");
                                return;
                              }
                              setIsRequestingDiscount(true);
                              setDiscountApprovalError(null);
                              try {
                                const discountPercent = Math.min(100, Math.round((discountAmount / subtotal) * 100 * 100) / 100);
                                await apiClient.requestDiscountApproval({
                                  orderId: id,
                                  discountPercent,
                                  discountAmount,
                                  discountReason: discountReason.trim(),
                                });
                                // Reload approval status
                                const res = await apiClient.getDiscountApprovalForOrder(id);
                                const raw = res as unknown as Record<string, unknown>;
                                let data: Record<string, unknown> | null = null;
                                if (raw && "exists" in raw) data = raw;
                                else if (raw?.data && typeof raw.data === "object") data = raw.data as Record<string, unknown>;
                                if (data) {
                                  setDiscountApproval({
                                    exists: !!data.exists,
                                    status: (data.status as string) || null,
                                    data: (data.data as { discountAmount?: number; discountReason?: string }) || null,
                                  });
                                }
                                setDiscountReason("");
                              } catch (err: unknown) {
                                const msg = err && typeof err === "object" && "message" in err
                                  ? (err as { message: string }).message
                                  : "Gagal mengajukan persetujuan diskon";
                                setDiscountApprovalError(msg);
                              } finally {
                                setIsRequestingDiscount(false);
                              }
                            }}
                            disabled={isRequestingDiscount || !discountReason.trim()}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isRequestingDiscount ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Mengajukan...</>
                            ) : (
                              "Ajukan Persetujuan Diskon"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Case 2: Approval pending — show waiting status */}
                    {discountApproval?.exists && discountApproval.status === "PENDING" && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            Menunggu Persetujuan Diskon
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                          Diskon Rp {Number(discountApproval.data?.discountAmount || discountAmount).toLocaleString("id-ID")} sedang
                          menunggu persetujuan dari Manager/Owner. Pembayaran belum bisa diproses dengan diskon sampai disetujui.
                        </p>
                      </div>
                    )}

                    {/* Case 3: Approved — green confirmation */}
                    {discountApproval?.exists && discountApproval.status === "APPROVED" && (
                      <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                            Diskon Disetujui
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-green-600 dark:text-green-400">
                          Diskon Rp {Number(discountApproval.data?.discountAmount || discountAmount).toLocaleString("id-ID")} telah disetujui.
                          Anda dapat memproses pembayaran dengan diskon ini.
                        </p>
                      </div>
                    )}

                    {/* Case 4: Rejected — red notice with option to re-request */}
                    {discountApproval?.exists && discountApproval.status === "REJECTED" && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                          <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                            Diskon Ditolak
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                          Permintaan diskon sebelumnya ditolak. Anda dapat mengajukan ulang dengan alasan yang berbeda,
                          atau proses pembayaran tanpa diskon.
                        </p>
                        <button
                          onClick={() => setDiscountApproval(null)}
                          className="mt-2 text-[11px] font-semibold text-red-700 underline hover:no-underline dark:text-red-300"
                        >
                          Ajukan ulang diskon
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white">Total Tagihan</span>
                  <span className="text-lg font-bold text-brand">{formatRupiah(total)}</span>
                </div>
              </div>
            </div>

            {/* Already paid info */}
            {alreadyPaid && order.paidAt && (
              <div className="rounded-2xl border border-brand/30 bg-brand/10 p-5 dark:border-brand/50 dark:bg-brand/10">
                <div className="flex items-center gap-2 text-brand dark:text-brand">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Pembayaran Telah Diterima</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-brand/70">Metode</p>
                    <p className="font-semibold text-brand dark:text-brand">
                      {PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label ?? order.paymentMethod ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-brand/70">Waktu Bayar</p>
                    <p className="font-semibold text-brand dark:text-brand">
                      {order.paidAt ? new Date(order.paidAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History Timeline */}
            {alreadyPaid && <PaymentHistory orderId={order.id} />}
          </div>

          {/* RIGHT: Payment panel */}
          {!alreadyPaid && canProcessPayment && (
            <div className="space-y-4 lg:col-span-2">
              {/* Mode toggle */}
              <div className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  id="pay-mode-single"
                  onClick={() => setPayMode("single")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition",
                    payMode === "single"
                      ? "bg-brand text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400"
                  )}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Bayar Penuh
                </button>
                <button
                  id="pay-mode-split"
                  onClick={() => setPayMode("split")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition border-l border-slate-200 dark:border-slate-700",
                    payMode === "split"
                      ? "bg-brand text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400"
                  )}
                >
                  <Split className="h-3.5 w-3.5" /> Split / Parsial
                </button>
                <button
                  id="pay-mode-deposit"
                  onClick={() => setPayMode("deposit")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition border-l border-slate-200 dark:border-slate-700",
                    payMode === "deposit"
                      ? "bg-brand text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400"
                  )}
                >
                  <Banknote className="h-3.5 w-3.5" /> Deposit
                </button>
              </div>

              {payMode === "split" ? (
                <SplitPaymentForm
                  orderId={order.id}
                  orderTotal={total}
                  onSuccess={() => {
                    apiClient.getOrder(id).then((res) => {
                      const raw = res as unknown as Record<string, unknown>;
                      if (raw && "orderNumber" in raw) { setOrder(raw as unknown as OrderApi); setShowSuccess(true); }
                      else if (raw?.data && typeof raw.data === "object") { setOrder(raw.data as OrderApi); setShowSuccess(true); }
                    });
                  }}
                />
              ) : payMode === "deposit" ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-brand" />
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Pembayaran Deposit</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bayar sebagian (uang muka) tanpa menandai order sebagai lunas. Order akan berstatus &quot;Deposit Diterima&quot;.
                  </p>

                  {/* Payment method for deposit */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Metode</label>
                    <select
                      id="deposit-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Deposit amount */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Jumlah Deposit (Rp)</label>
                    <input
                      id="deposit-amount"
                      type="text"
                      inputMode="numeric"
                      value={depositInput}
                      placeholder="0"
                      onChange={(e) => setDepositInput(e.target.value.replace(/\D/g, ""))}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      Maksimal: {formatRupiah(total)}
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Catatan (Opsional)</label>
                    <textarea
                      id="deposit-notes"
                      rows={2}
                      value={depositNotes}
                      placeholder="Catatan pembayaran deposit..."
                      onChange={(e) => setDepositNotes(e.target.value)}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>

                  {payError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                      {payError}
                    </div>
                  )}

                  <button
                    id="deposit-submit-btn"
                    onClick={async () => {
                      const depositAmount = parseInt(depositInput.replace(/\D/g, "") || "0", 10);
                      if (depositAmount <= 0) {
                        setPayError("Jumlah deposit harus lebih dari 0");
                        return;
                      }
                      if (depositAmount > total) {
                        setPayError("Jumlah deposit tidak boleh melebihi total tagihan");
                        return;
                      }
                      setIsProcessing(true);
                      setPayError(null);
                      try {
                        await apiClient.depositPayment(id, {
                          paymentMethod,
                          depositAmount,
                          notes: depositNotes || undefined,
                        });
                        const res = await apiClient.getOrder(id);
                        const raw = res as unknown as Record<string, unknown>;
                        if (raw && "orderNumber" in raw) { setOrder(raw as unknown as OrderApi); }
                        else if (raw?.data && typeof raw.data === "object") { setOrder(raw.data as OrderApi); }
                        setDepositInput("");
                        setDepositNotes("");
                        setShowSuccess(true);
                      } catch (err: unknown) {
                        const message = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Pembayaran deposit gagal";
                        setPayError(message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing || !depositInput || parseInt(depositInput.replace(/\D/g, "") || "0", 10) <= 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isProcessing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                    ) : (
                      <><CheckCircle2 className="h-4 w-4" /> Kirim Deposit {depositInput ? formatRupiah(parseInt(depositInput.replace(/\D/g, "") || "0", 10)) : ""}</>
                    )}
                  </button>
                </div>
              ) : (
              <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Metode Pembayaran
                </p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <label
                        key={m.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                          paymentMethod === m.value
                            ? "border-brand bg-brand/10 ring-1 ring-brand/30 dark:border-brand dark:bg-brand/10"
                            : "border-slate-200 bg-white hover:border-brand/30 dark:border-slate-700 dark:bg-slate-900"
                        )}
                      >
                        <input type="radio" className="sr-only" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value)} />
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", paymentMethod === m.value ? "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.label}</div>
                          <div className="text-xs text-slate-400">{m.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Numpad (only for CASH) */}
              {paymentMethod === "CASH" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Jumlah Uang Tunai</p>
                  <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs text-slate-400">Jumlah Bayar</p>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {cashInput ? `Rp ${cashInput}` : "Rp 0"}
                    </p>
                  </div>
                  <Numpad onPress={handleNumpad} />
                  {cashPaid > 0 && (
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-900">
                      <span className="text-slate-500">Kembalian</span>
                      <span className={cn("font-bold", change >= 0 ? "text-brand" : "text-red-600")}>
                        {formatRupiah(change)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Non-CASH payment summary */}
              {paymentMethod !== "CASH" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Ringkasan Pembayaran</p>
                  <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-4 text-center dark:border-brand/30 dark:bg-brand/10">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total yang akan dibayar</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-brand">
                      {formatRupiah(total)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      via {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Error Banner */}
              {payError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  {payError}
                </div>
              )}

              {/* Pay button */}
              <button
                id="order-pay-btn"
                onClick={() => setShowConfirmPay(true)}
                disabled={!canPay || isProcessing}
                className="w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  `Bayar ${formatRupiah(total)}`
                )}
              </button>

              {/* Payment Confirmation Dialog */}
              {showConfirmPay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirmPay(false)} />
                  <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white">Konfirmasi Pembayaran</h3>
                    <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                      Pastikan data pembayaran sudah benar sebelum memproses.
                    </p>
                    <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Metode</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Tagihan</span>
                        <span className="font-bold text-brand">{formatRupiah(total)}</span>
                      </div>
                      {paymentMethod === "CASH" && cashPaid > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Uang Diterima</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{formatRupiah(cashPaid)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Kembalian</span>
                            <span className="font-semibold text-brand">{formatRupiah(change)}</span>
                          </div>
                        </>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Diskon</span>
                          <span className="font-semibold text-red-600">-{formatRupiah(discountAmount)}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={() => setShowConfirmPay(false)}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => { setShowConfirmPay(false); handlePay(); }}
                        className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
                      >
                        Ya, Proses Bayar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </div>
          )}
          {/* Notice for roles without payment permission */}
          {!alreadyPaid && !canProcessPayment && (
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-semibold text-sm">Pembayaran Belum Diproses</span>
                </div>
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Order ini belum dibayar. Hubungi kasir atau admin untuk memproses pembayaran.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSuccess && order && (
        <SuccessModal order={order} onClose={() => { setShowSuccess(false); router.push("/dashboard/orders"); }} />
      )}
    </>
  );
}
