/**
 * Notification Service — TanStack Query hooks for notifications domain
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) => [...notificationKeys.lists(), params] as const,
};

export function useNotifications(params?: { page?: number; limit?: number; status?: string; type?: string; orderId?: string }) {
  return useQuery({
    queryKey: notificationKeys.list(params ?? {}),
    queryFn: () => apiClient.get(`/api/v1/notifications?${new URLSearchParams(params as any).toString()}`),
  });
}

export function useRetryNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/notifications/${id}/retry`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
