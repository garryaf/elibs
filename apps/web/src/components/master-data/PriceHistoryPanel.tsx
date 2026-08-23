"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, TrendingUp, TrendingDown, Minus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

interface PriceHistoryEntry {
  id: string;
  entityType: string;
  previousPrice: number;
  newPrice: number;
  previousDiscount: number | null;
  newDiscount: number | null;
  changeType: string;
  changeReason: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface Props {
  testId: string;
  className?: string;
}

/**
 * Price History Panel — shows audit trail of price changes for a specific test.
 * Used inside TestDetailPanel in master data.
 */
export function PriceHistoryPanel({ testId, className }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["pricing", "history", testId],
    queryFn: () => apiClient.get(`/api/v1/master/pricing/history/${testId}`),
    enabled: !!testId,
  });

  const entries: PriceHistoryEntry[] = (() => {
    const raw = data as unknown as Record<string, unknown>;
    const inner = (raw?.data ?? raw) as unknown;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === "object" && "data" in (inner as Record<string, unknown>)) {
      return (inner as Record<string, unknown>).data as PriceHistoryEntry[];
    }
    return [];
  })();

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 animate-pulse" /> Memuat riwayat harga...
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <Clock className="h-3.5 w-3.5" /> Riwayat Perubahan Harga
        </div>
        <p className="text-xs text-muted-foreground italic">Belum ada riwayat perubahan harga untuk pemeriksaan ini.</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        <Clock className="h-3.5 w-3.5" /> Riwayat Perubahan Harga ({entries.length})
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {entries.map((entry) => {
          const diff = entry.newPrice - entry.previousPrice;
          const isIncrease = diff > 0;
          const isDecrease = diff < 0;

          return (
            <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-2.5">
              {/* Icon */}
              <div className={cn(
                "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0",
                isIncrease ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                isDecrease ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              )}>
                {isIncrease ? <TrendingUp className="h-3 w-3" /> :
                 isDecrease ? <TrendingDown className="h-3 w-3" /> :
                 <Minus className="h-3 w-3" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">
                    Rp {entry.previousPrice.toLocaleString("id-ID")} → Rp {entry.newPrice.toLocaleString("id-ID")}
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    isIncrease ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                    isDecrease ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                    {diff >= 0 ? "+" : ""}{diff.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] rounded bg-brand/10 px-1.5 py-0.5 font-medium text-brand">
                    {entry.changeType === "BULK_ADJUST" ? "Massal" : entry.changeType === "APPROVAL" ? "Approval" : "Manual"}
                  </span>
                </div>

                {entry.changeReason && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{entry.changeReason}</p>
                )}

                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                  {entry.changedByName && (
                    <span className="flex items-center gap-1">
                      <User className="h-2.5 w-2.5" /> {entry.changedByName}
                    </span>
                  )}
                  <span>{new Date(entry.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
