// Feature: lis-gap-remediation, Property 6: Per-parameter verification completeness

import * as fc from 'fast-check';
import { OrderStatus, OrderDetailStatus } from '@prisma/client';
import { VerificationService } from '../verification.service';
import { NotFoundException } from '@nestjs/common';

/**
 * **Validates: Requirements 4.1, 4.3**
 *
 * Property 6: Per-parameter verification completeness
 *
 * For any Order with N OrderDetails, the Order SHALL only transition to VERIFIED
 * status when exactly N OrderDetails have status VERIFIED. If any OrderDetail is
 * not VERIFIED, the Order remains in IN_ANALYSIS.
 */
describe('Property 6: Per-parameter verification completeness', () => {
  /**
   * Arbitrary for generating a list of OrderDetail statuses.
   * Uses the real OrderDetailStatus enum values from Prisma.
   */
  const orderDetailStatusArb = fc.constantFrom(
    OrderDetailStatus.PENDING,
    OrderDetailStatus.RESULT_ENTERED,
    OrderDetailStatus.VERIFIED,
    OrderDetailStatus.APPROVED,
  );

  /**
   * Arbitrary for generating a non-empty array of OrderDetail statuses
   * representing N order details in an order.
   */
  const orderDetailStatusesArb = fc.array(orderDetailStatusArb, {
    minLength: 1,
    maxLength: 50,
  });

  /**
   * Helper: creates a mock VerificationService with the given order details statuses.
   * The order is set to IN_ANALYSIS status (the precondition for verification transition).
   */
  function createServiceWithOrderDetails(
    statuses: OrderDetailStatus[],
    orderStatus: OrderStatus = OrderStatus.IN_ANALYSIS,
  ): { service: VerificationService; transitioned: boolean[] } {
    const orderId = 'order-test-id';
    const transitioned = [false]; // track if transition was called

    const orderDetails = statuses.map((status, index) => ({
      id: `detail-${index}`,
      orderId,
      testId: `test-${index}`,
      status,
      resultValue: status !== OrderDetailStatus.PENDING ? '42' : null,
      flag: null,
      verifiedAt:
        status === OrderDetailStatus.VERIFIED ? new Date() : null,
      verifiedBy:
        status === OrderDetailStatus.VERIFIED ? 'user-verifier' : null,
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
      rerunCount: 0,
      rerunReason: null,
      previousResults: null,
      resultEnteredAt: null,
      resultEnteredBy: null,
    }));

    const mockPrisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: orderId,
          status: orderStatus,
          orderDetails,
        }),
      },
      orderDetail: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    const mockQCService = {
      isQCValid: jest.fn().mockResolvedValue(true),
    } as any;

    const mockOrderStateMachine = {
      transition: jest.fn().mockImplementation(() => {
        transitioned[0] = true;
        return Promise.resolve(undefined);
      }),
    } as any;

    const service = new VerificationService(
      mockPrisma,
      mockAuditService,
      mockQCService,
      mockOrderStateMachine,
    );

    return { service, transitioned };
  }

  it('returns true and transitions to VERIFIED only when ALL OrderDetails are VERIFIED', async () => {
    await fc.assert(
      fc.asyncProperty(orderDetailStatusesArb, async (statuses) => {
        const { service, transitioned } =
          createServiceWithOrderDetails(statuses);

        const allVerified = statuses.every(
          (s) => s === OrderDetailStatus.VERIFIED,
        );

        const result =
          await service.checkOrderVerificationComplete('order-test-id');

        if (allVerified) {
          // When ALL details are VERIFIED, order transitions to VERIFIED
          expect(result).toBe(true);
          expect(transitioned[0]).toBe(true);
        } else {
          // When ANY detail is not VERIFIED, order stays in IN_ANALYSIS
          expect(result).toBe(false);
          expect(transitioned[0]).toBe(false);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('returns false when order is not in IN_ANALYSIS status, regardless of detail statuses', async () => {
    const nonAnalysisStatusArb = fc.constantFrom(
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.SAMPLE_COLLECTED,
      OrderStatus.VERIFIED,
      OrderStatus.APPROVED,
      OrderStatus.NOTIFIED,
      OrderStatus.CANCELLED,
    );

    await fc.assert(
      fc.asyncProperty(
        orderDetailStatusesArb,
        nonAnalysisStatusArb,
        async (statuses, orderStatus) => {
          const { service, transitioned } = createServiceWithOrderDetails(
            statuses,
            orderStatus,
          );

          const result =
            await service.checkOrderVerificationComplete('order-test-id');

          // Should never transition when order is not IN_ANALYSIS
          expect(result).toBe(false);
          expect(transitioned[0]).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('a single non-VERIFIED detail among N VERIFIED details prevents transition', async () => {
    // Generate arrays where exactly one detail is NOT verified
    const nonVerifiedStatusArb = fc.constantFrom(
      OrderDetailStatus.PENDING,
      OrderDetailStatus.RESULT_ENTERED,
      OrderDetailStatus.APPROVED,
    );

    const positionAndCountArb = fc
      .nat({ max: 49 })
      .chain((totalMinusOne) => {
        const total = totalMinusOne + 2; // at least 2 details (one verified, one not)
        return fc.tuple(
          fc.constant(total),
          fc.nat({ max: total - 1 }), // position of the non-verified detail
        );
      });

    await fc.assert(
      fc.asyncProperty(
        positionAndCountArb,
        nonVerifiedStatusArb,
        async ([total, position], nonVerifiedStatus) => {
          // Create all VERIFIED statuses, then insert one non-verified
          const statuses: OrderDetailStatus[] = Array(total).fill(
            OrderDetailStatus.VERIFIED,
          );
          statuses[position] = nonVerifiedStatus;

          const { service, transitioned } =
            createServiceWithOrderDetails(statuses);

          const result =
            await service.checkOrderVerificationComplete('order-test-id');

          // Must NOT transition to VERIFIED
          expect(result).toBe(false);
          expect(transitioned[0]).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('exactly N VERIFIED details for an order with N details causes transition', async () => {
    // Generate various counts of order details, all VERIFIED
    const countArb = fc.integer({ min: 1, max: 50 });

    await fc.assert(
      fc.asyncProperty(countArb, async (count) => {
        const statuses: OrderDetailStatus[] = Array(count).fill(
          OrderDetailStatus.VERIFIED,
        );

        const { service, transitioned } =
          createServiceWithOrderDetails(statuses);

        const result =
          await service.checkOrderVerificationComplete('order-test-id');

        // All N details are VERIFIED, so order MUST transition
        expect(result).toBe(true);
        expect(transitioned[0]).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
