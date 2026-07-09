import { cn } from "@/lib/utils";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "SAMPLE_COLLECTED"
  | "IN_ANALYSIS"
  | "VERIFIED"
  | "APPROVED"
  | "NOTIFIED"
  | "CANCELLED";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_MAP: Record<OrderStatus, StatusConfig> = {
  PENDING_PAYMENT: {
    label: "Menunggu Bayar",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  PAID: {
    label: "Terbayar",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  SAMPLE_COLLECTED: {
    label: "Sampel Diterima",
    className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  IN_ANALYSIS: {
    label: "Proses Analisa",
    className:
      "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/20 dark:text-[#8FBF8F]",
  },
  VERIFIED: {
    label: "Terverifikasi",
    className:
      "bg-[#8B8B6B]/10 text-[#8B8B6B] dark:bg-[#8B8B6B]/20 dark:text-[#B5B590]",
  },
  APPROVED: {
    label: "Disetujui",
    className: "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B]",
  },
  NOTIFIED: {
    label: "Terkirim",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

interface LabStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function LabStatusBadge({ status, className }: LabStatusBadgeProps) {
  const config = STATUS_MAP[status];

  if (!config) {
    return null;
  }

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
