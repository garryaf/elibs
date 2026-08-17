/**
 * Patient Insurance Service — TanStack Query hooks for patient insurance management
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsuranceType = "BPJS" | "SWASTA" | "CORPORATE";

export interface PatientInsurance {
  id: string;
  patientId: string;
  insuranceId: string;
  memberNumber?: string | null;
  policyNumber?: string | null;
  priority: number;
  type?: InsuranceType | null;
  bpjsClassLevel?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  insurance?: {
    id: string;
    code: string;
    name: string;
    type?: InsuranceType | null;
  };
}

export interface AddPatientInsuranceData {
  insuranceId: string;
  memberNumber?: string;
  policyNumber?: string;
  priority: number;
  type?: InsuranceType;
  bpjsClassLevel?: number;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
}

export interface UpdatePatientInsuranceData {
  memberNumber?: string;
  policyNumber?: string;
  priority?: number;
  type?: InsuranceType;
  bpjsClassLevel?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  notes?: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const patientInsuranceKeys = {
  all: ["patient-insurance"] as const,
  byPatient: (patientId: string) =>
    [...patientInsuranceKeys.all, "patient", patientId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetch all insurance records for a patient
 */
export function usePatientInsurances(patientId: string) {
  return useQuery({
    queryKey: patientInsuranceKeys.byPatient(patientId),
    queryFn: () => apiClient.get(`/api/v1/patients/${patientId}/insurances`),
    enabled: !!patientId,
  });
}

/**
 * Add insurance to a patient
 */
export function useAddPatientInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      patientId,
      data,
    }: {
      patientId: string;
      data: AddPatientInsuranceData;
    }) => apiClient.post(`/api/v1/patients/${patientId}/insurances`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: patientInsuranceKeys.byPatient(variables.patientId),
      });
    },
  });
}

/**
 * Update a patient insurance record
 */
export function useUpdatePatientInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      patientId,
      insuranceRecordId,
      data,
    }: {
      patientId: string;
      insuranceRecordId: string;
      data: UpdatePatientInsuranceData;
    }) =>
      apiClient.put(
        `/api/v1/patients/insurances/${insuranceRecordId}`,
        data
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: patientInsuranceKeys.byPatient(variables.patientId),
      });
    },
  });
}

/**
 * Remove a patient insurance record
 */
export function useRemovePatientInsurance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      patientId,
      insuranceRecordId,
    }: {
      patientId: string;
      insuranceRecordId: string;
    }) => apiClient.delete(`/api/v1/patients/insurances/${insuranceRecordId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: patientInsuranceKeys.byPatient(variables.patientId),
      });
    },
  });
}
