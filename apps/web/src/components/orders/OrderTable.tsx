"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import type { Order } from "@/types/order";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { ColumnToggle, useColumnVisibility } from "@/components/ui/ColumnToggle";
import type { ColumnDef } from "@/components/ui/ColumnToggle";

// ─── Sort Types ───────────────────────────────────────────────────────────────

export type SortField = "orderNumber" | "patientName" | "status" | "totalAmount" | "createdAt";
export type SortDir = "asc" | "desc";

interface OrderTableProps {
  orders: Order[];
  sortField?: SortField;
  sortDir?: SortDir;
  onSort?: (field: SortField) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const ORDER_COLUMNS: ColumnDef[] = [
  { key: "order_number", label: "No. Order",        required: true },
  { key: "patient",      label: "Pasien" },
  { key: "tests",        label: "Pemeriksaan" },
  { key: "total",        label: "Total" },
  { key: "status",       label: "Status" },
  { key: "created_at",   label: "Tgl. Buat" },
  { key: "actions",      label: "Aksi",             required: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SortIcon({ field, activeField, dir }: { field: SortField; activeField?: SortField; dir?: SortDir }) {
  if (field !== activeField) {
    return <ChevronDown className="h-3 w-3 opacity-30" />;
  }
  return dir === "asc"
    ? <ChevronUp className="h-3 w-3 text-brand" />
    : <ChevronDown className="h-3 w-3 text-brand" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderTable({ orders, sortField, sortDir, onSort }: OrderTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const paginated = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ─── Column visibility ────────────────────────────────────────────────────
  const [colVisibility, setColVisibility] = useColumnVisibility("order-table-columns", ORDER_COLUMNS);

  // Compute colSpan dynamically
  const visibleColCount = ORDER_COLUMNS.filter((c) => colVisibility[c.key] !== false).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-brand/5">
              {/* NO. ORDER — always visible */}
              <th
                onClick={() => onSort?.("orderNumber")}
                className={cn(
                  "px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand",
                  onSort && "cursor-pointer select-none hover:text-brand-dark",
                )}
              >
                <span className="inline-flex items-center gap-1">
                  NO. ORDER
                  {onSort && <SortIcon field="orderNumber" activeField={sortField} dir={sortDir} />}
                </span>
              </th>

              {/* PASIEN */}
              {colVisibility["patient"] !== false && (
                <th
                  onClick={() => onSort?.("patientName")}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand",
                    onSort && "cursor-pointer select-none hover:text-brand-dark",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    PASIEN
                    {onSort && <SortIcon field="patientName" activeField={sortField} dir={sortDir} />}
                  </span>
                </th>
              )}

              {/* PEMERIKSAAN */}
              {colVisibility["tests"] !== false && (
                <th className="hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand lg:table-cell">
                  PEMERIKSAAN
                </th>
              )}

              {/* TOTAL */}
              {colVisibility["total"] !== false && (
                <th
                  onClick={() => onSort?.("totalAmount")}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand",
                    onSort && "cursor-pointer select-none hover:text-brand-dark",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    TOTAL
                    {onSort && <SortIcon field="totalAmount" activeField={sortField} dir={sortDir} />}
                  </span>
                </th>
              )}

              {/* STATUS */}
              {colVisibility["status"] !== false && (
                <th
                  onClick={() => onSort?.("status")}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand",
                    onSort && "cursor-pointer select-none hover:text-brand-dark",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    STATUS
                    {onSort && <SortIcon field="status" activeField={sortField} dir={sortDir} />}
                  </span>
                </th>
              )}

              {/* TGL. BUAT */}
              {colVisibility["created_at"] !== false && (
                <th
                  onClick={() => onSort?.("createdAt")}
                  className={cn(
                    "hidden px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand md:table-cell",
                    onSort && "cursor-pointer select-none hover:text-brand-dark",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    TGL. BUAT
                    {onSort && <SortIcon field="createdAt" activeField={sortField} dir={sortDir} />}
                  </span>
                </th>
              )}

              {/* AKSI — always visible */}
              <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-brand">
                AKSI
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={visibleColCount} className="py-16 text-center text-sm text-slate-400">
                  Tidak ada order yang ditemukan.
                </td>
              </tr>
            ) : (
              paginated.map((order, idx) => (
                <tr
                  key={order.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50 even:bg-slate-50/50 dark:even:bg-slate-900/30",
                    idx === paginated.length - 1 && "border-b-0"
                  )}
                >
                  {/* Order Number — always visible */}
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-brand">
                      {order.orderNumber}
                    </span>
                  </td>

                  {/* Patient */}
                  {colVisibility["patient"] !== false && (
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{order.patientName}</div>
                      <div className="font-mono text-xs text-slate-500">{order.patientMrn}</div>
                    </td>
                  )}

                  {/* Tests summary */}
                  {colVisibility["tests"] !== false && (
                    <td className="hidden px-5 py-4 lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {order.details.slice(0, 3).map((d) => (
                          <span
                            key={d.id}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {d.test?.code ?? "—"}
                          </span>
                        ))}
                        {order.details.length > 3 && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                            +{order.details.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Total */}
                  {colVisibility["total"] !== false && (
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {formatRupiah(Number(order.totalAmount))}
                      </div>
                      {order.invoice?.discountAmount ? (
                        <div className="text-xs text-brand">
                          -{formatRupiah(Number(order.invoice.discountAmount))}
                        </div>
                      ) : null}
                    </td>
                  )}

                  {/* Status */}
                  {colVisibility["status"] !== false && (
                    <td className="px-5 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                  )}

                  {/* Created At */}
                  {colVisibility["created_at"] !== false && (
                    <td className="hidden px-5 py-4 text-xs text-slate-500 md:table-cell dark:text-slate-400">
                      {formatDateTime(order.createdAt)}
                    </td>
                  )}

                  {/* Action — always visible */}
                  <td className="px-5 py-4">
                    <Link
                      href={order.status === "APPROVED" || order.status === "NOTIFIED" ? `/dashboard/orders/${order.id}/report` : `/dashboard/orders/${order.id}`}
                      className="flex w-max items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-brand/50 hover:bg-brand/10 hover:text-brand"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {order.status === "APPROVED" || order.status === "NOTIFIED" ? "Hasil" : "Detail"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + Column Toggle */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 flex-wrap gap-3">
        {totalPages > 1 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, orders.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-700 dark:text-slate-300">{orders.length}</span> order
          </p>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-3 ml-auto">
          {/* Column Toggle */}
          <ColumnToggle
            columns={ORDER_COLUMNS}
            visibility={colVisibility}
            onChange={setColVisibility}
          />

          {/* Page navigation — only shown when more than 1 page */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                id="order-table-prev"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  id={`order-table-page-${i + 1}`}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all",
                    currentPage === i + 1
                      ? "bg-brand text-white shadow-sm"
                      : "border border-border bg-card text-muted-foreground hover:bg-brand/10"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                id="order-table-next"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
