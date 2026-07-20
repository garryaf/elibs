// Feature: insurance-source-consolidation, Properties 20, 21

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientService } from '../laboratory/patient/patient.service';
import { OrderService } from '../laboratory/order/order.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MrnGeneratorService } from '../laboratory/patient/mrn-generator.service';
import { RegionValidationService } from '../laboratory/region/region-validation.service';
import { AuditService } from '../laboratory/audit/audit.service';
import { InsuranceConsolidationService } from './insurance-consolidation.service';

/**
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 *
 * Property 20: API response derives insuranceId from junction
 * Property 21: API response includes full junction arrays
 */
describe('API Response Insurance Derivation Property Tests', () => {
  // --- Arbitraries ---
  const uuidArb = fc.uuid().map((v) => v.toString());

  const patientInsuranceRecordArb = (patientId: string) =>
    fc.record({
      id: uuidArb,
      patientId: fc.constant(patientId),
      insuranceId: uuidArb,
      memberNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
      policyNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
      priority: fc.integer({ min: 1, max: 5 }),
      type: fc.constantFrom('BPJS', 'SWASTA', 'CORPORATE', null),
      bpjsClassLevel: fc.option(fc.integer({ min: 1, max: 3 }), { nil: null }),
      validFrom: fc.constant(null),
      validUntil: fc.constant(null),
      isActive: fc.constant(true),
      notes: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
      migrationBatchId: fc.constant(null),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
      insurance: fc.record({
        id: uuidArb,
        name: fc.string({ minLength: 3, maxLength: 30 }),
      }),
    });

  const orderInsuranceRecordArb = (orderId: string) =>
    fc.record({
      id: uuidArb,
      orderId: fc.constant(orderId),
      insuranceId: uuidArb,
      coverageType: fc.constantFrom('PRIMARY', 'SECONDARY'),
      claimStatus: fc.constantFrom('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'),
      claimAmount: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
      approvedAmount: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: null }),
      notes: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
      migrationBatchId: fc.constant(null),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
    });

  // ─── Property 20: API response derives insuranceId from junction ──────────

  describe('Property 20: API response derives insuranceId from junction', () => {
    describe('PatientService.findById — insuranceId from junction priority=1', () => {
      let patientService: PatientService;
      let mockPrisma: any;
      let mockConsolidationService: any;

      beforeEach(async () => {
        mockPrisma = {
          patient: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
          patientInsurance: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
          },
        };

        mockConsolidationService = {
          resolvePatientInsuranceId: jest.fn(),
          getActiveInsurances: jest.fn(),
          getDefaultInsurance: jest.fn(),
          validateVisitInsurance: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PatientService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: MrnGeneratorService, useValue: { generate: jest.fn() } },
            { provide: RegionValidationService, useValue: { validateHierarchy: jest.fn() } },
            { provide: AuditService, useValue: { log: jest.fn() } },
            { provide: InsuranceConsolidationService, useValue: mockConsolidationService },
          ],
        }).compile();

        patientService = module.get<PatientService>(PatientService);
      });

      /**
       * For any patient with a PatientInsurance record with priority=1,
       * the API response `insuranceId` field SHALL equal that record's insuranceId.
       *
       * **Validates: Requirements 8.1**
       */
      it('findById returns insuranceId derived from junction priority=1 record', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb, // patientId
            uuidArb, // junction insuranceId (priority=1)
            async (patientId, junctionInsuranceId) => {
              jest.clearAllMocks();

              // Mock: patient exists
              mockPrisma.patient.findFirst.mockResolvedValue({
                id: patientId,
                name: 'Test Patient',
                mrn: 'RM-001',
                deletedAt: null,
              });

              // Mock: resolvePatientInsuranceId returns the junction's insuranceId
              mockConsolidationService.resolvePatientInsuranceId.mockResolvedValue(
                junctionInsuranceId,
              );

              // Mock: getActiveInsurances returns some records
              mockConsolidationService.getActiveInsurances.mockResolvedValue([]);

              const result = await patientService.findById(patientId);

              // ASSERTION: API response insuranceId equals the junction priority=1 insuranceId
              expect(result.insuranceId).toBe(junctionInsuranceId);
            },
          ),
          { numRuns: 100 },
        );
      });

      /**
       * When no junction record exists but legacy FK is present,
       * the API response uses the legacy value (resolvePatientInsuranceId handles fallback).
       *
       * **Validates: Requirements 8.1, 8.5**
       */
      it('findById returns legacy FK value when no junction record exists', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb, // patientId
            uuidArb, // legacy insuranceId from Patient.insuranceId
            async (patientId, legacyInsuranceId) => {
              jest.clearAllMocks();

              // Mock: patient exists (has legacy insuranceId)
              mockPrisma.patient.findFirst.mockResolvedValue({
                id: patientId,
                name: 'Test Patient',
                mrn: 'RM-002',
                insuranceId: legacyInsuranceId,
                deletedAt: null,
              });

              // Mock: resolvePatientInsuranceId returns legacy value (fallback path)
              mockConsolidationService.resolvePatientInsuranceId.mockResolvedValue(
                legacyInsuranceId,
              );

              // Mock: no active insurances (no junction records)
              mockConsolidationService.getActiveInsurances.mockResolvedValue([]);

              const result = await patientService.findById(patientId);

              // ASSERTION: API response insuranceId equals the legacy FK value
              expect(result.insuranceId).toBe(legacyInsuranceId);
            },
          ),
          { numRuns: 100 },
        );
      });

      /**
       * When neither junction record nor legacy FK exists,
       * the API response insuranceId is null.
       *
       * **Validates: Requirements 8.1**
       */
      it('findById returns null insuranceId when neither junction nor legacy FK exists', async () => {
        await fc.assert(
          fc.asyncProperty(uuidArb, async (patientId) => {
            jest.clearAllMocks();

            mockPrisma.patient.findFirst.mockResolvedValue({
              id: patientId,
              name: 'Test Patient',
              mrn: 'RM-003',
              insuranceId: null,
              deletedAt: null,
            });

            // Mock: resolvePatientInsuranceId returns null (no source)
            mockConsolidationService.resolvePatientInsuranceId.mockResolvedValue(null);
            mockConsolidationService.getActiveInsurances.mockResolvedValue([]);

            const result = await patientService.findById(patientId);

            // ASSERTION: insuranceId is null
            expect(result.insuranceId).toBeNull();
          }),
          { numRuns: 100 },
        );
      });
    });

    describe('OrderService.findById — insuranceId from OrderInsurance PRIMARY', () => {
      let orderService: OrderService;
      let mockPrisma: any;

      beforeEach(() => {
        mockPrisma = {
          patient: { findFirst: jest.fn() },
          visit: { findUnique: jest.fn() },
          testMaster: { findMany: jest.fn() },
          order: {
            create: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
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

        const mockTariffResolver = { resolveOrderTotal: jest.fn() };
        const mockVisitService = { transitionToInProgress: jest.fn() };
        const mockOrderValidationGuard = { validate: jest.fn() };
        const mockConsolidationService = {
          validateVisitInsurance: jest.fn(),
          getActiveInsurances: jest.fn(),
        };

        const mockOrderStateMachine = {
          transition: jest.fn(),
          canTransition: jest.fn(),
          getValidTransitions: jest.fn().mockReturnValue([]),
        };

        orderService = new OrderService(
          mockPrisma,
          mockTariffResolver as any,
          mockVisitService as any,
          mockOrderValidationGuard as any,
          mockConsolidationService as any,
          mockOrderStateMachine as any,
        );
      });

      /**
       * For any order with an OrderInsurance PRIMARY record,
       * the API response `insuranceId` field SHALL equal that record's insuranceId.
       *
       * **Validates: Requirements 8.2**
       */
      it('findById returns insuranceId derived from OrderInsurance PRIMARY', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb, // orderId
            uuidArb, // PRIMARY junction insuranceId
            uuidArb, // legacy Order.insuranceId (should be overridden)
            async (orderId, primaryInsuranceId, legacyInsuranceId) => {
              jest.clearAllMocks();

              // Mock: order exists with orderInsurances including a PRIMARY record
              mockPrisma.order.findUnique.mockResolvedValue({
                id: orderId,
                patientId: 'patient-1',
                insuranceId: legacyInsuranceId, // legacy FK (should be overridden)
                status: 'PENDING_PAYMENT',
                patient: { id: 'patient-1', name: 'Test' },
                orderDetails: [],
                visit: { visitNumber: 'VST-001', status: 'REGISTERED' },
                orderInsurances: [
                  {
                    id: 'oi-1',
                    orderId,
                    insuranceId: primaryInsuranceId,
                    coverageType: 'PRIMARY',
                    claimStatus: 'PENDING',
                  },
                ],
              });

              const result = await orderService.findById(orderId);

              // ASSERTION: API response insuranceId equals the junction PRIMARY insuranceId
              expect(result.insuranceId).toBe(primaryInsuranceId);
            },
          ),
          { numRuns: 100 },
        );
      });

      /**
       * When no OrderInsurance PRIMARY record exists but legacy FK is present,
       * the API response uses the legacy Order.insuranceId value.
       *
       * **Validates: Requirements 8.2**
       */
      it('findById returns legacy Order.insuranceId when no PRIMARY junction exists', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb, // orderId
            uuidArb, // legacy Order.insuranceId
            async (orderId, legacyInsuranceId) => {
              jest.clearAllMocks();

              // Mock: order exists with no PRIMARY in orderInsurances
              mockPrisma.order.findUnique.mockResolvedValue({
                id: orderId,
                patientId: 'patient-1',
                insuranceId: legacyInsuranceId,
                status: 'PENDING_PAYMENT',
                patient: { id: 'patient-1', name: 'Test' },
                orderDetails: [],
                visit: { visitNumber: 'VST-001', status: 'REGISTERED' },
                orderInsurances: [], // No junction records
              });

              const result = await orderService.findById(orderId);

              // ASSERTION: Falls back to legacy FK
              expect(result.insuranceId).toBe(legacyInsuranceId);
            },
          ),
          { numRuns: 100 },
        );
      });

      /**
       * When neither OrderInsurance PRIMARY nor legacy FK exists,
       * the API response insuranceId is null.
       *
       * **Validates: Requirements 8.2**
       */
      it('findById returns null insuranceId when no PRIMARY and no legacy FK', async () => {
        await fc.assert(
          fc.asyncProperty(uuidArb, async (orderId) => {
            jest.clearAllMocks();

            mockPrisma.order.findUnique.mockResolvedValue({
              id: orderId,
              patientId: 'patient-1',
              insuranceId: null, // No legacy FK
              status: 'PENDING_PAYMENT',
              patient: { id: 'patient-1', name: 'Test' },
              orderDetails: [],
              visit: { visitNumber: 'VST-001', status: 'REGISTERED' },
              orderInsurances: [], // No junction records
            });

            const result = await orderService.findById(orderId);

            // ASSERTION: insuranceId is null
            expect(result.insuranceId).toBeNull();
          }),
          { numRuns: 100 },
        );
      });
    });
  });

  // ─── Property 21: API response includes full junction arrays ──────────────

  describe('Property 21: API response includes full junction arrays', () => {
    describe('PatientService.findById — insurances array', () => {
      let patientService: PatientService;
      let mockPrisma: any;
      let mockConsolidationService: any;

      beforeEach(async () => {
        mockPrisma = {
          patient: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
          patientInsurance: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
          },
        };

        mockConsolidationService = {
          resolvePatientInsuranceId: jest.fn(),
          getActiveInsurances: jest.fn(),
          getDefaultInsurance: jest.fn(),
          validateVisitInsurance: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            PatientService,
            { provide: PrismaService, useValue: mockPrisma },
            { provide: MrnGeneratorService, useValue: { generate: jest.fn() } },
            { provide: RegionValidationService, useValue: { validateHierarchy: jest.fn() } },
            { provide: AuditService, useValue: { log: jest.fn() } },
            { provide: InsuranceConsolidationService, useValue: mockConsolidationService },
          ],
        }).compile();

        patientService = module.get<PatientService>(PatientService);
      });

      /**
       * For any patient, the API response SHALL include an `insurances` array
       * containing all active PatientInsurance records.
       *
       * **Validates: Requirements 8.3**
       */
      it('findById includes insurances array with all active PatientInsurance records', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb,
            fc.array(patientInsuranceRecordArb('patient-fixed'), { minLength: 0, maxLength: 5 }),
            async (patientId, activeInsurances) => {
              jest.clearAllMocks();

              mockPrisma.patient.findFirst.mockResolvedValue({
                id: patientId,
                name: 'Test Patient',
                mrn: 'RM-004',
                deletedAt: null,
              });

              mockConsolidationService.resolvePatientInsuranceId.mockResolvedValue(null);
              mockConsolidationService.getActiveInsurances.mockResolvedValue(activeInsurances);

              const result = await patientService.findById(patientId);

              // ASSERTION 1: Response contains `insurances` array
              expect(result).toHaveProperty('insurances');
              expect(Array.isArray(result.insurances)).toBe(true);

              // ASSERTION 2: Array length matches active insurances
              expect(result.insurances).toHaveLength(activeInsurances.length);

              // ASSERTION 3: Each insurance record is included in the response
              for (let i = 0; i < activeInsurances.length; i++) {
                expect(result.insurances[i].insuranceId).toBe(
                  activeInsurances[i].insuranceId,
                );
              }
            },
          ),
          { numRuns: 100 },
        );
      });

      /**
       * When patient has no active insurances, the response includes an empty array.
       *
       * **Validates: Requirements 8.3**
       */
      it('findById includes empty insurances array when patient has no active insurances', async () => {
        await fc.assert(
          fc.asyncProperty(uuidArb, async (patientId) => {
            jest.clearAllMocks();

            mockPrisma.patient.findFirst.mockResolvedValue({
              id: patientId,
              name: 'Test Patient',
              mrn: 'RM-005',
              deletedAt: null,
            });

            mockConsolidationService.resolvePatientInsuranceId.mockResolvedValue(null);
            mockConsolidationService.getActiveInsurances.mockResolvedValue([]);

            const result = await patientService.findById(patientId);

            expect(result.insurances).toEqual([]);
          }),
          { numRuns: 100 },
        );
      });
    });

    describe('OrderService.findById — orderInsurances array', () => {
      let orderService: OrderService;
      let mockPrisma: any;

      beforeEach(() => {
        mockPrisma = {
          patient: { findFirst: jest.fn() },
          visit: { findUnique: jest.fn() },
          testMaster: { findMany: jest.fn() },
          order: {
            create: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
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

        const mockTariffResolver = { resolveOrderTotal: jest.fn() };
        const mockVisitService = { transitionToInProgress: jest.fn() };
        const mockOrderValidationGuard = { validate: jest.fn() };
        const mockConsolidationService = {
          validateVisitInsurance: jest.fn(),
          getActiveInsurances: jest.fn(),
        };

        const mockOrderStateMachine = {
          transition: jest.fn(),
          canTransition: jest.fn(),
          getValidTransitions: jest.fn().mockReturnValue([]),
        };

        orderService = new OrderService(
          mockPrisma,
          mockTariffResolver as any,
          mockVisitService as any,
          mockOrderValidationGuard as any,
          mockConsolidationService as any,
          mockOrderStateMachine as any,
        );
      });

      /**
       * For any order, the API response SHALL include an `orderInsurances` array
       * containing all OrderInsurance records.
       *
       * **Validates: Requirements 8.4**
       */
      it('findById includes orderInsurances array with all OrderInsurance records', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb, // orderId
            fc.array(orderInsuranceRecordArb('order-fixed'), { minLength: 1, maxLength: 4 }),
            async (orderId, orderInsurances) => {
              jest.clearAllMocks();

              // Ensure at least one PRIMARY for the derivation logic
              const withPrimary = [
                { ...orderInsurances[0], coverageType: 'PRIMARY' },
                ...orderInsurances.slice(1),
              ];

              mockPrisma.order.findUnique.mockResolvedValue({
                id: orderId,
                patientId: 'patient-1',
                insuranceId: null,
                status: 'PENDING_PAYMENT',
                patient: { id: 'patient-1', name: 'Test' },
                orderDetails: [],
                visit: { visitNumber: 'VST-001', status: 'REGISTERED' },
                orderInsurances: withPrimary,
              });

              const result = await orderService.findById(orderId);

              // ASSERTION 1: Response contains `orderInsurances` array
              expect(result).toHaveProperty('orderInsurances');
              expect(Array.isArray(result.orderInsurances)).toBe(true);

              // ASSERTION 2: Array length matches all order insurance records
              expect(result.orderInsurances).toHaveLength(withPrimary.length);

              // ASSERTION 3: Each record is present in the response
              for (let i = 0; i < withPrimary.length; i++) {
                expect(result.orderInsurances[i].insuranceId).toBe(
                  withPrimary[i].insuranceId,
                );
                expect(result.orderInsurances[i].coverageType).toBe(
                  withPrimary[i].coverageType,
                );
              }
            },
          ),
          { numRuns: 100 },
        );
      });

      /**
       * When order has no OrderInsurance records, the response includes an empty array.
       *
       * **Validates: Requirements 8.4**
       */
      it('findById includes empty orderInsurances array when no records exist', async () => {
        await fc.assert(
          fc.asyncProperty(uuidArb, async (orderId) => {
            jest.clearAllMocks();

            mockPrisma.order.findUnique.mockResolvedValue({
              id: orderId,
              patientId: 'patient-1',
              insuranceId: null,
              status: 'PENDING_PAYMENT',
              patient: { id: 'patient-1', name: 'Test' },
              orderDetails: [],
              visit: { visitNumber: 'VST-001', status: 'REGISTERED' },
              orderInsurances: [],
            });

            const result = await orderService.findById(orderId);

            expect(result.orderInsurances).toEqual([]);
          }),
          { numRuns: 100 },
        );
      });

      /**
       * For any order with mixed PRIMARY and SECONDARY records,
       * all records are included in the response regardless of coverageType.
       *
       * **Validates: Requirements 8.4**
       */
      it('findById includes both PRIMARY and SECONDARY records in orderInsurances array', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidArb, // orderId
            uuidArb, // primary insuranceId
            uuidArb, // secondary insuranceId
            async (orderId, primaryInsId, secondaryInsId) => {
              jest.clearAllMocks();

              const mixedRecords = [
                {
                  id: 'oi-primary',
                  orderId,
                  insuranceId: primaryInsId,
                  coverageType: 'PRIMARY',
                  claimStatus: 'PENDING',
                },
                {
                  id: 'oi-secondary',
                  orderId,
                  insuranceId: secondaryInsId,
                  coverageType: 'SECONDARY',
                  claimStatus: 'PENDING',
                },
              ];

              mockPrisma.order.findUnique.mockResolvedValue({
                id: orderId,
                patientId: 'patient-1',
                insuranceId: null,
                status: 'PENDING_PAYMENT',
                patient: { id: 'patient-1', name: 'Test' },
                orderDetails: [],
                visit: { visitNumber: 'VST-001', status: 'REGISTERED' },
                orderInsurances: mixedRecords,
              });

              const result = await orderService.findById(orderId);

              // ASSERTION: Both PRIMARY and SECONDARY are present
              expect(result.orderInsurances).toHaveLength(2);
              const coverageTypes = result.orderInsurances.map(
                (oi: any) => oi.coverageType,
              );
              expect(coverageTypes).toContain('PRIMARY');
              expect(coverageTypes).toContain('SECONDARY');
            },
          ),
          { numRuns: 100 },
        );
      });
    });
  });
});
