import React from "react";
import { render, screen, fireEvent, act } from "@/test-utils";
import "@testing-library/jest-dom";
import { ColumnToggle, useColumnVisibility } from "../ColumnToggle";
import type { ColumnDef, ColumnVisibility } from "../ColumnToggle";
import { renderHook } from "@/test-utils";

// ─── Mock localStorage ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEST_COLUMNS: ColumnDef[] = [
  { key: "name",    label: "Nama",   required: true },
  { key: "email",   label: "Email" },
  { key: "phone",   label: "Telepon" },
  { key: "actions", label: "Aksi",   required: true },
];

const ALL_VISIBLE: ColumnVisibility = { name: true, email: true, phone: true, actions: true };

function TestHarness({
  initial,
  onChangeSpy,
}: {
  initial: ColumnVisibility;
  onChangeSpy: (key: string, visible: boolean) => void;
}) {
  const [visibility, setVisibility] = React.useState<ColumnVisibility>(initial);

  const handleChange = (key: string, visible: boolean) => {
    onChangeSpy(key, visible);
    setVisibility((prev) => ({ ...prev, [key]: visible }));
  };

  return <ColumnToggle columns={TEST_COLUMNS} visibility={visibility} onChange={handleChange} />;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ColumnToggle", () => {
  it("renders trigger button with 'Kolom' label", () => {
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={ALL_VISIBLE} onChange={jest.fn()} />);
    expect(screen.getByRole("button", { name: /kolom/i })).toBeInTheDocument();
  });

  it("dropdown is closed by default", () => {
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={ALL_VISIBLE} onChange={jest.fn()} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown when trigger button is clicked", () => {
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={ALL_VISIBLE} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /kolom/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // All columns shown
    expect(screen.getByText("Nama")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Telepon")).toBeInTheDocument();
    expect(screen.getByText("Aksi")).toBeInTheDocument();
  });

  it("required columns show 'Wajib' label and cannot be toggled", () => {
    const onChangeSpy = jest.fn();
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={ALL_VISIBLE} onChange={onChangeSpy} />);
    fireEvent.click(screen.getByRole("button", { name: /kolom/i }));

    // "Wajib" badges are shown
    const wajibBadges = screen.getAllByText("Wajib");
    expect(wajibBadges.length).toBe(2); // name + actions

    // Clicking on required column item does nothing
    const namaOption = screen.getByRole("option", { name: /nama/i });
    fireEvent.click(namaOption);
    expect(onChangeSpy).not.toHaveBeenCalled();
  });

  it("toggles non-required column visibility when clicked", () => {
    const onChangeSpy = jest.fn();
    render(<TestHarness initial={ALL_VISIBLE} onChangeSpy={onChangeSpy} />);
    fireEvent.click(screen.getByRole("button", { name: /kolom/i }));

    // Click on Email to hide it
    const emailOption = screen.getByRole("option", { name: /email/i });
    fireEvent.click(emailOption);

    expect(onChangeSpy).toHaveBeenCalledWith("email", false);
  });

  it("shows badge with hidden column count", () => {
    const hiddenVisibility: ColumnVisibility = { ...ALL_VISIBLE, email: false, phone: false };
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={hiddenVisibility} onChange={jest.fn()} />);
    // Badge shows count of hidden columns (2)
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show badge when all columns are visible", () => {
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={ALL_VISIBLE} onChange={jest.fn()} />);
    // No numeric badge should be present
    expect(screen.queryByText("2")).not.toBeInTheDocument();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("Reset button restores all hidden columns to visible", () => {
    const onChangeSpy = jest.fn();
    const hiddenVisibility: ColumnVisibility = { ...ALL_VISIBLE, email: false, phone: false };
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={hiddenVisibility} onChange={onChangeSpy} />);
    fireEvent.click(screen.getByRole("button", { name: /kolom/i }));

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    // Called for each hidden non-required column
    expect(onChangeSpy).toHaveBeenCalledWith("email", true);
    expect(onChangeSpy).toHaveBeenCalledWith("phone", true);
  });

  it("closes on Escape key", () => {
    render(<ColumnToggle columns={TEST_COLUMNS} visibility={ALL_VISIBLE} onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /kolom/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

// ─── useColumnVisibility hook ─────────────────────────────────────────────────

describe("useColumnVisibility", () => {
  it("initializes all columns as visible by default", () => {
    const { result } = renderHook(() => useColumnVisibility("test-key", TEST_COLUMNS));
    const [visibility] = result.current;
    expect(visibility["name"]).toBe(true);
    expect(visibility["email"]).toBe(true);
    expect(visibility["phone"]).toBe(true);
    expect(visibility["actions"]).toBe(true);
  });

  it("persists visibility changes to localStorage", () => {
    const { result } = renderHook(() => useColumnVisibility("test-key", TEST_COLUMNS));
    const [, setVisibility] = result.current;

    act(() => setVisibility("email", false));

    const saved = JSON.parse(localStorage.getItem("test-key") ?? "{}");
    expect(saved["email"]).toBe(false);
  });

  it("reads saved preferences from localStorage on init", () => {
    localStorage.setItem("test-key", JSON.stringify({ name: true, email: false, phone: true, actions: true }));
    const { result } = renderHook(() => useColumnVisibility("test-key", TEST_COLUMNS));
    const [visibility] = result.current;
    expect(visibility["email"]).toBe(false);
  });

  it("forces required columns to always be visible even if localStorage says false", () => {
    // Simulate corrupted/stale storage
    localStorage.setItem("test-key", JSON.stringify({ name: false, email: false, phone: true, actions: false }));
    const { result } = renderHook(() => useColumnVisibility("test-key", TEST_COLUMNS));
    const [visibility] = result.current;
    // Required columns must be true
    expect(visibility["name"]).toBe(true);
    expect(visibility["actions"]).toBe(true);
    // Non-required column from storage preserved
    expect(visibility["email"]).toBe(false);
  });
});
