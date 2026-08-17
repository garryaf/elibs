"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  FlaskConical,
  Droplets,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { LabStatusBadge } from "@/components/laboratory/lab-status-badge";

// ---------- Types ----------

interface ResultOrder {
  id: string;
  orderNumber: string;
  patientName: string;
  patientMrn: string;
  status: string;
  createdAt: string;
  details: {
    id: string;
    testId: string;
    testCode: string;
    testName: string;
    unit: string;
    status: string;
    resultValue: string | null;
    flag: string | null;
  }[];
}

// ---------- Constants ----------

type ResultsTab = "SAMPLE_COLLECTED" | "IN_ANALYSIS";

const RESULTS_TABS: { id: ResultsTab; label: string; icon: React.ElementType }[] = [
  { id: "SAMPLE_COLLECTED", label: "Sampel Diterima", icon: Droplets },
  { id: "IN_ANALYSIS", label: "Proses Analisa", icon: FlaskConical },
];

// ---------- API Response Mapper ----------

function mapApiOrder(o: any): ResultOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientName: o.patient?.name ?? o.patientName ?? "",
    patientMrn: o.patient?.mrn ?? o.patientMrn ?? "",
    status: o.status,
    createdAt: o.createdAt,
    details: (o.orderDetails ?? o.details ?? []).map((d: any) => ({
      id: d.id,
      testId: d.testId,
      testCode: d.test?.code ?? d.testCode ?? "",
      testName: d.test?.name ?? d.testName ?? "",
      unit: d.test?.unit ?? d.unit ?? "",
      status: d.status,
      resultValue: d.resultValue ?? null,
      flag: d.flag ?? null,
    })),
  };
}

// ---------- Component ----------

export default function LabResultsPage() {
  const [activeTab, setActiveTab] = useState<ResultsTab>("SAMPLE_COLLECTED");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<ResultOrder[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<ResultsTab, number>>({
    SAMPLE_COLLECTED: 0,
    IN_ANALYSIS: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ title: string; description: string; autoApproved?: boolean } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("autoApproved") === "true") {
        setToastMessage({
          title: "Hasil Disetujui Otomatis (Auto-Approved)!",
          description: "Order telah diverifikasi dan disetujui secara otomatis karena semua hasil tes normal.",
          autoApproved: true,
        });
      } else if (params.get("verified") === "true") {
        setToastMessage({
          title: "Hasil Diverifikasi",
          description: "Order telah diverifikasi dan dipindahkan ke antrean persetujuan dokter.",
          autoApproved: false,
        });
      }
    }
  }, []);

  // Fetch orders based on active tab
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      let res: any;

      if (activeTab === "SAMPLE_COLLECTED") {
        // Lab queue endpoint returns PAID + SAMPLE_COLLECTED orders
        res = await apiClient.getLabQueue({ status: "SAMPLE_COLLECTED" });
      } else {
        // IN_ANALYSIS orders are not in lab queue — use orders endpoint
        res = await apiClient.getOrders({ status: "IN_ANALYSIS" });
      }

      // Unwrap TransformInterceptor envelope: { success, data: { data: [...], meta } }
      const envelope = (res?.data ?? res) as any;
      const innerData = envelope?.data ?? envelope;

      if (Array.isArray(innerData)) {
        const mapped = innerData.map(mapApiOrder);
        setOrders(mapped);
      } else if (innerData?.data && Array.isArray(innerData.data)) {
        const mapped = innerData.data.map(mapApiOrder);
        setOrders(mapped);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Fetch counts for both tabs on mount and when data changes
  const fetchCounts = useCallback(async () => {
    try {
      const [sampleRes, analysisRes] = await Promise.all([
        apiClient.getLabQueue({ status: "SAMPLE_COLLECTED" }),
        apiClient.getOrders({ status: "IN_ANALYSIS" }),
      ]);

      const extractCount = (res: any): number => {
        const envelope = (res?.data ?? res) as any;
        const innerData = envelope?.data ?? envelope;
        if (Array.isArray(innerData)) return innerData.length;
        if (innerData?.meta?.total != null) return innerData.meta.total;
        if (innerData?.data && Array.isArray(innerData.data)) return innerData.data.length;
        return 0;
      };

      setTabCounts({
        SAMPLE_COLLECTED: extractCount(sampleRes),
        IN_ANALYSIS: extractCount(analysisRes),
      });
    } catch {
      // Keep existing counts on error
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Filter by local search
  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.patientName.toLowerCase().includes(q) ||
      o.patientMrn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-start justify-between rounded-xl border p-4 shadow-md transition-all",
            toastMessage.autoApproved
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100 dark:border-emerald-800"
              : "border-blue-500/30 bg-blue-50 text-blue-900 dark:bg-blue-950/80 dark:text-blue-100 dark:border-blue-800"
          )}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              className={cn(
                "h-5 w-5 shrink-0 mt-0.5",
                toastMessage.autoApproved ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
              )}
            />
            <div>
              <h4 className="font-semibold text-sm">{toastMessage.title}</h4>
              <p className="text-xs mt-0.5 opacity-90">{toastMessage.description}</p>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-semibold hover:underline opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Status filter tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {RESULTS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex whitespace-nowrap items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={cn(
                    "ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari order atau pasien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            aria-label="Search lab results"
          />
        </div>
      </div>

      {/* Order Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                <div className="flex gap-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 px-4 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FlaskConical className="h-8 w-8 text-primary" />
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <h3 className="text-base font-bold text-foreground">
              {search ? "Hasil Tidak Ditemukan" : "Tidak Ada Order Menunggu"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
              {search
                ? `Tidak ada order yang cocok dengan pencarian "${search}".`
                : "Saat ini tidak ada order yang siap untuk diinput hasil laboratorium."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Bersihkan Pencarian
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const completedCount = order.details.filter(
              (d) => d.resultValue !== null
            ).length;
            const totalCount = order.details.length;
            const progress =
              totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : 0;

            return (
              <Link
                key={order.id}
                href={`/dashboard/laboratory/results/${order.id}`}
                className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-primary">
                      {order.orderNumber}
                    </span>
                    <h3 className="mt-1 font-bold text-foreground">
                      {order.patientName}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {order.patientMrn}
                    </span>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mb-3">
                  <LabStatusBadge
                    status={
                      order.status as "SAMPLE_COLLECTED" | "IN_ANALYSIS"
                    }
                  />
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress Hasil</span>
                    <span>
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Test codes */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {order.details.map((d) => (
                    <span
                      key={d.id}
                      className={cn(
                        "rounded-md px-2 py-1 font-mono text-[10px] font-semibold",
                        d.resultValue !== null
                          ? "bg-brand/10 text-brand"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {d.testCode}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{totalCount} parameter</span>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    {new Date(order.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
