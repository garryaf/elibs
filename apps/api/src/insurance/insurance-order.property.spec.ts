// Feature: insurance-source-consolidation, Properties 5, 12, 13

import * as fc from 'fast-check';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { OrderService } from '../laboratory/order/order.service';

/**
 * **Validates: Requirements 2.1, 2.2, 4.1, 4.2, 4.3, 4.4**
 *
 * Property 5: Order creation creates junction PRIMARY, not legacy FK
 * Property 12: Order insurance defaults from visit with validated overrides
 * Property 13: Secondary insurance accepts any active enrollment
 */
describe('Order Insurance Property Tests', () => {
  let orderService: OrderService;
  let mockPrisma: any;
  let mockTariffResolver: any;
  let mockVisitService: any;
  let mockOrderValidationGuard: any;
  let mockConsolidationService: any;

  // Track calls inside the transaction proxy
  let txOrderCreateCalls: any[];
  let txOrderInsuranceCreateCalls: any[];

  const UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // --- Arbitraries ---
  const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

  const insurancePaymentMethodArb = fc.constantFrom(
    PaymentMethod.INSURANCE,
    PaymentMethod.BPJS,
  );

  beforeEach(() => {
    txOrderCreateCalls = [];
    txOrderInsuranceCreateCalls = [];

    mockPrisma = {
      patient: { findFirst: jest.fn() },
      visit: { findUnique: jest.fn() },
      testMaster: { findMany: jest.fn() },
      order: {
        create: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      orderDetail: { createMany: jest.fn() },
      orderInsurance: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      insurance: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };

    mockTariffResolver = {
      resolveOrderTotal: jest.fn(),
    };

    mockVisitService = {
      transitionToInProgress: jest.fn().mockResolvedValue(undefined),
    };

    mockOrderValidationGuard = {
      validate: jest.fn().mockResolvedValue(undefined),
    };

    mockConsolidationService = {
      validateVisitInsurance: jest.fn().mockResolvedValue(undefined),
      getActiveInsurances: jest.fn().mockResolvedValue([]),
    };

    const mockOrderStateMachine = {
      transition: jest.fn(),
      canTransition: jest.fn(),
      getValidTransitions: jest.fn().mockReturnValue([]),
    };

    orderService = new OrderService(
      mockPrisma,
      mockTariffResolver,
      mockVisitService,
      mockOrderValidationGuard,
      mockConsolidationService,
      mockOrderStateMachine as any,
    );
  });

  /**
   * Helper: sets up standard mocks for order creation with insurance payment.
   */
  function setupOrderCreationMocks(params: {
    visitId: string;
    patientId: string;
    testIds: string[];
    visitInsuranceId: string | null;
    paymentMethod: PaymentMethod;
  }) {
    const { visitId, patientId, testIds, visitInsuranceId, paymentMethod } = params;

    // Mock: patient exists
    mockPrisma.patient.findFirst.mockResolvedValue({
      id: patientId,
      name: 'Test Patient',
      deletedAt: null,
    });

    // Mock: visit exists with given payment method and insurance
    mockPrisma.visit.findUnique.mockResolvedValue({
      id: visitId,
      patientId,
      paymentMethod,
      insuranceId: visitInsuranceId,
      status: 'REGISTERED',
    });

    // Mock: all tests exist and are active
    const mockTests = testIds.map((id) => ({
      id,
      name: `Test-${id.slice(0, 8)}`,
      isActive: true,
      deletedAt: null,
      requiresInsurancePreAuth: false,
      price: 100,
    }));
    mockPrisma.testMaster.findMany.mockResolvedValue(mockTests);

    // Mock: order count for number generation
    mockPrisma.order.count.mockResolvedValue(0);

    // Mock: tariff resolver returns pricing
    mockTariffResolver.resolveOrderTotal.mockResolvedValue({
      items: testIds.map((testId) => ({
        testId,
        tariff: {
          basePrice: 100,
          discount: 0,
          finalPrice: 100,
          tariffId: null,
          resolution: 'FALLBACK',
        },
      })),
      subtotal: testIds.length * 100,
      totalDiscount: 0,
      totalAmount: testIds.length * 100,
    });

    // Mock: $transaction captures the callback execution
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      const txProxy = {
        order: {
          create: jest.fn().mockImplementation((args: any) => {
            txOrderCreateCalls.push(args);
            return { id: 'created-order-id', ...args.data };
          }),
        },
        orderDetail: {
          createMany: jest.fn().mockResolvedValue({ count: testIds.length }),
        },
        orderInsurance: {
          create: jest.fn().mockImplementation((args: any) => {
            txOrderInsuranceCreateCalls.push(args);
            return { id: 'oi-id', ...args.data };
          }),
        },
      };
      return callback(txProxy);
    });

    // Mock: final findUnique returns the created order
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'created-order-id',
      visitId,
      patientId,
      status: OrderStatus.PENDING_PAYMENT,
      orderDetails: [],
      patient: { id: patientId, name: 'Test Patient' },
      visit: { visitNumber: 'VST-202601-0001', status: 'REGISTERED' },
    });
  }

  // --- Property 5: Order creation creates junction PRIMARY, not legacy FK ---

  describe('Property 5: Order creation creates junction PRIMARY, not legacy FK', () => {
    /**
     * For any order creation with insurance payment:
     * - OrderInsurance junction record is created with coverageType=PRIMARY
     * - Order.insuranceId is NOT set in the create data (verify the data arg to tx.order.create)
     *
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should create OrderInsurance PRIMARY junction and NOT set Order.insuranceId for insurance payments', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          validUuidV4Arb, // insuranceId (on the visit)
          fc.array(validUuidV4Arb, { minLength: 1, maxLength: 3 }), // testIds
          insurancePaymentMethodArb, // paymentMethod
          async (visitId, patientId, visitInsuranceId, testIds, paymentMethod) => {
            const uniqueTestIds = [...new Set(testIds)];
            if (uniqueTestIds.length === 0) return;

            // Reset tracking
            txOrderCreateCalls = [];
            txOrderInsuranceCreateCalls = [];
            jest.clearAllMocks();

            setupOrderCreationMocks({
              visitId,
              patientId,
              testIds: uniqueTestIds,
              visitInsuranceId,
              paymentMethod,
            });

            const dto = {
              visitId,
              patientId,
              testIds: uniqueTestIds,
              // No dto.insuranceId override — defaults from visit
            };

            await orderService.create(dto, 'user-id');

            // ASSERTION 1: Order.insuranceId is NOT set in the create data
            expect(txOrderCreateCalls.length).toBe(1);
            const orderCreateData = txOrderCreateCalls[0].data;
            expect(orderCreateData).not.toHaveProperty('insuranceId');

            // ASSERTION 2: OrderInsurance junction record is created
            expect(txOrderInsuranceCreateCalls.length).toBe(1);

            // ASSERTION 3: Junction record has coverageType=PRIMARY
            const oiData = txOrderInsuranceCreateCalls[0].data;
            expect(oiData.coverageType).toBe('PRIMARY');
            expect(oiData.insuranceId).toBe(visitInsuranceId);
            expect(oiData.claimStatus).toBe('PENDING');
            expect(oiData.orderId).toBe('created-order-id');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 12: Order insurance defaults from visit with validated overrides ---

  describe('Property 12: Order insurance defaults from visit with validated overrides', () => {
    /**
     * For any order created within a visit that has a non-null insuranceId:
     * - The OrderInsurance PRIMARY defaults to the visit's insuranceId
     *
     * **Validates: Requirements 4.1, 4.2, 4.3**
     */
    it('should default OrderInsurance PRIMARY to visit insuranceId when no override specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          validUuidV4Arb, // visit insuranceId
          fc.array(validUuidV4Arb, { minLength: 1, maxLength: 3 }), // testIds
          insurancePaymentMethodArb,
          async (visitId, patientId, visitInsuranceId, testIds, paymentMethod) => {
            const uniqueTestIds = [...new Set(testIds)];
            if (uniqueTestIds.length === 0) return;

            txOrderCreateCalls = [];
            txOrderInsuranceCreateCalls = [];
            jest.clearAllMocks();

            setupOrderCreationMocks({
              visitId,
              patientId,
              testIds: uniqueTestIds,
              visitInsuranceId,
              paymentMethod,
            });

            // No override — use visit's insurance as default
            const dto = {
              visitId,
              patientId,
              testIds: uniqueTestIds,
            };

            await orderService.create(dto, 'user-id');

            // ASSERTION: OrderInsurance PRIMARY uses visit's insuranceId
            expect(txOrderInsuranceCreateCalls.length).toBe(1);
            const oiData = txOrderInsuranceCreateCalls[0].data;
            expect(oiData.insuranceId).toBe(visitInsuranceId);
            expect(oiData.coverageType).toBe('PRIMARY');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When an override insuranceId is specified that differs from visit's insurance,
     * it is validated against patient enrollments via validateVisitInsurance.
     * If validation passes, the override becomes the OrderInsurance PRIMARY.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('should validate override insuranceId against patient enrollments and use it as PRIMARY', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // visitId
          validUuidV4Arb, // patientId
          validUuidV4Arb, // visit insuranceId
          validUuidV4Arb, // override insuranceId (different from visit's)
          fc.array(validUuidV4Arb, { minLength: 1, maxLength: 3 }), // testIds
          insurancePaymentMethodArb,
          async (visitId, patientId, visitInsuranceId, overrideInsuranceId, testIds, paymentMethod) => {
            // Ensure override differs from visit insurance to trigger validation
            if (overrideInsuranceId === visitInsuranceId) return;

            const uniqueTestIds = [...new Set(testIds)];
            if (uniqueTestIds.length === 0) return;

            txOrderCreateCalls = [];
            txOrderInsuranceCreateCalls = [];
            jest.clearAllMocks();

            setupOrderCreationMocks({
              visitId,
              patientId,
              testIds: uniqueTestIds,
              visitInsuranceId,
              paymentMethod,
            });

            // consolidationService.validateVisitInsurance passes (insurance is valid)
            mockConsolidationService.validateVisitInsurance.mockResolvedValue(undefined);

            // DTO with override
            const dto = {
              visitId,
              patientId,
              testIds: uniqueTestIds,
              insuranceId: overrideInsuranceId,
            };

            await orderService.create(dto, 'user-id');

            // ASSERTION 1: validateVisitInsurance was called with the override
            expect(mockConsolidationService.validateVisitInsurance).toHaveBeenCalledWith(
              patientId,
              overrideInsuranceId,
            );

            // ASSERTION 2: OrderInsurance PRIMARY uses the override insuranceId
            expect(txOrderInsuranceCreateCalls.length).toBe(1);
            const oiData = txOrderInsuranceCreateCalls[0].data;
            expect(oiData.insuranceId).toBe(overrideInsuranceId);
            expect(oiData.coverageType).toBe('PRIMARY');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 13: Secondary insurance accepts any active enrollment ---

  describe('Property 13: Secondary insurance accepts any active enrollment', () => {
    /**
     * For secondary insurance (OrderInsurance with coverageType=SECONDARY):
     * - Any active PatientInsurance record for the patient can be referenced.
     * - The addOrderInsurance method accepts any active insurance record.
     *
     * **Validates: Requirements 4.4**
     */
    it('should accept any active insurance for SECONDARY coverage via addOrderInsurance', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // orderId
          validUuidV4Arb, // patientId
          validUuidV4Arb, // secondary insuranceId
          async (orderId, patientId, secondaryInsuranceId) => {
            jest.clearAllMocks();

            // Mock: order exists
            mockPrisma.order.findUnique.mockResolvedValue({
              id: orderId,
              patientId,
              status: OrderStatus.PENDING_PAYMENT,
            });

            // Mock: insurance exists and is active
            mockPrisma.insurance.findFirst.mockResolvedValue({
              id: secondaryInsuranceId,
              name: 'Secondary Insurance',
              isActive: true,
              deletedAt: null,
            });

            // Mock: no existing SECONDARY coverage for this order
            mockPrisma.orderInsurance.findUnique.mockResolvedValue(null);

            // Mock: orderInsurance.create succeeds
            mockPrisma.orderInsurance.create.mockResolvedValue({
              id: 'new-oi-id',
              orderId,
              insuranceId: secondaryInsuranceId,
              coverageType: 'SECONDARY',
              claimStatus: 'PENDING',
            });

            const dto = {
              insuranceId: secondaryInsuranceId,
              coverageType: 'SECONDARY' as const,
            };

            const result = await orderService.addOrderInsurance(orderId, dto as any);

            // ASSERTION 1: OrderInsurance was created successfully
            expect(mockPrisma.orderInsurance.create).toHaveBeenCalledTimes(1);

            // ASSERTION 2: The created record is SECONDARY type
            const createCall = mockPrisma.orderInsurance.create.mock.calls[0][0];
            expect(createCall.data.coverageType).toBe('SECONDARY');
            expect(createCall.data.insuranceId).toBe(secondaryInsuranceId);
            expect(createCall.data.orderId).toBe(orderId);

            // ASSERTION 3: Result reflects the secondary insurance
            expect(result.coverageType).toBe('SECONDARY');
            expect(result.insuranceId).toBe(secondaryInsuranceId);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Secondary insurance is independent of PRIMARY selection —
     * any active insurance can be used regardless of what PRIMARY is.
     *
     * **Validates: Requirements 4.4**
     */
    it('should accept SECONDARY insurance regardless of PRIMARY selection', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb, // orderId
          validUuidV4Arb, // patientId
          validUuidV4Arb, // primary insuranceId
          validUuidV4Arb, // secondary insuranceId (may differ from primary)
          async (orderId, patientId, primaryInsuranceId, secondaryInsuranceId) => {
            jest.clearAllMocks();

            // Mock: order exists (already has a PRIMARY)
            mockPrisma.order.findUnique.mockResolvedValue({
              id: orderId,
              patientId,
              status: OrderStatus.PENDING_PAYMENT,
            });

            // Mock: the secondary insurance record is active
            mockPrisma.insurance.findFirst.mockResolvedValue({
              id: secondaryInsuranceId,
              name: 'Any Active Insurance',
              isActive: true,
              deletedAt: null,
            });

            // Mock: no existing SECONDARY for this order
            mockPrisma.orderInsurance.findUnique.mockResolvedValue(null);

            // Mock: create succeeds
            mockPrisma.orderInsurance.create.mockResolvedValue({
              id: 'oi-secondary-id',
              orderId,
              insuranceId: secondaryInsuranceId,
              coverageType: 'SECONDARY',
              claimStatus: 'PENDING',
            });

            const dto = {
              insuranceId: secondaryInsuranceId,
              coverageType: 'SECONDARY' as const,
            };

            const result = await orderService.addOrderInsurance(orderId, dto as any);

            // ASSERTION 1: Secondary was accepted
            expect(result.coverageType).toBe('SECONDARY');
            expect(result.insuranceId).toBe(secondaryInsuranceId);

            // ASSERTION 2: No validation of secondary against PRIMARY was enforced
            // (addOrderInsurance only checks insurance exists + is active, no PRIMARY coupling)
            expect(mockConsolidationService.validateVisitInsurance).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
