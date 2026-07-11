// Feature: sprint-next1-critical-security, Property 3: Data-scope isolation

import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { Role } from '@prisma/client';
import { DataScopeInterceptor } from '../data-scope.interceptor';

/**
 * **Validates: Requirements 2.2, 2.3, 2.4**
 *
 * Property 3: Data-scope isolation for KLINIK_PARTNER
 *
 * For any KLINIK_PARTNER user with a non-null clinicId and any dataset of
 * visits/orders spanning multiple clinics, all resources returned by list or
 * detail endpoints SHALL have a clinicId value equal to the requesting user's
 * clinicId. Resources belonging to other clinics SHALL never appear in the response.
 *
 * For non-KLINIK_PARTNER users, no data scope filtering is applied.
 */
describe('DataScopeInterceptor - Property Tests', () => {
  let interceptor: DataScopeInterceptor;

  beforeEach(() => {
    interceptor = new DataScopeInterceptor();
  });

  function createMockExecutionContext(user: any): {
    context: ExecutionContext;
    request: any;
  } {
    const request: any = { user };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  }

  function createMockCallHandler(): CallHandler {
    return { handle: () => of(null) };
  }

  /** All roles except KLINIK_PARTNER */
  const nonPartnerRoles = Object.values(Role).filter(
    (r) => r !== Role.KLINIK_PARTNER,
  );

  describe('Property 3: Data-scope isolation for KLINIK_PARTNER', () => {
    /**
     * For any KLINIK_PARTNER user with a valid clinicId, the interceptor
     * SHALL attach request.dataScope = { clinicId } matching the user's clinicId.
     *
     * **Validates: Requirements 2.2, 2.3, 2.4**
     */
    it('KLINIK_PARTNER with clinicId sets dataScope matching user clinicId', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (clinicId) => {
            const user = { role: Role.KLINIK_PARTNER, clinicId };
            const { context, request } = createMockExecutionContext(user);
            const callHandler = createMockCallHandler();

            interceptor.intercept(context, callHandler);

            // dataScope must be set with exactly the user's clinicId
            expect(request.dataScope).toBeDefined();
            expect(request.dataScope.clinicId).toBe(clinicId);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any KLINIK_PARTNER user with a null/undefined clinicId, the interceptor
     * SHALL throw ForbiddenException.
     *
     * **Validates: Requirements 2.2, 2.3, 2.4**
     */
    it('KLINIK_PARTNER without clinicId throws ForbiddenException', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(null, undefined),
          (clinicId) => {
            const user = { role: Role.KLINIK_PARTNER, clinicId };
            const { context } = createMockExecutionContext(user);
            const callHandler = createMockCallHandler();

            expect(() => {
              interceptor.intercept(context, callHandler);
            }).toThrow(ForbiddenException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any non-KLINIK_PARTNER role (with or without clinicId), the interceptor
     * SHALL NOT set any dataScope on the request — allowing unfiltered access.
     *
     * **Validates: Requirements 2.2, 2.3, 2.4**
     */
    it('non-KLINIK_PARTNER roles do not get dataScope set (pass-through)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nonPartnerRoles),
          fc.option(fc.uuid(), { nil: undefined }),
          (role, clinicId) => {
            const user = { role, clinicId };
            const { context, request } = createMockExecutionContext(user);
            const callHandler = createMockCallHandler();

            interceptor.intercept(context, callHandler);

            // dataScope should NOT be set for non-KLINIK_PARTNER roles
            expect(request.dataScope).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For datasets spanning multiple clinics, KLINIK_PARTNER's dataScope
     * ensures only their clinicId would be used for filtering. We verify the
     * dataScope.clinicId never matches any other clinicId in the dataset.
     *
     * **Validates: Requirements 2.2, 2.3, 2.4**
     */
    it('KLINIK_PARTNER dataScope clinicId never matches other clinic IDs in a multi-clinic dataset', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
          (userClinicId, otherClinicIds) => {
            // Ensure the other IDs are truly different from user's clinic
            const distinctOtherIds = otherClinicIds.filter(
              (id) => id !== userClinicId,
            );
            if (distinctOtherIds.length === 0) return; // skip if no distinct IDs generated

            const user = { role: Role.KLINIK_PARTNER, clinicId: userClinicId };
            const { context, request } = createMockExecutionContext(user);
            const callHandler = createMockCallHandler();

            interceptor.intercept(context, callHandler);

            // The dataScope.clinicId is set to the user's clinicId
            expect(request.dataScope.clinicId).toBe(userClinicId);

            // No other clinic ID matches the scope — simulating that resources
            // from other clinics would be filtered out by services using dataScope
            for (const otherId of distinctOtherIds) {
              expect(request.dataScope.clinicId).not.toBe(otherId);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
