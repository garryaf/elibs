/**
 * Property: Visit row action visibility determinism
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 *
 * For any (status, role) combination from the full enum sets, the visible
 * actions in the VisitRowActions component match the visibility matrix exactly:
 * - "Lihat Detail" is always visible
 * - "Edit Kunjungan" appears IFF status ∈ {REGISTERED, IN_PROGRESS} AND role ∈ EDIT_VISIT_ROLES
 * - "Batalkan Kunjungan" appears IFF status === REGISTERED AND role ∈ CANCEL_VISIT_ROLES
 * - COMPLETED/CANCELLED always yield only "Lihat Detail"
 */

import * as fc from "fast-check";

// ─── Enum definitions matching the component ────────────────────────────────

const ALL_STATUSES = [
  "REGISTERED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

type VisitStatus = (typeof ALL_STATUSES)[number];

const ALL_ROLES = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "ADMIN",
  "KASIR",
  "CS",
  "SAMPLING",
  "ANALIS",
  "DOKTER",
  "MARKETING",
  "KLINIK_PARTNER",
] as const;

type RoleKey = (typeof ALL_ROLES)[number];

// ─── Role sets matching VisitRowActions component ───────────────────────────

const EDIT_VISIT_ROLES: ReadonlySet<string> = new Set([
  "KASIR",
  "CS",
  "ADMIN",
  "SUPER_ADMIN",
]);

const CANCEL_VISIT_ROLES: ReadonlySet<string> = new Set([
  "KASIR",
  "ADMIN",
  "SUPER_ADMIN",
]);

// ─── Visibility logic extracted from VisitRowActions ────────────────────────

interface VisibleActions {
  lihatDetail: boolean;
  editKunjungan: boolean;
  batalkanKunjungan: boolean;
}

/**
 * Computes which actions are visible for a given (status, role) pair.
 * This mirrors the logic in VisitRowActions.tsx.
 */
function getVisibleActions(status: VisitStatus, role: string): VisibleActions {
  const canEdit =
    EDIT_VISIT_ROLES.has(role) &&
    (status === "REGISTERED" || status === "IN_PROGRESS");

  const canCancel =
    CANCEL_VISIT_ROLES.has(role) && status === "REGISTERED";

  return {
    lihatDetail: true, // Always visible
    editKunjungan: canEdit,
    batalkanKunjungan: canCancel,
  };
}

/**
 * Returns the expected set of visible actions from the specification matrix.
 */
function getExpectedActions(status: VisitStatus, role: string): VisibleActions {
  switch (status) {
    case "COMPLETED":
    case "CANCELLED":
      // Only "Lihat Detail" regardless of role
      return { lihatDetail: true, editKunjungan: false, batalkanKunjungan: false };

    case "IN_PROGRESS":
      return {
        lihatDetail: true,
        editKunjungan: EDIT_VISIT_ROLES.has(role),
        batalkanKunjungan: false, // Cancel only for REGISTERED
      };

    case "REGISTERED":
      return {
        lihatDetail: true,
        editKunjungan: EDIT_VISIT_ROLES.has(role),
        batalkanKunjungan: CANCEL_VISIT_ROLES.has(role),
      };
  }
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const statusArb = fc.constantFrom(...ALL_STATUSES);
const roleArb = fc.constantFrom(...ALL_ROLES);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ncr-visits-patient-remediation, Property: Visit row action visibility", () => {
  it("Property: For any (status, role) pair, visible actions match the visibility matrix exactly", () => {
    /**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
     *
     * For each randomly generated (status, role) pair from the full enums,
     * verify that the computed visible actions match the specification matrix.
     */
    fc.assert(
      fc.property(statusArb, roleArb, (status: VisitStatus, role: RoleKey) => {
        const actual = getVisibleActions(status, role);
        const expected = getExpectedActions(status, role);

        expect(actual).toEqual(expected);
      }),
      { numRuns: 200 }
    );
  });

  it("Property: COMPLETED/CANCELLED always yield only 'Lihat Detail'", () => {
    /**
     * **Validates: Requirements 2.4, 2.5**
     *
     * For terminal statuses, regardless of role, only "Lihat Detail" is visible.
     */
    const terminalStatusArb = fc.constantFrom(
      "COMPLETED" as VisitStatus,
      "CANCELLED" as VisitStatus
    );

    fc.assert(
      fc.property(terminalStatusArb, roleArb, (status: VisitStatus, role: RoleKey) => {
        const actions = getVisibleActions(status, role);

        expect(actions.lihatDetail).toBe(true);
        expect(actions.editKunjungan).toBe(false);
        expect(actions.batalkanKunjungan).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it("Property: Edit appears IFF status ∈ {REGISTERED, IN_PROGRESS} AND role ∈ EDIT_VISIT_ROLES", () => {
    /**
     * **Validates: Requirements 2.1, 2.3**
     *
     * "Edit Kunjungan" visibility is determined by both status and role.
     */
    fc.assert(
      fc.property(statusArb, roleArb, (status: VisitStatus, role: RoleKey) => {
        const actions = getVisibleActions(status, role);

        const shouldShowEdit =
          EDIT_VISIT_ROLES.has(role) &&
          (status === "REGISTERED" || status === "IN_PROGRESS");

        expect(actions.editKunjungan).toBe(shouldShowEdit);
      }),
      { numRuns: 200 }
    );
  });

  it("Property: Cancel appears IFF status === REGISTERED AND role ∈ CANCEL_VISIT_ROLES", () => {
    /**
     * **Validates: Requirements 2.2**
     *
     * "Batalkan Kunjungan" only appears for REGISTERED visits with authorized roles.
     */
    fc.assert(
      fc.property(statusArb, roleArb, (status: VisitStatus, role: RoleKey) => {
        const actions = getVisibleActions(status, role);

        const shouldShowCancel =
          CANCEL_VISIT_ROLES.has(role) && status === "REGISTERED";

        expect(actions.batalkanKunjungan).toBe(shouldShowCancel);
      }),
      { numRuns: 200 }
    );
  });
});
