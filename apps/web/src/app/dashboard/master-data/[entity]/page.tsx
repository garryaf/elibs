"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MasterDataTable } from "@/components/master-data/MasterDataTable";
import { MasterDataFormModal } from "@/components/master-data/MasterDataFormModal";
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
}

interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select";
  required?: boolean;
}

interface EntityConfig {
  displayName: string;
  useQuery: (params?: { page?: number; limit?: number; search?: string }) => {
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
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
    ],
    formFields: [
      { name: "name", label: "Nama Satuan", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
    ],
  },
  "jenis-sampel": {
    displayName: "Jenis Sampel",
    useQuery: useMasterSampleTypes,
    useCreate: useCreateMasterSampleType,
    useUpdate: useUpdateMasterSampleType,
    useDelete: useDeleteMasterSampleType,
    columns: [
      { key: "name", label: "Nama" },
      { key: "description", label: "Deskripsi" },
    ],
    formFields: [
      { name: "name", label: "Nama Jenis Sampel", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
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
      { key: "category", label: "Kategori" },
    ],
    formFields: [
      { name: "name", label: "Nama Pemeriksaan", type: "text", required: true },
      { name: "code", label: "Kode", type: "text", required: true },
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
      { key: "description", label: "Deskripsi" },
      { key: "price", label: "Harga" },
    ],
    formFields: [
      { name: "name", label: "Nama Panel", type: "text", required: true },
      { name: "description", label: "Deskripsi", type: "text" },
      { name: "price", label: "Harga", type: "number", required: true },
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
      { key: "status", label: "Status" },
    ],
    formFields: [
      { name: "name", label: "Nama Alat", type: "text", required: true },
      { name: "model", label: "Model", type: "text" },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
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
      { key: "expiryDate", label: "Tanggal Kedaluwarsa" },
    ],
    formFields: [
      { name: "code", label: "Kode Reagen", type: "text", required: true },
      { name: "name", label: "Nama Reagen", type: "text", required: true },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
      { name: "lotNumber", label: "Nomor Lot", type: "text" },
      { name: "expiryDate", label: "Tanggal Kedaluwarsa", type: "text" },
    ],
  },
  tarif: {
    displayName: "Tarif",
    useQuery: useMasterTariffs,
    useCreate: useCreateMasterTariff,
    useUpdate: useUpdateMasterTariff,
    useDelete: useDeleteMasterTariff,
    columns: [
      { key: "test.name", label: "Tes" },
      { key: "price", label: "Harga" },
      { key: "discount", label: "Diskon" },
    ],
    formFields: [
      { name: "testId", label: "Tes", type: "text", required: true },
      { name: "clinicId", label: "Klinik", type: "text" },
      { name: "insuranceId", label: "Asuransi", type: "text" },
      { name: "price", label: "Harga", type: "number", required: true },
      { name: "discount", label: "Diskon", type: "number" },
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);

  // Look up entity configuration
  const config = entityConfigs[entity];

  // Hooks must be called unconditionally — use a fallback config for invalid slugs
  const queryHook = config?.useQuery ?? useMasterUnits;
  const createHook = config?.useCreate ?? useCreateMasterUnit;
  const updateHook = config?.useUpdate ?? useUpdateMasterUnit;
  const deleteHook = config?.useDelete ?? useDeleteMasterUnit;

  // Call hooks (must be unconditional per React rules)
  const queryResult = queryHook({ page, limit: 10, search: search || undefined });
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

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleEdit = useCallback((row: Record<string, unknown>) => {
    setEditingItem(row);
    setIsModalOpen(true);
  }, []);

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
        <Button
          onClick={handleOpenCreate}
          className="gap-2 rounded-xl bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* Table */}
      <MasterDataTable
        columns={config.columns}
        data={items}
        meta={meta}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSearch={handleSearch}
        onPageChange={handlePageChange}
        isLoading={queryResult.isLoading}
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

      {/* Delete Confirmation Dialog */}
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
                {(deleteConfirm.name as string) ?? "item ini"}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
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
    </div>
  );
}
