/**
 * Preservation Property Tests — Orders 403 RBAC Fix
 *
 * These tests capture existing CORRECT behavior that must remain unchanged after the fix.
 * They verify that:
 * - KASIR, ADMIN, KLINIK_PARTNER roles can access order endpoints (response != 403)
 * - Unauthenticated requests are rejected with 401
 *
 * IMPORTANT: These tests MUST PASS on UNFIXED code (since these roles already work via RolesGuard).
 * After the fix (migration to PermissionGuard), these tests must CONTINUE to pass.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import * as fc from 'fast-check';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

/**
 * Represents an order endpoint with its HTTP method and the roles currently allowed
 * via the @Roles() decorator on the OrderController.
 */
interface OrderEndpoint {
  method: string;
  path: string;
  allowedRoles: Role[];
}

/**
 * Map of all order controller endpoints and their currently-hardcoded allowed roles.
 * This is derived directly from reading the OrderController source code.
 */
const ORDER_ENDPOINTS: OrderEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/orders',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.KLINIK_PARTNER, Role.SUPER_ADMIN, Role.CS],
  },
  {
    method: 'GET',
    path: '/api/v1/orders',
    allowedRoles: [Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER],
  },
  {
    method: 'GET',
    path: '/api/v1/orders/overdue',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/check-overdue',
    allowedRoles: [Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'GET',
    path: '/api/v1/orders/:id',
    allowedRoles: [Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/cancel',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'GET',
    path: '/api/v1/orders/:id/insurances',
    allowedRoles: [Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/insurances',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/insurances/:insuranceId',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'DELETE',
    path: '/api/v1/orders/insurances/:insuranceId',
    allowedRoles: [Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'GET',
    path: '/api/v1/orders/:id/bpjs',
    allowedRoles: [Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER, Role.SAMPLING, Role.ANALIS, Role.DOKTER],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/bpjs',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/:id/bpjs',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/bpjs/verify',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'GET',
    path: '/api/v1/orders/:id/claims',
    allowedRoles: [Role.KASIR, Role.CS, Role.ADMIN, Role.SUPER_ADMIN, Role.OWNER, Role.MANAGER],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/claims/submit',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/claims/:claimId/review',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/claims/:claimId/approve',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/claims/:claimId/partially-approve',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/claims/:claimId/reject',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'PUT',
    path: '/api/v1/orders/claims/:claimId/paid',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
  {
    method: 'POST',
    path: '/api/v1/orders/:id/fallback-payment',
    allowedRoles: [Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN],
  },
];

/** The three roles that MUST continue to have access after fix (preservation target) */
const PRESERVATION_ROLES = [Role.KASIR, Role.ADMIN, Role.KLINIK_PARTNER] as const;

/**
 * Get all endpoints that a given role can currently access.
 */
function getEndpointsForRole(role: Role): OrderEndpoint[] {
  return ORDER_ENDPOINTS.filter((ep) => ep.allowedRoles.includes(role));
}

/**
 * Create a mock ExecutionContext with the given user and required roles metadata.
 */
function createMockContext(user: { role: Role } | undefined, requiredRoles: Role[]): ExecutionContext {
  const mockRequest = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

/**
 * Create a Reflector mock that returns the specified roles.
 */
function createMockReflector(roles: Role[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
    get: jest.fn(),
    getAll: jest.fn(),
    getAllAndMerge: jest.fn(),
    resolve: jest.fn(),
  } as unknown as Reflector;
}

describe('Preservation: Order Controller RBAC - Previously-Allowed Roles', () => {
  /**
   * Property 2: Preservation - Previously-Allowed Roles Continue to Have Access
   *
   * _For any_ role in [KASIR, ADMIN, KLINIK_PARTNER] and _for any_ order endpoint
   * that role is currently allowed to access, the RolesGuard SHALL allow the request
   * (canActivate returns true, meaning response != 403).
   *
   * This test runs against the UNFIXED code's RolesGuard to establish the baseline.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3**
   */
  describe('Property 2a: KASIR, ADMIN, KLINIK_PARTNER access is preserved', () => {
    it('for all preservation roles × their allowed endpoints, RolesGuard allows access', () => {
      // Build the space of (role, endpoint) pairs where the role IS in the allowed list
      const preservationRoleEndpointPairs: Array<{ role: Role; endpoint: OrderEndpoint }> = [];
      for (const role of PRESERVATION_ROLES) {
        for (const endpoint of getEndpointsForRole(role)) {
          preservationRoleEndpointPairs.push({ role, endpoint });
        }
      }

      // Ensure we have actual combinations to test
      expect(preservationRoleEndpointPairs.length).toBeGreaterThan(0);

      // Use fast-check to sample from these combinations
      const pairArb = fc.constantFrom(...preservationRoleEndpointPairs);

      fc.assert(
        fc.property(pairArb, ({ role, endpoint }) => {
          const reflector = createMockReflector(endpoint.allowedRoles);
          const guard = new RolesGuard(reflector);
          const context = createMockContext({ role }, endpoint.allowedRoles);

          const result = guard.canActivate(context);

          // The guard MUST allow this role (return true, not 403)
          expect(result).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * Specific example tests for each preservation role on POST /api/v1/orders
     * (the primary endpoint from the bug report)
     *
     * **Validates: Requirements 3.1, 3.2, 3.3**
     */
    it('KASIR can access POST /api/v1/orders', () => {
      const createEndpoint = ORDER_ENDPOINTS.find(
        (ep) => ep.method === 'POST' && ep.path === '/api/v1/orders',
      )!;
      const reflector = createMockReflector(createEndpoint.allowedRoles);
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ role: Role.KASIR }, createEndpoint.allowedRoles);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('ADMIN can access POST /api/v1/orders', () => {
      const createEndpoint = ORDER_ENDPOINTS.find(
        (ep) => ep.method === 'POST' && ep.path === '/api/v1/orders',
      )!;
      const reflector = createMockReflector(createEndpoint.allowedRoles);
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ role: Role.ADMIN }, createEndpoint.allowedRoles);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('KLINIK_PARTNER can access POST /api/v1/orders', () => {
      const createEndpoint = ORDER_ENDPOINTS.find(
        (ep) => ep.method === 'POST' && ep.path === '/api/v1/orders',
      )!;
      const reflector = createMockReflector(createEndpoint.allowedRoles);
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ role: Role.KLINIK_PARTNER }, createEndpoint.allowedRoles);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  /**
   * Property 2b: Unauthenticated requests are rejected
   *
   * _For any_ order endpoint, when no user is present in the request (simulating
   * that JwtAuthGuard rejected it or user is undefined), the RolesGuard SHALL
   * deny access (canActivate returns false).
   *
   * Note: In the real app, JwtAuthGuard fires first and returns 401 before
   * RolesGuard even runs. This test verifies that the RolesGuard ALSO rejects
   * when no user is present (defense-in-depth). The 401 vs 403 distinction is
   * handled by JwtAuthGuard, not RolesGuard.
   *
   * **Validates: Requirements 3.4**
   */
  describe('Property 2b: Unauthenticated requests are rejected by guard', () => {
    it('for all order endpoints, RolesGuard denies access when user is undefined', () => {
      const endpointArb = fc.constantFrom(...ORDER_ENDPOINTS);

      fc.assert(
        fc.property(endpointArb, (endpoint) => {
          const reflector = createMockReflector(endpoint.allowedRoles);
          const guard = new RolesGuard(reflector);
          // No user = unauthenticated (user is undefined)
          const context = createMockContext(undefined, endpoint.allowedRoles);

          const result = guard.canActivate(context);

          // Guard must deny access when there is no user
          expect(result).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('unauthenticated request to POST /api/v1/orders is denied', () => {
      const createEndpoint = ORDER_ENDPOINTS.find(
        (ep) => ep.method === 'POST' && ep.path === '/api/v1/orders',
      )!;
      const reflector = createMockReflector(createEndpoint.allowedRoles);
      const guard = new RolesGuard(reflector);
      const context = createMockContext(undefined, createEndpoint.allowedRoles);

      expect(guard.canActivate(context)).toBe(false);
    });
  });

  /**
   * Property 2c: RolesGuard with no required roles allows all
   *
   * When an endpoint has no @Roles() decorator (requiredRoles is undefined/null),
   * the RolesGuard allows all requests. This preserves backward compat for
   * endpoints that only use JwtAuthGuard without role restrictions.
   *
   * **Validates: Requirements 3.5**
   */
  describe('Property 2c: No @Roles decorator means open access', () => {
    it('for any role, guard allows access when no roles are required', () => {
      const allRoles = Object.values(Role);
      const roleArb = fc.constantFrom(...allRoles);

      fc.assert(
        fc.property(roleArb, (role) => {
          // No roles required = no @Roles() decorator
          const reflector = createMockReflector(undefined);
          const guard = new RolesGuard(reflector);
          const context = createMockContext({ role }, []);

          const result = guard.canActivate(context);

          // Guard must allow access when no roles are configured
          expect(result).toBe(true);
        }),
        { numRuns: 50 },
      );
    });
  });
});
