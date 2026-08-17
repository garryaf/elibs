"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Share2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  patient: {
    name: string;
    mrn: string;
    phone?: string;
  };
  orderDetails: OrderDetailApi[];
  createdAt: string;
  clinicalInterpretation?: string;
  approvedBy?: string;
}

interface SendWhatsAppResponse {
  success: boolean;
  message: string;
  data: {
    method: "fonnte" | "wa_link";
    portalUrl: string;
    phone?: string | null;
    waLink?: string;
  };
}

export default function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    apiClient
      .getOrder(id)
      .then((res) => {
        const raw = res as unknown as Record<string, unknown>;
        let data: OrderApi | null = null;
        if (raw && typeof raw === "object" && "orderNumber" in raw) {
          data = raw as unknown as OrderApi;
        } else if (raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object") {
          data = raw.data as OrderApi;
        }
        setOrder(data);
      })
      .catch((err) => {
        setError(err?.message || "Gagal memuat data order");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSendWhatsApp = async () => {
    if (!id || waSending) return;

    setWaSending(true);
    setWaStatus(null);

    try {
      const response = await apiClient.post<SendWhatsAppResponse>(
        `/api/v1/orders/${id}/send-whatsapp`
      );

      const result = (response as unknown as { data?: SendWhatsAppResponse })?.data ?? response as unknown as SendWhatsAppResponse;

      if (result?.data?.method === "fonnte") {
        // Delivery triggered via FONNTE — show success
        setWaStatus({
          type: "success",
          message: result.message || "Pengiriman via WhatsApp sedang diproses",
        });
      } else if (result?.data?.method === "wa_link" && result.data.waLink) {
        // Fallback: open WhatsApp Web link
        window.open(result.data.waLink, "_blank", "noopener,noreferrer");
        setWaStatus({
          type: "success",
          message: "Link WhatsApp Web dibuka di tab baru",
        });
      } else {
        setWaStatus({
          type: "error",
          message: result?.message || "Gagal mengirim via WhatsApp",
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Gagal mengirim via WhatsApp";
      setWaStatus({ type: "error", message: errorMessage });
    } finally {
      setWaSending(false);
      // Auto-clear status after 5 seconds
      setTimeout(() => setWaStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl min-h-[60vh] space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
          <div className="flex gap-3">
            <div className="h-9 w-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-9 w-32 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-6 w-64 animate-pulse rounded bg-muted" />
            <div className="mx-auto h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-4 border-t border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
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
      <div className="p-8 text-center text-slate-500">
        {error || "Order tidak ditemukan."}{" "}
        <button onClick={() => router.back()} className="text-brand hover:underline">Kembali</button>
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
          <button
            onClick={handleSendWhatsApp}
            disabled={waSending}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all",
              waSending && "opacity-50 cursor-not-allowed"
            )}
          >
            {waSending ? (
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
            ) : (
              <Share2 className="h-4 w-4 text-green-600" />
            )}
            {waSending ? "Mengirim..." : "Kirim via WA"}
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Download className="h-4 w-4 text-brand" /> Download PDF
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Printer className="h-4 w-4" /> Cetak Hasil
          </button>
        </div>
      </div>

      {/* WhatsApp Status Toast */}
      {waStatus && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
            waStatus.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          )}
        >
          {waStatus.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {waStatus.message}
        </div>
      )}

      {/* A4 Canvas Container */}
      <div className="mx-auto flex justify-center bg-slate-100 p-8 rounded-2xl border border-slate-200">
        <div className="relative min-h-[1000px] w-full max-w-[794px] bg-white p-12 shadow-xl ring-1 ring-slate-900/5">
          
          {/* Header Kop Surat */}
          <div className="flex items-center justify-between border-b-2 border-brand/50 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-black text-white">
                eL
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-brand">eLIS Laboratory</h1>
                <p className="text-xs text-slate-500">Jl. Kesehatan No. 123, Jakarta Selatan</p>
                <p className="text-xs text-slate-500">Telp: (021) 1234-5678 | Email: info@elis.com</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900">HASIL PEMERIKSAAN</h2>
              <p className="font-mono text-sm font-semibold text-brand">{order.orderNumber}</p>
            </div>
          </div>

          {/* Data Pasien */}
          <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex"><span className="w-24 text-slate-500">Nama</span><span className="font-semibold text-slate-900">: {order.patient.name}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">MRN</span><span className="font-mono font-semibold text-slate-900">: {order.patient.mrn}</span></div>
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
                  <th className="py-2 font-bold text-slate-800">SATUAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.orderDetails.map((d) => {
                  const isAbnormal = d.flag === "HIGH" || d.flag === "LOW";
                  return (
                    <tr key={d.id}>
                      <td className="py-3 font-medium text-slate-800">{d.test.name}</td>
                      <td className="py-3">
                        <span className={cn(isAbnormal ? "font-bold text-slate-900" : "text-slate-700")}>
                          {d.resultValue ?? "-"}
                          {isAbnormal && <span className="ml-1 text-[10px]">*</span>}
                        </span>
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
