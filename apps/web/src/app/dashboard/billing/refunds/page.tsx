"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Plus,
  Receipt,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  useRefunds,
  useCreateRefund,
  useOrderSearch,
  type Refund,
  type RefundStatus,
  type PaymentMethod,
  type CreateRefundPayload,
} from "@/services/refunds";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const STATUS_OPTIONS: { value: RefundStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Status" },
  { value: "PENDING", label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "PROCESSED", label: "Diproses" },
  { value: "REJECTED", label: "Ditolak" },
];

const REFUND_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Tunai" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "EDC", label: "EDC" },
  { value: "INSURANCE", label: "Asuransi" },
  { value: "BPJS", label: "BPJS" },
  { value: "INSURANCE_CASH_FALLBACK", label: "Asuransi (Tunai Fallback)" },
  { value: "CORPORATE_DEFERRED", label: "Korporat (Tertunda)" },
];

// ─── Status Badge ────────────────────────────────────────────────────────────

function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const config: Record<RefundStatus, { label: string; className: string }> = {
    PENDING: {
      label: "Menunggu",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    APPROVED: {
      label: "Disetujui",
      className:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    },
    PROCESSED: {
      label: "Diproses",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    },
    REJECTED: {
      label: "Ditolak",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    },
  };

  const { label, className } = config[status] ?? config.PENDING;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
    >
      {label}
    </span>
  );
}

// ─── Create Refund Form ──────────────────────────────────────────────────────

interface CreateRefundFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateRefundForm({ onClose, onSuccess }: CreateRefundFormProps) {
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod | "">("");
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const { data: orderResults } = useOrderSearch(orderSearch);
  const createRefund = useCreateRefund();

  const orders = useMemo(() => {
    if (!orderResults) return [];
    const envelope = orderResults as unknown;
    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      const inner = env.data ?? env;
      if (Array.isArray(inner)) return inner;
      if (inner && typeof inner === "object") {
        const dataArr = (inner as Record<string, unknown>).data;
        if (Array.isArray(dataArr)) return dataArr;
      }
    }
    if (Array.isArray(envelope)) return envelope;
    return [];
  }, [orderResults]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId || !amount || !reason) return;

    const payload: CreateRefundPayload = {
      orderId: selectedOrderId,
      amount: parseFloat(amount),
      reason,
    };

    if (refundMethod) {
      payload.refundMethod = refundMethod as PaymentMethod;
    }

    try {
      await createRefund.mutateAsync(payload);
      onSuccess();
      onClose();
    } catch {
      // Error is tracked by mutation state
    }
  };

  const handleOrderSelect = (order: Record<string, unknown>) => {
    setSelectedOrderId(order.id as string);
    setSelectedOrderNumber(order.orderNumber as string);
    setOrderSearch(order.orderNumber as string);
    setShowOrderDropdown(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Buat Refund Baru</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Tutup formulir"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Order Search */}
          <div className="relative">
            <label
              htmlFor="order-search"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Order <span className="text-red-500">*</span>
            </label>
            <input
              id="order-search"
              type="text"
              placeholder="Cari nomor order..."
              value={orderSearch}
              onChange={(e) => {
                setOrderSearch(e.target.value);
                setShowOrderDropdown(true);
                if (!e.target.value) {
                  setSelectedOrderId("");
                  setSelectedOrderNumber("");
                }
              }}
              onFocus={() => setShowOrderDropdown(true)}
              className="h-10 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
              autoComplete="off"
            />
            {selectedOrderNumber && (
              <p className="mt-1 text-xs text-muted-foreground">
                Dipilih: <span className="font-mono font-semibold text-brand">{selectedOrderNumber}</span>
              </p>
            )}

            {/* Order Dropdown */}
            {showOrderDropdown && orders.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                {orders.map((order: Record<string, unknown>) => (
                  <button
                    key={order.id as string}
                    type="button"
                    onClick={() => handleOrderSelect(order)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-brand/5 border-b border-border last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-foreground">
                        {order.orderNumber as string}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.status as string}
                      </span>
                    </div>
                    {order.patient ? (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {String((order.patient as Record<string, unknown>).name ?? "")} —{" "}
                        {String((order.patient as Record<string, unknown>).mrn ?? "")}
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="refund-amount"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Jumlah Refund (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              id="refund-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label
              htmlFor="refund-reason"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Alasan Refund <span className="text-red-500">*</span>
            </label>
            <textarea
              id="refund-reason"
              placeholder="Masukkan alasan refund..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground resize-none"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {reason.length}/500
            </p>
          </div>

          {/* Refund Method */}
          <div>
            <label
              htmlFor="refund-method"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Metode Refund
            </label>
            <select
              id="refund-method"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as PaymentMethod | "")}
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
            >
              <option value="">Pilih metode...</option>
              {REFUND_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {createRefund.isError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {(() => {
                const err = createRefund.error as unknown as Record<string, unknown> | undefined;
                const msg = err?.message as string | undefined;
                return msg || "Gagal membuat refund. Silakan coba lagi.";
              })()}
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
              disabled={!selectedOrderId || !amount || !reason || createRefund.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createRefund.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Memproses...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Buat Refund
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function RefundsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "ALL">("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    search: search.trim() || undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  };

  const { data: rawData, isLoading, error, refetch } = useRefunds(queryParams);

  // ─── Parse data ──────────────────────────────────────────────────────────
  const { refunds, totalItems } = useMemo(() => {
    if (!rawData) return { refunds: [] as Refund[], totalItems: 0 };

    const envelope = rawData as unknown;
    let items: Refund[] = [];
    let total = 0;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      const inner = (env.data ?? env) as Record<string, unknown>;

      if (Array.isArray(inner)) {
        items = inner as Refund[];
        total = items.length;
      } else if (inner && typeof inner === "object") {
        const dataArr = (inner as Record<string, unknown>).data;
        if (Array.isArray(dataArr)) {
          items = dataArr as Refund[];
          const meta = (inner as Record<string, unknown>).meta as
            | Record<string, unknown>
            | undefined;
          total = Number(meta?.total) || items.length;
        } else {
          items = Array.isArray(env) ? (env as Refund[]) : [];
          total = items.length;
        }
      }
    }

    if (Array.isArray(envelope)) {
      items = envelope as Refund[];
      total = items.length;
    }

    return { refunds: items, totalItems: total };
  }, [rawData]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // ─── Filter change resets page ───────────────────────────────────────────
  const handleStatusChange = useCallback((value: RefundStatus | "ALL") => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "KASIR"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Proses Refund
            </h2>
            <p className="text-sm text-muted-foreground">
              Kelola dan lacak refund pembayaran pasien.
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Buat Refund
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) =>
                handleStatusChange(e.target.value as RefundStatus | "ALL")
              }
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-8 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground sm:w-48"
              aria-label="Filter status refund"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari no. order, pasien..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
              aria-label="Cari refund"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-brand/5">
                  <th className="px-4 py-3 font-semibold text-brand">
                    No. Order
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Pasien
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Jumlah
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Alasan
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Metode
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand hidden md:table-cell">
                    Tanggal
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
                        Memuat data refund...
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
                          Gagal memuat data refund. Silakan coba lagi.
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
                ) : refunds.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
                          <Receipt className="h-8 w-8 text-brand" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                          {search || statusFilter !== "ALL"
                            ? "Refund Tidak Ditemukan"
                            : "Belum Ada Refund"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                          {search || statusFilter !== "ALL"
                            ? "Tidak ada refund yang sesuai dengan filter."
                            : "Refund akan muncul setelah dibuat."}
                        </p>
                        {(search || statusFilter !== "ALL") && (
                          <button
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("ALL");
                            }}
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
                  refunds.map((refund) => (
                    <RefundRow
                      key={refund.id}
                      refund={refund}
                      formatCurrency={formatCurrency}
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
              {refunds.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems}{" "}
              refund
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

        {/* Create Refund Modal */}
        {showCreateForm && (
          <CreateRefundForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => refetch()}
          />
        )}
      </div>
    </RoleGuard>
  );
}

// ─── RefundRow Sub-component ─────────────────────────────────────────────────

interface RefundRowProps {
  refund: Refund;
  formatCurrency: (value: number | string) => string;
}

function RefundRow({ refund, formatCurrency }: RefundRowProps) {
  const methodLabel = REFUND_METHOD_OPTIONS.find(
    (m) => m.value === refund.refundMethod
  )?.label;

  return (
    <tr className="border-b border-border transition-colors hover:bg-brand/5">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-semibold text-brand">
          {refund.order?.orderNumber ?? "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        {refund.order?.patient ? (
          <div>
            <p className="text-sm text-foreground">
              {refund.order.patient.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {refund.order.patient.mrn}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(refund.amount)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-foreground line-clamp-2 max-w-[200px]">
          {refund.reason}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {methodLabel ?? "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <RefundStatusBadge status={refund.status} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
        {refund.createdAt
          ? new Date(refund.createdAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—"}
      </td>
    </tr>
  );
}
