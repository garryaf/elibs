/**
 * Shared pagination response interface (MED-020).
 *
 * All paginated API responses MUST use this shape for consistency.
 * Frontend expects: { data: T[], meta: { total, page, limit, totalPages } }
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Helper to build a PaginatedResult from query results.
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
