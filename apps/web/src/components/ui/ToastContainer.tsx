"use client";

import { AlertCircle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast } from "@/hooks/use-toast";

const VARIANT_STYLES: Record<Toast["variant"], string> = {
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
};

const VARIANT_ICON: Record<Toast["variant"], React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
};

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  className?: string;
}

/**
 * Renders inline toast banners following the established AlertCircle error pattern.
 * Place this wherever you want toast messages to appear (typically near the top of a page/section).
 */
export function ToastContainer({ toasts, onDismiss, className }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {toasts.map((t) => {
        const Icon = VARIANT_ICON[t.variant];
        return (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200",
              VARIANT_STYLES[t.variant]
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Tutup"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
