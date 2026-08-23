"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Building2,
  Globe,
  Hash,
  Clock,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ImageIcon,
  Upload,
  Download,
  X,
  Wrench,
  LayoutGrid,
  DatabaseBackup,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { z } from "zod";

// ─── Zod Schema for client-side validation ────────────────────────────────────

const generalSettingsSchema = z.object({
  // Facility identity (BIZ-GEN-01)
  facilityName: z.string().min(1, "Nama fasilitas wajib diisi").max(255),
  facilityCode: z.string().max(50).optional().or(z.literal("")),
  facilityType: z.enum(["HOSPITAL", "CLINIC", "STANDALONE_LAB"]),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  province: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(10).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  fax: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Format email tidak valid").max(255).optional().or(z.literal("")),
  website: z.string().max(255).optional().or(z.literal("")),
  npwp: z.string().max(30).optional().or(z.literal("")),
  licenseNumber: z.string().max(100).optional().or(z.literal("")),
  accreditation: z.string().max(100).optional().or(z.literal("")),

  // Regional (BIZ-GEN-03)
  timezone: z.string().max(50),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"]),
  currency: z.string().max(10),
  locale: z.enum(["id-ID", "en-US"]),
  numberFormat: z.enum(["1.000,50", "1,000.50"]),

  // Numbering (BIZ-GEN-04)
  orderNumberFormat: z.string().max(100),
  orderNumberReset: z.enum(["DAILY", "MONTHLY", "YEARLY", "NEVER"]),
  visitNumberFormat: z.string().max(100),
  invoiceNumberFormat: z.string().max(100),
  mrnFormat: z.string().max(100),

  // Operational (BIZ-GEN-05)
  operatingHoursStart: z.string().max(5),
  operatingHoursEnd: z.string().max(5),
  operatingDays: z.string().max(50),
  is24h: z.boolean(),

  // Session & Security (BIZ-GEN-06)
  sessionTimeoutMinutes: z.number().min(5, "Minimum 5 menit").max(1440, "Maximum 1440 menit"),
  autoLogoutIdleMinutes: z.number().min(5, "Minimum 5 menit").max(1440, "Maximum 1440 menit"),
  maxLoginAttempts: z.number().min(1, "Minimum 1").max(20, "Maximum 20"),
  lockoutDurationMinutes: z.number().min(1, "Minimum 1 menit").max(1440, "Maximum 1440 menit"),
  passwordMinLength: z.number().min(6, "Minimum 6 karakter").max(128, "Maximum 128 karakter"),
  requirePasswordChangeDays: z.number().min(0, "Minimum 0 (nonaktif)").max(365, "Maximum 365 hari"),

  // Maintenance & Backup (BIZ-GEN-07)
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500).optional().or(z.literal("")),
  backupScheduleCron: z.string().max(50),

  // Pagination & Display (BIZ-GEN-08)
  defaultPageSize: z.number().min(5, "Minimum 5").max(100, "Maximum 100"),
  defaultSortOrder: z.enum(["ASC", "DESC"]),
  dashboardDataRetentionDays: z.number().min(1, "Minimum 1 hari").max(365, "Maximum 365 hari"),
});

type GeneralSettings = z.infer<typeof generalSettingsSchema>;

// ─── Default values ───────────────────────────────────────────────────────────

const defaultSettings: GeneralSettings = {
  facilityName: "",
  facilityCode: "",
  facilityType: "STANDALONE_LAB",
  address: "",
  city: "",
  province: "",
  postalCode: "",
  phone: "",
  fax: "",
  email: "",
  website: "",
  npwp: "",
  licenseNumber: "",
  accreditation: "",
  timezone: "Asia/Jakarta",
  dateFormat: "DD/MM/YYYY",
  currency: "IDR",
  locale: "id-ID",
  numberFormat: "1.000,50",
  orderNumberFormat: "LAB-{YYYY}{MM}-{SEQ:5}",
  orderNumberReset: "MONTHLY",
  visitNumberFormat: "VIS-{YYYY}{MM}{DD}-{SEQ:4}",
  invoiceNumberFormat: "INV/{YYYY}/{SEQ:4}",
  mrnFormat: "MRN-{YYYY}-{SEQ:6}",
  operatingHoursStart: "07:00",
  operatingHoursEnd: "21:00",
  operatingDays: "MON,TUE,WED,THU,FRI,SAT",
  is24h: false,
  sessionTimeoutMinutes: 60,
  autoLogoutIdleMinutes: 30,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  passwordMinLength: 8,
  requirePasswordChangeDays: 0,
  maintenanceMode: false,
  maintenanceMessage: "",
  backupScheduleCron: "0 2 * * *",
  defaultPageSize: 20,
  defaultSortOrder: "DESC",
  dashboardDataRetentionDays: 30,
};

// ─── Logo/Branding state ──────────────────────────────────────────────────────

interface LogoState {
  logoUrl: string;
  logoSmallUrl: string;
  reportHeaderImage: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [logos, setLogos] = useState<LogoState>({ logoUrl: "", logoSmallUrl: "", reportHeaderImage: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoSmallInputRef = useRef<HTMLInputElement>(null);
  const reportHeaderInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Record<string, unknown>>("/api/v1/settings/general");
      const data = (res as unknown as { data?: unknown })?.data ?? res;
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        setSettings({
          facilityName: String(d.facilityName || ""),
          facilityCode: String(d.facilityCode || ""),
          facilityType: (d.facilityType as GeneralSettings["facilityType"]) || "STANDALONE_LAB",
          address: String(d.address || ""),
          city: String(d.city || ""),
          province: String(d.province || ""),
          postalCode: String(d.postalCode || ""),
          phone: String(d.phone || ""),
          fax: String(d.fax || ""),
          email: String(d.email || ""),
          website: String(d.website || ""),
          npwp: String(d.npwp || ""),
          licenseNumber: String(d.licenseNumber || ""),
          accreditation: String(d.accreditation || ""),
          timezone: String(d.timezone || "Asia/Jakarta"),
          dateFormat: (d.dateFormat as GeneralSettings["dateFormat"]) || "DD/MM/YYYY",
          currency: String(d.currency || "IDR"),
          locale: (d.locale as GeneralSettings["locale"]) || "id-ID",
          numberFormat: (d.numberFormat as GeneralSettings["numberFormat"]) || "1.000,50",
          orderNumberFormat: String(d.orderNumberFormat || "LAB-{YYYY}{MM}-{SEQ:5}"),
          orderNumberReset: (d.orderNumberReset as GeneralSettings["orderNumberReset"]) || "MONTHLY",
          visitNumberFormat: String(d.visitNumberFormat || "VIS-{YYYY}{MM}{DD}-{SEQ:4}"),
          invoiceNumberFormat: String(d.invoiceNumberFormat || "INV/{YYYY}/{SEQ:4}"),
          mrnFormat: String(d.mrnFormat || "MRN-{YYYY}-{SEQ:6}"),
          operatingHoursStart: String(d.operatingHoursStart || "07:00"),
          operatingHoursEnd: String(d.operatingHoursEnd || "21:00"),
          operatingDays: String(d.operatingDays || "MON,TUE,WED,THU,FRI,SAT"),
          is24h: d.is24h === true,
          sessionTimeoutMinutes: Number(d.sessionTimeoutMinutes) || 60,
          autoLogoutIdleMinutes: Number(d.autoLogoutIdleMinutes) || 30,
          maxLoginAttempts: Number(d.maxLoginAttempts) || 5,
          lockoutDurationMinutes: Number(d.lockoutDurationMinutes) || 30,
          passwordMinLength: Number(d.passwordMinLength) || 8,
          requirePasswordChangeDays: Number(d.requirePasswordChangeDays) || 0,
          maintenanceMode: d.maintenanceMode === true,
          maintenanceMessage: String(d.maintenanceMessage || ""),
          backupScheduleCron: String(d.backupScheduleCron || "0 2 * * *"),
          defaultPageSize: Number(d.defaultPageSize) || 20,
          defaultSortOrder: (d.defaultSortOrder as GeneralSettings["defaultSortOrder"]) || "DESC",
          dashboardDataRetentionDays: Number(d.dashboardDataRetentionDays) || 30,
        });
        setLogos({
          logoUrl: String(d.logoUrl || ""),
          logoSmallUrl: String(d.logoSmallUrl || ""),
          reportHeaderImage: String(d.reportHeaderImage || ""),
        });
        setLastBackupAt(d.lastBackupAt ? String(d.lastBackupAt) : null);
      }
    } catch {
      // Use defaults on failure
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const updateField = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async () => {
    const result = generalSettingsSchema.safeParse(settings);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setMessage({ type: "error", text: "Periksa kembali isian yang belum valid" });
      return;
    }

    setSaving(true);
    setMessage(null);
    setErrors({});

    try {
      await apiClient.put("/api/v1/settings/general", settings);
      setMessage({ type: "success", text: "Konfigurasi sistem berhasil disimpan" });
      setIsDirty(false);
    } catch {
      setMessage({ type: "error", text: "Gagal menyimpan konfigurasi. Silakan coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchSettings();
    setErrors({});
    setMessage(null);
  };

  // ─── Logo Upload ────────────────────────────────────────────────────────────

  const handleLogoUpload = async (file: File, type: "logo" | "logo_small" | "report_header") => {
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Ukuran file maksimal 2MB" });
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Format file tidak didukung. Gunakan PNG, JPEG, SVG, atau WebP." });
      return;
    }

    setUploadingLogo(type);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const token = typeof window !== "undefined" ? localStorage.getItem("elis_token") : null;
      const response = await fetch("/api/v1/settings/general/logo", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      const data = result?.data ?? result;

      if (data?.url) {
        const key = type === "logo" ? "logoUrl" : type === "logo_small" ? "logoSmallUrl" : "reportHeaderImage";
        setLogos((prev) => ({ ...prev, [key]: data.url }));
        setMessage({ type: "success", text: "Logo berhasil diupload" });
      }
    } catch {
      setMessage({ type: "error", text: "Gagal mengupload logo. Silakan coba lagi." });
    } finally {
      setUploadingLogo(null);
    }
  };

  // ─── Export / Import ────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("elis_token") : null;
      const response = await fetch("/api/v1/settings/export", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Export failed");
      const result = await response.json();
      const exportData = result?.data ?? result;

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `elis-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: "Settings berhasil diexport" });
    } catch {
      setMessage({ type: "error", text: "Gagal mengexport settings" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!file.name.endsWith(".json")) {
      setMessage({ type: "error", text: "File harus berformat JSON" });
      return;
    }

    if (file.size > 1024 * 1024) {
      setMessage({ type: "error", text: "Ukuran file maksimal 1MB" });
      return;
    }

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Support both { data: {...} } envelope and flat object
      const importData = parsed?.data ?? parsed;
      if (typeof importData !== "object" || Array.isArray(importData)) {
        throw new Error("Invalid format");
      }

      const res = await apiClient.post<{ imported?: number; skipped?: number; message?: string }>(
        "/api/v1/settings/import",
        { data: importData, overwrite: true },
      );

      const result = (res as unknown as { data?: unknown })?.data ?? res;
      const r = result as { imported?: number; skipped?: number; message?: string };
      setMessage({
        type: "success",
        text: r.message || `${r.imported ?? 0} settings diimport, ${r.skipped ?? 0} diskip.`,
      });

      // Reload settings after import
      fetchSettings();
    } catch (err) {
      const msg = err instanceof SyntaxError ? "File JSON tidak valid" : "Gagal mengimport settings";
      setMessage({ type: "error", text: msg });
    } finally {
      setImporting(false);
    }
  };

  // ─── Rendering ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
        <div className="space-y-6">
          <div className="animate-pulse space-y-2">
            <div className="h-6 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-72 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-56 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </RoleGuard>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

  const selectCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  const errorCls = "border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700";

  const labelCls = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

  // Generate number format preview
  const getNumberPreview = (format: string): string => {
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");

    return format
      .replace("{YYYY}", yyyy)
      .replace("{MM}", mm)
      .replace("{DD}", dd)
      .replace(/\{SEQ:(\d+)\}/, (_, len) => "1".padStart(Number(len), "0"));
  };

  const formatCronDescription = (cron: string): string => {
    if (cron === "0 2 * * *") return "Setiap hari pukul 02:00";
    if (cron === "0 0 * * *") return "Setiap hari pukul 00:00";
    if (cron === "0 3 * * *") return "Setiap hari pukul 03:00";
    if (cron === "0 0 * * 0") return "Setiap Minggu pukul 00:00";
    if (cron === "0 0 1 * *") return "Setiap tanggal 1 pukul 00:00";
    return `Jadwal kustom: ${cron}`;
  };

  // Logo upload card component
  const LogoUploadCard = ({
    label,
    description,
    currentUrl,
    type,
    inputRef,
  }: {
    label: string;
    description: string;
    currentUrl: string;
    type: "logo" | "logo_small" | "report_header";
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{label}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{description}</p>

      {currentUrl ? (
        <div className="relative mb-3">
          <img
            src={currentUrl}
            alt={label}
            className="h-16 max-w-[200px] rounded-lg border border-slate-200 object-contain bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            onClick={() => {
              const key = type === "logo" ? "logoUrl" : type === "logo_small" ? "logoSmallUrl" : "reportHeaderImage";
              setLogos((prev) => ({ ...prev, [key]: "" }));
            }}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="mb-3 flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
          <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleLogoUpload(file, type);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploadingLogo === type}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {uploadingLogo === type ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        {uploadingLogo === type ? "Uploading..." : "Upload"}
      </button>
    </div>
  );

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Konfigurasi Sistem
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pengaturan umum fasilitas, regional, penomoran, keamanan, dan operasional
          </p>
        </div>

        {/* Save Message */}
        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 1: Identitas Fasilitas (BIZ-GEN-01)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
              <Building2 className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Identitas Fasilitas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informasi dasar fasilitas yang ditampilkan di laporan dan printout
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Nama Fasilitas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.facilityName}
                  onChange={(e) => updateField("facilityName", e.target.value)}
                  placeholder="RS Mitra Keluarga Depok"
                  className={`${inputCls} ${errors.facilityName ? errorCls : ""}`}
                />
                {errors.facilityName && (
                  <p className="mt-1 text-xs text-red-500">{errors.facilityName}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Tipe Fasilitas</label>
                <select
                  value={settings.facilityType}
                  onChange={(e) => updateField("facilityType", e.target.value as GeneralSettings["facilityType"])}
                  className={selectCls}
                >
                  <option value="HOSPITAL">Rumah Sakit</option>
                  <option value="CLINIC">Klinik</option>
                  <option value="STANDALONE_LAB">Laboratorium</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Kode Faskes</label>
                <input
                  type="text"
                  value={settings.facilityCode}
                  onChange={(e) => updateField("facilityCode", e.target.value)}
                  placeholder="3674001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Nomor Izin Operasional</label>
                <input
                  type="text"
                  value={settings.licenseNumber}
                  onChange={(e) => updateField("licenseNumber", e.target.value)}
                  placeholder="503/0123/DINKES/2024"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Alamat</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Jl. Margonda Raya No. 1"
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Kota</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Depok"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Provinsi</label>
                <input
                  type="text"
                  value={settings.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  placeholder="Jawa Barat"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Kode Pos</label>
                <input
                  type="text"
                  value={settings.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  placeholder="16431"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Telepon</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(021) 7721234"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Fax</label>
                <input
                  type="text"
                  value={settings.fax}
                  onChange={(e) => updateField("fax", e.target.value)}
                  placeholder="(021) 7721235"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="lab@mitrakeluarga.com"
                  className={`${inputCls} ${errors.email ? errorCls : ""}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input
                  type="text"
                  value={settings.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://www.mitrakeluarga.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>NPWP</label>
                <input
                  type="text"
                  value={settings.npwp}
                  onChange={(e) => updateField("npwp", e.target.value)}
                  placeholder="01.234.567.8-012.345"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Akreditasi</label>
                <input
                  type="text"
                  value={settings.accreditation}
                  onChange={(e) => updateField("accreditation", e.target.value)}
                  placeholder="ISO 15189:2022, KALK Paripurna"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 2: Logo & Branding (BIZ-GEN-02)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <ImageIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Logo & Branding
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logo fasilitas untuk laporan, kop surat, dan email. Format: PNG, JPEG, SVG, WebP (maks 2MB)
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <LogoUploadCard
              label="Logo Utama"
              description="Digunakan di header dashboard dan laporan"
              currentUrl={logos.logoUrl}
              type="logo"
              inputRef={logoInputRef}
            />
            <LogoUploadCard
              label="Logo Kecil / Favicon"
              description="Ikon kecil untuk tab browser dan sidebar"
              currentUrl={logos.logoSmallUrl}
              type="logo_small"
              inputRef={logoSmallInputRef}
            />
            <LogoUploadCard
              label="Header Laporan"
              description="Gambar kop surat untuk print hasil lab"
              currentUrl={logos.reportHeaderImage}
              type="report_header"
              inputRef={reportHeaderInputRef}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 3: Regional & Locale (BIZ-GEN-03)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Globe className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Regional & Locale
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Format tanggal, angka, dan zona waktu yang digunakan di seluruh sistem
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Zona Waktu</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  className={selectCls}
                >
                  <option value="Asia/Jakarta">WIB — Asia/Jakarta (UTC+7)</option>
                  <option value="Asia/Makassar">WITA — Asia/Makassar (UTC+8)</option>
                  <option value="Asia/Jayapura">WIT — Asia/Jayapura (UTC+9)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Format Tanggal</label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => updateField("dateFormat", e.target.value as GeneralSettings["dateFormat"])}
                  className={selectCls}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (22/08/2026)</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY (22-08-2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-22)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (08/22/2026)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Mata Uang</label>
                <select
                  value={settings.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  className={selectCls}
                >
                  <option value="IDR">IDR — Rupiah</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="MYR">MYR — Ringgit</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Bahasa</label>
                <select
                  value={settings.locale}
                  onChange={(e) => updateField("locale", e.target.value as GeneralSettings["locale"])}
                  className={selectCls}
                >
                  <option value="id-ID">Bahasa Indonesia</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Format Angka</label>
                <select
                  value={settings.numberFormat}
                  onChange={(e) => updateField("numberFormat", e.target.value as GeneralSettings["numberFormat"])}
                  className={selectCls}
                >
                  <option value="1.000,50">1.000,50 (Indonesia)</option>
                  <option value="1,000.50">1,000.50 (US/International)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 4: Format Penomoran (BIZ-GEN-04)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Hash className="h-5 w-5 text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Format Penomoran Otomatis
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfigurasi template auto-numbering untuk order, visit, invoice, dan rekam medis
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Format Nomor Order</label>
                <input
                  type="text"
                  value={settings.orderNumberFormat}
                  onChange={(e) => updateField("orderNumberFormat", e.target.value)}
                  placeholder="LAB-{YYYY}{MM}-{SEQ:5}"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Preview: <span className="font-mono text-slate-600 dark:text-slate-300">{getNumberPreview(settings.orderNumberFormat)}</span>
                </p>
              </div>
              <div>
                <label className={labelCls}>Reset Counter</label>
                <select
                  value={settings.orderNumberReset}
                  onChange={(e) => updateField("orderNumberReset", e.target.value as GeneralSettings["orderNumberReset"])}
                  className={selectCls}
                >
                  <option value="DAILY">Harian</option>
                  <option value="MONTHLY">Bulanan</option>
                  <option value="YEARLY">Tahunan</option>
                  <option value="NEVER">Tidak Pernah</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Format Nomor Visit</label>
                <input
                  type="text"
                  value={settings.visitNumberFormat}
                  onChange={(e) => updateField("visitNumberFormat", e.target.value)}
                  placeholder="VIS-{YYYY}{MM}{DD}-{SEQ:4}"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Preview: <span className="font-mono text-slate-600 dark:text-slate-300">{getNumberPreview(settings.visitNumberFormat)}</span>
                </p>
              </div>
              <div>
                <label className={labelCls}>Format Nomor Invoice</label>
                <input
                  type="text"
                  value={settings.invoiceNumberFormat}
                  onChange={(e) => updateField("invoiceNumberFormat", e.target.value)}
                  placeholder="INV/{YYYY}/{SEQ:4}"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Preview: <span className="font-mono text-slate-600 dark:text-slate-300">{getNumberPreview(settings.invoiceNumberFormat)}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Format Medical Record Number (MRN)</label>
                <input
                  type="text"
                  value={settings.mrnFormat}
                  onChange={(e) => updateField("mrnFormat", e.target.value)}
                  placeholder="MRN-{YYYY}-{SEQ:6}"
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Preview: <span className="font-mono text-slate-600 dark:text-slate-300">{getNumberPreview(settings.mrnFormat)}</span>
                </p>
              </div>
            </div>

            {/* Format Help */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Variabel yang tersedia:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: "{YYYY}", desc: "Tahun" },
                  { tag: "{MM}", desc: "Bulan" },
                  { tag: "{DD}", desc: "Tanggal" },
                  { tag: "{SEQ:N}", desc: "Nomor urut (N digit)" },
                ].map((v) => (
                  <span
                    key={v.tag}
                    className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs dark:bg-slate-800"
                  >
                    <code className="font-mono text-brand">{v.tag}</code>
                    <span className="text-slate-500">— {v.desc}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 5: Jam Operasional (BIZ-GEN-05)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Jam Operasional
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Waktu operasional fasilitas untuk kalkulasi TAT dan SLA
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="pr-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Operasional 24 Jam</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Aktifkan jika fasilitas beroperasi penuh 24 jam tanpa jeda
                </p>
              </div>
              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.is24h}
                  onChange={(e) => updateField("is24h", e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
              </label>
            </div>

            {!settings.is24h && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Jam Buka</label>
                  <input
                    type="time"
                    value={settings.operatingHoursStart}
                    onChange={(e) => updateField("operatingHoursStart", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Jam Tutup</label>
                  <input
                    type="time"
                    value={settings.operatingHoursEnd}
                    onChange={(e) => updateField("operatingHoursEnd", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Hari Operasional</label>
                  <select
                    value={settings.operatingDays}
                    onChange={(e) => updateField("operatingDays", e.target.value)}
                    className={selectCls}
                  >
                    <option value="MON,TUE,WED,THU,FRI,SAT">Senin - Sabtu</option>
                    <option value="MON,TUE,WED,THU,FRI">Senin - Jumat</option>
                    <option value="MON,TUE,WED,THU,FRI,SAT,SUN">Senin - Minggu</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 6: Session & Security (BIZ-GEN-06)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20">
              <Shield className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Session & Kebijakan Keamanan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfigurasi timeout, lockout, dan kebijakan password
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Session Timeout (menit)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => updateField("sessionTimeoutMinutes", Math.max(5, parseInt(e.target.value, 10) || 5))}
                  className={`${inputCls} ${errors.sessionTimeoutMinutes ? errorCls : ""}`}
                />
                {errors.sessionTimeoutMinutes && (
                  <p className="mt-1 text-xs text-red-500">{errors.sessionTimeoutMinutes}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Durasi token JWT sebelum expired. Default: 60 menit.</p>
              </div>
              <div>
                <label className={labelCls}>Auto-Logout Idle (menit)</label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={settings.autoLogoutIdleMinutes}
                  onChange={(e) => updateField("autoLogoutIdleMinutes", Math.max(5, parseInt(e.target.value, 10) || 5))}
                  className={`${inputCls} ${errors.autoLogoutIdleMinutes ? errorCls : ""}`}
                />
                {errors.autoLogoutIdleMinutes && (
                  <p className="mt-1 text-xs text-red-500">{errors.autoLogoutIdleMinutes}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Logout otomatis saat tidak ada aktivitas. Default: 30 menit.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Max Percobaan Login</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.maxLoginAttempts}
                  onChange={(e) => updateField("maxLoginAttempts", Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`${inputCls} ${errors.maxLoginAttempts ? errorCls : ""}`}
                />
                {errors.maxLoginAttempts && (
                  <p className="mt-1 text-xs text-red-500">{errors.maxLoginAttempts}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Akun dikunci setelah N kali gagal login. Default: 5.</p>
              </div>
              <div>
                <label className={labelCls}>Durasi Lockout (menit)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={settings.lockoutDurationMinutes}
                  onChange={(e) => updateField("lockoutDurationMinutes", Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`${inputCls} ${errors.lockoutDurationMinutes ? errorCls : ""}`}
                />
                {errors.lockoutDurationMinutes && (
                  <p className="mt-1 text-xs text-red-500">{errors.lockoutDurationMinutes}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Berapa lama akun terkunci setelah gagal login. Default: 30 menit.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Min Panjang Password</label>
                <input
                  type="number"
                  min={6}
                  max={128}
                  value={settings.passwordMinLength}
                  onChange={(e) => updateField("passwordMinLength", Math.max(6, parseInt(e.target.value, 10) || 6))}
                  className={`${inputCls} ${errors.passwordMinLength ? errorCls : ""}`}
                />
                {errors.passwordMinLength && (
                  <p className="mt-1 text-xs text-red-500">{errors.passwordMinLength}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Minimum karakter untuk password baru. Default: 8.</p>
              </div>
              <div>
                <label className={labelCls}>Wajib Ganti Password (hari)</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={settings.requirePasswordChangeDays}
                  onChange={(e) => updateField("requirePasswordChangeDays", Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className={`${inputCls} ${errors.requirePasswordChangeDays ? errorCls : ""}`}
                />
                {errors.requirePasswordChangeDays && (
                  <p className="mt-1 text-xs text-red-500">{errors.requirePasswordChangeDays}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Set 0 untuk menonaktifkan. Default: 0 (off).</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 7: Maintenance & Backup (BIZ-GEN-07)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <Wrench className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Maintenance & Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mode pemeliharaan dan jadwal backup otomatis
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Maintenance Mode toggle */}
            <div className="flex items-start justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="pr-4">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Mode Maintenance</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Saat aktif, user non-admin akan melihat halaman maintenance
                </p>
              </div>
              <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => updateField("maintenanceMode", e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
              </label>
            </div>

            {settings.maintenanceMode && (
              <div>
                <label className={labelCls}>Pesan Maintenance</label>
                <input
                  type="text"
                  value={settings.maintenanceMessage}
                  onChange={(e) => updateField("maintenanceMessage", e.target.value)}
                  placeholder="Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti."
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-slate-400">Pesan yang ditampilkan ke user saat mode maintenance aktif.</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Jadwal Backup</label>
                <select
                  value={settings.backupScheduleCron}
                  onChange={(e) => updateField("backupScheduleCron", e.target.value)}
                  className={selectCls}
                >
                  <option value="0 0 * * *">Setiap hari pukul 00:00</option>
                  <option value="0 2 * * *">Setiap hari pukul 02:00 (default)</option>
                  <option value="0 3 * * *">Setiap hari pukul 03:00</option>
                  <option value="0 0 * * 0">Setiap Minggu pukul 00:00</option>
                  <option value="0 0 1 * *">Setiap tanggal 1 pukul 00:00</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">{formatCronDescription(settings.backupScheduleCron)}</p>
              </div>
              <div>
                <label className={labelCls}>Backup Terakhir</label>
                <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  {lastBackupAt
                    ? new Date(lastBackupAt).toLocaleString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Belum pernah dijalankan"}
                </div>
              </div>
            </div>

            {settings.maintenanceMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/10">
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Mode maintenance sedang aktif. User non-admin tidak dapat mengakses sistem.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 8: Pagination & Display (BIZ-GEN-08)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-900/20">
              <LayoutGrid className="h-5 w-5 text-teal-500 dark:text-teal-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Pagination & Tampilan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Default pengaturan tabel dan retensi data dashboard
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Baris per Halaman</label>
                <select
                  value={settings.defaultPageSize}
                  onChange={(e) => updateField("defaultPageSize", parseInt(e.target.value, 10))}
                  className={selectCls}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20 (default)</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">Default jumlah data per halaman tabel.</p>
              </div>
              <div>
                <label className={labelCls}>Default Urutan</label>
                <select
                  value={settings.defaultSortOrder}
                  onChange={(e) => updateField("defaultSortOrder", e.target.value as GeneralSettings["defaultSortOrder"])}
                  className={selectCls}
                >
                  <option value="DESC">Terbaru (DESC)</option>
                  <option value="ASC">Terlama (ASC)</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">Urutan default data di semua tabel.</p>
              </div>
              <div>
                <label className={labelCls}>Retensi Dashboard (hari)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.dashboardDataRetentionDays}
                  onChange={(e) => updateField("dashboardDataRetentionDays", Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`${inputCls} ${errors.dashboardDataRetentionDays ? errorCls : ""}`}
                />
                {errors.dashboardDataRetentionDays && (
                  <p className="mt-1 text-xs text-red-500">{errors.dashboardDataRetentionDays}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">Berapa hari data ditampilkan di dashboard. Default: 30.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Section 9: Export / Import (T-19)
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <DatabaseBackup className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Export / Import Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Backup konfigurasi ke file JSON atau restore dari backup sebelumnya
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Export */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Export Settings</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Download seluruh konfigurasi sebagai file JSON. Nilai sensitif (password) tidak disertakan.
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                {exporting ? "Mengexport..." : "Download JSON"}
              </button>
            </div>

            {/* Import */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Import Settings</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Restore konfigurasi dari file backup JSON. Data sensitif akan diskip.
              </p>
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => importFileRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {importing ? "Mengimport..." : "Upload JSON"}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            Action Buttons
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            onClick={handleReset}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
          </button>
        </div>
      </div>
    </RoleGuard>
  );
}
