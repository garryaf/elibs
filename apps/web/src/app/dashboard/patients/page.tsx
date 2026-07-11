"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Download } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Patient, PatientFormData, PatientStatus } from "@/types/patient";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { PatientStatusBadge } from "@/components/patients/PatientStatusBadge";
import { PatientLabHistory } from "@/components/patients/PatientLabHistory";

const LAB_HISTORY_ROLES = [
  "KASIR",
  "CS",
  "ADMIN",
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "SAMPLING",
  "ANALIS",
  "DOKTER",
  "KLINIK_PARTNER",
];

export default function PatientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "ALL">("ALL");

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getPatients({ limit: 200, search: search || undefined });
      // Defensive extraction: handle both { data: { data: [] } } and { data: [] } shapes
      const envelope = (res?.data ?? res) as unknown;
      let raw: unknown[] = [];
      if (Array.isArray(envelope)) {
        raw = envelope;
      } else if (envelope && typeof envelope === "object" && "data" in envelope) {
        const inner = (envelope as { data: unknown }).data;
        raw = Array.isArray(inner) ? inner : [];
      }
      // Map backend Patient model to frontend Patient type
      const mapped: Patient[] = (raw as Record<string, unknown>[]).map((p) => ({
        id: p.id as string,
        mrn: p.mrn as string,
        nik: p.nik as string,
        name: p.name as string,
        dob: (p.dateOfBirth as string) || "",
        gender: p.gender as "MALE" | "FEMALE",
        phone: (p.phone as string) || "",
        address: (p.address as string) || "",
        email: (p.email as string) || undefined,
        status: p.deletedAt ? "INACTIVE" : "ACTIVE",
        createdAt: p.createdAt as string,
        lastVisit: p.updatedAt as string,
      }));
      setPatients(mapped);
    } catch {
      // If API fails, show empty state
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(loadPatients, 300);
    return () => clearTimeout(debounce);
  }, [loadPatients]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nik.includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.phone.includes(q);
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [patients, search, statusFilter]);

  const stats = {
    total: patients.length,
    active: patients.filter((p) => p.status === "ACTIVE").length,
    inactive: patients.filter((p) => p.status === "INACTIVE").length,
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleView = (patient: Patient) => {
    setViewingPatient(patient);
  };

  const handleDelete = (patient: Patient) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patient.id ? { ...p, status: "INACTIVE" as PatientStatus } : p
      )
    );
  };

  const handleSubmit = async (data: PatientFormData) => {
    if (!editingPatient) return;

    // Build region payload — only include if all four are selected
    const regionPayload =
      data.provinsiId && data.kabupatenKotaId && data.kecamatanId && data.kelurahanDesaId
        ? {
            provinsiId: data.provinsiId,
            kabupatenKotaId: data.kabupatenKotaId,
            kecamatanId: data.kecamatanId,
            kelurahanDesaId: data.kelurahanDesaId,
          }
        : {};

    try {
      await apiClient.updatePatient(editingPatient.id, {
        name: data.name,
        dateOfBirth: data.dob,
        gender: data.gender,
        phone: data.phone,
        address: data.address,
        email: data.email || undefined,
        ...regionPayload,
      });
      loadPatients();
    } catch {
      // Error silently handled — could add toast later
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Manajemen Pasien
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kelola data registrasi dan rekam medis seluruh pasien.
            </p>
          </div>
          <button
            id="patient-add-btn"
            onClick={() => router.push('/dashboard/registration')}
            className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] hover:shadow-md hover:shadow-[#6B8E6B]/20 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Daftarkan Pasien
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Pasien Terdaftar", value: stats.total, color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
            { label: "Pasien Aktif", value: stats.active, color: "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B]" },
            { label: "Pasien Nonaktif", value: stats.inactive, color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar: Search + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="patient-search"
              type="text"
              placeholder="Cari nama, NIK, atau MRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
                <button
                  key={s}
                  id={`patient-filter-${s.toLowerCase()}`}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    statusFilter === s
                      ? "bg-[#6B8E6B] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {s === "ALL" ? "Semua" : s === "ACTIVE" ? "Aktif" : "Nonaktif"}
                </button>
              ))}
            </div>

            {/* Export CSV */}
            <button
              id="patient-export-btn"
              title="Export Data (CSV)"
              onClick={() => {
                const headers = ["MRN", "NIK", "Nama", "Gender", "Telepon", "Email", "Status"];
                const rows = filteredPatients.map((p) => [
                  p.mrn, p.nik, p.name, p.gender, p.phone, p.email || "", p.status
                ]);
                const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `pasien-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results summary */}
        {search && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredPatients.length}</span> hasil untuk &quot;<span className="font-semibold text-[#6B8E6B]">{search}</span>&quot;
          </p>
        )}

        {/* Table */}
        <PatientTable
          patients={filteredPatients}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      </div>

      {/* Patient Form Modal */}
      <PatientFormModal
        key={`${isModalOpen}-${editingPatient?.id ?? "new"}`}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        editData={editingPatient}
      />

      {/* View Detail Modal (simple) */}
      {viewingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setViewingPatient(null)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detail Pasien</h2>
              <button
                id="patient-detail-close"
                onClick={() => setViewingPatient(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <span className="sr-only">Tutup</span>✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${viewingPatient.gender === "MALE" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-700"}`}>
                  {viewingPatient.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingPatient.name}</p>
                  <p className="font-mono text-sm text-[#6B8E6B]">{viewingPatient.mrn}</p>
                </div>
                <div className="ml-auto"><PatientStatusBadge status={viewingPatient.status} /></div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  { label: "NIK", value: viewingPatient.nik },
                  { label: "Jenis Kelamin", value: viewingPatient.gender === "MALE" ? "Laki-laki" : "Perempuan" },
                  { label: "Tanggal Lahir", value: new Date(viewingPatient.dob).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) },
                  { label: "Telepon", value: viewingPatient.phone },
                  { label: "Email", value: viewingPatient.email ?? "—" },
                  { label: "Terdaftar", value: new Date(viewingPatient.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">{value}</dd>
                  </div>
                ))}
                <div className="col-span-2">
                  <dt className="font-medium text-slate-500 dark:text-slate-400">Alamat</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{viewingPatient.address}</dd>
                </div>
              </dl>

              {/* Riwayat Laboratorium — role-gated */}
              {user?.role && LAB_HISTORY_ROLES.includes(user.role) && (
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <PatientLabHistory patientId={viewingPatient.id} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <button
                onClick={() => { setViewingPatient(null); handleEdit(viewingPatient); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Edit Data
              </button>
              <button
                onClick={() => setViewingPatient(null)}
                className="rounded-xl bg-[#6B8E6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A7D5A]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
