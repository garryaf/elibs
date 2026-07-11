/**
 * Property 1: Bug Condition — Silent Error on Visits Fetch Failure
 *
 * WHEN the visits list API call (`apiClient.getVisits`) fails (network error, 5xx, timeout)
 * THEN the system SHALL display a visible error banner/alert on the visits page indicating
 * that data could not be loaded, and SHALL offer a retry mechanism.
 *
 * EXPECTED: These tests FAIL on unfixed code — failure confirms the bug exists.
 * The current catch block silently sets visits to [] and shows empty state instead of error.
 *
 * **Validates: Requirements 1.1, 2.1**
 *
 * @tags Feature: batch-a-quick-ux-fixes, Property 1: Bug Condition
 */

import * as fc from "fast-check";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children);
});

// Mock auth-context — provide an authorized user
jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", sub: "user-1", role: "ADMIN" },
    token: "mock-token",
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock visit row actions and cancel dialog to simplify rendering
jest.mock("@/components/visits/VisitRowActions", () => ({
  VisitRowActions: () => React.createElement("div", null, "actions"),
}));
jest.mock("@/components/visits/CancelVisitDialog", () => ({
  CancelVisitDialog: () => null,
}));

// ─── API Client mock ──────────────────────────────────────────────────────────

const mockGetVisits = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    getVisits: (...args: unknown[]) => mockGetVisits(...args),
  },
}));

// ─── Import component under test AFTER mocks ─────────────────────────────────

import VisitsPage from "../page";

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe("Feature: batch-a-quick-ux-fixes, Property 1: Bug Condition — Visits Error State", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays error alert when getVisits rejects with network error", async () => {
    mockGetVisits.mockRejectedValueOnce(new Error("Network Error"));

    render(React.createElement(VisitsPage));

    await waitFor(() => {
      // The error banner with role="alert" should exist
      const alert = screen.queryByRole("alert");
      expect(alert).toBeInTheDocument();
    });
  });

  it("displays error message text 'Gagal memuat data kunjungan' when API fails", async () => {
    mockGetVisits.mockRejectedValueOnce(new Error("Request failed with status 500"));

    render(React.createElement(VisitsPage));

    await waitFor(() => {
      expect(screen.getByText(/Gagal memuat data kunjungan/)).toBeInTheDocument();
    });
  });

  it("shows a retry button when getVisits fails", async () => {
    mockGetVisits.mockRejectedValueOnce(new Error("Connection timeout"));

    render(React.createElement(VisitsPage));

    await waitFor(() => {
      const retryButton = screen.getByRole("button", { name: /coba lagi/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it("does NOT show empty state ('Tidak ada kunjungan ditemukan') when error is active", async () => {
    mockGetVisits.mockRejectedValueOnce(new Error("Server Error"));

    render(React.createElement(VisitsPage));

    await waitFor(() => {
      // Wait for loading to finish
      expect(screen.queryByText(/Memuat data kunjungan/)).not.toBeInTheDocument();
    });

    // Empty state text should NOT be shown when there's an error
    expect(screen.queryByText(/Tidak ada kunjungan ditemukan/)).not.toBeInTheDocument();
  });

  it("(PBT) error banner appears for all generated error types", async () => {
    // Generate random error types to confirm error handling is universal
    const errorTypeArb = fc.oneof(
      fc.constant(new Error("Network Error")),
      fc.constant(new Error("Request failed with status 500")),
      fc.constant(new Error("Request failed with status 502")),
      fc.constant(new Error("Request failed with status 503")),
      fc.constant(new Error("Request failed with status 400")),
      fc.constant(new Error("Request failed with status 404")),
      fc.constant(new Error("Request failed with status 422")),
      fc.constant(new Error("timeout of 30000ms exceeded")),
      fc.string({ minLength: 1, maxLength: 50 }).map((msg) => new Error(msg))
    );

    await fc.assert(
      fc.asyncProperty(errorTypeArb, async (error) => {
        jest.clearAllMocks();
        mockGetVisits.mockRejectedValueOnce(error);

        const { unmount } = render(React.createElement(VisitsPage));

        await waitFor(() => {
          const alert = screen.queryByRole("alert");
          expect(alert).toBeInTheDocument();
        });

        unmount();
      }),
      { numRuns: 10 }
    );
  });
});
