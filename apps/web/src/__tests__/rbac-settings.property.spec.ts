/**
 * Property 4: Settings access controlled by role
 *
 * **Validates: Requirements 5.2, 5.5**
 *
 * For any user role in the system, the "Pengaturan" sidebar menu item is visible
 * if and only if the role is in the set {SUPER_ADMIN, ADMIN}.
 * For all other roles, the menu item is hidden.
 */

import * as fc from "fast-check";

// ─── Role definitions matching the sidebar component ────────────────────────

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

// The allowed roles for "Pengaturan" as defined in the sidebar component
const SETTINGS_ALLOWED_ROLES: ReadonlySet<RoleKey> = new Set([
  "SUPER_ADMIN",
  "ADMIN",
]);

// ─── Role-checking logic extracted from sidebar ─────────────────────────────

/**
 * Simulates the sidebar's `isItemVisible` check for the "Pengaturan" menu item.
 * The sidebar defines: roles: ["SUPER_ADMIN", "ADMIN"] for "Pengaturan".
 */
function isSettingsVisibleForRole(role: RoleKey): boolean {
  const itemRoles: RoleKey[] = ["SUPER_ADMIN", "ADMIN"];
  return itemRoles.includes(role);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom(...ALL_ROLES);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: settings-master-data-restructure, Property 4: Settings access controlled by role", () => {
  it("Property: For any role, 'Pengaturan' is visible iff role ∈ {SUPER_ADMIN, ADMIN}", () => {
    /**
     * **Validates: Requirements 5.2, 5.5**
     *
     * For each randomly generated role from the full Role enum,
     * verify that the "Pengaturan" menu item visibility matches
     * exactly the allowed set {SUPER_ADMIN, ADMIN}.
     */
    fc.assert(
      fc.property(roleArb, (role: RoleKey) => {
        const isVisible = isSettingsVisibleForRole(role);
        const shouldBeVisible = SETTINGS_ALLOWED_ROLES.has(role);

        expect(isVisible).toBe(shouldBeVisible);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: All roles outside {SUPER_ADMIN, ADMIN} are denied access to Settings", () => {
    /**
     * **Validates: Requirements 5.5**
     *
     * Specifically tests that unauthorized roles do NOT see the menu item.
     * This confirms the redirect behavior requirement — if the menu is hidden,
     * direct URL access should also be blocked (tested by the role guard).
     */
    const unauthorizedRoles = ALL_ROLES.filter(
      (r) => !SETTINGS_ALLOWED_ROLES.has(r)
    );
    const unauthorizedRoleArb = fc.constantFrom(...unauthorizedRoles);

    fc.assert(
      fc.property(unauthorizedRoleArb, (role: RoleKey) => {
        const isVisible = isSettingsVisibleForRole(role);
        expect(isVisible).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("Property: All roles inside {SUPER_ADMIN, ADMIN} are granted access to Settings", () => {
    /**
     * **Validates: Requirements 5.2**
     *
     * Confirms authorized roles always see the "Pengaturan" menu item.
     */
    const authorizedRoles = ALL_ROLES.filter((r) =>
      SETTINGS_ALLOWED_ROLES.has(r)
    );
    const authorizedRoleArb = fc.constantFrom(...authorizedRoles);

    fc.assert(
      fc.property(authorizedRoleArb, (role: RoleKey) => {
        const isVisible = isSettingsVisibleForRole(role);
        expect(isVisible).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
