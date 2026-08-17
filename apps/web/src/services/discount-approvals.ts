/**
 * Discount Approvals Service — TanStack Query hooks for Discount Approval domain
 * Requirements: 9.6
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscountApprovalRequest {
  id: string;
  requesterId: string;
  requestType: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  payload: {
    orderId: string;
    discountPercent: number;
    discountAmount: number;
    discountReason: string;
  };
  maxLevel: number;
  currentLevel: number;
  reason?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  steps: DiscountApprovalStep[];
  // Populated from relations
  requester?: { id: string; email: string; name?: string; role: string };
}

export interface DiscountApprovalStep {
  id: string;
  approvalRequestId: string;
  level: number;
  approverId: string;
  action: string;
  comment?: string | null;
  actedAt: string;
  approver?: { id: string; email: string; name?: string; role: string };
}

export interface CreateDiscountApprovalPayload {
  orderId: string;
  discountPercent: number;
  discountAmount: number;
  discountReason: string;
}

export interface DecideDiscountApprovalPayload {
  decision: "APPROVE" | "REJECT";
  comment?: string;
  reason?: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const discountApprovalKeys = {
  all: ["discount-approvals"] as const,
  pending: () => [...discountApprovalKeys.all, "pending"] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function usePendingDiscountApprovals() {
  return useQuery({
    queryKey: discountApprovalKeys.pending(),
    queryFn: () =>
      apiClient.get<DiscountApprovalRequest[]>("/api/v1/approvals/discount/pending"),
  });
}

export function useCreateDiscountApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDiscountApprovalPayload) =>
      apiClient.post("/api/v1/approvals/discount", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountApprovalKeys.pending() });
    },
  });
}

export function useDecideDiscountApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: DecideDiscountApprovalPayload & { id: string }) =>
      apiClient.post(`/api/v1/approvals/discount/${id}/decide`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discountApprovalKeys.pending() });
    },
  });
}
