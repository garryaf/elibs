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
          ? "bg-[#6B8E6B]/10 text-[#6B8E6B] ring-1 ring-[#6B8E6B]/30 dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B] dark:ring-[#6B8E6B]/30"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "ACTIVE" ? "bg-[#6B8E6B]/100 dark:bg-[#6B8E6B]" : "bg-slate-400"
        )}
      />
      {status === "ACTIVE" ? "Aktif" : "Nonaktif"}
    </span>
  );
}
