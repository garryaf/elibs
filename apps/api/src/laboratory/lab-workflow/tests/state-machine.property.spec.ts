// Feature: laboratory-management, Property 2: State Machine Transition Validity

import * as fc from 'fast-check';
import { OrderStateMachineService } from '../order-state-machine.service';
import { OrderStatus } from '@prisma/client';

/**
 * **Validates: Requirements FR5.3, FR6.3, FR9.4, FR10.4, FR12.3**
 */
describe('State Machine Property Tests', () => {
  let service: OrderStateMachineService;

  const ALL_STATUSES = Object.values(OrderStatus);

  // The complete set of valid transitions as defined in the state machine
  const VALID_TRANSITIONS = new Set([
    `${OrderStatus.PENDING_PAYMENT}->${OrderStatus.PAID}`,
    `${OrderStatus.PENDING_PAYMENT}->${OrderStatus.PAYMENT_OVERDUE}`,
    `${OrderStatus.PENDING_PAYMENT}->${OrderStatus.CANCELLED}`,
    `${OrderStatus.PAYMENT_OVERDUE}->${OrderStatus.PAID}`,
    `${OrderStatus.PAYMENT_OVERDUE}->${OrderStatus.CANCELLED}`,
    `${OrderStatus.PAID}->${OrderStatus.SAMPLE_COLLECTED}`,
    `${OrderStatus.SAMPLE_COLLECTED}->${OrderStatus.IN_ANALYSIS}`,
    `${OrderStatus.IN_ANALYSIS}->${OrderStatus.VERIFIED}`,
    `${OrderStatus.VERIFIED}->${OrderStatus.APPROVED}`,
    `${OrderStatus.VERIFIED}->${OrderStatus.IN_ANALYSIS}`,
    `${OrderStatus.APPROVED}->${OrderStatus.NOTIFIED}`,
  ]);

  beforeAll(() => {
    // OrderStateMachineService.canTransition is pure logic — no DB needed
    // We pass a null prisma since we only test canTransition
    service = new OrderStateMachineService(null as any);
  });

  /**
   * Property 2: State Machine Transition Validity
   *
   * *For any* order status S and *for any* attempted transition to status T,
   * the transition SHALL succeed if and only if (S, T) is in the set of valid
   * transitions. All other (S, T) combinations SHALL be rejected.
   *
   * **Validates: Requirements FR5.3, FR6.3, FR9.4, FR10.4, FR12.3**
   */
  describe('Property 2: State Machine Transition Validity', () => {
    it('canTransition returns true iff (S, T) is in the valid transition set', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_STATUSES),
          fc.constantFrom(...ALL_STATUSES),
          (from, to) => {
            const key = `${from}->${to}`;
            const expected = VALID_TRANSITIONS.has(key);
            const actual = service.canTransition(from, to);
            expect(actual).toBe(expected);
          },
        ),
        { numRuns: 500 },
      );
    });

    it('terminal states (NOTIFIED, CANCELLED) have no valid outgoing transitions', () => {
      const terminalStatuses = [OrderStatus.NOTIFIED, OrderStatus.CANCELLED];

      fc.assert(
        fc.property(
          fc.constantFrom(...terminalStatuses),
          fc.constantFrom(...ALL_STATUSES),
          (from, to) => {
            expect(service.canTransition(from, to)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('getValidTransitions returns exactly the set of valid targets for any status', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_STATUSES),
          (status) => {
            const validTargets = service.getValidTransitions(status);

            // Every target returned by getValidTransitions must be in VALID_TRANSITIONS
            for (const target of validTargets) {
              const key = `${status}->${target}`;
              expect(VALID_TRANSITIONS.has(key)).toBe(true);
            }

            // Every valid transition from this status must appear in the result
            for (const target of ALL_STATUSES) {
              const key = `${status}->${target}`;
              if (VALID_TRANSITIONS.has(key)) {
                expect(validTargets).toContain(target);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
