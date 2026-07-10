"use client";

import { useState, useEffect } from "react";
import { Mail, Save, Send, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

const defaultSettings: SmtpSettings = {
  host: "",
  port: 587,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: SmtpSettings }>(
        "/api/v1/settings/smtp"
      );
      const data = (res as any)?.data;
      if (data) {
        setSettings({
          host: data.host || "",
          port: data.port || 587,
          username: data.username || "",
          password: data.password || "",
          fromEmail: data.fromEmail || "",
          fromName: data.fromName || "",
        });
      }
    } catch {
      // Settings may not exist yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiClient.put("/api/v1/settings/smtp", settings);
      setMessage({ type: "success", text: "Pengaturan SMTP berhasil disimpan." });
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan pengaturan SMTP. Silakan coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      await apiClient.post("/api/v1/settings/smtp/test");
      setMessage({ type: "success", text: "Email tes berhasil dikirim. Periksa inbox Anda." });
    } catch {
      setMessage({ type: "error", text: "Gagal mengirim email tes. Periksa konfigurasi SMTP." });
    } finally {
      setTesting(false);
    }
  };

  const updateField = (field: keyof SmtpSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#6B8E6B]" />
        <span className="ml-3 text-sm text-slate-500">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Pengaturan Sistem
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Konfigurasi SMTP dan pengaturan sistem lainnya.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* SMTP Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6B8E6B]/10">
            <Mail className="h-5 w-5 text-[#6B8E6B]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Konfigurasi SMTP
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengaturan server email untuk notifikasi sistem
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Host */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                SMTP Host
              </label>
              <input
                type="text"
                value={settings.host}
                onChange={(e) => updateField("host", e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Port */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Port
              </label>
              <input
                type="number"
                value={settings.port}
                onChange={(e) => updateField("port", parseInt(e.target.value) || 587)}
                placeholder="587"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <input
                type="text"
                value={settings.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="user@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                value={settings.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* From Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                From Email
              </label>
              <input
                type="email"
                value={settings.fromEmail}
                onChange={(e) => updateField("fromEmail", e.target.value)}
                placeholder="noreply@lab.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* From Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                From Name
              </label>
              <input
                type="text"
                value={settings.fromName}
                onChange={(e) => updateField("fromName", e.target.value)}
                placeholder="eLIS Laboratory"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-[#6B8E6B] focus:outline-none focus:ring-1 focus:ring-[#6B8E6B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6B8E6B] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#5a7a5a] disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !settings.host}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {testing ? "Mengirim..." : "Test Kirim Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
