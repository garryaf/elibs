/**
 * Master Data Service — TanStack Query hooks for master data entities
 *
 * Each entity follows the same pattern:
 * - Query key factory for cache management
 * - useQuery hook for fetching paginated lists
 * - useMutation hooks for create, update, delete with cache invalidation
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const masterDataKeys = {
  all: ["master-data"] as const,

  // Satuan (measurement-units)
  units: {
    all: ["master-data", "units"] as const,
    lists: () => [...masterDataKeys.units.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.units.lists(), params] as const,
    details: () => [...masterDataKeys.units.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.units.details(), id] as const,
  },

  // Jenis Sampel (sample-types)
  sampleTypes: {
    all: ["master-data", "sample-types"] as const,
    lists: () => [...masterDataKeys.sampleTypes.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.sampleTypes.lists(), params] as const,
    details: () => [...masterDataKeys.sampleTypes.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.sampleTypes.details(), id] as const,
  },

  // Dokter (doctors)
  doctors: {
    all: ["master-data", "doctors"] as const,
    lists: () => [...masterDataKeys.doctors.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.doctors.lists(), params] as const,
    details: () => [...masterDataKeys.doctors.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.doctors.details(), id] as const,
  },

  // Klinik (clinics)
  clinics: {
    all: ["master-data", "clinics"] as const,
    lists: () => [...masterDataKeys.clinics.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.clinics.lists(), params] as const,
    details: () => [...masterDataKeys.clinics.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.clinics.details(), id] as const,
  },

  // Asuransi (insurances)
  insurances: {
    all: ["master-data", "insurances"] as const,
    lists: () => [...masterDataKeys.insurances.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.insurances.lists(), params] as const,
    details: () => [...masterDataKeys.insurances.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.insurances.details(), id] as const,
  },

  // Alat (equipments)
  equipments: {
    all: ["master-data", "equipments"] as const,
    lists: () => [...masterDataKeys.equipments.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.equipments.lists(), params] as const,
    details: () => [...masterDataKeys.equipments.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.equipments.details(), id] as const,
  },

  // Reagen (reagents)
  reagents: {
    all: ["master-data", "reagents"] as const,
    lists: () => [...masterDataKeys.reagents.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.reagents.lists(), params] as const,
    details: () => [...masterDataKeys.reagents.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.reagents.details(), id] as const,
  },

  // Kategori Pemeriksaan (test-categories)
  testCategories: {
    all: ["master-data", "test-categories"] as const,
    lists: () => [...masterDataKeys.testCategories.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.testCategories.lists(), params] as const,
    details: () => [...masterDataKeys.testCategories.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.testCategories.details(), id] as const,
  },

  // Pemeriksaan Lab (tests)
  tests: {
    all: ["master-data", "tests"] as const,
    lists: () => [...masterDataKeys.tests.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.tests.lists(), params] as const,
    details: () => [...masterDataKeys.tests.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.tests.details(), id] as const,
  },

  // Panel (panels)
  panels: {
    all: ["master-data", "panels"] as const,
    lists: () => [...masterDataKeys.panels.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.panels.lists(), params] as const,
    details: () => [...masterDataKeys.panels.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.panels.details(), id] as const,
  },

  // Tarif (tariffs)
  tariffs: {
    all: ["master-data", "tariffs"] as const,
    lists: () => [...masterDataKeys.tariffs.all, "list"] as const,
    list: (params: Record<string, unknown>) => [...masterDataKeys.tariffs.lists(), params] as const,
    details: () => [...masterDataKeys.tariffs.all, "detail"] as const,
    detail: (id: string) => [...masterDataKeys.tariffs.details(), id] as const,
  },
};

// ─── Satuan (Measurement Units) ─────────────────────────────────────────────

export function useMasterUnits(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.units.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/units${query}`),
  });
}

export function useCreateMasterUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.units.lists() });
    },
  });
}

export function useUpdateMasterUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/units/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.units.lists() });
    },
  });
}

export function useDeleteMasterUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.units.lists() });
    },
  });
}

// ─── Jenis Sampel (Sample Types) ─────────────────────────────────────────────

export function useMasterSampleTypes(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.sampleTypes.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/sample-types${query}`),
  });
}

export function useCreateMasterSampleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/sample-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.sampleTypes.lists() });
    },
  });
}

export function useUpdateMasterSampleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/sample-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.sampleTypes.lists() });
    },
  });
}

export function useDeleteMasterSampleType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/sample-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.sampleTypes.lists() });
    },
  });
}

// ─── Dokter (Doctors) ─────────────────────────────────────────────────────────

export function useMasterDoctors(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.doctors.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/doctors${query}`),
  });
}

export function useCreateMasterDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/doctors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.doctors.lists() });
    },
  });
}

export function useUpdateMasterDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/doctors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.doctors.lists() });
    },
  });
}

export function useDeleteMasterDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/doctors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.doctors.lists() });
    },
  });
}

// ─── Klinik (Clinics) ─────────────────────────────────────────────────────────

export function useMasterClinics(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.clinics.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/clinics${query}`),
  });
}

export function useCreateMasterClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/clinics", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.clinics.lists() });
    },
  });
}

export function useUpdateMasterClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/clinics/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.clinics.lists() });
    },
  });
}

export function useDeleteMasterClinic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/clinics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.clinics.lists() });
    },
  });
}

// ─── Asuransi (Insurances) ───────────────────────────────────────────────────

export function useMasterInsurances(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.insurances.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/insurances${query}`),
  });
}

export function useCreateMasterInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/insurances", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.insurances.lists() });
    },
  });
}

export function useUpdateMasterInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/insurances/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.insurances.lists() });
    },
  });
}

export function useDeleteMasterInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/insurances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.insurances.lists() });
    },
  });
}

// ─── Alat (Equipments) ───────────────────────────────────────────────────────

export function useMasterEquipments(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.equipments.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/equipments${query}`),
  });
}

export function useCreateMasterEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/equipments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.equipments.lists() });
    },
  });
}

export function useUpdateMasterEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/equipments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.equipments.lists() });
    },
  });
}

export function useDeleteMasterEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/equipments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.equipments.lists() });
    },
  });
}

// ─── Reagen (Reagents) ───────────────────────────────────────────────────────

export function useMasterReagents(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.reagents.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/reagents${query}`),
  });
}

export function useCreateMasterReagent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/reagents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.reagents.lists() });
    },
  });
}

export function useUpdateMasterReagent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/reagents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.reagents.lists() });
    },
  });
}

export function useDeleteMasterReagent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/reagents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.reagents.lists() });
    },
  });
}

// ─── Kategori Pemeriksaan (Test Categories) ──────────────────────────────────

export function useMasterTestCategories(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.testCategories.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/test-categories${query}`),
  });
}

export function useCreateMasterTestCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/test-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.testCategories.lists() });
    },
  });
}

export function useUpdateMasterTestCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/test-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.testCategories.lists() });
    },
  });
}

export function useDeleteMasterTestCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/test-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.testCategories.lists() });
    },
  });
}

// ─── Pemeriksaan Lab (Tests) ─────────────────────────────────────────────────

export function useMasterTests(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.tests.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/tests${query}`),
  });
}

export function useCreateMasterTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/tests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.tests.lists() });
    },
  });
}

export function useUpdateMasterTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.tests.lists() });
    },
  });
}

export function useDeleteMasterTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/tests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.tests.lists() });
    },
  });
}

// ─── Panel (Panels) ──────────────────────────────────────────────────────────

export function useMasterPanels(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.panels.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/panels${query}`),
  });
}

export function useCreateMasterPanel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/panels", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.panels.lists() });
    },
  });
}

export function useUpdateMasterPanel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/panels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.panels.lists() });
    },
  });
}

export function useDeleteMasterPanel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/panels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.panels.lists() });
    },
  });
}

// ─── Tarif (Tariffs) ─────────────────────────────────────────────────────────

export function useMasterTariffs(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery({
    queryKey: masterDataKeys.tariffs.list(params ?? {}),
    queryFn: () => apiClient.get<{ data: unknown[]; meta: { total: number; page: number; limit: number } }>(`/api/v1/master/tariffs${query}`),
  });
}

export function useCreateMasterTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiClient.post("/api/v1/master/tariffs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.tariffs.lists() });
    },
  });
}

export function useUpdateMasterTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      apiClient.put(`/api/v1/master/tariffs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.tariffs.lists() });
    },
  });
}

export function useDeleteMasterTariff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/master/tariffs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterDataKeys.tariffs.lists() });
    },
  });
}
