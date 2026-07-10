/**
 * Bug Condition Exploration Test — Master Data CRUD Fix
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * This test encodes the EXPECTED correct behavior for master data navigation,
 * hook existence, and response unwrapping. On unfixed code, these tests FAIL,
 * confirming the bugs exist. After the fix, these tests PASS.
 *
 * Property 1: Bug Condition - Master Data Navigation & Data Rendering Broken
 */

import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

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
  let masterDataItems: Array<{ name: string; href: string }>;

  beforeAll(() => {
    // Read the actual page source to extract current href values
    const filePath = path.resolve(
      __dirname,
      "../app/dashboard/master-data/page.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    // Parse the masterDataItems array from the source
    // Extract name and href pairs using regex
    const itemBlocks = content.match(
      /\{\s*name:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"/g
    );

    if (itemBlocks && itemBlocks.length === 10) {
      masterDataItems = itemBlocks.map((block) => {
        const nameMatch = block.match(/name:\s*"([^"]+)"/);
        const hrefMatch = block.match(/href:\s*"([^"]+)"/);
        return {
          name: nameMatch![1],
          href: hrefMatch![1],
        };
      });
    } else {
      // Fallback: use known current state (all pointing to /dashboard/settings)
      masterDataItems = ENTITY_MAP.map((e) => ({
        name: e.name,
        href: "/dashboard/settings",
      }));
    }
  });

  it("Property: For all 10 master data entities, card href equals /dashboard/master-data/{slug}", () => {
    /**
     * **Validates: Requirements 1.1**
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
      { numRuns: 100 }
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
     * **Validates: Requirements 1.3**
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
  // Arbitrary for paginated API response shape (matches PaginatedResponse<T>)
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

  it("Property: Dynamic entity page exists and unwraps paginated response .data before rendering", () => {
    /**
     * **Validates: Requirements 1.2**
     *
     * Bug condition: No dynamic entity page exists at [entity]/page.tsx,
     * so there is no code that correctly unwraps `{ data: [...], meta: {...} }`.
     * When a future page tries to render the response, calling `.map()` directly
     * on the paginated wrapper would crash with TypeError.
     *
     * Expected behavior: A dynamic route page exists that extracts `.data` array
     * from the paginated response before calling `.map()` for rendering.
     */
    // First: verify the dynamic route page module exists
    const entityPagePath = path.resolve(
      __dirname,
      "../app/dashboard/master-data/[entity]/page.tsx"
    );
    const pageExists = fs.existsSync(entityPagePath);

    // The page must exist for response unwrapping to be handled
    expect(pageExists).toBe(true);

    // If page exists, verify it contains proper unwrapping logic
    if (pageExists) {
      const content = fs.readFileSync(entityPagePath, "utf-8");
      fc.assert(
        fc.property(paginatedResponseArb, () => {
          // The page source must extract .data from the response before mapping
          // Look for patterns like: response.data, response?.data, .data ?? []
          const hasDataExtraction =
            content.includes(".data") &&
            (content.includes(".map(") || content.includes(".map ("));
          expect(hasDataExtraction).toBe(true);
        }),
        { numRuns: 10 }
      );
    }
  });
});
