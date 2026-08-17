"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EntityOption {
  id: string;
  name: string;
  code?: string;
}

interface MultiEntityAutocompleteProps {
  /** API endpoint to search entities, e.g. "/api/v1/master/tests" */
  endpoint: string;
  /** Current selected entity IDs */
  value?: string[];
  /** Callback when selection changes */
  onChange: (ids: string[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Label for the field */
  label?: string;
  /** Error message */
  error?: string;
  /** HTML id for the input */
  id?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Minimum number of selections required */
  min?: number;
}

/**
 * Reusable multi-select entity-aware autocomplete component.
 * Allows selecting multiple entities by searching via API.
 */
export function MultiEntityAutocomplete({
  endpoint,
  value = [],
  onChange,
  placeholder = "Cari dan pilih...",
  required,
  label,
  error,
  id,
  disabled = false,
  min,
}: MultiEntityAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<EntityOption[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch selected entities on mount/value change
  useEffect(() => {
    if (value.length > 0 && selectedEntities.length === 0) {
      fetchSelectedEntities(value);
    } else if (value.length === 0) {
      setSelectedEntities([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const fetchSelectedEntities = async (ids: string[]) => {
    try {
      const response = await apiClient.get<{ data: EntityOption[]; meta: unknown }>(
        `${endpoint}?limit=100`
      );
      const found = (response.data ?? []).filter((item: EntityOption) => ids.includes(item.id));
      setSelectedEntities(found);
    } catch {
      // If fetch fails, show IDs as names
      setSelectedEntities(ids.map((id) => ({ id, name: id })));
    }
  };

  const searchEntities = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      try {
        const qs = searchQuery ? `?search=${encodeURIComponent(searchQuery)}&limit=10` : "?limit=10";
        const response = await apiClient.get<{ data: EntityOption[]; meta: unknown }>(
          `${endpoint}${qs}`
        );
        setOptions(response.data ?? []);
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint]
  );

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchEntities(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOpen, searchEntities]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: EntityOption) => {
    if (value.includes(option.id)) {
      // Deselect
      const newIds = value.filter((id) => id !== option.id);
      setSelectedEntities((prev) => prev.filter((e) => e.id !== option.id));
      onChange(newIds);
    } else {
      // Select
      const newIds = [...value, option.id];
      setSelectedEntities((prev) => [...prev, option]);
      onChange(newIds);
    }
  };

  const handleRemove = (entityId: string) => {
    const newIds = value.filter((id) => id !== entityId);
    setSelectedEntities((prev) => prev.filter((e) => e.id !== entityId));
    onChange(newIds);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (options.length === 0) {
      searchEntities("");
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
          {min && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">
              (min. {min})
            </span>
          )}
        </label>
      )}

      {/* Selected chips */}
      {selectedEntities.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedEntities.map((entity) => (
            <span
              key={entity.id}
              className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand dark:bg-brand/20"
            >
              {entity.name}
              {entity.code && (
                <span className="text-brand/60">({entity.code})</span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(entity.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-brand/20"
                  aria-label={`Hapus ${entity.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          autoComplete="off"
          className={cn(
            "h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-brand",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="listbox"
          aria-multiselectable="true"
        >
          {isLoading && options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Memuat...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Tidak ada data ditemukan</div>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {options.map((option) => {
                const isSelected = value.includes(option.id);
                return (
                  <li
                    key={option.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      "cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                      isSelected && "bg-brand/5 font-medium text-brand"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "border-brand bg-brand text-white"
                            : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {isSelected && (
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span>{option.name}</span>
                      {option.code && (
                        <span className="text-xs text-slate-400">({option.code})</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
