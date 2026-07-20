// Feature: sprint-next1-critical-security, Property 1/2: Patient soft-delete

import * as fc from 'fast-check';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientService } from '../patient.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MrnGeneratorService } from '../mrn-generator.service';
import { RegionValidationService } from '../../region/region-validation.service';
import { AuditService } from '../../audit/audit.service';
import { InsuranceConsolidationService } from '../../../insurance/insurance-consolidation.service';

/**
 * **Validates: Requirements 1.3, 1.4**
 *
 * Property 1: Patient soft-delete is blocked by active dependencies
 * For any patient that has at least one visit with status REGISTERED or IN_PROGRESS,
 * OR at least one order with status not in {CANCELLED, NOTIFIED},
 * calling softDelete on that patient SHALL be rejected with a conflict error
 * and the patient's deletedAt SHALL remain null.
 *
 * Property 2: Soft-deleted patients are excluded from queries
 * For any set of patient records where some have deletedAt set to a non-null timestamp,
 * calling findAll SHALL never return a patient whose deletedAt is non-null.
 */

// Visit statuses that block patient soft-delete
const ACTIVE_VISIT_STATUSES = ['REGISTERED', 'IN_PROGRESS'] as const;
const INACTIVE_VISIT_STATUSES = ['COMPLETED', 'CANCELLED'] as const;
const ALL_VISIT_STATUSES = [...ACTIVE_VISIT_STATUSES, ...INACTIVE_VISIT_STATUSES] as const;

// Order statuses from the Prisma schema
const ALL_ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAYMENT_OVERDUE',
  'PAID',
  'SAMPLE_COLLECTED',
  'IN_ANALYSIS',
  'VERIFIED',
  'APPROVED',
  'NOTIFIED',
  'CANCELLED',
] as const;

// Orders with these statuses do NOT block deletion
const INACTIVE_ORDER_STATUSES = ['CANCELLED', 'NOTIFIED'] as const;
// Orders with these statuses DO block deletion
const ACTIVE_ORDER_STATUSES = ALL_ORDER_STATUSES.filter(
  (s) => !INACTIVE_ORDER_STATUSES.includes(s as any),
);

function createService(mockPrisma: any): PatientService {
  const mockMrnGenerator = { generate: jest.fn() } as unknown as MrnGeneratorService;
  const mockRegionValidation = { validateHierarchy: jest.fn() } as unknown as RegionValidationService;
  const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const mockInsuranceConsolidation = { resolvePatientInsuranceId: jest.fn().mockResolvedValue(null), getActiveInsurances: jest.fn().mockResolvedValue([]) } as unknown as InsuranceConsolidationService;
  return new PatientService(
    mockPrisma as PrismaService,
    mockMrnGenerator,
    mockRegionValidation,
    mockAuditService,
    mockInsuranceConsolidation,
  );
}

describe('Patient Soft-Delete Property Tests', () => {
  describe('Property 1: Patient soft-delete is blocked by active dependencies', () => {
    /**
     * For any patient with at least one active visit (REGISTERED or IN_PROGRESS),
     * softDelete SHALL be rejected with ConflictException.
     *
     * **Validates: Requirements 1.3**
     */
    it('rejects soft-delete when patient has active visits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          // Generate at least 1 active visit count
          fc.integer({ min: 1, max: 10 }),
          // Generate any number of inactive order count (shouldn't matter)
          fc.integer({ min: 0, max: 5 }),
          async (patientId, userId, activeVisitCount, inactiveOrderCount) => {
            const mockPrisma = {
              patient: {
                findFirst: jest.fn().mockResolvedValue({
                  id: patientId,
                  name: 'Test Patient',
                  deletedAt: null,
                }),
                update: jest.fn(),
              },
              visit: {
                count: jest.fn().mockResolvedValue(activeVisitCount),
              },
              order: {
                count: jest.fn().mockResolvedValue(0), // not reached because visits block first
              },
            };

            const service = createService(mockPrisma);

            await expect(
              service.softDelete(patientId, userId),
            ).rejects.toThrow(ConflictException);

            // Verify patient was NOT updated (deletedAt remains null)
            expect(mockPrisma.patient.update).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any patient with no active visits but at least one active order
     * (status not in {CANCELLED, NOTIFIED}), softDelete SHALL be rejected
     * with ConflictException.
     *
     * **Validates: Requirements 1.3**
     */
    it('rejects soft-delete when patient has active orders (no active visits)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          // Generate at least 1 active order count
          fc.integer({ min: 1, max: 10 }),
          async (patientId, userId, activeOrderCount) => {
            const mockPrisma = {
              patient: {
                findFirst: jest.fn().mockResolvedValue({
                  id: patientId,
                  name: 'Test Patient',
                  deletedAt: null,
                }),
                update: jest.fn(),
              },
              visit: {
                count: jest.fn().mockResolvedValue(0), // no active visits
              },
              order: {
                count: jest.fn().mockResolvedValue(activeOrderCount), // has active orders
              },
            };

            const service = createService(mockPrisma);

            await expect(
              service.softDelete(patientId, userId),
            ).rejects.toThrow(ConflictException);

            // Verify patient was NOT updated (deletedAt remains null)
            expect(mockPrisma.patient.update).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any patient with both active visits AND active orders,
     * softDelete SHALL be rejected with ConflictException.
     *
     * **Validates: Requirements 1.3**
     */
    it('rejects soft-delete when patient has both active visits and active orders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          fc.integer({ min: 1, max: 10 }), // active visits
          fc.integer({ min: 1, max: 10 }), // active orders
          async (patientId, userId, activeVisitCount, activeOrderCount) => {
            const mockPrisma = {
              patient: {
                findFirst: jest.fn().mockResolvedValue({
                  id: patientId,
                  name: 'Test Patient',
                  deletedAt: null,
                }),
                update: jest.fn(),
              },
              visit: {
                count: jest.fn().mockResolvedValue(activeVisitCount),
              },
              order: {
                count: jest.fn().mockResolvedValue(activeOrderCount),
              },
            };

            const service = createService(mockPrisma);

            await expect(
              service.softDelete(patientId, userId),
            ).rejects.toThrow(ConflictException);

            // Verify patient was NOT updated
            expect(mockPrisma.patient.update).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any patient with NO active visits (0) and NO active orders (0),
     * softDelete SHALL succeed (no ConflictException thrown).
     * This is the inverse property that confirms the boundary.
     *
     * **Validates: Requirements 1.3**
     */
    it('allows soft-delete when patient has no active dependencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // patientId
          fc.uuid(), // userId
          async (patientId, userId) => {
            const now = new Date();
            const mockPrisma = {
              patient: {
                findFirst: jest.fn().mockResolvedValue({
                  id: patientId,
                  name: 'Test Patient',
                  deletedAt: null,
                }),
                update: jest.fn().mockResolvedValue({
                  id: patientId,
                  name: 'Test Patient',
                  deletedAt: now,
                }),
              },
              visit: {
                count: jest.fn().mockResolvedValue(0), // no active visits
              },
              order: {
                count: jest.fn().mockResolvedValue(0), // no active orders
              },
            };

            const service = createService(mockPrisma);

            const result = await service.softDelete(patientId, userId);

            // Should succeed: patient.update was called and deletedAt is set
            expect(mockPrisma.patient.update).toHaveBeenCalledWith({
              where: { id: patientId },
              data: { deletedAt: expect.any(Date) },
            });
            expect(result.deletedAt).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Soft-deleted patients are excluded from queries', () => {
    /**
     * For any set of patient records where some have deletedAt set to a non-null
     * timestamp, calling findAll SHALL never return a patient whose deletedAt is non-null.
     *
     * **Validates: Requirements 1.4**
     */
    it('findAll never returns patients with non-null deletedAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a mix of active and soft-deleted patients
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              mrn: fc.string({ minLength: 5, maxLength: 15 }),
              deletedAt: fc.oneof(
                fc.constant(null),
                fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
              ),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (patients) => {
            // Separate active (deletedAt === null) from soft-deleted
            const activePatients = patients.filter((p) => p.deletedAt === null);

            const mockPrisma = {
              patient: {
                findMany: jest.fn().mockImplementation(({ where }: any) => {
                  // The service should always pass `deletedAt: null` in the where clause
                  // We simulate the DB filtering: only return patients with deletedAt null
                  if (where && where.deletedAt === null) {
                    return Promise.resolve(activePatients);
                  }
                  // If somehow no deletedAt filter is applied, return all (test would fail)
                  return Promise.resolve(patients);
                }),
                count: jest.fn().mockImplementation(({ where }: any) => {
                  if (where && where.deletedAt === null) {
                    return Promise.resolve(activePatients.length);
                  }
                  return Promise.resolve(patients.length);
                }),
              },
            };

            const service = createService(mockPrisma);

            const result = await service.findAll({ page: 1, limit: 100 });

            // Assert: no returned patient has a non-null deletedAt
            for (const patient of result.data) {
              expect(patient.deletedAt).toBeNull();
            }

            // Assert: the service queried with deletedAt: null filter
            expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({ deletedAt: null }),
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any non-empty set where ALL patients are soft-deleted,
     * findAll SHALL return an empty data array.
     *
     * **Validates: Requirements 1.4**
     */
    it('findAll returns empty when all patients are soft-deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate patients that are ALL soft-deleted
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              mrn: fc.string({ minLength: 5, maxLength: 15 }),
              deletedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          async (softDeletedPatients) => {
            const mockPrisma = {
              patient: {
                findMany: jest.fn().mockImplementation(({ where }: any) => {
                  // When filtering deletedAt: null, none of these patients match
                  if (where && where.deletedAt === null) {
                    return Promise.resolve([]);
                  }
                  return Promise.resolve(softDeletedPatients);
                }),
                count: jest.fn().mockImplementation(({ where }: any) => {
                  if (where && where.deletedAt === null) {
                    return Promise.resolve(0);
                  }
                  return Promise.resolve(softDeletedPatients.length);
                }),
              },
            };

            const service = createService(mockPrisma);

            const result = await service.findAll({ page: 1, limit: 100 });

            // Assert: no patients returned
            expect(result.data).toHaveLength(0);
            expect(result.meta.total).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
