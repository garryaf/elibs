"use client";

import { useState, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import { cn } from "@/lib/utils";
import { LabStatusBadge } from "@/components/laboratory/lab-status-badge";
import type { OrderDetail } from "@/types/order";

// ---------- Types ----------

type Flag = "NORMAL" | "LOW" | "HIGH" | "CRITICAL";

interface ResultFormEntry {
  orderDetailId: string;
  resultValue: string;
  comment: string;
  flag: Flag | null;
}

interface DeltaCheckItem {
  resultValue: string;
  flag: Flag | null;
  resultDate: string;
  orderNumber: string;
}

// ---------- Mock Delta Check Data ----------

const MOCK_DELTA_CHECK: Record<string, DeltaCheckItem[]> = {
  "od-012": [
    { resultValue: "32", flag: "NORMAL", resultDate: "2026-06-15T10:00:00Z", orderNumber: "ORD-2026-0090" },
    { resultValue: "45", flag: "HIGH", resultDate: "2026-05-20T09:30:00Z", orderNumber: "ORD-2026-0072" },
  ],
  "od-013": [
    { resultValue: "28", flag: "NORMAL", resultDate: "2026-06-15T10:00:00Z", orderNumber: "ORD-2026-0090" },
  ],
  "od-004": [
    { resultValue: "7.2", flag: "HIGH", resultDate: "2026-05-10T11:00:00Z", orderNumber: "ORD-2026-0045" },
    { resultValue: "6.5", flag: "HIGH", resultDate: "2026-02-15T09:00:00Z", orderNumber: "ORD-2026-0020" },
    { resultValue: "6.1", flag: "HIGH", resultDate: "2025-11-20T10:30:00Z", orderNumber: "ORD-2025-0180" },
  ],
};

// ---------- Helpers ----------

function calculateFlag(
  value: number,
  minRef?: number,
  maxRef?: number
): Flag | null {
  if (minRef === undefined || maxRef === undefined) return null;

  // Simplified critical thresholds (critical = 2x beyond normal range)
  const range = maxRef - minRef;
  const criticalMin = minRef - range * 0.5;
  const criticalMax = maxRef + range * 0.5;

  if (value < criticalMin || value > criticalMax) return "CRITICAL";
  if (value < minRef) return "LOW";
  if (value > maxRef) return "HIGH";
  return "NORMAL";
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

  const order = MOCK_ORDERS.find((o) => o.id === orderId);

  const [results, setResults] = useState<ResultFormEntry[]>(() => {
    if (!order) return [];
    return order.details.map((d) => ({
      orderDetailId: d.id,
      resultValue: d.resultValue !== undefined ? String(d.resultValue) : "",
      comment: "",
      flag: d.resultFlag ?? null,
    }));
  });

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Mock user role — in production comes from auth context
  const userRole: "ANALIS" | "ADMIN" = "ANALIS";

  const updateResult = useCallback(
    (orderDetailId: string, value: string) => {
      setResults((prev) =>
        prev.map((r) => {
          if (r.orderDetailId !== orderDetailId) return r;

          const detail = order?.details.find((d) => d.id === orderDetailId);
          let flag: Flag | null = null;
          const numVal = parseFloat(value);
          if (!isNaN(numVal) && detail?.test) {
            flag = calculateFlag(numVal, detail.test.minRef, detail.test.maxRef);
          }

          return { ...r, resultValue: value, flag };
        })
      );
    },
    [order]
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
    () => results.every((r) => r.resultValue.trim() !== ""),
    [results]
  );

  const handleSubmitResults = async () => {
    setSubmitting(true);
    // In production: PUT /api/v1/lab/:orderId/results
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitting(false);
    alert("Hasil berhasil disimpan!");
  };

  const handleVerify = async () => {
    if (!allResultsFilled) {
      alert("Semua hasil harus diisi sebelum verifikasi.");
      return;
    }
    setVerifying(true);
    // In production: POST /api/v1/lab/:orderId/verify
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setVerifying(false);
    alert("Hasil berhasil diverifikasi!");
    router.push("/dashboard/laboratory/results");
  };

  if (!order) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Order tidak ditemukan.</p>
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
              {order.patientName} · {order.patientMrn}
            </p>
          </div>
        </div>
        <LabStatusBadge status={order.status as "SAMPLE_COLLECTED" | "IN_ANALYSIS"} />
      </div>

      {/* Result Entry Cards */}
      <div className="space-y-4">
        {order.details.map((detail, idx) => {
          const entry = results[idx];
          const flagConfig = entry ? getFlagConfig(entry.flag) : null;
          const deltaItems = MOCK_DELTA_CHECK[detail.id] ?? [];
          const FlagIcon = flagConfig?.icon;

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
                    <span className="rounded-md bg-[#6B8E6B]/10 px-2 py-1 font-mono text-xs font-bold text-[#6B8E6B]">
                      {detail.test.code}
                    </span>
                    <h3 className="font-semibold text-foreground">
                      {detail.test.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      ({detail.test.category})
                    </span>
                  </div>

                  {/* Reference range info */}
                  {(detail.test.minRef !== undefined ||
                    detail.test.maxRef !== undefined) && (
                    <div className="text-xs text-muted-foreground">
                      Rentang Normal:{" "}
                      <span className="font-medium text-foreground">
                        {detail.test.minRef} – {detail.test.maxRef}
                      </span>{" "}
                      {detail.test.unit}
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
                      {detail.test.unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {detail.test.unit}
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
            "border border-[#6B8E6B] text-[#6B8E6B] hover:bg-[#6B8E6B]/10",
            submitting && "opacity-50 cursor-not-allowed"
          )}
        >
          <Save className="h-4 w-4" />
          {submitting ? "Menyimpan..." : "Simpan Hasil"}
        </button>

        {/* Verify button - only visible for ANALIS role */}
        {(userRole === "ANALIS" || userRole === "ADMIN") && (
          <button
            onClick={handleVerify}
            disabled={verifying || !allResultsFilled}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all",
              "bg-[#6B8E6B] text-white hover:bg-[#5A7D5A] shadow-sm",
              (verifying || !allResultsFilled) && "opacity-50 cursor-not-allowed"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            {verifying ? "Memverifikasi..." : "Verifikasi Hasil"}
          </button>
        )}
      </div>
    </div>
  );
}
