"use client";

import { useState, useEffect, Fragment } from "react";
import { Search, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

export interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface MasterDataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  meta?: { total: number; page: number; limit: number; totalPages?: number };
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  onBulkDelete?: (ids: string[]) => void;
  onSearch?: (query: string) => void;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  /** Optional: render an expanded detail section below a row when clicked */
  renderExpandedRow?: (row: Record<string, unknown>) => React.ReactNode;
  /** Optional: highlight rows with duplicate names */
  duplicateNames?: Set<string>;
}

/**
 * Safely render a cell value. If the value is an object (e.g. a relation),
 * extract a human-readable field like `name` to prevent React Error #31.
 */
export function renderCellValue(value: unknown): React.ReactNode {
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

interface SearchInputProps {
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
}

function SearchInput({ value, onChange, disabled }: SearchInputProps) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Cari..."
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        className="pl-9"
        aria-label="Cari data"
      />
    </div>
  );
}

interface BulkActionBarProps {
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function BulkActionBar({ selectedCount, onConfirm, onCancel }: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800 dark:bg-red-900/20">
      <span className="text-sm font-medium text-red-700 dark:text-red-300">
        {selectedCount} dipilih
      </span>
      <button
        onClick={onConfirm}
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
      >
        <Trash2 className="h-3.5 w-3.5" /> Hapus Terpilih
      </button>
      <button
        onClick={onCancel}
        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Batal
      </button>
    </div>
  );
}

interface MasterDataTableRowProps {
  row: Record<string, unknown>;
  rowIdx: number;
  isLast: boolean;
  columns: Column[];
  isExpanded: boolean;
  isDuplicate: boolean;
  isSelected: boolean;
  hasBulkDelete: boolean;
  hasActions: boolean;
  colSpan: number;
  onToggleSelect: (id: string) => void;
  onToggleExpand?: () => void;
  onEdit?: (row: Record<string, unknown>) => void;
  onDelete?: (row: Record<string, unknown>) => void;
  renderExpandedRow?: (row: Record<string, unknown>) => React.ReactNode;
}

function MasterDataTableRow({
  row,
  rowIdx,
  isLast,
  columns,
  isExpanded,
  isDuplicate,
  isSelected,
  hasBulkDelete,
  hasActions,
  colSpan,
  onToggleSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  renderExpandedRow,
}: MasterDataTableRowProps) {
  const rowId = (row.id as string | number) ?? rowIdx;

  return (
    <Fragment key={rowId}>
      <tr
        className={cn(
          "border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30",
          isLast && !isExpanded && "border-b-0",
          onToggleExpand && "cursor-pointer",
          isExpanded && "bg-slate-50/80 dark:bg-slate-900/50",
          isDuplicate && "bg-amber-50/60 dark:amber-900/10"
        )}
        onClick={onToggleExpand}
      >
        {hasBulkDelete && (
          <td className="w-10 px-3 py-4" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(row.id as string)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
              aria-label={`Pilih baris ${(row.name as string) ?? rowId}`}
            />
          </td>
        )}
        {columns.map((col) => (
          <td key={col.key} className="px-5 py-4 text-slate-700 dark:text-slate-300">
            {col.render ? col.render(row[col.key], row) : renderCellValue(row[col.key])}
            {col.key === "name" && isDuplicate && (
              <span
                className="ml-2 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                title="Nama duplikat dengan tes lain"
              >
                DUPLIKAT
              </span>
            )}
          </td>
        ))}
        {hasActions && (
          <td className="px-5 py-4 text-right">
            <div className="flex items-center justify-end gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(row);
                  }}
                  aria-label={`Edit ${(row.name as string) ?? "item"}`}
                >
                  <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(row);
                  }}
                  aria-label={`Hapus ${(row.name as string) ?? "item"}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                </Button>
              )}
            </div>
          </td>
        )}
      </tr>
      {isExpanded && renderExpandedRow && (
        <tr>
          <td colSpan={colSpan} className="p-0">
            {renderExpandedRow(row)}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function getPaginationItems(totalPages: number, currentPage: number): (number | "ellipsis")[] {
  const items: (number | "ellipsis")[] = [];
  for (let page = 1; page <= totalPages; page++) {
    const isDirectlyVisible =
      totalPages <= 7 ||
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1;

    if (isDirectlyVisible) {
      items.push(page);
    } else if (page === currentPage - 2 || page === currentPage + 2) {
      items.push("ellipsis");
    }
  }
  return items;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const paginationItems = getPaginationItems(totalPages, currentPage);

  return (
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
        {paginationItems.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                …
              </span>
            );
          }
          return (
            <button
              key={item}
              onClick={() => onPageChange?.(item)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-medium transition-all",
                currentPage === item
                  ? "bg-brand text-white shadow-sm shadow-brand/30"
                  : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              )}
              aria-label={`Halaman ${item}`}
              aria-current={currentPage === item ? "page" : undefined}
            >
              {item}
            </button>
          );
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
  );
}

export function MasterDataTable({
  columns,
  data,
  meta,
  onEdit,
  onDelete,
  onBulkDelete,
  onSearch,
  onPageChange,
  isLoading = false,
  renderExpandedRow,
  duplicateNames,
}: MasterDataTableProps) {
  const [searchValue, setSearchValue] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prevData, setPrevData] = useState(data);

  // Reset selection when data changes without triggering cascading effect renders
  if (prevData !== data) {
    setPrevData(data);
    setSelectedIds(new Set());
  }

  // Debounced search
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    onSearch?.(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.id as string)));
    }
  };

  const handleBulkDeleteConfirm = () => {
    if (!onBulkDelete || selectedIds.size === 0) return;
    if (confirm(`Hapus ${selectedIds.size} data yang dipilih?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const totalPages = meta?.totalPages ?? (meta ? Math.ceil(meta.total / meta.limit) : 1);
  const currentPage = meta?.page ?? 1;
  const hasActions = Boolean(onEdit || onDelete);
  const colSpan = columns.length + (hasActions ? 1 : 0) + (onBulkDelete ? 1 : 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {onSearch && <SearchInput disabled />}
        <TableSkeleton rows={5} cols={columns.length + 1} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {onSearch && (
        <SearchInput
          value={searchValue}
          onChange={setSearchValue}
        />
      )}

      {/* Bulk action bar */}
      {onBulkDelete && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setSelectedIds(new Set())}
        />
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                {onBulkDelete && (
                  <th className="w-10 px-3 py-3.5">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && selectedIds.size === data.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                      aria-label="Pilih semua"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {col.label.toUpperCase()}
                  </th>
                ))}
                {hasActions && (
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
                    colSpan={colSpan}
                    className="py-16 text-center text-sm text-slate-400 dark:text-slate-500"
                  >
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => {
                  const rowId = (row.id as string | number) ?? rowIdx;
                  const isExpanded = Boolean(renderExpandedRow && expandedRowId === rowId);
                  const isDuplicate = Boolean(
                    duplicateNames && typeof row.name === "string" && duplicateNames.has(row.name)
                  );
                  return (
                    <MasterDataTableRow
                      key={rowId}
                      row={row}
                      rowIdx={rowIdx}
                      isLast={rowIdx === data.length - 1}
                      columns={columns}
                      isExpanded={isExpanded}
                      isDuplicate={isDuplicate}
                      isSelected={selectedIds.has(row.id as string)}
                      hasBulkDelete={Boolean(onBulkDelete)}
                      hasActions={hasActions}
                      colSpan={colSpan}
                      onToggleSelect={toggleSelect}
                      onToggleExpand={
                        renderExpandedRow
                          ? () => setExpandedRowId(isExpanded ? null : rowId)
                          : undefined
                      }
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExpandedRow={renderExpandedRow}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
