"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Printer, User,
  CreditCard, Banknote, Building2, ReceiptText,
  FlaskConical, Clock
} from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import type { Order, PaymentMethod } from "@/types/order";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

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
];

/* ────────────────────────────────────────────────────────────────
   NUMPAD COMPONENT
──────────────────────────────────────────────────────────────── */
function Numpad({ onPress }: { onPress: (v: string) => void }) {
  const keys = ["7","8","9","4","5","6","1","2","3","000","0","⌫"];
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
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
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
function SuccessModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pembayaran Berhasil!</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Order <span className="font-semibold text-emerald-600">{order.orderNumber}</span> telah lunas.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-left dark:bg-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total Bayar</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(order.totalAmount)}</span>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            id="payment-success-print"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <Printer className="h-4 w-4" /> Cetak
          </button>
          <button
            id="payment-success-close"
            onClick={onClose}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Selesai
          </button>
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

  const [order, setOrder] = useState<Order | null>(
    () => MOCK_ORDERS.find((o) => o.id === id) ?? null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [discount, setDiscount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <ReceiptText className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500">Order tidak ditemukan.</p>
        <button onClick={() => router.back()} className="text-sm text-emerald-600 hover:underline">Kembali</button>
      </div>
    );
  }

  const subtotal = order.details.reduce((s, d) => s + d.price, 0);
  const discountAmount = discount ? parseFloat(discount.replace(/\D/g, "")) : (order.invoice?.discountAmount ?? 0);
  const total = Math.max(0, subtotal - discountAmount);
  const cashPaid = parseInt(cashInput.replace(/\D/g, "") || "0", 10);
  const change = Math.max(0, cashPaid - total);
  const canPay = order.status === "PENDING_PAYMENT" && (paymentMethod !== "CASH" || cashPaid >= total);

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
    await new Promise((r) => setTimeout(r, 1000));
    setOrder((o) => o ? { ...o, status: "PAID", invoice: { id: "inv-new", orderId: o.id, subtotal, discountAmount, total, paymentMethod, paidAt: new Date().toISOString() } } : o);
    setIsProcessing(false);
    setShowSuccess(true);
  };

  const alreadyPaid = order.status !== "PENDING_PAYMENT";

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
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {order.patientName.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{order.patientName}</div>
                  <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{order.patientMrn}</div>
                </div>
              </div>
              {order.notes && (
                <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  📝 {order.notes}
                </div>
              )}
            </div>

            {/* Test items */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <FlaskConical className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Daftar Pemeriksaan ({order.details.length} item)
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.details.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {d.test.code}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.test.name}</div>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" />
                          TAT {d.test.turnaroundHours} jam
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatRupiah(d.price)}</span>
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
                      <input
                        id="order-discount-input"
                        type="text"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        className="h-7 w-28 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                      />
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">-{formatRupiah(discountAmount)}</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                  <span className="font-bold text-slate-900 dark:text-white">Total Tagihan</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatRupiah(total)}</span>
                </div>
              </div>
            </div>

            {/* Already paid info */}
            {alreadyPaid && order.invoice && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-900/20">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Pembayaran Telah Diterima</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-emerald-600/70">Metode</p>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {PAYMENT_METHODS.find((m) => m.value === order.invoice!.paymentMethod)?.label ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600/70">Waktu Bayar</p>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {order.invoice.paidAt ? new Date(order.invoice.paidAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Payment panel */}
          {!alreadyPaid && (
            <div className="space-y-4 lg:col-span-2">
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
                            ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/20 dark:border-emerald-600 dark:bg-emerald-900/20"
                            : "border-slate-200 bg-white hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900"
                        )}
                      >
                        <input type="radio" className="sr-only" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value)} />
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", paymentMethod === m.value ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800")}>
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
                      <span className={cn("font-bold", change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600")}>
                        {formatRupiah(change)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Pay button */}
              <button
                id="order-pay-btn"
                onClick={handlePay}
                disabled={!canPay || isProcessing}
                className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-bold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Memproses...
                  </span>
                ) : (
                  `Bayar ${formatRupiah(total)}`
                )}
              </button>
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
