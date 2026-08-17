import { cn } from "@/lib/utils";
import type { SampleCondition } from "@/services/specimens";

interface ConditionConfig {
  label: string;
  className: string;
}

const CONDITION_MAP: Record<SampleCondition, ConditionConfig> = {
  ACCEPTABLE: {
    label: "Diterima",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  HEMOLYZED: {
    label: "Hemolisis",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  LIPEMIC: {
    label: "Lipemik",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  CLOTTED: {
    label: "Beku",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
  INSUFFICIENT: {
    label: "Tidak Cukup",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  OTHER: {
    label: "Lainnya",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  },
};

interface SpecimenConditionBadgeProps {
  condition: SampleCondition;
  className?: string;
}

export function SpecimenConditionBadge({
  condition,
  className,
}: SpecimenConditionBadgeProps) {
  const config = CONDITION_MAP[condition] ?? CONDITION_MAP.OTHER;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
