"use client";

import { useState } from "react";
import { Bell, Filter, Calendar } from "lucide-react";

type NotificationStatus = "PENDING" | "SENT" | "FAILED";
type NotificationType = "EMAIL" | "WHATSAPP";

interface NotificationLog {
  id: string;
  orderNumber: string;
  type: NotificationType;
  recipient: string;
  status: NotificationStatus;
  createdAt: string;
}

const STATUS_STYLES: Record<NotificationStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  SENT: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  FAILED: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

const STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  SENT: "Terkirim",
  FAILED: "Gagal",
};

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // API untuk listing notifikasi belum tersedia
  // Menampilkan empty state
  const notifications: NotificationLog[] = [];
  const loading = false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Log Notifikasi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Riwayat pengiriman notifikasi email dan WhatsApp ke pasien.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Terkirim</option>
            <option value="FAILED">Gagal</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            placeholder="Dari tanggal"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            placeholder="Sampai tanggal"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Order Number</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Tipe</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Penerima</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Bell className="h-7 w-7 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Fitur segera tersedia
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        API untuk listing notifikasi sedang dalam pengembangan.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              notifications.map((notif) => (
                <tr key={notif.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {notif.orderNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      {notif.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {notif.recipient}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[notif.status]}`}
                    >
                      {STATUS_LABELS[notif.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {new Date(notif.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
