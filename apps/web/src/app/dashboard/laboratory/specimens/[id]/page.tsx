"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Barcode,
  TestTube,
  AlertCircle,
  Printer,
  RefreshCw,
  Loader2,
  ClipboardList,
  Thermometer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { SpecimenConditionBadge } from "@/components/laboratory/specimen-condition-badge";
import {
  SpecimenTimeline,
  type TimelineEvent,
} from "@/components/laboratory/specimen-timeline";
import {
  useSpecimenDetail,
  useRegenerateBarcode,
  useBatchLabels,
  type Specimen,
  type CollectionAttempt,
  type CustodyHandoff,
} from "@/services/specimens";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTimelineEvents(
  collectionAttempts: CollectionAttempt[],
  handoffs: CustodyHandoff[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Map collection attempts to timeline events
  for (const attempt of collectionAttempts) {
    events.push({
      id: attempt.id,
      type: "collection",
      timestamp: attempt.attemptedAt,
      description:
        attempt.sampleCondition === "ACCEPTABLE"
          ? "Sampel berhasil dikumpulkan"
          : `Sampel ditolak — ${attempt.sampleCondition}`,
      condition: attempt.sampleCondition,
      rejectionReason: attempt.rejectionReason,
    });
  }

  // Map handoffs to timeline events
  for (const handoff of handoffs) {
    events.push({
      id: handoff.id,
      type: "handoff",
      timestamp: handoff.handoffAt,
      description: "Serah terima spesimen",
      fromUser: handoff.fromUserId,
      toUser: handoff.toUserId,
      notes: handoff.notes,
    });
  }

  // Sort by timestamp descending (most recent first)
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return events;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpecimenDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: rawData, isLoading, error, refetch } = useSpecimenDetail(id);
  const regenerateBarcode = useRegenerateBarcode();
  const batchLabels = useBatchLabels();

  // ─── Parse specimen data ─────────────────────────────────────────────────
  const specimen = useMemo((): Specimen | null => {
    if (!rawData) return null;

    const envelope = rawData as unknown;
    // The history endpoint returns collection attempts array,
    // but we may need to combine it with specimen detail
    // Try to parse as specimen or as history array
    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      // If it has barcode, it's a specimen object
      if ("barcode" in env) {
        return env as unknown as Specimen;
      }
      // Check if it's wrapped in data envelope
      const inner = env.data as Record<string, unknown> | undefined;
      if (inner && "barcode" in inner) {
        return inner as unknown as Specimen;
      }
    }

    return null;
  }, [rawData]);

  // Parse collection history (may be a separate array)
  const historyData = useMemo((): CollectionAttempt[] => {
    if (!rawData) return [];
    const envelope = rawData as unknown;
    // The /history endpoint returns CollectionAttempt[]
    if (Array.isArray(envelope)) {
      return envelope as CollectionAttempt[];
    }
    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;
      if (Array.isArray(env.data)) {
        return env.data as CollectionAttempt[];
      }
    }
    return [];
  }, [rawData]);

  // Build timeline from specimen data or history data
  const timelineEvents = useMemo(() => {
    const attempts = specimen?.collectionAttempts ?? historyData;
    const handoffs = specimen?.handoffs ?? [];
    return buildTimelineEvents(attempts, handoffs);
  }, [specimen, historyData]);

  // ─── Print label handler ─────────────────────────────────────────────────
  const handlePrintLabel = async () => {
    if (!id) return;
    try {
      const blob = await batchLabels.mutateAsync([id]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `label-${specimen?.barcode ?? id}.zpl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Error handled by mutation state
    }
  };

  // ─── Regenerate barcode handler ──────────────────────────────────────────
  const handleRegenerateBarcode = async () => {
    if (!id) return;
    try {
      await regenerateBarcode.mutateAsync(id);
      refetch();
    } catch {
      // Error handled by mutation state
    }
  };

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "SAMPLING", "ANALIS"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/laboratory/specimens"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-brand/10 hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "SAMPLING", "ANALIS"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/laboratory/specimens"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-brand/10 hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-lg font-bold text-foreground">
              Detail Spesimen
            </h2>
          </div>
          <div className="flex flex-col items-center gap-3 py-12" role="alert">
            <AlertCircle className="h-10 w-10 text-red-400 dark:text-red-500" />
            <p className="font-medium text-red-700 dark:text-red-300">
              Gagal memuat detail spesimen.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "SAMPLING", "ANALIS"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/laboratory/specimens"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-brand/10 hover:text-brand"
              aria-label="Kembali ke daftar spesimen"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Barcode className="h-5 w-5 text-brand" />
                {specimen?.barcode ?? "Spesimen"}
              </h2>
              {specimen?.order?.orderNumber && (
                <p className="text-sm text-muted-foreground">
                  Order: {specimen.order.orderNumber}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintLabel}
              disabled={batchLabels.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted shadow-sm disabled:opacity-60"
            >
              {batchLabels.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Cetak Label
            </button>
            <button
              onClick={handleRegenerateBarcode}
              disabled={regenerateBarcode.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted shadow-sm disabled:opacity-60"
            >
              {regenerateBarcode.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerasi Barcode
            </button>
          </div>
        </div>

        {/* Error messages from actions */}
        {regenerateBarcode.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Gagal meregenerasi barcode. Silakan coba lagi.
          </div>
        )}

        {/* Main content grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Specimen Info */}
          <div className="space-y-6">
            {/* Specimen Details Card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <TestTube className="h-3.5 w-3.5" />
                Informasi Spesimen
              </div>

              <dl className="space-y-3">
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-muted-foreground">Barcode</dt>
                  <dd className="font-mono text-sm font-semibold text-brand">
                    {specimen?.barcode ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-muted-foreground">Tipe Sampel</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {specimen?.sampleTypeCode ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-muted-foreground">Kondisi</dt>
                  <dd>
                    {specimen?.condition ? (
                      <SpecimenConditionBadge
                        condition={specimen.condition}
                      />
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                {specimen?.rejectionReason && (
                  <div className="flex justify-between items-start">
                    <dt className="text-sm text-muted-foreground">
                      Alasan Penolakan
                    </dt>
                    <dd className="text-sm text-red-600 dark:text-red-400 max-w-[60%] text-right">
                      {specimen.rejectionReason}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-muted-foreground">
                    Waktu Koleksi
                  </dt>
                  <dd className="text-sm text-foreground">
                    {specimen?.collectedAt
                      ? new Date(specimen.collectedAt).toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : "Belum dikumpulkan"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Temperature Info Card (if applicable) */}
            {(specimen?.transportTemperature !== null &&
              specimen?.transportTemperature !== undefined) && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Thermometer className="h-3.5 w-3.5" />
                  Informasi Transport
                </div>
                <dl className="space-y-3">
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-muted-foreground">
                      Suhu Transport
                    </dt>
                    <dd className="text-sm font-medium text-foreground">
                      {specimen.transportTemperature}°C
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-muted-foreground">
                      Sesuai Suhu
                    </dt>
                    <dd>
                      {specimen.temperatureCompliant === true ? (
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Ya
                        </span>
                      ) : specimen.temperatureCompliant === false ? (
                        <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Tidak
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          —
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Order Info Card */}
            {specimen?.order && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Informasi Order
                </div>
                <dl className="space-y-3">
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-muted-foreground">No. Order</dt>
                    <dd className="font-mono text-sm font-semibold text-foreground">
                      {specimen.order.orderNumber}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-sm text-muted-foreground">Status</dt>
                    <dd className="text-sm text-foreground">
                      {specimen.order.status}
                    </dd>
                  </div>
                  {specimen.order.patient && (
                    <>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-muted-foreground">
                          Pasien
                        </dt>
                        <dd className="text-sm font-medium text-foreground">
                          {specimen.order.patient.name}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt className="text-sm text-muted-foreground">MRN</dt>
                        <dd className="font-mono text-sm text-foreground">
                          {specimen.order.patient.mrn}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>

          {/* Right: Custody Chain Timeline */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                Custody Chain (Riwayat)
              </div>
              <SpecimenTimeline events={timelineEvents} />
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
