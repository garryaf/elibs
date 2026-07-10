"use client";

import { useState, useEffect } from "react";
import { Loader2, Sun, Moon, Monitor } from "lucide-react";
import { apiClient } from "@/lib/api";

type ThemeMode = "light" | "dark" | "system";

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [compactMode, setCompactMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    apiClient
      .get<Record<string, unknown>>("/api/v1/settings?prefix=appearance.")
      .then((res) => {
        const envelope = res as Record<string, unknown>;
        const data = (envelope?.data ?? envelope) as Record<string, unknown>;
        if (data && typeof data === "object") {
          const savedTheme = data["appearance.theme"] as string;
          if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
            setTheme(savedTheme);
          }
          setCompactMode(data["appearance.compactMode"] === "true");
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
          { key: "appearance.theme", value: theme },
          { key: "appearance.compactMode", value: String(compactMode) },
        ],
      });
      setMessage({ type: "success", text: "Pengaturan tampilan berhasil disimpan" });
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan pengaturan" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B8E6B]" />
      </div>
    );
  }

  const themeOptions: { value: ThemeMode; label: string; icon: React.ElementType; description: string }[] = [
    { value: "light", label: "Terang", icon: Sun, description: "Selalu gunakan tema terang" },
    { value: "dark", label: "Gelap", icon: Moon, description: "Selalu gunakan tema gelap" },
    { value: "system", label: "Sistem", icon: Monitor, description: "Ikuti pengaturan perangkat" },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tampilan</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sesuaikan tema dan tampilan antarmuka.
        </p>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-[#6B8E6B]/10 text-[#6B8E6B] dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B]" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Tema</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
                    isSelected
                      ? "border-[#6B8E6B] bg-[#6B8E6B]/5 ring-2 ring-[#6B8E6B]/20 dark:border-[#6B8E6B] dark:bg-[#6B8E6B]/10"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isSelected ? "text-[#6B8E6B]" : "text-slate-500 dark:text-slate-400"}`} />
                  <span className={`text-sm font-medium ${isSelected ? "text-[#6B8E6B]" : "text-slate-700 dark:text-slate-300"}`}>{option.label}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="pr-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Mode Kompak</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Kurangi padding dan jarak antar elemen untuk melihat lebih banyak konten.</p>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} className="peer sr-only" />
            <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#6B8E6B] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5A7D5A] disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>
      </div>
    </div>
  );
}
