"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

interface NotificationPreferences {
  emailOnResultReady: boolean;
  emailOnOrderCreated: boolean;
  emailOnPaymentReceived: boolean;
  emailDailyReport: boolean;
}

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailOnResultReady: true,
    emailOnOrderCreated: false,
    emailOnPaymentReceived: true,
    emailDailyReport: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiClient
      .get<Record<string, unknown>>("/api/v1/settings?prefix=notification.")
      .then((res) => {
        const envelope = res as Record<string, unknown>;
        const data = (envelope?.data ?? envelope) as Record<string, unknown>;
        if (data && typeof data === "object") {
          setPreferences({
            emailOnResultReady: data["notification.emailOnResultReady"] !== "false",
            emailOnOrderCreated: data["notification.emailOnOrderCreated"] === "true",
            emailOnPaymentReceived: data["notification.emailOnPaymentReceived"] !== "false",
            emailDailyReport: data["notification.emailDailyReport"] === "true",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put("/api/v1/settings/bulk", {
        entries: [
          { key: "notification.emailOnResultReady", value: String(preferences.emailOnResultReady) },
          { key: "notification.emailOnOrderCreated", value: String(preferences.emailOnOrderCreated) },
          { key: "notification.emailOnPaymentReceived", value: String(preferences.emailOnPaymentReceived) },
          { key: "notification.emailDailyReport", value: String(preferences.emailDailyReport) },
        ],
      });
      setMessage({ type: "success", text: "Preferensi notifikasi berhasil disimpan" });
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan preferensi" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  const toggleItems = [
    { key: "emailOnResultReady" as const, label: "Hasil Pemeriksaan Siap", description: "Kirim email saat hasil pemeriksaan laboratorium selesai dan siap diambil." },
    { key: "emailOnOrderCreated" as const, label: "Order Baru Dibuat", description: "Kirim email saat order laboratorium baru dibuat." },
    { key: "emailOnPaymentReceived" as const, label: "Pembayaran Diterima", description: "Kirim email konfirmasi pembayaran kepada pasien." },
    { key: "emailDailyReport" as const, label: "Laporan Harian", description: "Kirim ringkasan laporan harian ke email admin setiap pagi." },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preferensi Notifikasi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Atur jenis notifikasi email yang ingin dikirimkan oleh sistem.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-brand/10 text-brand dark:bg-brand-light dark:text-brand"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {toggleItems.map((item) => (
          <div key={item.key} className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="pr-4">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={preferences[item.key]}
                onChange={(e) => setPreferences((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan Preferensi"}
        </button>
      </div>
    </div>
  );
}
