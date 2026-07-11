// Feature: sprint-next1-critical-security, Property 8: Clinical notes round-trip persistence

import * as fc from 'fast-check';
import { OrderStatus } from '@prisma/client';
import { OrderService } from '../order.service';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

/**
 * Arbitrary that generates notes values including:
 * - null (via fc.constant(null))
 * - undefined (via fc.constant(undefined))
 * - empty string
 * - ASCII strings
 * - unicode strings (grapheme clusters)
 * - strings up to max length (2000)
 */
const notesArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.string({ maxLength: 2000 }),
  fc.string({ maxLength: 2000, unit: 'grapheme' }),
);

describe('Order Notes Property Tests', () => {
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
   * Property 8: Clinical notes round-trip persistence
   *
   * *For any* valid notes string (including null/undefined), creating an order
   * with that notes value and then retrieving the order SHALL return the same
   * notes value. If notes is not provided, the persisted value SHALL be null.
   *
   * **Validates: Requirements 7.4, 7.5**
   */
  describe('Property 8: Clinical notes round-trip persistence', () => {
    it('should persist notes value on create and return same value on findById', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          fc.array(validUuidV4Arb, { minLength: 1, maxLength: 3 }), // testIds
          notesArb, // notes value (null, undefined, empty, unicode, max length)
          async (visitId, patientId, testIds, notes) => {
            const uniqueTestIds = [...new Set(testIds)];
            if (uniqueTestIds.length === 0) return;

            // Track the data passed to order.create
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
              requiresInsurancePreAuth: false,
            }));
            mockPrisma.testMaster.findMany.mockResolvedValue(mockTests);

            // Mock: order count for number generation
            mockPrisma.order.count.mockResolvedValue(0);

            // Mock: tariff resolver
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

            // The expected persisted value: undefined and null both become null
            const expectedPersistedNotes = notes ?? null;

            // Mock: $transaction captures create args and simulates persistence
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

            // Mock: visitService transition
            mockVisitService.transitionToInProgress.mockResolvedValue(undefined);

            // Mock: findUnique returns the persisted order (simulates round-trip retrieval)
            mockPrisma.order.findUnique.mockImplementation(() => ({
              id: 'created-order-id',
              visitId,
              patientId,
              status: OrderStatus.PENDING_PAYMENT,
              notes: capturedOrderData?.notes ?? null,
              orderDetails: [],
              patient: { id: patientId, name: 'Test Patient' },
              visit: { visitNumber: 'VST-202601-0001', status: 'IN_PROGRESS' },
            }));

            // Build the DTO
            const dto: any = {
              visitId,
              patientId,
              testIds: uniqueTestIds,
            };
            // Only include notes in dto if it's not undefined (simulating "not provided")
            if (notes !== undefined) {
              dto.notes = notes;
            }

            const result = await orderService.create(dto, 'user-id');

            // ASSERT: The persisted notes value matches expectations
            // If notes is undefined (not provided) or null, persisted value should be null
            // Otherwise, the persisted value should be the exact notes string
            expect(capturedOrderData).not.toBeNull();
            expect(capturedOrderData.notes).toBe(expectedPersistedNotes);

            // ASSERT: findById (simulated via findUnique mock) returns the same value
            expect(result!.notes).toBe(expectedPersistedNotes);

            // Reset mocks for next iteration
            jest.clearAllMocks();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
