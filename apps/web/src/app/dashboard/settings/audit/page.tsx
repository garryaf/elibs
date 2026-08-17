"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Save, Clock, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";

interface AuditSettings {
  retentionDays: number;
  lastArchivalRun: string | null;
  archivalCron: string;
}

export default function AuditSettingsPage() {
  const [settings, setSettings] = useState<AuditSettings>({
    retentionDays: 365,
    lastArchivalRun: null,
    archivalCron: "0 2 * * *",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSettings("audit_");
      const envelope = (res as unknown as { data?: unknown })?.data ?? res;

      if (envelope && typeof envelope === "object") {
        const data = envelope as Record<string, string>;
        setSettings({
          retentionDays: data["audit_retention_days"]
            ? parseInt(data["audit_retention_days"], 10)
            : 365,
          lastArchivalRun: data["audit_last_archival_run"] || null,
          archivalCron: data["audit_archival_cron"] || "0 2 * * *",
        });
      }
    } catch {
      // Use defaults on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await apiClient.updateSettingsBulk([
        { key: "audit_retention_days", value: String(settings.retentionDays) },
        { key: "audit_archival_cron", value: settings.archivalCron },
      ]);
      setSaveMessage({ type: "success", text: "Pengaturan audit berhasil disimpan." });
    } catch {
      setSaveMessage({ type: "error", text: "Gagal menyimpan pengaturan. Silakan coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  function formatCronDescription(cron: string): string {
    // Simple cron description for common patterns
    if (cron === "0 2 * * *") return "Setiap hari pukul 02:00 WIB";
    if (cron === "0 0 * * *") return "Setiap hari pukul 00:00 WIB";
    if (cron === "0 3 * * *") return "Setiap hari pukul 03:00 WIB";
    if (cron === "0 0 * * 0") return "Setiap Minggu pukul 00:00 WIB";
    if (cron === "0 0 1 * *") return "Setiap tanggal 1 pukul 00:00 WIB";
    return `Jadwal kustom: ${cron}`;
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
        <div className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Pengaturan Audit Trail
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Konfigurasi retensi data dan jadwal arsip audit log
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              saveMessage.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {saveMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}

        {/* Retention Policy */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
              <Database className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Kebijakan Retensi Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tentukan berapa lama audit log disimpan sebelum diarsipkan
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Periode Retensi (hari)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={30}
                  max={3650}
                  value={settings.retentionDays}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      retentionDays: Math.max(30, parseInt(e.target.value, 10) || 30),
                    }))
                  }
                  className="h-10 w-32 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  hari ({Math.round(settings.retentionDays / 30)} bulan)
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Audit log yang lebih lama dari periode ini akan dihapus secara otomatis oleh job arsip.
                Minimum 30 hari, default 365 hari.
              </p>
            </div>
          </div>
        </div>

        {/* Scheduled Job Configuration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Jadwal Arsip Otomatis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Job BullMQ yang berjalan secara berkala untuk membersihkan audit log lama
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Jadwal Cron
              </label>
              <select
                value={settings.archivalCron}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    archivalCron: e.target.value,
                  }))
                }
                className="h-10 w-full max-w-sm rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 text-foreground"
              >
                <option value="0 0 * * *">Setiap hari pukul 00:00</option>
                <option value="0 2 * * *">Setiap hari pukul 02:00 (default)</option>
                <option value="0 3 * * *">Setiap hari pukul 03:00</option>
                <option value="0 0 * * 0">Setiap Minggu pukul 00:00</option>
                <option value="0 0 1 * *">Setiap tanggal 1 pukul 00:00</option>
              </select>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                {formatCronDescription(settings.archivalCron)}
              </p>
            </div>

            {/* Last Run Info */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Eksekusi Terakhir:
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {settings.lastArchivalRun
                    ? new Date(settings.lastArchivalRun).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Belum pernah dijalankan"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">Catatan Penting</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-600 dark:text-amber-400">
                <li>Audit log yang sudah diarsipkan tidak dapat dikembalikan.</li>
                <li>Pastikan periode retensi sesuai dengan kebijakan regulasi yang berlaku.</li>
                <li>Tabel audit_logs dilindungi dari perubahan manual (immutable) di tingkat database.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>
    </RoleGuard>
  );
}
