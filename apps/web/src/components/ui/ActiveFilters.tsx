import React from "react";
import { Filter, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveFilterItem {
  id: string;
  label: string; // e.g. "Status", "Pencarian", "Periode"
  value: string; // e.g. "Aktif", "Budi", "01 Jan 2026 - 15 Jan 2026"
  onRemove: () => void;
}

export interface ActiveFiltersProps {
  items: ActiveFilterItem[];
  onResetAll?: () => void;
  className?: string;
}

/**
 * Reusable Active Filters Bar with individual dismissable chips and a clear-all button.
 */
export function ActiveFilters({ items, onResetAll, className }: ActiveFiltersProps) {
  if (items.length === 0) return null;

  return (
    <div
      data-testid="active-filters-bar"
      aria-label="Filter aktif"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl bg-slate-50/80 px-3.5 py-2.5 text-xs text-slate-600 border border-slate-200/80 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400 animate-in fade-in duration-150",
        className
      )}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400 shrink-0 select-none">
        <Filter className="h-3.5 w-3.5 text-brand" />
        <span>Filter Aktif:</span>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <span
            key={item.id}
            data-testid={`active-filter-chip-${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 pl-2.5 pr-1.5 py-1 text-xs font-medium text-brand dark:border-brand/30 dark:bg-brand/10 dark:text-brand-light transition-all"
          >
            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}:</span>
            <span className="max-w-[200px] truncate">{item.value}</span>
            <button
              type="button"
              onClick={item.onRemove}
              aria-label={`Hapus filter ${item.label} ${item.value}`}
              className="flex h-4 w-4 items-center justify-center rounded-md text-brand hover:bg-brand/20 hover:text-brand-dark dark:hover:bg-brand/30 transition-colors focus-visible:ring-1 focus-visible:ring-brand focus-visible:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Reset All Button */}
      {onResetAll && items.length > 0 && (
        <button
          type="button"
          id="filter-reset-all-btn"
          onClick={onResetAll}
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors focus-visible:ring-1 focus-visible:ring-red-400 focus-visible:outline-none"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset Semua</span>
        </button>
      )}
    </div>
  );
}
