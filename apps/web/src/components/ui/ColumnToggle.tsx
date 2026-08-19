"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Columns, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnDef {
  key: string;
  label: string;
  /** If true, the column cannot be hidden */
  required?: boolean;
}

export type ColumnVisibility = Record<string, boolean>;

interface ColumnToggleProps {
  /** All available columns */
  columns: ColumnDef[];
  /** Current visibility state */
  visibility: ColumnVisibility;
  /** Called when a column's visibility changes */
  onChange: (key: string, visible: boolean) => void;
  /** Optional extra CSS classes for the trigger button */
  className?: string;
}

/**
 * Dropdown popover for toggling column visibility.
 * Preferences are persisted by the parent via `visibility` + `onChange`.
 */
export function ColumnToggle({ columns, visibility, onChange, className }: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const visibleCount = columns.filter((c) => visibility[c.key] !== false).length;
  const totalToggleable = columns.filter((c) => !c.required).length;
  const hiddenCount = columns.filter((c) => !c.required && visibility[c.key] === false).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        id="column-toggle-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Atur visibilitas kolom"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all",
          open
            ? "border-brand bg-brand/10 text-brand dark:border-brand dark:bg-brand/20"
            : "border-slate-200 bg-white text-slate-600 hover:border-brand/50 hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-brand/50 dark:hover:text-brand",
          className
        )}
      >
        <Columns className="h-3.5 w-3.5" />
        <span>Kolom</span>
        {hiddenCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
            {hiddenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Atur kolom yang ditampilkan"
          className="absolute right-0 top-full z-50 mt-2 min-w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {visibleCount - columns.filter((c) => c.required).length} / {totalToggleable} kolom ditampilkan
            </span>
            <button
              type="button"
              onClick={() => {
                columns.filter((c) => !c.required).forEach((c) => {
                  if (visibility[c.key] === false) onChange(c.key, true);
                });
              }}
              className="text-xs font-medium text-brand hover:underline"
            >
              Reset
            </button>
          </div>

          {/* Column list */}
          <ul className="mt-1 max-h-72 overflow-y-auto">
            {columns.map((col) => {
              const isVisible = visibility[col.key] !== false;
              return (
                <li key={col.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isVisible}
                    disabled={col.required}
                    onClick={() => !col.required && onChange(col.key, !isVisible)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      col.required
                        ? "cursor-default text-slate-400 dark:text-slate-600"
                        : isVisible
                        ? "cursor-pointer text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                        : "cursor-pointer text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-800"
                    )}
                  >
                    {/* Checkbox */}
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        col.required
                          ? "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                          : isVisible
                          ? "border-brand bg-brand"
                          : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                      )}
                    >
                      {isVisible && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span className="flex-1 text-left">{col.label}</span>
                    {col.required && (
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">Wajib</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Helper hook for managing column visibility with localStorage persistence.
 *
 * @param storageKey  - localStorage key (e.g. 'patient-table-columns')
 * @param columns     - column definitions to derive defaults from
 */
export function useColumnVisibility(storageKey: string, columns: ColumnDef[]): [ColumnVisibility, (key: string, visible: boolean) => void] {
  const [visibility, setVisibility] = useState<ColumnVisibility>(() => {
    // Build defaults: all visible
    const defaults: ColumnVisibility = {};
    columns.forEach((c) => { defaults[c.key] = true; });

    // Merge with saved preferences
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        // Only keep keys that match current columns
        columns.forEach((c) => {
          if (typeof parsed[c.key] === "boolean") {
            defaults[c.key] = parsed[c.key] as boolean;
          }
          // Required columns are always visible
          if (c.required) defaults[c.key] = true;
        });
      }
    } catch {
      // Ignore parse errors
    }
    return defaults;
  });

  const handleChange = useCallback((key: string, visible: boolean) => {
    setVisibility((prev) => {
      const next = { ...prev, [key]: visible };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, [storageKey]);

  return [visibility, handleChange];
}
