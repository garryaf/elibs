"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { SearchableDropdown, type DropdownOption } from "@/components/visits/SearchableDropdown";
import type { PatientOption } from "@/types/visit";

type PaymentMethod = "CASH" | "BPJS" | "INSURANCE" | "TRANSFER" | "EDC";

interface InsuranceEnrollment {
  id: string;
  insuranceId: string;
  insuranceName: string;
  memberNumber?: string;
}

interface FormErrors {
  paymentMethod?: string;
  bpjsNumber?: string;
  insurance?: string;
  general?: string;
}

interface VisitCreationStepProps {
  patient: PatientOption;
  onVisitCreated: (visit: { id: string; visitNumber: string }) => void;
  onBack: () => void;
}

export function VisitCreationStep({
  patient,
  onVisitCreated,
  onBack,
}: VisitCreationStepProps) {
  // Form state
  const [selectedDoctor, setSelectedDoctor] = useState<DropdownOption | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<DropdownOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [selectedInsurance, setSelectedInsurance] = useState<DropdownOption | null>(null);

  // Insurance enrollment state
  const [insuranceEnrollments, setInsuranceEnrollments] = useState<InsuranceEnrollment[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Pre-fetch patient insurance enrollments when BPJS or INSURANCE is selected
  useEffect(() => {
    if (paymentMethod !== "BPJS" && paymentMethod !== "INSURANCE") {
      setEnrollmentChecked(false);
      return;
    }

    let cancelled = false;
    setEnrollmentLoading(true);

    (async () => {
      try {
        const res = await apiClient.get(`/api/v1/patients/${patient.id}/insurances`);
        if (cancelled) return;
        const raw = res as unknown;
        let enrollments: InsuranceEnrollment[] = [];

        // Extract data from various response shapes
        const envelope = (raw && typeof raw === "object" && "data" in (raw as object))
          ? ((raw as Record<string, unknown>).data as unknown)
          : raw;
        const arr = Array.isArray(envelope) ? envelope : 
          (envelope && typeof envelope === "object" && "data" in (envelope as object))
            ? ((envelope as Record<string, unknown>).data as unknown[])
            : [];

        if (Array.isArray(arr)) {
          enrollments = (arr as Record<string, unknown>[]).map((e) => ({
            id: (e.id as string) || "",
            insuranceId: (e.insuranceId as string) || "",
            insuranceName: (e.insurance as Record<string, unknown>)?.name as string || (e.insuranceName as string) || "",
            memberNumber: (e.memberNumber as string) || undefined,
          }));
        }

        if (!cancelled) {
          setInsuranceEnrollments(enrollments);
          setEnrollmentChecked(true);
        }
      } catch {
        if (!cancelled) {
          setInsuranceEnrollments([]);
          setEnrollmentChecked(true);
        }
      } finally {
        if (!cancelled) setEnrollmentLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [paymentMethod, patient.id]);

  // Determine if insurance is available
  const hasInsuranceEnrollment = insuranceEnrollments.length > 0;

  // Check if form has any data entered
  const hasFormData = (): boolean => {
    return (
      paymentMethod !== "" ||
      bpjsNumber !== "" ||
      selectedInsurance !== null ||
      selectedDoctor !== null ||
      selectedClinic !== null
    );
  };

  // Handle back with unsaved data confirmation
  const handleBack = () => {
    if (hasFormData()) {
      const confirmed = window.confirm(
        "Anda memiliki data yang belum disimpan. Yakin ingin kembali?"
      );
      if (!confirmed) return;
    }
    onBack();
  };

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
    setGeneralError(null);

    try {
      const payload: Record<string, unknown> = {
        patientId: patient.id,
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

      onVisitCreated({
        id: visitData.id as string,
        visitNumber: visitData.visitNumber as string,
      });
    } catch (err: unknown) {
      const apiError = err as {
        status?: number;
        errorCode?: string;
        message?: string;
        errors?: Array<{ field: string; message: string }>;
      };

      // Handle specific known error codes with user-friendly messages
      if (apiError.errorCode === "ERR_DUPLICATE_ACTIVE_VISIT") {
        setGeneralError(
          "Pasien ini sudah memiliki kunjungan aktif hari ini. Gunakan kunjungan yang sudah ada atau batalkan terlebih dahulu."
        );
      } else if (apiError.errorCode === "ERR_NO_DEFAULT_INSURANCE") {
        setGeneralError(
          "Pasien tidak memiliki asuransi aktif terdaftar. Daftarkan asuransi pasien terlebih dahulu."
        );
      } else if (apiError.errors && Array.isArray(apiError.errors)) {
        const fieldErrors: FormErrors = {};
        for (const fieldErr of apiError.errors) {
          if (fieldErr.field === "bpjsNumber") {
            fieldErrors.bpjsNumber = fieldErr.message;
          } else if (fieldErr.field === "insuranceId") {
            fieldErrors.insurance = fieldErr.message;
          } else if (fieldErr.field === "paymentMethod") {
            fieldErrors.paymentMethod = fieldErr.message;
          } else {
            fieldErrors.general = fieldErr.message;
          }
        }
        setErrors(fieldErrors);
        if (fieldErrors.general) {
          setGeneralError(fieldErrors.general);
        }
      } else {
        setGeneralError(
          apiError.message || "Terjadi kesalahan saat mendaftarkan kunjungan. Silakan coba lagi."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format date of birth in Indonesian locale
  const formattedDob = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "-";

  const genderLabel = patient.gender === "MALE" ? "Laki-laki" : "Perempuan";

  return (
    <div className="space-y-6">
      {/* General Error Notification */}
      {generalError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <span>{generalError}</span>
          <button
            type="button"
            onClick={() => setGeneralError(null)}
            className="ml-3 rounded p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-800/30"
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}

      {/* Patient Info Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
          Data Pasien
        </h2>
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
              patient.gender === "MALE"
                ? "bg-blue-100 text-blue-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {patient.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {patient.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-mono text-brand">{patient.mrn}</span>
              <span>{formattedDob}</span>
              <span>{genderLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visit Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doctor and Clinic */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Detail Kunjungan
          </h2>
          <div className="space-y-4">
            <SearchableDropdown
              label="Dokter"
              placeholder="Pilih dokter (opsional)"
              value={selectedDoctor}
              onChange={setSelectedDoctor}
              fetchOptions={fetchDoctors}
            />
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
            {/* Payment options — button-style grid */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {(
                [
                  { value: "CASH", label: "Tunai (Cash)" },
                  { value: "TRANSFER", label: "Transfer" },
                  { value: "EDC", label: "EDC (Kartu)" },
                  { value: "BPJS", label: "BPJS" },
                  { value: "INSURANCE", label: "Asuransi" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(option.value);
                    setErrors((prev) => ({
                      ...prev,
                      paymentMethod: undefined,
                      bpjsNumber: undefined,
                      insurance: undefined,
                    }));
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    paymentMethod === option.value
                      ? "border-brand bg-brand/5 text-brand ring-2 ring-brand/20"
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
              <div className="space-y-3">
                {/* Enrollment check warning */}
                {enrollmentLoading && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memeriksa data BPJS pasien...
                  </div>
                )}
                {enrollmentChecked && !hasInsuranceEnrollment && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Pasien belum memiliki data BPJS terdaftar
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Daftarkan data asuransi BPJS pasien terlebih dahulu di menu Pasien → Detail → Asuransi, atau gunakan metode pembayaran lain.
                      </p>
                    </div>
                  </div>
                )}
                {enrollmentChecked && hasInsuranceEnrollment && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                    ✓ Pasien terdaftar BPJS — {insuranceEnrollments[0]?.insuranceName}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nomor BPJS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bpjsNumber}
                    onChange={(e) => {
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
                        : "border-slate-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900"
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
              </div>
            )}

            {/* Insurance Selection (conditional) */}
            {paymentMethod === "INSURANCE" && (
              <div className="space-y-3">
                {/* Enrollment check warning */}
                {enrollmentLoading && (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memeriksa data asuransi pasien...
                  </div>
                )}
                {enrollmentChecked && !hasInsuranceEnrollment && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Pasien belum memiliki data asuransi terdaftar
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Daftarkan data asuransi pasien terlebih dahulu di menu Pasien → Detail → Asuransi, atau gunakan metode pembayaran lain.
                      </p>
                    </div>
                  </div>
                )}
                {enrollmentChecked && hasInsuranceEnrollment && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
                    ✓ Pasien memiliki {insuranceEnrollments.length} asuransi aktif
                  </div>
                )}
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
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Pencarian
          </button>

          <button
            type="submit"
            disabled={submitting || ((paymentMethod === "BPJS" || paymentMethod === "INSURANCE") && enrollmentChecked && !hasInsuranceEnrollment)}
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md hover:shadow-brand/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand disabled:hover:shadow-sm disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              "Daftarkan Kunjungan"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
