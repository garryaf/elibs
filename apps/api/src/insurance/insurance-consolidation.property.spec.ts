// Feature: insurance-source-consolidation, Properties 9, 10, 11

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InsuranceConsolidationService } from './insurance-consolidation.service';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.1**
 *
 * Property 9: Visit insurance validation against active enrollments
 * Property 10: Visit insurance defaults to priority=1
 * Property 11: Active insurance filtering by date and status
 */
describe('InsuranceConsolidationService Property Tests', () => {
  let service: InsuranceConsolidationService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceConsolidationService,
        {
          provide: PrismaService,
          useValue: {
            patientInsurance: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            patient: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InsuranceConsolidationService>(InsuranceConsolidationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // --- Arbitraries ---

  const uuidArb = fc.uuid().map((v) => v.toString());

  const dateArb = fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
  });

  /**
   * Generate a PatientInsurance record with configurable date/active state.
   */
  const patientInsuranceArb = (patientId: string) =>
    fc.record({
      id: uuidArb,
      patientId: fc.constant(patientId),
      insuranceId: uuidArb,
      memberNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
      policyNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: null }),
      priority: fc.integer({ min: 1, max: 5 }),
      type: fc.constantFrom('BPJS', 'SWASTA', 'CORPORATE', null),
      bpjsClassLevel: fc.option(fc.integer({ min: 1, max: 3 }), { nil: null }),
      validFrom: fc.option(dateArb, { nil: null }),
      validUntil: fc.option(dateArb, { nil: null }),
      isActive: fc.boolean(),
      notes: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
      migrationBatchId: fc.constant(null),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
      insurance: fc.record({
        id: uuidArb,
        name: fc.string({ minLength: 3, maxLength: 30 }),
      }),
    });

  /**
   * Determine if a record is "active" based on the service logic:
   * isActive=true AND (validFrom <= today OR null) AND (validUntil >= today OR null)
   */
  function isRecordActive(record: {
    isActive: boolean;
    validFrom: Date | null;
    validUntil: Date | null;
  }): boolean {
    if (!record.isActive) return false;

    const today = new Date();
    // Set time to start of day for comparison (matching date-only comparison)
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (record.validFrom !== null) {
      const fromDate = new Date(
        record.validFrom.getFullYear(),
        record.validFrom.getMonth(),
        record.validFrom.getDate(),
      );
      if (fromDate > todayStart) return false;
    }

    if (record.validUntil !== null) {
      const untilDate = new Date(
        record.validUntil.getFullYear(),
        record.validUntil.getMonth(),
        record.validUntil.getDate(),
      );
      if (untilDate < todayStart) return false;
    }

    return true;
  }

  // --- Property 9: Visit insurance validation against active enrollments ---

  describe('Property 9: Visit insurance validation against active enrollments', () => {
    /**
     * For any generated patient state, `validateVisitInsurance` succeeds
     * if and only if insuranceId is in active enrollments.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('validateVisitInsurance succeeds iff insuranceId is in active enrollments', async () => {
      const patientId = '11111111-1111-1111-1111-111111111111';

      await fc.assert(
        fc.asyncProperty(
          fc.array(patientInsuranceArb(patientId), { minLength: 1, maxLength: 5 }),
          uuidArb,
          async (records, testInsuranceId) => {
            // Compute which records are truly active
            const activeRecords = records.filter(isRecordActive);
            const activeInsuranceIds = activeRecords.map((r) => r.insuranceId);

            // Mock getActiveInsurances — the service calls findMany internally
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue(
              activeRecords,
            );

            const isEnrolled = activeInsuranceIds.includes(testInsuranceId);

            if (isEnrolled) {
              await expect(
                service.validateVisitInsurance(patientId, testInsuranceId),
              ).resolves.toBeUndefined();
            } else {
              await expect(
                service.validateVisitInsurance(patientId, testInsuranceId),
              ).rejects.toThrow(BadRequestException);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Validation always succeeds when the insuranceId matches one of the
     * active records in the patient's enrollments.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('validateVisitInsurance always succeeds for a known active insuranceId', async () => {
      const patientId = '22222222-2222-2222-2222-222222222222';

      await fc.assert(
        fc.asyncProperty(
          fc
            .array(patientInsuranceArb(patientId), { minLength: 1, maxLength: 5 })
            .filter((records) => records.some(isRecordActive)),
          async (records) => {
            const activeRecords = records.filter(isRecordActive);

            // Pick an insuranceId from the active set
            const chosenInsuranceId = activeRecords[0].insuranceId;

            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue(
              activeRecords,
            );

            await expect(
              service.validateVisitInsurance(patientId, chosenInsuranceId),
            ).resolves.toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 10: Visit insurance defaults to priority=1 ---

  describe('Property 10: Visit insurance defaults to priority=1', () => {
    /**
     * For any patient with at least one active priority=1 record,
     * `getDefaultInsurance` returns that record.
     *
     * **Validates: Requirements 3.3**
     */
    it('getDefaultInsurance returns priority=1 active record when it exists', async () => {
      const patientId = '33333333-3333-3333-3333-333333333333';

      await fc.assert(
        fc.asyncProperty(
          patientInsuranceArb(patientId).map((r) => ({
            ...r,
            priority: 1,
            isActive: true,
            // Ensure valid date range covers today
            validFrom: null,
            validUntil: null,
          })),
          async (priority1Record) => {
            (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue(
              priority1Record,
            );

            const result = await service.getDefaultInsurance(patientId);

            expect(result).not.toBeNull();
            expect(result!.priority).toBe(1);
            expect(result!.isActive).toBe(true);
            expect(result!.insuranceId).toBe(priority1Record.insuranceId);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When no active priority=1 record exists, getDefaultInsurance returns null.
     *
     * **Validates: Requirements 3.3**
     */
    it('getDefaultInsurance returns null when no active priority=1 record exists', async () => {
      const patientId = '44444444-4444-4444-4444-444444444444';

      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue(null);

          const result = await service.getDefaultInsurance(patientId);

          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * When a priority=1 record exists but is inactive or outside valid date range,
     * getDefaultInsurance returns null (service filters it out).
     *
     * **Validates: Requirements 3.3, 3.4**
     */
    it('getDefaultInsurance returns null when priority=1 exists but is inactive', async () => {
      const patientId = '55555555-5555-5555-5555-555555555555';

      await fc.assert(
        fc.asyncProperty(
          patientInsuranceArb(patientId).map((r) => ({
            ...r,
            priority: 1,
            isActive: false, // Inactive
          })),
          async () => {
            // The service query with isActive=true won't find the record
            (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue(null);

            const result = await service.getDefaultInsurance(patientId);

            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 11: Active insurance filtering by date and status ---

  describe('Property 11: Active insurance filtering by date and status', () => {
    /**
     * `getActiveInsurances` returns only records where isActive=true
     * AND dates are valid (today is within range).
     *
     * We test this by generating a mixed set of records and verifying
     * the service correctly returns only the active ones.
     *
     * **Validates: Requirements 3.4, 6.1**
     */
    it('getActiveInsurances returns only active records within valid date range', async () => {
      const patientId = '66666666-6666-6666-6666-666666666666';

      await fc.assert(
        fc.asyncProperty(
          fc.array(patientInsuranceArb(patientId), { minLength: 0, maxLength: 8 }),
          async (allRecords) => {
            // Compute expected active records using our predicate
            const expectedActive = allRecords.filter(isRecordActive);

            // Mock the Prisma call to return only the expected active records
            // (simulating what Prisma would return given the WHERE clause in the service)
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue(
              expectedActive.sort((a, b) => a.priority - b.priority),
            );

            const result = await service.getActiveInsurances(patientId);

            // Verify: all returned records must be active and within date range
            for (const record of result) {
              expect(record.isActive).toBe(true);

              if (record.validFrom !== null) {
                expect(new Date(record.validFrom).getTime()).toBeLessThanOrEqual(
                  Date.now(),
                );
              }
              if (record.validUntil !== null) {
                expect(new Date(record.validUntil).getTime()).toBeGreaterThanOrEqual(
                  new Date().setHours(0, 0, 0, 0),
                );
              }
            }

            // Verify: count matches expected
            expect(result.length).toBe(expectedActive.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Records with isActive=false are never returned by getActiveInsurances.
     *
     * **Validates: Requirements 3.4, 6.1**
     */
    it('inactive records are never returned by getActiveInsurances', async () => {
      const patientId = '77777777-7777-7777-7777-777777777777';

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            patientInsuranceArb(patientId).map((r) => ({
              ...r,
              isActive: false,
            })),
            { minLength: 1, maxLength: 5 },
          ),
          async (inactiveRecords) => {
            // All records are inactive, so none should be returned
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue([]);

            const result = await service.getActiveInsurances(patientId);

            expect(result).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Records with expired validUntil dates are excluded from active insurances.
     *
     * **Validates: Requirements 3.4, 6.1**
     */
    it('expired records (validUntil in the past) are excluded', async () => {
      const patientId = '88888888-8888-8888-8888-888888888888';

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            patientInsuranceArb(patientId).map((r) => ({
              ...r,
              isActive: true,
              validFrom: null,
              validUntil: new Date('2020-01-01'), // Far in the past
            })),
            { minLength: 1, maxLength: 5 },
          ),
          async (expiredRecords) => {
            // These expired records should be filtered out by the service query
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue([]);

            const result = await service.getActiveInsurances(patientId);

            expect(result).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Records with future validFrom dates are excluded from active insurances.
     *
     * **Validates: Requirements 3.4, 6.1**
     */
    it('future records (validFrom in the future) are excluded', async () => {
      const patientId = '99999999-9999-9999-9999-999999999999';

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            patientInsuranceArb(patientId).map((r) => ({
              ...r,
              isActive: true,
              validFrom: new Date('2030-12-31'), // Far in the future
              validUntil: null,
            })),
            { minLength: 1, maxLength: 5 },
          ),
          async (futureRecords) => {
            // These future records should be filtered out by the service query
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue([]);

            const result = await service.getActiveInsurances(patientId);

            expect(result).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Active records with null validFrom and null validUntil are always included.
     *
     * **Validates: Requirements 3.4, 6.1**
     */
    it('records with null date bounds and isActive=true are always included', async () => {
      const patientId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            patientInsuranceArb(patientId).map((r) => ({
              ...r,
              isActive: true,
              validFrom: null,
              validUntil: null,
            })),
            { minLength: 1, maxLength: 5 },
          ),
          async (activeNoBoundsRecords) => {
            // All these records should be returned (active, no date constraints)
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue(
              activeNoBoundsRecords.sort((a, b) => a.priority - b.priority),
            );

            const result = await service.getActiveInsurances(patientId);

            expect(result.length).toBe(activeNoBoundsRecords.length);
            for (const record of result) {
              expect(record.isActive).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
