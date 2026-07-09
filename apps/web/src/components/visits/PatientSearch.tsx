"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, X } from "lucide-react";
import { apiClient } from "@/lib/api";

export interface PatientOption {
  id: string;
  name: string;
  mrn: string;
  nik: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
}

interface PatientSearchProps {
  onSelect: (patient: PatientOption) => void;
  onClear: () => void;
  selectedPatient: PatientOption | null;
}

export function PatientSearch({ onSelect, onClear, selectedPatient }: PatientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchPatients = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
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

      const mapped: PatientOption[] = (raw as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        mrn: p.mrn as string,
        nik: p.nik as string,
        dateOfBirth: (p.dateOfBirth as string) || "",
        gender: p.gender as "MALE" | "FEMALE",
      }));

      setResults(mapped);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search (300ms)
  useEffect(() => {
    if (selectedPatient) return;
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      searchPatients(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchPatients, selectedPatient]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (patient: PatientOption) => {
    onSelect(patient);
    setQuery("");
    setShowDropdown(false);
    setResults([]);
  };

  const handleClear = () => {
    onClear();
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  if (selectedPatient) {
    return (
      <div className="rounded-xl border border-[#6B8E6B]/30 bg-[#6B8E6B]/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${selectedPatient.gender === "MALE" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
              {selectedPatient.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{selectedPatient.name}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-[#6B8E6B]">{selectedPatient.mrn}</span>
                <span>•</span>
                <span>{new Date(selectedPatient.dateOfBirth).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</span>
                <span>•</span>
                <span>{selectedPatient.gender === "MALE" ? "Laki-laki" : "Perempuan"}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            title="Ganti pasien"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Cari pasien berdasarkan nama, NIK, atau MRN (min. 2 karakter)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#6B8E6B]" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-60 overflow-y-auto p-1">
            {results.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => handleSelect(patient)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <User className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{patient.name}</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-mono text-[#6B8E6B]">{patient.mrn}</span>
                    {" • "}
                    {patient.nik}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-4 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500">Tidak ada pasien ditemukan untuk &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
