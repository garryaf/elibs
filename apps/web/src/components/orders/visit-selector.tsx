"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Calendar, User } from "lucide-react";
import { apiClient } from "@/lib/api";

export interface VisitOption {
  id: string;
  visitNumber: string;
  status: string;
  registrationDate: string;
  patient: {
    id: string;
    name: string;
    mrn: string;
    dateOfBirth?: string;
  };
}

interface PatientFallbackResult {
  id: string;
  name: string;
  mrn: string;
  nik?: string;
}

interface VisitSelectorProps {
  value: VisitOption | null;
  onChange: (visit: VisitOption | null) => void;
  error?: string;
  onInlineCreate?: (patientId?: string) => void;
}

export function VisitSelector({
  value,
  onChange,
  error,
  onInlineCreate,
}: VisitSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VisitOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [patientFallbackResults, setPatientFallbackResults] = useState<PatientFallbackResult[]>([]);
  const [patientFallbackLoading, setPatientFallbackLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchVisits = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setResults([]);
      setPatientFallbackResults([]);
      return;
    }

    setLoading(true);
    setPatientFallbackResults([]);
    setPatientFallbackLoading(false);
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { data: Array<Record<string, unknown>> };
      }>(
        `/api/v1/visits?search=${encodeURIComponent(searchTerm)}&limit=20`
      );

      const envelope = res?.data ?? res;
      let raw: Array<Record<string, unknown>> = [];
      if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      } else if (Array.isArray(envelope)) {
        raw = envelope as Array<Record<string, unknown>>;
      }

      // Filter client-side: only show visits that can accept new orders
      raw = raw.filter((v) => v.status === "REGISTERED" || v.status === "IN_PROGRESS");

      const mapped: VisitOption[] = raw.map((v) => {
        const patient = (v.patient as Record<string, unknown>) || {};
        return {
          id: v.id as string,
          visitNumber: v.visitNumber as string,
          status: v.status as string,
          registrationDate: (v.registrationDate as string) || "",
          patient: {
            id: (patient.id as string) || "",
            name: (patient.name as string) || "",
            mrn: (patient.mrn as string) || "",
            dateOfBirth: (patient.dateOfBirth as string) || undefined,
          },
        };
      });

      setResults(mapped);
      setShowDropdown(true);

      // If no active visits found, trigger patient fallback search
      if (mapped.length === 0 && searchTerm.length >= 3) {
        searchPatientsFallback(searchTerm);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPatientsFallback = useCallback(async (searchTerm: string) => {
    setPatientFallbackLoading(true);
    try {
      const res = await apiClient.getPatients({ search: searchTerm, limit: 10 });
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      }

      const mapped: PatientFallbackResult[] = (raw as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        mrn: p.mrn as string,
        nik: (p.nik as string) || undefined,
      }));

      setPatientFallbackResults(mapped);
    } catch {
      setPatientFallbackResults([]);
    } finally {
      setPatientFallbackLoading(false);
    }
  }, []);

  // Debounced search (300ms) — only fires when query >= 3 chars
  useEffect(() => {
    if (value) return;
    if (query.length < 3) {
      setResults([]);
      setPatientFallbackResults([]);
      setShowDropdown(query.length > 0);
      return;
    }

    const timer = setTimeout(() => {
      searchVisits(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchVisits, value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (visit: VisitOption) => {
    onChange(visit);
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setPatientFallbackResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Selected visit display
  if (value) {
    return (
      <div className="space-y-1.5">
        <div
          className={`rounded-xl border p-4 ${
            error
              ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10"
              : "border-brand/30 bg-brand/5"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {value.visitNumber}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <User className="h-3 w-3" />
                  <span>{value.patient.name}</span>
                  <span>•</span>
                  <span className="font-mono text-brand">
                    {value.patient.mrn}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(value.registrationDate).toLocaleDateString(
                      "id-ID",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              title="Ganti kunjungan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // Search input mode
  return (
    <div className="space-y-1.5">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari kunjungan berdasarkan nomor visit, nama pasien, atau MRN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`h-11 w-full rounded-xl border pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:text-slate-100 ${
              error
                ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            }`}
          />
          {loading && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
            </div>
          )}
        </div>

        {/* Hint: minimum 3 characters */}
        {showDropdown && query.length > 0 && query.length < 3 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-4 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500">
              Masukkan minimal 3 karakter untuk mencari...
            </p>
          </div>
        )}

        {/* Results list */}
        {showDropdown && query.length >= 3 && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="max-h-72 overflow-y-auto p-1">
              {results.map((visit) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => handleSelect(visit)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {visit.visitNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          visit.status === "REGISTERED"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {visit.status === "REGISTERED"
                          ? "Terdaftar"
                          : "Dalam Proses"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {visit.patient.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-brand">
                        {visit.patient.mrn}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(visit.registrationDate).toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results — with patient fallback */}
        {showDropdown &&
          query.length >= 3 &&
          results.length === 0 &&
          !loading && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="p-4">
                <p className="text-center text-sm text-slate-500">
                  Tidak ada kunjungan aktif ditemukan untuk &quot;{query}&quot;
                </p>
                {onInlineCreate && (
                  <button
                    type="button"
                    onClick={() => onInlineCreate()}
                    className="mt-2 w-full rounded-lg border border-dashed border-brand/50 px-3 py-2 text-sm text-brand transition-colors hover:bg-brand/5"
                  >
                    + Buat kunjungan baru
                  </button>
                )}
              </div>

              {/* Patient fallback section */}
              {patientFallbackLoading && (
                <div className="border-t border-slate-200 p-4 text-center dark:border-slate-700">
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
                    Mencari pasien...
                  </div>
                </div>
              )}

              {!patientFallbackLoading && patientFallbackResults.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                      Pasien Ditemukan
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {patientFallbackResults.map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <User className="h-4 w-4 flex-shrink-0 text-slate-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {patient.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-mono text-brand">
                                {patient.mrn}
                              </span>
                              {patient.nik && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[100px]">
                                    NIK: {patient.nik.slice(0, 8)}...
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {onInlineCreate && (
                          <button
                            type="button"
                            onClick={() => onInlineCreate(patient.id)}
                            className="flex-shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#5A7A5A]"
                          >
                            Buat Kunjungan
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
