/**
 * Property 5: Preservation — SearchableDropdown Debounce Regression
 *
 * For any sequence of rapid keystrokes in the SearchableDropdown, the component
 * SHALL fire at most one API call per 300ms debounce window, preserving existing
 * debounce behavior.
 *
 * **Validates: Requirements 2.3, 3.3**
 *
 * @tags Feature: batch-a-quick-ux-fixes, Property 5: Preservation — SearchableDropdown Debounce
 */

import * as fc from "fast-check";
import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SearchableDropdown } from "../SearchableDropdown";

// ─── Arbitraries ──────────────────────────────────────────────────────────────

// Generate random keystroke sequences (1-20 lowercase chars)
const keystrokeSequenceArb = fc.stringMatching(/^[a-z]{1,20}$/);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Feature: batch-a-quick-ux-fixes, Property 5: SearchableDropdown Debounce Preservation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetchOptions is called at most once per 300ms debounce window for rapid typing", () => {
    // Sample random keystroke sequences from the arbitrary
    const samples = fc.sample(keystrokeSequenceArb, 30);

    for (const queryString of samples) {
      const mockFetchOptions = jest.fn().mockResolvedValue([]);
      const mockOnChange = jest.fn();

      const { container, unmount } = render(
        <SearchableDropdown
          label="Dokter"
          placeholder="Pilih dokter..."
          value={null}
          onChange={mockOnChange}
          fetchOptions={mockFetchOptions}
        />
      );

      // Open the dropdown by clicking the trigger button
      const triggerButton = container.querySelector('button[role="combobox"]');
      expect(triggerButton).not.toBeNull();
      act(() => {
        fireEvent.click(triggerButton!);
      });

      // fetchOptions is called once on open (with empty string / initial debouncedQuery)
      // Wait for the initial debounce to resolve
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Clear the initial load calls
      mockFetchOptions.mockClear();

      // Simulate rapid typing - type each character quickly (within 300ms total)
      const input = container.querySelector('input[role="combobox"]');
      expect(input).not.toBeNull();

      // Type each character rapidly (10ms apart — well within debounce window)
      for (let i = 0; i < queryString.length; i++) {
        act(() => {
          fireEvent.change(input!, { target: { value: queryString.slice(0, i + 1) } });
        });
        // Small advance between keystrokes (10ms) — stays within 300ms window
        act(() => {
          jest.advanceTimersByTime(10);
        });
      }

      // At this point, no debounced call should have fired yet
      // (debounce resets each time a new value is set)
      expect(mockFetchOptions).not.toHaveBeenCalled();

      // Now advance past the debounce window (300ms after last keystroke)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // After debounce resolves, fetchOptions should be called EXACTLY once
      expect(mockFetchOptions).toHaveBeenCalledTimes(1);

      // And it should use the final complete query string
      expect(mockFetchOptions).toHaveBeenCalledWith(queryString);

      unmount();
    }
  });

  it("typing 'abc' rapidly results in only 1 fetchOptions call with final query 'abc'", () => {
    const mockFetchOptions = jest.fn().mockResolvedValue([
      { id: "1", name: "Dr. ABC" },
    ]);
    const mockOnChange = jest.fn();

    const { container, unmount } = render(
      <SearchableDropdown
        label="Dokter"
        placeholder="Pilih dokter..."
        value={null}
        onChange={mockOnChange}
        fetchOptions={mockFetchOptions}
      />
    );

    // Open the dropdown
    const triggerButton = container.querySelector('button[role="combobox"]');
    act(() => {
      fireEvent.click(triggerButton!);
    });

    // Advance past initial debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Clear initial fetch calls
    mockFetchOptions.mockClear();

    // Rapid typing: "a", "ab", "abc"
    const input = container.querySelector('input[role="combobox"]');

    act(() => {
      fireEvent.change(input!, { target: { value: "a" } });
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });

    act(() => {
      fireEvent.change(input!, { target: { value: "ab" } });
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });

    act(() => {
      fireEvent.change(input!, { target: { value: "abc" } });
    });

    // Not yet called (still within debounce)
    expect(mockFetchOptions).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Exactly one call with the final value
    expect(mockFetchOptions).toHaveBeenCalledTimes(1);
    expect(mockFetchOptions).toHaveBeenCalledWith("abc");

    unmount();
  });
});
