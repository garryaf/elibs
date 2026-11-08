import React from "react";
import { render, screen, fireEvent } from "@/test-utils";
import "@testing-library/jest-dom";
import { VisitRowActions } from "../VisitRowActions";

const mockVisit = {
  id: "v-1",
  visitNumber: "VIS-2026-0001",
  status: "REGISTERED" as const,
  registrationDate: "2026-01-01T00:00:00.000Z",
  paymentMethod: "CASH",
};

describe("[UX-08] VisitRowActions", () => {
  const onViewDetail = jest.fn();
  const onEdit = jest.fn();
  const onCancelSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens menu on click and closes on Escape key", () => {
    render(
      <VisitRowActions
        visit={mockVisit}
        userRole="ADMIN"
        onViewDetail={onViewDetail}
        onEdit={onEdit}
        onCancelSuccess={onCancelSuccess}
      />
    );

    const actionBtn = screen.getByRole("button", { name: "Aksi kunjungan" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Open menu
    fireEvent.click(actionBtn);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Lihat Detail/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Edit Kunjungan/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Batalkan Kunjungan/i })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes menu on click outside", () => {
    render(
      <div>
        <button data-testid="outside-button">Outside</button>
        <VisitRowActions
          visit={mockVisit}
          userRole="ADMIN"
          onViewDetail={onViewDetail}
          onEdit={onEdit}
          onCancelSuccess={onCancelSuccess}
        />
      </div>
    );

    const actionBtn = screen.getByRole("button", { name: "Aksi kunjungan" });

    // Open menu
    fireEvent.click(actionBtn);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside-button"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("triggers actions correctly with standard onClick events", () => {
    render(
      <VisitRowActions
        visit={mockVisit}
        userRole="ADMIN"
        onViewDetail={onViewDetail}
        onEdit={onEdit}
        onCancelSuccess={onCancelSuccess}
      />
    );

    const actionBtn = screen.getByRole("button", { name: "Aksi kunjungan" });

    // Test onViewDetail
    fireEvent.click(actionBtn);
    fireEvent.click(screen.getByRole("menuitem", { name: /Lihat Detail/i }));
    expect(onViewDetail).toHaveBeenCalledTimes(1);
    expect(onViewDetail).toHaveBeenCalledWith(mockVisit);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Test onEdit
    fireEvent.click(actionBtn);
    fireEvent.click(screen.getByRole("menuitem", { name: /Edit Kunjungan/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockVisit);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Test onCancelSuccess
    fireEvent.click(actionBtn);
    fireEvent.click(screen.getByRole("menuitem", { name: /Batalkan Kunjungan/i }));
    expect(onCancelSuccess).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
