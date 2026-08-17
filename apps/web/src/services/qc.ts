/**
 * QC Service — TanStack Query hooks for Quality Control domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QCSample {
  id: string;
  name: string;
  lotNumber: string;
  manufacturer?: string;
  level: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface QCTestStatus {
  testId: string;
  testName: string;
  testCode: string;
  lastRunDate?: string;
  passed: boolean;
  violatedRule?: string;
  totalRuns: number;
  passRate: number;
}

export interface QCDashboardData {
  totalSamples: number;
  activeSamples: number;
  totalRunsToday: number;
  passRate: number;
  testStatuses: QCTestStatus[];
  recentViolations: {
    id: string;
    testName: string;
    rule: string;
    date: string;
    value: number;
  }[];
}

export interface LeveyJenningsData {
  mean: number;
  sd: number;
  dataPoints: {
    date: string;
    value: number;
    westgardPass: boolean;
    violatedRule?: string | null;
  }[];
}

export interface CreateQCSamplePayload {
  name: string;
  lotNumber: string;
  manufacturer?: string;
  level: number;
  expiryDate: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const qcKeys = {
  all: ["qc"] as const,
  dashboard: () => [...qcKeys.all, "dashboard"] as const,
  samples: (params?: Record<string, unknown>) => [...qcKeys.all, "samples", params] as const,
  leveyJennings: (sampleId: string) => [...qcKeys.all, "levey-jennings", sampleId] as const,
  testStatus: (testId: string) => [...qcKeys.all, "test-status", testId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useQCDashboard() {
  return useQuery({
    queryKey: qcKeys.dashboard(),
    queryFn: () => apiClient.get<QCDashboardData>("/api/v1/qc/dashboard"),
  });
}

export function useQCSamples() {
  return useQuery({
    queryKey: qcKeys.samples(),
    queryFn: () => apiClient.get<QCSample[]>("/api/v1/qc/samples"),
  });
}

export function useLeveyJennings(sampleId: string) {
  return useQuery({
    queryKey: qcKeys.leveyJennings(sampleId),
    queryFn: () => apiClient.get<LeveyJenningsData>(`/api/v1/qc/samples/${sampleId}/levey-jennings`),
    enabled: !!sampleId,
  });
}

export function useQCTestStatus(testId: string) {
  return useQuery({
    queryKey: qcKeys.testStatus(testId),
    queryFn: () => apiClient.get<QCTestStatus>(`/api/v1/qc/status/${testId}`),
    enabled: !!testId,
  });
}

export function useCreateQCSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQCSamplePayload) =>
      apiClient.post("/api/v1/qc/samples", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qcKeys.samples() });
      queryClient.invalidateQueries({ queryKey: qcKeys.dashboard() });
    },
  });
}
