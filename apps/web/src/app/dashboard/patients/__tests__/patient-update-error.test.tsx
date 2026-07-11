/**
 * Property 2: Bug Condition — Silent Error on Patient Update Failure
 *
 * WHEN updating a patient via the edit form fails (network error, validation error, 5xx)
 * THEN the system SHALL display an error toast or inline error message indicating
 * the update was unsuccessful, including the error reason when available.
 *
 * EXPECTED: These tests FAIL on unfixed code — failure confirms the bug exists.
 * The current catch block has only a comment and provides no feedback.
 *
 * **Validates: Requirements 1.2, 2.2**
 *
 * @tags Feature: batch-a-quick-ux-fixes, Property 2: Bug Condition
 */

import * as fc from "fast-check";
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

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

// Mock sub-components to simplify rendering
jest.mock("@/components/patients/PatientTable", () => ({
  PatientTable: ({ patients, onEdit }: { patients: unknown[]; onEdit: (p: unknown) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "patient-table" },
      React.createElement(
        "button",
        {
          "data-testid": "edit-patient-btn",
          onClick: () =>
            onEdit({
              id: "patient-1",
              mrn: "MRN-001",
              nik: "1234567890123456",
              name: "Test Patient",
              dob: "1990-01-01",
              gender: "MALE",
              phone: "08123456789",
              address: "Jl. Test No. 1 Jakarta",
              email: "test@patient.com",
              status: "ACTIVE",
              createdAt: "2024-01-01",
            }),
        },
        "Edit"
      )
    ),
}));

jest.mock("@/components/patients/PatientStatusBadge", () => ({
  PatientStatusBadge: () => React.createElement("span", null, "Active"),
}));

jest.mock("@/components/patients/PatientLabHistory", () => ({
  PatientLabHistory: () => null,
}));

// Mock the CascadingRegionSelector
jest.mock("@/components/regions/CascadingRegionSelector", () => ({
  CascadingRegionSelector: () => React.createElement("div", { "data-testid": "region-selector" }, "Region"),
}));

// ─── API Client mock ──────────────────────────────────────────────────────────

const mockGetPatients = jest.fn();
const mockUpdatePatient = jest.fn();

jest.mock("@/lib/api", () => ({
  apiClient: {
    getPatients: (...args: unknown[]) => mockGetPatients(...args),
    updatePatient: (...args: unknown[]) => mockUpdatePatient(...args),
  },
}));

// ─── Import component under test AFTER mocks ─────────────────────────────────

import PatientsPage from "../page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPatientResponse = {
  data: [
    {
      id: "patient-1",
      mrn: "MRN-001",
      nik: "1234567890123456",
      name: "Test Patient",
      dateOfBirth: "1990-01-01",
      gender: "MALE",
      phone: "08123456789",
      address: "Jl. Test No. 1 Jakarta",
      email: "test@patient.com",
      createdAt: "2024-01-01",
      updatedAt: "2024-06-01",
      deletedAt: null,
    },
  ],
  meta: { total: 1, page: 1, limit: 200 },
};

/**
 * Helper to trigger patient update flow:
 * 1. Render page (getPatients succeeds)
 * 2. Click edit button
 * 3. Fill form and submit
 */
async function triggerPatientUpdate(errorToThrow: Error) {
  mockGetPatients.mockResolvedValue({ data: mockPatientResponse });
  mockUpdatePatient.mockRejectedValueOnce(errorToThrow);

  const result = render(React.createElement(PatientsPage));

  // Wait for patients to load
  await waitFor(() => {
    expect(screen.getByTestId("patient-table")).toBeInTheDocument();
  });

  // Click edit to open modal
  await act(async () => {
    fireEvent.click(screen.getByTestId("edit-patient-btn"));
  });

  // Wait for modal to appear — find the submit button
  await waitFor(() => {
    expect(screen.getByText(/Simpan Perubahan/i)).toBeInTheDocument();
  });

  // Submit the form (data is pre-filled from editData)
  await act(async () => {
    fireEvent.click(screen.getByText(/Simpan Perubahan/i));
  });

  return result;
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe("Feature: batch-a-quick-ux-fixes, Property 2: Bug Condition — Patient Update Error", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays error toast/alert when updatePatient rejects with 'Validation failed'", async () => {
    await triggerPatientUpdate(new Error("Validation failed"));

    await waitFor(() => {
      const alert = screen.queryByRole("alert");
      expect(alert).toBeInTheDocument();
    });
  });

  it("error toast contains the error message from the API", async () => {
    await triggerPatientUpdate(new Error("Validation failed"));

    await waitFor(() => {
      expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
    });
  });

  it("(PBT) error toast always shows for any error message", async () => {
    // Generate random error messages to verify toast always appears
    const errorMessageArb = fc.oneof(
      fc.constant("Validation failed"),
      fc.constant("Network Error"),
      fc.constant("Request failed with status 500"),
      fc.constant("Internal Server Error"),
      fc.constant("Connection timeout"),
      fc.string({ minLength: 3, maxLength: 40 }).filter((s) => /^[a-zA-Z]/.test(s))
    );

    await fc.assert(
      fc.asyncProperty(errorMessageArb, async (errorMessage) => {
        jest.clearAllMocks();
        mockGetPatients.mockResolvedValue({ data: mockPatientResponse });
        mockUpdatePatient.mockRejectedValueOnce(new Error(errorMessage));

        const { unmount } = render(React.createElement(PatientsPage));

        // Wait for patients to load
        await waitFor(() => {
          expect(screen.getByTestId("patient-table")).toBeInTheDocument();
        });

        // Click edit
        await act(async () => {
          fireEvent.click(screen.getByTestId("edit-patient-btn"));
        });

        // Wait for modal
        await waitFor(() => {
          expect(screen.getByText(/Simpan Perubahan/i)).toBeInTheDocument();
        });

        // Submit
        await act(async () => {
          fireEvent.click(screen.getByText(/Simpan Perubahan/i));
        });

        // Assert error toast appears
        await waitFor(() => {
          const alert = screen.queryByRole("alert");
          expect(alert).toBeInTheDocument();
        });

        unmount();
      }),
      { numRuns: 5 }
    );
  }, 30000);
});
