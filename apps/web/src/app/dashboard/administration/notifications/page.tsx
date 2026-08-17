"use client";

import { useState } from "react";
import { 
  Bell, 
  Filter, 
  RotateCcw, 
  Mail, 
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useNotifications, useRetryNotification } from "@/services/notifications";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/ToastContainer";

type NotificationStatus = "PENDING" | "SENT" | "FAILED";
type NotificationType = "EMAIL" | "WHATSAPP";

interface NotificationLog {
  id: string;
  orderId: string;
  orderNumber?: string;
  order?: {
    orderNumber: string;
  };
  type: NotificationType;
  recipient: string;
  status: NotificationStatus;
  attempts: number;
  lastError?: string;
  sentAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<NotificationStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50",
  SENT: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50",
  FAILED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/50",
};

const STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  SENT: "Terkirim",
  FAILED: "Gagal",
};

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const { toasts, success, error: showError, dismiss } = useToast();

  const { data, isLoading, error, refetch } = useNotifications({
    page,
    limit: PAGE_SIZE,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
  });

  const retryMutation = useRetryNotification();

  const handleRetry = async (id: string) => {
    try {
      await retryMutation.mutateAsync(id);
      success("Proses pengiriman ulang berhasil dimasukkan ke antrian.");
    } catch (err) {
      showError("Gagal melakukan pengiriman ulang notifikasi.");
    }
  };

  const envelope = data as any;
  const notifications: NotificationLog[] = envelope?.data || [];
  const meta = envelope?.meta || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Toast Messages */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand" />
            Log Notifikasi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Riwayat pengiriman notifikasi email dan WhatsApp ke pasien.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Filter</span>
          
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Terkirim</option>
            <option value="FAILED">Gagal</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">Semua Media</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-500">No. Order</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-500">Media</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-500">Penerima</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-500">Percobaan</th>
                <th className="px-5 py-3.5 text-left font-semibold text-slate-500">Tanggal</th>
                <th className="px-5 py-3.5 text-right font-semibold text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-4">
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-red-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-red-500" />
                      <p>Gagal memuat log notifikasi.</p>
                      <button onClick={() => refetch()} className="text-xs text-brand font-semibold hover:underline">Coba Lagi</button>
                    </div>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Bell className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          Tidak ada log notifikasi
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Belum ada notifikasi yang dikirim atau cocok dengan filter.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                notifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-brand">
                      {notif.order?.orderNumber || notif.orderNumber || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {notif.type === "EMAIL" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {notif.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-medium">
                      {notif.recipient}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[notif.status]}`}
                        >
                          {STATUS_LABELS[notif.status]}
                        </span>
                        {notif.lastError && (
                          <p className="text-[10px] text-red-500 max-w-xs truncate" title={notif.lastError}>
                            {notif.lastError}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                      {notif.attempts}x
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400 text-xs">
                      {new Date(notif.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(notif.status === "FAILED" || notif.status === "PENDING") && (
                        <button
                          onClick={() => handleRetry(notif.id)}
                          disabled={retryMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 px-5 py-4">
            <p className="text-xs text-slate-500">
              Menampilkan {meta.total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, meta.total)} dari {meta.total} log notifikasi
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {page} / {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
