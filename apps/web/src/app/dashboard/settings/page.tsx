"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  TestTube,
  Stethoscope,
  Building2,
  ShieldCheck,
  Wrench,
  Beaker,
  Droplets,
  Ruler,
  Users,
  Loader2,
  PackageOpen,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "email" | "select" | "textarea" | "date" | "boolean";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  requiredOnCreate?: boolean; // only required when creating (e.g., password)
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  endpoint: string;
  columns: ColumnDef[];
  fields: FieldDef[];
}

interface ColumnDef {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);
}

function formatDate(value: unknown): string {
  if (!value) return "-";
  return new Date(value as string).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/50"
      }`}
    >
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  );
}

// ─── Roles ────────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "KASIR", label: "Kasir" },
  { value: "ADMIN", label: "Admin" },
  { value: "SAMPLING", label: "Sampling" },
  { value: "ANALIS", label: "Analis" },
  { value: "DOKTER", label: "Dokter" },
  { value: "CS", label: "CS" },
  { value: "MARKETING", label: "Marketing" },
  { value: "KLINIK_PARTNER", label: "Klinik Partner" },
];

// ─── Tab Configuration ────────────────────────────────────────────────────────

const tabs: TabConfig[] = [
  {
    id: "test-categories",
    label: "Kategori Tes",
    icon: FlaskConical,
    endpoint: "/api/v1/master/test-categories",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
      {
        key: "isActive",
        label: "Status",
        render: (v) => <StatusBadge isActive={Boolean(v)} />,
      },
    ],
    fields: [
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama kategori" },
      { key: "description", label: "Deskripsi", type: "textarea", placeholder: "Deskripsi kategori" },
      { key: "isActive", label: "Aktif", type: "boolean" },
    ],
  },
  {
    id: "tests",
    label: "Tes Laboratorium",
    icon: TestTube,
    endpoint: "/api/v1/master/tests?limit=100",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      {
        key: "category",
        label: "Kategori",
        render: (_v, row) => {
          const cat = (row.category as Record<string, unknown>) || (row.testCategory as Record<string, unknown>);
          return (cat?.name as string) || "-";
        },
      },
      {
        key: "unit",
        label: "Satuan",
        render: (_v, row) => {
          const unit = (row.unit as Record<string, unknown>) || (row.measurementUnit as Record<string, unknown>);
          return (unit?.name as string) || "-";
        },
      },
      { key: "price", label: "Harga", render: (v) => formatRupiah(v) },
      {
        key: "isActive",
        label: "Status",
        render: (v) => <StatusBadge isActive={Boolean(v)} />,
      },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode tes" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama tes" },
      { key: "categoryId", label: "Kategori", type: "select", options: [] }, // populated dynamically
      { key: "unit", label: "Satuan", type: "text", placeholder: "Satuan hasil" },
      { key: "price", label: "Harga", type: "number", required: true, placeholder: "0" },
      { key: "isActive", label: "Aktif", type: "boolean" },
    ],
  },
  {
    id: "doctors",
    label: "Dokter",
    icon: Stethoscope,
    endpoint: "/api/v1/master/doctors",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "specialization", label: "Spesialisasi" },
      { key: "phone", label: "Telepon" },
      {
        key: "isActive",
        label: "Status",
        render: (v) => <StatusBadge isActive={Boolean(v)} />,
      },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode dokter" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama lengkap" },
      { key: "specialization", label: "Spesialisasi", type: "text", placeholder: "Spesialisasi" },
      { key: "phone", label: "Telepon", type: "text", placeholder: "08xxxxxxxxxx" },
      { key: "email", label: "Email", type: "email", placeholder: "email@example.com" },
      { key: "licenseNumber", label: "No. SIP", type: "text", placeholder: "Nomor SIP" },
    ],
  },
  {
    id: "clinics",
    label: "Klinik",
    icon: Building2,
    endpoint: "/api/v1/master/clinics",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "address", label: "Alamat" },
      { key: "phone", label: "Telepon" },
      {
        key: "isActive",
        label: "Status",
        render: (v) => <StatusBadge isActive={Boolean(v)} />,
      },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode klinik" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama klinik" },
      { key: "address", label: "Alamat", type: "textarea", placeholder: "Alamat lengkap" },
      { key: "phone", label: "Telepon", type: "text", placeholder: "08xxxxxxxxxx" },
      { key: "email", label: "Email", type: "email", placeholder: "email@example.com" },
    ],
  },
  {
    id: "insurances",
    label: "Asuransi",
    icon: ShieldCheck,
    endpoint: "/api/v1/master/insurances",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "type", label: "Tipe" },
      {
        key: "isActive",
        label: "Status",
        render: (v) => <StatusBadge isActive={Boolean(v)} />,
      },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode asuransi" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama asuransi" },
      {
        key: "type",
        label: "Tipe",
        type: "select",
        options: [
          { value: "BPJS", label: "BPJS" },
          { value: "Swasta", label: "Swasta" },
          { value: "Lainnya", label: "Lainnya" },
        ],
      },
      { key: "phone", label: "Telepon", type: "text", placeholder: "08xxxxxxxxxx" },
      { key: "email", label: "Email", type: "email", placeholder: "email@example.com" },
    ],
  },
  {
    id: "equipments",
    label: "Alat",
    icon: Wrench,
    endpoint: "/api/v1/master/equipments",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "manufacturer", label: "Produsen" },
      { key: "status", label: "Status" },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode alat" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama alat" },
      { key: "manufacturer", label: "Produsen", type: "text", placeholder: "Produsen" },
      { key: "model", label: "Model", type: "text", placeholder: "Model alat" },
      { key: "serialNumber", label: "Serial Number", type: "text", placeholder: "S/N" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { value: "ACTIVE", label: "Active" },
          { value: "MAINTENANCE", label: "Maintenance" },
          { value: "RETIRED", label: "Retired" },
        ],
      },
    ],
  },
  {
    id: "reagents",
    label: "Reagen",
    icon: Beaker,
    endpoint: "/api/v1/master/reagents",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "manufacturer", label: "Produsen" },
      { key: "lotNumber", label: "Lot" },
      { key: "expiryDate", label: "Kedaluwarsa", render: (v) => formatDate(v) },
      { key: "quantity", label: "Jumlah" },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode reagen" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama reagen" },
      { key: "manufacturer", label: "Produsen", type: "text", placeholder: "Produsen" },
      { key: "lotNumber", label: "Lot Number", type: "text", placeholder: "Lot number" },
      { key: "expiryDate", label: "Tanggal Kedaluwarsa", type: "date" },
      { key: "quantity", label: "Jumlah", type: "number", placeholder: "0" },
      { key: "unit", label: "Satuan", type: "text", placeholder: "mL, pcs, dll" },
      { key: "storageTemp", label: "Suhu Penyimpanan", type: "text", placeholder: "2-8°C" },
    ],
  },
  {
    id: "sample-types",
    label: "Tipe Sampel",
    icon: Droplets,
    endpoint: "/api/v1/master/sample-types",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "container", label: "Container" },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode tipe sampel" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama tipe sampel" },
      { key: "container", label: "Container", type: "text", placeholder: "Jenis container" },
      { key: "instructions", label: "Instruksi", type: "textarea", placeholder: "Instruksi pengambilan" },
    ],
  },
  {
    id: "units",
    label: "Satuan",
    icon: Ruler,
    endpoint: "/api/v1/master/units",
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode satuan" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama satuan" },
      { key: "description", label: "Deskripsi", type: "text", placeholder: "Deskripsi" },
    ],
  },
  {
    id: "panels",
    label: "Panel",
    icon: FlaskConical,
    endpoint: "/api/v1/master/panels",
    columns: [
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
      { key: "price", label: "Harga", render: (v: unknown) => formatRupiah(v) },
      {
        key: "isActive",
        label: "Status",
        render: (v: unknown) => <StatusBadge isActive={Boolean(v)} />,
      },
    ],
    fields: [
      { key: "name", label: "Nama Panel", type: "text", required: true, placeholder: "Nama panel" },
      { key: "description", label: "Deskripsi", type: "textarea", placeholder: "Deskripsi panel" },
      { key: "price", label: "Harga", type: "number", required: true, placeholder: "0" },
      { key: "isActive", label: "Aktif", type: "boolean" },
    ],
  },
  {
    id: "tariffs",
    label: "Tarif",
    icon: ShieldCheck,
    endpoint: "/api/v1/master/tariffs",
    columns: [
      {
        key: "test",
        label: "Tes",
        render: (_v: unknown, row: Record<string, unknown>) => {
          const test = row.test as Record<string, unknown> | undefined;
          return test?.name ? String(test.name) : "-";
        },
      },
      { key: "price", label: "Harga", render: (v: unknown) => formatRupiah(v) },
      { key: "discount", label: "Diskon (%)" },
    ],
    fields: [
      { key: "testId", label: "Test ID", type: "text", required: true, placeholder: "UUID test" },
      { key: "clinicId", label: "Clinic ID (opsional)", type: "text", placeholder: "UUID clinic" },
      { key: "insuranceId", label: "Insurance ID (opsional)", type: "text", placeholder: "UUID insurance" },
      { key: "price", label: "Harga", type: "number", required: true, placeholder: "0" },
      { key: "discount", label: "Diskon (%)", type: "number", placeholder: "0" },
    ],
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    endpoint: "/api/v1/users",
    columns: [
      { key: "email", label: "Email" },
      { key: "name", label: "Nama" },
      { key: "role", label: "Role" },
      { key: "createdAt", label: "Dibuat", render: (v) => formatDate(v) },
    ],
    fields: [
      { key: "email", label: "Email", type: "email", required: true, placeholder: "user@example.com" },
      { key: "name", label: "Nama", type: "text", placeholder: "Nama lengkap" },
      { key: "password", label: "Password", type: "text", requiredOnCreate: true, placeholder: "Min. 8 karakter" },
      { key: "role", label: "Role", type: "select", required: true, options: ROLES },
    ],
  },
];


// ─── Form Modal Component ─────────────────────────────────────────────────────

interface FormModalProps {
  isOpen: boolean;
  title: string;
  fields: FieldDef[];
  initialValues: Record<string, unknown>;
  isEditMode: boolean;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

function FormModal({
  isOpen,
  title,
  fields,
  initialValues,
  isEditMode,
  onSubmit,
  onClose,
}: FormModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize form values
      const init: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.type === "boolean") {
          init[field.key] = initialValues[field.key] ?? true;
        } else if (field.type === "date" && initialValues[field.key]) {
          // Format date for input[type=date]
          const dateStr = String(initialValues[field.key]);
          init[field.key] = dateStr.split("T")[0];
        } else {
          init[field.key] = initialValues[field.key] ?? "";
        }
      });
      setValues(init);
      setError(null);
    }
  }, [isOpen, fields, initialValues]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Build payload, converting types as needed
      const payload: Record<string, unknown> = {};
      fields.forEach((field) => {
        const val = values[field.key];
        if (field.type === "number" && val !== "" && val !== undefined) {
          payload[field.key] = Number(val);
        } else if (field.type === "boolean") {
          payload[field.key] = Boolean(val);
        } else if (val !== "" && val !== undefined) {
          payload[field.key] = val;
        }
      });

      // Remove password field if empty on edit mode
      if (isEditMode && !payload.password) {
        delete payload.password;
      }

      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { message?: string | string[] };
      if (Array.isArray(apiErr.message)) {
        setError(apiErr.message.join(", "));
      } else {
        setError(apiErr.message || "Terjadi kesalahan saat menyimpan data");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFieldRequired = (field: FieldDef): boolean => {
    if (field.required) return true;
    if (field.requiredOnCreate && !isEditMode) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {fields.map((field) => {
            // Hide password hint in edit mode
            const placeholder =
              field.key === "password" && isEditMode
                ? "Kosongkan jika tidak diubah"
                : field.placeholder;

            return (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {field.label}
                  {isFieldRequired(field) && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={placeholder}
                    required={isFieldRequired(field)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                ) : field.type === "select" ? (
                  <select
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    required={isFieldRequired(field)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Pilih {field.label.toLowerCase()}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "boolean" ? (
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.key])}
                      onChange={(e) => handleChange(field.key, e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-emerald-400/20 dark:bg-slate-700 dark:after:border-slate-600" />
                    <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">
                      {Boolean(values[field.key]) ? "Ya" : "Tidak"}
                    </span>
                  </label>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                    value={String(values[field.key] ?? "")}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={placeholder}
                    required={isFieldRequired(field)}
                    step={field.type === "number" ? "any" : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                )}
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── Page Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);

  // Categories cache for "Tes Laboratorium" tab's categoryId select
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  const fetchData = useCallback(async (endpoint: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { data: Record<string, unknown>[]; meta?: unknown } | Record<string, unknown>[];
      }>(endpoint);

      // Handle both paginated { data: { data: [], meta: {} } } and flat array responses
      if (Array.isArray(res?.data)) {
        setData(res.data as Record<string, unknown>[]);
      } else {
        setData((res?.data as { data: Record<string, unknown>[] })?.data ?? []);
      }
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories for the test form's select
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: { data: { id: string; name: string }[] };
      }>("/api/v1/master/test-categories");
      const cats = res?.data?.data ?? [];
      setCategories(cats.map((c) => ({ value: c.id, label: c.name })));
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    setSearch("");
    fetchData(currentTab.endpoint);

    // Preload categories when on tests tab
    if (currentTab.id === "tests") {
      fetchCategories();
    }
  }, [activeTab, currentTab.endpoint, currentTab.id, fetchData, fetchCategories]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) => {
      const name = String(row.name || "").toLowerCase();
      const code = String(row.code || "").toLowerCase();
      const email = String(row.email || "").toLowerCase();
      return name.includes(q) || code.includes(q) || email.includes(q);
    });
  }, [data, search]);

  // Get fields for current tab, injecting dynamic options
  const getFieldsForCurrentTab = useCallback((): FieldDef[] => {
    return currentTab.fields.map((field) => {
      // Inject dynamic categories for the tests tab
      if (field.key === "categoryId" && currentTab.id === "tests") {
        return { ...field, options: categories };
      }
      return field;
    });
  }, [currentTab, categories]);

  // ─── CRUD Handlers ────────────────────────────────────────────────────────

  const handleCreate = () => {
    setEditingRow(null);
    setModalOpen(true);
  };

  const handleEdit = (row: Record<string, unknown>) => {
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    const id = row.id as string;
    const name = (row.name as string) || (row.email as string) || id;

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus "${name}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    try {
      if (currentTab.id === "users") {
        await apiClient.deleteUser(id);
      } else {
        await apiClient.delete(currentTab.endpoint.split("?")[0] + "/" + id);
      }
      // Refresh data
      fetchData(currentTab.endpoint);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      alert(apiErr.message || "Gagal menghapus data");
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const baseEndpoint = currentTab.endpoint.split("?")[0];

    if (editingRow) {
      // Edit mode
      const id = editingRow.id as string;
      if (currentTab.id === "users") {
        await apiClient.updateUser(id, values);
      } else {
        await apiClient.put(baseEndpoint + "/" + id, values);
      }
    } else {
      // Create mode
      if (currentTab.id === "users") {
        await apiClient.createUser(values);
      } else {
        await apiClient.post(baseEndpoint, values);
      }
    }

    // Refresh data after successful operation
    fetchData(currentTab.endpoint);
  };

  const modalTitle = editingRow
    ? `Edit ${currentTab.label}`
    : `Tambah ${currentTab.label}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pengaturan &amp; Master Data
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola data referensi sistem laboratorium
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* Tab Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex overflow-x-auto px-2 pt-2 gap-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "border-b-2 border-emerald-600 bg-emerald-50/50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kode, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/20 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Memuat data...
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <PackageOpen className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                Tidak ada data
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                {search
                  ? `Tidak ditemukan hasil untuk "${search}"`
                  : `Belum ada data ${currentTab.label.toLowerCase()}`}
              </p>
            </div>
          ) : (
            <>
              {/* Results count */}
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Menampilkan{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {filteredData.length}
                </span>{" "}
                data
              </p>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                      {currentTab.columns.map((col) => (
                        <th
                          key={col.key}
                          className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {col.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((row, idx) => (
                      <tr
                        key={(row.id as string) || idx}
                        className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                      >
                        {currentTab.columns.map((col) => (
                          <td
                            key={col.key}
                            className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300"
                          >
                            {col.render
                              ? col.render(row[col.key], row)
                              : String(row[col.key] ?? "-")}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <FormModal
        isOpen={modalOpen}
        title={modalTitle}
        fields={getFieldsForCurrentTab()}
        initialValues={editingRow ?? {}}
        isEditMode={!!editingRow}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
