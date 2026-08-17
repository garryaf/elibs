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

interface EntityAutocompleteProps {
  /** API endpoint to search entities, e.g. "/api/v1/master/tests" */
  endpoint: string;
  /** Current selected entity value (id or code depending on matchBy) */
  value?: string;
  /** Callback when an entity is selected */
  onChange: (id: string | undefined, entity?: EntityOption) => void;
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
  /** Which entity property to match against the value prop (default: "id") */
  matchBy?: "id" | "code";
}

/**
 * Reusable entity-aware autocomplete select component.
 * Searches entities by name via the API and allows selection by displaying name while storing UUID.
 */
export function EntityAutocomplete({
  endpoint,
  value,
  onChange,
  placeholder = "Cari...",
  required,
  label,
  error,
  id,
  disabled = false,
  matchBy = "id",
}: EntityAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the currently selected entity's name on mount/value change
  useEffect(() => {
    if (value && !selectedEntity) {
      // Try to fetch the entity details to display the name
      fetchEntityById(value);
    } else if (!value) {
      setSelectedEntity(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const fetchEntityById = async (entityValue: string) => {
    try {
      // Try fetching from the list with a search — most endpoints support this
      const response = await apiClient.get<{ data: EntityOption[]; meta: unknown }>(
        `${endpoint}?limit=50`
      );
      const found = response.data?.find((item: EntityOption) => {
        if (matchBy === "code") {
          return item.code === entityValue;
        }
        return item.id === entityValue;
      });
      if (found) {
        setSelectedEntity(found);
      }
    } catch {
      // If fetch fails, just show the value
      setSelectedEntity({ id: entityValue, name: entityValue });
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
    setSelectedEntity(option);
    onChange(option.id, option);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    setSelectedEntity(null);
    onChange(undefined);
    setQuery("");
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
        </label>
      )}

      {/* Selected state or input */}
      {selectedEntity && !isOpen ? (
        <div
          className={cn(
            "flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="truncate">
            {selectedEntity.name}
            {selectedEntity.code && (
              <span className="ml-1.5 text-slate-400">({selectedEntity.code})</span>
            )}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Hapus pilihan"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
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
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="listbox"
        >
          {isLoading && options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Memuat...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Tidak ada data ditemukan</div>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {options.map((option) => (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={matchBy === "code" ? option.code === value : option.id === value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "cursor-pointer px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                    (matchBy === "code" ? option.code === value : option.id === value) && "bg-brand/5 font-medium text-brand"
                  )}
                >
                  <span>{option.name}</span>
                  {option.code && (
                    <span className="ml-2 text-xs text-slate-400">({option.code})</span>
                  )}
                </li>
              ))}
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
