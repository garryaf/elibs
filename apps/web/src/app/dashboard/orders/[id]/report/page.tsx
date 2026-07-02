"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Share2 } from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import { cn } from "@/lib/utils";

export default function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const order = MOCK_ORDERS.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="p-8 text-center text-slate-500">
        Order tidak ditemukan. <button onClick={() => router.back()} className="text-emerald-600 hover:underline">Kembali</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => router.back()} className="flex w-max items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Share2 className="h-4 w-4 text-blue-500" /> Kirim via WA
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="h-4 w-4 text-emerald-500" /> Download PDF
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Printer className="h-4 w-4" /> Cetak Hasil
          </button>
        </div>
      </div>

      {/* A4 Canvas Container */}
      <div className="mx-auto flex justify-center bg-slate-100 p-8 rounded-2xl border border-slate-200">
        <div className="relative min-h-[1000px] w-full max-w-[794px] bg-white p-12 shadow-xl ring-1 ring-slate-900/5">
          
          {/* Header Kop Surat */}
          <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-black text-white">
                eL
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-emerald-900">eLIS Laboratory</h1>
                <p className="text-xs text-slate-500">Jl. Kesehatan No. 123, Jakarta Selatan</p>
                <p className="text-xs text-slate-500">Telp: (021) 1234-5678 | Email: info@elis.com</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900">HASIL PEMERIKSAAN</h2>
              <p className="font-mono text-sm font-semibold text-emerald-600">{order.orderNumber}</p>
            </div>
          </div>

          {/* Data Pasien */}
          <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex"><span className="w-24 text-slate-500">Nama</span><span className="font-semibold text-slate-900">: {order.patientName}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">MRN</span><span className="font-mono font-semibold text-slate-900">: {order.patientMrn}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">Tgl Order</span><span className="text-slate-900">: {new Date(order.createdAt).toLocaleDateString("id-ID")}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">Dokter</span><span className="text-slate-900">: {order.approvedBy || "dr. Mandiri"}</span></div>
          </div>

          {/* Hasil Tabel */}
          <div className="mt-10">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-2 font-bold text-slate-800">PEMERIKSAAN</th>
                  <th className="py-2 font-bold text-slate-800">HASIL</th>
                  <th className="py-2 font-bold text-slate-800">NILAI RUJUKAN</th>
                  <th className="py-2 font-bold text-slate-800">SATUAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.details.map((d) => {
                  const isAbnormal = d.resultFlag === "HIGH" || d.resultFlag === "LOW";
                  return (
                    <tr key={d.id}>
                      <td className="py-3 font-medium text-slate-800">{d.test.name}</td>
                      <td className="py-3">
                        <span className={cn(isAbnormal ? "font-bold text-slate-900" : "text-slate-700")}>
                          {d.resultValue ?? "-"}
                          {isAbnormal && <span className="ml-1 text-[10px]">*</span>}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-500">
                        {d.test.minRef !== undefined ? `${d.test.minRef} - ${d.test.maxRef}` : "-"}
                      </td>
                      <td className="py-3 text-slate-500">{d.test.unit}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Interpretasi (if any) */}
          {order.clinicalInterpretation && (
            <div className="mt-8 rounded border border-slate-300 p-4">
              <h3 className="mb-1 text-sm font-bold text-slate-800">Interpretasi / Catatan:</h3>
              <p className="text-sm text-slate-600">{order.clinicalInterpretation}</p>
            </div>
          )}

          {/* Footer Signature */}
          <div className="mt-20 flex justify-end">
            <div className="text-center">
              <p className="text-sm text-slate-500">Jakarta, {new Date().toLocaleDateString("id-ID")}</p>
              <p className="mb-16 text-sm font-semibold text-slate-800">Penanggung Jawab</p>
              <p className="text-sm font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">{order.approvedBy || "_______________________"}</p>
            </div>
          </div>
          
          {/* Watermark / Notes */}
          <div className="absolute bottom-12 left-12 right-12 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            Dicetak secara otomatis oleh sistem eLIS. Hasil bertanda (*) di luar nilai rujukan.
          </div>

        </div>
      </div>
    </div>
  );
}
