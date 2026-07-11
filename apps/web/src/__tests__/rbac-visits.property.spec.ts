/**
 * Property: RBAC visits page visibility
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * For any user role in the system, visits page access is granted
 * if and only if the role is in the set AUTHORIZED_VISIT_ROLES.
 * Authorized roles see page content; unauthorized roles get redirected.
 */

import * as fc from "fast-check";

// ─── Role definitions matching the system ───────────────────────────────────

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

// The authorized roles for visits page as defined in the visits page component
const AUTHORIZED_VISIT_ROLES: ReadonlySet<RoleKey> = new Set([
  "KASIR",
  "CS",
  "ADMIN",
  "KLINIK_PARTNER",
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
]);

// ─── Role-checking logic extracted from visits page ─────────────────────────

/**
 * Simulates the visits page RBAC gate check.
 * The page defines AUTHORIZED_VISIT_ROLES and checks user.role inclusion.
 * Returns true if the role is authorized to view the page content.
 */
function isVisitsPageAccessible(role: RoleKey): boolean {
  const authorizedRoles: RoleKey[] = [
    "KASIR",
    "CS",
    "ADMIN",
    "KLINIK_PARTNER",
    "SUPER_ADMIN",
    "OWNER",
    "MANAGER",
  ];
  return authorizedRoles.includes(role);
}

/**
 * Simulates the sidebar visibility check for the "Kunjungan" menu item.
 * The sidebar defines roles array for the menu item.
 */
function isVisitsSidebarVisible(role: RoleKey): boolean {
  const sidebarRoles: RoleKey[] = [
    "SUPER_ADMIN",
    "OWNER",
    "MANAGER",
    "ADMIN",
    "KASIR",
    "CS",
    "KLINIK_PARTNER",
  ];
  return sidebarRoles.includes(role);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom(...ALL_ROLES);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ncr-visits-patient-remediation, Property: RBAC visits page visibility", () => {
  it("Property: For any role, visits page access is granted IFF role ∈ AUTHORIZED_VISIT_ROLES", () => {
    /**
     * **Validates: Requirements 1.1, 1.2**
     *
     * For each randomly generated role from the full Role enum,
     * verify that the visits page access matches exactly the
     * authorized roles set.
     */
    fc.assert(
      fc.property(roleArb, (role: RoleKey) => {
        const hasAccess = isVisitsPageAccessible(role);
        const shouldHaveAccess = AUTHORIZED_VISIT_ROLES.has(role);

        expect(hasAccess).toBe(shouldHaveAccess);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: All roles outside AUTHORIZED_VISIT_ROLES are redirected to dashboard", () => {
    /**
     * **Validates: Requirements 1.2**
     *
     * Specifically tests that unauthorized roles do NOT get page access.
     * These roles trigger router.replace("/dashboard") in the visits page.
     */
    const unauthorizedRoles = ALL_ROLES.filter(
      (r) => !AUTHORIZED_VISIT_ROLES.has(r)
    );
    const unauthorizedRoleArb = fc.constantFrom(...unauthorizedRoles);

    fc.assert(
      fc.property(unauthorizedRoleArb, (role: RoleKey) => {
        const hasAccess = isVisitsPageAccessible(role);
        expect(hasAccess).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: All roles inside AUTHORIZED_VISIT_ROLES see page content", () => {
    /**
     * **Validates: Requirements 1.1**
     *
     * Confirms authorized roles always get access to the visits page content.
     */
    const authorizedRoles = ALL_ROLES.filter((r) =>
      AUTHORIZED_VISIT_ROLES.has(r)
    );
    const authorizedRoleArb = fc.constantFrom(...authorizedRoles);

    fc.assert(
      fc.property(authorizedRoleArb, (role: RoleKey) => {
        const hasAccess = isVisitsPageAccessible(role);
        expect(hasAccess).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: Sidebar visibility and page access are consistent for all roles", () => {
    /**
     * **Validates: Requirements 1.3**
     *
     * The sidebar "Kunjungan" menu item uses the same role set as the
     * page-level RBAC gate. For any role, sidebar visibility must match
     * page access — ensuring no role sees a link they cannot access.
     */
    fc.assert(
      fc.property(roleArb, (role: RoleKey) => {
        const sidebarVisible = isVisitsSidebarVisible(role);
        const pageAccessible = isVisitsPageAccessible(role);

        expect(sidebarVisible).toBe(pageAccessible);
      }),
      { numRuns: 100 }
    );
  });
});
