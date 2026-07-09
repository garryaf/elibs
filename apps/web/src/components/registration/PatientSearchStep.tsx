"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, User, UserPlus, Loader2, X } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { PatientOption } from "@/components/visits/PatientSearch";

/** Extended patient data for display purposes (includes phone) */
interface PatientDisplayData extends PatientOption {
  phone: string | null;
}

interface PatientSearchStepProps {
  onPatientSelected: (patient: PatientOption) => void;
  onRegisterNew: () => void;
}

export function PatientSearchStep({
  onPatientSelected,
  onRegisterNew,
}: PatientSearchStepProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientDisplayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPatients = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      setSearchExecuted(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.getPatients({ search: searchTerm, limit: 20 });

      // Response envelope pattern from existing PatientSearch.tsx
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      }

      const mapped: PatientDisplayData[] = (raw as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        mrn: p.mrn as string,
        nik: p.nik as string,
        dateOfBirth: (p.dateOfBirth as string) || "",
        gender: p.gender as "MALE" | "FEMALE",
        phone: (p.phone as string) || null,
      }));

      setResults(mapped);
      setSearchExecuted(true);
    } catch {
      setError("Terjadi kesalahan jaringan saat mencari pasien. Silakan coba lagi.");
      setResults([]);
      setSearchExecuted(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search (300ms)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearchExecuted(false);
      return;
    }

    const timer = setTimeout(() => {
      searchPatients(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchPatients]);

  const handleSelect = (patient: PatientDisplayData) => {
    // Pass PatientOption (without phone) to parent callback
    const { phone: _phone, ...patientOption } = patient;
    void _phone;
    onPatientSelected(patientOption);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari pasien berdasarkan nama, NIK, MRN, telepon, atau email (min. 2 karakter)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="h-5 w-5 animate-spin text-[#6B8E6B]" />
          </div>
        )}
      </div>

      {/* Helper message for short input */}
      {query.length > 0 && query.length < 2 && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Ketik minimal 2 karakter untuk memulai pencarian.
        </p>
      )}

      {/* Error notification */}
      {error && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-3 rounded-lg p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40"
            aria-label="Tutup pesan error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {results.length} pasien ditemukan
          </p>
          <div className="space-y-2">
            {results.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => handleSelect(patient)}
                className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#6B8E6B]/40 hover:bg-[#6B8E6B]/5 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#6B8E6B]/40 dark:hover:bg-[#6B8E6B]/5"
              >
                {/* Avatar */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    patient.gender === "MALE"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  }`}
                >
                  {patient.name.charAt(0).toUpperCase()}
                </div>

                {/* Patient info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {patient.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-[#6B8E6B]">{patient.mrn}</span>
                    <span>NIK: {patient.nik}</span>
                    {patient.dateOfBirth && (
                      <span>
                        {new Date(patient.dateOfBirth).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    <span>
                      {patient.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                    </span>
                    {patient.phone && <span>📞 {patient.phone}</span>}
                  </div>
                </div>

                {/* Select indicator */}
                <User className="h-4 w-4 flex-shrink-0 text-slate-300 dark:text-slate-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results — show register button */}
      {searchExecuted && results.length === 0 && !loading && !error && (
        <div className="mt-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <User className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tidak ada pasien ditemukan untuk &ldquo;{query}&rdquo;
          </p>
          <button
            type="button"
            onClick={onRegisterNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md"
          >
            <UserPlus className="h-4 w-4" />
            Daftar Pasien Baru
          </button>
        </div>
      )}
    </div>
  );
}
