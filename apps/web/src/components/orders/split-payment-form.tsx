"use client";

import { useState } from "react";
import {
  Plus, Trash2, Loader2, CheckCircle2, AlertTriangle,
  Banknote, Building2, CreditCard, Split,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type PaymentMethod = "CASH" | "TRANSFER" | "EDC" | "BPJS" | "INSURANCE" | "INSURANCE_CASH_FALLBACK" | "CORPORATE_DEFERRED";

interface SplitComponent {
  id: string;
  paymentMethod: PaymentMethod;
  amount: string;
  reference: string;
}

interface Props {
  orderId: string;
  orderTotal: number;
  isFallback?: boolean;
  onSuccess?: () => void;
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: "CASH",                    label: "Tunai",                  icon: Banknote   },
  { value: "TRANSFER",                label: "Transfer",               icon: Building2  },
  { value: "EDC",                     label: "EDC / Kartu",            icon: CreditCard },
  { value: "BPJS",                    label: "BPJS",                   icon: Building2  },
  { value: "INSURANCE",               label: "Asuransi",               icon: Building2  },
  { value: "INSURANCE_CASH_FALLBACK", label: "Asuransi (Fallback)",    icon: Banknote   },
  { value: "CORPORATE_DEFERRED",      label: "Korporat (Tertunda)",    icon: Building2  },
];

function newComponent(): SplitComponent {
  return { id: Math.random().toString(36).slice(2), paymentMethod: "CASH", amount: "", reference: "" };
}

export function SplitPaymentForm({ orderId, orderTotal, isFallback = false, onSuccess }: Props) {
  const [components, setComponents] = useState<SplitComponent[]>([newComponent()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fbAmount, setFbAmount]       = useState(String(orderTotal));
  const [fbReference, setFbReference] = useState("");
  const [fbNotes, setFbNotes]         = useState("");

  const allocated = components.reduce((s, c) => s + (parseInt(c.amount || "0", 10) || 0), 0);
  const remaining = orderTotal - allocated;
  const isBalanced = Math.abs(remaining) < 1;

  function updateComponent(id: string, patch: Partial<SplitComponent>) {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function handleSplitSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = components.map((c) => ({
        paymentMethod: c.paymentMethod,
        amount: parseInt(c.amount || "0", 10) || 0,
        reference: c.reference || undefined,
      }));
      await apiClient.splitPay(orderId, payload);
      setSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message : "Gagal memproses split payment";
      setError(msg);
    } finally { setIsSubmitting(false); }
  }

  async function handleFallbackSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.fallbackPayment(orderId, {
        amount: parseInt(fbAmount || "0", 10) || 0,
        reference: fbReference || undefined,
        notes: fbNotes || undefined,
      });
      setSuccess(true);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err
        ? (err as { message: string }).message : "Gagal memproses pembayaran fallback";
      setError(msg);
    } finally { setIsSubmitting(false); }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <p className="font-semibold text-emerald-700 dark:text-emerald-300">
          {isFallback ? "Pembayaran fallback berhasil diproses!" : "Split payment berhasil!"}
        </p>
      </div>
    );
  }

  if (isFallback) {
    return (
      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Klaim Ditolak – Pembayaran Cash Fallback
          </p>
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-500">
          Pasien wajib melunasi tagihan secara tunai dalam 72 jam sejak penolakan klaim.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Jumlah (Rp)</label>
            <input id="fallback-amount" type="text" value={fbAmount}
              onChange={(e) => setFbAmount(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Referensi / No. Kwitansi</label>
            <input id="fallback-reference" type="text" value={fbReference} placeholder="Opsional"
              onChange={(e) => setFbReference(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Catatan</label>
            <textarea id="fallback-notes" rows={2} value={fbNotes} placeholder="Opsional"
              onChange={(e) => setFbNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </div>
        </div>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</p>
        )}
        <button id="fallback-submit-btn" onClick={handleFallbackSubmit}
          disabled={isSubmitting || !fbAmount}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Proses Pembayaran Fallback
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <Split className="h-4 w-4 text-brand" />
        <p className="text-sm font-bold text-slate-800 dark:text-white">Split Payment</p>
        <span className="ml-auto text-xs text-slate-500">Total: {formatRupiah(orderTotal)}</span>
      </div>

      {/* Balance bar */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-1.5 flex justify-between text-xs text-slate-500">
          <span>Dialokasikan</span>
          <span className={cn(isBalanced ? "text-emerald-600 font-semibold" : remaining < 0 ? "text-red-600 font-semibold" : "")}>
            {isBalanced ? "✓ Lunas" : remaining < 0 ? `Lebih ${formatRupiah(Math.abs(remaining))}` : `Sisa ${formatRupiah(remaining)}`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className={cn("h-full rounded-full transition-all", isBalanced ? "bg-emerald-500" : remaining < 0 ? "bg-red-500" : "bg-brand")}
            style={{ width: `${Math.min(100, orderTotal > 0 ? (allocated / orderTotal) * 100 : 0)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>{formatRupiah(allocated)}</span><span>{formatRupiah(orderTotal)}</span>
        </div>
      </div>

      {/* Components */}
      <div className="space-y-3">
        {components.map((comp, idx) => (
          <div key={comp.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Komponen {idx + 1}</span>
              {components.length > 1 && (
                <button id={`split-remove-${idx}`} onClick={() => setComponents((p) => p.filter((c) => c.id !== comp.id))}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Method picker */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase text-slate-500">Metode</label>
                <div className="grid grid-cols-4 gap-1">
                  {METHOD_OPTIONS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button key={m.value} id={`split-method-${idx}-${m.value}`}
                        onClick={() => updateComponent(comp.id, { paymentMethod: m.value })}
                        className={cn("flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-semibold transition",
                          comp.paymentMethod === m.value
                            ? "border-brand bg-brand/10 text-brand dark:border-brand dark:bg-brand/20"
                            : "border-slate-200 bg-white text-slate-600 hover:border-brand/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400")}>
                        <Icon className="h-3.5 w-3.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Amount + ref */}
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Jumlah (Rp)</label>
                  <div className="flex gap-1">
                    <input id={`split-amount-${idx}`} type="text" inputMode="numeric"
                      value={comp.amount} placeholder="0"
                      onChange={(e) => updateComponent(comp.id, { amount: e.target.value.replace(/\D/g, "") })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    {remaining > 0 && idx === components.length - 1 && (
                      <button id={`split-fill-${idx}`}
                        onClick={() => updateComponent(comp.id, { amount: String(remaining) })}
                        className="shrink-0 rounded-lg border border-brand/30 bg-brand/10 px-2 text-[10px] font-bold text-brand hover:bg-brand/20 dark:border-brand/50 transition">
                        Sisa
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Referensi</label>
                  <input id={`split-ref-${idx}`} type="text" value={comp.reference} placeholder="Opsional"
                    onChange={(e) => updateComponent(comp.id, { reference: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button id="split-add-component" onClick={() => setComponents((p) => [...p, newComponent()])}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm text-slate-500 transition hover:border-brand hover:text-brand dark:border-slate-700">
        <Plus className="h-4 w-4" /> Tambah Komponen
      </button>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</p>
      )}

      <button id="split-pay-submit" onClick={handleSplitSubmit}
        disabled={isSubmitting || !isBalanced || components.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40">
        {isSubmitting
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
          : <><CheckCircle2 className="h-4 w-4" /> Konfirmasi Split Payment</>}
      </button>
    </div>
  );
}
