"use client";

import { useState } from "react";
import { User, Phone, MapPin, Mail, Hash, Calendar, Building, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type { Gender } from "@/types/patient";
import { CascadingRegionSelector, type RegionValue } from "@/components/regions/CascadingRegionSelector";
import type { PatientOption } from "@/types/visit";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientRegistrationStepProps {
  onPatientRegistered: (patient: PatientOption) => void;
  onBack: () => void;
}

interface RegistrationFormData {
  nik: string;
  name: string;
  dob: string;
  gender: Gender;
  phone: string;
  email: string;
  address: string;
  provinsiId?: string;
  kabupatenKotaId?: string;
  kecamatanId?: string;
  kelurahanDesaId?: string;
}

type FormErrors = Partial<Record<keyof RegistrationFormData | "region" | "general", string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const initialForm: RegistrationFormData = {
  nik: "",
  name: "",
  dob: "",
  gender: "MALE",
  phone: "",
  email: "",
  address: "",
  provinsiId: undefined,
  kabupatenKotaId: undefined,
  kecamatanId: undefined,
  kelurahanDesaId: undefined,
};

const inputClass =
  "mt-0 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#6B8E6B]";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  id: string;
  icon: React.ElementType;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, id, icon: Icon, error, required, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Validates region selection: if any region level is selected, all four must be selected.
 * All empty is valid (region selection is optional).
 */
function validateRegion(region: RegionValue): string | undefined {
  const { provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId } = region;
  const hasAny = !!(provinsiId || kabupatenKotaId || kecamatanId || kelurahanDesaId);
  const hasAll = !!(provinsiId && kabupatenKotaId && kecamatanId && kelurahanDesaId);

  if (hasAny && !hasAll) {
    return "Semua level wilayah harus dipilih";
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientRegistrationStep({
  onPatientRegistered,
  onBack,
}: PatientRegistrationStepProps) {
  const [form, setForm] = useState<RegistrationFormData>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive region value for the CascadingRegionSelector
  const regionValue: RegionValue = {
    provinsiId: form.provinsiId,
    kabupatenKotaId: form.kabupatenKotaId,
    kecamatanId: form.kecamatanId,
    kelurahanDesaId: form.kelurahanDesaId,
  };

  const handleRegionChange = (value: RegionValue) => {
    setForm((prev) => ({
      ...prev,
      provinsiId: value.provinsiId,
      kabupatenKotaId: value.kabupatenKotaId,
      kecamatanId: value.kecamatanId,
      kelurahanDesaId: value.kelurahanDesaId,
    }));
    // Clear region error when user makes a change
    if (errors.region) {
      setErrors((prev) => {
        const { region: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // NIK: exactly 16 numeric digits
    if (!form.nik || !/^\d{16}$/.test(form.nik)) {
      newErrors.nik = "NIK harus tepat 16 digit angka";
    }

    // Name: 1–200 characters
    if (!form.name || form.name.trim().length < 1) {
      newErrors.name = "Nama wajib diisi";
    } else if (form.name.trim().length > 200) {
      newErrors.name = "Nama maksimal 200 karakter";
    }

    // DOB: required, not in the future
    if (!form.dob) {
      newErrors.dob = "Tanggal lahir wajib diisi";
    } else {
      const dobDate = new Date(form.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate > today) {
        newErrors.dob = "Tanggal lahir tidak boleh di masa depan";
      }
    }

    // Gender: valid enum (always set via buttons, but guard anyway)
    if (!form.gender || !["MALE", "FEMALE"].includes(form.gender)) {
      newErrors.gender = "Jenis kelamin wajib dipilih";
    }

    // Email (optional): validate format if provided
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Format email tidak valid";
    }

    // Region: if any is selected, all must be selected
    const regionError = validateRegion(regionValue);
    if (regionError) {
      newErrors.region = regionError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Build payload for the API
      const payload: Record<string, unknown> = {
        nik: form.nik,
        name: form.name.trim(),
        dateOfBirth: form.dob,
        gender: form.gender,
      };

      if (form.phone) payload.phone = form.phone;
      if (form.email) payload.email = form.email;
      if (form.address) payload.address = form.address;
      if (form.provinsiId) payload.provinsiId = form.provinsiId;
      if (form.kabupatenKotaId) payload.kabupatenKotaId = form.kabupatenKotaId;
      if (form.kecamatanId) payload.kecamatanId = form.kecamatanId;
      if (form.kelurahanDesaId) payload.kelurahanDesaId = form.kelurahanDesaId;

      const response = await apiClient.createPatient(payload);
      const result = response?.data as Record<string, unknown> | undefined;

      // Extract patient data from the response
      const newPatient: PatientOption = {
        id: (result?.id as string) ?? "",
        mrn: (result?.mrn as string) ?? "",
        name: (result?.name as string) ?? form.name.trim(),
        nik: (result?.nik as string) ?? form.nik,
        dateOfBirth: (result?.dateOfBirth as string) ?? (result?.dob as string) ?? form.dob,
        gender: (result?.gender as "MALE" | "FEMALE") ?? form.gender,
      };

      onPatientRegistered(newPatient);
    } catch (err: unknown) {
      const error = err as {
        status?: number;
        errorCode?: string;
        message?: string;
        errors?: Array<{ field: string; message: string }>;
      };

      // Handle NIK duplicate error specifically
      if (
        error.errorCode === "ERR_VALIDATION" &&
        error.message?.toLowerCase().includes("nik")
      ) {
        setErrors((prev) => ({ ...prev, nik: "NIK sudah terdaftar dalam sistem" }));
      } else if (error.errors && Array.isArray(error.errors)) {
        // Handle field-level validation errors
        const fieldErrors: FormErrors = {};
        for (const fieldErr of error.errors) {
          const fieldName = fieldErr.field as keyof RegistrationFormData;
          fieldErrors[fieldName] = fieldErr.message;
        }
        setErrors(fieldErrors);
      } else {
        // General error — show as banner above form
        setErrors((prev) => ({
          ...prev,
          general: error.message || "Terjadi kesalahan saat mendaftarkan pasien",
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Daftarkan Pasien Baru
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Isi formulir di bawah untuk mendaftarkan pasien baru ke sistem
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="p-6 space-y-6">
          {/* General Error Banner */}
          {errors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {errors.general}
            </div>
          )}
          {/* Section: Data Diri */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[#6B8E6B]" />
              Data Diri
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* NIK */}
              <FormField label="NIK" id="reg-nik" icon={Hash} error={errors.nik} required>
                <input
                  id="reg-nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="16 digit NIK"
                  value={form.nik}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                    setForm({ ...form, nik: digits });
                    if (errors.nik) setErrors((prev) => ({ ...prev, nik: undefined }));
                  }}
                  className={cn(inputClass, errors.nik && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                />
              </FormField>

              {/* Name */}
              <FormField label="Nama Lengkap" id="reg-name" icon={User} error={errors.name} required>
                <input
                  id="reg-name"
                  type="text"
                  maxLength={200}
                  placeholder="Nama lengkap sesuai KTP"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={cn(inputClass, errors.name && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                />
              </FormField>

              {/* Date of Birth */}
              <FormField label="Tanggal Lahir" id="reg-dob" icon={Calendar} error={errors.dob} required>
                <input
                  id="reg-dob"
                  type="date"
                  value={form.dob}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => {
                    setForm({ ...form, dob: e.target.value });
                    if (errors.dob) setErrors((prev) => ({ ...prev, dob: undefined }));
                  }}
                  className={cn(inputClass, errors.dob && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                />
              </FormField>

              {/* Gender */}
              <FormField label="Jenis Kelamin" id="reg-gender" icon={User} error={errors.gender} required>
                <div className="mt-0 flex gap-3">
                  {(["MALE", "FEMALE"] as Gender[]).map((g) => (
                    <label
                      key={g}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all",
                        form.gender === g
                          ? "border-[#6B8E6B] bg-[#6B8E6B]/10 text-[#6B8E6B] ring-1 ring-[#6B8E6B]/30 dark:border-[#6B8E6B] dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      )}
                    >
                      <input
                        type="radio"
                        name="reg-gender"
                        value={g}
                        checked={form.gender === g}
                        onChange={() => setForm({ ...form, gender: g })}
                        className="sr-only"
                      />
                      {g === "MALE" ? "♂ Laki-laki" : "♀ Perempuan"}
                    </label>
                  ))}
                </div>
              </FormField>
            </div>
          </div>

          {/* Section: Kontak */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#6B8E6B]" />
              Kontak
              <span className="text-xs text-slate-400 font-normal">(opsional)</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Phone */}
              <FormField label="Nomor Telepon" id="reg-phone" icon={Phone} error={errors.phone}>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                  className={cn(inputClass, errors.phone && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                />
              </FormField>

              {/* Email */}
              <FormField label="Email" id="reg-email" icon={Mail} error={errors.email}>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={cn(inputClass, errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                />
              </FormField>
            </div>
          </div>

          {/* Section: Alamat */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#6B8E6B]" />
              Alamat
              <span className="text-xs text-slate-400 font-normal">(opsional)</span>
            </h3>
            <div className="space-y-4">
              {/* Address free-text */}
              <FormField label="Alamat Lengkap" id="reg-address" icon={MapPin} error={errors.address}>
                <textarea
                  id="reg-address"
                  rows={2}
                  placeholder="Jl. nama jalan, No. RT/RW"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className={cn(
                    "mt-0 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#6B8E6B]",
                    errors.address && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                  )}
                />
              </FormField>

              {/* Cascading Region Selector */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  Wilayah Administratif
                  <span className="text-xs text-slate-400 font-normal">(opsional)</span>
                </label>
                <CascadingRegionSelector
                  value={regionValue}
                  onChange={handleRegionChange}
                />
                {errors.region && (
                  <p className="mt-2 text-xs text-red-500">{errors.region}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              "Daftarkan Pasien"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
