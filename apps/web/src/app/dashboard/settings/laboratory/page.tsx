"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FlaskConical,
  TestTube,
  Wrench,
  Beaker,
  Droplets,
  Ruler,
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
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

function formatDate(value: unknown): string {
  if (!value) return "-";
  return new Date(value as string).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-[#6B8E6B]/10 text-[#6B8E6B] ring-1 ring-[#6B8E6B]/20 dark:bg-[#6B8E6B]/15 dark:text-[#6B8E6B] dark:ring-[#6B8E6B]/20"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-300/50 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/50"
      }`}
    >
      {isActive ? "Aktif" : "Nonaktif"}
    </span>
  );
}

// ─── Lab Tab Configuration ────────────────────────────────────────────────────

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
      { key: "isActive", label: "Status", render: (v) => <StatusBadge isActive={Boolean(v)} /> },
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
      { key: "isActive", label: "Status", render: (v) => <StatusBadge isActive={Boolean(v)} /> },
    ],
    fields: [
      { key: "code", label: "Kode", type: "text", required: true, placeholder: "Kode tes" },
      { key: "name", label: "Nama", type: "text", required: true, placeholder: "Nama tes" },
      { key: "categoryId", label: "Kategori", type: "select", options: [] },
      { key: "unit", label: "Satuan", type: "text", placeholder: "Satuan hasil" },
      { key: "price", label: "Harga", type: "number", required: true, placeholder: "0" },
      { key: "isActive", label: "Aktif", type: "boolean" },
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
      { key: "isActive", label: "Status", render: (v: unknown) => <StatusBadge isActive={Boolean(v)} /> },
    ],
    fields: [
      { key: "name", label: "Nama Panel", type: "text", required: true, placeholder: "Nama panel" },
      { key: "description", label: "Deskripsi", type: "textarea", placeholder: "Deskripsi panel" },
      { key: "price", label: "Harga", type: "number", required: true, placeholder: "0" },
      { key: "isActive", label: "Aktif", type: "boolean" },
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

function FormModal({ isOpen, title, fields, initialValues, isEditMode, onSubmit, onClose }: FormModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const init: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.type === "boolean") {
          init[field.key] = initialValues[field.key] ?? true;
        } else if (field.type === "date" && initialValues[field.key]) {
          init[field.key] = String(initialValues[field.key]).split("T")[0];
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

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea value={String(values[field.key] ?? "")} onChange={(e) => handleChange(field.key, e.target.value)} placeholder={field.placeholder} required={field.required} rows={3} className={inputCls} />
              ) : field.type === "select" ? (
                <select value={String(values[field.key] ?? "")} onChange={(e) => handleChange(field.key, e.target.value)} required={field.required} className={inputCls}>
                  <option value="">Pilih {field.label.toLowerCase()}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === "boolean" ? (
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" checked={Boolean(values[field.key])} onChange={(e) => handleChange(field.key, e.target.checked)} className="peer sr-only" />
                  <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#6B8E6B] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-slate-700" />
                  <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">{Boolean(values[field.key]) ? "Ya" : "Tidak"}</span>
                </label>
              ) : (
                <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={String(values[field.key] ?? "")} onChange={(e) => handleChange(field.key, e.target.value)} placeholder={field.placeholder} required={field.required} step={field.type === "number" ? "any" : undefined} className={inputCls} />
              )}
            </div>
          ))}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Batal</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] disabled:opacity-50">
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

export default function LaboratorySettingsPage() {
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  const fetchData = useCallback(async (endpoint: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get<unknown>(endpoint);
      const envelope = res as Record<string, unknown>;
      let extracted: Record<string, unknown>[] = [];
      if (Array.isArray(envelope)) {
        extracted = envelope;
      } else if (envelope?.data !== undefined) {
        const innerData = envelope.data;
        if (Array.isArray(innerData)) {
          extracted = innerData as Record<string, unknown>[];
        } else if (innerData && typeof innerData === "object" && "data" in (innerData as object)) {
          const deepData = (innerData as Record<string, unknown>).data;
          extracted = Array.isArray(deepData) ? deepData as Record<string, unknown>[] : [];
        }
      }
      setData(extracted);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get<unknown>("/api/v1/master/test-categories");
      const envelope = res as Record<string, unknown>;
      let cats: { id: string; name: string }[] = [];
      if (envelope?.data) {
        const inner = envelope.data;
        if (Array.isArray(inner)) {
          cats = inner as { id: string; name: string }[];
        } else if (inner && typeof inner === "object" && "data" in (inner as object)) {
          const deep = (inner as Record<string, unknown>).data;
          cats = Array.isArray(deep) ? deep as { id: string; name: string }[] : [];
        }
      }
      setCategories(cats.map((c) => ({ value: c.id, label: c.name })));
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    setSearch("");
    fetchData(currentTab.endpoint);
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
      return name.includes(q) || code.includes(q);
    });
  }, [data, search]);

  const getFieldsForCurrentTab = useCallback((): FieldDef[] => {
    return currentTab.fields.map((field) => {
      if (field.key === "categoryId" && currentTab.id === "tests") {
        return { ...field, options: categories };
      }
      return field;
    });
  }, [currentTab, categories]);

  const handleCreate = () => { setEditingRow(null); setModalOpen(true); };
  const handleEdit = (row: Record<string, unknown>) => { setEditingRow(row); setModalOpen(true); };

  const handleDelete = async (row: Record<string, unknown>) => {
    const id = row.id as string;
    const name = (row.name as string) || id;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return;
    try {
      await apiClient.delete(currentTab.endpoint.split("?")[0] + "/" + id);
      fetchData(currentTab.endpoint);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      alert(apiErr.message || "Gagal menghapus data");
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const baseEndpoint = currentTab.endpoint.split("?")[0];
    if (editingRow) {
      await apiClient.put(baseEndpoint + "/" + (editingRow.id as string), values);
    } else {
      await apiClient.post(baseEndpoint, values);
    }
    fetchData(currentTab.endpoint);
  };

  const modalTitle = editingRow ? `Edit ${currentTab.label}` : `Tambah ${currentTab.label}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Pengaturan Laboratorium</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kelola data referensi lab: kategori tes, tes, panel, alat, reagen, tipe sampel, dan satuan
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex overflow-x-auto px-2 pt-2 gap-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${isActive ? "border-b-2 border-[#6B8E6B] bg-[#6B8E6B]/5 text-[#6B8E6B] dark:border-[#6B8E6B] dark:bg-[#6B8E6B]/10 dark:text-[#6B8E6B]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-300"}`}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama atau kode..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#6B8E6B] focus:ring-2 focus:ring-[#6B8E6B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#6B8E6B]/20 transition-all hover:bg-[#5A7D5A] active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>

        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#6B8E6B]" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Memuat data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <PackageOpen className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">Tidak ada data</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                {search ? `Tidak ditemukan hasil untuk "${search}"` : `Belum ada data ${currentTab.label.toLowerCase()}`}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredData.length}</span> data
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                      {currentTab.columns.map((col) => (
                        <th key={col.key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{col.label}</th>
                      ))}
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((row, idx) => (
                      <tr key={(row.id as string) || idx} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        {currentTab.columns.map((col) => (
                          <td key={col.key} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                            {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "-")}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleEdit(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-[#6B8E6B] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-[#6B8E6B]"><Pencil className="h-3.5 w-3.5" />Edit</button>
                            <button onClick={() => handleDelete(row)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" />Hapus</button>
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
