"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import type { Order } from "@/types/order";
import { cn } from "@/lib/utils";

function evaluateResult(val: string, min?: number, max?: number): "NORMAL" | "LOW" | "HIGH" | null {
  if (!val || isNaN(Number(val))) return null;
  const num = Number(val);
  if (min !== undefined && num < min) return "LOW";
  if (max !== undefined && num > max) return "HIGH";
  return "NORMAL";
}

export default function InputResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const initialOrder = MOCK_ORDERS.find((o) => o.id === id);
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!order) {
    return (
      <div className="p-8 text-center text-slate-500">
        Order tidak ditemukan. <button onClick={() => router.back()} className="text-emerald-600 hover:underline">Kembali</button>
      </div>
    );
  }

  const handleInputChange = (detailId: string, value: string) => {
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        details: prev.details.map((d) => {
          if (d.id === detailId) {
            const flag = evaluateResult(value, d.test.minRef, d.test.maxRef);
            return { ...d, resultValue: value, resultFlag: flag || "NORMAL" };
          }
          return d;
        }),
      };
    });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard/laboratory");
    }, 1500);
  };

  if (success) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Hasil Disimpan!</h2>
        <p className="text-slate-500">Menunggu validasi dokter.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Input Hasil</h1>
            <p className="text-sm text-slate-500">Order: <span className="font-mono text-emerald-600 font-semibold">{order.orderNumber}</span></p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Hasil</>}
        </button>
      </div>

      {/* Patient Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Pasien</p>
            <p className="font-semibold text-slate-900">{order.patientName}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">MRN</p>
            <p className="font-mono font-semibold text-slate-900">{order.patientMrn}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Waktu Order</p>
            <p className="font-semibold text-slate-900">{new Date(order.createdAt).toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      {/* Results Form Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-5 py-3 font-semibold text-slate-500">Parameter</th>
              <th className="px-5 py-3 font-semibold text-slate-500">Hasil</th>
              <th className="px-5 py-3 font-semibold text-slate-500">Nilai Rujukan</th>
              <th className="px-5 py-3 font-semibold text-slate-500">Satuan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.details.map((d) => {
              const hasRef = d.test.minRef !== undefined || d.test.maxRef !== undefined;
              const valString = (d.resultValue ?? "").toString();
              const flag = evaluateResult(valString, d.test.minRef, d.test.maxRef);
              
              const isAbnormal = flag === "HIGH" || flag === "LOW";
              const isHigh = flag === "HIGH";
              const isLow = flag === "LOW";

              return (
                <tr key={d.id} className={cn("transition-colors", isAbnormal ? "bg-amber-50/30" : "")}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">{d.test.name}</div>
                    <div className="font-mono text-xs text-slate-400">{d.test.code}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="relative w-32">
                      <input
                        type="text"
                        value={valString}
                        onChange={(e) => handleInputChange(d.id, e.target.value)}
                        className={cn(
                          "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition-all",
                          isAbnormal
                            ? "border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-amber-900"
                            : "border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                        )}
                      />
                      {isAbnormal && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      )}
                    </div>
                    {isHigh && <p className="mt-1 text-[10px] font-bold text-amber-600">Tinggi</p>}
                    {isLow && <p className="mt-1 text-[10px] font-bold text-blue-600">Rendah</p>}
                  </td>
                  <td className="px-5 py-4">
                    {hasRef ? (
                      <span className="font-mono text-slate-600">
                        {d.test.minRef} - {d.test.maxRef}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500">{d.test.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          Nilai yang berada di luar rentang rujukan akan otomatis ditandai. Pastikan hasil sudah dikonfirmasi ulang sebelum menyimpan.
        </p>
      </div>
    </div>
  );
}
