/**
 * Dashboard Service — TanStack Query hooks for dashboard & reports
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const dashboardKeys = {
  all: ["dashboard"] as const,
  executiveSummary: () => [...dashboardKeys.all, "executive-summary"] as const,
  recentOrders: () => [...dashboardKeys.all, "recent-orders"] as const,
  labSummary: () => [...dashboardKeys.all, "lab-summary"] as const,
  labVolume: (days?: number) => [...dashboardKeys.all, "lab-volume", days] as const,
  regionDistribution: () => [...dashboardKeys.all, "region-distribution"] as const,
};

export const reportKeys = {
  all: ["reports"] as const,
  revenue: (params?: Record<string, unknown>) => [...reportKeys.all, "revenue", params] as const,
  ordersByStatus: (params?: Record<string, unknown>) => [...reportKeys.all, "by-status", params] as const,
  ordersByPayment: (params?: Record<string, unknown>) => [...reportKeys.all, "by-payment", params] as const,
  topTests: (params?: Record<string, unknown>) => [...reportKeys.all, "top-tests", params] as const,
  insuranceClaims: (params?: Record<string, unknown>) => [...reportKeys.all, "insurance-claims", params] as const,
  turnaroundTime: (params?: Record<string, unknown>) => [...reportKeys.all, "tat", params] as const,
};

// ─── Dashboard Hooks ─────────────────────────────────────────────────────────

export function useExecutiveSummary() {
  return useQuery({
    queryKey: dashboardKeys.executiveSummary(),
    queryFn: () => apiClient.get("/api/v1/dashboard/executive-summary"),
    staleTime: 15_000, // 15 seconds
  });
}

export function useRecentOrders() {
  return useQuery({
    queryKey: dashboardKeys.recentOrders(),
    queryFn: () => apiClient.get("/api/v1/dashboard/recent-orders"),
    staleTime: 15_000,
  });
}

export function useLabSummary() {
  return useQuery({
    queryKey: dashboardKeys.labSummary(),
    queryFn: () => apiClient.get("/api/v1/dashboard/lab-summary"),
    staleTime: 30_000,
  });
}

export function useLabVolume(days = 30) {
  return useQuery({
    queryKey: dashboardKeys.labVolume(days),
    queryFn: () => apiClient.get(`/api/v1/dashboard/lab-volume?days=${days}`),
    staleTime: 60_000,
  });
}

// ─── Reports Hooks ───────────────────────────────────────────────────────────

interface ReportParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  [key: string]: unknown;
}

function buildReportQs(params?: ReportParams): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.limit) qs.set("limit", String(params.limit));
  return qs.toString() ? `?${qs.toString()}` : "";
}

export function useRevenueSummary(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.revenue(params),
    queryFn: () => apiClient.get(`/api/v1/reports/revenue-summary${buildReportQs(params)}`),
    staleTime: 60_000,
  });
}

export function useOrdersByStatus(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.ordersByStatus(params),
    queryFn: () => apiClient.get(`/api/v1/reports/orders-by-status${buildReportQs(params)}`),
    staleTime: 60_000,
  });
}

export function useOrdersByPaymentMethod(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.ordersByPayment(params),
    queryFn: () => apiClient.get(`/api/v1/reports/orders-by-payment-method${buildReportQs(params)}`),
    staleTime: 60_000,
  });
}

export function useTopTests(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.topTests(params),
    queryFn: () => apiClient.get(`/api/v1/reports/top-tests${buildReportQs(params)}`),
    staleTime: 60_000,
  });
}

export function useInsuranceClaims(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.insuranceClaims(params),
    queryFn: () => apiClient.get(`/api/v1/reports/insurance-claims${buildReportQs(params)}`),
    staleTime: 60_000,
  });
}

export function useTurnaroundTime(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.turnaroundTime(params),
    queryFn: () => apiClient.get(`/api/v1/reports/turnaround-time${buildReportQs(params)}`),
    staleTime: 60_000,
  });
}
