/**
 * eLIS — Domain Services (TanStack Query Hooks)
 *
 * Usage:
 *   import { usePatients, useCreateOrder, useLabQueue } from "@/services";
 *
 * Each service file provides:
 * - Query keys (for cache invalidation)
 * - useQuery hooks (for data fetching)
 * - useMutation hooks (for create/update/delete)
 */

export * from "./patients";
export * from "./orders";
export * from "./lab";
export * from "./dashboard";
export * from "./users";
