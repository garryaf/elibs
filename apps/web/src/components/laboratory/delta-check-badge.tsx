"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeltaCheckBadgeProps {
  percentageChange: number | null | undefined;
  className?: string;
}

/**
 * DeltaCheckBadge — shows percentage change with up/down arrow and color coding.
 * - Green for decrease within normal range
 * - Red for increase (abnormal direction)
 * - Amber for minor changes
 * - No badge when percentage is null/undefined/zero
 */
export function DeltaCheckBadge({ percentageChange, className }: DeltaCheckBadgeProps) {
  if (percentageChange === null || percentageChange === undefined) return null;

  const absChange = Math.abs(percentageChange);

  // Don't show badge for negligible changes
  if (absChange < 0.1) return null;

  const isIncrease = percentageChange > 0;
  const isDecrease = percentageChange < 0;

  // Color coding based on magnitude
  let colorClasses: string;
  if (absChange >= 50) {
    // Large change — critical red
    colorClasses = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  } else if (absChange >= 20) {
    // Moderate change — amber warning
    colorClasses = "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800";
  } else {
    // Small change — subtle gray
    colorClasses = "bg-muted text-muted-foreground border-border";
  }

  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;
  const sign = isIncrease ? "+" : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        colorClasses,
        className
      )}
      title={`Delta: ${sign}${percentageChange.toFixed(1)}%`}
    >
      <Icon className="h-3 w-3" />
      {sign}{absChange.toFixed(1)}%
    </span>
  );
}
