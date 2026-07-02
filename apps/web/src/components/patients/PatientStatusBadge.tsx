import { cn } from "@/lib/utils";
import type { PatientStatus } from "@/types/patient";

interface PatientStatusBadgeProps {
  status: PatientStatus;
}

export function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "ACTIVE"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/50"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "ACTIVE" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-slate-400"
        )}
      />
      {status === "ACTIVE" ? "Aktif" : "Nonaktif"}
    </span>
  );
}
