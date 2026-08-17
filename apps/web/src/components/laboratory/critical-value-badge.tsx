"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Bell, CheckCircle2, ArrowUpCircle } from "lucide-react";

export type CriticalValueStatus =
  | "PENDING"
  | "NOTIFIED"
  | "ACKNOWLEDGED"
  | "ESCALATED";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
  pulseClassName?: string;
}

const STATUS_MAP: Record<CriticalValueStatus, StatusConfig> = {
  PENDING: {
    label: "Pending",
    icon: AlertTriangle,
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    pulseClassName: "animate-pulse",
  },
  NOTIFIED: {
    label: "Terkirim",
    icon: Bell,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  ACKNOWLEDGED: {
    label: "Dikonfirmasi",
    icon: CheckCircle2,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800",
  },
  ESCALATED: {
    label: "Eskalasi",
    icon: ArrowUpCircle,
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    pulseClassName: "animate-pulse",
  },
};

interface CriticalValueBadgeProps {
  status: CriticalValueStatus;
  className?: string;
  showIcon?: boolean;
}

export function CriticalValueBadge({
  status,
  className,
  showIcon = true,
}: CriticalValueBadgeProps) {
  const config = STATUS_MAP[status];

  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
        config.className,
        config.pulseClassName,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
