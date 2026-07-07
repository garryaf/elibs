/**
 * eLIS — API Client
 * Centralized HTTP client for communicating with the NestJS backend.
 * Uses native fetch with NEXT_PUBLIC_API_URL from environment.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

    const data = await response.json();

    if (!response.ok) {
      throw { status: response.status, ...data };
    }

    return data as T;
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

  // ─── Audit ────────────────────────────────────────────────────────────────

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/api/v1/audit-logs${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
