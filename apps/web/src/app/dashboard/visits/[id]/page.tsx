"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  User,
  CreditCard,
  ClipboardList,
  Clock,
  Phone,
  Mail,
  Calendar,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";
import { CancelVisitDialog } from "@/components/visits/CancelVisitDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitStatus = "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

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

interface Patient {
  id: string;
  name: string;
  mrn: string;
  dateOfBirth?: string;
  phone?: string | null;
  email?: string | null;
  gender?: string;
  address?: string | null;
}

interface Doctor {
  id: string;
  name: string;
}

interface Clinic {
  id: string;
  name: string;
}

interface Insurance {
  id: string;
  name: string;
  type?: string;
}

interface VisitOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
}

interface VisitDetail {
  id: string;
  visitNumber: string;
  status: VisitStatus;
  registrationDate: string;
  paymentMethod: string;
  bpjsNumber?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  patient: Patient;
  doctor?: Doctor | null;
  clinic?: Clinic | null;
  insurance?: Insurance | null;
  orders: VisitOrder[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE_STYLES: Record<VisitStatus, string> = {
  REGISTERED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABELS: Record<VisitStatus, string> = {
  REGISTERED: "Terdaftar",
  IN_PROGRESS: "Dalam Proses",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

const ORDER_STATUS_BADGE_STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PAYMENT_OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  SAMPLE_COLLECTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IN_ANALYSIS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  VERIFIED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  NOTIFIED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu Bayar",
  PAYMENT_OVERDUE: "Jatuh Tempo",
  PAID: "Sudah Bayar",
  SAMPLE_COLLECTED: "Sampel Diambil",
  IN_ANALYSIS: "Analisis",
  VERIFIED: "Terverifikasi",
  APPROVED: "Disetujui",
  NOTIFIED: "Ternotifikasi",
  CANCELLED: "Dibatalkan",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Tunai",
  BPJS: "BPJS",
  INSURANCE: "Asuransi",
  TRANSFER: "Transfer",
  EDC: "EDC (Kartu)",
  INSURANCE_CASH_FALLBACK: "Fallback Tunai",
  CORPORATE_DEFERRED: "Tagihan Korporat",
};

const TIMELINE_STEPS: { status: VisitStatus; label: string }[] = [
  { status: "REGISTERED", label: "Terdaftar" },
  { status: "IN_PROGRESS", label: "Dalam Proses" },
  { status: "COMPLETED", label: "Selesai" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const visitId = params.id as string;

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const loadVisit = useCallback(async () => {
    if (!visitId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getVisit(visitId);
      // The apiClient unwraps the envelope, so res is the visit data directly
      const data = (res as unknown) as VisitDetail;
      setVisit(data);
    } catch (err: unknown) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr?.status === 404) {
        setError("Kunjungan tidak ditemukan.");
      } else {
        setError(apiErr?.message || "Gagal memuat data kunjungan.");
      }
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B8E6B]" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat detail kunjungan...</p>
      </div>
    );
  }

  // Error state
  if (error || !visit) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {error || "Data kunjungan tidak ditemukan"}
          </p>
          <Link
            href="/dashboard/visits"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A7D5A]"
          >
            Kembali ke Daftar Kunjungan
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = visit.status === "REGISTERED" || visit.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {visit.visitNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[visit.status]}`}
            >
              {STATUS_LABELS[visit.status]}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tanggal registrasi: {formatDate(visit.registrationDate)}
          </p>
        </div>

        {/* Cancel Button — only when REGISTERED or IN_PROGRESS */}
        {canCancel && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 active:scale-[0.98] dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <AlertTriangle className="h-4 w-4" />
            Batalkan Kunjungan
          </button>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Patient Card */}
        <PatientCard patient={visit.patient} />

        {/* Payment Section */}
        <PaymentCard
          paymentMethod={visit.paymentMethod}
          insurance={visit.insurance}
          bpjsNumber={visit.bpjsNumber}
          doctor={visit.doctor}
          clinic={visit.clinic}
        />
      </div>

      {/* Status Timeline */}
      <StatusTimeline status={visit.status} cancelledAt={visit.cancelledAt} />

      {/* Orders List */}
      <OrdersList orders={visit.orders} />

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <CancelVisitDialog
          visit={{
            id: visit.id,
            visitNumber: visit.visitNumber,
            status: visit.status,
            patient: visit.patient,
          }}
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onCancelSuccess={() => {
            setShowCancelDialog(false);
            loadVisit();
          }}
        />
      )}
    </div>
  );
}


// ─── Patient Card ─────────────────────────────────────────────────────────────

function PatientCard({ patient }: { patient: Patient }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B8E6B]/10">
          <User className="h-4 w-4 text-[#6B8E6B]" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Informasi Pasien
        </h2>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Nama</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {patient.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">No. Rekam Medis (MRN)</p>
            <p className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
              {patient.mrn}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tanggal Lahir</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {patient.dateOfBirth ? formatDateShort(patient.dateOfBirth) : "—"}
            </p>
          </div>
        </div>

        {(patient.phone || patient.email) && (
          <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            {patient.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{patient.phone}</p>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{patient.email}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payment Card ─────────────────────────────────────────────────────────────

function PaymentCard({
  paymentMethod,
  insurance,
  bpjsNumber,
  doctor,
  clinic,
}: {
  paymentMethod: string;
  insurance?: Insurance | null;
  bpjsNumber?: string | null;
  doctor?: Doctor | null;
  clinic?: Clinic | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B8E6B]/10">
          <CreditCard className="h-4 w-4 text-[#6B8E6B]" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Pembayaran & Rujukan
        </h2>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Metode Pembayaran</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {PAYMENT_LABELS[paymentMethod] || paymentMethod}
          </p>
        </div>

        {insurance && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Asuransi</p>
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-[#6B8E6B]" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {insurance.name}
              </p>
            </div>
          </div>
        )}

        {bpjsNumber && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">No. BPJS</p>
            <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
              {bpjsNumber}
            </p>
          </div>
        )}

        {doctor && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">Dokter Pengirim</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {doctor.name}
            </p>
          </div>
        )}

        {clinic && (
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Klinik</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {clinic.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({
  status,
  cancelledAt,
}: {
  status: VisitStatus;
  cancelledAt?: string | null;
}) {
  const isCancelled = status === "CANCELLED";

  // Determine the step index for progress
  const stepIndex = isCancelled
    ? -1
    : TIMELINE_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B8E6B]/10">
          <Clock className="h-4 w-4 text-[#6B8E6B]" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Status Timeline
        </h2>
      </div>

      <div className="flex items-center gap-0">
        {TIMELINE_STEPS.map((step, idx) => {
          const isActive = idx <= stepIndex;
          const isCurrent = idx === stepIndex;
          const isLast = idx === TIMELINE_STEPS.length - 1;

          return (
            <div key={step.status} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    isCurrent
                      ? "border-[#6B8E6B] bg-[#6B8E6B] text-white"
                      : isActive
                      ? "border-[#6B8E6B] bg-[#6B8E6B]/10 text-[#6B8E6B]"
                      : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  {idx + 1}
                </div>
                <p
                  className={`mt-2 text-center text-xs font-medium ${
                    isActive
                      ? "text-[#6B8E6B]"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
              </div>
              {!isLast && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    idx < stepIndex
                      ? "bg-[#6B8E6B]"
                      : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Cancelled state */}
      {isCancelled && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Kunjungan Dibatalkan
            </p>
          </div>
          {cancelledAt && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Dibatalkan pada: {formatDate(cancelledAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Orders List ──────────────────────────────────────────────────────────────

function OrdersList({ orders }: { orders: VisitOrder[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B8E6B]/10">
            <ClipboardList className="h-4 w-4 text-[#6B8E6B]" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Daftar Order
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {orders.length} order
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <ClipboardList className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Belum ada order untuk kunjungan ini
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-[#6B8E6B]/30 hover:bg-[#6B8E6B]/5 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-[#6B8E6B]/30"
            >
              <div className="space-y-1">
                <p className="font-mono text-sm font-medium text-[#6B8E6B]">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  ORDER_STATUS_BADGE_STYLES[order.status]
                }`}
              >
                {ORDER_STATUS_LABELS[order.status] || order.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
