import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useParams: () => ({ id: "patient-1" }),
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
const mockGetPatient = jest.fn();
const mockGetVisits = jest.fn();

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getPatients: (...args: unknown[]) => mockGetPatients(...args),
      getPatient: (...args: unknown[]) => mockGetPatient(...args),
      getVisits: (...args: unknown[]) => mockGetVisits(...args),
    },
  };
});

import PatientsPage from "../page";
import PatientDetailPage from "../[id]/page";

describe("[UX-05] Patient Last Visit Date Display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVisits.mockResolvedValue({ data: [] });
  });

  it("displays '—' in PatientTable for patients with no visits, never updatedAt", async () => {
    mockGetPatients.mockResolvedValue({
      data: [
        {
          id: "p-no-visit",
          mrn: "MRN-001",
          nik: "3201000000000001",
          name: "Pasien Baru Tanpa Kunjungan",
          gender: "MALE",
          phone: "08123456789",
          email: "novo@test.com",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-08-15T10:00:00.000Z",
          lastVisitDate: null,
          lastVisit: null,
        },
        {
          id: "p-with-visit",
          mrn: "MRN-002",
          nik: "3201000000000002",
          name: "Pasien Dengan Kunjungan",
          gender: "FEMALE",
          phone: "08123456780",
          email: "visit@test.com",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-08-15T10:00:00.000Z",
          lastVisitDate: "2026-07-20T08:30:00.000Z",
          lastVisit: "2026-07-20T08:30:00.000Z",
        },
      ],
      meta: { total: 2, activeCount: 2, inactiveCount: 0 },
    });

    render(<PatientsPage />);

    // Wait for table to render both patients
    await waitFor(() => {
      expect(screen.getByText("Pasien Baru Tanpa Kunjungan")).toBeInTheDocument();
      expect(screen.getByText("Pasien Dengan Kunjungan")).toBeInTheDocument();
    });

    // For the patient without visits, it should show '—'
    expect(screen.getByText("—")).toBeInTheDocument();

    // It should NOT render the updatedAt date (15 Agu 2026 or 15/08/2026) for the patient without visits
    expect(screen.queryByText(/15 Agu 2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/15\/08\/2026/i)).not.toBeInTheDocument();

    // For the patient with visit, it should render their visit date (20 Jul 2026 or 20/07/2026)
    expect(screen.getByText(/20 Jul 2026/i)).toBeInTheDocument();
  });

  it("displays 'Belum ada kunjungan' in PatientDetailPage for patients without visits", async () => {
    mockGetPatient.mockResolvedValue({
      data: {
        id: "patient-1",
        mrn: "MRN-001",
        nik: "3201000000000001",
        name: "Pasien Detail Baru",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        phone: "08123456789",
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-08-15T10:00:00.000Z",
        lastVisitDate: null,
        lastVisit: null,
      },
    });

    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasien Detail Baru")).toBeInTheDocument();
    });

    // Should display "Belum ada kunjungan" in the Kunjungan Terakhir field
    expect(screen.getByText("Belum ada kunjungan")).toBeInTheDocument();
    // Should NOT display updatedAt
    expect(screen.queryByText(/15 Agu 2026/i)).not.toBeInTheDocument();
  });

  it("displays formatted visit date in PatientDetailPage when patient has a visit", async () => {
    mockGetPatient.mockResolvedValue({
      data: {
        id: "patient-1",
        mrn: "MRN-001",
        nik: "3201000000000001",
        name: "Pasien Detail Lama",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        phone: "08123456789",
        status: "ACTIVE",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-08-15T10:00:00.000Z",
        lastVisitDate: "2026-07-20T08:30:00.000Z",
        lastVisit: "2026-07-20T08:30:00.000Z",
      },
    });

    render(<PatientDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Pasien Detail Lama")).toBeInTheDocument();
    });

    // Should display formatted visit date (20 Jul 2026)
    expect(screen.getByText(/20 Jul 2026/i)).toBeInTheDocument();
  });
});
