"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { DiscardChangesDialog } from "@/components/ui/DiscardChangesDialog";
import { X, Plus, Search, User } from "lucide-react";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientOption {
  id: string;
  name: string;
  mrn: string;
}

interface CreatedVisit {
  id: string;
  visitNumber: string;
  status: string;
  patient: {
    id: string;
    name: string;
    mrn: string;
  };
}

interface InlineVisitCreateProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (visit: CreatedVisit) => void;
  preselectedPatientId?: string;
}

type PaymentMethod = "CASH" | "BPJS" | "INSURANCE";

// ─── Component ────────────────────────────────────────────────────────────────

export function InlineVisitCreate({ isOpen, onClose, onCreated, preselectedPatientId }: InlineVisitCreateProps) {
  const { setDirty, guardedClose, showConfirmDiscard, confirmDiscard, cancelDiscard, reset } = useUnsavedChangesGuard(onClose);
  const focusTrapRef = useFocusTrap(isOpen, guardedClose);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreselected, setLoadingPreselected] = useState(false);

  // Patient search state
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPatient(null);
      setPaymentMethod("CASH");
      setError(null);
      setPatientQuery("");
      setPatientResults([]);
      setShowPatientDropdown(false);
      setLoadingPreselected(false);
      reset();

      // Load preselected patient if provided
      if (preselectedPatientId) {
        setLoadingPreselected(true);
        apiClient.getPatient(preselectedPatientId)
          .then((res) => {
            const data = (res?.data ?? res) as Record<string, unknown> | undefined;
            if (data && data.id) {
              setSelectedPatient({
                id: data.id as string,
                name: data.name as string,
                mrn: data.mrn as string,
              });
            }
          })
          .catch(() => {
            setError("Gagal memuat data pasien");
          })
          .finally(() => {
            setLoadingPreselected(false);
          });
      }
    }
  }, [isOpen, preselectedPatientId, reset]);

  // Close patient dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced patient search
  const searchPatients = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setPatientResults([]);
      setShowPatientDropdown(false);
      return;
    }

    setPatientLoading(true);
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
      }));

      setPatientResults(mapped);
      setShowPatientDropdown(true);
    } catch {
      setPatientResults([]);
    } finally {
      setPatientLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPatient) return;
    if (patientQuery.length < 2) {
      setPatientResults([]);
      setShowPatientDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      searchPatients(patientQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [patientQuery, searchPatients, selectedPatient]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handlePatientSelect = (patient: PatientOption) => {
    setSelectedPatient(patient);
    setPatientQuery("");
    setShowPatientDropdown(false);
    setPatientResults([]);
    setError(null);
    setDirty();
  };

  const handlePatientClear = () => {
    setSelectedPatient(null);
    setPatientQuery("");
    setPatientResults([]);
    setShowPatientDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      setError("Pilih pasien terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.createVisit({
        patientId: selectedPatient.id,
        paymentMethod,
      });

      const data = (res as { data?: unknown })?.data as Record<string, unknown> | undefined;
      if (!data) {
        throw new Error("Gagal membuat kunjungan: respons tidak valid");
      }

      // Extract patient info from response or use selected patient
      const visitPatient = data.patient as Record<string, unknown> | undefined;

      const createdVisit: CreatedVisit = {
        id: data.id as string,
        visitNumber: data.visitNumber as string,
        status: data.status as string,
        patient: {
          id: selectedPatient.id,
          name: visitPatient?.name as string ?? selectedPatient.name,
          mrn: visitPatient?.mrn as string ?? selectedPatient.mrn,
        },
      };

      reset();
      onCreated(createdVisit);
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Array<{ message: string }> };
      const message =
        apiErr?.errors?.[0]?.message ||
        apiErr?.message ||
        "Gagal membuat kunjungan. Silakan coba lagi.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={guardedClose}
      />

      {/* Dialog */}
      <div ref={focusTrapRef} role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10">
              <Plus className="h-4 w-4 text-brand" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Buat Kunjungan Baru
            </h3>
          </div>
          <button
            type="button"
            onClick={guardedClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pasien <span className="text-red-500">*</span>
            </label>

            {loadingPreselected ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 px-3.5 py-3 dark:border-slate-700">
                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
                  Memuat data pasien...
                </div>
              </div>
            ) : selectedPatient ? (
              <div className="flex items-center justify-between rounded-xl border border-brand/30 bg-brand/5 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <User className="h-4 w-4 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedPatient.name}
                    </p>
                    <p className="text-xs font-mono text-brand">
                      {selectedPatient.mrn}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePatientClear}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Cari pasien (nama, MRN)..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {patientLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
                    </div>
                  )}
                </div>

                {showPatientDropdown && patientResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <div className="max-h-48 overflow-y-auto p-1">
                      {patientResults.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => handlePatientSelect(patient)}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <User className="h-4 w-4 flex-shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {patient.name}
                            </p>
                            <p className="text-xs font-mono text-brand">
                              {patient.mrn}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showPatientDropdown && patientQuery.length >= 2 && patientResults.length === 0 && !patientLoading && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500">Tidak ada pasien ditemukan</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Metode Pembayaran <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => { setPaymentMethod(e.target.value as PaymentMethod); setDirty(); }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="CASH">Tunai (Cash)</option>
              <option value="BPJS">BPJS</option>
              <option value="INSURANCE">Asuransi (Insurance)</option>
            </select>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={guardedClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPatient}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5A7A5A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Buat Kunjungan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Unsaved changes confirmation */}
      <DiscardChangesDialog
        open={showConfirmDiscard}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </div>
  );
}
