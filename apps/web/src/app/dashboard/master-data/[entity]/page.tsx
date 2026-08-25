"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MasterDataTable } from "@/components/master-data/MasterDataTable";
import { MasterDataFormModal } from "@/components/master-data/MasterDataFormModal";
import { TestDetailPanel } from "@/components/master-data/TestDetailPanel";
import { EntityFilterBar } from "@/components/master-data/EntityFilterBar";
import {
  useMasterUnits,
  useCreateMasterUnit,
  useUpdateMasterUnit,
  useDeleteMasterUnit,
  useMasterSampleTypes,
  useCreateMasterSampleType,
  useUpdateMasterSampleType,
  useDeleteMasterSampleType,
  useMasterTestCategories,
  useCreateMasterTestCategory,
  useUpdateMasterTestCategory,
  useDeleteMasterTestCategory,
  useMasterTests,
  useCreateMasterTest,
  useUpdateMasterTest,
  useDeleteMasterTest,
  useMasterPanels,
  useCreateMasterPanel,
  useUpdateMasterPanel,
  useDeleteMasterPanel,
  useMasterDoctors,
  useCreateMasterDoctor,
  useUpdateMasterDoctor,
  useDeleteMasterDoctor,
  useMasterClinics,
  useCreateMasterClinic,
  useUpdateMasterClinic,
  useDeleteMasterClinic,
  useMasterInsurances,
  useCreateMasterInsurance,
  useUpdateMasterInsurance,
  useDeleteMasterInsurance,
  useMasterEquipments,
  useCreateMasterEquipment,
  useUpdateMasterEquipment,
  useDeleteMasterEquipment,
  useMasterReagents,
  useCreateMasterReagent,
  useUpdateMasterReagent,
  useDeleteMasterReagent,
  useMasterTariffs,
  useCreateMasterTariff,
  useUpdateMasterTariff,
  useDeleteMasterTariff,
  useMasterMethods,
  useCreateMasterMethod,
  useUpdateMasterMethod,
  useDeleteMasterMethod,
} from "@/services";
import { apiClient } from "@/lib/api";

// ─── User hooks adapted for EntityConfig interface ───────────────────────────

function useUsersForEntity(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["users", "list", params ?? {}],
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(
      `/api/v1/users${buildQueryString(params)}`
    ),
  });
}

function buildQueryString(params?: { page?: number; limit?: number; search?: string }): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  const str = qs.toString();
  return str ? `?${str}` : "";
}

function useCreateUserForEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

function useUpdateUserForEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

function useDeleteUserForEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
    },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select" | "date" | "entity-autocomplete" | "checkbox" | "multi-entity-autocomplete";
  required?: boolean;
  /** API endpoint for entity-autocomplete type */
  endpoint?: string;
  /** Select options */
  options?: { label: string; value: string }[];
  /** Minimum number of selections for multi-entity-autocomplete */
  min?: number;
  /** Which property of the entity to use as value (default: "id"). Use "code" to store entity code, or "name" to store entity name instead of UUID. */
  valueKey?: "id" | "code" | "name";
}

interface EntityFilter {
  name: string;
  label: string;
  endpoint: string;
}

interface EntityConfig {
  displayName: string;
  useQuery: (params?: { page?: number; limit?: number; search?: string; [key: string]: unknown }) => {
    data?: { data: unknown[]; meta: { total: number; page: number; limit: number } };
    isLoading: boolean;
    error: unknown;
  };
  useCreate: () => {
    mutateAsync: (data: unknown) => Promise<unknown>;
    isPending: boolean;
  };
  useUpdate: () => {
    mutateAsync: (vars: { id: string; data: unknown }) => Promise<unknown>;
    isPending: boolean;
  };
  useDelete: () => {
    mutateAsync: (id: string) => Promise<unknown>;
    isPending: boolean;
  };
  columns: Column[];
  formFields: FormField[];
  /** Optional: entity-specific filters that render as dropdowns above the table */
  filters?: EntityFilter[];
}

// ─── Entity Configuration Map ────────────────────────────────────────────────
// Structure as a Record so Task 6.2 can easily add more entries

const entityConfigs: Record<string, EntityConfig> = {
  satuan: {
    displayName: "Satuan",
    useQuery: useMasterUnits,
    useCreate: useCreateMasterUnit,
    useUpdate: useUpdateMasterUnit,
    useDelete: useDeleteMasterUnit,
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
      { key: "isActive", label: "Status", render: (value: unknown) => (value !== false ? "Aktif" : "Nonaktif") },
    ],
    formFields: [
      { name: "code", label: "Kode Satuan", type: "text", required: true },
      { name: "name", label: "Nama Satuan", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
      { name: "isActive", label: "Aktif", type: "checkbox" as const },
    ],
  },
  "jenis-sampel": {
    displayName: "Jenis Sampel",
    useQuery: useMasterSampleTypes,
    useCreate: useCreateMasterSampleType,
    useUpdate: useUpdateMasterSampleType,
    useDelete: useDeleteMasterSampleType,
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "container", label: "Wadah/Tabung" },
      { key: "minimumVolume", label: "Volume Min" },
      { key: "storageTemperature", label: "Suhu Simpan" },
      { key: "instructions", label: "Instruksi", render: (value: unknown) => {
        if (!value) return "—";
        const str = String(value);
        return str.length > 50 ? str.slice(0, 50) + "…" : str;
      }},
    ],
    formFields: [
      { name: "code", label: "Kode Sampel", type: "text", required: true },
      { name: "name", label: "Nama Jenis Sampel", type: "text", required: true },
      { name: "container", label: "Wadah/Tabung (misal: Tabung tutup ungu K3-EDTA)", type: "text" },
      { name: "minimumVolume", label: "Volume Minimum (misal: 3 mL)", type: "text" },
      { name: "storageTemperature", label: "Suhu Penyimpanan (misal: 2-8°C)", type: "text" },
      { name: "stabilityPeriod", label: "Masa Stabilitas (misal: 24h room temp, 72h refrigerated)", type: "text" },
      { name: "instructions", label: "Instruksi Pengambilan", type: "textarea" },
    ],
  },
  "kategori-pemeriksaan": {
    displayName: "Kategori Pemeriksaan",
    useQuery: useMasterTestCategories,
    useCreate: useCreateMasterTestCategory,
    useUpdate: useUpdateMasterTestCategory,
    useDelete: useDeleteMasterTestCategory,
    columns: [
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
    ],
    formFields: [
      { name: "name", label: "Nama Kategori", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
    ],
  },
  "pemeriksaan-lab": {
    displayName: "Pemeriksaan Lab",
    useQuery: useMasterTests,
    useCreate: useCreateMasterTest,
    useUpdate: useUpdateMasterTest,
    useDelete: useDeleteMasterTest,
    columns: [
      { key: "name", label: "Nama" },
      { key: "code", label: "Kode" },
      { key: "category", label: "Kategori", render: (value: unknown) => {
        if (value && typeof value === "object" && "name" in (value as Record<string, unknown>)) {
          return (value as Record<string, unknown>).name as string;
        }
        return "—";
      }},
      { key: "unit", label: "Satuan" },
      { key: "method", label: "Metode" },
      { key: "sampleType", label: "Jenis Sampel" },
      { key: "resultType", label: "Tipe Hasil", render: (value: unknown) => {
        if (value === "QUALITATIVE") return "Kualitatif";
        if (value === "TEXT") return "Teks";
        return "Numerik";
      }},
      { key: "price", label: "Harga" },
      { key: "tatMinutes", label: "TAT", render: (value: unknown) => {
        if (value == null) return "-";
        const minutes = Number(value);
        if (isNaN(minutes)) return "-";
        if (minutes < 60) return `${minutes} menit`;
        if (minutes === 60) return "1 jam";
        if (minutes < 1440) return `${Math.floor(minutes / 60)} jam`;
        return `${Math.floor(minutes / 1440)} hari`;
      }},
      { key: "tatCategory", label: "Prioritas", render: (value: unknown) => {
        if (value == null) return "-";
        return String(value);
      }},
      { key: "isActive", label: "Status", render: (value: unknown) => (value !== false ? "Aktif" : "Nonaktif") },
    ],
    formFields: [
      { name: "name", label: "Nama Pemeriksaan", type: "text", required: true },
      { name: "code", label: "Kode", type: "text", required: true },
      { name: "categoryId", label: "Kategori", type: "entity-autocomplete" as const, required: true, endpoint: "/api/v1/master/test-categories" },
      { name: "resultType", label: "Tipe Hasil", type: "select" as const, required: true, options: [{ label: "Numerik", value: "NUMERIC" }, { label: "Teks Bebas", value: "TEXT" }, { label: "Kualitatif (pilihan)", value: "QUALITATIVE" }] },
      { name: "qualitativeOptions", label: "Opsi Kualitatif (pisahkan dengan koma, misal: Reaktif,Non-Reaktif)", type: "text" },
      { name: "unit", label: "Satuan", type: "entity-autocomplete" as const, endpoint: "/api/v1/master/units", valueKey: "code" as const },
      { name: "method", label: "Metode", type: "entity-autocomplete" as const, endpoint: "/api/v1/master/methods", valueKey: "name" as const },
      { name: "sampleType", label: "Jenis Sampel", type: "entity-autocomplete" as const, endpoint: "/api/v1/master/sample-types", valueKey: "code" as const },
      { name: "price", label: "Harga", type: "number", required: true },
      { name: "tatMinutes", label: "TAT (menit)", type: "number" as const },
      { name: "tatCategory", label: "Kategori TAT", type: "select" as const, options: [{ label: "CITO", value: "CITO" }, { label: "ROUTINE", value: "ROUTINE" }, { label: "STAT", value: "STAT" }] },
      { name: "deltaAlertThreshold", label: "Delta Alert Threshold (%)", type: "number" as const },
      { name: "requiresDoctorApproval", label: "Memerlukan Persetujuan Dokter", type: "checkbox" as const },
      { name: "requiresInsurancePreAuth", label: "Memerlukan Pre-Otorisasi Asuransi", type: "checkbox" as const },
      { name: "fastingRequired", label: "Memerlukan Puasa", type: "checkbox" as const },
      { name: "fastingHours", label: "Durasi Puasa (jam, misal 8-12)", type: "number" as const },
      { name: "description", label: "Deskripsi", type: "text" },
    ],
  },
  panel: {
    displayName: "Panel",
    useQuery: useMasterPanels,
    useCreate: useCreateMasterPanel,
    useUpdate: useUpdateMasterPanel,
    useDelete: useDeleteMasterPanel,
    columns: [
      { key: "name", label: "Nama" },
      { key: "panelTests", label: "Tes Anggota", render: (value: unknown) => {
        if (Array.isArray(value) && value.length > 0) {
          const names = value
            .map((pt: { test?: { name?: string } }) => pt.test?.name)
            .filter(Boolean);
          if (names.length <= 3) return names.join(", ");
          return `${names.slice(0, 3).join(", ")} +${names.length - 3} lainnya`;
        }
        return "—";
      }},
      { key: "sampleType_derived", label: "Jenis Sampel", render: (_value: unknown, row: Record<string, unknown>) => {
        const panelTests = row.panelTests;
        if (Array.isArray(panelTests) && panelTests.length > 0) {
          const sampleTypes = [...new Set(
            panelTests
              .map((pt: { test?: { sampleType?: string } }) => pt.test?.sampleType)
              .filter(Boolean)
          )];
          return sampleTypes.join(", ") || "—";
        }
        return "—";
      }},
      { key: "price", label: "Harga Panel", render: (value: unknown, row: Record<string, unknown>) => {
        const panelPrice = Number(value) || 0;
        const panelTests = row.panelTests;
        let totalIndividual = 0;
        if (Array.isArray(panelTests)) {
          totalIndividual = panelTests.reduce((sum: number, pt: { test?: { price?: number | string } }) => {
            return sum + (Number(pt.test?.price) || 0);
          }, 0);
        }
        const formatted = panelPrice.toLocaleString("id-ID");
        if (totalIndividual > 0 && totalIndividual !== panelPrice) {
          const discount = Math.round(((totalIndividual - panelPrice) / totalIndividual) * 100);
          return `Rp ${formatted} (hemat ${discount}% dari Rp ${totalIndividual.toLocaleString("id-ID")})`;
        }
        return `Rp ${formatted}`;
      }},
      { key: "testCount_derived", label: "Jumlah Tes", render: (_value: unknown, row: Record<string, unknown>) => {
        const panelTests = row.panelTests;
        if (Array.isArray(panelTests)) {
          return `${panelTests.length} tes`;
        }
        return "—";
      }},
    ],
    formFields: [
      { name: "name", label: "Nama Panel", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
      { name: "price", label: "Harga Panel (Total harga tes individu akan ditampilkan sebagai perbandingan)", type: "number", required: true },
      { name: "discount", label: "Diskon Panel (%)", type: "number" as const },
      { name: "testIds", label: "Pemeriksaan (pilih min. 2 tes)", type: "multi-entity-autocomplete" as const, required: true, endpoint: "/api/v1/master/tests", min: 2 },
    ],
  },
  dokter: {
    displayName: "Dokter",
    useQuery: useMasterDoctors,
    useCreate: useCreateMasterDoctor,
    useUpdate: useUpdateMasterDoctor,
    useDelete: useDeleteMasterDoctor,
    columns: [
      { key: "name", label: "Nama" },
      { key: "specialization", label: "Spesialisasi" },
      { key: "phone", label: "Telepon" },
    ],
    formFields: [
      { name: "name", label: "Nama Dokter", type: "text", required: true },
      { name: "specialization", label: "Spesialisasi", type: "text" },
      { name: "phone", label: "Telepon", type: "text" },
      { name: "email", label: "Email", type: "email" },
    ],
  },
  klinik: {
    displayName: "Klinik",
    useQuery: useMasterClinics,
    useCreate: useCreateMasterClinic,
    useUpdate: useUpdateMasterClinic,
    useDelete: useDeleteMasterClinic,
    columns: [
      { key: "name", label: "Nama" },
      { key: "address", label: "Alamat" },
      { key: "phone", label: "Telepon" },
    ],
    formFields: [
      { name: "name", label: "Nama Klinik", type: "text", required: true },
      { name: "address", label: "Alamat", type: "text" },
      { name: "phone", label: "Telepon", type: "text" },
      { name: "email", label: "Email", type: "email" },
    ],
  },
  asuransi: {
    displayName: "Asuransi",
    useQuery: useMasterInsurances,
    useCreate: useCreateMasterInsurance,
    useUpdate: useUpdateMasterInsurance,
    useDelete: useDeleteMasterInsurance,
    columns: [
      { key: "name", label: "Nama" },
      { key: "code", label: "Kode" },
      { key: "type", label: "Tipe" },
    ],
    formFields: [
      { name: "name", label: "Nama Asuransi", type: "text", required: true },
      { name: "code", label: "Kode", type: "text", required: true },
      { name: "type", label: "Tipe", type: "text" },
    ],
  },
  alat: {
    displayName: "Alat",
    useQuery: useMasterEquipments,
    useCreate: useCreateMasterEquipment,
    useUpdate: useUpdateMasterEquipment,
    useDelete: useDeleteMasterEquipment,
    columns: [
      { key: "name", label: "Nama" },
      { key: "model", label: "Model" },
      { key: "serialNumber", label: "Nomor Seri" },
      { key: "location", label: "Lokasi" },
      { key: "status", label: "Status" },
    ],
    formFields: [
      { name: "name", label: "Nama Alat", type: "text", required: true },
      { name: "model", label: "Model", type: "text" },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
      { name: "serialNumber", label: "Nomor Seri", type: "text" },
      { name: "location", label: "Lokasi", type: "text" },
      { name: "lastCalibration", label: "Kalibrasi Terakhir", type: "date" },
      { name: "nextCalibration", label: "Kalibrasi Berikutnya", type: "date" },
      { name: "status", label: "Status", type: "text" },
    ],
  },
  reagen: {
    displayName: "Reagen",
    useQuery: useMasterReagents,
    useCreate: useCreateMasterReagent,
    useUpdate: useUpdateMasterReagent,
    useDelete: useDeleteMasterReagent,
    columns: [
      { key: "name", label: "Nama" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "quantity", label: "Jumlah Stok" },
      { key: "storageTemp", label: "Suhu Penyimpanan" },
      { key: "expiryDate", label: "Kedaluwarsa", render: (value: unknown) => {
        if (!value) return "—";
        try {
          const expiry = new Date(value as string);
          const now = new Date();
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          const formatted = expiry.toLocaleDateString("id-ID");
          if (expiry <= now) {
            return `🔴 Expired: ${formatted}`;
          }
          if (expiry <= threeMonthsFromNow) {
            return `⚠️ Exp: ${formatted}`;
          }
          return formatted;
        } catch {
          return String(value);
        }
      }},
    ],
    formFields: [
      { name: "code", label: "Kode Reagen", type: "text", required: true },
      { name: "name", label: "Nama Reagen", type: "text", required: true },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
      { name: "lotNumber", label: "Nomor Lot", type: "text" },
      { name: "expiryDate", label: "Tanggal Kedaluwarsa", type: "date" },
      { name: "quantity", label: "Jumlah Stok", type: "number" },
      { name: "storageTemp", label: "Suhu Penyimpanan", type: "text" },
      { name: "equipmentId", label: "Alat", type: "entity-autocomplete" as const, endpoint: "/api/v1/master/equipments", valueKey: "id" as const },
    ],
  },
  metode: {
    displayName: "Metode Pemeriksaan",
    useQuery: useMasterMethods,
    useCreate: useCreateMasterMethod,
    useUpdate: useUpdateMasterMethod,
    useDelete: useDeleteMasterMethod,
    columns: [
      { key: "code", label: "Kode" },
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
      { key: "isActive", label: "Status", render: (value: unknown) => (value ? "Aktif" : "Nonaktif") },
    ],
    formFields: [
      { name: "code", label: "Kode Metode", type: "text", required: true },
      { name: "name", label: "Nama Metode", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
      { name: "isActive", label: "Aktif", type: "checkbox" as const },
    ],
  },
  tarif: {
    displayName: "Tarif",
    useQuery: useMasterTariffs,
    useCreate: useCreateMasterTariff,
    useUpdate: useUpdateMasterTariff,
    useDelete: useDeleteMasterTariff,
    filters: [
      { name: "clinicId", label: "Filter Klinik", endpoint: "/api/v1/master/clinics" },
      { name: "insuranceId", label: "Filter Asuransi", endpoint: "/api/v1/master/insurances" },
    ],
    columns: [
      { key: "test", label: "Tes", render: (value: unknown) => {
        if (value && typeof value === "object" && "name" in (value as Record<string, unknown>)) {
          return (value as Record<string, unknown>).name as string;
        }
        return "—";
      }},
      { key: "clinic", label: "Klinik", render: (value: unknown) => {
        if (value && typeof value === "object" && "name" in (value as Record<string, unknown>)) {
          return (value as Record<string, unknown>).name as string;
        }
        return "— (Semua)";
      }},
      { key: "insurance", label: "Asuransi", render: (value: unknown) => {
        if (value && typeof value === "object" && "name" in (value as Record<string, unknown>)) {
          return (value as Record<string, unknown>).name as string;
        }
        return "— (Semua)";
      }},
      { key: "price", label: "Harga" },
      { key: "effectiveFrom", label: "Berlaku Dari", render: (value: unknown) => {
        if (!value) return "—";
        try {
          return new Date(value as string).toLocaleDateString("id-ID");
        } catch { return String(value); }
      }},
      { key: "effectiveTo", label: "Berlaku Sampai", render: (value: unknown) => {
        if (!value) return "Tidak terbatas";
        try {
          return new Date(value as string).toLocaleDateString("id-ID");
        } catch { return String(value); }
      }},
    ],
    formFields: [
      { name: "testId", label: "Tes", type: "entity-autocomplete" as const, required: true, endpoint: "/api/v1/master/tests" },
      { name: "clinicId", label: "Klinik", type: "entity-autocomplete" as const, endpoint: "/api/v1/master/clinics" },
      { name: "insuranceId", label: "Asuransi", type: "entity-autocomplete" as const, endpoint: "/api/v1/master/insurances" },
      { name: "price", label: "Harga", type: "number" as const, required: true },
      { name: "discount", label: "Diskon (%)", type: "number" as const },
      { name: "effectiveFrom", label: "Berlaku Dari", type: "date" as const, required: true },
      { name: "effectiveTo", label: "Berlaku Sampai", type: "date" as const },
    ],
  },
  users: {
    displayName: "Users",
    useQuery: useUsersForEntity,
    useCreate: useCreateUserForEntity,
    useUpdate: useUpdateUserForEntity,
    useDelete: useDeleteUserForEntity,
    columns: [
      { key: "email", label: "Email" },
      { key: "name", label: "Nama" },
      { key: "role", label: "Role" },
      { key: "createdAt", label: "Tanggal Dibuat" },
    ],
    formFields: [
      { name: "email", label: "Email", type: "email", required: true },
      { name: "name", label: "Nama", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "role", label: "Role", type: "select", required: true },
    ],
  },
};

// ─── Page Component ──────────────────────────────────────────────────────────

export default function MasterDataEntityPage() {
  const params = useParams();
  const entity = params.entity as string;

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);
  // Gap 4: Import preview state
  const [importPreview, setImportPreview] = useState<{ file: File; rows: Record<string, string>[]; } | null>(null);
  const [importing, setImporting] = useState(false);

  // Look up entity configuration
  const config = entityConfigs[entity];

  // Hooks must be called unconditionally — use a fallback config for invalid slugs
  const queryHook = config?.useQuery ?? useMasterUnits;
  const createHook = config?.useCreate ?? useCreateMasterUnit;
  const updateHook = config?.useUpdate ?? useUpdateMasterUnit;
  const deleteHook = config?.useDelete ?? useDeleteMasterUnit;

  // Call hooks (must be unconditional per React rules)
  const queryResult = queryHook({ page, limit: 10, search: search || undefined, ...filters });
  const createMutation = createHook();
  const updateMutation = updateHook();
  const deleteMutation = deleteHook();

  // CRITICAL: Unwrap paginated response — extract .data array from wrapper
  // Response shape is { data: [...], meta: {...} } — we must extract .data before .map()
  const items = (queryResult.data?.data ?? []) as Record<string, unknown>[];
  const meta = queryResult.data?.meta;

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearch(query);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((filterName: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[filterName] = value;
      } else {
        delete next[filterName];
      }
      return next;
    });
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleEdit = useCallback((row: Record<string, unknown>) => {
    // Transform panelTests to testIds for panel entity editing
    if (entity === "panel" && Array.isArray(row.panelTests)) {
      const testIds = (row.panelTests as Array<{ testId: string }>).map((pt) => pt.testId);
      setEditingItem({ ...row, testIds });
    } else {
      setEditingItem(row);
    }
    setIsModalOpen(true);
  }, [entity]);

  const handleDelete = useCallback((row: Record<string, unknown>) => {
    setDeleteConfirm(row);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm?.id) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id as string);
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, deleteMutation]);

  // Gap 5: Bulk delete handler
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch { /* continue with remaining */ }
    }
  }, [deleteMutation]);

  // Gap 7: Detect duplicate names in current data
  const duplicateNames = useMemo(() => {
    const nameCount = new Map<string, number>();
    for (const item of items) {
      const name = item.name as string;
      if (name) nameCount.set(name, (nameCount.get(name) || 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [name, count] of nameCount) {
      if (count > 1) dupes.add(name);
    }
    return dupes;
  }, [items]);

  const handleFormSubmit = useCallback(
    async (formData: Record<string, unknown>) => {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id as string,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    },
    [editingItem, createMutation, updateMutation]
  );

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
  }, []);

  // Handle invalid entity slug — show not found message
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Halaman Tidak Ditemukan
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Entity master data &quot;{entity}&quot; tidak tersedia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {config.displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data {config.displayName.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* UI-MD-02: Import/Export buttons for supported entities */}
          {["pemeriksaan-lab", "tarif", "dokter", "klinik"].includes(entity) && (
            <>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Gap 4: Read file and show preview before importing
                    try {
                      const text = await file.text();
                      const lines = text.split("\n").filter((l) => l.trim());
                      if (lines.length < 2) { alert("File kosong atau hanya berisi header."); e.target.value = ""; return; }
                      const headers = lines[0].replace(/^\ufeff/, "").split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
                      const previewRows: Record<string, string>[] = [];
                      for (let i = 1; i < Math.min(lines.length, 11); i++) {
                        const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
                        const row: Record<string, string> = {};
                        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
                        previewRows.push(row);
                      }
                      setImportPreview({ file, rows: previewRows });
                    } catch { alert("Gagal membaca file."); }
                    e.target.value = "";
                  }}
                />
                Import CSV/Excel
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  const exportEntity = entity === "pemeriksaan-lab" ? "tests" : entity === "tarif" ? "tariffs" : entity === "dokter" ? "doctors" : entity === "panel" ? "panels" : "clinics";
                  const token = typeof window !== "undefined" ? localStorage.getItem("elis_token") || "" : "";
                  fetch(`/api/v1/master/export/${exportEntity}?format=csv`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((res) => {
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      return res.blob();
                    })
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${exportEntity}-export.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    })
                    .catch((err) => {
                      alert(`Export gagal: ${err.message || "Terjadi kesalahan"}`);
                    });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Export CSV
              </a>
            </>
          )}
          <Button
            onClick={handleOpenCreate}
            className="gap-2 rounded-xl bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Entity Filters (e.g. tarif filter by clinic/insurance) */}
      {config.filters && config.filters.length > 0 && (
        <EntityFilterBar
          filters={config.filters}
          values={filters}
          onChange={handleFilterChange}
        />
      )}

      {/* Table */}
      <MasterDataTable
        columns={config.columns}
        data={items}
        meta={meta}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={entity === "pemeriksaan-lab" ? handleBulkDelete : undefined}
        onSearch={handleSearch}
        onPageChange={handlePageChange}
        isLoading={queryResult.isLoading}
        duplicateNames={entity === "pemeriksaan-lab" ? duplicateNames : undefined}
        renderExpandedRow={
          entity === "pemeriksaan-lab"
            ? (row) => <TestDetailPanel testId={row.id as string} />
            : undefined
        }
      />

      {/* Create/Edit Modal */}
      <MasterDataFormModal
        fields={config.formFields}
        initialData={editingItem ?? undefined}
        onSubmit={handleFormSubmit}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? `Edit ${config.displayName}` : `Tambah ${config.displayName}`}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog (UI-MD-06: with dependency warning) */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <h3
              id="delete-dialog-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Hapus Data
            </h3>
            <p
              id="delete-dialog-description"
              className="mt-2 text-sm text-slate-500 dark:text-slate-400"
            >
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {(deleteConfirm.name as string) ?? (deleteConfirm.code as string) ?? "item ini"}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            {/* UI-MD-06: Dependency warning for entities with relations */}
            {entity === "pemeriksaan-lab" && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Jika pemeriksaan ini digunakan oleh order aktif, panel, atau tarif, penghapusan akan ditolak oleh sistem (ERR_REFERENCE_CONFLICT).
                </p>
              </div>
            )}
            {entity === "kategori-pemeriksaan" && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Kategori yang masih memiliki pemeriksaan aktif tidak dapat dihapus.
                </p>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl px-4 py-2"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gap 4: Import Preview Dialog */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setImportPreview(null)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Preview Import</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              File: <span className="font-medium">{importPreview.file.name}</span> — menampilkan {importPreview.rows.length} baris pertama
            </p>

            <div className="mt-4 flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr>
                    {Object.keys(importPreview.rows[0] || {}).map((key) => (
                      <th key={key} className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {importPreview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                          {val || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">Total file kemungkinan lebih banyak dari preview.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setImportPreview(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    setImporting(true);
                    const entityMap: Record<string, string> = { "pemeriksaan-lab": "tests", tarif: "tariffs", dokter: "doctors", klinik: "clinics" };
                    const importType = entityMap[entity] ?? entity;
                    const formData = new FormData();
                    formData.append("file", importPreview.file);
                    try {
                      const token = typeof window !== "undefined" ? localStorage.getItem("elis_token") || localStorage.getItem("token") || "" : "";
                      const resp = await fetch(`/api/v1/master/import/${importType}`, { method: "POST", body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} });
                      const result = await resp.json();
                      if (result.success !== false && resp.ok) {
                        const importData = result.data ?? result;
                        const count = importData?.successCount ?? 0;
                        const errorCount = importData?.errorCount ?? 0;
                        const errors = importData?.errors as Array<{ row: number; field: string; message: string }> | undefined;
                        let msg = errorCount > 0
                          ? `Import selesai: ${count} data berhasil, ${errorCount} data gagal.`
                          : `Import berhasil: ${count} data diimpor.`;
                        // Show first 3 error details
                        if (errors && errors.length > 0) {
                          const details = errors.slice(0, 3).map((e) => `  Baris ${e.row}: ${e.message}`).join("\n");
                          msg += `\n\nDetail error:\n${details}`;
                          if (errors.length > 3) msg += `\n  ... dan ${errors.length - 3} error lainnya`;
                        }
                        alert(msg);
                        if (count > 0) window.location.reload();
                      } else {
                        alert(`Import gagal: ${result.message || result.data?.message || "Unknown error"}`);
                      }
                    } catch { alert("Import gagal. Periksa format file."); }
                    setImporting(false);
                    setImportPreview(null);
                  }}
                  disabled={importing}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {importing ? "Mengimpor..." : `Import ${importPreview.rows.length}+ Data`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
