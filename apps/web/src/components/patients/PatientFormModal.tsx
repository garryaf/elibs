"use client";

import { useState } from "react";
import { X, User, Phone, MapPin, Mail, Hash, Calendar, Shield, Heart, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient, PatientFormData, Gender } from "@/types/patient";
import { CascadingRegionSelector, type RegionValue } from "@/components/regions/CascadingRegionSelector";

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PatientFormData) => void;
  editData?: Patient | null;
}

const initialForm: PatientFormData = {
  nik: "",
  name: "",
  dob: "",
  gender: "MALE",
  phone: "",
  address: "",
  email: "",
  province: "",
  city: "",
  district: "",
  village: "",
  postalCode: "",
  provinsiId: undefined,
  kabupatenKotaId: undefined,
  kecamatanId: undefined,
  kelurahanDesaId: undefined,
  bloodType: "",
  emergencyContact: "",
  emergencyPhone: "",
};

interface FormInputProps {
  label: string;
  id: string;
  icon: React.ElementType;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, id, icon: Icon, error, required, children }: FormInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass = "mt-0 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-[#6B8E6B]";

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

export function PatientFormModal({ isOpen, onClose, onSubmit, editData }: PatientFormModalProps) {
  const [form, setForm] = useState<PatientFormData>(() =>
    editData
      ? {
          nik: editData.nik,
          name: editData.name,
          dob: editData.dob ? editData.dob.split("T")[0] : "",
          gender: editData.gender,
          phone: editData.phone,
          address: editData.address,
          email: editData.email ?? "",
          province: editData.province ?? "",
          city: editData.city ?? "",
          district: editData.district ?? "",
          village: editData.village ?? "",
          postalCode: editData.postalCode ?? "",
          provinsiId: editData.provinsiId ?? undefined,
          kabupatenKotaId: editData.kabupatenKotaId ?? undefined,
          kecamatanId: editData.kecamatanId ?? undefined,
          kelurahanDesaId: editData.kelurahanDesaId ?? undefined,
          bloodType: editData.bloodType ?? "",
          emergencyContact: editData.emergencyContact ?? "",
          emergencyPhone: editData.emergencyPhone ?? "",
        }
      : initialForm
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormData | "region", string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard: only allow edit mode — don't render in create mode
  if (!editData) {
    return null;
  }

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
    const newErrors: Partial<Record<keyof PatientFormData | "region", string>> = {};
    if (!form.nik || form.nik.length !== 16) newErrors.nik = "NIK harus 16 digit";
    if (!form.name || form.name.trim().length < 3) newErrors.name = "Nama minimal 3 karakter";
    if (!form.dob) newErrors.dob = "Tanggal lahir wajib diisi";
    if (!form.phone) newErrors.phone = "Nomor telepon wajib diisi";
    if (!form.address || form.address.trim().length < 5) newErrors.address = "Alamat minimal 5 karakter";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Format email tidak valid";
    }

    // Validate region: if any is selected, all must be selected
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
    onSubmit(form);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-modal-title"
    >
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4 dark:border-slate-800 dark:bg-slate-900/95">
          <div>
            <h2 id="patient-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
              {editData ? "Edit Data Pasien" : "Daftarkan Pasien Baru"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {editData ? `MRN: ${editData.mrn}` : "Isi formulir di bawah untuk mendaftarkan pasien baru"}
            </p>
          </div>
          <button
            onClick={onClose}
            id="patient-modal-close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6 space-y-6">
            {/* Section: Data Diri */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-[#6B8E6B]" />
                Data Diri
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="NIK" id="patient-nik" icon={Hash} error={errors.nik} required>
                  <input
                    id="patient-nik"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    placeholder="16 digit NIK"
                    value={form.nik}
                    onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, "") })}
                    className={cn(inputClass, errors.nik && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                  />
                </FormField>

                <FormField label="Nama Lengkap" id="patient-name" icon={User} error={errors.name} required>
                  <input
                    id="patient-name"
                    type="text"
                    placeholder="Nama lengkap sesuai KTP"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={cn(inputClass, errors.name && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                  />
                </FormField>

                <FormField label="Tanggal Lahir" id="patient-dob" icon={Calendar} error={errors.dob} required>
                  <input
                    id="patient-dob"
                    type="date"
                    value={form.dob}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className={cn(inputClass, errors.dob && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                  />
                </FormField>

                <FormField label="Jenis Kelamin" id="patient-gender" icon={User} required>
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
                          name="gender"
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

                <FormField label="Nomor Telepon" id="patient-phone" icon={Phone} error={errors.phone} required>
                  <input
                    id="patient-phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                    className={cn(inputClass, errors.phone && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                  />
                </FormField>

                <FormField label="Email" id="patient-email" icon={Mail} error={errors.email}>
                  <input
                    id="patient-email"
                    type="email"
                    placeholder="email@contoh.com (opsional)"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={cn(inputClass, errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                  />
                </FormField>

                <FormField label="Golongan Darah" id="patient-blood" icon={Heart}>
                  <select
                    id="patient-blood"
                    value={form.bloodType ?? ""}
                    onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">— Pilih —</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </FormField>
              </div>
            </div>

            {/* Section: Alamat */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#6B8E6B]" />
                Alamat
              </h3>
              <div className="space-y-4">
                {/* Alamat Lengkap free-text field */}
                <FormField label="Alamat Lengkap" id="patient-address" icon={MapPin} error={errors.address} required>
                  <textarea
                    id="patient-address"
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

                {/* Kode Pos */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Kode Pos" id="patient-postal" icon={Hash}>
                    <input
                      id="patient-postal"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="Kode pos"
                      value={form.postalCode ?? ""}
                      onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") })}
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </div>
            </div>

            {/* Section: Kontak Darurat */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#6B8E6B]" />
                Kontak Darurat
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nama Kontak Darurat" id="patient-emergency-name" icon={User}>
                  <input
                    id="patient-emergency-name"
                    type="text"
                    placeholder="Nama keluarga/kerabat"
                    value={form.emergencyContact ?? ""}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Telepon Darurat" id="patient-emergency-phone" icon={Phone}>
                  <input
                    id="patient-emergency-phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={form.emergencyPhone ?? ""}
                    onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value.replace(/\D/g, "") })}
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-6 py-4 dark:border-slate-800 dark:bg-slate-900/95">
            <button
              type="button"
              id="patient-modal-cancel"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              id="patient-modal-submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan...
                </>
              ) : (
                <>{editData ? "Simpan Perubahan" : "Daftarkan Pasien"}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
