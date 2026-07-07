"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RegionItem } from "./useRegionData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegionSelectProps {
  label: string;
  placeholder?: string;
  items: RegionItem[];
  value?: string;
  onChange: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RegionSelect({
  label,
  placeholder = "Pilih...",
  items,
  value,
  onChange,
  isLoading,
  error,
  search,
  onSearchChange,
  onRetry,
  disabled = false,
}: RegionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((item) => item.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (item: RegionItem) => {
    onChange(item.id);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3.5 py-2 text-sm transition-all",
          "border-slate-200 dark:border-slate-700 dark:bg-slate-900",
          "hover:border-slate-300 dark:hover:border-slate-600",
          "focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none",
          disabled && "cursor-not-allowed opacity-50 bg-slate-50 dark:bg-slate-800",
          isOpen && "border-emerald-400 ring-2 ring-emerald-400/20"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "truncate",
            selectedItem
              ? "text-slate-900 dark:text-slate-100"
              : "text-slate-400 dark:text-slate-500"
          )}
        >
          {selectedItem ? selectedItem.name : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10",
            "dark:border-slate-700 dark:bg-slate-900",
            "animate-in fade-in slide-in-from-top-1 duration-150"
          )}
        >
          {/* Search Input */}
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari wilayah..."
                className={cn(
                  "h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none",
                  "placeholder:text-slate-400",
                  "focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20",
                  "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                )}
              />
            </div>
          </div>

          {/* Options List */}
          <div
            className="max-h-48 overflow-y-auto overscroll-contain p-1 md:max-h-56"
            role="listbox"
          >
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memuat data...</span>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex flex-col items-center gap-2 py-4 px-3 text-center">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && items.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">
                Tidak ada data
              </div>
            )}

            {/* Items */}
            {!isLoading &&
              !error &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={item.id === value}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
                    item.id === value
                      ? "bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {item.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
