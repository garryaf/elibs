"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import {
  LabStatusBadge,
  type OrderStatus,
} from "@/components/laboratory/lab-status-badge";

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

interface LabQueueResponse {
  success: boolean;
  data: {
    items: LabQueueOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

// ---------- Mock data for development ----------
// In production, this would be replaced by actual API calls

const MOCK_QUEUE_ORDERS: LabQueueOrder[] = [
  {
    id: "o-004",
    orderNumber: "LAB-20260630-0004",
    patientId: "p-007",
    patientName: "Bagas Anugerah",
    patientMrn: "RM-202606-0007",
    status: "PAID",
    createdAt: "2026-06-30T09:15:00Z",
    totalAmount: 260000,
    details: [
      { id: "od-010", testId: "t-020", testCode: "HIV", testName: "HIV Rapid Test", status: "PENDING" },
      { id: "od-011", testId: "t-019", testCode: "HBS", testName: "HBsAg Rapid", status: "PENDING" },
    ],
  },
  {
    id: "o-005",
    orderNumber: "LAB-20260630-0005",
    patientId: "p-008",
    patientName: "Nurul Hidayah",
    patientMrn: "RM-202606-0008",
    status: "SAMPLE_COLLECTED",
    createdAt: "2026-06-30T08:45:00Z",
    barcodeImage: "data:image/png;base64,iVBORw0KGgo=",
    totalAmount: 290000,
    details: [
      { id: "od-012", testId: "t-014", testCode: "SGOT", testName: "SGOT", status: "PENDING" },
      { id: "od-013", testId: "t-015", testCode: "SGPT", testName: "SGPT", status: "PENDING" },
      { id: "od-014", testId: "t-016", testCode: "BIL-T", testName: "Bilirubin Total", status: "PENDING" },
      { id: "od-015", testId: "t-012", testCode: "UREA", testName: "Ureum", status: "PENDING" },
      { id: "od-016", testId: "t-013", testCode: "CREA", testName: "Kreatinin", status: "PENDING" },
    ],
  },
  {
    id: "o-006",
    orderNumber: "LAB-20260630-0006",
    patientId: "p-002",
    patientName: "Siti Rahayu",
    patientMrn: "RM-202606-0002",
    status: "IN_ANALYSIS",
    createdAt: "2026-06-30T07:30:00Z",
    barcodeImage: "data:image/png;base64,iVBORw0KGgo=",
    totalAmount: 180000,
    details: [
      { id: "od-017", testId: "t-001", testCode: "DL", testName: "Darah Lengkap", status: "COMPLETED" },
      { id: "od-018", testId: "t-005", testCode: "GDS", testName: "Gula Darah Sewaktu", status: "PENDING" },
    ],
  },
  {
    id: "o-007",
    orderNumber: "LAB-20260630-0007",
    patientId: "p-009",
    patientName: "Ahmad Faisal",
    patientMrn: "RM-202606-0009",
    status: "VERIFIED",
    createdAt: "2026-06-30T06:00:00Z",
    barcodeImage: "data:image/png;base64,iVBORw0KGgo=",
    totalAmount: 350000,
    details: [
      { id: "od-019", testId: "t-007", testCode: "HBA1C", testName: "HbA1c", status: "COMPLETED" },
      { id: "od-020", testId: "t-008", testCode: "CHOL", testName: "Kolesterol Total", status: "COMPLETED" },
      { id: "od-021", testId: "t-009", testCode: "TG", testName: "Trigliserida", status: "COMPLETED" },
    ],
  },
  {
    id: "o-008",
    orderNumber: "LAB-20260630-0008",
    patientId: "p-010",
    patientName: "Rina Wulandari",
    patientMrn: "RM-202606-0010",
    status: "PAID",
    createdAt: "2026-06-30T10:00:00Z",
    totalAmount: 150000,
    details: [
      { id: "od-022", testId: "t-001", testCode: "DL", testName: "Darah Lengkap", status: "PENDING" },
    ],
  },
  {
    id: "o-009",
    orderNumber: "LAB-20260630-0009",
    patientId: "p-011",
    patientName: "Dian Permata",
    patientMrn: "RM-202606-0011",
    status: "IN_ANALYSIS",
    createdAt: "2026-06-30T07:00:00Z",
    barcodeImage: "data:image/png;base64,iVBORw0KGgo=",
    totalAmount: 425000,
    details: [
      { id: "od-023", testId: "t-023", testCode: "T3", testName: "T3 Total", status: "COMPLETED" },
      { id: "od-024", testId: "t-024", testCode: "T4", testName: "T4 Free", status: "COMPLETED" },
      { id: "od-025", testId: "t-025", testCode: "TSH", testName: "TSH", status: "PENDING" },
    ],
  },
];

// ---------- Component ----------

export default function LaboratoryQueuePage() {
  const [activeTab, setActiveTab] = useState<QueueTab>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<LabQueueOrder[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Fetch orders from API (with fallback to mock data)
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getLabQueue({
        status: activeTab !== "ALL" ? activeTab : undefined,
        search: search.trim() || undefined,
      });
      const data = res?.data as { items?: LabQueueOrder[]; total?: number } | LabQueueOrder[] | unknown;
      if (Array.isArray(data)) {
        setOrders(data as LabQueueOrder[]);
        setTotalItems((data as LabQueueOrder[]).length);
      } else if (data && typeof data === "object" && "items" in (data as object)) {
        const d = data as { items: LabQueueOrder[]; total: number };
        setOrders(d.items);
        setTotalItems(d.total);
      } else {
        // Fallback: try to map from orders endpoint
        applyMockData();
      }
    } catch {
      // API not available — use mock data
      applyMockData();
    } finally {
      setIsLoading(false);
    }
  }, [page, activeTab, search]);

  const applyMockData = useCallback(() => {
    const filtered = MOCK_QUEUE_ORDERS.filter((o) => {
      const matchStatus = activeTab === "ALL" || o.status === activeTab;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.patientName.toLowerCase().includes(q) ||
        o.patientMrn.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    setTotalItems(filtered.length);
    const start = (page - 1) * PAGE_SIZE;
    setOrders(filtered.slice(start, start + PAGE_SIZE));
  }, [activeTab, search, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const tabCounts = useMemo(() => {
    const counts: Record<QueueTab, number> = {
      ALL: totalItems,
      PAID: 0,
      SAMPLE_COLLECTED: 0,
      IN_ANALYSIS: 0,
      VERIFIED: 0,
    };
    // When we have order data, count from the current set
    orders.forEach((o) => {
      if (o.status in counts) {
        counts[o.status as QueueTab]++;
      }
    });
    if (activeTab === "ALL") counts.ALL = totalItems;
    return counts;
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
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
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#6B8E6B] text-white shadow-sm"
                    : "text-[#8B8B6B] hover:bg-[#6B8E6B]/10 hover:text-[#6B8E6B]"
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
                      : "bg-[#6B8E6B]/10 text-[#8B8B6B]"
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
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-[#6B8E6B] focus:ring-1 focus:ring-[#6B8E6B]/30 text-foreground placeholder:text-muted-foreground"
            aria-label="Search lab queue"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-[#6B8E6B]/5">
              <th className="px-4 py-3 font-semibold text-[#6B8E6B]">No. Order</th>
              <th className="px-4 py-3 font-semibold text-[#6B8E6B]">Pasien</th>
              <th className="px-4 py-3 font-semibold text-[#6B8E6B] hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 font-semibold text-[#6B8E6B] hidden md:table-cell">Tanggal</th>
              <th className="px-4 py-3 font-semibold text-[#6B8E6B] text-right">Tes</th>
              <th className="w-10 px-4 py-3" aria-label="Expand"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#6B8E6B] border-t-transparent" />
                    Memuat antrian...
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Tidak ada order ditemukan.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
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
          Menampilkan {orders.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {Math.min(page * PAGE_SIZE, totalItems)} dari {totalItems} order
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-[#6B8E6B]/10 hover:text-[#6B8E6B] disabled:opacity-40 disabled:hover:bg-card"
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-[#6B8E6B]/10 hover:text-[#6B8E6B] disabled:opacity-40 disabled:hover:bg-card"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- OrderRow Sub-component ----------

interface OrderRowProps {
  order: LabQueueOrder;
  isExpanded: boolean;
  onToggle: () => void;
}

function OrderRow({ order, isExpanded, onToggle }: OrderRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-border transition-colors hover:bg-[#6B8E6B]/5",
          isExpanded && "bg-[#6B8E6B]/5"
        )}
      >
        <td className="px-4 py-3">
          <span className="font-mono text-xs font-semibold text-[#6B8E6B]">
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
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#6B8E6B]/10 px-2 text-xs font-bold text-[#6B8E6B]">
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
        <tr className="border-b border-border bg-[#6B8E6B]/[0.02]">
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
                        d.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-[#6B8E6B]/10 text-[#6B8E6B]"
                      )}
                      title={d.testName}
                    >
                      {d.testCode}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
