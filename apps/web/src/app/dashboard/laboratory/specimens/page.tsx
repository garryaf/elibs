"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  TestTube,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Printer,
  Barcode,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { SpecimenConditionBadge } from "@/components/laboratory/specimen-condition-badge";
import {
  useSpecimens,
  useBatchLabels,
  type Specimen,
  type SampleCondition,
} from "@/services/specimens";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const CONDITION_OPTIONS: { value: SampleCondition | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Kondisi" },
  { value: "ACCEPTABLE", label: "Diterima" },
  { value: "HEMOLYZED", label: "Hemolisis" },
  { value: "LIPEMIC", label: "Lipemik" },
  { value: "CLOTTED", label: "Beku" },
  { value: "INSUFFICIENT", label: "Tidak Cukup" },
  { value: "OTHER", label: "Lainnya" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpecimensListPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [conditionFilter, setConditionFilter] = useState<
    SampleCondition | "ALL"
  >("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    search: search.trim() || undefined,
    condition: conditionFilter !== "ALL" ? conditionFilter : undefined,
  };

  const { data: rawData, isLoading, error, refetch } = useSpecimens(queryParams);

  const batchLabels = useBatchLabels();

  // ─── Parse data ──────────────────────────────────────────────────────────
  const { specimens, totalItems } = useMemo(() => {
    if (!rawData) return { specimens: [] as Specimen[], totalItems: 0 };

    const envelope = rawData as unknown;
    let items: Specimen[] = [];
    let total = 0;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      const inner = (env.data ?? env) as Record<string, unknown>;

      if (Array.isArray(inner)) {
        items = inner as Specimen[];
        total = items.length;
      } else if (inner && typeof inner === "object") {
        const dataArr = (inner as Record<string, unknown>).data;
        if (Array.isArray(dataArr)) {
          items = dataArr as Specimen[];
          const meta = (inner as Record<string, unknown>).meta as
            | Record<string, unknown>
            | undefined;
          total = Number(meta?.total) || items.length;
        } else {
          // Plain array response
          items = Array.isArray(env) ? (env as Specimen[]) : [];
          total = items.length;
        }
      }
    }

    if (Array.isArray(envelope)) {
      items = envelope as Specimen[];
      total = items.length;
    }

    return { specimens: items, totalItems: total };
  }, [rawData]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // ─── Selection handlers ──────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === specimens.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(specimens.map((s) => s.id)));
    }
  }, [specimens, selectedIds.size]);

  // ─── Batch print handler ─────────────────────────────────────────────────
  const handleBatchPrint = async () => {
    if (selectedIds.size === 0) return;
    try {
      const blob = await batchLabels.mutateAsync(Array.from(selectedIds));
      // Download the ZPL file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "specimen-labels.zpl";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Error handled by mutation state
    }
  };

  // ─── Filter change resets page ───────────────────────────────────────────
  const handleConditionChange = (value: SampleCondition | "ALL") => {
    setConditionFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "SAMPLING", "ANALIS"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Pelacakan Spesimen
            </h2>
            <p className="text-sm text-muted-foreground">
              Kelola spesimen laboratorium, barcode, dan custody chain.
            </p>
          </div>

          {/* Batch print action */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchPrint}
              disabled={batchLabels.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" />
              {batchLabels.isPending
                ? "Mencetak..."
                : `Cetak Label (${selectedIds.size})`}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Condition filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={conditionFilter}
              onChange={(e) =>
                handleConditionChange(e.target.value as SampleCondition | "ALL")
              }
              className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-8 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground sm:w-48"
              aria-label="Filter kondisi spesimen"
            >
              {CONDITION_OPTIONS.map((opt) => (
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
              placeholder="Cari barcode, order, pasien..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
              aria-label="Cari spesimen"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-brand/5">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        specimens.length > 0 &&
                        selectedIds.size === specimens.length
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
                      aria-label="Pilih semua spesimen"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Barcode
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Tipe Sampel
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand">
                    Kondisi
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand hidden md:table-cell">
                    No. Order
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand hidden lg:table-cell">
                    Pasien
                  </th>
                  <th className="px-4 py-3 font-semibold text-brand hidden sm:table-cell">
                    Waktu Koleksi
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
                        Memuat spesimen...
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
                          Gagal memuat data spesimen. Silakan coba lagi.
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
                ) : specimens.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-16 text-center text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center text-center">
                        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
                          <TestTube className="h-8 w-8 text-brand" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                          {search || conditionFilter !== "ALL"
                            ? "Spesimen Tidak Ditemukan"
                            : "Belum Ada Spesimen"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-xs">
                          {search || conditionFilter !== "ALL"
                            ? "Tidak ada spesimen yang sesuai dengan filter."
                            : "Spesimen akan muncul setelah order diproses."}
                        </p>
                        {(search || conditionFilter !== "ALL") && (
                          <button
                            onClick={() => {
                              setSearch("");
                              setConditionFilter("ALL");
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
                  specimens.map((specimen) => (
                    <SpecimenRow
                      key={specimen.id}
                      specimen={specimen}
                      isSelected={selectedIds.has(specimen.id)}
                      onToggleSelect={() => toggleSelect(specimen.id)}
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
              {specimens.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems}{" "}
              spesimen
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

        {/* Batch label error */}
        {batchLabels.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Gagal mencetak label batch. Silakan coba lagi.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

// ─── SpecimenRow Sub-component ───────────────────────────────────────────────

interface SpecimenRowProps {
  specimen: Specimen;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function SpecimenRow({
  specimen,
  isSelected,
  onToggleSelect,
}: SpecimenRowProps) {
  return (
    <tr className="border-b border-border transition-colors hover:bg-brand/5">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
          aria-label={`Pilih spesimen ${specimen.barcode}`}
        />
      </td>
      <td className="px-4 py-3">
        <Link
          href={`/dashboard/laboratory/specimens/${specimen.id}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-brand hover:underline"
        >
          <Barcode className="h-3.5 w-3.5" />
          {specimen.barcode}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {specimen.sampleTypeCode}
      </td>
      <td className="px-4 py-3">
        <SpecimenConditionBadge condition={specimen.condition} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {specimen.order ? (
          <span className="font-mono text-xs text-muted-foreground">
            {specimen.order.orderNumber}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {specimen.order?.patient ? (
          <div>
            <p className="text-sm text-foreground">
              {specimen.order.patient.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {specimen.order.patient.mrn}
            </p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
        {specimen.collectedAt
          ? new Date(specimen.collectedAt).toLocaleDateString("id-ID", {
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
