"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Download, AlertCircle, ExternalLink, Loader2, X, CheckCircle2, Filter, Shield, History } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { Patient, PatientFormData, PatientStatus } from "@/types/patient";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientFormModal } from "@/components/patients/PatientFormModal";
import { PatientStatusBadge } from "@/components/patients/PatientStatusBadge";
import { PatientLabHistory } from "@/components/patients/PatientLabHistory";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { StatsCardsSkeleton, PatientAvatar, ActiveFilters, type ActiveFilterItem } from "@/components";

const ALL_ROLES = [
  "SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS",
  "SAMPLING", "ANALIS", "DOKTER", "MARKETING", "KLINIK_PARTNER"
];

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

// ─── BP-08: Patient Audit History Component ──────────────────────────────────

function PatientAuditHistory({ patientId }: { patientId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    apiClient.getAuditLogs({ entityName: "Patient", entityId: patientId, limit: 10 })
      .then((res: any) => {
        const data = res?.data?.data || res?.data || [];
        setLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [patientId, expanded]);

  return (
    <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-sm font-bold text-slate-900 dark:text-white"
      >
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-brand" />
          Riwayat Perubahan
        </span>
        <span className="text-xs text-slate-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat...
            </div>
          ) : logs.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">Belum ada riwayat perubahan.</p>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{log.action}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {log.newValues && typeof log.newValues === "object" && (
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {Object.entries(log.newValues as Record<string, unknown>).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ")}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatus | "ALL">("ACTIVE");
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Advanced filters
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [registeredFrom, setRegisteredFrom] = useState<string>("");
  const [registeredTo, setRegisteredTo] = useState<string>("");
  const [lastVisitFrom, setLastVisitFrom] = useState<string>("");
  const [lastVisitTo, setLastVisitTo] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [pageSize, setPageSize] = useState(20);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getPatients({ 
        page, 
        limit: pageSize, 
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        sortBy,
        sortOrder,
        gender: genderFilter || undefined,
        ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
        ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
        registeredFrom: registeredFrom || undefined,
        registeredTo: registeredTo || undefined,
        lastVisitFrom: lastVisitFrom || undefined,
        lastVisitTo: lastVisitTo || undefined,
      });
      // Defensive extraction: handle paginated response { data: [...], meta: {...} }
      const raw_response = res as unknown as Record<string, unknown>;
      let raw: unknown[] = [];
      let total = 0;
      let actCount = 0;
      let inactCount = 0;

      if (raw_response && typeof raw_response === "object" && !Array.isArray(raw_response)) {
        const innerData = raw_response.data;
        const innerMeta = raw_response.meta as Record<string, unknown> | undefined;

        if (Array.isArray(innerData)) {
          raw = innerData;
        } else if (innerData && typeof innerData === "object" && "data" in (innerData as object)) {
          const nested = innerData as Record<string, unknown>;
          raw = Array.isArray(nested.data) ? nested.data as unknown[] : [];
          if (nested.meta) {
            const m = nested.meta as Record<string, unknown>;
            total = Number(m.total) || 0;
            actCount = Number(m.activeCount) || 0;
            inactCount = Number(m.inactiveCount) || 0;
          }
        }

        if (innerMeta) {
          total = Number(innerMeta.total) || 0;
          actCount = Number(innerMeta.activeCount) || 0;
          inactCount = Number(innerMeta.inactiveCount) || 0;
        }
      } else if (Array.isArray(raw_response)) {
        raw = raw_response;
        total = raw_response.length;
        actCount = raw_response.filter((p: any) => !p.deletedAt).length;
        inactCount = raw_response.filter((p: any) => p.deletedAt).length;
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
        lastVisit: (p.lastVisitDate as string) || (p.lastVisit as string) || undefined,
        activeVisitStatus: (p.activeVisitStatus as string) || null,
        activeOrderStatus: (p.activeOrderStatus as string) || null,
        activeOrderNumber: (p.activeOrderNumber as string) || null,
        insurances: (p.insurances as any[]) || undefined,
      }));
      setPatients(mapped);
      setTotalPatients(total || mapped.length);
      setActiveCount(actCount);
      setInactiveCount(inactCount);
    } catch {
      // If API fails, show empty state
      setPatients([]);
      setTotalPatients(0);
      setActiveCount(0);
      setInactiveCount(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter, pageSize, sortBy, sortOrder, genderFilter, ageMin, ageMax, registeredFrom, registeredTo, lastVisitFrom, lastVisitTo]);

  // Single effect: debounce search/filter changes and reset page.
  // Page changes (from pagination clicks) fetch immediately without debounce.
  const prevFiltersRef = useRef({ search, statusFilter, pageSize, sortBy, sortOrder, genderFilter, ageMin, ageMax, registeredFrom, registeredTo, lastVisitFrom, lastVisitTo });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.search !== search ||
      prev.statusFilter !== statusFilter ||
      prev.pageSize !== pageSize ||
      prev.sortBy !== sortBy ||
      prev.sortOrder !== sortOrder ||
      prev.genderFilter !== genderFilter ||
      prev.ageMin !== ageMin ||
      prev.ageMax !== ageMax ||
      prev.registeredFrom !== registeredFrom ||
      prev.registeredTo !== registeredTo ||
      prev.lastVisitFrom !== lastVisitFrom ||
      prev.lastVisitTo !== lastVisitTo;

    prevFiltersRef.current = { search, statusFilter, pageSize, sortBy, sortOrder, genderFilter, ageMin, ageMax, registeredFrom, registeredTo, lastVisitFrom, lastVisitTo };

    if (filtersChanged) {
      if (page !== 1) {
        setPage(1);
        return;
      }
      const debounce = setTimeout(loadPatients, 300);
      return () => clearTimeout(debounce);
    } else {
      loadPatients();
    }
  }, [loadPatients, search, statusFilter, pageSize, sortBy, sortOrder, genderFilter, ageMin, ageMax, registeredFrom, registeredTo, lastVisitFrom, lastVisitTo, page]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleSortChange = (field: string, dir: "asc" | "desc") => {
    // Map frontend field names to backend field names
    const fieldMap: Record<string, string> = {
      name: "name",
      mrn: "mrn",
      dob: "dateOfBirth",
      lastVisit: "createdAt",
      status: "deletedAt",
    };
    setSortBy(fieldMap[field] || field);
    setSortOrder(dir);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hasNoActiveVisit, setHasNoActiveVisit] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const viewDetailTrapRef = useFocusTrap(!!viewingPatient, () => setViewingPatient(null));
  const deleteTrapRef = useFocusTrap(!!deletingPatient, () => setDeletingPatient(null));

  // Check if the viewed patient has an active visit
  useEffect(() => {
    if (!viewingPatient) {
      setHasNoActiveVisit(null);
      return;
    }

    let cancelled = false;
    setHasNoActiveVisit(null);

    (async () => {
      try {
        const res = await apiClient.getVisits({ search: viewingPatient.mrn, limit: 5 });
        if (cancelled) return;
        // Defensive extraction — same pattern used elsewhere
        const envelope = (res?.data ?? res) as unknown;
        let rows: unknown[] = [];
        if (Array.isArray(envelope)) {
          rows = envelope;
        } else if (envelope && typeof envelope === "object" && "data" in envelope) {
          const inner = (envelope as { data: unknown }).data;
          rows = Array.isArray(inner) ? inner : [];
        }
        const hasActive = rows.some((v) => {
          const visit = v as { status?: string };
          return visit.status === "REGISTERED" || visit.status === "IN_PROGRESS";
        });
        if (!cancelled) setHasNoActiveVisit(!hasActive);
      } catch {
        // On error, don't show banner (fail open)
        if (!cancelled) setHasNoActiveVisit(null);
      }
    })();

    return () => { cancelled = true; };
  }, [viewingPatient]);

  // Auto-dismiss error toast after 8 seconds
  useEffect(() => {
    if (!updateError) return;
    const timer = setTimeout(() => setUpdateError(null), 8000);
    return () => clearTimeout(timer);
  }, [updateError]);

  // Auto-dismiss success toast after 5 seconds
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredPatients = patients;

  const stats = {
    total: totalPatients,
    active: activeCount,
    inactive: inactiveCount,
  };

  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    if (search.trim()) {
      items.push({
        id: "search",
        label: "Pencarian",
        value: `"${search.trim()}"`,
        onRemove: () => setSearch(""),
      });
    }
    if (statusFilter !== "ALL") {
      items.push({
        id: "status",
        label: "Status",
        value: statusFilter === "ACTIVE" ? "Aktif" : "Nonaktif",
        onRemove: () => setStatusFilter("ALL"),
      });
    }
    if (genderFilter) {
      items.push({
        id: "gender",
        label: "Gender",
        value: genderFilter === "MALE" ? "Laki-laki" : "Perempuan",
        onRemove: () => setGenderFilter(""),
      });
    }
    if (ageMin || ageMax) {
      items.push({
        id: "age",
        label: "Usia",
        value: `${ageMin || "0"}–${ageMax || "∞"} tahun`,
        onRemove: () => { setAgeMin(""); setAgeMax(""); },
      });
    }
    if (registeredFrom || registeredTo) {
      items.push({
        id: "registered",
        label: "Tgl Daftar",
        value: `${registeredFrom || "..."} s/d ${registeredTo || "..."}`,
        onRemove: () => { setRegisteredFrom(""); setRegisteredTo(""); },
      });
    }
    if (lastVisitFrom || lastVisitTo) {
      items.push({
        id: "lastVisit",
        label: "Kunjungan",
        value: `${lastVisitFrom || "..."} s/d ${lastVisitTo || "..."}`,
        onRemove: () => { setLastVisitFrom(""); setLastVisitTo(""); },
      });
    }
    return items;
  }, [search, statusFilter, genderFilter, ageMin, ageMax, registeredFrom, registeredTo, lastVisitFrom, lastVisitTo]);

  const handleResetAllFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
    setGenderFilter("");
    setAgeMin("");
    setAgeMax("");
    setRegisteredFrom("");
    setRegisteredTo("");
    setLastVisitFrom("");
    setLastVisitTo("");
  }, []);

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleView = (patient: Patient) => {
    setViewingPatient(patient);
  };

  const handleDelete = (patient: Patient) => {
    setDeletingPatient(patient);
  };

  const handleReactivate = async (patient: Patient) => {
    setUpdateError(null);
    try {
      await apiClient.reactivatePatient(patient.id);
      setSuccessMessage(`Pasien "${patient.name}" berhasil diaktifkan kembali.`);
      loadPatients();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setUpdateError(apiErr?.message || "Gagal mengaktifkan kembali pasien.");
    }
  };

  const confirmDelete = async () => {
    if (!deletingPatient) return;
    setDeleteLoading(true);
    setUpdateError(null);
    try {
      await apiClient.deactivatePatient(deletingPatient.id);
      setDeletingPatient(null);
      loadPatients();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setUpdateError(apiErr?.message || "Gagal menonaktifkan pasien.");
      setDeletingPatient(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (data: PatientFormData) => {
    setUpdateError(null);

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

    if (editingPatient) {
      // Edit mode
      await apiClient.updatePatient(editingPatient.id, {
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
      setSuccessMessage(`Data pasien "${data.name}" berhasil diperbarui.`);
    } else {
      // Create mode
      await apiClient.createPatient({
        nik: data.nik,
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
      setSuccessMessage(`Pasien "${data.name}" berhasil didaftarkan.`);
    }
    loadPatients();
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      // Fetch all matching patient records based on active search and statusFilter
      const res = await apiClient.getPatients({
        page: 1,
        limit: Math.max(totalPatients, 1000) || 10000,
        search: search || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });

      const raw_response = res as unknown as Record<string, unknown>;
      let raw: unknown[] = [];

      if (raw_response && typeof raw_response === "object" && !Array.isArray(raw_response)) {
        const innerData = raw_response.data;
        if (Array.isArray(innerData)) {
          raw = innerData;
        } else if (innerData && typeof innerData === "object" && "data" in (innerData as object)) {
          const nested = innerData as Record<string, unknown>;
          raw = Array.isArray(nested.data) ? (nested.data as unknown[]) : [];
        }
      } else if (Array.isArray(raw_response)) {
        raw = raw_response;
      }

      const allPatients: Patient[] = (raw as Record<string, unknown>[]).map((p) => ({
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
        lastVisit: (p.lastVisitDate as string) || (p.lastVisit as string) || undefined,
      }));

      const dataToExport = allPatients.length > 0 ? allPatients : filteredPatients;
      const headers = ["MRN", "NIK", "Nama", "Gender", "Telepon", "Email", "Status"];
      const rows = dataToExport.map((p) => [
        p.mrn,
        p.nik,
        p.name,
        p.gender,
        p.phone,
        p.email || "",
        p.status,
      ]);
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pasien-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setUpdateError(apiErr?.message || "Gagal mengexport data CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
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
            onClick={() => {
              setEditingPatient(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand-dark hover:shadow-md hover:shadow-brand/20 active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            Daftarkan Pasien
          </button>
        </div>

        {/* Error Toast */}
        {updateError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{updateError}</span>
            <button
              onClick={() => setUpdateError(null)}
              className="ml-2 shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800/50"
              aria-label="Tutup pesan error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Success Toast */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="flex-1">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-2 shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-800/50"
              aria-label="Tutup pesan sukses"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <StatsCardsSkeleton count={3} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total Pasien Terdaftar", value: stats.total, color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
              { label: "Pasien Aktif", value: stats.active, color: "bg-brand/10 text-brand dark:bg-brand-light dark:text-brand" },
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
        )}

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
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {s === "ALL" ? "Semua" : s === "ACTIVE" ? "Aktif" : "Nonaktif"}
                </button>
              ))}
            </div>

            {/* Advanced filter toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border transition-all",
                showAdvancedFilters
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              )}
              title="Filter Lanjutan"
            >
              <Filter className="h-4 w-4" />
            </button>

            {/* Export CSV */}
            <button
              id="patient-export-btn"
              title={isExporting ? "Mengexport Data..." : "Export Data (CSV)"}
              disabled={isExporting}
              onClick={handleExportCsv}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter Lanjutan</h3>
              <button
                onClick={() => {
                  setGenderFilter("");
                  setAgeMin("");
                  setAgeMax("");
                  setRegisteredFrom("");
                  setRegisteredTo("");
                  setLastVisitFrom("");
                  setLastVisitTo("");
                }}
                className="text-xs text-slate-500 hover:text-brand dark:text-slate-400"
              >
                Reset Filter
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Gender */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Jenis Kelamin</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="">Semua</option>
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                </select>
              </div>

              {/* Age Range */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Rentang Usia</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    max="150"
                    value={ageMin}
                    onChange={(e) => setAgeMin(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                  <span className="text-xs text-slate-400">—</span>
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    max="150"
                    value={ageMax}
                    onChange={(e) => setAgeMax(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Registration Date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Tanggal Daftar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={registeredFrom}
                    onChange={(e) => setRegisteredFrom(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                  <span className="text-xs text-slate-400">—</span>
                  <input
                    type="date"
                    value={registeredTo}
                    onChange={(e) => setRegisteredTo(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Last Visit Date */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Kunjungan Terakhir</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={lastVisitFrom}
                    onChange={(e) => setLastVisitFrom(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                  <span className="text-xs text-slate-400">—</span>
                  <input
                    type="date"
                    value={lastVisitTo}
                    onChange={(e) => setLastVisitTo(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Bar */}
        <ActiveFilters
          items={activeFilterItems}
          onResetAll={handleResetAllFilters}
        />

        {/* Table */}
        <PatientTable
          patients={filteredPatients}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          onReactivate={handleReactivate}
          onCreateVisit={(patient) => router.push(`/dashboard/registration?patientId=${patient.id}`)}
          onBulkDeactivate={async (ids) => {
            setUpdateError(null);
            try {
              for (const id of ids) {
                await apiClient.deactivatePatient(id);
              }
              setSuccessMessage(`${ids.length} pasien berhasil dinonaktifkan.`);
              loadPatients();
            } catch (err: unknown) {
              const apiErr = err as { message?: string };
              setUpdateError(apiErr?.message || "Gagal menonaktifkan pasien.");
            }
          }}
          sortField={sortBy === "dateOfBirth" ? "dob" : sortBy === "deletedAt" ? "status" : sortBy as any}
          sortDir={sortOrder}
          onSortChange={handleSortChange}
          serverPage={page}
          serverTotalPages={Math.ceil(totalPatients / pageSize) || 1}
          serverTotal={totalPatients}
          pageSize={pageSize}
          onServerPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Patient Form Modal */}
      <PatientFormModal
        key={`${isModalOpen}-${editingPatient?.id ?? "new"}`}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPatient(null);
        }}
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
          <div ref={viewDetailTrapRef} role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detail Pasien</h2>
              <button
                id="patient-detail-close"
                onClick={() => setViewingPatient(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <span className="sr-only">Tutup</span>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <PatientAvatar name={viewingPatient.name} gender={viewingPatient.gender} size="lg" className="h-14 w-14 text-xl" />
                <div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingPatient.name}</p>
                  <p className="font-mono text-sm text-brand">{viewingPatient.mrn}</p>
                </div>
                <div className="ml-auto"><PatientStatusBadge status={viewingPatient.status} /></div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  { label: "NIK", value: viewingPatient.nik },
                  { label: "Jenis Kelamin", value: viewingPatient.gender === "MALE" ? "Laki-laki" : "Perempuan" },
                  { label: "Tanggal Lahir", value: new Date(viewingPatient.dob).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) },
                  { label: "Golongan Darah", value: viewingPatient.bloodType || "—" },
                  { label: "Telepon", value: viewingPatient.phone },
                  { label: "Kontak Darurat", value: viewingPatient.emergencyContact ? `${viewingPatient.emergencyContact} (${viewingPatient.emergencyPhone || "—"})` : "—" },
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

              {/* BP-09: Insurance Information */}
              {viewingPatient.insurances && viewingPatient.insurances.length > 0 && (
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <Shield className="h-4 w-4 text-brand" />
                    Asuransi Aktif
                  </h4>
                  <div className="space-y-2">
                    {viewingPatient.insurances.map((ins: any, idx: number) => (
                      <div key={ins.id || idx} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {ins.insurance?.name || ins.insuranceName || 'Asuransi'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {ins.memberNumber || '—'} • Prioritas {ins.priority}
                            {ins.type && <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium dark:bg-slate-700">{ins.type}</span>}
                          </p>
                        </div>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          ins.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500"
                        )}>
                          {ins.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BP-08: Audit History */}
              {user?.role && ["ADMIN", "SUPER_ADMIN", "OWNER"].includes(user.role) && (
                <PatientAuditHistory patientId={viewingPatient.id} />
              )}

              {/* Riwayat Laboratorium — role-gated */}
              {user?.role && LAB_HISTORY_ROLES.includes(user.role) && (
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <PatientLabHistory patientId={viewingPatient.id} />
                </div>
              )}

              {/* Warning: No active visit */}
              {hasNoActiveVisit === true && (
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Pasien belum memiliki kunjungan aktif
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Pasien ini tidak akan muncul di modul Order. Buat kunjungan baru untuk melanjutkan proses order.
                      </p>
                      <button
                        onClick={() => {
                          const patientId = viewingPatient.id;
                          setViewingPatient(null);
                          router.push(`/dashboard/registration?patientId=${patientId}`);
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      >
                        Buat Kunjungan Baru
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              {/* Left: navigate to full profile */}
              <button
                id="patient-detail-open-profile"
                onClick={() => {
                  const patientId = viewingPatient.id;
                  setViewingPatient(null);
                  router.push(`/dashboard/patients/${patientId}`);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-brand hover:bg-brand/5 hover:text-brand dark:border-slate-700 dark:text-slate-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Buka Profil Lengkap
              </button>

              {/* Right: action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setViewingPatient(null); handleEdit(viewingPatient); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Edit Data
                </button>
                {hasNoActiveVisit === true && (
                  <button
                    id="patient-create-visit-btn"
                    onClick={() => {
                      const patientId = viewingPatient.id;
                      setViewingPatient(null);
                      router.push(`/dashboard/registration?patientId=${patientId}`);
                    }}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Buat Kunjungan
                  </button>
                )}
                <button
                  onClick={() => setViewingPatient(null)}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Patient Confirmation Dialog */}
      {deletingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !deleteLoading && setDeletingPatient(null)}
          />
          <div ref={deleteTrapRef} role="dialog" aria-modal="true" className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Nonaktifkan Pasien?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Pasien <span className="font-semibold text-slate-700 dark:text-slate-300">{deletingPatient.name}</span> ({deletingPatient.mrn}) akan dinonaktifkan.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                Data pasien tetap tersimpan (tidak dihapus permanen)
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                Pasien tidak akan muncul di pencarian dan daftar aktif
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                Pasien dengan kunjungan atau order aktif tidak dapat dinonaktifkan
              </li>
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingPatient(null)}
                disabled={deleteLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? "Memproses..." : "Ya, Nonaktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}
