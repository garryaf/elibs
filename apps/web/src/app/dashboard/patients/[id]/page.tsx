"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  Heart,
  Shield,
  FlaskConical,
  Pencil,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { PatientStatusBadge } from "@/components/patients/PatientStatusBadge";
import { PatientLabHistory } from "@/components/patients/PatientLabHistory";
import { PatientAvatar } from "@/components";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import type { Patient, PatientFormData } from "@/types/patient";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS",
  "SAMPLING", "ANALIS", "DOKTER", "MARKETING", "KLINIK_PARTNER",
];

const LAB_HISTORY_ROLES = [
  "KASIR", "CS", "ADMIN", "SUPER_ADMIN", "OWNER",
  "MANAGER", "SAMPLING", "ANALIS", "DOKTER", "KLINIK_PARTNER",
];

const INSURANCE_ROLES = ["ADMIN", "CS", "SUPER_ADMIN"];

type Tab = "data" | "lab" | "insurance";

// ─── Helper: map raw API response to Patient type ─────────────────────────────

function mapRawToPatient(p: Record<string, unknown>): Patient {
  return {
    id: p.id as string,
    mrn: p.mrn as string,
    nik: p.nik as string,
    name: p.name as string,
    dob: (p.dateOfBirth as string) || "",
    gender: p.gender as "MALE" | "FEMALE",
    phone: (p.phone as string) || "",
    address: (p.address as string) || "",
    email: (p.email as string) || undefined,
    province: (p.province as string) || undefined,
    city: (p.city as string) || undefined,
    district: (p.district as string) || undefined,
    village: (p.village as string) || undefined,
    postalCode: (p.postalCode as string) || undefined,
    provinsiId: (p.provinsiId as string) || undefined,
    kabupatenKotaId: (p.kabupatenKotaId as string) || undefined,
    kecamatanId: (p.kecamatanId as string) || undefined,
    kelurahanDesaId: (p.kelurahanDesaId as string) || undefined,
    bloodType: (p.bloodType as string) || undefined,
    emergencyContact: (p.emergencyContact as string) || undefined,
    emergencyPhone: (p.emergencyPhone as string) || undefined,
    status: p.deletedAt ? "INACTIVE" : "ACTIVE",
    createdAt: p.createdAt as string,
    lastVisit: (p.lastVisitDate as string) || (p.lastVisit as string) || "",
  };
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
            <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Info Field ───────────────────────────────────────────────────────────────

function InfoField({
  label,
  value,
  icon: Icon,
  mono = false,
  colSpan = 1,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  mono?: boolean;
  colSpan?: 1 | 2;
}) {
  const isEmpty = !value || value === "—";
  return (
    <div className={cn("flex flex-col gap-1", colSpan === 2 && "sm:col-span-2")}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-semibold",
          mono && "font-mono",
          isEmpty
            ? "text-slate-400 dark:text-slate-600 italic"
            : "text-slate-900 dark:text-white"
        )}
      >
        {value || "Belum diisi"}
      </dd>
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard/patients"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-brand/10 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        aria-label="Kembali ke daftar pasien"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profil Pasien
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Detail lengkap data dan riwayat medis pasien
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("data");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // ─── Fetch patient ──────────────────────────────────────────────────────
  const fetchPatient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getPatient(patientId);
      const raw = res as unknown as Record<string, unknown>;
      const data = (raw?.data ?? raw) as Record<string, unknown>;
      setPatient(mapRawToPatient(data));
    } catch {
      setError("Gagal memuat data pasien. Pastikan koneksi Anda stabil dan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  // ─── Auto-dismiss update error ──────────────────────────────────────────
  useEffect(() => {
    if (!updateError) return;
    const t = setTimeout(() => setUpdateError(null), 8000);
    return () => clearTimeout(t);
  }, [updateError]);

  // ─── Edit handler ───────────────────────────────────────────────────────
  const handleEditSubmit = async (data: PatientFormData) => {
    if (!patient) return;
    setUpdateError(null);

    const regionPayload =
      data.provinsiId && data.kabupatenKotaId && data.kecamatanId && data.kelurahanDesaId
        ? {
            provinsiId: data.provinsiId,
            kabupatenKotaId: data.kabupatenKotaId,
            kecamatanId: data.kecamatanId,
            kelurahanDesaId: data.kelurahanDesaId,
          }
        : {};

    await apiClient.updatePatient(patient.id, {
      name: data.name,
      dateOfBirth: data.dob,
      gender: data.gender,
      phone: data.phone,
      address: data.address,
      email: data.email || undefined,
      bloodType: data.bloodType || undefined,
      emergencyContact: data.emergencyContact || undefined,
      emergencyPhone: data.emergencyPhone || undefined,
      ...regionPayload,
    });
    fetchPatient();
  };

  // ─── Tab definition (role-gated) ────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType; allowed: boolean; external?: boolean }[] = [
    { id: "data", label: "Data Diri", icon: User, allowed: true },
    {
      id: "lab",
      label: "Riwayat Lab",
      icon: FlaskConical,
      allowed: !!(user?.role && LAB_HISTORY_ROLES.includes(user.role)),
    },
    {
      id: "insurance",
      label: "Asuransi",
      icon: Shield,
      allowed: !!(user?.role && INSURANCE_ROLES.includes(user.role)),
      external: true,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.allowed);

  // ─── States ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <RoleGuard allowedRoles={ALL_ROLES}>
        <div className="space-y-6">
          <PageHeader />
          <ProfileSkeleton />
        </div>
      </RoleGuard>
    );
  }

  if (error || !patient) {
    return (
      <RoleGuard allowedRoles={ALL_ROLES}>
        <div className="space-y-6">
          <PageHeader />
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-950">
            <AlertCircle className="h-12 w-12 text-red-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Pasien Tidak Ditemukan</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs text-center">
              {error || "Data pasien tidak tersedia atau telah dihapus."}
            </p>
            <button
              onClick={fetchPatient}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </RoleGuard>
    );
  }

  const age = (() => {
    if (!patient.dob) return null;
    const today = new Date();
    const birth = new Date(patient.dob);
    let a = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    ) {
      a--;
    }
    return a;
  })();

  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader />

        {/* Update Error Toast */}
        {updateError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{updateError}</span>
            <button
              onClick={() => setUpdateError(null)}
              className="rounded-lg p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800/50"
              aria-label="Tutup pesan error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Patient Hero Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <PatientAvatar name={patient.name} gender={patient.gender} size="xl" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{patient.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-brand">{patient.mrn}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{patient.gender === "MALE" ? "Laki-laki" : "Perempuan"}</span>
                  {age !== null && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{age} tahun</span>
                    </>
                  )}
                  {patient.bloodType && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-400" />
                        {patient.bloodType}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PatientStatusBadge status={patient.status} />
              <button
                id="patient-profile-edit-btn"
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:border-brand hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Pencil className="h-4 w-4" />
                Edit Data
              </button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3 dark:border-slate-800">
            {[
              {
                label: "Terdaftar",
                value: patient.createdAt
                  ? new Date(patient.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—",
              },
              {
                label: "Kunjungan Terakhir",
                value: patient.lastVisit
                  ? new Date(patient.lastVisit).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Belum ada kunjungan",
              },
              {
                label: "Telepon",
                value: patient.phone || "—",
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {visibleTabs.map(({ id, label, icon: Icon, external }) => (
            <button
              key={id}
              id={`patient-tab-${id}`}
              onClick={() => {
                if (external) {
                  router.push(`/dashboard/patients/${patientId}/insurance`);
                  return;
                }
                setActiveTab(id);
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                activeTab === id && !external
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {external && <ExternalLink className="h-3 w-3 opacity-50" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "data" && (
          <div className="space-y-6">
            {/* Data Diri */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <User className="h-4 w-4 text-brand" />
                Data Diri
              </h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoField label="NIK" value={patient.nik} icon={Hash} mono />
                <InfoField
                  label="Jenis Kelamin"
                  value={patient.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                  icon={User}
                />
                <InfoField
                  label="Tanggal Lahir"
                  value={
                    patient.dob
                      ? new Date(patient.dob).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"
                  }
                  icon={Calendar}
                />
                <InfoField
                  label="Golongan Darah"
                  value={patient.bloodType || "—"}
                  icon={Heart}
                />
                <InfoField label="Nomor Telepon" value={patient.phone || "—"} icon={Phone} />
                <InfoField label="Email" value={patient.email || "—"} icon={Mail} />
              </dl>
            </div>

            {/* Alamat */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <MapPin className="h-4 w-4 text-brand" />
                Alamat
              </h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoField
                  label="Alamat Lengkap"
                  value={patient.address || "—"}
                  icon={MapPin}
                  colSpan={2}
                />
                {(patient.province || patient.city || patient.district || patient.village) && (
                  <>
                    <InfoField label="Provinsi" value={patient.province || "—"} icon={MapPin} />
                    <InfoField label="Kota / Kabupaten" value={patient.city || "—"} icon={MapPin} />
                    <InfoField label="Kecamatan" value={patient.district || "—"} icon={MapPin} />
                    <InfoField label="Kelurahan / Desa" value={patient.village || "—"} icon={MapPin} />
                  </>
                )}
                {patient.postalCode && (
                  <InfoField label="Kode Pos" value={patient.postalCode} icon={Hash} />
                )}
              </dl>
            </div>

            {/* Kontak Darurat — hanya tampil jika ada data */}
            {(patient.emergencyContact || patient.emergencyPhone) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Shield className="h-4 w-4 text-brand" />
                  Kontak Darurat
                </h3>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoField
                    label="Nama Kontak Darurat"
                    value={patient.emergencyContact || "—"}
                    icon={User}
                  />
                  <InfoField
                    label="Telepon Darurat"
                    value={patient.emergencyPhone || "—"}
                    icon={Phone}
                  />
                </dl>
              </div>
            )}
          </div>
        )}

        {activeTab === "lab" && user?.role && LAB_HISTORY_ROLES.includes(user.role) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PatientLabHistory patientId={patientId} />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <PatientFormModal
        key={`profile-edit-${isEditOpen}`}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEditSubmit}
        editData={patient}
      />
    </RoleGuard>
  );
}
