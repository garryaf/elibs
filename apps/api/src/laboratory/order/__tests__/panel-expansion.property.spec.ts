// Property 13: Panel expansion correctness
// When an order is created with panelIds, each panel SHALL expand into its constituent tests.
// The final testIds list SHALL contain all panel tests merged with directly specified testIds with no duplicates.
//
// **Validates: Requirements 10.1**

import * as fc from 'fast-check';
import { OrderService } from '../order.service';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

/**
 * Generates a mapping of panelId -> testIds (constituent tests for each panel).
 * Uses between 1 and 4 panels, each containing 1 to 5 tests.
 */
function panelMappingArb() {
  return fc
    .array(
      fc.tuple(
        validUuidV4Arb, // panelId
        fc.array(validUuidV4Arb, { minLength: 1, maxLength: 5 }), // constituent testIds
      ),
      { minLength: 1, maxLength: 4 },
    )
    .map((entries) => {
      // Ensure panel IDs are unique
      const seen = new Set<string>();
      const uniqueEntries: Array<[string, string[]]> = [];
      for (const [panelId, testIds] of entries) {
        if (!seen.has(panelId)) {
          seen.add(panelId);
          uniqueEntries.push([panelId, [...new Set(testIds)]]);
        }
      }
      return new Map(uniqueEntries);
    })
    .filter((m) => m.size > 0);
}

describe('Panel Expansion Property Tests', () => {
  let orderService: OrderService;
  let mockPrisma: any;
  let mockTariffResolver: any;
  let mockVisitService: any;
  let mockOrderValidationGuard: any;
  let mockOrderSequenceService: any;

  beforeEach(() => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      visit: { findUnique: jest.fn() },
      panel: { findMany: jest.fn() },
      panelTest: { findMany: jest.fn() },
      testMaster: { findMany: jest.fn() },
      order: {
        create: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      orderDetail: { createMany: jest.fn() },
      orderInsurance: { create: jest.fn() },
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

    mockOrderSequenceService = {
      generateOrderNumber: jest.fn().mockResolvedValue('LAB-202507-0001'),
    };

    orderService = new OrderService(
      mockPrisma,
      mockTariffResolver,
      mockVisitService,
      mockOrderValidationGuard,
      { validateVisitInsurance: jest.fn() } as any, // consolidationService
      { transition: jest.fn(), canTransition: jest.fn(), getValidTransitions: jest.fn().mockReturnValue([]) } as any, // orderStateMachine
      mockOrderSequenceService,
      { verifyBpjs: jest.fn() } as any, // bpjsApiService
    );
  });

  /**
   * Property 13: Panel expansion correctness
   *
   * *For any* set of directly specified testIds and panelIds with their constituent tests,
   * the final expanded testIds list SHALL:
   * 1. Be the set union (no duplicates) of directly specified testIds and all panel constituent tests
   * 2. Include every test from every expanded panel
   * 3. Include every directly specified test
   *
   * **Validates: Requirements 10.1**
   */
  describe('Property 13: Panel expansion correctness', () => {
    it('expanded order details should be the union of direct testIds and panel constituent tests with no duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          fc.array(validUuidV4Arb, { minLength: 0, maxLength: 5 }), // directTestIds
          panelMappingArb(), // panelMapping: Map<panelId, testId[]>
          async (visitId, patientId, directTestIds, panelMapping) => {
            const panelIds = [...panelMapping.keys()];
            const uniqueDirectTestIds = [...new Set(directTestIds)];

            // Compute the expected expanded set: union of direct tests and all panel constituent tests
            const allPanelTestIds = [...panelMapping.values()].flat();
            const expectedTestIds = new Set([...uniqueDirectTestIds, ...allPanelTestIds]);

            // Skip if both are empty (order needs at least one test)
            if (expectedTestIds.size === 0) return;

            // Track what OrderDetails are created
            let capturedOrderDetails: any[] = [];

            // Mock: validation guard passes
            mockOrderValidationGuard.validate.mockResolvedValue(undefined);

            // Mock: patient exists
            mockPrisma.patient.findFirst.mockResolvedValue({
              id: patientId,
              name: 'Test Patient',
            });

            // Mock: visit exists with CASH payment
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              patientId,
              paymentMethod: 'CASH',
              insuranceId: null,
            });

            // Mock: panels exist and are active
            mockPrisma.panel.findMany.mockResolvedValue(
              panelIds.map((id) => ({
                id,
                name: `Panel-${id.slice(0, 8)}`,
                isActive: true,
                deletedAt: null,
              })),
            );

            // Mock: panelTest junction returns constituent tests for each panel
            const panelTestRecords = [...panelMapping.entries()].flatMap(
              ([panelId, testIds]) =>
                testIds.map((testId) => ({ panelId, testId })),
            );
            mockPrisma.panelTest.findMany.mockResolvedValue(panelTestRecords);

            // Mock: all tests exist and are active
            const allExpectedTestIds = [...expectedTestIds];
            mockPrisma.testMaster.findMany.mockResolvedValue(
              allExpectedTestIds.map((id) => ({
                id,
                name: `Test-${id.slice(0, 8)}`,
                isActive: true,
                deletedAt: null,
                requiresInsurancePreAuth: false,
              })),
            );

            // Mock: tariff resolver returns pricing for all tests
            mockTariffResolver.resolveOrderTotal.mockResolvedValue({
              items: allExpectedTestIds.map((testId) => ({
                testId,
                tariff: {
                  basePrice: 100,
                  discount: 0,
                  finalPrice: 100,
                  tariffId: null,
                  resolution: 'FALLBACK',
                },
              })),
              subtotal: allExpectedTestIds.length * 100,
              totalDiscount: 0,
              totalAmount: allExpectedTestIds.length * 100,
            });

            // Mock: $transaction captures created order details
            mockPrisma.$transaction.mockImplementation(async (callback: any) => {
              const txProxy = {
                order: {
                  create: jest.fn().mockImplementation((args: any) => ({
                    id: 'created-order-id',
                    ...args.data,
                  })),
                },
                orderDetail: {
                  createMany: jest.fn().mockImplementation((args: any) => {
                    capturedOrderDetails = args.data;
                    return { count: args.data.length };
                  }),
                },
                orderInsurance: {
                  create: jest.fn().mockResolvedValue({}),
                },
              };
              return callback(txProxy);
            });

            // Mock: visitService transition
            mockVisitService.transitionToInProgress.mockResolvedValue(undefined);

            // Mock: findUnique returns the created order
            mockPrisma.order.findUnique.mockResolvedValue({
              id: 'created-order-id',
              visitId,
              patientId,
              status: 'PENDING_PAYMENT',
              orderDetails: capturedOrderDetails,
              patient: { id: patientId, name: 'Test Patient' },
              visit: { visitNumber: 'VST-202601-0001', status: 'IN_PROGRESS' },
            });

            // Build the DTO
            const dto: any = {
              visitId,
              patientId,
              testIds: uniqueDirectTestIds.length > 0 ? uniqueDirectTestIds : undefined,
              panelIds,
            };

            await orderService.create(dto, 'user-id');

            // ASSERT 1: The number of created OrderDetails equals the size of the expected union set (no duplicates)
            const createdTestIds = capturedOrderDetails.map((d: any) => d.testId);
            const createdTestIdSet = new Set(createdTestIds);

            expect(createdTestIdSet.size).toBe(expectedTestIds.size);

            // ASSERT 2: No duplicates — array length equals set size
            expect(createdTestIds.length).toBe(createdTestIdSet.size);

            // ASSERT 3: All panel constituent tests are included
            for (const [, panelTestIds] of panelMapping) {
              for (const testId of panelTestIds) {
                expect(createdTestIdSet.has(testId)).toBe(true);
              }
            }

            // ASSERT 4: All directly specified tests are included
            for (const testId of uniqueDirectTestIds) {
              expect(createdTestIdSet.has(testId)).toBe(true);
            }

            // Reset mocks for next iteration
            jest.clearAllMocks();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
