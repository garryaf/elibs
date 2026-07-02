"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FlaskConical, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { MOCK_ORDERS } from "@/lib/mock-orders";
import { cn } from "@/lib/utils";

type LabTab = "SAMPLE_COLLECTED" | "IN_ANALYSIS" | "COMPLETED";

const LAB_TABS: { id: LabTab; label: string; icon: React.ElementType }[] = [
  { id: "SAMPLE_COLLECTED", label: "Menunggu Sampel", icon: Clock },
  { id: "IN_ANALYSIS", label: "Proses Analisa", icon: FlaskConical },
  { id: "COMPLETED", label: "Selesai Validasi", icon: CheckCircle2 },
];

export default function LaboratoryDashboard() {
  const [activeTab, setActiveTab] = useState<LabTab>("IN_ANALYSIS");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    return MOCK_ORDERS.filter((o) => {
      // For Lab dashboard, we care about orders in specific states.
      // We map COMPLETED to mean the lab finished it, though realistically there's a DOCTOR_APPROVAL stage.
      // For now, let's just use the mock data as is.
      const matchStatus = o.status === activeTab;
      const q = search.toLowerCase();
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) || o.patientName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Laboratorium</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Dashboard teknisi laboratorium untuk input hasil analisa.</p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
          {LAB_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = MOCK_ORDERS.filter(o => o.status === tab.id).length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex whitespace-nowrap items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span className={cn(
                  "ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>
      </div>

      {/* Kanban List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Tidak ada order pada status ini.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/laboratory/${order.id}`}
              className="group block rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-700"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {order.orderNumber}
                  </span>
                  <h3 className="mt-1 font-bold text-slate-900 dark:text-white">{order.patientName}</h3>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:bg-slate-900 dark:group-hover:bg-emerald-900/30 dark:group-hover:text-emerald-400">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {order.details.map((d) => (
                  <span
                    key={d.id}
                    className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  >
                    {d.test.code}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>{order.details.length} parameter</span>
                <span>{new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
