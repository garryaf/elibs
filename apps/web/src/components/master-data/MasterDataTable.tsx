"use client";

import { useState, useEffect } from "react";
import { Search, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface MasterDataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  meta?: { total: number; page: number; limit: number; totalPages?: number };
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  onSearch?: (query: string) => void;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Safely render a cell value. If the value is an object (e.g. a relation),
 * extract a human-readable field like `name` to prevent React Error #31.
 */
function renderCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    // Handle relation objects — prefer .name, .label, .code
    const obj = value as Record<string, unknown>;
    if ("name" in obj && typeof obj.name === "string") return obj.name;
    if ("label" in obj && typeof obj.label === "string") return obj.label;
    if ("code" in obj && typeof obj.code === "string") return obj.code;
    return "—";
  }
  return String(value);
}

export function MasterDataTable({
  columns,
  data,
  meta,
  onEdit,
  onDelete,
  onSearch,
  onPageChange,
  isLoading = false,
}: MasterDataTableProps) {
  const [searchValue, setSearchValue] = useState("");

  // Debounced search
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    onSearch?.(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  const totalPages = meta?.totalPages ?? (meta ? Math.ceil(meta.total / meta.limit) : 1);
  const currentPage = meta?.page ?? 1;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {onSearch && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari..."
              disabled
              className="pl-9"
            />
          </div>
        )}
        <TableSkeleton rows={5} cols={columns.length + 1} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {onSearch && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
            aria-label="Cari data"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {col.label.toUpperCase()}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-5 py-3.5 text-right text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                    AKSI
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                    className="py-16 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr
                    key={(row.id as string | number) ?? rowIdx}
                    className={cn(
                      "border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50",
                      rowIdx === data.length - 1 && "border-b-0"
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {col.render
                          ? col.render(row[col.key], row)
                          : renderCellValue(row[col.key])}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onEdit(row)}
                              aria-label={`Edit ${(row.name as string) ?? "item"}`}
                            >
                              <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onDelete(row)}
                              aria-label={`Hapus ${(row.name as string) ?? "item"}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Halaman{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currentPage}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {totalPages}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                // Show limited page numbers to avoid overflow
                if (
                  totalPages <= 7 ||
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange?.(page)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium transition-all",
                        currentPage === page
                          ? "bg-[#6B8E6B] text-white shadow-sm shadow-[#6B8E6B]/30"
                          : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      )}
                      aria-label={`Halaman ${page}`}
                      aria-current={currentPage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  );
                }
                // Show ellipsis for gaps
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-1 text-slate-400">
                      …
                    </span>
                  );
                }
                return null;
              })}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom hook for debouncing a value.
 */
function useDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
