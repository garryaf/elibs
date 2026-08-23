"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Plus,
  X,
  Filter,
  Eye,
  Send,
  Ban,
  DollarSign,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  useBatchInvoices,
  useBatchInvoice,
  useCreateBatchInvoice,
  useUpdateBatchInvoiceStatus,
  useCancelBatchInvoice,
  type BatchInvoice,
  type BatchInvoiceDetail,
  type BatchInvoiceStatus,
  type CreateBatchInvoicePayload,
} from "@/services/batch-invoices";
import { useMasterInsurances } from "@/services/master-data";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const STATUS_OPTIONS: { value: BatchInvoiceStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Terkirim" },
  { value: "PARTIALLY_PAID", label: "Bayar Sebagian" },
  { value: "PAID", label: "Lunas" },
  { value: "OVERDUE", label: "Jatuh Tempo" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const STATUS_CONFIG: Record<
  BatchInvoiceStatus,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  DRAFT: {
    label: "Draft",
    dot: "bg-slate-400",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    text: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-200 dark:ring-slate-700/50",
  },
  SENT: {
    label: "Terkirim",
    dot: "bg-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-700/50",
  },
  PARTIALLY_PAID: {
    label: "Bayar Sebagian",
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-700/50",
  },
  PAID: {
    label: "Lunas",
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    ring: "ring-green-200 dark:ring-green-700/50",
  },
  OVERDUE: {
    label: "Jatuh Tempo",
    dot: "bg-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-200 dark:ring-orange-700/50",
  },
  CANCELLED: {
    label: "Dibatalkan",
    dot: "bg-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    ring: "ring-red-200 dark:ring-red-700/50",
  },
};

// ─── Status Badge Component ──────────────────────────────────────────────────

function BatchInvoiceStatusBadge({ status }: { status: BatchInvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        cfg.bg,
        cfg.text,
        cfg.ring
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function BatchInvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BatchInvoiceStatus | "ALL">(
    "ALL"
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  };

  const { data: rawData, isLoading, error, refetch } = useBatchInvoices(queryParams);

  // ─── Parse data ──────────────────────────────────────────────────────────
  const { invoices, totalItems, totalPages } = useMemo(() => {
    if (!rawData) return { invoices: [] as BatchInvoice[], totalItems: 0, totalPages: 1 };

    const envelope = rawData as unknown;
    let items: BatchInvoice[] = [];
    let total = 0;
    let pages = 1;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      // Standard paginated envelope: { data: [...], meta: { total, page, limit } }
      if (Array.isArray(env.data)) {
        items = env.data as BatchInvoice[];
        const meta = env.meta as Record<string, number> | undefined;
        total = meta?.total || items.length;
        pages = meta?.totalPages || Math.ceil(total / PAGE_SIZE);
      } else if (Array.isArray(env)) {
        items = env as unknown as BatchInvoice[];
        total = items.length;
      }
    }

    return { invoices: items, totalItems: total, totalPages: pages };
  }, [rawData]);

  // ─── Filter change resets page ───────────────────────────────────────────
  const handleStatusChange = (value: BatchInvoiceStatus | "ALL") => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER", "KASIR"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Invoice Batch
            </h2>
            <p className="text-sm text-muted-foreground">
              Kelola invoice batch untuk klaim asuransi korporat.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Buat Invoice Batch
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) =>
                handleStatusChange(e.target.value as BatchInvoiceStatus | "ALL")
              }
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-8 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground sm:w-52"
              aria-label="Filter status invoice"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-brand/5">
                  <th className="px-4 py-3 font-semibold text-brand">
                    No. Invoice
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Asuransi
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand hidden md:table-cell">
                    Periode
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand hidden sm:table-cell">
                    Jumlah Order
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Total
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                        Memuat invoice batch...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div
                        className="flex flex-col items-center gap-3"
                        role="alert"
                      >
                        <AlertCircle className="h-10 w-10 text-red-400 dark:text-red-500" />
                        <p className="font-medium text-red-700 dark:text-red-300">
                          Gagal memuat data invoice batch. Silakan coba lagi.
                        </p>
                        <button
                          onClick={() => refetch()}
                          className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
                          <FileText className="h-8 w-8 text-brand" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                          {statusFilter !== "ALL"
                            ? "Invoice Tidak Ditemukan"
                            : "Belum Ada Invoice Batch"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                          {statusFilter !== "ALL"
                            ? "Tidak ada invoice yang sesuai dengan filter."
                            : "Buat invoice batch pertama untuk mulai penagihan asuransi korporat."}
                        </p>
                        {statusFilter !== "ALL" && (
                          <button
                            onClick={() => handleStatusChange("ALL")}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-sm"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      onViewDetail={() => setDetailId(invoice.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Menampilkan{" "}
              {invoices.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems}{" "}
              invoice
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40 disabled:hover:bg-card"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[80px] text-center text-sm font-medium text-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40 disabled:hover:bg-card"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <CreateBatchInvoiceModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}

        {/* Detail Modal */}
        {detailId && (
          <BatchInvoiceDetailModal
            invoiceId={detailId}
            onClose={() => setDetailId(null)}
          />
        )}
      </div>
    </RoleGuard>
  );
}

// ─── Invoice Row Sub-component ───────────────────────────────────────────────

interface InvoiceRowProps {
  invoice: BatchInvoice;
  onViewDetail: () => void;
}

function InvoiceRow({ invoice, onViewDetail }: InvoiceRowProps) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <tr className="border-b border-border transition-colors hover:bg-brand/5">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-brand">
          {invoice.invoiceNumber}
        </span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {invoice.insurance.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {invoice.insurance.code}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
        {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-sm text-foreground text-center">
        {invoice.orderCount}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {formatRupiah(Number(invoice.totalAmount))}
      </td>
      <td className="px-4 py-3">
        <BatchInvoiceStatusBadge status={invoice.status} />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onViewDetail}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          aria-label={`Lihat detail invoice ${invoice.invoiceNumber}`}
        >
          <Eye className="h-3.5 w-3.5" />
          Detail
        </button>
      </td>
    </tr>
  );
}

// ─── Create Batch Invoice Modal ──────────────────────────────────────────────

interface CreateBatchInvoiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateBatchInvoiceModal({
  onClose,
  onSuccess,
}: CreateBatchInvoiceModalProps) {
  const [insuranceId, setInsuranceId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: insuranceData } = useMasterInsurances({ limit: 100 });
  const createMutation = useCreateBatchInvoice();

  // Parse insurances from response
  const insurances = useMemo(() => {
    if (!insuranceData) return [];
    const envelope = insuranceData as unknown;
    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      const data = env.data;
      if (Array.isArray(data)) {
        return data as Array<{ id: string; code: string; name: string; type: string }>;
      }
    }
    return [];
  }, [insuranceData]);

  // Filter to only CORPORATE type insurances
  const corporateInsurances = useMemo(
    () => insurances.filter((ins) => ins.type === "CORPORATE"),
    [insurances]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!insuranceId || !periodStart || !periodEnd) {
      setFormError("Mohon lengkapi semua field wajib.");
      return;
    }

    if (new Date(periodStart) >= new Date(periodEnd)) {
      setFormError("Tanggal awal periode harus sebelum tanggal akhir.");
      return;
    }

    const payload: CreateBatchInvoicePayload = {
      insuranceId,
      periodStart,
      periodEnd,
    };
    if (dueDate) payload.dueDate = dueDate;
    if (notes.trim()) payload.notes = notes.trim();

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr?.message || "Gagal membuat invoice batch.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-invoice-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3
            id="create-invoice-title"
            className="text-lg font-bold text-foreground"
          >
            Buat Invoice Batch
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Insurance Select */}
          <div>
            <label
              htmlFor="insuranceId"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Asuransi Korporat <span className="text-red-500">*</span>
            </label>
            <select
              id="insuranceId"
              value={insuranceId}
              onChange={(e) => setInsuranceId(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              required
            >
              <option value="">Pilih asuransi...</option>
              {corporateInsurances.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name} ({ins.code})
                </option>
              ))}
            </select>
            {insurances.length > 0 && corporateInsurances.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Tidak ada asuransi bertipe CORPORATE.
              </p>
            )}
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="periodStart"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Periode Awal <span className="text-red-500">*</span>
              </label>
              <input
                id="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                required
              />
            </div>
            <div>
              <label
                htmlFor="periodEnd"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Periode Akhir <span className="text-red-500">*</span>
              </label>
              <input
                id="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                required
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Jatuh Tempo
            </label>
            <input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Catatan
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground resize-none"
              placeholder="Catatan tambahan (opsional)..."
            />
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memproses...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Buat Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Batch Invoice Detail Modal ──────────────────────────────────────────────

interface BatchInvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
}

function BatchInvoiceDetailModal({
  invoiceId,
  onClose,
}: BatchInvoiceDetailModalProps) {
  const { data: rawDetail, isLoading, refetch } = useBatchInvoice(invoiceId);
  const updateStatus = useUpdateBatchInvoiceStatus();
  const cancelMutation = useCancelBatchInvoice();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showPaidInput, setShowPaidInput] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Parse detail from response
  const detail: BatchInvoiceDetail | null = useMemo(() => {
    if (!rawDetail) return null;
    return rawDetail as unknown as BatchInvoiceDetail;
  }, [rawDetail]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleStatusTransition = async (newStatus: BatchInvoiceStatus) => {
    setActionError(null);
    try {
      const data: { status: BatchInvoiceStatus; paidAmount?: number } = { status: newStatus };
      if (
        (newStatus === "PAID" || newStatus === "PARTIALLY_PAID") &&
        paidAmount
      ) {
        data.paidAmount = parseFloat(paidAmount);
      }
      await updateStatus.mutateAsync({ id: invoiceId, data });
      setShowPaidInput(false);
      setPaidAmount("");
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setActionError(apiErr?.message || "Gagal mengubah status invoice.");
    }
  };

  const handleCancel = async () => {
    setActionError(null);
    try {
      await cancelMutation.mutateAsync(invoiceId);
      setShowCancelConfirm(false);
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setActionError(apiErr?.message || "Gagal membatalkan invoice.");
    }
  };

  // Determine allowed status transitions
  const allowedActions = useMemo(() => {
    if (!detail) return [];
    const actions: Array<{
      status: BatchInvoiceStatus;
      label: string;
      icon: React.ReactNode;
      variant: string;
    }> = [];

    switch (detail.status) {
      case "DRAFT":
        actions.push({
          status: "SENT",
          label: "Kirim",
          icon: <Send className="h-3.5 w-3.5" />,
          variant: "blue",
        });
        break;
      case "SENT":
        actions.push({
          status: "PARTIALLY_PAID",
          label: "Bayar Sebagian",
          icon: <DollarSign className="h-3.5 w-3.5" />,
          variant: "amber",
        });
        actions.push({
          status: "PAID",
          label: "Lunas",
          icon: <DollarSign className="h-3.5 w-3.5" />,
          variant: "green",
        });
        actions.push({
          status: "OVERDUE",
          label: "Jatuh Tempo",
          icon: <Clock className="h-3.5 w-3.5" />,
          variant: "orange",
        });
        break;
      case "PARTIALLY_PAID":
        actions.push({
          status: "PAID",
          label: "Lunas",
          icon: <DollarSign className="h-3.5 w-3.5" />,
          variant: "green",
        });
        actions.push({
          status: "OVERDUE",
          label: "Jatuh Tempo",
          icon: <Clock className="h-3.5 w-3.5" />,
          variant: "orange",
        });
        break;
      case "OVERDUE":
        actions.push({
          status: "PARTIALLY_PAID",
          label: "Bayar Sebagian",
          icon: <DollarSign className="h-3.5 w-3.5" />,
          variant: "amber",
        });
        actions.push({
          status: "PAID",
          label: "Lunas",
          icon: <DollarSign className="h-3.5 w-3.5" />,
          variant: "green",
        });
        break;
    }

    return actions;
  }, [detail]);

  const canCancel =
    detail &&
    detail.status !== "PAID" &&
    detail.status !== "CANCELLED";

  const variantClasses: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    green:
      "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    orange:
      "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-invoice-title"
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3
            id="detail-invoice-title"
            className="text-lg font-bold text-foreground"
          >
            Detail Invoice Batch
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : !detail ? (
          <div className="text-center py-8 text-muted-foreground">
            Invoice tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-5">
            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground">No. Invoice</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {detail.invoiceNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-0.5">
                  <BatchInvoiceStatusBadge status={detail.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Asuransi</p>
                <p className="text-sm font-medium text-foreground">
                  {detail.insurance.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Periode</p>
                <p className="text-sm text-foreground">
                  {formatDate(detail.periodStart)} –{" "}
                  {formatDate(detail.periodEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-bold text-foreground">
                  {formatRupiah(Number(detail.totalAmount))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jumlah Order</p>
                <p className="text-sm text-foreground">{detail.orderCount}</p>
              </div>
              {detail.dueDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Jatuh Tempo</p>
                  <p className="text-sm text-foreground">
                    {formatDate(detail.dueDate)}
                  </p>
                </div>
              )}
              {detail.paidAmount && (
                <div>
                  <p className="text-xs text-muted-foreground">
                    Jumlah Dibayar
                  </p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {formatRupiah(Number(detail.paidAmount))}
                  </p>
                </div>
              )}
              {detail.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Catatan</p>
                  <p className="text-sm text-foreground">{detail.notes}</p>
                </div>
              )}
            </div>

            {/* Status transition actions */}
            {(allowedActions.length > 0 || canCancel) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Ubah Status
                </h4>

                {/* Paid amount input */}
                {showPaidInput && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="Jumlah pembayaran..."
                      className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                      min="0"
                    />
                    <button
                      onClick={() => setShowPaidInput(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {allowedActions.map((action) => (
                    <button
                      key={action.status}
                      onClick={() => {
                        if (
                          action.status === "PAID" ||
                          action.status === "PARTIALLY_PAID"
                        ) {
                          if (!showPaidInput) {
                            setShowPaidInput(true);
                            return;
                          }
                          handleStatusTransition(action.status);
                        } else {
                          handleStatusTransition(action.status);
                        }
                      }}
                      disabled={
                        updateStatus.isPending || cancelMutation.isPending
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                        variantClasses[action.variant]
                      )}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                  {canCancel && !showCancelConfirm && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={
                        updateStatus.isPending || cancelMutation.isPending
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Batalkan
                    </button>
                  )}
                  {showCancelConfirm && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
                      <span className="text-xs text-red-700 dark:text-red-300">
                        Yakin batalkan invoice ini? Order akan dibebaskan.
                      </span>
                      <button
                        onClick={handleCancel}
                        disabled={cancelMutation.isPending}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {cancelMutation.isPending ? "..." : "Ya, Batalkan"}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        Tidak
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {actionError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {actionError}
              </div>
            )}

            {/* Order Items Table */}
            {detail.items && detail.items.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Daftar Order ({detail.items.length})
                </h4>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0">
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-3 py-2 font-semibold text-muted-foreground">
                            No. Order
                          </th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground">
                            Pasien
                          </th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground">
                            MRN
                          </th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground">
                            Total
                          </th>
                          <th className="px-3 py-2 font-semibold text-muted-foreground">
                            Tanggal Bayar
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2 font-mono text-foreground">
                              {item.order.orderNumber}
                            </td>
                            <td className="px-3 py-2 text-foreground">
                              {item.order.patient?.name || "—"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.order.patient?.mrn || "—"}
                            </td>
                            <td className="px-3 py-2 font-medium text-foreground">
                              {formatRupiah(Number(item.order.totalAmount))}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.order.paidAt
                                ? new Date(
                                    item.order.paidAt
                                  ).toLocaleDateString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
