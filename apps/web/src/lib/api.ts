/**
 * eLIS — API Client
 * Centralized HTTP client for communicating with the NestJS backend.
 * Uses native fetch with NEXT_PUBLIC_API_URL from environment.
 */

import type { Patient, PatientFormData } from "@/types/patient";
import type { Order } from "@/types/order";

/**
 * API base URL configuration:
 * - In all environments, the frontend uses relative paths (/api/v1/...).
 * - Routing to the actual API backend is handled by:
 *   - Production: Nginx reverse proxy (location /api/ → :3001)
 *   - Local Docker: Next.js rewrites in next.config.ts (→ api:3001)
 *   - Direct access: Set NEXT_PUBLIC_API_URL to override (e.g., http://localhost:3001)
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// ─── Constants ────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  TOKEN: "elis_token",
  REFRESH_TOKEN: "elis_refresh_token",
  USER: "elis_user",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: { email: string; sub: string; role: string };
  };
}

// ─── Query String Utility ─────────────────────────────────────────────────────

/**
 * Builds a query string from a parameters record.
 * Omits undefined, null, empty string, and "ALL" values.
 */
export function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      qs.set(key, String(value));
    }
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

// ─── Defensive Unwrap Utility ─────────────────────────────────────────────────

function isDoubleEnvelope(val: unknown): val is { success: boolean; message: string; data: unknown } {
  if (val === null || val === undefined || typeof val !== "object" || Array.isArray(val)) {
    return false;
  }
  const rec = val as Record<string, unknown>;
  return (
    typeof rec.success === "boolean" &&
    typeof rec.message === "string" &&
    "data" in rec
  );
}

/**
 * Detects and unwraps double-envelope responses.
 *
 * Some controllers manually wrap their return value with `{ success, message, data }`,
 * and then `TransformInterceptor` wraps again. This utility detects the double-wrap
 * shape and extracts the inner payload.
 */
export function unwrapResponse<T>(data: unknown): T {
  if (isDoubleEnvelope(data)) {
    return data.data as T;
  }
  return data as T;
}

export function parseApiErrors(err: unknown): { global?: string; fields: Record<string, string> } {
  const result: { global?: string; fields: Record<string, string> } = { fields: {} };
  if (!err || typeof err !== "object") return result;

  const apiErr = err as { message?: string; errors?: Array<{ field?: string; constraint: string }> };
  result.global = apiErr.message;

  if (!Array.isArray(apiErr.errors)) return result;

  for (const e of apiErr.errors) {
    if (e.field) {
      result.fields[e.field] = e.constraint;
      continue;
    }
    if (typeof e.constraint !== "string") continue;
    const [possibleField] = e.constraint.split(" ");
    if (possibleField && /^[a-zA-Z0-9_]+$/.test(possibleField)) {
      result.fields[possibleField] = e.constraint;
    }
  }

  return result;
}

// ─── API Client ───────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  private async attemptRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const raw = await response.json();
      const data = unwrapResponse<{ data?: { accessToken?: string; refreshToken?: string } }>(raw);
      const inner = (data as any)?.data ?? data;
      const accessToken = inner?.accessToken;
      const newRefreshToken = inner?.refreshToken;

      if (accessToken) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
        if (newRefreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }
        // Update cookies for middleware
        document.cookie = `elis_token=${accessToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `elis_authenticated=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401 and not the auth endpoints, try refresh
    if (response.status === 401 && !endpoint.includes("/auth/")) {
      // Deduplicate concurrent refresh attempts
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.refreshPromise = this.attemptRefresh().finally(() => {
          this.isRefreshing = false;
          this.refreshPromise = null;
        });
      }

      const refreshed = await (this.refreshPromise ?? Promise.resolve(false));

      if (refreshed) {
        // Retry original request with new token
        const newToken = this.getToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
        }
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          throw { status: retryResponse.status, ...retryData };
        }
        return unwrapResponse<T>(retryData);
      }

      // Refresh failed — clear tokens and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        window.location.href = "/";
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw { status: response.status, ...data };
    }

    return unwrapResponse<T>(data);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async login(payload: LoginPayload): Promise<LoginResponse> {
    return this.post<LoginResponse>("/api/v1/auth/login", payload);
  }

  // ─── Patients ─────────────────────────────────────────────────────────────

  async getPatients(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    registeredFrom?: string;
    registeredTo?: string;
    lastVisitFrom?: string;
    lastVisitTo?: string;
  }): Promise<ApiResponse<PaginatedResponse<Patient>>> {
    return this.get(`/api/v1/patients${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    return this.get(`/api/v1/patients/${id}`);
  }

  async createPatient(data: PatientFormData | Record<string, unknown>): Promise<ApiResponse<Patient>> {
    return this.post("/api/v1/patients", data);
  }

  async updatePatient(id: string, data: Partial<PatientFormData> | Record<string, unknown>): Promise<ApiResponse<Patient>> {
    return this.put(`/api/v1/patients/${id}`, data);
  }

  async deletePatient(id: string): Promise<ApiResponse<unknown>> {
    return this.delete(`/api/v1/patients/${id}`);
  }

  /**
   * Deactivate (soft-delete) a patient. Sets deletedAt on the backend.
   * Patient data is preserved — this is NOT a hard delete.
   * Alias for deletePatient for semantic clarity.
   */
  async deactivatePatient(id: string): Promise<ApiResponse<unknown>> {
    return this.delete(`/api/v1/patients/${id}`);
  }

  /**
   * Reactivate a previously deactivated patient. Clears deletedAt.
   */
  async reactivatePatient(id: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/patients/${id}/reactivate`, {});
  }

  /**
   * Find potential duplicate patients by name/NIK similarity.
   */
  async findDuplicatePatients(search?: string): Promise<ApiResponse<unknown>> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.get(`/api/v1/patients/duplicates${qs}`);
  }

  /**
   * Merge secondary patient into primary. All data from secondary is moved to primary.
   * Secondary patient is deactivated after merge.
   * Requires SUPER_ADMIN role.
   */
  async mergePatients(primaryId: string, secondaryId: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/patients/merge`, { primaryId, secondaryId });
  }

  // ─── Master Data ──────────────────────────────────────────────────────────

  async getTestCategories(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    return this.get(`/api/v1/master/test-categories${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getTests(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    return this.get(`/api/v1/master/tests${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getPanels(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    return this.get(`/api/v1/master/panels${buildQueryString(params as Record<string, unknown>)}`);
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(params?: {
    page?: number | string;
    limit?: number | string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<PaginatedResponse<Order>>> {
    return this.get(`/api/v1/orders${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getOrderStats(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/orders/stats");
  }

  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.get(`/api/v1/orders/${id}`);
  }

  async createOrder(data: unknown): Promise<ApiResponse<unknown>> {
    return this.post("/api/v1/orders", data);
  }

  async cancelOrder(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${id}/cancel`, { reason });
  }

  async payOrder(
    id: string,
    data: { paymentMethod: string; amountPaid: number; discountAmount?: number }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${id}/pay`, data);
  }

  async splitPay(
    id: string,
    components: Array<{
      paymentMethod: string;
      amount: number;
      insuranceId?: string;
      reference?: string;
      notes?: string;
    }>
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${id}/split-pay`, { components });
  }

  async fallbackPayment(
    id: string,
    data: { amount: number; reference?: string; notes?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${id}/fallback-payment`, data);
  }

  async depositPayment(
    id: string,
    data: { paymentMethod: string; depositAmount: number; notes?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${id}/deposit`, data);
  }

  async getBarcode(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/orders/${id}/barcode`);
  }

  async getInvoice(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/orders/${id}/invoice`);
  }

  async getPaymentHistory(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/orders/${id}/payments`);
  }

  async getOrderReportPdf(id: string): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/v1/orders/${id}/report/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(`Download gagal (HTTP ${response.status})`);
    }
    return response.blob();
  }

  // ─── Discount Approvals ────────────────────────────────────────────────────

  async requestDiscountApproval(data: {
    orderId: string;
    discountPercent: number;
    discountAmount: number;
    discountReason: string;
  }): Promise<ApiResponse<unknown>> {
    return this.post("/api/v1/approvals/discount", data);
  }

  async getDiscountApprovalForOrder(orderId: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/approvals/discount/order/${orderId}`);
  }

  // ─── Lab Workflow ─────────────────────────────────────────────────────────

  async getLabQueue(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/lab/queue${buildQueryString(params as Record<string, unknown>)}`);
  }

  async collectSample(
    orderId: string,
    data: { sampleCondition: string; rejectionReason?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/lab/${orderId}/sample`, data);
  }

  async enterResults(
    orderId: string,
    results: Array<{ orderDetailId: string; resultValue: string }>
  ): Promise<ApiResponse<unknown>> {
    return this.put(`/api/v1/lab/${orderId}/results`, { results });
  }

  async getDeltaCheck(orderId: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/lab/${orderId}/delta-check`);
  }

  async verifyResults(orderId: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/lab/${orderId}/verify`);
  }

  async getApprovalQueue(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/lab/approval-queue");
  }

  async approveOrder(
    orderId: string,
    data: { decision: "APPROVE" | "REJECT"; interpretation?: string; rejectionReason?: string; secondLevelApproval?: boolean }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/lab/${orderId}/approve`, data);
  }

  // ─── Per-Parameter Verification ────────────────────────────────────────────

  async verifyOrderDetail(
    orderDetailId: string,
    data?: { verificationNotes?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.patch(`/api/v1/lab-workflow/order-details/${orderDetailId}/verify`, data);
  }

  async rejectOrderDetail(
    orderDetailId: string,
    data: { reason: string; notes?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.patch(`/api/v1/lab-workflow/order-details/${orderDetailId}/reject`, data);
  }

  async rerunOrderDetail(
    orderDetailId: string,
    data: { rerunReason: string; notes?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/lab-workflow/order-details/${orderDetailId}/rerun`, data);
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getLabSummary(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/lab-summary");
  }

  async getLabVolume(params?: {
    days?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/dashboard/lab-volume${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getExecutiveSummary(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/executive-summary");
  }

  async getRecentOrders(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/recent-orders");
  }

  async getRegionDistribution(params?: {
    provinsiId?: string;
    kabupatenKotaId?: string;
    kecamatanId?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/dashboard/region-distribution${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getComparisonMetrics(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/comparison-metrics");
  }

  async getPhasedTat(slaTarget?: number): Promise<ApiResponse<unknown>> {
    const query = slaTarget ? `?slaTarget=${slaTarget}` : "";
    return this.get(`/api/v1/dashboard/phased-tat${query}`);
  }

  async getWorkloadDistribution(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/workload-distribution");
  }

  async getRevenueBreakdown(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/revenue-breakdown");
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async getReport(
    type: "revenue-summary" | "orders-by-status" | "orders-by-payment-method" | "top-tests" | "insurance-claims" | "turnaround-time" | "by-referring-doctor" | "by-referring-clinic" | "new-patients",
    params?: { startDate?: string; endDate?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/reports/${type}${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getReportPdf(
    type: "revenue-summary" | "orders-by-status",
    params?: { startDate?: string; endDate?: string }
  ): Promise<Blob> {
    // Custom fetch for blob since apiClient usually expects JSON
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/v1/reports/${type}/pdf${buildQueryString(params as Record<string, unknown>)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download report PDF: ${response.statusText}`);
    }
    
    return await response.blob();
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async getUsers<T = unknown>(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.get(`/api/v1/users${buildQueryString(params as Record<string, unknown>)}`);
  }

  async createUser(data: unknown): Promise<ApiResponse<unknown>> {
    return this.post("/api/v1/users", data);
  }

  async updateUser(id: string, data: unknown): Promise<ApiResponse<unknown>> {
    return this.put(`/api/v1/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<ApiResponse<unknown>> {
    return this.delete(`/api/v1/users/${id}`);
  }

  // ─── Settings ────────────────────────────────────────────────────────────

  async getSmtpSettings(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/settings/smtp");
  }

  async updateSmtpSettings(data: unknown): Promise<ApiResponse<unknown>> {
    return this.put("/api/v1/settings/smtp", data);
  }

  async testSmtpEmail(email: string): Promise<ApiResponse<unknown>> {
    return this.post("/api/v1/settings/smtp/test", { email });
  }

  async getSettings(prefix?: string): Promise<ApiResponse<unknown>> {
    const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
    return this.get(`/api/v1/settings${qs}`);
  }

  async updateSettingsBulk(entries: { key: string; value: string }[]): Promise<ApiResponse<unknown>> {
    return this.put("/api/v1/settings/bulk", { entries });
  }

  // ─── Visits ─────────────────────────────────────────────────────────────

  async getVisits<T = unknown>(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    clinicId?: string;
    sortBy?: string;
    sortDir?: string;
  }): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.get(`/api/v1/visits${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getVisit<T = unknown>(id: string): Promise<ApiResponse<T>> {
    return this.get(`/api/v1/visits/${id}`);
  }

  async createVisit<T = unknown>(data: unknown): Promise<ApiResponse<T>> {
    return this.post("/api/v1/visits", data);
  }

  async updateVisit<T = unknown>(id: string, data: unknown): Promise<ApiResponse<T>> {
    return this.put(`/api/v1/visits/${id}`, data);
  }

  async cancelVisit(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/visits/${id}/cancel`, { reason });
  }

  // ─── Master Data (Doctors, Clinics, Insurances) ───────────────────────────

  async getDoctors<T = unknown>(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.get(`/api/v1/master/doctors${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getClinics<T = unknown>(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.get(`/api/v1/master/clinics${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getInsurances<T = unknown>(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.get(`/api/v1/master/insurances${buildQueryString(params as Record<string, unknown>)}`);
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    entityName?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    sortField?: string;
    sortDir?: string;
  }): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/audit-logs${buildQueryString(params as Record<string, unknown>)}`);
  }

  async getAuditStats(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/audit-logs/stats");
  }

  async getAuditActions(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/audit-logs/actions");
  }

  async getAuditLogById(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/audit-logs/${id}`);
  }

  async exportAuditCsv(params?: {
    entityName?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    sortField?: string;
    sortDir?: string;
  }): Promise<Blob> {
    const token = this.getToken();
    const res = await fetch(`${this.baseUrl}/api/v1/audit-logs/export${buildQueryString(params as Record<string, unknown>)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  }

  // ─── WhatsApp Delivery ──────────────────────────────────────────────────────

  async sendWhatsApp(orderId: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${orderId}/send-whatsapp`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
