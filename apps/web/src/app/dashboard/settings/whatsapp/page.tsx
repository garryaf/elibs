"use client";

import { useState, useEffect } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState({
    apiUrl: "",
    apiKey: "",
    senderNumber: "",
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiClient
      .get<Record<string, unknown>>("/api/v1/settings?prefix=whatsapp.")
      .then((res) => {
        const envelope = res as Record<string, unknown>;
        const data = (envelope?.data ?? envelope) as Record<string, unknown>;
        if (data && typeof data === "object") {
          setConfig({
            apiUrl: String(data["whatsapp.apiUrl"] || ""),
            apiKey: String(data["whatsapp.apiKey"] || ""),
            senderNumber: String(data["whatsapp.senderNumber"] || ""),
            enabled: data["whatsapp.enabled"] === "true",
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
          { key: "whatsapp.apiUrl", value: config.apiUrl },
          { key: "whatsapp.apiKey", value: config.apiKey },
          { key: "whatsapp.senderNumber", value: config.senderNumber },
          { key: "whatsapp.enabled", value: String(config.enabled) },
        ],
      });
      setMessage({ type: "success", text: "Konfigurasi WhatsApp berhasil disimpan" });
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan konfigurasi" });
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

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Integrasi WhatsApp</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Konfigurasi integrasi WhatsApp untuk pengiriman notifikasi ke pasien.
        </p>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-brand/10 text-brand dark:bg-brand-light dark:text-brand" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Aktifkan WhatsApp</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Kirim notifikasi via WhatsApp</p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input type="checkbox" checked={config.enabled} onChange={(e) => setConfig({ ...config, enabled: e.target.checked })} className="peer sr-only" />
            <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">API URL</label>
          <input type="text" value={config.apiUrl} onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })} placeholder="https://api.whatsapp.gateway.com" className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">API Key</label>
          <input type="password" value={config.apiKey} onChange={(e) => setConfig({ ...config, apiKey: e.target.value })} placeholder="Your API key" className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nomor Pengirim</label>
          <input type="text" value={config.senderNumber} onChange={(e) => setConfig({ ...config, senderNumber: e.target.value })} placeholder="628xxxxxxxxxx" className={inputCls} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </button>
      </div>
    </div>
  );
}
