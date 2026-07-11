"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface DropdownOption {
  id: string;
  name: string;
  subtitle?: string;
}

interface SearchableDropdownProps {
  label: string;
  placeholder: string;
  value: DropdownOption | null;
  onChange: (option: DropdownOption | null) => void;
  fetchOptions: (search: string) => Promise<DropdownOption[]>;
  required?: boolean;
  error?: string;
}

export function SearchableDropdown({
  label,
  placeholder,
  value,
  onChange,
  fetchOptions,
  required,
  error,
}: SearchableDropdownProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadOptions = useCallback(async (searchTerm: string) => {
    setLoading(true);
    try {
      const results = await fetchOptions(searchTerm);
      setOptions(results);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchOptions]);

  // Debounce query to avoid fetch on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Load options on open or debounced query change
  useEffect(() => {
    if (isOpen) {
      loadOptions(debouncedQuery);
    }
  }, [isOpen, debouncedQuery, loadOptions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: DropdownOption) => {
    onChange(option);
    setIsOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        {!isOpen ? (
          <button
            type="button"
            onClick={handleOpen}
            role="combobox"
            aria-expanded={false}
            aria-haspopup="listbox"
            aria-controls="dropdown-listbox"
            className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-sm transition-all ${
              error
                ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            <span className={value ? "text-slate-900 dark:text-white" : "text-slate-400"}>
              {value ? value.name : placeholder}
            </span>
            <div className="flex items-center gap-1">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label={`Hapus ${label}`}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={true}
              aria-controls="dropdown-listbox"
              aria-autocomplete="list"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Cari ${label.toLowerCase()}...`}
              className="h-11 w-full rounded-xl border border-[#6B8E6B] bg-white pl-9 pr-4 text-sm text-slate-900 outline-none ring-2 ring-[#6B8E6B]/20 dark:border-[#6B8E6B] dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {isOpen && (
          <div id="dropdown-listbox" role="listbox" className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="max-h-48 overflow-y-auto p-1">
              {loading ? (
                <div className="flex items-center justify-center py-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#6B8E6B]" />
                </div>
              ) : options.length > 0 ? (
                options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      value?.id === option.id ? "bg-[#6B8E6B]/5" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{option.name}</span>
                    {option.subtitle && (
                      <span className="text-xs text-slate-500">{option.subtitle}</span>
                    )}
                  </button>
                ))
              ) : (
                <p className="py-3 text-center text-sm text-slate-500">Tidak ada data ditemukan</p>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
