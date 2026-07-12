"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { ChevronDown, ChevronUp, AlertCircle, FlaskConical } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_OVERDUE"
  | "PAID"
  | "SAMPLE_COLLECTED"
  | "IN_ANALYSIS"
  | "VERIFIED"
  | "APPROVED"
  | "NOTIFIED"
  | "CANCELLED";

type Flag = "NORMAL" | "ABNORMAL" | "HIGH" | "LOW" | "CRITICAL" | null;

interface OrderDetail {
  id: string;
  testName: string;
  resultValue: string | null;
  flag: Flag;
  status: string;
}

interface LabHistoryItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string | null;
  createdAt: string;
  visit: { visitNumber: string } | null;
  orderDetails: OrderDetail[];
}

interface LabHistoryMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LabHistoryResponse {
  items: LabHistoryItem[];
  meta: LabHistoryMeta;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LabHistorySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Record<string, string> = {
    PENDING_PAYMENT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    PAYMENT_OVERDUE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    SAMPLE_COLLECTED: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    IN_ANALYSIS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    VERIFIED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    NOTIFIED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  const labels: Record<string, string> = {
    PENDING_PAYMENT: "Menunggu Bayar",
    PAYMENT_OVERDUE: "Jatuh Tempo",
    PAID: "Lunas",
    SAMPLE_COLLECTED: "Sampel Diambil",
    IN_ANALYSIS: "Dalam Analisis",
    VERIFIED: "Terverifikasi",
    APPROVED: "Disetujui",
    NOTIFIED: "Terkirim",
    CANCELLED: "Dibatalkan",
  };

  const colorClass =
    colors[status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const label = labels[status] || status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

function FlagBadge({ flag }: { flag: Flag }) {
  if (!flag || flag === "NORMAL") return null;

  const colors: Record<string, string> = {
    HIGH: "text-amber-600 dark:text-amber-400",
    LOW: "text-blue-600 dark:text-blue-400",
    CRITICAL: "text-red-600 dark:text-red-400",
    ABNORMAL: "text-orange-600 dark:text-orange-400",
  };

  const labels: Record<string, string> = {
    HIGH: "↑ Tinggi",
    LOW: "↓ Rendah",
    CRITICAL: "⚠ Kritis",
    ABNORMAL: "! Abnormal",
  };

  return (
    <span className={`text-xs font-bold ${colors[flag] || "text-slate-600"}`}>
      {labels[flag] || flag}
    </span>
  );
}

function PaymentMethodLabel({ method }: { method: string | null }) {
  if (!method) return null;

  const labels: Record<string, string> = {
    CASH: "Tunai",
    DEBIT_CARD: "Debit",
    CREDIT_CARD: "Kartu Kredit",
    BANK_TRANSFER: "Transfer",
    BPJS: "BPJS",
    INSURANCE: "Asuransi",
    QRIS: "QRIS",
  };

  return (
    <span className="text-slate-400 dark:text-slate-500">
      • {labels[method] || method}
    </span>
  );
}

function OrderCard({ order }: { order: LabHistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {order.orderNumber}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(order.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
            {order.paymentMethod && (
              <span className="ml-2">
                <PaymentMethodLabel method={order.paymentMethod} />
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && order.orderDetails.length > 0 && (
        <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-800">
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="pb-2 font-medium">Pemeriksaan</th>
                <th className="pb-2 font-medium">Hasil</th>
                <th className="pb-2 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.orderDetails.map((detail) => (
                <tr key={detail.id}>
                  <td className="py-1.5 font-medium text-slate-700 dark:text-slate-300">
                    {detail.testName}
                  </td>
                  <td className="py-1.5 text-slate-900 dark:text-white">
                    {detail.resultValue ?? "—"}
                  </td>
                  <td className="py-1.5">
                    <FlagBadge flag={detail.flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && order.orderDetails.length === 0 && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          <p className="text-xs text-slate-400">Belum ada hasil pemeriksaan.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientLabHistory({ patientId }: { patientId: string }) {
  const [data, setData] = useState<LabHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchLabHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<LabHistoryResponse>(
        `/api/v1/patients/${patientId}/lab-history?page=${page}&limit=10`
      );
      // Handle potential double-envelope: unwrap if response has nested data
      const unwrapped = (response as any)?.data?.items
        ? (response as any).data
        : (response as any)?.items
          ? response
          : (response as any)?.data ?? response;
      setData(unwrapped as LabHistoryResponse);
    } catch {
      setError("Gagal memuat riwayat laboratorium.");
    } finally {
      setLoading(false);
    }
  }, [patientId, page]);

  useEffect(() => {
    fetchLabHistory();
  }, [fetchLabHistory]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <FlaskConical className="h-4 w-4 text-[#6B8E6B]" />
          Riwayat Laboratorium
        </h3>
        <LabHistorySkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <FlaskConical className="h-4 w-4 text-[#6B8E6B]" />
          Riwayat Laboratorium
        </h3>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchLabHistory}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <FlaskConical className="h-4 w-4 text-[#6B8E6B]" />
          Riwayat Laboratorium
        </h3>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
          <FlaskConical className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada riwayat laboratorium
          </p>
        </div>
      </div>
    );
  }

  // Data state
  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <FlaskConical className="h-4 w-4 text-[#6B8E6B]" />
        Riwayat Laboratorium
      </h3>

      <div className="space-y-2">
        {data.items.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* Pagination */}
      {data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Halaman {data.meta.page} dari {data.meta.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
              disabled={page >= data.meta.totalPages}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
