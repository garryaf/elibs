import { cn } from "@/lib/utils";

/**
 * Base skeleton loading placeholder.
 * Use className to control dimensions (h-4 w-full, etc).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200 dark:bg-slate-700",
        className
      )}
    />
  );
}

/**
 * Table-shaped skeleton for data tables.
 */
export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-800"
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={`cell-${rowIdx}-${colIdx}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card-shaped skeleton for dashboard cards.
 */
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
