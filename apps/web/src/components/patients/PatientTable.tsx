"use client";

import { useState, useMemo, useCallback } from "react";
import { MoreVertical, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, UserX, SearchX, ChevronsLeft, ChevronsRight, RotateCcw, EyeOff, Eye as EyeIcon, CalendarPlus, AlertTriangle } from "lucide-react";
import type { Patient } from "@/types/patient";
import { PatientStatusBadge } from "./PatientStatusBadge";
import { PatientAvatar } from "./PatientAvatar";
import { cn } from "@/lib/utils";
import { ColumnToggle, useColumnVisibility } from "@/components/ui/ColumnToggle";
import type { ColumnDef } from "@/components/ui/ColumnToggle";
import { useClickOutside } from "@/hooks";

interface PatientTableProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onView: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  onReactivate?: (patient: Patient) => void;
  onCreateVisit?: (patient: Patient) => void;
  onBulkDeactivate?: (ids: string[]) => void;
  onBulkExport?: (ids: string[]) => void;
  // Server-side sorting
  sortField?: PatientSortField;
  sortDir?: SortDir;
  onSortChange?: (field: PatientSortField, dir: SortDir) => void;
  // Server-side pagination (optional)
  serverPage?: number;
  serverTotalPages?: number;
  serverTotal?: number;
  pageSize?: number;
  onServerPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

export type PatientSortField = "name" | "mrn" | "dob" | "lastVisit" | "status";
export type SortDir = "asc" | "desc";

// ─── Column definitions ───────────────────────────────────────────────────────

const PATIENT_COLUMNS: ColumnDef[] = [
  { key: "name",        label: "Pasien",              required: true },
  { key: "nik_mrn",     label: "NIK / MRN" },
  { key: "age_gender",  label: "Usia / Gender" },
  { key: "last_visit",  label: "Kunjungan Terakhir" },
  { key: "status",      label: "Status" },
  { key: "actions",     label: "Aksi",                required: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Mask NIK for privacy: show first 4 and last 4, mask middle with bullet */
function maskNik(nik: string): string {
  if (!nik || nik.length < 8) return nik;
  const prefix = nik.slice(0, 4);
  const suffix = nik.slice(-4);
  const masked = '••••••••';
  return `${prefix}${masked}${suffix}`;
}

/** Check which important fields are missing for a patient */
function getMissingFields(patient: Patient): string[] {
  const missing: string[] = [];
  if (!patient.email) missing.push("Email");
  if (!patient.bloodType) missing.push("Gol. Darah");
  if (!patient.address || patient.address.length < 5) missing.push("Alamat");
  if (!patient.emergencyContact) missing.push("Kontak Darurat");
  return missing;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ActionMenu({
  patient,
  onEdit,
  onView,
  onDelete,
  onReactivate,
  onCreateVisit,
}: {
  patient: Patient;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onReactivate?: () => void;
  onCreateVisit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  const isInactive = patient.status === "INACTIVE";

  return (
    <div ref={menuRef} className="relative">
      <button
        id={`patient-action-${patient.id}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aksi pasien"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Menu aksi pasien"
          className="absolute right-0 top-full mt-2 z-50 min-w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onView();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 text-slate-400" /> Lihat Detail
          </button>
          {!isInactive && (
            <>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  onEdit();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4 text-slate-400" /> Edit Data
              </button>
              {onCreateVisit && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    onCreateVisit();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-brand hover:bg-brand/5 dark:text-brand dark:hover:bg-brand/10"
                >
                  <CalendarPlus className="h-4 w-4" /> Buat Kunjungan
                </button>
              )}
            </>
          )}
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          {isInactive && onReactivate ? (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                onReactivate();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <RotateCcw className="h-4 w-4" /> Aktifkan Kembali
            </button>
          ) : (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" /> Nonaktifkan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SortIcon({ field, activeField, dir }: { field: string; activeField: string; dir: SortDir }) {
  if (field !== activeField) {
    return <ChevronDown className="h-3 w-3 opacity-30" />;
  }
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-brand" />
    : <ChevronDown className="h-3 w-3 text-brand" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatientTable({ patients, onEdit, onView, onDelete, onReactivate, onCreateVisit, onBulkDeactivate, onBulkExport, sortField: externalSortField, sortDir: externalSortDir, onSortChange, serverPage, serverTotalPages, serverTotal, pageSize, onServerPageChange, onPageSizeChange }: PatientTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [localSortField, setLocalSortField] = useState<PatientSortField>("name");
  const [localSortDir, setLocalSortDir] = useState<SortDir>("asc");
  const [jumpInput, setJumpInput] = useState("");  // jump-to-page input value
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nikPrivacy, setNikPrivacy] = useState(true); // NIK masked by default

  // Use external (server-side) sort state if provided, otherwise local
  const sortField = externalSortField ?? localSortField;
  const sortDir = externalSortDir ?? localSortDir;

  // ─── Column visibility ──────────────────────────────────────────────────────
  const [colVisibility, setColVisibility] = useColumnVisibility("patient-table-columns", PATIENT_COLUMNS);

  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;

  const handleSort = (field: PatientSortField) => {
    const newDir = field === sortField ? (sortDir === "asc" ? "desc" : "asc") : "asc";

    if (onSortChange) {
      // Server-side sorting — notify parent
      onSortChange(field, newDir);
    } else {
      // Fallback: local sorting (only useful when no server pagination)
      setLocalSortField(field);
      setLocalSortDir(newDir);
    }
    setCurrentPage(1);
  };

  // ─── Bulk selection ─────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = patients.map((p) => p.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [selectedIds, patients]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Only sort locally if server-side sort is NOT being used
  const displayPatients = useMemo(() => {
    if (onSortChange) {
      // Server already sorted — use as-is
      return patients;
    }
    // Fallback: client-side sort (no server pagination)
    const sorted = [...patients];
    sorted.sort((a, b) => {
      let aVal: string;
      let bVal: string;
      switch (sortField) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "mrn":
          aVal = a.mrn;
          bVal = b.mrn;
          break;
        case "dob":
          aVal = a.dob;
          bVal = b.dob;
          break;
        case "lastVisit":
          aVal = a.lastVisit || "";
          bVal = b.lastVisit || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [patients, sortField, sortDir, onSortChange]);

  const totalPages = Math.max(1, Math.ceil(displayPatients.length / effectivePageSize));
  // When server handles pagination, don't slice locally — data is already the right page
  const paginated = onServerPageChange ? displayPatients : displayPatients.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  const activePage = serverPage ?? currentPage;
  const activeTotalPages = serverTotalPages ?? totalPages;

  // Record count for display label
  const totalRecords = serverTotal ?? displayPatients.length;
  const firstRecord = totalRecords === 0 ? 0 : (activePage - 1) * effectivePageSize + 1;
  const lastRecord = Math.min(activePage * effectivePageSize, totalRecords);

  // Compute colSpan dynamically based on visible columns (+1 for checkbox)
  const visibleColCount = PATIENT_COLUMNS.filter((c) => colVisibility[c.key] !== false).length + 1;

  const handleJumpSubmit = () => {
    const n = parseInt(jumpInput, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(1, Math.min(activeTotalPages, n));
    if (onServerPageChange && serverPage !== undefined) {
      onServerPageChange(clamped);
    } else {
      setCurrentPage(clamped);
    }
    setJumpInput("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-slate-200 bg-brand/5 px-5 py-3 dark:border-slate-700 dark:bg-brand/10">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {selectedIds.size} pasien dipilih
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {onBulkExport && (
              <button
                onClick={() => onBulkExport(Array.from(selectedIds))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Export Terpilih
              </button>
            )}
            {onBulkDeactivate && (
              <button
                onClick={() => onBulkDeactivate(Array.from(selectedIds))}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Nonaktifkan Terpilih
              </button>
            )}
            <button
              onClick={clearSelection}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* NIK Privacy Toggle */}
      <div className="flex items-center justify-end px-5 py-2 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setNikPrivacy(!nikPrivacy)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
          title={nikPrivacy ? "Tampilkan NIK lengkap" : "Sembunyikan NIK"}
        >
          {nikPrivacy ? <EyeOff className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
          {nikPrivacy ? "NIK Tersembunyi" : "NIK Ditampilkan"}
        </button>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
              {/* Checkbox — select all */}
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && paginated.every((p) => selectedIds.has(p.id))}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30 dark:border-slate-600 dark:bg-slate-800"
                  aria-label="Pilih semua pasien di halaman ini"
                />
              </th>
              {/* PASIEN — always visible (required) */}
              <th
                className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                onClick={() => handleSort("name")}
              >
                <span className="inline-flex items-center gap-1">
                  PASIEN
                  <SortIcon field="name" activeField={sortField} dir={sortDir} />
                </span>
              </th>

              {/* NIK / MRN */}
              {colVisibility["nik_mrn"] !== false && (
                <th
                  className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                  onClick={() => handleSort("mrn")}
                >
                  <span className="inline-flex items-center gap-1">
                    NIK / MRN
                    <SortIcon field="mrn" activeField={sortField} dir={sortDir} />
                  </span>
                </th>
              )}

              {/* USIA / GENDER */}
              {colVisibility["age_gender"] !== false && (
                <th
                  className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 md:table-cell cursor-pointer select-none hover:text-brand"
                  onClick={() => handleSort("dob")}
                >
                  <span className="inline-flex items-center gap-1">
                    USIA / GENDER
                    <SortIcon field="dob" activeField={sortField} dir={sortDir} />
                  </span>
                </th>
              )}

              {/* KUNJUNGAN TERAKHIR */}
              {colVisibility["last_visit"] !== false && (
                <th
                  className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 lg:table-cell cursor-pointer select-none hover:text-brand"
                  onClick={() => handleSort("lastVisit")}
                >
                  <span className="inline-flex items-center gap-1">
                    KUNJUNGAN TERAKHIR
                    <SortIcon field="lastVisit" activeField={sortField} dir={sortDir} />
                  </span>
                </th>
              )}

              {/* STATUS */}
              {colVisibility["status"] !== false && (
                <th
                  className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                  onClick={() => handleSort("status")}
                >
                  <span className="inline-flex items-center gap-1">
                    STATUS
                    <SortIcon field="status" activeField={sortField} dir={sortDir} />
                  </span>
                </th>
              )}

              {/* AKSI — always visible (required) */}
              <th className="sticky right-0 bg-slate-50/70 dark:bg-slate-900/50 px-5 py-3.5 text-right text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={visibleColCount} className="py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                    <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20">
                      <UserX className="h-8 w-8 text-brand" />
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <SearchX className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Pasien Tidak Ditemukan
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Tidak ada data pasien yang sesuai dengan kata kunci pencarian atau filter status yang dipilih.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((patient, idx) => (
                <tr
                  key={patient.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30",
                    idx === paginated.length - 1 && "border-b-0",
                    selectedIds.has(patient.id) && "bg-brand/5 dark:bg-brand/10",
                    patient.status === "INACTIVE" && "opacity-60 bg-slate-100/50 dark:bg-slate-900/70"
                  )}
                >
                  {/* Checkbox */}
                  <td className="w-10 px-3 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(patient.id)}
                      onChange={() => toggleSelect(patient.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30 dark:border-slate-600 dark:bg-slate-800"
                      aria-label={`Pilih ${patient.name}`}
                    />
                  </td>

                  {/* Patient Name & Phone — always visible */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <PatientAvatar name={patient.name} gender={patient.gender} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">{patient.name}</span>
                          {(() => {
                            const missing = getMissingFields(patient);
                            if (missing.length === 0) return null;
                            return (
                              <span
                                title={`Data belum lengkap: ${missing.join(", ")}`}
                                className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {missing.length}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{patient.phone}</div>
                      </div>
                    </div>
                  </td>

                  {/* NIK / MRN — with privacy masking */}
                  {colVisibility["nik_mrn"] !== false && (
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {nikPrivacy ? maskNik(patient.nik) : patient.nik}
                      </div>
                      <div className="font-mono text-xs font-semibold text-brand">{patient.mrn}</div>
                    </td>
                  )}

                  {/* Age / Gender */}
                  {colVisibility["age_gender"] !== false && (
                    <td className="hidden px-5 py-4 md:table-cell">
                      <div className="text-slate-700 dark:text-slate-300">{calculateAge(patient.dob)} tahun</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {patient.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                      </div>
                    </td>
                  )}

                  {/* Last Visit */}
                  {colVisibility["last_visit"] !== false && (
                    <td className="hidden px-5 py-4 lg:table-cell">
                      <div className="text-slate-700 dark:text-slate-300">
                        {patient.lastVisit ? formatDate(patient.lastVisit) : "—"}
                      </div>
                    </td>
                  )}

                  {/* Status */}
                  {colVisibility["status"] !== false && (
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <PatientStatusBadge status={patient.status} />
                        {patient.status === "ACTIVE" && !patient.lastVisit && !patient.activeVisitStatus && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Belum ada kunjungan
                          </span>
                        )}
                        {patient.activeVisitStatus && (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium",
                            patient.activeVisitStatus === "IN_PROGRESS" ? "text-blue-600 dark:text-blue-400" : "text-cyan-600 dark:text-cyan-400"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              patient.activeVisitStatus === "IN_PROGRESS" ? "bg-blue-400 animate-pulse" : "bg-cyan-400"
                            )} />
                            {patient.activeVisitStatus === "IN_PROGRESS" ? "Kunjungan Aktif" : "Terdaftar"}
                          </span>
                        )}
                        {patient.activeOrderStatus && (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium",
                            patient.activeOrderStatus === "IN_ANALYSIS" ? "text-purple-600 dark:text-purple-400" :
                            patient.activeOrderStatus === "SAMPLE_COLLECTED" ? "text-teal-600 dark:text-teal-400" :
                            patient.activeOrderStatus === "VERIFIED" ? "text-indigo-600 dark:text-indigo-400" :
                            "text-slate-600 dark:text-slate-400"
                          )}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {patient.activeOrderStatus === "PENDING_PAYMENT" ? "Tunggu Bayar" :
                             patient.activeOrderStatus === "PAID" ? "Lunas" :
                             patient.activeOrderStatus === "SAMPLE_COLLECTED" ? "Sampel ✓" :
                             patient.activeOrderStatus === "IN_ANALYSIS" ? "Analisis" :
                             patient.activeOrderStatus === "VERIFIED" ? "Terverifikasi" :
                             patient.activeOrderStatus}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Actions — always visible */}
                  <td className="sticky right-0 bg-white dark:bg-slate-950 px-5 py-4 text-right">
                    <ActionMenu
                      patient={patient}
                      onView={() => onView(patient)}
                      onEdit={() => onEdit(patient)}
                      onDelete={() => onDelete(patient)}
                      onReactivate={onReactivate ? () => onReactivate(patient) : undefined}
                      onCreateVisit={onCreateVisit ? () => onCreateVisit(patient) : undefined}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination bar */}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: record count */}
        <p className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
          {totalRecords === 0 ? (
            "Tidak ada data"
          ) : (
            <>
              Menampilkan{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{firstRecord}–{lastRecord}</span>
              {" "}dari{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{totalRecords.toLocaleString("id-ID")}</span>
              {" "}pasien
            </>
          )}
        </p>

        {/* Center: page navigation */}
        <div className="flex items-center gap-2">
          {/* First page */}
          <button
            id="patient-table-first"
            onClick={() => {
              if (onServerPageChange) onServerPageChange(1);
              else setCurrentPage(1);
            }}
            disabled={activePage === 1}
            title="Halaman pertama"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Prev */}
          <button
            id="patient-table-prev"
            onClick={() => {
              const target = Math.max(1, activePage - 1);
              if (onServerPageChange && serverPage !== undefined) onServerPageChange(target);
              else setCurrentPage((p) => Math.max(1, p - 1));
            }}
            disabled={activePage === 1}
            title="Halaman sebelumnya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Jump to page input */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-slate-500 dark:text-slate-400">Hal.</span>
            <input
              id="patient-table-jump"
              type="number"
              min={1}
              max={activeTotalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJumpSubmit(); }}
              onBlur={handleJumpSubmit}
              placeholder={String(activePage)}
              className="h-8 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">/ {activeTotalPages}</span>
          </div>

          {/* Next */}
          <button
            id="patient-table-next"
            onClick={() => {
              const target = Math.min(activeTotalPages, activePage + 1);
              if (onServerPageChange && serverPage !== undefined && serverTotalPages) onServerPageChange(target);
              else setCurrentPage((p) => Math.min(totalPages, p + 1));
            }}
            disabled={activePage === activeTotalPages}
            title="Halaman berikutnya"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last page */}
          <button
            id="patient-table-last"
            onClick={() => {
              if (onServerPageChange) onServerPageChange(activeTotalPages);
              else setCurrentPage(activeTotalPages);
            }}
            disabled={activePage === activeTotalPages}
            title="Halaman terakhir"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: page size + column toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Column toggle */}
          <ColumnToggle
            columns={PATIENT_COLUMNS}
            visibility={colVisibility}
            onChange={setColVisibility}
          />

          {/* Page size selector */}
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Tampilkan</span>
              <select
                id="patient-table-page-size"
                value={effectivePageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  // Reset to page 1 when size changes
                  if (onServerPageChange) onServerPageChange(1);
                  else setCurrentPage(1);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s} data</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
