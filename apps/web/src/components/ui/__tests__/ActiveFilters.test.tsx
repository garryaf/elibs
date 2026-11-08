import React from "react";
import { render, screen, fireEvent } from "@/test-utils";
import "@testing-library/jest-dom";
import { ActiveFilters, type ActiveFilterItem } from "../ActiveFilters";

describe("[UX-10] ActiveFilters Component", () => {
  it("renders null when there are no active filters", () => {
    const { container } = render(<ActiveFilters items={[]} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("active-filters-bar")).not.toBeInTheDocument();
  });

  it("renders chips for active filters with labels and values", () => {
    const items: ActiveFilterItem[] = [
      { id: "search", label: "Pencarian", value: '"Budi"', onRemove: jest.fn() },
      { id: "status", label: "Status", value: "Aktif", onRemove: jest.fn() },
    ];

    render(<ActiveFilters items={items} onResetAll={jest.fn()} />);

    expect(screen.getByTestId("active-filters-bar")).toBeInTheDocument();
    expect(screen.getByText("Filter Aktif:")).toBeInTheDocument();

    expect(screen.getByTestId("active-filter-chip-search")).toBeInTheDocument();
    expect(screen.getByText("Pencarian:")).toBeInTheDocument();
    expect(screen.getByText('"Budi"')).toBeInTheDocument();

    expect(screen.getByTestId("active-filter-chip-status")).toBeInTheDocument();
    expect(screen.getByText("Status:")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });

  it("calls onRemove when clicking the dismiss 'X' button on a chip", () => {
    const onRemoveSearch = jest.fn();
    const onRemoveStatus = jest.fn();

    const items: ActiveFilterItem[] = [
      { id: "search", label: "Pencarian", value: '"Budi"', onRemove: onRemoveSearch },
      { id: "status", label: "Status", value: "Aktif", onRemove: onRemoveStatus },
    ];

    render(<ActiveFilters items={items} onResetAll={jest.fn()} />);

    const removeSearchBtn = screen.getByRole("button", { name: /Hapus filter Pencarian/i });
    fireEvent.click(removeSearchBtn);
    expect(onRemoveSearch).toHaveBeenCalledTimes(1);
    expect(onRemoveStatus).not.toHaveBeenCalled();

    const removeStatusBtn = screen.getByRole("button", { name: /Hapus filter Status/i });
    fireEvent.click(removeStatusBtn);
    expect(onRemoveStatus).toHaveBeenCalledTimes(1);
  });

  it("renders 'Reset Semua' button and calls onResetAll when clicked", () => {
    const onResetAll = jest.fn();
    const items: ActiveFilterItem[] = [
      { id: "search", label: "Pencarian", value: '"Budi"', onRemove: jest.fn() },
    ];

    render(<ActiveFilters items={items} onResetAll={onResetAll} />);

    const resetBtn = screen.getByRole("button", { name: /Reset Semua/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });
});
