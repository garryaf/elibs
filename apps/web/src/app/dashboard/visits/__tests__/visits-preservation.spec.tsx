/**
 * Property 3: Preservation — Successful Visits Fetch Unchanged
 *
 * For any API call to `loadVisits` that succeeds, the visits page SHALL render
 * the visits table with correct data, pagination metadata, and filtering —
 * producing the same result as the original unfixed code.
 *
 * **Validates: Requirements 3.1, 3.4, 3.5**
 *
 * @tags Feature: batch-a-quick-ux-fixes, Property 3: Preservation — Visits Success
 */

import * as fc from "fast-check";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
});

// Mock auth context - provide an authorized user
jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { email: "admin@elis.id", sub: "user-1", role: "ADMIN" },
    token: "mock-token",
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock apiClient
const mockGetVisits = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    getVisits: (...args: unknown[]) => mockGetVisits(...args),
  },
}));

// Mock sub-components that may have complex dependencies
jest.mock("@/components/visits/VisitRowActions", () => ({
  VisitRowActions: () => <td data-testid="visit-actions">actions</td>,
}));

jest.mock("@/components/visits/CancelVisitDialog", () => ({
  CancelVisitDialog: () => null,
}));

// ─── Import component under test ─────────────────────────────────────────────

import VisitsPage from "../page";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const visitStatusArb = fc.constantFrom(
  "REGISTERED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
);

const paymentMethodArb = fc.constantFrom(
  "CASH",
  "BPJS",
  "INSURANCE",
  "TRANSFER",
  "EDC",
  "INSURANCE_CASH_FALLBACK",
  "CORPORATE_DEFERRED"
);

const visitArb = fc.record({
  id: fc.uuid(),
  visitNumber: fc.stringMatching(/^VIS-\d{6}$/),
  status: visitStatusArb,
  registrationDate: fc.integer({ min: 1704067200000, max: 1798761600000 }).map(ts => new Date(ts).toISOString()),
  paymentMethod: paymentMethodArb,
  bpjsNumber: fc.option(fc.stringMatching(/^\d{13}$/), { nil: null }),
  patient: fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
    mrn: fc.stringMatching(/^MRN-\d{4}$/),
  }),
  doctor: fc.option(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length > 0),
    }),
    { nil: null }
  ),
  clinic: fc.option(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length > 0),
    }),
    { nil: null }
  ),
});

// Generate a valid paginated visits response with 1-10 visits
const visitsResponseArb = fc.integer({ min: 1, max: 10 }).chain(count =>
  fc.record({
    visits: fc.array(visitArb, { minLength: count, maxLength: count }),
    meta: fc.record({
      total: fc.integer({ min: count, max: 200 }),
      page: fc.constant(1),
      limit: fc.constant(20),
    }),
  })
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Feature: batch-a-quick-ux-fixes, Property 3: Visits Success Preservation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successful getVisits renders table with correct number of rows matching response data", async () => {
    const samples = fc.sample(visitsResponseArb, 15);

    for (const { visits, meta } of samples) {
      mockGetVisits.mockResolvedValue({
        data: { data: visits, meta },
      });

      const { container, unmount } = render(<VisitsPage />);

      await waitFor(() => {
        const rows = container.querySelectorAll("tbody tr");
        expect(rows.length).toBe(visits.length);
      });

      // Each row should contain the visit number
      const rows = container.querySelectorAll("tbody tr");
      visits.forEach((visit, index) => {
        expect(rows[index]).toHaveTextContent(visit.visitNumber);
      });

      unmount();
    }
  }, 15000);

  it("pagination metadata (page X of Y, total count) matches the mock meta", async () => {
    const samples = fc.sample(visitsResponseArb, 10);

    for (const { visits, meta } of samples) {
      const totalPages = Math.ceil(meta.total / 20) || 1;

      mockGetVisits.mockResolvedValue({
        data: { data: visits, meta },
      });

      const { container, unmount } = render(<VisitsPage />);

      await waitFor(() => {
        // Verify table renders (precondition for pagination to show)
        const rows = container.querySelectorAll("tbody tr");
        expect(rows.length).toBe(visits.length);
      });

      // Pagination text: "Halaman 1 dari X (Y kunjungan)"
      const paginationText = `Halaman 1 dari ${totalPages} (${meta.total} kunjungan)`;
      expect(container.textContent).toContain(paginationText);

      unmount();
    }
  }, 15000);

  it("loading skeleton shows during pending state and disappears after resolve", async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockGetVisits.mockReturnValue(pendingPromise);

    const { unmount } = render(<VisitsPage />);

    // During loading, the loading skeleton should be visible
    await waitFor(() => {
      expect(screen.getByText("Memuat data kunjungan...")).toBeInTheDocument();
    });

    // Resolve the API call
    await act(async () => {
      resolvePromise!({
        data: {
          data: [{ id: "1", visitNumber: "VIS-000001", status: "REGISTERED", registrationDate: "2025-01-01T00:00:00Z", paymentMethod: "CASH", patient: { id: "p1", name: "Test", mrn: "MRN-0001" }, doctor: null, clinic: null }],
          meta: { total: 1, page: 1, limit: 20 },
        },
      });
    });

    // After resolve, loading skeleton should be gone
    await waitFor(() => {
      expect(screen.queryByText("Memuat data kunjungan...")).not.toBeInTheDocument();
    });

    unmount();
  });

  it("empty response shows empty state text, NOT error state", async () => {
    mockGetVisits.mockResolvedValue({
      data: { data: [], meta: { total: 0, page: 1, limit: 20 } },
    });

    const { unmount } = render(<VisitsPage />);

    await waitFor(() => {
      expect(screen.getByText("Tidak ada kunjungan ditemukan")).toBeInTheDocument();
    });

    // Verify NO error alert/banner is shown
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/gagal/i)).not.toBeInTheDocument();

    unmount();
  });
});
