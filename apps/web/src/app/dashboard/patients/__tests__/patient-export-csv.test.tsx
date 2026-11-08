import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@/test-utils";
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

// Mock sub-components
jest.mock("@/components/patients/PatientTable", () => ({
  PatientTable: ({ patients }: { patients: unknown[] }) => (
    <div data-testid="patient-table">
      <span>Rows count: {patients.length}</span>
    </div>
  ),
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
const mockDeletePatient = jest.fn();

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getPatients: (...args: unknown[]) => mockGetPatients(...args),
      deletePatient: (...args: unknown[]) => mockDeletePatient(...args),
    },
  };
});

import PatientsPage from "../page";

describe("[UX-04] Patient Export CSV - All Data Export", () => {
  let originalCreateObjectURL: typeof window.URL.createObjectURL;
  let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;
  let originalAnchorClick: () => void;
  let createdBlobs: Blob[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    createdBlobs = [];

    originalCreateObjectURL = window.URL.createObjectURL;
    originalRevokeObjectURL = window.URL.revokeObjectURL;
    originalAnchorClick = HTMLAnchorElement.prototype.click;

    HTMLAnchorElement.prototype.click = jest.fn();

    window.URL.createObjectURL = jest.fn((blob: Blob) => {
      createdBlobs.push(blob);
      return "blob:mock-url";
    });
    window.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    HTMLAnchorElement.prototype.click = originalAnchorClick;
  });

  const readBlobText = async (blob: Blob): Promise<string> => {
    if (typeof blob.text === "function") {
      return blob.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  };

  it("exports all data matching filters rather than just the current page", async () => {
    // Initial load: 20 items returned on page 1, but total is 50 items
    mockGetPatients.mockImplementation(async (params) => {
      if (params?.limit === 20) {
        return {
          data: Array.from({ length: 20 }, (_, i) => ({
            id: `p-${i + 1}`,
            mrn: `MRN-${i + 1}`,
            nik: `32010000000000${String(i + 1).padStart(2, "0")}`,
            name: `Patient Page 1 #${i + 1}`,
            gender: "MALE",
            phone: `081200000${i + 1}`,
            email: `patient${i + 1}@mail.com`,
            status: "ACTIVE",
          })),
          meta: { total: 50, activeCount: 50, inactiveCount: 0 },
        };
      }

      // Export request (limit >= 50)
      return {
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `p-${i + 1}`,
          mrn: `MRN-${i + 1}`,
          nik: `32010000000000${String(i + 1).padStart(2, "0")}`,
          name: `Patient Full #${i + 1}`,
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          phone: `081200000${i + 1}`,
          email: `patient${i + 1}@mail.com`,
          status: "ACTIVE",
        })),
        meta: { total: 50, activeCount: 50, inactiveCount: 0 },
      };
    });

    render(<PatientsPage />);

    // Wait for initial page load
    await waitFor(() => {
      expect(screen.getByText("Rows count: 20")).toBeInTheDocument();
    });

    const exportBtn = screen.getByTitle("Export Data (CSV)");
    expect(exportBtn).toBeInTheDocument();

    // Trigger export
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    // Check that getPatients was called with export parameters (page 1 and large limit covering total)
    await waitFor(() => {
      expect(mockGetPatients).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: expect.any(Number),
        })
      );
    });

    // Verify blob was created with all 50 rows plus header
    expect(createdBlobs.length).toBe(1);
    const text = await readBlobText(createdBlobs[0]);
    const lines = text.trim().split("\n");

    expect(lines[0]).toBe("MRN,NIK,Nama,Gender,Telepon,Email,Status");
    expect(lines.length).toBe(51); // Header + 50 patients
  });

  it("passes active search and status filter when exporting", async () => {
    mockGetPatients.mockResolvedValue({
      data: [
        {
          id: "p-1",
          mrn: "MRN-FILTERED",
          nik: "3201000000000099",
          name: "Filtered Patient",
          gender: "FEMALE",
          phone: "0812999999",
          email: "filtered@mail.com",
          status: "ACTIVE",
        },
      ],
      meta: { total: 1, activeCount: 1, inactiveCount: 0 },
    });

    render(<PatientsPage />);

    // Apply search
    const searchInput = screen.getByPlaceholderText("Cari nama, NIK, atau MRN...");
    fireEvent.change(searchInput, { target: { value: "Filtered" } });

    // Apply status filter
    const activeFilterBtn = screen.getByRole("button", { name: "Aktif" });
    fireEvent.click(activeFilterBtn);

    await waitFor(() => {
      expect(mockGetPatients).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "Filtered",
          status: "ACTIVE",
        })
      );
    });

    mockGetPatients.mockClear();
    mockGetPatients.mockResolvedValueOnce({
      data: [
        {
          id: "p-1",
          mrn: "MRN-FILTERED",
          nik: "3201000000000099",
          name: "Filtered Patient",
          gender: "FEMALE",
          phone: "0812999999",
          email: "filtered@mail.com",
          status: "ACTIVE",
        },
      ],
      meta: { total: 1, activeCount: 1, inactiveCount: 0 },
    });

    const exportBtn = screen.getByTitle("Export Data (CSV)");
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(mockGetPatients).toHaveBeenCalledWith(
      expect.objectContaining({
        search: "Filtered",
        status: "ACTIVE",
      })
    );
  });

  it("correctly escapes quotes and commas in CSV output", async () => {
    mockGetPatients.mockResolvedValue({
      data: [
        {
          id: "p-1",
          mrn: "MRN-001",
          nik: "3201000000000001",
          name: 'John "The Great" Doe, Jr.',
          gender: "MALE",
          phone: "08123456789",
          email: "john@example.com",
          status: "ACTIVE",
        },
      ],
      meta: { total: 1, activeCount: 1, inactiveCount: 0 },
    });

    render(<PatientsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("patient-table")).toBeInTheDocument();
    });

    const exportBtn = screen.getByTitle("Export Data (CSV)");
    await act(async () => {
      fireEvent.click(exportBtn);
    });

    expect(createdBlobs.length).toBe(1);
    const text = await readBlobText(createdBlobs[0]);
    const lines = text.trim().split("\n");

    expect(lines[1]).toContain('"John ""The Great"" Doe, Jr."');
  });

  it("disables export button and shows loading indicator while exporting", async () => {
    let resolveExport: (val: unknown) => void = () => {};
    const exportPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });

    mockGetPatients.mockImplementation((params) => {
      if (params?.limit === 20) {
        return Promise.resolve({
          data: [{ id: "p-1", mrn: "MRN-1", nik: "123", name: "P1", gender: "MALE", phone: "123", status: "ACTIVE" }],
          meta: { total: 1, activeCount: 1, inactiveCount: 0 },
        });
      }
      return exportPromise;
    });

    render(<PatientsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("patient-table")).toBeInTheDocument();
    });

    const exportBtn = screen.getByTitle("Export Data (CSV)");
    act(() => {
      fireEvent.click(exportBtn);
    });

    // Button should be disabled during export
    expect(exportBtn).toBeDisabled();
    expect(screen.getByTitle("Mengexport Data...")).toBeInTheDocument();

    // Resolve export promise
    await act(async () => {
      resolveExport({
        data: [{ id: "p-1", mrn: "MRN-1", nik: "123", name: "P1", gender: "MALE", phone: "123", status: "ACTIVE" }],
        meta: { total: 1, activeCount: 1, inactiveCount: 0 },
      });
    });

    // Button should be restored to enabled state
    await waitFor(() => {
      expect(screen.getByTitle("Export Data (CSV)")).not.toBeDisabled();
    });
  });
});
