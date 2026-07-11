/**
 * Property 4: Preservation — Successful Patient Update Unchanged
 *
 * For any API call to `updatePatient` that succeeds, the patients page SHALL
 * refresh the patient list and complete the modal flow — producing the same
 * result as the original unfixed code.
 *
 * **Validates: Requirements 3.2**
 *
 * @tags Feature: batch-a-quick-ux-fixes, Property 4: Preservation — Patient Update Success
 */

import * as fc from "fast-check";
import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
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

// Mock auth context
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
const mockGetPatients = jest.fn();
const mockUpdatePatient = jest.fn();
jest.mock("@/lib/api", () => ({
  apiClient: {
    getPatients: (...args: unknown[]) => mockGetPatients(...args),
    updatePatient: (...args: unknown[]) => mockUpdatePatient(...args),
  },
}));

// Mock PatientTable to expose edit action
jest.mock("@/components/patients/PatientTable", () => ({
  PatientTable: ({ patients, onEdit }: { patients: Array<{ id: string; name: string }>; onEdit: (p: unknown) => void }) => (
    <div data-testid="patient-table">
      {patients.map((p) => (
        <div key={p.id} data-testid={`patient-row-${p.id}`}>
          <span>{p.name}</span>
          <button data-testid={`edit-btn-${p.id}`} onClick={() => onEdit(p)}>Edit</button>
        </div>
      ))}
    </div>
  ),
}));

// Mock PatientFormModal to capture onSubmit and simulate form submission
let capturedOnSubmit: ((data: unknown) => Promise<void>) | null = null;
jest.mock("@/components/patients/PatientFormModal", () => ({
  PatientFormModal: ({ isOpen, onSubmit }: { isOpen: boolean; onSubmit: (data: unknown) => Promise<void> }) => {
    capturedOnSubmit = isOpen ? onSubmit : null;
    return isOpen ? <div data-testid="patient-form-modal">Modal Open</div> : null;
  },
}));

// Mock PatientStatusBadge
jest.mock("@/components/patients/PatientStatusBadge", () => ({
  PatientStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

// Mock PatientLabHistory
jest.mock("@/components/patients/PatientLabHistory", () => ({
  PatientLabHistory: () => null,
}));

// ─── Import component under test ─────────────────────────────────────────────

import PatientsPage from "../page";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const patientFormDataArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 0),
  dob: fc.date({ min: new Date("1950-01-01"), max: new Date("2010-12-31") }).map(d => d.toISOString().split("T")[0]),
  gender: fc.constantFrom("MALE", "FEMALE"),
  phone: fc.stringMatching(/^08\d{8,11}$/),
  address: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  provinsiId: fc.option(fc.uuid(), { nil: undefined }),
  kabupatenKotaId: fc.option(fc.uuid(), { nil: undefined }),
  kecamatanId: fc.option(fc.uuid(), { nil: undefined }),
  kelurahanDesaId: fc.option(fc.uuid(), { nil: undefined }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const samplePatient = {
  id: "patient-1",
  mrn: "MRN-0001",
  nik: "3201010101010001",
  name: "Budi Santoso",
  dob: "1990-01-15",
  gender: "MALE" as const,
  phone: "081234567890",
  address: "Jl. Merdeka No. 1",
  email: "budi@test.com",
  status: "ACTIVE" as const,
  createdAt: "2025-01-01T00:00:00Z",
  lastVisit: "2025-06-01T00:00:00Z",
};

function mockPatientsResponse(patients = [samplePatient]) {
  return {
    data: { data: patients, meta: { total: patients.length, page: 1, limit: 200 } },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Feature: batch-a-quick-ux-fixes, Property 4: Patient Update Success Preservation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    capturedOnSubmit = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loadPatients is called after successful updatePatient", async () => {
    // Use a sample set of form data inputs to verify preservation
    const formDataSamples = fc.sample(patientFormDataArb, 10);

    for (const formData of formDataSamples) {
      mockGetPatients.mockResolvedValue(mockPatientsResponse());
      mockUpdatePatient.mockResolvedValue({ success: true, message: "OK", data: {} });

      const { unmount } = render(<PatientsPage />);

      // Advance timers for the debounced loadPatients call
      await act(async () => {
        jest.advanceTimersByTime(350);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPatients).toHaveBeenCalled();
      });

      // Click edit on the patient
      const editBtn = screen.getByTestId("edit-btn-patient-1");
      await act(async () => {
        fireEvent.click(editBtn);
      });

      // The modal should be open and capturedOnSubmit should be set
      expect(capturedOnSubmit).not.toBeNull();

      // Reset call count to track subsequent calls
      mockGetPatients.mockClear();

      // Submit the form with random form data
      await act(async () => {
        await capturedOnSubmit!(formData);
      });

      // After successful update, loadPatients is called directly (no debounce for the callback call)
      // But the loadPatients itself uses the useEffect with debounce, so advance timers
      await act(async () => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(mockGetPatients).toHaveBeenCalled();
      });

      unmount();
      jest.clearAllMocks();
      capturedOnSubmit = null;
    }
  });

  it("no error state/toast is rendered after successful updatePatient", async () => {
    mockGetPatients.mockResolvedValue(mockPatientsResponse());
    mockUpdatePatient.mockResolvedValue({ success: true, message: "OK", data: {} });

    const { unmount } = render(<PatientsPage />);

    // Advance timers for debounced loadPatients
    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(mockGetPatients).toHaveBeenCalled();
    });

    // Click edit
    const editBtn = screen.getByTestId("edit-btn-patient-1");
    await act(async () => {
      fireEvent.click(editBtn);
    });

    // Submit
    await act(async () => {
      await capturedOnSubmit!({
        name: "Updated Name",
        dob: "1990-01-15",
        gender: "MALE",
        phone: "081234567890",
        address: "Jl. Updated",
      });
    });

    // No error state or toast should be visible
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/gagal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

    unmount();
  });
});
