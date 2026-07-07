/**
 * Property 7: Cascading Reset on Parent Change
 *
 * For any cascading selector state where child levels have values,
 * when a parent level selection changes, all child-level selections
 * below that parent SHALL be reset to empty.
 *
 * **Validates: Requirements 4.5**
 *
 * @tags Feature: master-wilayah-indonesia, Property 7: Cascading Reset on Parent Change
 */

import * as fc from "fast-check";
import React from "react";
import { render, act } from "@testing-library/react";
import {
  CascadingRegionSelector,
  type RegionValue,
} from "../CascadingRegionSelector";

// ─── Mock useRegionData ───────────────────────────────────────────────────────

// We mock the useRegionData hook to provide static items for each level
// so we can test the cascading reset logic without API calls.
jest.mock("../useRegionData", () => ({
  useRegionData: ({ endpoint }: { endpoint: string }) => {
    // Return a fixed set of items for each endpoint
    const itemsByEndpoint: Record<string, Array<{ id: string; name: string }>> =
      {
        provinsi: [
          { id: "11", name: "ACEH" },
          { id: "32", name: "JAWA BARAT" },
          { id: "33", name: "JAWA TENGAH" },
        ],
        "kabupaten-kota": [
          { id: "1101", name: "KAB. ACEH SELATAN" },
          { id: "3201", name: "KAB. BOGOR" },
          { id: "3301", name: "KAB. CILACAP" },
        ],
        kecamatan: [
          { id: "110101", name: "BAKONGAN" },
          { id: "320101", name: "CIBINONG" },
          { id: "330101", name: "ADIPALA" },
        ],
        "kelurahan-desa": [
          { id: "1101012001", name: "KEUDE BAKONGAN" },
          { id: "3201012001", name: "PAKANSARI" },
          { id: "3301012001", name: "ADIPALA" },
        ],
      };

    return {
      items: itemsByEndpoint[endpoint] || [],
      isLoading: false,
      error: null,
      search: "",
      setSearch: jest.fn(),
      retry: jest.fn(),
    };
  },
}));

// ─── Arbitraries ──────────────────────────────────────────────────────────────

// Generate EMSIFA-style region IDs
const provinsiIdArb = fc.constantFrom("11", "32", "33");
const kabupatenKotaIdArb = fc.constantFrom("1101", "3201", "3301");
const kecamatanIdArb = fc.constantFrom("110101", "320101", "330101");
const kelurahanDesaIdArb = fc.constantFrom(
  "1101012001",
  "3201012001",
  "3301012001"
);

// Generate a fully-filled region state (all children have values)
const fullRegionValueArb = fc.record({
  provinsiId: provinsiIdArb,
  kabupatenKotaId: kabupatenKotaIdArb,
  kecamatanId: kecamatanIdArb,
  kelurahanDesaId: kelurahanDesaIdArb,
});

// Generate a new parent selection ID (different from current or same - both should reset children)
const newProvinsiIdArb = provinsiIdArb;
const newKabupatenKotaIdArb = kabupatenKotaIdArb;
const newKecamatanIdArb = kecamatanIdArb;

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Renders the CascadingRegionSelector with given value and returns the
 * onChange mock and a way to simulate parent selection changes.
 */
function renderSelector(initialValue: RegionValue) {
  const onChangeMock = jest.fn();
  const { container } = render(
    <CascadingRegionSelector value={initialValue} onChange={onChangeMock} />
  );

  // Find all selector trigger buttons by their label
  const buttons = container.querySelectorAll('button[aria-haspopup="listbox"]');
  // Order: Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa
  return {
    onChangeMock,
    provinsiButton: buttons[0] as HTMLButtonElement,
    kabupatenKotaButton: buttons[1] as HTMLButtonElement,
    kecamatanButton: buttons[2] as HTMLButtonElement,
    kelurahanDesaButton: buttons[3] as HTMLButtonElement,
    container,
  };
}

/**
 * Opens a dropdown and clicks an item by id.
 */
function selectItem(container: Element, button: HTMLButtonElement, id: string) {
  // Open the dropdown
  act(() => {
    button.click();
  });

  // Find and click the option with the matching id
  const options = container.querySelectorAll('button[role="option"]');
  const targetOption = Array.from(options).find((opt) => {
    // The option's text content matches one of our mock items
    // We identify by finding the button within the same dropdown context
    return opt.getAttribute("aria-selected") !== null;
  });

  // Since we know the items structure, find by content lookup
  // Each dropdown shows its items, we need the one matching the target id
  // We'll click based on rendered items in the currently open dropdown
  const allListboxOptions = container.querySelectorAll('button[role="option"]');
  for (const option of allListboxOptions) {
    // Find the option that we want to click - match by the item data
    // Since items have known names, we can map id to name
    const idToName: Record<string, string> = {
      "11": "ACEH",
      "32": "JAWA BARAT",
      "33": "JAWA TENGAH",
      "1101": "KAB. ACEH SELATAN",
      "3201": "KAB. BOGOR",
      "3301": "KAB. CILACAP",
      "110101": "BAKONGAN",
      "320101": "CIBINONG",
      "330101": "ADIPALA",
      "1101012001": "KEUDE BAKONGAN",
      "3201012001": "PAKANSARI",
      "3301012001": "ADIPALA",
    };
    const targetName = idToName[id];
    if (option.textContent?.trim() === targetName) {
      act(() => {
        (option as HTMLButtonElement).click();
      });
      return;
    }
  }
}

// ─── Property Tests ───────────────────────────────────────────────────────────

describe("Feature: master-wilayah-indonesia, Property 7: Cascading Reset on Parent Change", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("Provinsi change resets kabupatenKotaId, kecamatanId, and kelurahanDesaId to undefined", () => {
    fc.assert(
      fc.property(
        fullRegionValueArb,
        newProvinsiIdArb,
        (initialValue, newProvinsiId) => {
          const { onChangeMock, provinsiButton, container } =
            renderSelector(initialValue);

          // Simulate selecting a new Provinsi
          selectItem(container, provinsiButton, newProvinsiId);

          // Verify onChange was called with the new provinsiId
          // and all child levels reset to undefined
          expect(onChangeMock).toHaveBeenCalledWith({
            provinsiId: newProvinsiId,
            kabupatenKotaId: undefined,
            kecamatanId: undefined,
            kelurahanDesaId: undefined,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("KabupatenKota change resets kecamatanId and kelurahanDesaId to undefined", () => {
    fc.assert(
      fc.property(
        fullRegionValueArb,
        newKabupatenKotaIdArb,
        (initialValue, newKabupatenKotaId) => {
          const { onChangeMock, kabupatenKotaButton, container } =
            renderSelector(initialValue);

          // Simulate selecting a new KabupatenKota
          selectItem(container, kabupatenKotaButton, newKabupatenKotaId);

          // Verify onChange was called preserving provinsiId,
          // setting new kabupatenKotaId, and resetting children
          expect(onChangeMock).toHaveBeenCalledWith({
            provinsiId: initialValue.provinsiId,
            kabupatenKotaId: newKabupatenKotaId,
            kecamatanId: undefined,
            kelurahanDesaId: undefined,
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Kecamatan change resets kelurahanDesaId to undefined", () => {
    fc.assert(
      fc.property(
        fullRegionValueArb,
        newKecamatanIdArb,
        (initialValue, newKecamatanId) => {
          const { onChangeMock, kecamatanButton, container } =
            renderSelector(initialValue);

          // Simulate selecting a new Kecamatan
          selectItem(container, kecamatanButton, newKecamatanId);

          // Verify onChange was called preserving provinsiId and kabupatenKotaId,
          // setting new kecamatanId, and resetting kelurahanDesaId
          expect(onChangeMock).toHaveBeenCalledWith({
            provinsiId: initialValue.provinsiId,
            kabupatenKotaId: initialValue.kabupatenKotaId,
            kecamatanId: newKecamatanId,
            kelurahanDesaId: undefined,
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
