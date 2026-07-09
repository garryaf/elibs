import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  PENDING_PAYMENT: {
    label: "Belum Bayar",
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-700/50",
  },
  PAID: {
    label: "Lunas",
    dot: "bg-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-700/50",
  },
  SAMPLE_COLLECTED: {
    label: "Sampel Diterima",
    dot: "bg-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-200 dark:ring-indigo-700/50",
  },
  IN_ANALYSIS: {
    label: "Analisa",
    dot: "bg-violet-400 animate-pulse",
    bg: "bg-violet-50 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-200 dark:ring-violet-700/50",
  },
  VERIFIED: {
    label: "Terverifikasi",
    dot: "bg-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
    ring: "ring-teal-200 dark:ring-teal-700/50",
  },
  APPROVED: {
    label: "Selesai",
    dot: "bg-[#6B8E6B]/100",
    bg: "bg-[#6B8E6B]/10 dark:bg-[#6B8E6B]/15",
    text: "text-[#6B8E6B] dark:text-[#6B8E6B]",
    ring: "ring-[#6B8E6B]/30 dark:ring-[#6B8E6B]/30",
  },
  NOTIFIED: {
    label: "Terkirim",
    dot: "bg-green-600",
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    ring: "ring-green-200 dark:ring-green-700/50",
  },
  CANCELLED: {
    label: "Dibatalkan",
    dot: "bg-red-400",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    ring: "ring-red-200 dark:ring-red-700/50",
  },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        cfg.bg,
        cfg.text,
        cfg.ring
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
