"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FlaskConical, Droplets, ChevronRight } from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import { cn } from "@/lib/utils";
import { LabStatusBadge } from "@/components/laboratory/lab-status-badge";

type ResultsTab = "SAMPLE_COLLECTED" | "IN_ANALYSIS";

const RESULTS_TABS: { id: ResultsTab; label: string; icon: React.ElementType }[] = [
  { id: "SAMPLE_COLLECTED", label: "Sampel Diterima", icon: Droplets },
  { id: "IN_ANALYSIS", label: "Proses Analisa", icon: FlaskConical },
];

export default function LabResultsPage() {
  const [activeTab, setActiveTab] = useState<ResultsTab>("SAMPLE_COLLECTED");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    return MOCK_ORDERS.filter((o) => {
      const matchStatus = o.status === activeTab;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.patientName.toLowerCase().includes(q) ||
        o.patientMrn.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Status filter tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {RESULTS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = MOCK_ORDERS.filter((o) => o.status === tab.id).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex whitespace-nowrap items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[oklch(0.55_0.08_145)] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
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
          />
        </div>
      </div>

      {/* Order Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
            Tidak ada order pada status ini.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const completedCount = order.details.filter(
              (d) => d.resultValue !== undefined
            ).length;
            const totalCount = order.details.length;
            const progress = Math.round((completedCount / totalCount) * 100);

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
                  <LabStatusBadge status={order.status as "SAMPLE_COLLECTED" | "IN_ANALYSIS"} />
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
                      className="h-full rounded-full bg-[#6B8E6B] transition-all"
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
                        d.resultValue !== undefined
                          ? "bg-[#6B8E6B]/10 text-[#6B8E6B]"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {d.test.code}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>{totalCount} parameter</span>
                  <span>
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
