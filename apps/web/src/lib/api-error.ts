/**
 * eLIS — API Error Utilities
 * Helpers for extracting structured error information from API responses.
 *
 * The backend throws ErrorEnvelope objects with field-level `errors[]` arrays.
 * These utilities parse that structure so forms can display per-field messages
 * instead of generic "Bad Request" toasts.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single field-level validation error from the backend.
 */
export interface ApiFieldError {
  field: string;
  constraint: string;
}

/**
 * Shape of API error responses thrown by the ApiClient.
 * Matches the backend ErrorEnvelope structure.
 */
export interface ApiErrorResponse {
  status?: number;
  success?: boolean;
  errorCode?: string;
  message?: string;
  errors?: ApiFieldError[];
  requiredPermission?: string;
  userRole?: string;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Extract field-level errors from an API error into a Record<field, message> for form usage.
 * Returns null if no field-level errors are available.
 */
export function extractFieldErrors(error: unknown): Record<string, string> | null {
  const apiError = error as ApiErrorResponse;
  if (!apiError?.errors || !Array.isArray(apiError.errors) || apiError.errors.length === 0) {
    return null;
  }

  const fieldErrors: Record<string, string> = {};
  for (const err of apiError.errors) {
    if (err.field && err.constraint) {
      fieldErrors[err.field] = err.constraint;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

/**
 * Extract the best human-readable error message from an API error.
 * Prefers field-level error list, falls back to message, then generic.
 */
export function getErrorMessage(error: unknown, fallback = "Terjadi kesalahan. Silakan coba lagi."): string {
  const apiError = error as ApiErrorResponse;

  // If there are field-level errors, join them for display
  if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
    const messages = apiError.errors
      .map((e) => e.constraint || e.field)
      .filter(Boolean);
    if (messages.length > 0) return messages.join(". ");
  }

  // Fall back to message field
  if (apiError?.message && typeof apiError.message === "string") {
    return apiError.message;
  }

  // Generic fallback
  return fallback;
}

/**
 * Check if an error is a 403 Forbidden with permission details.
 */
export function isForbiddenError(error: unknown): error is ApiErrorResponse & { status: 403 } {
  const apiError = error as ApiErrorResponse;
  return apiError?.status === 403;
}

/**
 * Get a user-friendly 403 message, including required permission if available.
 */
export function getForbiddenMessage(error: unknown): string {
  const apiError = error as ApiErrorResponse;
  if (apiError?.requiredPermission) {
    return `Akses ditolak. Izin diperlukan: ${apiError.requiredPermission}`;
  }
  return "Akses ditolak. Anda tidak memiliki izin untuk operasi ini.";
}
