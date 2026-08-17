"use client";

import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  TestTube,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  type: "handoff" | "collection" | "condition_change";
  timestamp: string;
  description: string;
  fromUser?: string;
  toUser?: string;
  condition?: string;
  rejectionReason?: string | null;
  notes?: string | null;
}

interface SpecimenTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEventIcon(type: TimelineEvent["type"], condition?: string) {
  switch (type) {
    case "handoff":
      return ArrowRightLeft;
    case "collection":
      return condition === "ACCEPTABLE" ? CheckCircle2 : XCircle;
    case "condition_change":
      return TestTube;
    default:
      return Clock;
  }
}

function getEventColor(type: TimelineEvent["type"], condition?: string) {
  if (type === "collection" && condition !== "ACCEPTABLE") {
    return "text-red-500 bg-red-50 dark:bg-red-900/20";
  }
  switch (type) {
    case "handoff":
      return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
    case "collection":
      return "text-green-500 bg-green-50 dark:bg-green-900/20";
    case "condition_change":
      return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
    default:
      return "text-muted-foreground bg-muted";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SpecimenTimeline({ events, className }: SpecimenTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground italic py-4", className)}>
        Belum ada riwayat custody chain.
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      <ol className="space-y-4" aria-label="Specimen custody timeline">
        {events.map((event, idx) => {
          const Icon = getEventIcon(event.type, event.condition);
          const colorClass = getEventColor(event.type, event.condition);
          const isLast = idx === events.length - 1;

          return (
            <li key={event.id} className="relative flex gap-4">
              {/* Icon node */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div
                className={cn(
                  "flex-1 rounded-xl border border-border bg-card p-3",
                  !isLast && "mb-0"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {event.description}
                  </p>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(event.timestamp)} {formatTime(event.timestamp)}
                  </time>
                </div>

                {/* Details */}
                {event.type === "handoff" && event.fromUser && event.toUser && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">{event.fromUser}</span>
                    {" → "}
                    <span className="font-medium">{event.toUser}</span>
                  </p>
                )}

                {event.rejectionReason && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Alasan: {event.rejectionReason}
                  </p>
                )}

                {event.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Catatan: {event.notes}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
