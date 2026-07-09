"use client";

import { useState, useCallback } from "react";
import { ClipboardPlus, Loader2, CheckCircle2, ArrowLeft, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import { PatientSearch, type PatientOption } from "@/components/visits/PatientSearch";
import { SearchableDropdown, type DropdownOption } from "@/components/visits/SearchableDropdown";

type PaymentMethod = "CASH" | "BPJS" | "INSURANCE";

interface FormErrors {
  patient?: string;
  paymentMethod?: string;
  bpjsNumber?: string;
  insurance?: string;
  general?: string;
}

interface VisitCreatedResult {
  id: string;
  visitNumber: string;
}

export default function NewVisitPage() {
  const router = useRouter();

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DropdownOption | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<DropdownOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [selectedInsurance, setSelectedInsurance] = useState<DropdownOption | null>(null);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [createdVisit, setCreatedVisit] = useState<VisitCreatedResult | null>(null);

  // Fetch functions for dropdowns
  const fetchDoctors = useCallback(async (search: string): Promise<DropdownOption[]> => {
    try {
      const res = await apiClient.getDoctors({ search, limit: 20 });
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      }
      return (raw as Record<string, unknown>[]).map((d) => ({
        id: d.id as string,
        name: d.name as string,
        subtitle: (d.specialization as string) || undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const fetchClinics = useCallback(async (search: string): Promise<DropdownOption[]> => {
    try {
      const res = await apiClient.getClinics({ search, limit: 20 });
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      }
      return (raw as Record<string, unknown>[]).map((c) => ({
        id: c.id as string,
        name: c.name as string,
        subtitle: (c.address as string) || undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  const fetchInsurances = useCallback(async (search: string): Promise<DropdownOption[]> => {
    try {
      const res = await apiClient.getInsurances({ search, limit: 20 });
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      }
      return (raw as Record<string, unknown>[]).map((i) => ({
        id: i.id as string,
        name: i.name as string,
        subtitle: (i.code as string) || undefined,
      }));
    } catch {
      return [];
    }
  }, []);

  // Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedPatient) {
      newErrors.patient = "Pilih pasien terlebih dahulu";
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = "Pilih metode pembayaran";
    }

    if (paymentMethod === "BPJS") {
      if (!bpjsNumber) {
        newErrors.bpjsNumber = "Nomor BPJS wajib diisi";
      } else if (!/^\d{13}$/.test(bpjsNumber)) {
        newErrors.bpjsNumber = "Nomor BPJS harus terdiri dari 13 digit angka";
      }
    }

    if (paymentMethod === "INSURANCE") {
      if (!selectedInsurance) {
        newErrors.insurance = "Pilih penyedia asuransi";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const payload: Record<string, unknown> = {
        patientId: selectedPatient!.id,
        paymentMethod: paymentMethod,
      };

      if (selectedDoctor) {
        payload.doctorId = selectedDoctor.id;
      }
      if (selectedClinic) {
        payload.clinicId = selectedClinic.id;
      }
      if (paymentMethod === "BPJS") {
        payload.bpjsNumber = bpjsNumber;
      }
      if (paymentMethod === "INSURANCE" && selectedInsurance) {
        payload.insuranceId = selectedInsurance.id;
      }

      const res = await apiClient.createVisit(payload);
      const data = (res?.data ?? res) as Record<string, unknown>;
      // Handle both envelope styles
      const visitData = (data?.data ?? data) as Record<string, unknown>;

      setCreatedVisit({
        id: visitData.id as string,
        visitNumber: visitData.visitNumber as string,
      });
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string; errors?: Array<{ field: string; message: string }> };

      if (apiError.errors && Array.isArray(apiError.errors)) {
        const fieldErrors: FormErrors = {};
        for (const fieldErr of apiError.errors) {
          if (fieldErr.field === "bpjsNumber") {
            fieldErrors.bpjsNumber = fieldErr.message;
          } else if (fieldErr.field === "insuranceId") {
            fieldErrors.insurance = fieldErr.message;
          } else if (fieldErr.field === "patientId") {
            fieldErrors.patient = fieldErr.message;
          } else if (fieldErr.field === "paymentMethod") {
            fieldErrors.paymentMethod = fieldErr.message;
          } else {
            fieldErrors.general = fieldErr.message;
          }
        }
        setErrors(fieldErrors);
      } else {
        setErrors({ general: apiError.message || "Terjadi kesalahan saat mendaftarkan kunjungan" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form for new registration
  const handleRegisterAnother = () => {
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedClinic(null);
    setPaymentMethod("");
    setBpjsNumber("");
    setSelectedInsurance(null);
    setErrors({});
    setCreatedVisit(null);
  };

  // Success state
  if (createdVisit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/visits")}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Registrasi Kunjungan
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6B8E6B]/10">
              <CheckCircle2 className="h-8 w-8 text-[#6B8E6B]" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Kunjungan Berhasil Didaftarkan
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Nomor kunjungan telah dibuat
            </p>
            <div className="mt-4 inline-block rounded-xl bg-slate-100 px-6 py-3 dark:bg-slate-800">
              <p className="font-mono text-xl font-bold text-[#6B8E6B]">
                {createdVisit.visitNumber}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleRegisterAnother}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md"
              >
                <ClipboardPlus className="h-4 w-4" />
                Daftar Kunjungan Baru
              </button>
              <button
                onClick={() => router.push(`/dashboard/visits/${createdVisit.id}`)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" />
                Lihat Detail
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/visits")}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Registrasi Kunjungan Baru
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Daftarkan kunjungan pasien ke laboratorium
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {errors.general}
          </div>
        )}

        {/* Patient Selection */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Pilih Pasien <span className="text-red-500">*</span>
          </h2>
          <PatientSearch
            onSelect={setSelectedPatient}
            onClear={() => setSelectedPatient(null)}
            selectedPatient={selectedPatient}
          />
          {errors.patient && (
            <p className="mt-2 text-xs text-red-500">{errors.patient}</p>
          )}
        </div>

        {/* Visit Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Detail Kunjungan
          </h2>
          <div className="space-y-4">
            {/* Doctor */}
            <SearchableDropdown
              label="Dokter"
              placeholder="Pilih dokter (opsional)"
              value={selectedDoctor}
              onChange={setSelectedDoctor}
              fetchOptions={fetchDoctors}
            />

            {/* Clinic */}
            <SearchableDropdown
              label="Klinik / Poli"
              placeholder="Pilih klinik (opsional)"
              value={selectedClinic}
              onChange={setSelectedClinic}
              fetchOptions={fetchClinics}
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Metode Pembayaran <span className="text-red-500">*</span>
          </h2>

          <div className="space-y-4">
            {/* Payment options */}
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "CASH", label: "Tunai (Cash)" },
                { value: "BPJS", label: "BPJS" },
                { value: "INSURANCE", label: "Asuransi" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(option.value);
                    setErrors((prev) => ({ ...prev, paymentMethod: undefined, bpjsNumber: undefined, insurance: undefined }));
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    paymentMethod === option.value
                      ? "border-[#6B8E6B] bg-[#6B8E6B]/5 text-[#6B8E6B] ring-2 ring-[#6B8E6B]/20"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.paymentMethod && (
              <p className="text-xs text-red-500">{errors.paymentMethod}</p>
            )}

            {/* BPJS Number (conditional) */}
            {paymentMethod === "BPJS" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nomor BPJS <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bpjsNumber}
                  onChange={(e) => {
                    // Only allow digits, max 13
                    const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                    setBpjsNumber(val);
                    if (errors.bpjsNumber) {
                      setErrors((prev) => ({ ...prev, bpjsNumber: undefined }));
                    }
                  }}
                  placeholder="Masukkan 13 digit nomor BPJS"
                  maxLength={13}
                  className={`h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition-all ${
                    errors.bpjsNumber
                      ? "border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-700 dark:bg-red-900/10"
                      : "border-slate-200 bg-white focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900"
                  } text-slate-900 placeholder:text-slate-400 dark:text-slate-100`}
                />
                <div className="flex items-center justify-between">
                  {errors.bpjsNumber ? (
                    <p className="text-xs text-red-500">{errors.bpjsNumber}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Contoh: 0001234567890</p>
                  )}
                  <span className="text-xs text-slate-400">{bpjsNumber.length}/13</span>
                </div>
              </div>
            )}

            {/* Insurance Selection (conditional) */}
            {paymentMethod === "INSURANCE" && (
              <SearchableDropdown
                label="Penyedia Asuransi"
                placeholder="Pilih penyedia asuransi"
                value={selectedInsurance}
                onChange={(v) => {
                  setSelectedInsurance(v);
                  if (errors.insurance) {
                    setErrors((prev) => ({ ...prev, insurance: undefined }));
                  }
                }}
                fetchOptions={fetchInsurances}
                required
                error={errors.insurance}
              />
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md hover:shadow-[#6B8E6B]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#6B8E6B] disabled:hover:shadow-sm disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              <>
                <ClipboardPlus className="h-4 w-4" />
                Daftarkan Kunjungan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
