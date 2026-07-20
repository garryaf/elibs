"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LabStatusBadge } from "@/components/laboratory/lab-status-badge";

// ---------- Types ----------

type Flag = "NORMAL" | "LOW" | "HIGH" | "CRITICAL";

interface ReferenceValue {
  minRef: string | null;
  maxRef: string | null;
  criticalMin: string | null;
  criticalMax: string | null;
  gender: string | null;
  minAge: number | null;
  maxAge: number | null;
}

interface TestInfo {
  code: string;
  name: string;
  unit: string | null;
  referenceValues: ReferenceValue[];
}

interface OrderDetail {
  id: string;
  testId: string;
  status: string;
  resultValue: string | null;
  flag: Flag | null;
  comment: string | null;
  test: TestInfo;
}

interface Patient {
  name: string;
  mrn: string;
  gender: string;
  dateOfBirth: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  patient: Patient;
  orderDetails: OrderDetail[];
}

interface DeltaCheckItem {
  resultValue: string;
  flag: Flag | null;
  resultDate: string;
  orderNumber: string;
}

interface DeltaCheckEntry {
  testId: string;
  testName: string;
  history: DeltaCheckItem[];
}

interface ResultFormEntry {
  orderDetailId: string;
  resultValue: string;
  comment: string;
  flag: Flag | null;
}

// ---------- Helpers ----------

function calculateFlag(
  value: number,
  minRef?: number,
  maxRef?: number,
  criticalMin?: number,
  criticalMax?: number
): Flag | null {
  if (minRef === undefined || maxRef === undefined) return null;

  if (criticalMin !== undefined && value < criticalMin) return "CRITICAL";
  if (criticalMax !== undefined && value > criticalMax) return "CRITICAL";
  if (value < minRef) return "LOW";
  if (value > maxRef) return "HIGH";
  return "NORMAL";
}

/**
 * Find the matching reference value for a patient based on gender/age.
 * Falls back to the first reference value if no specific match found.
 */
function getMatchingReference(
  referenceValues: ReferenceValue[],
  patientGender?: string,
  patientAge?: number
): { minRef?: number; maxRef?: number; criticalMin?: number; criticalMax?: number } {
  if (!referenceValues || referenceValues.length === 0) return {};

  // Try to find a gender+age specific reference
  const match = referenceValues.find((rv) => {
    const genderMatch = !rv.gender || rv.gender === patientGender;
    const ageMatch =
      (rv.minAge === null || (patientAge !== undefined && patientAge >= rv.minAge)) &&
      (rv.maxAge === null || (patientAge !== undefined && patientAge <= rv.maxAge));
    return genderMatch && ageMatch;
  });

  const ref = match || referenceValues[0];

  return {
    minRef: ref.minRef ? parseFloat(ref.minRef) : undefined,
    maxRef: ref.maxRef ? parseFloat(ref.maxRef) : undefined,
    criticalMin: ref.criticalMin ? parseFloat(ref.criticalMin) : undefined,
    criticalMax: ref.criticalMax ? parseFloat(ref.criticalMax) : undefined,
  };
}

function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getFlagConfig(flag: Flag | null) {
  switch (flag) {
    case "NORMAL":
      return {
        label: "Normal",
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        borderColor: "border-green-200 dark:border-green-800",
        icon: CheckCircle2,
      };
    case "HIGH":
      return {
        label: "Tinggi",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: TrendingUp,
      };
    case "LOW":
      return {
        label: "Rendah",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: TrendingDown,
      };
    case "CRITICAL":
      return {
        label: "Kritis",
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        borderColor: "border-red-200 dark:border-red-800",
        icon: AlertTriangle,
      };
    default:
      return null;
  }
}

// ---------- Component ----------

export default function ResultEntryPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [deltaCheck, setDeltaCheck] = useState<DeltaCheckEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultFormEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Load order and delta check data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        // apiClient.get already unwraps the { success, message, data } envelope via unwrapResponse
        // So the response IS the inner data object directly
        const orderRes = await apiClient.getOrder(orderId) as unknown as Order;

        if (cancelled) return;

        if (!orderRes || !orderRes.id) {
          setError("Order tidak ditemukan.");
          return;
        }

        setOrder(orderRes);

        // Delta check may fail (403 for non-eligible roles) - handle gracefully
        try {
          const deltaRes = await apiClient.getDeltaCheck(orderId) as unknown as DeltaCheckEntry[];
          if (!cancelled && Array.isArray(deltaRes)) {
            setDeltaCheck(deltaRes);
          }
        } catch {
          // Delta check is optional - silently ignore 403 or other errors
          if (!cancelled) setDeltaCheck([]);
        }

        // Initialize result form entries from order details
        const patientAge = orderRes.patient?.dateOfBirth
          ? calculateAge(orderRes.patient.dateOfBirth)
          : undefined;
        const patientGender = orderRes.patient?.gender;

        setResults(
          (orderRes.orderDetails ?? []).map((detail) => {
            const existingValue = detail.resultValue ?? "";
            let flag: Flag | null = detail.flag ?? null;

            // If there's already a value, recalculate flag preview
            if (existingValue && !isNaN(parseFloat(existingValue))) {
              const ref = getMatchingReference(
                detail.test?.referenceValues ?? [],
                patientGender,
                patientAge
              );
              flag = calculateFlag(
                parseFloat(existingValue),
                ref.minRef,
                ref.maxRef,
                ref.criticalMin,
                ref.criticalMax
              );
            }

            return {
              orderDetailId: detail.id,
              resultValue: existingValue,
              comment: detail.comment ?? "",
              flag,
            };
          })
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : "Gagal memuat data order.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const patientAge = useMemo(() => {
    if (!order?.patient.dateOfBirth) return undefined;
    return calculateAge(order.patient.dateOfBirth);
  }, [order]);

  const updateResult = useCallback(
    (orderDetailId: string, value: string) => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.orderDetailId !== orderDetailId) return r;

          const detail = order?.orderDetails.find((d) => d.id === orderDetailId);
          let flag: Flag | null = null;
          const numVal = parseFloat(value);

          if (!isNaN(numVal) && detail?.test) {
            const ref = getMatchingReference(
              detail.test?.referenceValues ?? [],
              order?.patient.gender,
              patientAge
            );
            flag = calculateFlag(numVal, ref.minRef, ref.maxRef, ref.criticalMin, ref.criticalMax);
          }

          return { ...r, resultValue: value, flag };
        })
      );
    },
    [order, patientAge]
  );

  const updateComment = useCallback(
    (orderDetailId: string, comment: string) => {
      setResults((prev) =>
        prev.map((r) =>
          r.orderDetailId === orderDetailId ? { ...r, comment } : r
        )
      );
    },
    []
  );

  const allResultsFilled = useMemo(
    () => results.length > 0 && results.every((r) => r.resultValue.trim() !== ""),
    [results]
  );

  const canVerify = useMemo(() => {
    if (!order) return false;
    return (
      allResultsFilled &&
      (order.status === "IN_ANALYSIS" || order.status === "SAMPLE_COLLECTED")
    );
  }, [order, allResultsFilled]);

  const handleSubmitResults = async () => {
    setSubmitting(true);
    try {
      await apiClient.enterResults(
        orderId,
        results.map((r) => ({
          orderDetailId: r.orderDetailId,
          resultValue: r.resultValue,
          comment: r.comment || undefined,
        })) as Array<{ orderDetailId: string; resultValue: string }>
      );

      // Refresh order data after save
      const orderData = await apiClient.getOrder(orderId) as unknown as Order;
      if (orderData && orderData.id) {
        setOrder(orderData);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Gagal menyimpan hasil.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!allResultsFilled) {
      alert("Semua hasil harus diisi sebelum verifikasi.");
      return;
    }
    setVerifying(true);
    try {
      await apiClient.verifyResults(orderId);
      router.push("/dashboard/laboratory/results");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Gagal memverifikasi hasil.";
      alert(message);
    } finally {
      setVerifying(false);
    }
  };

  // Build delta check lookup by testId
  const deltaCheckMap = useMemo(() => {
    const map: Record<string, DeltaCheckItem[]> = {};
    for (const entry of deltaCheck) {
      map[entry.testId] = entry.history;
    }
    return map;
  }, [deltaCheck]);

  // ---------- Loading State ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Memuat data order...</span>
      </div>
    );
  }

  // ---------- Error / Not Found State ----------

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">{error || "Order tidak ditemukan."}</p>
        <Link
          href="/dashboard/laboratory/results"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/laboratory/results"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Input Hasil — {order.orderNumber}
            </h2>
            <p className="text-sm text-muted-foreground">
              {order.patient.name} · {order.patient.mrn}
            </p>
          </div>
        </div>
        <LabStatusBadge status={order.status as "SAMPLE_COLLECTED" | "IN_ANALYSIS"} />
      </div>

      {/* Result Entry Cards */}
      <div className="space-y-4">
        {order.orderDetails.map((detail, idx) => {
          const entry = results[idx];
          const flagConfig = entry ? getFlagConfig(entry.flag) : null;
          const deltaItems = deltaCheckMap[detail.testId] ?? [];
          const FlagIcon = flagConfig?.icon;

          // Get reference range for display
          const ref = getMatchingReference(
            detail.test?.referenceValues ?? [],
            order.patient.gender,
            patientAge
          );

          return (
            <div
              key={detail.id}
              className={cn(
                "rounded-2xl border bg-card p-5 transition-all",
                flagConfig ? flagConfig.borderColor : "border-border"
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                {/* Test Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-brand/10 px-2 py-1 font-mono text-xs font-bold text-brand">
                      {detail.test?.code ?? "-"}
                    </span>
                    <h3 className="font-semibold text-foreground">
                      {detail.test?.name ?? "-"}
                    </h3>
                  </div>

                  {/* Reference range info */}
                  {(ref.minRef !== undefined || ref.maxRef !== undefined) && (
                    <div className="text-xs text-muted-foreground">
                      Rentang Normal:{" "}
                      <span className="font-medium text-foreground">
                        {ref.minRef} – {ref.maxRef}
                      </span>{" "}
                      {detail.test?.unit}
                      {(ref.criticalMin !== undefined || ref.criticalMax !== undefined) && (
                        <span className="ml-2 text-red-500">
                          (Kritis: {"<"}{ref.criticalMin} atau {">"}{ref.criticalMax})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Input field */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type="text"
                        placeholder="Masukkan hasil..."
                        value={entry?.resultValue ?? ""}
                        onChange={(e) =>
                          updateResult(detail.id, e.target.value)
                        }
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-primary text-foreground placeholder:text-muted-foreground",
                          flagConfig
                            ? flagConfig.borderColor
                            : "border-border"
                        )}
                      />
                      {detail.test?.unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {detail.test?.unit}
                        </span>
                      )}
                    </div>

                    {/* Flag badge */}
                    {flagConfig && FlagIcon && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold",
                          flagConfig.className
                        )}
                      >
                        <FlagIcon className="h-3 w-3" />
                        {flagConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Comment field */}
                  <input
                    type="text"
                    placeholder="Komentar (opsional)..."
                    value={entry?.comment ?? ""}
                    onChange={(e) =>
                      updateComment(detail.id, e.target.value)
                    }
                    className="h-8 w-full max-w-md rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Delta Check Panel */}
                {deltaItems.length > 0 && (
                  <div className="w-full lg:w-64 shrink-0 rounded-xl border border-border bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      Delta Check
                    </div>
                    <div className="space-y-1.5">
                      {deltaItems.map((delta, dIdx) => {
                        const deltaFlagConfig = getFlagConfig(delta.flag);
                        return (
                          <div
                            key={dIdx}
                            className="flex items-center justify-between rounded-md bg-card px-2.5 py-1.5 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">
                                {delta.resultValue}
                              </span>
                              {deltaFlagConfig && (
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                    deltaFlagConfig.className
                                  )}
                                >
                                  {deltaFlagConfig.label}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(delta.resultDate).toLocaleDateString(
                                "id-ID",
                                { day: "2-digit", month: "short", year: "2-digit" }
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={handleSubmitResults}
          disabled={submitting}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
            "border border-brand text-brand hover:bg-brand/10",
            submitting && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitting ? "Menyimpan..." : "Simpan Hasil"}
        </button>

        {/* Verify button - visible when results are filled and order is in analysis */}
        {canVerify && (
          <button
            onClick={handleVerify}
            disabled={verifying}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
              "bg-brand text-white hover:bg-brand-dark shadow-sm",
              verifying && "opacity-50 cursor-not-allowed"
            )}
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {verifying ? "Memverifikasi..." : "Verifikasi Hasil"}
          </button>
        )}
      </div>
    </div>
  );
}
