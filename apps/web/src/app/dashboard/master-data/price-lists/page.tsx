"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  X,
  Filter,
  Edit2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Tag,
  Package,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  usePriceLists,
  usePriceList,
  useCreatePriceList,
  useUpdatePriceList,
  useAddPriceListItem,
  type PriceList,
  type PriceListType,
  type CreatePriceListPayload,
  type UpdatePriceListPayload,
  type AddPriceListItemPayload,
} from "@/services/price-lists";
import { apiClient } from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const TYPE_OPTIONS: { value: PriceListType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Tipe" },
  { value: "CORPORATE", label: "Korporat" },
  { value: "INSURANCE", label: "Asuransi" },
  { value: "PROMOTION", label: "Promosi" },
  { value: "PACKAGE", label: "Paket" },
];

const TYPE_CONFIG: Record<
  PriceListType,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  CORPORATE: {
    label: "Korporat",
    dot: "bg-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-700/50",
  },
  INSURANCE: {
    label: "Asuransi",
    dot: "bg-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-700/50",
  },
  PROMOTION: {
    label: "Promosi",
    dot: "bg-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    ring: "ring-purple-200 dark:ring-purple-700/50",
  },
  PACKAGE: {
    label: "Paket",
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-700/50",
  },
};

// ─── Type Badge Component ────────────────────────────────────────────────────

function PriceListTypeBadge({ type }: { type: PriceListType }) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return <span className="text-xs text-muted-foreground">{type}</span>;
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

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({ isActive, effectiveTo }: { isActive: boolean; effectiveTo: string | null }) {
  const now = new Date();
  const isExpired = effectiveTo && new Date(effectiveTo) < now;

  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700/50">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Nonaktif
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-orange-200 dark:ring-orange-700/50">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
        Kedaluwarsa
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-green-200 dark:ring-green-700/50">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Aktif
    </span>
  );
}

// ─── Validity Badge Component ────────────────────────────────────────────────

function ValidityBadge({ effectiveFrom, effectiveTo }: { effectiveFrom: string; effectiveTo: string | null }) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Calendar className="h-3 w-3" />
      {formatDate(effectiveFrom)}
      {effectiveTo ? ` – ${formatDate(effectiveTo)}` : " – ∞"}
    </span>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function PriceListsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<PriceListType | "ALL">("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    type: typeFilter !== "ALL" ? typeFilter : undefined,
  };

  const { data: rawData, isLoading, error, refetch } = usePriceLists(queryParams);

  // ─── Parse data ──────────────────────────────────────────────────────────
  const { priceLists, totalItems, totalPages } = useMemo(() => {
    if (!rawData) return { priceLists: [] as PriceList[], totalItems: 0, totalPages: 1 };

    const envelope = rawData as unknown;
    let items: PriceList[] = [];
    let total = 0;
    let pages = 1;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      if (Array.isArray(env.data)) {
        items = env.data as PriceList[];
        const meta = env.meta as Record<string, number> | undefined;
        total = meta?.total || items.length;
        pages = meta?.totalPages || Math.ceil(total / PAGE_SIZE);
      } else if (Array.isArray(env)) {
        items = env as unknown as PriceList[];
        total = items.length;
      }
    }

    return { priceLists: items, totalItems: total, totalPages: pages };
  }, [rawData]);

  const handleTypeChange = (value: PriceListType | "ALL") => {
    setTypeFilter(value);
    setPage(1);
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Daftar Harga
            </h2>
            <p className="text-sm text-muted-foreground">
              Kelola daftar harga berdasarkan tipe: korporat, asuransi, promosi, dan paket.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tambah Daftar Harga
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={typeFilter}
              onChange={(e) => handleTypeChange(e.target.value as PriceListType | "ALL")}
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-8 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground sm:w-52"
              aria-label="Filter tipe daftar harga"
            >
              {TYPE_OPTIONS.map((opt) => (
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
                  <th className="px-4 py-3 font-semibold text-brand">Nama</th>
                  <th className="px-4 py-3 font-semibold text-brand">Tipe</th>
                  <th className="px-4 py-3 font-semibold text-brand hidden md:table-cell">Validitas</th>
                  <th className="px-4 py-3 font-semibold text-brand">Status</th>
                  <th className="px-4 py-3 font-semibold text-brand">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                        Memuat daftar harga...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3" role="alert">
                        <AlertCircle className="h-10 w-10 text-red-400 dark:text-red-500" />
                        <p className="font-medium text-red-700 dark:text-red-300">
                          Gagal memuat data daftar harga. Silakan coba lagi.
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
                ) : priceLists.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
                          <Tag className="h-8 w-8 text-brand" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                          {typeFilter !== "ALL"
                            ? "Daftar Harga Tidak Ditemukan"
                            : "Belum Ada Daftar Harga"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                          {typeFilter !== "ALL"
                            ? "Tidak ada daftar harga yang sesuai dengan filter."
                            : "Tambahkan daftar harga pertama untuk mulai mengelola tarif."}
                        </p>
                        {typeFilter !== "ALL" && (
                          <button
                            onClick={() => handleTypeChange("ALL")}
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
                  priceLists.map((priceList) => (
                    <PriceListRow
                      key={priceList.id}
                      priceList={priceList}
                      onEdit={() => setEditId(priceList.id)}
                      onViewItems={() => setDetailId(priceList.id)}
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
              Menampilkan {priceLists.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems} daftar harga
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
          <CreatePriceListModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        )}

        {/* Edit Modal */}
        {editId && (
          <EditPriceListModal
            priceListId={editId}
            onClose={() => setEditId(null)}
            onSuccess={() => {
              setEditId(null);
              refetch();
            }}
          />
        )}

        {/* Items Detail Modal */}
        {detailId && (
          <PriceListItemsModal
            priceListId={detailId}
            onClose={() => setDetailId(null)}
          />
        )}
      </div>
    </RoleGuard>
  );
}

// ─── Price List Row Sub-component ────────────────────────────────────────────

interface PriceListRowProps {
  priceList: PriceList;
  onEdit: () => void;
  onViewItems: () => void;
}

function PriceListRow({ priceList, onEdit, onViewItems }: PriceListRowProps) {
  return (
    <tr className="border-b border-border transition-colors hover:bg-brand/5">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{priceList.name}</p>
          {priceList.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{priceList.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <PriceListTypeBadge type={priceList.type} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <ValidityBadge effectiveFrom={priceList.effectiveFrom} effectiveTo={priceList.effectiveTo} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge isActive={priceList.isActive} effectiveTo={priceList.effectiveTo} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onViewItems}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            aria-label={`Lihat item daftar harga ${priceList.name}`}
          >
            <Package className="h-3.5 w-3.5" />
            Item
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            aria-label={`Edit daftar harga ${priceList.name}`}
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Create Price List Modal ─────────────────────────────────────────────────

interface CreatePriceListModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePriceListModal({ onClose, onSuccess }: CreatePriceListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PriceListType>("CORPORATE");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreatePriceList();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !effectiveFrom) {
      setFormError("Mohon lengkapi semua field wajib.");
      return;
    }

    if (effectiveTo && new Date(effectiveFrom) >= new Date(effectiveTo)) {
      setFormError("Tanggal berlaku awal harus sebelum tanggal akhir.");
      return;
    }

    const payload: CreatePriceListPayload = {
      name: name.trim(),
      type,
      effectiveFrom,
    };
    if (description.trim()) payload.description = description.trim();
    if (effectiveTo) payload.effectiveTo = effectiveTo;

    try {
      await createMutation.mutateAsync(payload);
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr?.message || "Gagal membuat daftar harga.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-pricelist-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 id="create-pricelist-title" className="text-lg font-bold text-foreground">
            Tambah Daftar Harga
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
          {/* Name */}
          <div>
            <label htmlFor="pl-name" className="block text-sm font-medium text-foreground mb-1.5">
              Nama <span className="text-red-500">*</span>
            </label>
            <input
              id="pl-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              placeholder="Nama daftar harga..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="pl-desc" className="block text-sm font-medium text-foreground mb-1.5">
              Deskripsi
            </label>
            <textarea
              id="pl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground resize-none"
              placeholder="Deskripsi opsional..."
            />
          </div>

          {/* Type */}
          <div>
            <label htmlFor="pl-type" className="block text-sm font-medium text-foreground mb-1.5">
              Tipe <span className="text-red-500">*</span>
            </label>
            <select
              id="pl-type"
              value={type}
              onChange={(e) => setType(e.target.value as PriceListType)}
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
            >
              <option value="CORPORATE">Korporat</option>
              <option value="INSURANCE">Asuransi</option>
              <option value="PROMOTION">Promosi</option>
              <option value="PACKAGE">Paket</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pl-from" className="block text-sm font-medium text-foreground mb-1.5">
                Berlaku Dari <span className="text-red-500">*</span>
              </label>
              <input
                id="pl-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                required
              />
            </div>
            <div>
              <label htmlFor="pl-to" className="block text-sm font-medium text-foreground mb-1.5">
                Berlaku Sampai
              </label>
              <input
                id="pl-to"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              />
            </div>
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
                  Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Price List Modal ───────────────────────────────────────────────────

interface EditPriceListModalProps {
  priceListId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function EditPriceListModal({ priceListId, onClose, onSuccess }: EditPriceListModalProps) {
  const { data: rawDetail, isLoading: loadingDetail } = usePriceList(priceListId);
  const updateMutation = useUpdatePriceList();

  const detail = useMemo(() => {
    if (!rawDetail) return null;
    const env = rawDetail as unknown as Record<string, unknown>;
    if (env.data && typeof env.data === "object" && "id" in (env.data as object)) {
      return env.data as unknown as PriceList;
    }
    return rawDetail as unknown as PriceList;
  }, [rawDetail]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PriceListType>("CORPORATE");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Populate form when detail loads
  if (detail && !initialized) {
    setName(detail.name || "");
    setDescription(detail.description || "");
    setType(detail.type || "CORPORATE");
    setEffectiveFrom(detail.effectiveFrom ? detail.effectiveFrom.split("T")[0] : "");
    setEffectiveTo(detail.effectiveTo ? detail.effectiveTo.split("T")[0] : "");
    setIsActive(detail.isActive ?? true);
    setInitialized(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !effectiveFrom) {
      setFormError("Mohon lengkapi semua field wajib.");
      return;
    }

    if (effectiveTo && new Date(effectiveFrom) >= new Date(effectiveTo)) {
      setFormError("Tanggal berlaku awal harus sebelum tanggal akhir.");
      return;
    }

    const payload: UpdatePriceListPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      effectiveFrom,
      effectiveTo: effectiveTo || undefined,
      isActive,
    };

    try {
      await updateMutation.mutateAsync({ id: priceListId, data: payload });
      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setFormError(apiErr?.message || "Gagal memperbarui daftar harga.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-pricelist-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 id="edit-pricelist-title" className="text-lg font-bold text-foreground">
            Edit Daftar Harga
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="edit-pl-name" className="block text-sm font-medium text-foreground mb-1.5">
                Nama <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-pl-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="edit-pl-desc" className="block text-sm font-medium text-foreground mb-1.5">
                Deskripsi
              </label>
              <textarea
                id="edit-pl-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="edit-pl-type" className="block text-sm font-medium text-foreground mb-1.5">
                Tipe <span className="text-red-500">*</span>
              </label>
              <select
                id="edit-pl-type"
                value={type}
                onChange={(e) => setType(e.target.value as PriceListType)}
                className="h-10 w-full appearance-none rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              >
                <option value="CORPORATE">Korporat</option>
                <option value="INSURANCE">Asuransi</option>
                <option value="PROMOTION">Promosi</option>
                <option value="PACKAGE">Paket</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-pl-from" className="block text-sm font-medium text-foreground mb-1.5">
                  Berlaku Dari <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-pl-from"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-pl-to" className="block text-sm font-medium text-foreground mb-1.5">
                  Berlaku Sampai
                </label>
                <input
                  id="edit-pl-to"
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <input
                id="edit-pl-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
              />
              <label htmlFor="edit-pl-active" className="text-sm font-medium text-foreground">
                Aktif
              </label>
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
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


// ─── Price List Items Modal ──────────────────────────────────────────────────

interface PriceListItemsModalProps {
  priceListId: string;
  onClose: () => void;
}

function PriceListItemsModal({ priceListId, onClose }: PriceListItemsModalProps) {
  const { data: rawDetail, isLoading, refetch } = usePriceList(priceListId);
  const addItemMutation = useAddPriceListItem();

  const [showAddItem, setShowAddItem] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [testResults, setTestResults] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedTest, setSelectedTest] = useState<{ id: string; name: string; code: string } | null>(null);
  const [itemPrice, setItemPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState("");
  const [itemError, setItemError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const detail = useMemo(() => {
    if (!rawDetail) return null;
    const env = rawDetail as unknown as Record<string, unknown>;
    if (env.data && typeof env.data === "object" && "id" in (env.data as object)) {
      return env.data as unknown as PriceList;
    }
    return rawDetail as unknown as PriceList;
  }, [rawDetail]);

  // Search tests
  const handleTestSearch = async (query: string) => {
    setTestSearch(query);
    if (query.length < 2) {
      setTestResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/v1/master/tests?search=${encodeURIComponent(query)}&limit=10`);
      const envelope = res as unknown as Record<string, unknown>;
      const data = Array.isArray(envelope.data) ? envelope.data : Array.isArray(envelope) ? envelope : [];
      setTestResults(data as Array<{ id: string; name: string; code: string }>);
    } catch {
      setTestResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectTest = (test: { id: string; name: string; code: string }) => {
    setSelectedTest(test);
    setTestSearch("");
    setTestResults([]);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);

    if (!selectedTest || !itemPrice) {
      setItemError("Pilih pemeriksaan dan masukkan harga.");
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setItemError("Harga harus berupa angka positif.");
      return;
    }

    const discount = itemDiscount ? parseFloat(itemDiscount) : 0;
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setItemError("Diskon harus antara 0 dan 100.");
      return;
    }

    const payload: AddPriceListItemPayload = {
      testId: selectedTest.id,
      price,
      discount,
    };

    try {
      await addItemMutation.mutateAsync({ priceListId, data: payload });
      setSelectedTest(null);
      setItemPrice("");
      setItemDiscount("");
      setShowAddItem(false);
      refetch();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setItemError(apiErr?.message || "Gagal menambahkan item.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="items-pricelist-title"
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 id="items-pricelist-title" className="text-lg font-bold text-foreground">
              Item Daftar Harga
            </h3>
            {detail && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {detail.name} — <PriceListTypeBadge type={detail.type} />
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Add Item Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddItem(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-dark"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Item
              </button>
            </div>

            {/* Add Item Form */}
            {showAddItem && (
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Tambah Item Baru</h4>

                {/* Test Search */}
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Pemeriksaan <span className="text-red-500">*</span>
                  </label>
                  {selectedTest ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand">
                        {selectedTest.name} ({selectedTest.code})
                      </span>
                      <button
                        onClick={() => setSelectedTest(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={testSearch}
                        onChange={(e) => handleTestSearch(e.target.value)}
                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                        placeholder="Cari nama atau kode pemeriksaan..."
                      />
                      {testSearch.length >= 2 && (testResults.length > 0 || searchLoading) && (
                        <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
                          {searchLoading ? (
                            <div className="px-4 py-2 text-xs text-muted-foreground">Mencari...</div>
                          ) : (
                            testResults.map((test) => (
                              <button
                                key={test.id}
                                onClick={() => handleSelectTest(test)}
                                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-brand/5 transition-colors"
                              >
                                <span className="text-foreground">{test.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{test.code}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Price & Discount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Harga (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={itemDiscount}
                      onChange={(e) => setItemDiscount(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Error */}
                {itemError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {itemError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddItem(false);
                      setSelectedTest(null);
                      setItemPrice("");
                      setItemDiscount("");
                      setItemError(null);
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={addItemMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {addItemMutation.isPending ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Tambah
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-brand/5">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-brand">Pemeriksaan</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-brand">Harga</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-brand">Diskon (%)</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-brand">Harga Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!detail?.items || detail.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <DollarSign className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm">Belum ada item dalam daftar harga ini.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    detail.items.map((item) => {
                      const finalPrice = Number(item.price) * (1 - Number(item.discount) / 100);
                      return (
                        <tr key={item.id} className="hover:bg-brand/5 transition-colors">
                          <td className="px-4 py-2.5">
                            <div>
                              <p className="font-medium text-foreground">
                                {item.test?.name || "—"}
                              </p>
                              {item.test?.code && (
                                <p className="text-xs text-muted-foreground">{item.test.code}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-foreground">
                            {formatRupiah(Number(item.price))}
                          </td>
                          <td className="px-4 py-2.5 text-right text-foreground">
                            {Number(item.discount) > 0 ? (
                              <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                {item.discount}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                            {formatRupiah(finalPrice)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
