"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  FileX2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitStatus = "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface Visit {
  id: string;
  visitNumber: string;
  status: VisitStatus;
  registrationDate: string;
  paymentMethod: string;
  bpjsNumber?: string | null;
  patient?: { id: string; name: string; mrn: string };
  doctor?: { id: string; name: string } | null;
  clinic?: { id: string; name: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: VisitStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "REGISTERED", label: "Terdaftar" },
  { value: "IN_PROGRESS", label: "Proses" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

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

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Tunai",
  BPJS: "BPJS",
  INSURANCE: "Asuransi",
  TRANSFER: "Transfer",
  EDC: "EDC (Kartu)",
  INSURANCE_CASH_FALLBACK: "Fallback Tunai",
  CORPORATE_DEFERRED: "Tagihan Korporat",
};

const PAGE_SIZE = 20;

// ─── RBAC ─────────────────────────────────────────────────────────────────────

const AUTHORIZED_VISIT_ROLES = [
  "KASIR",
  "CS",
  "ADMIN",
  "KLINIK_PARTNER",
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function VisitsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !AUTHORIZED_VISIT_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Loading state while auth is resolving
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#6B8E6B]" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat...</p>
      </div>
    );
  }

  // Redirect unauthorized roles (render nothing while redirecting)
  if (!user || !AUTHORIZED_VISIT_ROLES.includes(user.role)) {
    return null;
  }

  return <VisitsPageContent />;
}

// ─── Authorized Page Content ──────────────────────────────────────────────────

function VisitsPageContent() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisitStatus | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getVisits({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // Defensive extraction: handle { data: { data: [], meta: {} } } envelope
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      let meta = { total: 0, page: 1, limit: PAGE_SIZE };

      if (envelope && typeof envelope === "object") {
        if ("data" in envelope) {
          const inner = (envelope as { data: unknown }).data;
          raw = Array.isArray(inner) ? inner : [];
        }
        if ("meta" in envelope) {
          const m = (envelope as { meta: unknown }).meta as Record<string, unknown>;
          meta = {
            total: Number(m.total) || 0,
            page: Number(m.page) || 1,
            limit: Number(m.limit) || PAGE_SIZE,
          };
        }
      } else if (Array.isArray(envelope)) {
        raw = envelope;
      }

      const mapped: Visit[] = (raw as Record<string, unknown>[]).map((v) => ({
        id: v.id as string,
        visitNumber: v.visitNumber as string,
        status: v.status as VisitStatus,
        registrationDate: v.registrationDate as string,
        paymentMethod: v.paymentMethod as string,
        bpjsNumber: v.bpjsNumber as string | null | undefined,
        patient: v.patient as Visit["patient"],
        doctor: v.doctor as Visit["doctor"],
        clinic: v.clinic as Visit["clinic"],
      }));

      setVisits(mapped);
      setTotal(meta.total);
      setTotalPages(Math.ceil(meta.total / PAGE_SIZE) || 1);
    } catch {
      setVisits([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, startDate, endDate]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Manajemen Kunjungan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola data kunjungan pasien dan registrasi encounter laboratorium.
          </p>
        </div>
        <Link
          href="/dashboard/registration"
          id="visit-new-btn"
          className="inline-flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Registrasi Kunjungan
        </Link>
      </div>

      {/* Toolbar: Search + Filters */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Search + Status filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="visit-search"
              type="text"
              placeholder="Cari nama pasien, MRN, atau nomor kunjungan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 overflow-x-auto dark:border-slate-700 dark:bg-slate-900">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                id={`visit-filter-${f.value.toLowerCase()}`}
                onClick={() => setStatusFilter(f.value)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-[#6B8E6B] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Date range filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tanggal:</span>
          <input
            id="visit-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#6B8E6B] focus:ring-1 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            id="visit-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#6B8E6B] focus:ring-1 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results summary */}
      {debouncedSearch && !loading && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {total}
          </span>{" "}
          hasil untuk &quot;
          <span className="font-semibold text-[#6B8E6B]">{debouncedSearch}</span>
          &quot;
        </p>
      )}

      {/* Table */}
      {loading ? (
        <LoadingSkeleton />
      ) : visits.length === 0 ? (
        <EmptyState search={debouncedSearch} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  No. Kunjungan
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Pasien
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  MRN
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Pembayaran
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Dokter
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Klinik
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Tgl. Registrasi
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {visits.map((visit) => (
                <tr
                  key={visit.id}
                  className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[#6B8E6B]">
                    {visit.visitNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {visit.patient?.name || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {visit.patient?.mrn || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE_STYLES[visit.status]
                      }`}
                    >
                      {STATUS_LABELS[visit.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {PAYMENT_LABELS[visit.paymentMethod] || visit.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {visit.doctor?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {visit.clinic?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {formatDate(visit.registrationDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/visits/${visit.id}`}
                      className="text-xs font-medium text-[#6B8E6B] hover:text-[#5A7D5A] hover:underline"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && visits.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {page} dari {totalPages} ({total} kunjungan)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </button>

            {/* Page numbers */}
            {getPageNumbers(page, totalPages).map((p, idx) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-xs text-slate-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                    page === p
                      ? "bg-[#6B8E6B] text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Berikutnya
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-[#6B8E6B]" />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Memuat data kunjungan...
      </p>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950">
      <FileX2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
      <div className="text-center">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          Tidak ada kunjungan ditemukan
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {search
            ? `Tidak ada hasil untuk "${search}". Coba kata kunci lain.`
            : "Belum ada data kunjungan. Mulai dengan mendaftarkan kunjungan baru."}
        </p>
      </div>
      {!search && (
        <Link
          href="/dashboard/registration"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A7D5A]"
        >
          <Plus className="h-4 w-4" />
          Registrasi Kunjungan
        </Link>
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

function getPageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}
