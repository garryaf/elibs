// Feature: laboratory-workflow-refactor, Properties 1, 6

import * as fc from 'fast-check';
import { VisitStatus, OrderStatus } from '@prisma/client';
import { OrderService } from '../order.service';
import { OrderValidationGuard } from '../order-validation.guard';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Arbitrary that generates valid UUID v4 strings.
 */
const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

/**
 * Arbitrary for acceptable visit statuses (valid for order creation).
 */
const acceptableVisitStatusArb = fc.constantFrom(
  VisitStatus.REGISTERED,
  VisitStatus.IN_PROGRESS,
);

describe('Order Creation Property Tests', () => {
  let orderService: OrderService;
  let mockPrisma: any;
  let mockTariffResolver: any;
  let mockVisitService: any;
  let mockOrderValidationGuard: any;

  beforeEach(() => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      testMaster: { findMany: jest.fn() },
      order: {
        create: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      orderDetail: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };

    mockTariffResolver = {
      resolveOrderTotal: jest.fn(),
    };

    mockVisitService = {
      transitionToInProgress: jest.fn(),
    };

    mockOrderValidationGuard = {
      validate: jest.fn(),
    };

    orderService = new OrderService(
      mockPrisma,
      mockTariffResolver,
      mockVisitService,
      mockOrderValidationGuard,
    );
  });

  /**
   * Property 1: Order Creation Persists Non-Null Visit Reference
   *
   * *For any* valid CreateOrderDto containing a visitId that references an existing
   * Visit in REGISTERED or IN_PROGRESS status with a matching patientId, the created
   * Order record SHALL have a non-null visitId field equal to the provided value.
   *
   * **Validates: Requirements 1.1, 1.5**
   */
  describe('Property 1: Order Creation Persists Non-Null Visit Reference', () => {
    it('should persist visitId as non-null and equal to dto.visitId for any valid order creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          fc.array(validUuidV4Arb, { minLength: 1, maxLength: 5 }), // testIds
          acceptableVisitStatusArb, // visit status
          async (visitId, patientId, testIds, visitStatus) => {
            // Ensure unique testIds
            const uniqueTestIds = [...new Set(testIds)];
            if (uniqueTestIds.length === 0) return;

            // Track the data passed to order.create inside the transaction
            let capturedOrderData: any = null;

            // Mock: validation guard passes
            mockOrderValidationGuard.validate.mockResolvedValue(undefined);

            // Mock: patient exists
            mockPrisma.patient.findFirst.mockResolvedValue({
              id: patientId,
              name: 'Test Patient',
            });

            // Mock: all tests exist and are active
            const mockTests = uniqueTestIds.map((id) => ({
              id,
              name: `Test-${id.slice(0, 8)}`,
              isActive: true,
              deletedAt: null,
            }));
            mockPrisma.testMaster.findMany.mockResolvedValue(mockTests);

            // Mock: order count for number generation
            mockPrisma.order.count.mockResolvedValue(0);

            // Mock: tariff resolver returns pricing
            mockTariffResolver.resolveOrderTotal.mockResolvedValue({
              items: uniqueTestIds.map((testId) => ({
                testId,
                tariff: {
                  basePrice: 100,
                  discount: 0,
                  finalPrice: 100,
                  tariffId: null,
                  resolution: 'FALLBACK',
                },
              })),
              subtotal: uniqueTestIds.length * 100,
              totalDiscount: 0,
              totalAmount: uniqueTestIds.length * 100,
            });

            // Mock: $transaction executes the callback and captures order.create args
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
              const txProxy = {
                order: {
                  create: jest.fn().mockImplementation((args: any) => {
                    capturedOrderData = args.data;
                    return {
                      id: 'created-order-id',
                      ...args.data,
                    };
                  }),
                },
                orderDetail: {
                  createMany: jest.fn().mockResolvedValue({ count: uniqueTestIds.length }),
                },
              };
              return callback(txProxy);
            });

            // Mock: visitService.transitionToInProgress resolves
            mockVisitService.transitionToInProgress.mockResolvedValue(undefined);

            // Mock: final findUnique returns the created order
            mockPrisma.order.findUnique.mockResolvedValue({
              id: 'created-order-id',
              visitId,
              patientId,
              status: OrderStatus.PENDING_PAYMENT,
              orderDetails: [],
              patient: { id: patientId, name: 'Test Patient' },
              visit: { visitNumber: 'VST-202601-0001', status: visitStatus },
            });

            const dto = {
              visitId,
              patientId,
              testIds: uniqueTestIds,
            };

            await orderService.create(dto, 'user-id');

            // ASSERT: order was created with non-null visitId equal to dto.visitId
            expect(capturedOrderData).not.toBeNull();
            expect(capturedOrderData.visitId).toBe(visitId);
            expect(capturedOrderData.visitId).not.toBeNull();
            expect(capturedOrderData.visitId).not.toBeUndefined();

            // Reset mocks for next iteration
            jest.clearAllMocks();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Visit Transitions to IN_PROGRESS on Order Creation (Idempotent)
   *
   * *For any* Visit in REGISTERED or IN_PROGRESS status, after a successful order
   * creation under that visit, the Visit's status SHALL be IN_PROGRESS. If the Visit
   * was already IN_PROGRESS, the status SHALL remain IN_PROGRESS (idempotent).
   *
   * This property verifies that visitService.transitionToInProgress is called
   * unconditionally with dto.visitId after successful order creation, regardless
   * of whether the visit was in REGISTERED or IN_PROGRESS status.
   *
   * **Validates: Requirements 1.6**
   */
  describe('Property 6: Visit Transitions to IN_PROGRESS on Order Creation (Idempotent)', () => {
    it('should call transitionToInProgress with dto.visitId unconditionally after order creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          fc.array(validUuidV4Arb, { minLength: 1, maxLength: 3 }), // testIds
          acceptableVisitStatusArb, // visit status (REGISTERED or IN_PROGRESS)
          async (visitId, patientId, testIds, visitStatus) => {
            const uniqueTestIds = [...new Set(testIds)];
            if (uniqueTestIds.length === 0) return;

            // Mock: validation guard passes
            mockOrderValidationGuard.validate.mockResolvedValue(undefined);

            // Mock: patient exists
            mockPrisma.patient.findFirst.mockResolvedValue({
              id: patientId,
              name: 'Test Patient',
            });

            // Mock: tests exist
            const mockTests = uniqueTestIds.map((id) => ({
              id,
              name: `Test-${id.slice(0, 8)}`,
              isActive: true,
              deletedAt: null,
            }));
            mockPrisma.testMaster.findMany.mockResolvedValue(mockTests);

            // Mock: order count
            mockPrisma.order.count.mockResolvedValue(0);

            // Mock: tariff resolver
            mockTariffResolver.resolveOrderTotal.mockResolvedValue({
              items: uniqueTestIds.map((testId) => ({
                testId,
                tariff: {
                  basePrice: 50,
                  discount: 0,
                  finalPrice: 50,
                  tariffId: null,
                  resolution: 'FALLBACK',
                },
              })),
              subtotal: uniqueTestIds.length * 50,
              totalDiscount: 0,
              totalAmount: uniqueTestIds.length * 50,
            });

            // Mock: transaction
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
              const txProxy = {
                order: {
                  create: jest.fn().mockResolvedValue({
                    id: 'order-id',
                    visitId,
                    patientId,
                    status: OrderStatus.PENDING_PAYMENT,
                  }),
                },
                orderDetail: {
                  createMany: jest.fn().mockResolvedValue({ count: uniqueTestIds.length }),
                },
              };
              return callback(txProxy);
            });

            // Mock: transitionToInProgress resolves (idempotent behavior)
            mockVisitService.transitionToInProgress.mockResolvedValue(undefined);

            // Mock: final findUnique
            mockPrisma.order.findUnique.mockResolvedValue({
              id: 'order-id',
              visitId,
              patientId,
              status: OrderStatus.PENDING_PAYMENT,
              orderDetails: [],
              patient: { id: patientId, name: 'Test Patient' },
              visit: { visitNumber: 'VST-202601-0001', status: VisitStatus.IN_PROGRESS },
            });

            const dto = {
              visitId,
              patientId,
              testIds: uniqueTestIds,
            };

            await orderService.create(dto, 'user-id');

            // ASSERT: transitionToInProgress was called with the visitId
            // regardless of whether visit was REGISTERED or IN_PROGRESS
            expect(mockVisitService.transitionToInProgress).toHaveBeenCalledTimes(1);
            expect(mockVisitService.transitionToInProgress).toHaveBeenCalledWith(visitId);

            // Reset mocks for next iteration
            jest.clearAllMocks();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
