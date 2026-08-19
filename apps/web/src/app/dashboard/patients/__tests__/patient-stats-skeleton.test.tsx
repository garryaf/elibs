import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { email: "test@example.com", sub: "user-1", role: "ADMIN" },
    token: "mock-token",
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

jest.mock("@/components/patients/PatientTable", () => ({
  PatientTable: () => <div data-testid="patient-table" />,
}));

jest.mock("@/components/patients/PatientStatusBadge", () => ({
  PatientStatusBadge: () => <span>Active</span>,
}));

jest.mock("@/components/patients/PatientLabHistory", () => ({
  PatientLabHistory: () => null,
}));

jest.mock("@/components/regions/CascadingRegionSelector", () => ({
  CascadingRegionSelector: () => <div data-testid="region-selector">Region</div>,
}));

const mockGetPatients = jest.fn();

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getPatients: (...args: unknown[]) => mockGetPatients(...args),
    },
  };
});

import PatientsPage from "../page";

describe("[UX-06] Stats Cards Loading Skeleton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders StatsCardsSkeleton while data is loading and replaces with actual stats upon completion", async () => {
    let resolveApi: (data: unknown) => void = () => {};
    const apiPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });

    mockGetPatients.mockImplementation(() => apiPromise);

    render(<PatientsPage />);

    // While loading, StatsCardsSkeleton should be displayed
    expect(screen.getByTestId("stats-skeleton")).toBeInTheDocument();
    const skeletonCards = screen.getAllByTestId("stats-card-skeleton");
    expect(skeletonCards.length).toBe(3);

    // Actual stats numbers should NOT be in the document yet
    expect(screen.queryByText("Total Pasien Terdaftar")).not.toBeInTheDocument();

    // Resolve API call
    resolveApi({
      data: [
        {
          id: "p-1",
          mrn: "MRN-001",
          nik: "3201000000000001",
          name: "John Doe",
          gender: "MALE",
          phone: "08123456789",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastVisitDate: null,
          lastVisit: null,
        },
      ],
      meta: { total: 42, activeCount: 30, inactiveCount: 12 },
    });

    // After loading completes, skeleton is replaced by actual stats cards
    await waitFor(() => {
      expect(screen.queryByTestId("stats-skeleton")).not.toBeInTheDocument();
      expect(screen.getByText("Total Pasien Terdaftar")).toBeInTheDocument();
      expect(screen.getByText("Pasien Aktif")).toBeInTheDocument();
      expect(screen.getByText("Pasien Nonaktif")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });
});
