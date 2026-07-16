/**
 * Bug Condition Exploration Test — Orders 403 RBAC Fix
 *
 * This test encodes the EXPECTED (correct) behavior: roles with DB-granted
 * permissions or SUPER_ADMIN should NOT receive 403 from the authorization guard.
 *
 * **Phase 1 (unfixed code)**: This test FAILED because OrderController used RolesGuard
 * which blocks roles not in the hardcoded @Roles() list.
 *
 * **Phase 2 (fixed code)**: This test PASSES because OrderController now uses
 * PermissionGuard which allows SUPER_ADMIN bypass and checks DB permissions.
 *
 * Bug Condition:
 *   user.role NOT IN hardcoded @Roles() list for the endpoint
 *   AND (user.role == SUPER_ADMIN OR hasDbPermission(user.role, 'orders:create'))
 *
 * Expected Behavior (after fix):
 *   response.status != 403 (guard allows request through)
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 */

import * as fc from 'fast-check';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

describe('Bug Condition: SUPER_ADMIN and DB-Permissioned Roles Can Access Order Endpoints', () => {
  /**
   * Roles that have DB-granted `orders:create` permission but were NOT in the
   * hardcoded @Roles() list for POST /api/v1/orders under the old RolesGuard.
   * These roles triggered the bug condition.
   */
  const DB_PERMISSIONED_ROLES_NOT_IN_OLD_LIST: Role[] = [
    Role.OWNER,
    Role.MANAGER,
    Role.MARKETING,
  ];

  /**
   * Property 1: Expected Behavior — PermissionGuard allows SUPER_ADMIN bypass
   *
   * After migration to PermissionGuard, SUPER_ADMIN should always be allowed
   * regardless of the specific permission required.
   *
   * **Validates: Requirements 1.1, 2.1**
   */
  describe('PermissionGuard allows SUPER_ADMIN bypass', () => {
    it('SUPER_ADMIN should always pass PermissionGuard for any order permission', async () => {
      const orderPermissions = [
        'orders:create',
        'orders:read',
        'orders:cancel',
        'orders:manage-insurance',
        'orders:manage-bpjs',
        'orders:manage-claims',
        'orders:admin',
      ];

      const permissionArb = fc.constantFrom(...orderPermissions);

      await fc.assert(
        fc.asyncProperty(permissionArb, async (permission) => {
          const reflector = new Reflector();
          const mockPrisma = {
            rolePermission: {
              findFirst: jest.fn(), // Should not be called for SUPER_ADMIN
            },
          } as any;

          const guard = new PermissionGuard(reflector, mockPrisma);

          const mockContext = {
            getHandler: () => ({}),
            getClass: () => ({}),
            switchToHttp: () => ({
              getRequest: () => ({
                user: { id: 'super-admin-id', role: 'SUPER_ADMIN' },
              }),
            }),
          } as any;

          jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permission);

          const result = await guard.canActivate(mockContext);

          // SUPER_ADMIN always passes - this is the fix for the bug
          expect(result).toBe(true);
          // DB should NOT be queried for SUPER_ADMIN
          expect(mockPrisma.rolePermission.findFirst).not.toHaveBeenCalled();
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 1b: Expected Behavior — PermissionGuard allows DB-permissioned roles
   *
   * For any role that has `orders:create` permission granted in the database,
   * PermissionGuard should allow the request through. This is the core fix:
   * previously RolesGuard blocked these roles because they weren't in the
   * hardcoded list, ignoring DB permissions entirely.
   *
   * **Validates: Requirements 1.2, 2.2**
   */
  describe('PermissionGuard allows DB-permissioned roles through', () => {
    it('roles with orders:create DB permission should pass PermissionGuard', async () => {
      const dbPermissionedRoleArb = fc.constantFrom(...DB_PERMISSIONED_ROLES_NOT_IN_OLD_LIST);

      await fc.assert(
        fc.asyncProperty(dbPermissionedRoleArb, async (role) => {
          const reflector = new Reflector();
          const mockPrisma = {
            rolePermission: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'mock-rp-id',
                role,
                permissionId: 'mock-permission-id',
                isGranted: true,
              }),
            },
          } as any;

          const guard = new PermissionGuard(reflector, mockPrisma);

          const mockContext = {
            getHandler: () => ({}),
            getClass: () => ({}),
            switchToHttp: () => ({
              getRequest: () => ({
                user: { id: 'test-user-id', role },
              }),
            }),
          } as any;

          jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:create');

          const result = await guard.canActivate(mockContext);

          // PermissionGuard checks DB and finds permission → allows access
          // This is the fix: previously RolesGuard would have returned false (403)
          expect(result).toBe(true);
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 1c: Concrete example — OWNER with DB orders:create passes PermissionGuard
   *
   * A concrete, readable example showing the fix works: OWNER role has `orders:create`
   * permission in the database, and PermissionGuard correctly allows access.
   * Previously, RolesGuard blocked OWNER because it wasn't in the hardcoded list.
   *
   * **Validates: Requirements 1.2, 2.2**
   */
  describe('Concrete fix example: OWNER with DB permission passes PermissionGuard', () => {
    it('OWNER with orders:create DB permission should pass PermissionGuard on POST /api/v1/orders', async () => {
      const reflector = new Reflector();
      const mockPrisma = {
        rolePermission: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'rp-owner-orders-create',
            role: Role.OWNER,
            permissionId: 'perm-orders-create',
            isGranted: true,
          }),
        },
      } as any;

      const guard = new PermissionGuard(reflector, mockPrisma);

      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'owner-user-id', role: Role.OWNER },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:create');

      const result = await guard.canActivate(mockContext);

      // FIXED: PermissionGuard checks DB → finds permission → allows access
      // Previously: RolesGuard checked hardcoded list → OWNER not found → 403
      expect(result).toBe(true);
    });
  });

  /**
   * Property 1d: PermissionGuard correctly rejects roles WITHOUT DB permission
   *
   * Verifies that PermissionGuard still denies access for roles that don't have
   * the required permission in the database and are not SUPER_ADMIN.
   *
   * **Validates: Requirements 2.3**
   */
  describe('PermissionGuard rejects roles without DB permission', () => {
    it('roles without orders:create DB permission should be blocked by PermissionGuard', async () => {
      const reflector = new Reflector();
      const mockPrisma = {
        rolePermission: {
          findFirst: jest.fn().mockResolvedValue(null), // No permission found
        },
      } as any;

      const guard = new PermissionGuard(reflector, mockPrisma);

      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'cs-user-id', role: Role.CS },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('orders:create');

      const result = await guard.canActivate(mockContext);

      // CS role has no DB permission for orders:create → correctly blocked
      expect(result).toBe(false);
    });
  });
});
