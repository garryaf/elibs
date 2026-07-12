/**
 * eLIS — API Client
 * Centralized HTTP client for communicating with the NestJS backend.
 * Uses native fetch with NEXT_PUBLIC_API_URL from environment.
 */

/**
 * API base URL configuration:
 * - Production (behind Nginx): NEXT_PUBLIC_API_URL is explicitly set (could be empty for same-origin)
 * - Local development: NEXT_PUBLIC_API_URL=http://localhost:3001 (set via docker-compose default)
 *
 * The fallback to http://localhost:3001 only activates when the env var is completely
 * empty/unset AND we're NOT in production. In production behind Nginx, the var is
 * explicitly configured (even if empty) via the deployment manifest.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");

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

// ─── Defensive Unwrap Utility ─────────────────────────────────────────────────

/**
 * Detects and unwraps double-envelope responses.
 *
 * Some controllers manually wrap their return value with `{ success, message, data }`,
 * and then `TransformInterceptor` wraps again. This utility detects the double-wrap
 * shape and extracts the inner payload.
 *
 * Strict check: `success` must be a boolean, `message` must be a string, and `data`
 * key must exist. This avoids false positives on legitimate data objects that
 * coincidentally have a `success` field.
 */
export function unwrapResponse<T>(data: unknown): T {
  if (
    data !== null &&
    data !== undefined &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    "success" in data &&
    "message" in data &&
    "data" in data &&
    typeof (data as Record<string, unknown>).success === "boolean" &&
    typeof (data as Record<string, unknown>).message === "string"
  ) {
    return (data as Record<string, unknown>).data as T;
  }
  return data as T;
}

// ─── API Client ───────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("elis_token");
  }

  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("elis_refresh_token");
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
        localStorage.setItem("elis_token", accessToken);
        if (newRefreshToken) {
          localStorage.setItem("elis_refresh_token", newRefreshToken);
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
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/patients${query}`);
  }

  async getPatient(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/patients/${id}`);
  }

  async createPatient(data: unknown): Promise<ApiResponse<unknown>> {
    return this.post("/api/v1/patients", data);
  }

  async updatePatient(id: string, data: unknown): Promise<ApiResponse<unknown>> {
    return this.put(`/api/v1/patients/${id}`, data);
  }

  async deletePatient(id: string): Promise<ApiResponse<unknown>> {
    return this.delete(`/api/v1/patients/${id}`);
  }

  // ─── Master Data ──────────────────────────────────────────────────────────

  async getTestCategories(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/master/test-categories${query}`);
  }

  async getTests(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/master/tests${query}`);
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status && params.status !== "ALL") qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/orders${query}`);
  }

  async getOrder(id: string): Promise<ApiResponse<unknown>> {
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
    data: { paymentMethod: string; amountPaid: number }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/orders/${id}/pay`, data);
  }

  async getBarcode(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/orders/${id}/barcode`);
  }

  async getInvoice(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/orders/${id}/invoice`);
  }

  // ─── Lab Workflow ─────────────────────────────────────────────────────────

  async getLabQueue(params?: {
    status?: string;
    search?: string;
  }): Promise<ApiResponse<unknown>> {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "ALL") qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/lab/queue${query}`);
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
    data: { decision: "APPROVE" | "REJECT"; interpretation?: string; rejectionReason?: string }
  ): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/lab/${orderId}/approve`, data);
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getLabSummary(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/lab-summary");
  }

  async getLabVolume(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<unknown>> {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/dashboard/lab-volume${query}`);
  }

  async getExecutiveSummary(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/executive-summary");
  }

  async getRecentOrders(): Promise<ApiResponse<unknown>> {
    return this.get("/api/v1/dashboard/recent-orders");
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.role) qs.set("role", params.role);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/users${query}`);
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

  // ─── Visits ─────────────────────────────────────────────────────────────

  async getVisits(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    doctorId?: string;
    clinicId?: string;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status && params.status !== "ALL") qs.set("status", params.status);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    if (params?.doctorId) qs.set("doctorId", params.doctorId);
    if (params?.clinicId) qs.set("clinicId", params.clinicId);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/visits${query}`);
  }

  async getVisit(id: string): Promise<ApiResponse<unknown>> {
    return this.get(`/api/v1/visits/${id}`);
  }

  async createVisit(data: unknown): Promise<ApiResponse<unknown>> {
    return this.post("/api/v1/visits", data);
  }

  async updateVisit(id: string, data: unknown): Promise<ApiResponse<unknown>> {
    return this.put(`/api/v1/visits/${id}`, data);
  }

  async cancelVisit(id: string, reason: string): Promise<ApiResponse<unknown>> {
    return this.post(`/api/v1/visits/${id}/cancel`, { reason });
  }

  // ─── Master Data (Doctors, Clinics, Insurances) ───────────────────────────

  async getDoctors(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/master/doctors${query}`);
  }

  async getClinics(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/master/clinics${query}`);
  }

  async getInsurances(params?: {
    search?: string;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/master/insurances${query}`);
  }

  // ─── Audit ────────────────────────────────────────────────────────────────

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
    entityName?: string;
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<unknown>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.entityName) qs.set("entityName", params.entityName);
    if (params?.action) qs.set("action", params.action);
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/audit-logs${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
