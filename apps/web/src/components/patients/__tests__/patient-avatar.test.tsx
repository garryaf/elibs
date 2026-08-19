import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PatientAvatar } from "../PatientAvatar";

describe("[UX-09] PatientAvatar Component", () => {
  it("renders 2 initials for multi-word patient names", () => {
    render(<PatientAvatar name="Budi Santoso" gender="MALE" />);
    const avatar = screen.getByTestId("patient-avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent("BS");
    expect(avatar).toHaveClass("bg-blue-100");
  });

  it("renders 1 initial for single-word patient names", () => {
    render(<PatientAvatar name="Wati" gender="FEMALE" />);
    const avatar = screen.getByTestId("patient-avatar");
    expect(avatar).toHaveTextContent("W");
    expect(avatar).toHaveClass("bg-rose-100");
  });

  it("applies correct size classes", () => {
    const { rerender } = render(<PatientAvatar name="Budi" size="sm" />);
    expect(screen.getByTestId("patient-avatar")).toHaveClass("h-8 w-8");

    rerender(<PatientAvatar name="Budi" size="lg" />);
    expect(screen.getByTestId("patient-avatar")).toHaveClass("h-12 w-12");

    rerender(<PatientAvatar name="Budi" size="xl" />);
    expect(screen.getByTestId("patient-avatar")).toHaveClass("h-16 w-16");
  });

  it("renders fallback '?' when name is empty or missing", () => {
    render(<PatientAvatar name={null} />);
    expect(screen.getByTestId("patient-avatar")).toHaveTextContent("?");
  });
});
