"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { Order } from "@/types/order";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { cn } from "@/lib/utils";

interface OrderTableProps {
  orders: Order[];
}

const PAGE_SIZE = 8;

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTable({ orders }: OrderTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const paginated = orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
              {["NO. ORDER", "PASIEN", "PEMERIKSAAN", "TOTAL", "STATUS", "TGL. BUAT", "AKSI"].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-5 py-3.5 text-left text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400",
                    (h === "PEMERIKSAAN") && "hidden lg:table-cell",
                    (h === "TGL. BUAT") && "hidden md:table-cell",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                  Tidak ada order yang ditemukan.
                </td>
              </tr>
            ) : (
              paginated.map((order, idx) => (
                <tr
                  key={order.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-900/50",
                    idx === paginated.length - 1 && "border-b-0"
                  )}
                >
                  {/* Order Number */}
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {order.orderNumber}
                    </span>
                  </td>

                  {/* Patient */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{order.patientName}</div>
                    <div className="font-mono text-xs text-slate-500">{order.patientMrn}</div>
                  </td>

                  {/* Tests summary */}
                  <td className="hidden px-5 py-4 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {order.details.slice(0, 3).map((d) => (
                        <span
                          key={d.id}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        >
                          {d.test.code}
                        </span>
                      ))}
                      {order.details.length > 3 && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                          +{order.details.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {formatRupiah(order.totalAmount)}
                    </div>
                    {order.invoice?.discountAmount ? (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        -{formatRupiah(order.invoice.discountAmount)}
                      </div>
                    ) : null}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>

                  {/* Created At */}
                  <td className="hidden px-5 py-4 text-xs text-slate-500 md:table-cell dark:text-slate-400">
                    {formatDateTime(order.createdAt)}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4">
                    <Link
                      href={order.status === "COMPLETED" ? `/dashboard/orders/${order.id}/report` : `/dashboard/orders/${order.id}`}
                      className="flex w-max items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {order.status === "COMPLETED" ? "Hasil" : "Detail"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, orders.length)}
            </span>{" "}
            dari <span className="font-semibold text-slate-700 dark:text-slate-300">{orders.length}</span> order
          </p>
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
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
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
        </div>
      )}
    </div>
  );
}
