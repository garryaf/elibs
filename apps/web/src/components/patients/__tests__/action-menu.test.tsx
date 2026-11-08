import React from "react";
import { render, screen, fireEvent } from "@/test-utils";
import "@testing-library/jest-dom";
import { PatientTable } from "../PatientTable";
import type { Patient } from "@/types/patient";

const mockPatients: Patient[] = [
  {
    id: "p-1",
    mrn: "MRN-001",
    nik: "3201000000000001",
    name: "Budi Santoso",
    dob: "1990-05-15",
    gender: "MALE",
    phone: "081234567890",
    address: "Jl. Sudirman No. 1",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    lastVisit: undefined,
  },
];

describe("[UX-08] PatientTable ActionMenu", () => {
  const onEdit = jest.fn();
  const onView = jest.fn();
  const onDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens action menu on click and closes on Escape key", () => {
    render(
      <PatientTable
        patients={mockPatients}
        onEdit={onEdit}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const actionBtn = screen.getByRole("button", { name: "Aksi pasien" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Open menu
    fireEvent.click(actionBtn);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Lihat Detail/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Edit Data/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Nonaktifkan/i })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes action menu on click outside", () => {
    render(
      <div>
        <button data-testid="outside-button">Outside</button>
        <PatientTable
          patients={mockPatients}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
        />
      </div>
    );

    const actionBtn = screen.getByRole("button", { name: "Aksi pasien" });

    // Open menu
    fireEvent.click(actionBtn);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside-button"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("triggers onView, onEdit, and onDelete correctly via standard click events", () => {
    render(
      <PatientTable
        patients={mockPatients}
        onEdit={onEdit}
        onView={onView}
        onDelete={onDelete}
      />
    );

    const actionBtn = screen.getByRole("button", { name: "Aksi pasien" });

    // Test onView
    fireEvent.click(actionBtn);
    fireEvent.click(screen.getByRole("menuitem", { name: /Lihat Detail/i }));
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith(mockPatients[0]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Test onEdit
    fireEvent.click(actionBtn);
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit Data/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockPatients[0]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Test onDelete
    fireEvent.click(actionBtn);
    fireEvent.click(screen.getByRole("menuitem", { name: /Nonaktifkan/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(mockPatients[0]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
