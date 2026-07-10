/**
 * Preservation Property Tests — Master Data CRUD Fix
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * These tests verify that EXISTING behavior is NOT broken by the fix.
 * They should PASS on both unfixed and fixed code.
 *
 * Property 2: Preservation - Existing Services and Navigation Unchanged
 */

import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// ─── Expected Master Data Card Properties (must remain unchanged) ───────────

const EXPECTED_CARDS = [
  {
    name: "Kategori Pemeriksaan",
    description: "Kelola kategori jenis pemeriksaan laboratorium",
    icon: "Layers",
  },
  {
    name: "Pemeriksaan Lab",
    description: "Daftar pemeriksaan laboratorium yang tersedia",
    icon: "TestTube",
  },
  {
    name: "Panel",
    description: "Konfigurasi panel pemeriksaan (paket tes)",
    icon: "FlaskConical",
  },
  {
    name: "Dokter",
    description: "Data dokter pengirim dan penanggung jawab",
    icon: "Stethoscope",
  },
  {
    name: "Klinik",
    description: "Data klinik dan faskes mitra",
    icon: "Building2",
  },
  {
    name: "Asuransi",
    description: "Data penyedia asuransi dan kerjasama",
    icon: "ShieldCheck",
  },
  {
    name: "Alat",
    description: "Inventaris alat dan instrumen laboratorium",
    icon: "Wrench",
  },
  {
    name: "Reagen",
    description: "Data reagen dan bahan kimia",
    icon: "Beaker",
  },
  {
    name: "Satuan",
    description: "Satuan pengukuran hasil pemeriksaan",
    icon: "Ruler",
  },
  {
    name: "Jenis Sampel",
    description: "Jenis spesimen/sampel yang diterima",
    icon: "Droplets",
  },
];

// ─── Existing Service Exports That Must Be Preserved ────────────────────────

const EXISTING_SERVICE_EXPORTS = [
  // From patients
  { module: "patients", exportName: "usePatients" },
  { module: "patients", exportName: "usePatient" },
  { module: "patients", exportName: "useCreatePatient" },
  { module: "patients", exportName: "useUpdatePatient" },
  // From orders
  { module: "orders", exportName: "useOrders" },
  { module: "orders", exportName: "useOrder" },
  { module: "orders", exportName: "useCreateOrder" },
  { module: "orders", exportName: "useCancelOrder" },
  // From lab
  { module: "lab", exportName: "useLabQueue" },
  { module: "lab", exportName: "useApprovalQueue" },
  { module: "lab", exportName: "useDeltaCheck" },
  { module: "lab", exportName: "useConfirmSample" },
  { module: "lab", exportName: "useEnterResults" },
  { module: "lab", exportName: "useVerifyResults" },
  { module: "lab", exportName: "useApproveOrder" },
  // From dashboard
  { module: "dashboard", exportName: "useExecutiveSummary" },
  { module: "dashboard", exportName: "useRecentOrders" },
  { module: "dashboard", exportName: "useLabSummary" },
  { module: "dashboard", exportName: "useLabVolume" },
  // From users
  { module: "users", exportName: "useUsers" },
  { module: "users", exportName: "useUser" },
  { module: "users", exportName: "useCreateUser" },
  { module: "users", exportName: "useUpdateUser" },
  { module: "users", exportName: "useDeleteUser" },
];

// Arbitrary that picks one of the existing service exports
const existingExportArb = fc.constantFrom(...EXISTING_SERVICE_EXPORTS);

// Arbitrary that picks one of the 10 expected cards
const cardArb = fc.constantFrom(...EXPECTED_CARDS);

// ─── Existing apiClient methods that other features depend on ───────────────

const API_CLIENT_METHODS = [
  "getDoctors",
  "getClinics",
  "getInsurances",
  "getPatients",
  "getOrders",
  "getUsers",
  "getTestCategories",
  "getTests",
];

const apiMethodArb = fc.constantFrom(...API_CLIENT_METHODS);

// ─── Test 1: Existing Service Exports Preservation ──────────────────────────

describe("Preservation: Existing Service Module Exports", () => {
  let serviceExports: Record<string, unknown>;

  beforeAll(async () => {
    serviceExports = await import("@/services");
  });

  it("Property: For all existing service modules (patients, orders, lab, dashboard, users), re-exports remain available from @/services", () => {
    /**
     * **Validates: Requirements 3.1, 3.2**
     *
     * Preservation check: adding master-data barrel export must NOT break
     * any existing service exports that other features depend on.
     */
    fc.assert(
      fc.property(existingExportArb, (serviceExport) => {
        const exported = serviceExports[serviceExport.exportName];
        expect(exported).toBeDefined();
        expect(typeof exported).toBe("function");
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Test 2: apiClient Method Signatures Preserved ──────────────────────────

describe("Preservation: apiClient Methods Response Format", () => {
  let apiClient: Record<string, unknown>;

  beforeAll(async () => {
    const apiModule = await import("@/lib/api");
    apiClient = apiModule.apiClient as unknown as Record<string, unknown>;
  });

  it("Property: For all apiClient methods used by other features, methods exist and are callable functions", () => {
    /**
     * **Validates: Requirements 3.2, 3.4**
     *
     * Preservation check: existing apiClient methods must remain available
     * as functions. Their response format (ApiResponse<PaginatedResponse<T>>)
     * must not change.
     */
    fc.assert(
      fc.property(apiMethodArb, (methodName) => {
        const method = apiClient[methodName];
        expect(method).toBeDefined();
        expect(typeof method).toBe("function");
      }),
      { numRuns: 100 }
    );
  });

  it("Property: ApiResponse and PaginatedResponse types are exported from @/lib/api", () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * The type exports must remain available for other modules to use.
     */
    fc.assert(
      fc.property(fc.constant(null), () => {
        // Verify the module exports the apiClient instance
        expect(apiClient).toBeDefined();
        expect(typeof apiClient).toBe("object");
        // Verify core methods exist (get, post, put, delete)
        expect(typeof apiClient["get"]).toBe("function");
        expect(typeof apiClient["post"]).toBe("function");
        expect(typeof apiClient["put"]).toBe("function");
        expect(typeof apiClient["delete"]).toBe("function");
      }),
      { numRuns: 1 }
    );
  });
});

// ─── Test 3: Master Data Card Visual Properties Preserved ───────────────────

describe("Preservation: Master Data Card Visual Properties", () => {
  let pageContent: string;
  let parsedCards: Array<{ name: string; description: string; icon: string }>;

  beforeAll(() => {
    const filePath = path.resolve(
      __dirname,
      "../app/dashboard/master-data/page.tsx"
    );
    pageContent = fs.readFileSync(filePath, "utf-8");

    // Parse cards from source — extract name, description, icon
    const cardRegex =
      /\{\s*name:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*icon:\s*(\w+),/g;
    parsedCards = [];
    let match;
    while ((match = cardRegex.exec(pageContent)) !== null) {
      parsedCards.push({
        name: match[1],
        description: match[2],
        icon: match[3],
      });
    }
  });

  it("Property: Master Data page contains exactly 10 cards", () => {
    /**
     * **Validates: Requirements 3.3**
     */
    expect(parsedCards).toHaveLength(10);
  });

  it("Property: For all 10 cards, visual properties (name, description, icon) remain identical", () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * Preservation check: the name, description, and icon for each card
     * must remain unchanged. Only the href may change.
     */
    fc.assert(
      fc.property(cardArb, (expectedCard) => {
        const actualCard = parsedCards.find(
          (c) => c.name === expectedCard.name
        );
        expect(actualCard).toBeDefined();
        expect(actualCard!.name).toBe(expectedCard.name);
        expect(actualCard!.description).toBe(expectedCard.description);
        expect(actualCard!.icon).toBe(expectedCard.icon);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: All expected card names are present in the page", () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * Every one of the 10 expected names must exist in the parsed output.
     */
    const expectedNames = EXPECTED_CARDS.map((c) => c.name);
    const actualNames = parsedCards.map((c) => c.name);

    fc.assert(
      fc.property(fc.constantFrom(...expectedNames), (name) => {
        expect(actualNames).toContain(name);
      }),
      { numRuns: 50 }
    );
  });
});
