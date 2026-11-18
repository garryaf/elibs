import { cn } from "@/lib/utils";

/**
 * Base skeleton loading placeholder.
 * Use className to control dimensions (h-4 w-full, etc).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
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
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Header */}
      <div className="flex gap-4 border-b border-border bg-muted/50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Individual Stats Card Skeleton.
 */
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="stats-card-skeleton"
      className={cn(
        "rounded-2xl border border-border bg-card px-5 py-4 shadow-sm",
        className
      )}
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-8 w-20 rounded-lg" />
    </div>
  );
}

/**
 * Stats cards grid skeleton for pages with summary metric cards.
 */
export function StatsCardsSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const gridClass =
    className ||
    (count === 4
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      : "grid gap-4 sm:grid-cols-3");

  return (
    <div className={gridClass} data-testid="stats-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

