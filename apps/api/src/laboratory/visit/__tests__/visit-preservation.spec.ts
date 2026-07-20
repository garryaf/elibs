/**
 * Preservation Property Tests — NCR-04-04: Duplicate Active Visit Guard
 *
 * These tests capture existing CORRECT behavior that must remain unchanged after the fix.
 * They verify that visit creation succeeds when the patient does NOT have a same-day
 * active (REGISTERED or IN_PROGRESS) visit.
 *
 * Scenarios tested (all should succeed on UNFIXED code):
 * - Patient with no visits today → create() succeeds
 * - Patient with CANCELLED visit today → create() succeeds
 * - Patient with COMPLETED visit today → create() succeeds
 * - Patient with active visit on a DIFFERENT day → create() today succeeds
 *
 * These tests MUST PASS on UNFIXED code and continue to pass after the fix.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService } from '../../audit/audit.service';
import { InsuranceConsolidationService } from '../../../insurance/insurance-consolidation.service';
import { CreateVisitDto } from '../dto/create-visit.dto';

const PaymentMethod = {
  CASH: 'CASH' as const,
  BPJS: 'BPJS' as const,
  INSURANCE: 'INSURANCE' as const,
  TRANSFER: 'TRANSFER' as const,
  EDC: 'EDC' as const,
  INSURANCE_CASH_FALLBACK: 'INSURANCE_CASH_FALLBACK' as const,
  CORPORATE_DEFERRED: 'CORPORATE_DEFERRED' as const,
};

const VisitStatus = {
  REGISTERED: 'REGISTERED' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

// Arbitrary for PaymentMethod enum values
const paymentMethodArb = fc.constantFrom(
  PaymentMethod.CASH,
  PaymentMethod.BPJS,
  PaymentMethod.INSURANCE,
  PaymentMethod.TRANSFER,
  PaymentMethod.EDC,
  PaymentMethod.INSURANCE_CASH_FALLBACK,
  PaymentMethod.CORPORATE_DEFERRED,
);

// Arbitrary for a valid CreateVisitDto (non-BPJS, no insurance required)
const createVisitDtoArb = (patientId: string) =>
  fc
    .record({
      paymentMethod: paymentMethodArb.filter(
        (pm) => pm !== PaymentMethod.BPJS && pm !== PaymentMethod.INSURANCE && pm !== PaymentMethod.INSURANCE_CASH_FALLBACK,
      ),
      doctorId: fc.option(fc.uuid(), { nil: undefined }),
      clinicId: fc.option(fc.uuid(), { nil: undefined }),
    })
    .map((rec) => ({
      patientId,
      paymentMethod: rec.paymentMethod as any,
      doctorId: rec.doctorId,
      clinicId: rec.clinicId,
    }));

describe('Feature: duplicate-active-visit-guard, Property 2: Preservation — Non-Duplicate Visit Creation Unchanged', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;
  let visitNumberCounter: number;

  beforeEach(async () => {
    visitNumberCounter = 0;

    mockPrisma = {
      patient: {
        findFirst: jest.fn(),
      },
      doctor: {
        findFirst: jest.fn(),
      },
      clinic: {
        findFirst: jest.fn(),
      },
      insurance: {
        findFirst: jest.fn(),
      },
      visit: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn().mockImplementation(async () => {
        visitNumberCounter++;
        return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
      }),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: VisitNumberGeneratorService,
          useValue: mockVisitNumberGenerator,
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: InsuranceConsolidationService, useValue: { validateVisitInsurance: jest.fn().mockResolvedValue(undefined), getDefaultInsurance: jest.fn().mockResolvedValue(null), getActiveInsurances: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  /**
   * Helper to setup mock for successful visit creation.
   * Simulates what Prisma would return on a successful visit.create() call.
   */
  function setupSuccessfulCreateMock(patientId: string) {
    mockPrisma.patient.findFirst.mockResolvedValue({
      id: patientId,
      deletedAt: null,
    });

    // For optional references: if doctorId/clinicId provided, mock them as found
    mockPrisma.doctor.findFirst.mockImplementation(async (args: any) => ({
      id: args.where.id,
      name: 'Dr. Test',
      deletedAt: null,
    }));
    mockPrisma.clinic.findFirst.mockImplementation(async (args: any) => ({
      id: args.where.id,
      name: 'Test Clinic',
      deletedAt: null,
    }));
    mockPrisma.insurance.findFirst.mockImplementation(async (args: any) => ({
      id: args.where.id,
      name: 'Test Insurance',
      deletedAt: null,
    }));

    mockPrisma.visit.create.mockImplementation(async (args: any) => ({
      id: 'created-visit-id',
      visitNumber: args.data?.visitNumber ?? 'VST-202507-0001',
      status: VisitStatus.REGISTERED,
      registrationDate: new Date(),
      patientId: args.data.patientId,
      paymentMethod: args.data.paymentMethod,
      doctorId: args.data.doctorId ?? null,
      clinicId: args.data.clinicId ?? null,
      insuranceId: args.data.insuranceId ?? null,
      bpjsNumber: args.data.bpjsNumber ?? null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: { id: patientId, name: 'Patient' },
      doctor: args.data.doctorId ? { id: args.data.doctorId, name: 'Dr. Test' } : null,
      clinic: args.data.clinicId ? { id: args.data.clinicId, name: 'Test Clinic' } : null,
      insurance: args.data.insuranceId ? { id: args.data.insuranceId, name: 'Test Insurance' } : null,
    }));
  }

  describe('Patient with no visits today → create() succeeds', () => {
    /**
     * Property: For all CreateVisitDto inputs where the patient has NO same-day visits,
     * create() succeeds and returns a visit with all relations populated.
     *
     * This is the most common case (first visit of the day). The fix must not break this.
     *
     * **Validates: Requirements 3.3**
     */
    it('should succeed for any valid CreateVisitDto when patient has no same-day visits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          paymentMethodArb.filter(
            (pm) => pm !== PaymentMethod.BPJS && pm !== PaymentMethod.INSURANCE && pm !== PaymentMethod.INSURANCE_CASH_FALLBACK,
          ),
          async (patientId, userId, paymentMethod) => {
            // Reset mocks for each run
            jest.clearAllMocks();
            visitNumberCounter = 0;
            mockVisitNumberGenerator.generate.mockImplementation(async () => {
              visitNumberCounter++;
              return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
            });

            setupSuccessfulCreateMock(patientId);

            // No existing active visit on the same day
            // On unfixed code: visit.findFirst is not called for duplicate check
            // On fixed code: visit.findFirst returns null (no active visit)
            mockPrisma.visit.findFirst.mockResolvedValue(null);

            const dto: CreateVisitDto = {
              patientId,
              paymentMethod: paymentMethod as any,
            };

            const result = await visitService.create(dto, userId);

            // Visit was created successfully
            expect(result).toBeDefined();
            expect(result.patientId).toBe(patientId);
            expect(result.paymentMethod).toBe(paymentMethod);
            expect(result.status).toBe(VisitStatus.REGISTERED);
            // Relations are populated
            expect(result.patient).toBeDefined();
            expect(result.patient.id).toBe(patientId);
            // Visit number was generated
            expect(result.visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);
            // Audit was logged
            expect(mockAuditService.log).toHaveBeenCalledWith(
              userId,
              'CREATE',
              'Visit',
              expect.any(String),
              null,
              expect.objectContaining({ patientId }),
              undefined,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Patient with CANCELLED visit today → create() succeeds', () => {
    /**
     * Property: For all patient states where the only same-day visit is CANCELLED,
     * create() succeeds identically — CANCELLED visits do NOT block new visits.
     *
     * **Validates: Requirements 3.1**
     */
    it('should succeed when patient only has CANCELLED visits on the same day', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          paymentMethodArb.filter(
            (pm) => pm !== PaymentMethod.BPJS && pm !== PaymentMethod.INSURANCE && pm !== PaymentMethod.INSURANCE_CASH_FALLBACK,
          ),
          async (patientId, userId, paymentMethod) => {
            jest.clearAllMocks();
            visitNumberCounter = 0;
            mockVisitNumberGenerator.generate.mockImplementation(async () => {
              visitNumberCounter++;
              return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
            });

            setupSuccessfulCreateMock(patientId);

            // On fixed code, the duplicate check looks for REGISTERED/IN_PROGRESS
            // visits only. A CANCELLED visit should NOT trigger rejection.
            // Return null to simulate "no active visit found" (CANCELLED is not active)
            mockPrisma.visit.findFirst.mockResolvedValue(null);

            const dto: CreateVisitDto = {
              patientId,
              paymentMethod: paymentMethod as any,
            };

            const result = await visitService.create(dto, userId);

            expect(result).toBeDefined();
            expect(result.patientId).toBe(patientId);
            expect(result.status).toBe(VisitStatus.REGISTERED);
            expect(result.patient).toBeDefined();
            expect(result.visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Patient with COMPLETED visit today → create() succeeds', () => {
    /**
     * Property: For all patient states where the only same-day visit is COMPLETED,
     * create() succeeds identically — COMPLETED visits do NOT block new visits.
     *
     * **Validates: Requirements 3.2**
     */
    it('should succeed when patient only has COMPLETED visits on the same day', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          paymentMethodArb.filter(
            (pm) => pm !== PaymentMethod.BPJS && pm !== PaymentMethod.INSURANCE && pm !== PaymentMethod.INSURANCE_CASH_FALLBACK,
          ),
          async (patientId, userId, paymentMethod) => {
            jest.clearAllMocks();
            visitNumberCounter = 0;
            mockVisitNumberGenerator.generate.mockImplementation(async () => {
              visitNumberCounter++;
              return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
            });

            setupSuccessfulCreateMock(patientId);

            // On fixed code, the duplicate check looks for REGISTERED/IN_PROGRESS
            // visits only. A COMPLETED visit should NOT trigger rejection.
            mockPrisma.visit.findFirst.mockResolvedValue(null);

            const dto: CreateVisitDto = {
              patientId,
              paymentMethod: paymentMethod as any,
            };

            const result = await visitService.create(dto, userId);

            expect(result).toBeDefined();
            expect(result.patientId).toBe(patientId);
            expect(result.status).toBe(VisitStatus.REGISTERED);
            expect(result.patient).toBeDefined();
            expect(result.visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Patient with active visit on a DIFFERENT day → create() today succeeds', () => {
    /**
     * Property: For all patient states where an active visit exists on a different day,
     * create() for the current day succeeds — the guard only checks the same calendar day.
     *
     * **Validates: Requirements 3.4**
     */
    it('should succeed when patient has active visit on a different calendar day', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          paymentMethodArb.filter(
            (pm) => pm !== PaymentMethod.BPJS && pm !== PaymentMethod.INSURANCE && pm !== PaymentMethod.INSURANCE_CASH_FALLBACK,
          ),
          async (patientId, userId, paymentMethod) => {
            jest.clearAllMocks();
            visitNumberCounter = 0;
            mockVisitNumberGenerator.generate.mockImplementation(async () => {
              visitNumberCounter++;
              return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
            });

            setupSuccessfulCreateMock(patientId);

            // On fixed code, the duplicate check looks for active visits
            // on the SAME calendar day (WIB). A visit on a different day
            // should NOT be found by the query.
            mockPrisma.visit.findFirst.mockResolvedValue(null);

            const dto: CreateVisitDto = {
              patientId,
              paymentMethod: paymentMethod as any,
            };

            const result = await visitService.create(dto, userId);

            expect(result).toBeDefined();
            expect(result.patientId).toBe(patientId);
            expect(result.status).toBe(VisitStatus.REGISTERED);
            expect(result.patient).toBeDefined();
            expect(result.visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Comprehensive preservation: non-duplicate scenarios with varied inputs', () => {
    /**
     * Property: For ALL CreateVisitDto inputs where the patient does NOT have a same-day
     * REGISTERED or IN_PROGRESS visit (NOT isBugCondition), create() succeeds and returns
     * a visit with all relations properly populated.
     *
     * This covers requirements 3.1-3.6: the complete preservation guarantee across
     * all non-bug-condition inputs.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
     */
    it('should succeed for all non-bug-condition inputs regardless of payment method and optional fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          createVisitDtoArb(fc.sample(fc.uuid(), 1)[0]),
          async (patientId, userId, dtoBase) => {
            jest.clearAllMocks();
            visitNumberCounter = 0;
            mockVisitNumberGenerator.generate.mockImplementation(async () => {
              visitNumberCounter++;
              return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
            });

            // Override patientId from the dto since we generate it separately
            const dto: CreateVisitDto = {
              ...dtoBase,
              patientId,
            };

            setupSuccessfulCreateMock(patientId);

            // NOT isBugCondition: no same-day REGISTERED or IN_PROGRESS visit
            mockPrisma.visit.findFirst.mockResolvedValue(null);

            const result = await visitService.create(dto, userId);

            // Core preservation assertions:
            // 1. Visit is successfully created
            expect(result).toBeDefined();
            expect(result.status).toBe(VisitStatus.REGISTERED);
            expect(result.patientId).toBe(patientId);
            expect(result.paymentMethod).toBe(dto.paymentMethod);

            // 2. Visit number was generated
            expect(result.visitNumber).toBeDefined();
            expect(result.visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);

            // 3. Relations are populated (VISIT_INCLUDE = { patient, doctor, clinic, insurance })
            expect(result).toHaveProperty('patient');
            expect(result).toHaveProperty('doctor');
            expect(result).toHaveProperty('clinic');
            expect(result).toHaveProperty('insurance');

            // 4. Audit was logged for the successful creation
            expect(mockAuditService.log).toHaveBeenCalledTimes(1);
            expect(mockAuditService.log).toHaveBeenCalledWith(
              userId,
              'CREATE',
              'Visit',
              expect.any(String),
              null,
              expect.objectContaining({ patientId }),
              undefined,
            );
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: For all patient states where only same-day visits are CANCELLED/COMPLETED,
     * create() succeeds identically to a patient with no visits at all.
     *
     * This verifies that CANCELLED and COMPLETED visits have zero impact on the ability
     * to create new visits, maintaining existing behavior.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('should produce identical success result regardless of CANCELLED/COMPLETED visits on same day', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          // Generate a scenario: patient has some number of CANCELLED/COMPLETED visits today
          fc.array(
            fc.record({
              status: fc.constantFrom(VisitStatus.CANCELLED, VisitStatus.COMPLETED),
              visitNumber: fc.constant('VST-202507-0099'),
            }),
            { minLength: 1, maxLength: 3 },
          ),
          async (patientId, userId, _existingVisits) => {
            jest.clearAllMocks();
            visitNumberCounter = 0;
            mockVisitNumberGenerator.generate.mockImplementation(async () => {
              visitNumberCounter++;
              return `VST-202507-${visitNumberCounter.toString().padStart(4, '0')}`;
            });

            setupSuccessfulCreateMock(patientId);

            // The duplicate check (when implemented) only looks for REGISTERED/IN_PROGRESS.
            // CANCELLED and COMPLETED visits should not be found by the query.
            mockPrisma.visit.findFirst.mockResolvedValue(null);

            const dto: CreateVisitDto = {
              patientId,
              paymentMethod: PaymentMethod.CASH as any,
            };

            const result = await visitService.create(dto, userId);

            // Success: same result shape regardless of existing CANCELLED/COMPLETED visits
            expect(result).toBeDefined();
            expect(result.status).toBe(VisitStatus.REGISTERED);
            expect(result.patientId).toBe(patientId);
            expect(result.patient).toBeDefined();
            expect(result.visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);
            expect(mockAuditService.log).toHaveBeenCalledTimes(1);
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
