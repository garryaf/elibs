"use client";

import { useState } from "react";
import { Search, CheckCircle2, XCircle, Activity } from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

export default function DoctorApprovalPage() {
  // For doctor view, we want COMPLETED from lab perspective, which needs doctor approval.
  // Actually, let's just use orders that are "COMPLETED" or have results for this demo.
  const approvalQueue: Order[] = MOCK_ORDERS.filter(o => o.status === "COMPLETED" || o.status === "IN_ANALYSIS");
  
  const [activeOrderId, setActiveOrderId] = useState<string | null>(approvalQueue[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredQueue = approvalQueue.filter(o => 
    !search || 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) || 
    o.patientName.toLowerCase().includes(search.toLowerCase())
  );

  const activeOrder = approvalQueue.find(o => o.id === activeOrderId);

  const handleApprove = async () => {
    if (!activeOrder) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSubmitting(false);
    alert("Order " + activeOrder.orderNumber + " telah disetujui!");
  };

  const handleReject = async () => {
    if (!activeOrder) return;
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSubmitting(false);
    alert("Order " + activeOrder.orderNumber + " dikembalikan ke Lab!");
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Master List (Kiri) */}
      <div className="flex w-1/3 min-w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-lg font-bold text-slate-900">Antrean Validasi</h2>
          <p className="mb-4 text-sm text-slate-500">{filteredQueue.length} order menunggu</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pasien/order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredQueue.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">Tidak ada antrean</div>
          ) : (
            filteredQueue.map(order => {
              const isActive = activeOrderId === order.id;
              const hasAbnormal = order.details.some(d => d.resultFlag === "HIGH" || d.resultFlag === "LOW");
              return (
                <button
                  key={order.id}
                  onClick={() => { setActiveOrderId(order.id); setInterpretation(order.clinicalInterpretation || ""); }}
                  className={cn(
                    "mb-2 w-full flex items-start justify-between rounded-xl p-3 text-left transition-all",
                    isActive 
                      ? "bg-emerald-50 ring-1 ring-emerald-500/50" 
                      : "hover:bg-slate-50"
                  )}
                >
                  <div>
                    <div className="font-semibold text-slate-900">{order.patientName}</div>
                    <div className="font-mono text-xs text-slate-500">{order.orderNumber}</div>
                  </div>
                  {hasAbnormal && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">!</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail View (Kanan) */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!activeOrder ? (
          <div className="flex h-full items-center justify-center text-slate-400">Pilih order untuk melihat detail</div>
        ) : (
          <>
            {/* Header Detail */}
            <div className="border-b border-slate-100 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{activeOrder.patientName}</h1>
                  <p className="font-mono text-emerald-600">{activeOrder.patientMrn}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Tgl Order: {new Date(activeOrder.createdAt).toLocaleDateString("id-ID")}</p>
                  <p>{activeOrder.details.length} Parameter</p>
                </div>
              </div>
            </div>

            {/* Content Detail */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Pemeriksaan</th>
                      <th className="px-4 py-3 font-semibold">Hasil</th>
                      <th className="px-4 py-3 font-semibold">Nilai Rujukan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOrder.details.map(d => {
                      const isHigh = d.resultFlag === "HIGH";
                      const isLow = d.resultFlag === "LOW";
                      const isAbnormal = isHigh || isLow;
                      return (
                        <tr key={d.id} className={isAbnormal ? "bg-amber-50/20" : ""}>
                          <td className="px-4 py-3 font-medium text-slate-900">{d.test.name}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "font-bold",
                              isHigh ? "text-red-600" : isLow ? "text-blue-600" : "text-slate-900"
                            )}>
                              {d.resultValue || "-"} {d.test.unit}
                            </span>
                            {isHigh && <span className="ml-2 text-[10px] font-bold text-red-600">(Tinggi)</span>}
                            {isLow && <span className="ml-2 text-[10px] font-bold text-blue-600">(Rendah)</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">
                            {d.test.minRef !== undefined ? `${d.test.minRef} - ${d.test.maxRef}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Interpretasi Klinis */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                  <Activity className="h-4 w-4 text-emerald-600" /> Interpretasi Klinis
                </label>
                <textarea
                  rows={4}
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  placeholder="Ketik catatan medis atau interpretasi dari hasil lab ini..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-6 bg-slate-50">
              <button 
                onClick={handleReject}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Tolak (Re-test)
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Setujui &amp; Cetak
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
