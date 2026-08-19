"use client";

import { useState } from "react";
import { MoreVertical, Eye, Pencil, XCircle } from "lucide-react";
import { useClickOutside } from "@/hooks";

// ─── Types ────────────────────────────────────────────────────────────────────

type VisitStatus = "REGISTERED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface Visit {
  id: string;
  visitNumber: string;
  status: VisitStatus;
  registrationDate: string;
  paymentMethod: string;
  bpjsNumber?: string | null;
  patient?: { id: string; name: string; mrn: string };
  doctor?: { id: string; name: string } | null;
  clinic?: { id: string; name: string } | null;
}

export interface VisitRowActionsProps {
  visit: Visit;
  userRole: string;
  onViewDetail: (visit: Visit) => void;
  onEdit: (visit: Visit) => void;
  onCancelSuccess: () => void;
}

// ─── Role Constants ───────────────────────────────────────────────────────────

export const EDIT_VISIT_ROLES = ["KASIR", "CS", "ADMIN", "SUPER_ADMIN"];
export const CANCEL_VISIT_ROLES = ["KASIR", "ADMIN", "SUPER_ADMIN"];

// ─── Component ────────────────────────────────────────────────────────────────

export function VisitRowActions({
  visit,
  userRole,
  onViewDetail,
  onEdit,
  onCancelSuccess,
}: VisitRowActionsProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setOpen(false), open);

  const canEdit =
    EDIT_VISIT_ROLES.includes(userRole) &&
    ["REGISTERED", "IN_PROGRESS"].includes(visit.status);

  const canCancel =
    CANCEL_VISIT_ROLES.includes(userRole) &&
    ["REGISTERED", "IN_PROGRESS"].includes(visit.status);

  return (
    <div ref={menuRef} className="relative">
      <button
        id={`visit-action-${visit.id}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aksi kunjungan"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Menu aksi kunjungan"
          className="absolute right-0 top-8 z-20 min-w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Always show "Lihat Detail" */}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onViewDetail(visit);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4 text-slate-400" /> Lihat Detail
          </button>

          {/* Conditionally show "Edit Kunjungan" */}
          {canEdit && (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                onEdit(visit);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4 text-slate-400" /> Edit Kunjungan
            </button>
          )}

          {/* Conditionally show "Batalkan Kunjungan" (destructive) */}
          {canCancel && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  onCancelSuccess();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <XCircle className="h-4 w-4" /> Batalkan Kunjungan
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
