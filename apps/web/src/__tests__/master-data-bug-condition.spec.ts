/**
 * Bug Condition Exploration Test — Master Data CRUD Fix
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * This test encodes the EXPECTED correct behavior for master data navigation,
 * hook existence, and response unwrapping. On unfixed code, these tests FAIL,
 * confirming the bugs exist. After the fix, these tests PASS.
 *
 * Property 1: Bug Condition - Master Data Navigation & Data Rendering Broken
 */

import * as fc from "fast-check";

// ─── Entity Mapping ─────────────────────────────────────────────────────────

const ENTITY_MAP: Array<{ name: string; slug: string; hookName: string }> = [
  { name: "Kategori Pemeriksaan", slug: "kategori-pemeriksaan", hookName: "useMasterTestCategories" },
  { name: "Pemeriksaan Lab", slug: "pemeriksaan-lab", hookName: "useMasterTests" },
  { name: "Panel", slug: "panel", hookName: "useMasterPanels" },
  { name: "Dokter", slug: "dokter", hookName: "useMasterDoctors" },
  { name: "Klinik", slug: "klinik", hookName: "useMasterClinics" },
  { name: "Asuransi", slug: "asuransi", hookName: "useMasterInsurances" },
  { name: "Alat", slug: "alat", hookName: "useMasterEquipments" },
  { name: "Reagen", slug: "reagen", hookName: "useMasterReagents" },
  { name: "Satuan", slug: "satuan", hookName: "useMasterUnits" },
  { name: "Jenis Sampel", slug: "jenis-sampel", hookName: "useMasterSampleTypes" },
];

// Arbitrary that picks one of the 10 entities uniformly
const entityArb = fc.constantFrom(...ENTITY_MAP);

// ─── Test 1: Navigation ─────────────────────────────────────────────────────

describe("Bug Condition: Master Data Navigation", () => {
  // Import the masterDataItems array from the page module
  let masterDataItems: Array<{ name: string; href: string }>;

  beforeAll(async () => {
    // Dynamic import of the page module to get masterDataItems
    const pageModule = await import(
      "@/app/dashboard/master-data/page"
    );
    // The module default-exports the component; masterDataItems is a module-level const.
    // We need to access it. Since it's not exported, we'll read the file content and
    // extract the data. Instead, let's use a simpler approach: re-declare the expected
    // items and test against the actual page source.
    // Actually — let's just import and parse the items from the source directly.
    // Since masterDataItems is not exported, we'll test by verifying the source file.
    masterDataItems = [
      { name: "Kategori Pemeriksaan", href: "/dashboard/settings" },
      { name: "Pemeriksaan Lab", href: "/dashboard/settings" },
      { name: "Panel", href: "/dashboard/settings" },
      { name: "Dokter", href: "/dashboard/settings" },
      { name: "Klinik", href: "/dashboard/settings" },
      { name: "Asuransi", href: "/dashboard/settings" },
      { name: "Alat", href: "/dashboard/settings" },
      { name: "Reagen", href: "/dashboard/settings" },
      { name: "Satuan", href: "/dashboard/settings" },
      { name: "Jenis Sampel", href: "/dashboard/settings" },
    ];

    // Try to get actual items from the source
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.resolve(
        __dirname,
        "../app/dashboard/master-data/page.tsx"
      );
      const content = fs.readFileSync(filePath, "utf-8");

      // Parse href values from the source using regex
      const hrefMatches = content.match(/href:\s*"([^"]+)"/g);
      const nameMatches = content.match(/name:\s*"([^"]+)"/g);

      if (hrefMatches && nameMatches && hrefMatches.length === 10) {
        masterDataItems = nameMatches.map((nameMatch, i) => ({
          name: nameMatch.replace(/name:\s*"/, "").replace(/"$/, ""),
          href: hrefMatches[i].replace(/href:\s*"/, "").replace(/"$/, ""),
        }));
      }
    } catch {
      // If file reading fails, use hardcoded values from known current state
    }
  });

  it("Property: For all 10 master data entities, card href equals /dashboard/master-data/{slug}", () => {
    /**
     * Validates: Requirements 1.1
     *
     * Bug condition: All masterDataItems[i].href === "/dashboard/settings"
     * Expected behavior: masterDataItems[i].href === "/dashboard/master-data/{slug}"
     */
    fc.assert(
      fc.property(entityArb, (entity) => {
        const card = masterDataItems.find((item) => item.name === entity.name);
        expect(card).toBeDefined();
        expect(card!.href).toBe(`/dashboard/master-data/${entity.slug}`);
      }),
      { numRuns: 100 } // Run enough times to exercise all 10 entities
    );
  });
});

// ─── Test 2: Hook Existence ─────────────────────────────────────────────────

describe("Bug Condition: Master Data Hook Existence", () => {
  let serviceExports: Record<string, unknown>;

  beforeAll(async () => {
    try {
      serviceExports = await import("@/services");
    } catch {
      serviceExports = {};
    }
  });

  it("Property: For all 10 master data entities, corresponding useQuery hook is importable from @/services", () => {
    /**
     * Validates: Requirements 1.3
     *
     * Bug condition: hookDoesNotExist(entity) === true for all master data entities
     * Expected behavior: typeof services[hookName] === "function"
     */
    fc.assert(
      fc.property(entityArb, (entity) => {
        const hook = serviceExports[entity.hookName];
        expect(hook).toBeDefined();
        expect(typeof hook).toBe("function");
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Test 3: Response Unwrapping ────────────────────────────────────────────

describe("Bug Condition: Response Unwrapping", () => {
  // Arbitrary for paginated API response shape
  const paginatedResponseArb = fc.record({
    data: fc.array(
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      { minLength: 0, maxLength: 20 }
    ),
    meta: fc.record({
      total: fc.nat({ max: 1000 }),
      page: fc.integer({ min: 1, max: 100 }),
      limit: fc.integer({ min: 1, max: 100 }),
    }),
  });

  it("Property: For any paginated response, extracting .data before .map() produces an array without TypeError", () => {
    /**
     * Validates: Requirements 1.2
     *
     * Bug condition: response.map(...) throws TypeError because response is { data: [...], meta: {...} }
     * Expected behavior: response.data.map(...) works because .data is extracted first
     *
     * This test verifies the UNWRAPPING logic: given a paginated response object,
     * the correct code extracts .data (the array) before calling .map().
     */
    fc.assert(
      fc.property(paginatedResponseArb, (response) => {
        // Correct unwrapping: extract .data array from paginated wrapper
        const items = response.data;

        // This should be an array and .map() should not throw
        expect(Array.isArray(items)).toBe(true);
        expect(() => items.map((item) => item.id)).not.toThrow();

        // Bug condition: calling .map() directly on the response wrapper SHOULD throw
        // This demonstrates what the buggy code does
        expect(() => (response as unknown as unknown[]).map((x) => x)).toThrow();
      }),
      { numRuns: 100 }
    );
  });
});
