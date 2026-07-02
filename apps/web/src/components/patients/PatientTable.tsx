"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import type { Patient } from "@/types/patient";
import { PatientStatusBadge } from "./PatientStatusBadge";
import { cn } from "@/lib/utils";

interface PatientTableProps {
  patients: Patient[];
  onEdit: (patient: Patient) => void;
  onView: (patient: Patient) => void;
  onDelete: (patient: Patient) => void;
}

const PAGE_SIZE = 6;

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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 min-w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => { onView(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 text-slate-400" /> Lihat Detail
          </button>
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4 text-slate-400" /> Edit Data
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" /> Nonaktifkan
          </button>
        </div>
      )}
    </div>
  );
}

export function PatientTable({ patients, onEdit, onView, onDelete }: PatientTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  const paginated = patients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
              <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                PASIEN
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                NIK / MRN
              </th>
              <th className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 md:table-cell">
                USIA / GENDER
              </th>
              <th className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 lg:table-cell">
                KUNJUNGAN TERAKHIR
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                STATUS
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                  Tidak ada data pasien yang ditemukan.
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
                    <div className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{patient.mrn}</div>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, patients.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-700 dark:text-slate-300">{patients.length}</span> pasien
          </p>
          <div className="flex items-center gap-2">
            <button
              id="patient-table-prev"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                id={`patient-table-page-${i + 1}`}
                onClick={() => setCurrentPage(i + 1)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all",
                  currentPage === i + 1
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                    : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              id="patient-table-next"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
