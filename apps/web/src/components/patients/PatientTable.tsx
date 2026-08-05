"use client";

import { useState, useMemo } from "react";
import { MoreVertical, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, UserX, SearchX } from "lucide-react";
import type { Patient } from "@/types/patient";
import { PatientStatusBadge } from "./PatientStatusBadge";
import { cn } from "@/lib/utils";

interface PatientTableProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onView: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
  // Server-side pagination (optional)
  serverPage?: number;
  serverTotalPages?: number;
  onServerPageChange?: (page: number) => void;
}

const PAGE_SIZE = 20;

type PatientSortField = "name" | "mrn" | "dob" | "lastVisit" | "status";
type SortDir = "asc" | "desc";

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
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
}: {
  patient: Patient;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id={`patient-action-${patient.id}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            onMouseDown={() => { onView(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 text-slate-400" /> Lihat Detail
          </button>
          <button
            onMouseDown={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4 text-slate-400" /> Edit Data
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            onMouseDown={() => { onDelete(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" /> Nonaktifkan
          </button>
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

export function PatientTable({ patients, onEdit, onView, onDelete, serverPage, serverTotalPages, onServerPageChange }: PatientTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<PatientSortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: PatientSortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const sortedPatients = useMemo(() => {
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
  }, [patients, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPatients.length / PAGE_SIZE));
  const paginated = sortedPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Table */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
              <th
                className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                onClick={() => handleSort("name")}
              >
                <span className="inline-flex items-center gap-1">
                  PASIEN
                  <SortIcon field="name" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                onClick={() => handleSort("mrn")}
              >
                <span className="inline-flex items-center gap-1">
                  NIK / MRN
                  <SortIcon field="mrn" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 md:table-cell cursor-pointer select-none hover:text-brand"
                onClick={() => handleSort("dob")}
              >
                <span className="inline-flex items-center gap-1">
                  USIA / GENDER
                  <SortIcon field="dob" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 lg:table-cell cursor-pointer select-none hover:text-brand"
                onClick={() => handleSort("lastVisit")}
              >
                <span className="inline-flex items-center gap-1">
                  KUNJUNGAN TERAKHIR
                  <SortIcon field="lastVisit" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th
                className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-brand"
                onClick={() => handleSort("status")}
              >
                <span className="inline-flex items-center gap-1">
                  STATUS
                  <SortIcon field="status" activeField={sortField} dir={sortDir} />
                </span>
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
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
                    "border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50",
                    idx === paginated.length - 1 && "border-b-0"
                  )}
                >
                  {/* Patient Name & Phone */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                          patient.gender === "MALE"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        )}
                      >
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{patient.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{patient.phone}</div>
                      </div>
                    </div>
                  </td>

                  {/* NIK / MRN */}
                  <td className="px-5 py-4">
                    <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{patient.nik}</div>
                    <div className="font-mono text-xs font-semibold text-brand">{patient.mrn}</div>
                  </td>

                  {/* Age / Gender */}
                  <td className="hidden px-5 py-4 md:table-cell">
                    <div className="text-slate-700 dark:text-slate-300">{calculateAge(patient.dob)} tahun</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {patient.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                    </div>
                  </td>

                  {/* Last Visit */}
                  <td className="hidden px-5 py-4 lg:table-cell">
                    <div className="text-slate-700 dark:text-slate-300">
                      {patient.lastVisit ? formatDate(patient.lastVisit) : "—"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <PatientStatusBadge status={patient.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <ActionMenu
                      patient={patient}
                      onView={() => onView(patient)}
                      onEdit={() => onEdit(patient)}
                      onDelete={() => onDelete(patient)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — server-side if available, otherwise client-side */}
      {(serverTotalPages ? serverTotalPages > 1 : totalPages > 1) && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {serverPage ?? currentPage} dari {serverTotalPages ?? totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              id="patient-table-prev"
              onClick={() => {
                if (onServerPageChange && serverPage) {
                  onServerPageChange(Math.max(1, serverPage - 1));
                } else {
                  setCurrentPage((p) => Math.max(1, p - 1));
                }
              }}
              disabled={(serverPage ?? currentPage) === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              {serverPage ?? currentPage} / {serverTotalPages ?? totalPages}
            </span>
            <button
              id="patient-table-next"
              onClick={() => {
                if (onServerPageChange && serverPage && serverTotalPages) {
                  onServerPageChange(Math.min(serverTotalPages, serverPage + 1));
                } else {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }
              }}
              disabled={(serverPage ?? currentPage) === (serverTotalPages ?? totalPages)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
