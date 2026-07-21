"use client";

import { useState, useMemo } from "react";
import {
  Search,
  FlaskConical,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ShieldCheck,
  Barcode,
  User,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLabQueue } from "@/services/lab";
import { apiClient } from "@/lib/api";
import {
  LabStatusBadge,
  type OrderStatus,
} from "@/components/laboratory/lab-status-badge";
import { RoleGuard } from "@/components/guards/RoleGuard";

// ---------- Types ----------

interface LabQueueOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  status: OrderStatus;
  createdAt: string;
  barcodeImage?: string;
  totalAmount: number;
  details: {
    id: string;
    testId: string;
    testCode: string;
    testName: string;
    status: string;
  }[];
}

// ---------- Constants ----------

type QueueTab = "ALL" | "PAID" | "SAMPLE_COLLECTED" | "IN_ANALYSIS" | "VERIFIED";

const QUEUE_TABS: { id: QueueTab; label: string; icon: React.ElementType }[] = [
  { id: "ALL", label: "Semua", icon: Clock },
  { id: "PAID", label: "Terbayar", icon: CreditCard },
  { id: "SAMPLE_COLLECTED", label: "Sampel Diterima", icon: Barcode },
  { id: "IN_ANALYSIS", label: "Proses Analisa", icon: FlaskConical },
  { id: "VERIFIED", label: "Terverifikasi", icon: ShieldCheck },
];

const PAGE_SIZE = 10;

// ---------- API Response Mapper ----------

function mapApiOrder(o: any): LabQueueOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    patientId: o.patientId ?? o.patient?.id ?? "",
    patientName: o.patient?.name ?? o.patientName ?? "",
    patientMrn: o.patient?.mrn ?? o.patientMrn ?? "",
    status: o.status,
    createdAt: o.createdAt,
    barcodeImage: o.barcodeImage,
    totalAmount: Number(o.totalAmount) || 0,
    details: (o.orderDetails ?? o.details ?? []).map((d: any) => ({
      id: d.id,
      testId: d.testId,
      testCode: d.test?.code ?? d.testCode ?? "",
      testName: d.test?.name ?? d.testName ?? "",
      status: d.status,
    })),
  };
}

// ---------- Component ----------

export default function LaboratoryQueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTab>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // ─── TanStack Query: fetch lab queue ────────────────────────────────────────
  const { data: queryData, isLoading, error: queryError, refetch } = useLabQueue({
    page,
    limit: PAGE_SIZE,
    status: activeTab !== "ALL" ? activeTab : undefined,
  });

  // ─── Extract data from query response ──────────────────────────────────────
  const { orders, totalItems } = useMemo(() => {
    const envelope = queryData as unknown;
    let items: LabQueueOrder[] = [];
    let total = 0;

    if (envelope && typeof envelope === "object") {
      const env = envelope as Record<string, unknown>;

      // Handle nested { data: { data: [], meta: {} } } or { data: [], meta: {} }
      const inner = (env.data ?? env) as Record<string, unknown>;

      if (Array.isArray(inner)) {
        items = (inner as unknown[]).map(mapApiOrder);
        total = items.length;
      } else if (inner && typeof inner === "object") {
        const dataArr = (inner as Record<string, unknown>).data;
        if (Array.isArray(dataArr)) {
          items = dataArr.map(mapApiOrder);
          const meta = (inner as Record<string, unknown>).meta as Record<string, unknown> | undefined;
          total = Number(meta?.total) || items.length;
        }
      }
    }

    return { orders: items, totalItems: total };
  }, [queryData]);

  // Filter by search client-side (API may not support search param for queue)
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.patientName.toLowerCase().includes(q) ||
        o.patientMrn.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const error = queryError ? "Gagal memuat data antrian laboratorium. Silakan coba lagi." : null;

  // Reset page when filter/search changes
  const handleTabChange = (tab: QueueTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const tabCounts = useMemo(() => {
    const counts: Record<QueueTab, number> = {
      ALL: totalItems,
      PAID: 0,
      SAMPLE_COLLECTED: 0,
      IN_ANALYSIS: 0,
      VERIFIED: 0,
    };
    orders.forEach((o) => {
      if (o.status in counts) {
        counts[o.status as QueueTab]++;
      }
    });
    if (activeTab === "ALL") counts.ALL = totalItems;
    return counts;
  }, [orders, totalItems, activeTab]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN", "SAMPLING", "ANALIS"]}>
    <div className="space-y-6">
      {/* Status filter tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
          {QUEUE_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none",
                  isActive
                    ? "bg-brand text-white shadow-sm"
                    : "text-[#8B8B6B] hover:bg-brand/10 hover:text-brand"
                )}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                <span
                  className={cn(
                    "ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold px-1.5",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-brand/10 text-[#8B8B6B]"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari order, pasien, MRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground placeholder:text-muted-foreground"
            aria-label="Search lab queue"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-brand/5">
              <th className="px-4 py-3 font-semibold text-brand">No. Order</th>
              <th className="px-4 py-3 font-semibold text-brand">Pasien</th>
              <th className="px-4 py-3 font-semibold text-brand hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 font-semibold text-brand hidden md:table-cell">Tanggal</th>
              <th className="px-4 py-3 font-semibold text-brand text-right">Tes</th>
              <th className="w-10 px-4 py-3" aria-label="Expand"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    Memuat antrian...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3" role="alert">
                    <AlertCircle className="h-10 w-10 text-red-400 dark:text-red-500" />
                    <p className="font-medium text-red-700 dark:text-red-300">{error}</p>
                    <button
                      onClick={() => refetch()}
                      className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
                    <p>Tidak ada order dalam antrian</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                return (
                  <OrderRow
                    key={order.id}
                    order={order}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(order.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredOrders.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems} order
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40 disabled:hover:bg-card"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[80px] text-center text-sm font-medium text-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand disabled:opacity-40 disabled:hover:bg-card"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}

// ---------- OrderRow Sub-component ----------

interface OrderRowProps {
  order: LabQueueOrder;
  isExpanded: boolean;
  onToggle: () => void;
}

function OrderRow({ order, isExpanded, onToggle }: OrderRowProps) {
  const [confirming, setConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleConfirmSample = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirming(true);
    setConfirmError(null);
    try {
      await apiClient.post(`/api/v1/lab/${order.id}/sample`, { sampleCondition: "ACCEPTABLE" });
      setConfirmSuccess(true);
      // Reload page after short delay to show updated status
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setConfirmError(apiErr?.message || "Gagal konfirmasi sampel");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-border transition-colors hover:bg-brand/5",
          isExpanded && "bg-brand/5"
        )}
      >
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-semibold text-brand">
            {order.orderNumber}
          </span>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-foreground">{order.patientName}</p>
            <p className="text-xs text-muted-foreground">{order.patientMrn}</p>
          </div>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <LabStatusBadge status={order.status} />
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          <span className="ml-2 text-xs">
            {new Date(order.createdAt).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand/10 px-2 text-xs font-bold text-brand">
            {order.details.length}
          </span>
        </td>
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="border-b border-border bg-brand/[0.02]">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Patient Info */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B8B6B]">
                  <User className="h-3.5 w-3.5" />
                  Informasi Pasien
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Nama:</span>{" "}
                    <span className="font-medium text-foreground">{order.patientName}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">MRN:</span>{" "}
                    <span className="font-mono text-foreground">{order.patientMrn}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-medium text-foreground">
                      Rp {order.totalAmount.toLocaleString("id-ID")}
                    </span>
                  </p>
                </div>
              </div>

              {/* Barcode Info */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B8B6B]">
                  <Barcode className="h-3.5 w-3.5" />
                  Barcode
                </div>
                {order.barcodeImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-full items-center justify-center rounded-lg bg-white">
                      <span className="font-mono text-xs text-gray-600">
                        {order.orderNumber}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Barcode tersedia</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Barcode belum tersedia
                  </p>
                )}
              </div>

              {/* Test List */}
              <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8B8B6B]">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Daftar Tes ({order.details.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {order.details.map((d) => (
                    <span
                      key={d.id}
                      className={cn(
                        "rounded-md px-2 py-1 font-mono text-[11px] font-semibold",
                        d.status === "RESULT_ENTERED" || d.status === "VERIFIED" || d.status === "APPROVED"
                          ? "bg-brand/10 text-brand dark:bg-brand-light dark:text-brand"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                      title={d.testName}
                    >
                      {d.testCode}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons based on order status */}
            <div className="mt-4 flex items-center gap-3">
              {confirmError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {confirmError}
                </div>
              )}
              {confirmSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sampel dikonfirmasi! Memuat ulang...
                </div>
              )}
              {order.status === "PAID" && !confirmSuccess && (
                <button
                  onClick={handleConfirmSample}
                  disabled={confirming}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengkonfirmasi...
                    </>
                  ) : (
                    <>
                      <Barcode className="h-4 w-4" />
                      Konfirmasi Sampel
                    </>
                  )}
                </button>
              )}
              {(order.status === "SAMPLE_COLLECTED" || order.status === "IN_ANALYSIS") && (
                <a
                  href={`/dashboard/laboratory/results/${order.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md active:scale-[0.98]"
                >
                  <FlaskConical className="h-4 w-4" />
                  Input Hasil
                </a>
              )}
              {order.status === "VERIFIED" && (
                <a
                  href={`/dashboard/laboratory/approval`}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 hover:shadow-md active:scale-[0.98]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Menunggu Approval Dokter
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
