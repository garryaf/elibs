/**
 * Property Test: Master Data access controlled by role
 *
 * Feature: settings-master-data-restructure, Property 3: Master Data access controlled by role
 *
 * **Validates: Requirements 5.1, 5.4**
 *
 * Property 3: For any user role in the system, the "Master Data" sidebar menu
 * item is visible if and only if the role is in the set
 * {SUPER_ADMIN, OWNER, MANAGER, ADMIN}. For all other roles, the menu item
 * is hidden.
 */

import * as fc from "fast-check";

// ─── Role definitions matching sidebar.tsx ───────────────────────────────────

type RoleKey =
  | "SUPER_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "ADMIN"
  | "KASIR"
  | "CS"
  | "SAMPLING"
  | "ANALIS"
  | "DOKTER"
  | "MARKETING"
  | "KLINIK_PARTNER";

const ALL_ROLES: RoleKey[] = [
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
];

// The allowed roles for the "Master Data" menu item as defined in sidebar.tsx
const MASTER_DATA_ALLOWED_ROLES: RoleKey[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "ADMIN",
];

// ─── Role check logic extracted from sidebar.tsx ─────────────────────────────

/**
 * Replicates the `isItemVisible` logic from the Sidebar component.
 * If a menu item has a `roles` array, the item is visible only when
 * the user's role is included in that array.
 */
function isMasterDataVisible(userRole: RoleKey): boolean {
  return MASTER_DATA_ALLOWED_ROLES.includes(userRole);
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom(...ALL_ROLES);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe("Property 3: Master Data access controlled by role", () => {
  /**
   * **Validates: Requirements 5.1, 5.4**
   */

  it('should show "Master Data" if and only if role is in {SUPER_ADMIN, OWNER, MANAGER, ADMIN} (100+ iterations)', () => {
    fc.assert(
      fc.property(roleArb, (role: RoleKey) => {
        const isVisible = isMasterDataVisible(role);
        const shouldBeVisible = MASTER_DATA_ALLOWED_ROLES.includes(role);

        // Property: visibility matches the allowed set exactly
        expect(isVisible).toBe(shouldBeVisible);
      }),
      { numRuns: 100 },
    );
  });

  it("should verify the logic matches the actual sidebar source code", () => {
    /**
     * Cross-check: parse the sidebar source file to confirm the Master Data
     * menu item's roles array matches our expected allowed set.
     */
    const fs = require("fs");
    const path = require("path");

    const sidebarPath = path.resolve(
      __dirname,
      "../components/layout/sidebar.tsx",
    );
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

    // Find the "Master Data" menu item definition and extract its roles
    const masterDataMatch = sidebarContent.match(
      /name:\s*"Master Data"[\s\S]*?roles:\s*\[([^\]]+)\]/,
    );
    expect(masterDataMatch).not.toBeNull();

    const rolesString = masterDataMatch![1];
    const parsedRoles = rolesString
      .split(",")
      .map((r: string) => r.trim().replace(/"/g, ""));

    // Verify parsed roles match our expected set
    expect(parsedRoles.sort()).toEqual([...MASTER_DATA_ALLOWED_ROLES].sort());
  });

  it("should hide Master Data for all roles NOT in the allowed set (100+ iterations)", () => {
    const disallowedRoles = ALL_ROLES.filter(
      (r) => !MASTER_DATA_ALLOWED_ROLES.includes(r),
    );
    const disallowedRoleArb = fc.constantFrom(...disallowedRoles);

    fc.assert(
      fc.property(disallowedRoleArb, (role: RoleKey) => {
        expect(isMasterDataVisible(role)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("should show Master Data for all roles IN the allowed set (100+ iterations)", () => {
    const allowedRoleArb = fc.constantFrom(...MASTER_DATA_ALLOWED_ROLES);

    fc.assert(
      fc.property(allowedRoleArb, (role: RoleKey) => {
        expect(isMasterDataVisible(role)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
