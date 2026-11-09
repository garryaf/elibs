"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, Download, Share2, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Link2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Local types matching API response ──────────────────────────────────────

interface ReferenceValueApi {
  id: string;
  testId: string;
  gender?: string | null;
  ageUnit?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  minRef?: number | string | null;
  maxRef?: number | string | null;
  criticalMin?: number | string | null;
  criticalMax?: number | string | null;
}

interface OrderDetailApi {
  id: string;
  testId: string;
  status: string;
  resultValue?: number | string | null;
  flag?: "NORMAL" | "LOW" | "HIGH" | "CRITICAL" | null;
  price: number;
  discount: number;
  finalPrice: number;
  test: {
    code: string;
    name: string;
    unit: string;
    referenceValues?: ReferenceValueApi[];
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
  approvedAt?: string | null;
  patient: {
    name: string;
    mrn: string;
    phone?: string;
    gender?: string;
  };
  clinic?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  } | null;
  doctor?: {
    id: string;
    name: string;
    specialization?: string;
  } | null;
  visit?: {
    visitNumber: string;
    status: string;
    doctor?: { id: string; name: string } | null;
  } | null;
  orderDetails: OrderDetailApi[];
  createdAt: string;
  clinicalInterpretation?: string;
  approvedBy?: string;
  approvedByName?: string | null;
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFlagLabel(flag?: string | null): { text: string; color: string } | null {
  switch (flag) {
    case "HIGH":
      return { text: "H", color: "text-orange-600 bg-orange-50 border-orange-200" };
    case "LOW":
      return { text: "L", color: "text-blue-600 bg-blue-50 border-blue-200" };
    case "CRITICAL":
      return { text: "C!", color: "text-red-700 bg-red-50 border-red-200 font-bold" };
    default:
      return null;
  }
}

function getReferenceRange(detail: OrderDetailApi, patientGender?: string): string {
  const refs = detail.test.referenceValues;
  if (!refs || refs.length === 0) return "—";

  // Find best match: filter by gender if available
  let matched = refs;
  if (patientGender) {
    const genderFiltered = refs.filter(
      (r) => !r.gender || r.gender === patientGender
    );
    if (genderFiltered.length > 0) matched = genderFiltered;
  }

  // Take first match
  const ref = matched[0];
  if (ref.minRef != null && ref.maxRef != null) {
    return `${ref.minRef} - ${ref.maxRef}`;
  }
  if (ref.minRef != null) return `> ${ref.minRef}`;
  if (ref.maxRef != null) return `< ${ref.maxRef}`;
  return "—";
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waSending, setWaSending] = useState(false);
  const [waStatus, setWaStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!id || downloading) return;
    setDownloading(true);
    try {
      const blob = await apiClient.getOrderReportPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab-report-${order?.orderNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunduh PDF";
      setWaStatus({ type: "error", message: msg });
      setTimeout(() => setWaStatus(null), 5000);
    } finally {
      setDownloading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!id || waSending) return;

    setWaSending(true);
    setWaStatus(null);

    try {
      const response = await apiClient.post<SendWhatsAppResponse>(
        `/api/v1/orders/${id}/send-whatsapp`
      );

      const result = (response as unknown as { data?: SendWhatsAppResponse })?.data ?? response as unknown as SendWhatsAppResponse;

      // FN-2/FN-3: Store portal URL for copy-link fallback
      if (result?.data?.portalUrl) {
        setPortalUrl(result.data.portalUrl);
      }

      if (result?.data?.method === "fonnte") {
        setWaStatus({
          type: "success",
          message: result.message || "Pengiriman via WhatsApp sedang diproses",
        });
      } else if (result?.data?.method === "wa_link" && result.data.waLink) {
        window.open(result.data.waLink, "_blank", "noopener,noreferrer");
        setWaStatus({
          type: "success",
          message: result.message || "Link WhatsApp Web dibuka di tab baru",
        });
      } else if (result?.data?.portalUrl) {
        await navigator.clipboard?.writeText(result.data.portalUrl).catch(() => {});
        setWaStatus({
          type: "success",
          message: "Link portal pasien telah disalin ke clipboard. Kirim manual ke pasien.",
        });
      } else {
        // FN-2: More informative error message with guidance
        setWaStatus({
          type: "error",
          message: result?.message || "Gagal mengirim via WhatsApp. Pastikan nomor telepon pasien sudah diisi, atau gunakan tombol 'Salin Link Portal' untuk menyalin link hasil lab.",
        });
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      const errorMessage = apiErr?.message || (err instanceof Error ? err.message : "Gagal mengirim via WhatsApp");
      // FN-2: Append guidance about alternative sharing method
      setWaStatus({
        type: "error",
        message: `${errorMessage}. Gunakan tombol 'Salin Link Portal' sebagai alternatif.`,
      });
    } finally {
      setWaSending(false);
      setTimeout(() => setWaStatus(null), 8000);
    }
  };

  // FN-3: Copy portal link handler
  const handleCopyPortalLink = async () => {
    if (!id || !isApproved) return;

    try {
      // If we already have a portal URL from a previous WA send attempt, use it
      if (portalUrl) {
        await navigator.clipboard.writeText(portalUrl);
        setLinkCopied(true);
        setWaStatus({ type: "success", message: "Link portal berhasil disalin ke clipboard." });
        setTimeout(() => { setLinkCopied(false); setWaStatus(null); }, 3000);
        return;
      }

      // Otherwise, trigger the WA endpoint to generate the portal token/URL
      const response = await apiClient.post<SendWhatsAppResponse>(
        `/api/v1/orders/${id}/send-whatsapp`
      );
      const result = (response as unknown as { data?: SendWhatsAppResponse })?.data ?? response as unknown as SendWhatsAppResponse;

      const url = result?.data?.portalUrl;
      if (url) {
        setPortalUrl(url);
        await navigator.clipboard.writeText(url);
        setLinkCopied(true);
        setWaStatus({ type: "success", message: "Link portal berhasil disalin ke clipboard." });
        setTimeout(() => { setLinkCopied(false); setWaStatus(null); }, 3000);
      } else {
        setWaStatus({ type: "error", message: "Gagal mendapatkan link portal." });
        setTimeout(() => setWaStatus(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyalin link portal";
      setWaStatus({ type: "error", message: msg });
      setTimeout(() => setWaStatus(null), 5000);
    }
  };

  // ─── Render: Loading ────────────────────────────────────────────────────────

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
        </div>
      </div>
    );
  }

  // ─── Render: Error ──────────────────────────────────────────────────────────

  if (error || !order) {
    return (
      <div className="p-8 text-center text-slate-500">
        {error || "Order tidak ditemukan."}{" "}
        <button onClick={() => router.back()} className="text-brand hover:underline">Kembali</button>
      </div>
    );
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const isApproved = order.status === "APPROVED";
  const clinicName = order.clinic?.name || "eLIS Laboratory";
  const clinicAddress = order.clinic?.address || "";
  const clinicPhone = order.clinic?.phone || "";
  const reportDate = order.approvedAt
    ? new Date(order.approvedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    : new Date(order.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

  // ─── Render: Page ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-container { box-shadow: none !important; border: none !important; padding: 40px !important; margin: 0 !important; max-width: 100% !important; }
          .print-wrapper { background: white !important; padding: 0 !important; border: none !important; border-radius: 0 !important; }
        }
      `}</style>

      {/* Header Actions */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => router.back()} className="flex w-max items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendWhatsApp}
            disabled={waSending || !isApproved}
            title={!isApproved ? "Order harus divalidasi (APPROVED) sebelum bisa dikirim" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              (waSending || !isApproved) && "opacity-50 cursor-not-allowed"
            )}
          >
            {waSending ? (
              <Loader2 className="h-4 w-4 animate-spin text-green-600" />
            ) : (
              <Share2 className="h-4 w-4 text-green-600" />
            )}
            {waSending ? "Mengirim..." : "Kirim via WA"}
          </button>
          <button
            onClick={handleCopyPortalLink}
            disabled={!isApproved}
            title={!isApproved ? "Order harus divalidasi (APPROVED) sebelum bisa dibagikan" : "Salin link portal pasien ke clipboard"}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              !isApproved && "opacity-50 cursor-not-allowed"
            )}
          >
            {linkCopied ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Link2 className="h-4 w-4 text-indigo-600" />
            )}
            {linkCopied ? "Tersalin!" : "Salin Link"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || !isApproved}
            title={!isApproved ? "Order harus divalidasi (APPROVED) sebelum bisa diunduh" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              (downloading || !isApproved) && "opacity-50 cursor-not-allowed"
            )}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
            ) : (
              <Download className="h-4 w-4 text-brand" />
            )}
            {downloading ? "Mengunduh..." : "Download PDF"}
          </button>
          <button
            onClick={() => window.print()}
            disabled={!isApproved}
            title={!isApproved ? "Order harus divalidasi (APPROVED) sebelum bisa dicetak" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark",
              !isApproved && "opacity-50 cursor-not-allowed"
            )}
          >
            <Printer className="h-4 w-4" /> Cetak Hasil
          </button>
        </div>
      </div>

      {/* FE-6: Warning if not APPROVED */}
      {!isApproved && (
        <div className="no-print flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Laporan ini belum divalidasi oleh dokter (status: {order.status}). Hasil belum bersifat final.
        </div>
      )}

      {/* WhatsApp / Download Status Toast */}
      {waStatus && (
        <div
          className={cn(
            "no-print flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
            waStatus.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
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
      <div className="print-wrapper mx-auto flex justify-center bg-slate-100 p-8 rounded-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="print-container relative min-h-[1000px] w-full max-w-[794px] bg-white p-12 shadow-xl ring-1 ring-slate-900/5">

          {/* BP-3: DRAFT watermark for non-approved orders */}
          {!isApproved && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
              <span className="select-none text-[120px] font-black tracking-widest text-red-500/10 -rotate-[35deg]">
                DRAFT
              </span>
            </div>
          )}

          {/* FE-4: Dynamic Letterhead from clinic data */}
          <div className="flex items-center justify-between border-b-2 border-brand/50 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-black text-white">
                eL
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-brand">{clinicName}</h1>
                {clinicAddress && <p className="text-xs text-slate-500">{clinicAddress}</p>}
                {clinicPhone && <p className="text-xs text-slate-500">Telp: {clinicPhone}</p>}
                {!clinicAddress && !clinicPhone && (
                  <p className="text-xs text-slate-500">Laboratorium Klinik</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900">HASIL PEMERIKSAAN</h2>
              <p className="font-mono text-sm font-semibold text-brand">{order.orderNumber}</p>
            </div>
          </div>

          {/* Data Pasien */}
          <div className="mt-8 grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex"><span className="w-28 text-slate-500">Nama</span><span className="font-semibold text-slate-900">: {order.patient.name}</span></div>
            <div className="flex"><span className="w-28 text-slate-500">MRN</span><span className="font-mono font-semibold text-slate-900">: {order.patient.mrn}</span></div>
            <div className="flex"><span className="w-28 text-slate-500">Tgl Order</span><span className="text-slate-900">: {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
            <div className="flex"><span className="w-28 text-slate-500">Dokter</span><span className="text-slate-900">: {order.doctor?.name || order.visit?.doctor?.name || "—"}</span></div>
            {order.approvedAt && (
              <div className="flex"><span className="w-28 text-slate-500">Tgl Validasi</span><span className="text-slate-900">: {new Date(order.approvedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
            )}
          </div>

          {/* FE-2 & FE-3: Results Table with Reference Range and Flag columns */}
          <div className="mt-10">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-2 font-bold text-slate-800">PEMERIKSAAN</th>
                  <th className="py-2 font-bold text-slate-800">HASIL</th>
                  <th className="py-2 font-bold text-slate-800">SATUAN</th>
                  <th className="py-2 font-bold text-slate-800">NILAI RUJUKAN</th>
                  <th className="py-2 font-bold text-slate-800 text-center w-12">FLAG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.orderDetails.map((d) => {
                  const flagInfo = getFlagLabel(d.flag);
                  const refRange = getReferenceRange(d, order.patient.gender);
                  const isAbnormal = d.flag === "HIGH" || d.flag === "LOW" || d.flag === "CRITICAL";
                  return (
                    <tr key={d.id} className={isAbnormal ? "bg-amber-50/50" : ""}>
                      <td className="py-3 font-medium text-slate-800">{d.test.name}</td>
                      <td className="py-3">
                        <span className={cn(
                          isAbnormal ? "font-bold" : "text-slate-700",
                          d.flag === "CRITICAL" ? "text-red-700" : d.flag === "HIGH" ? "text-orange-700" : d.flag === "LOW" ? "text-blue-700" : ""
                        )}>
                          {d.resultValue ?? "-"}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{d.test.unit || "—"}</td>
                      <td className="py-3 text-slate-500 text-xs">{refRange}</td>
                      <td className="py-3 text-center">
                        {flagInfo && (
                          <span className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold",
                            flagInfo.color
                          )}>
                            {flagInfo.text}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Flag Legend */}
          <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-orange-200 bg-orange-50 text-[9px] font-bold text-orange-600">H</span>
              Tinggi
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-blue-200 bg-blue-50 text-[9px] font-bold text-blue-600">L</span>
              Rendah
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-red-200 bg-red-50 text-[9px] font-bold text-red-700">C!</span>
              Kritis
            </span>
          </div>

          {/* Interpretasi (if any) */}
          {order.clinicalInterpretation && (
            <div className="mt-8 rounded border border-slate-300 p-4">
              <h3 className="mb-1 text-sm font-bold text-slate-800">Interpretasi / Catatan:</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.clinicalInterpretation}</p>
            </div>
          )}

          {/* FE-5: Footer Signature with approval date (not current date) */}
          <div className="mt-20 flex justify-end">
            <div className="text-center">
              <p className="text-sm text-slate-500">Jakarta, {reportDate}</p>
              <p className="mb-16 text-sm font-semibold text-slate-800">Penanggung Jawab</p>
              <p className="text-sm font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                {order.approvedByName || order.doctor?.name || "_______________________"}
              </p>
            </div>
          </div>

          {/* Watermark / Notes */}
          <div className="absolute bottom-12 left-12 right-12 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            Dicetak secara otomatis oleh sistem eLIS. Hasil di luar nilai rujukan ditandai dengan flag (H/L/C!).
          </div>

        </div>
      </div>
    </div>
  );
}
