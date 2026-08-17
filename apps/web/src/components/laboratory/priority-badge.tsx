"use client";

import { cn } from "@/lib/utils";

export type OrderPriority = "ROUTINE" | "URGENT" | "CITO";

interface PriorityBadgeProps {
  priority: OrderPriority | string | null | undefined;
  className?: string;
}

const PRIORITY_CONFIG: Record<OrderPriority, { label: string; className: string }> = {
  ROUTINE: {
    label: "Routine",
    className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
  URGENT: {
    label: "Urgent",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  },
  CITO: {
    label: "CITO",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
};

/**
 * PriorityBadge — color-coded indicator for order priority.
 * ROUTINE = gray, URGENT = yellow, CITO = red
 */
export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  if (!priority) return null;

  const config = PRIORITY_CONFIG[priority as OrderPriority];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
