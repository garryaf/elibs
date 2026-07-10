"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

export default function SmtpSettingsPage() {
  const [config, setConfig] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    senderName: "eLIS Laboratory",
    senderEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("garry.afril@gmail.com");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: typeof config }>("/api/v1/settings/smtp")
      .then((res) => {
        const data = (res?.data ?? res) as Record<string, unknown>;
        if (data && typeof data === "object") {
          setConfig({
            host: String(data.host || ""),
            port: Number(data.port) || 587,
            secure: Boolean(data.secure),
            user: String(data.user || ""),
            pass: String(data.pass || ""),
            senderName: String(data.senderName || "eLIS Laboratory"),
            senderEmail: String(data.senderEmail || ""),
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
      await apiClient.put("/api/v1/settings/smtp", config);
      setMessage({ type: "success", text: "Konfigurasi SMTP berhasil disimpan" });
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan konfigurasi" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await apiClient.post<{ success: boolean; data: { success: boolean; message: string } }>(
        "/api/v1/settings/smtp/test",
        { email: testEmail }
      );
      const result = (res?.data ?? res) as { success?: boolean; message?: string };
      if (result.success) {
        setMessage({ type: "success", text: result.message || "Email test berhasil dikirim!" });
      } else {
        setMessage({ type: "error", text: result.message || "Gagal mengirim email test" });
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setMessage({ type: "error", text: apiErr.message || "Gagal mengirim email test" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B8E6B]" />
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Konfigurasi SMTP</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pengaturan server email untuk pengiriman hasil laboratorium.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B]"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">SMTP Host</label>
            <input type="text" value={config.host} onChange={(e) => setConfig({ ...config, host: e.target.value })} placeholder="smtp.gmail.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Port</label>
            <input type="number" value={config.port} onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })} placeholder="587" className={inputCls} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
            <input type="text" value={config.user} onChange={(e) => setConfig({ ...config, user: e.target.value })} placeholder="user@gmail.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input type="password" value={config.pass} onChange={(e) => setConfig({ ...config, pass: e.target.value })} placeholder="App Password" className={inputCls} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Pengirim</label>
            <input type="text" value={config.senderName} onChange={(e) => setConfig({ ...config, senderName: e.target.value })} placeholder="eLIS Laboratory" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Pengirim</label>
            <input type="email" value={config.senderEmail} onChange={(e) => setConfig({ ...config, senderEmail: e.target.value })} placeholder="lab@clinic.com" className={inputCls} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={config.secure} onChange={(e) => setConfig({ ...config, secure: e.target.checked })} className="peer sr-only" />
            <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#6B8E6B] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
          </label>
          <span className="text-sm text-slate-700 dark:text-slate-300">Gunakan TLS/SSL (port 465)</span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A7D5A] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </button>
      </div>

      {/* Test Email Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Kirim Email Test</h4>
        <div className="flex gap-2">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className={`flex-1 ${inputCls}`} />
          <button onClick={handleTest} disabled={testing} className="flex items-center gap-2 rounded-xl border border-[#6B8E6B]/30 bg-[#6B8E6B]/10 px-4 py-2.5 text-sm font-semibold text-[#6B8E6B] hover:bg-[#6B8E6B]/20 disabled:opacity-50 dark:border-[#6B8E6B]/50 dark:bg-[#6B8E6B]/10 dark:text-[#6B8E6B]">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {testing ? "Mengirim..." : "Kirim Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
