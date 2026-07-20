// Feature: insurance-source-consolidation, Property 7, Property 16, Property 4

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InsuranceConsolidationService } from './insurance-consolidation.service';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * **Validates: Requirements 2.4, 6.3, 6.4, 6.5, 1.5, 8.5**
 *
 * Property tests for cascade and fallback logic in InsuranceConsolidationService.
 * - Property 7: Order insurance canonical source with fallback
 * - Property 16: Cascade consistency validation
 * - Property 4: Patient insurance fallback from legacy FK
 */
describe('Insurance Consolidation Cascade & Fallback Property Tests', () => {
  let service: InsuranceConsolidationService;
  let prismaService: any;

  // Arbitraries
  const arbUuid = fc.uuid().map((v) => v.replace(/-/g, '').slice(0, 32)).chain((hex) =>
    fc.constant(
      `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`,
    ),
  );

  const arbCoverageType = fc.constantFrom('PRIMARY', 'SECONDARY');
  const arbClaimStatus = fc.constantFrom('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

  beforeEach(async () => {
    const mockPrisma = {
      orderInsurance: {
        findFirst: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      patientInsurance: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      patient: {
        findUnique: jest.fn(),
      },
      visit: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceConsolidationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<InsuranceConsolidationService>(InsuranceConsolidationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 7: Order insurance canonical source with fallback', () => {
    /**
     * **Validates: Requirements 2.4, 6.3**
     *
     * For any order, the canonical primary insurance SHALL resolve from
     * OrderInsurance junction (PRIMARY), falling back to Order.insuranceId
     * only when no junction PRIMARY record exists.
     */
    it('returns ORDER_INSURANCE_JUNCTION source when OrderInsurance PRIMARY exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbUuid,
          arbClaimStatus,
          async (orderId, insuranceId, claimStatus) => {
            const mockOrderInsurance = {
              id: 'oi-id',
              orderId,
              insuranceId,
              coverageType: 'PRIMARY',
              claimStatus,
              coveredAmount: null,
              copayAmount: null,
              memberNumber: null,
              migrationBatchId: null,
              submittedAt: null,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
              paidAt: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue(
              mockOrderInsurance,
            );

            const result = await service.getOrderPrimaryInsurance(orderId);

            expect(result.source).toBe('ORDER_INSURANCE_JUNCTION');
            expect(result.insuranceId).toBe(insuranceId);
            expect(result.orderInsurance).toEqual(mockOrderInsurance);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.4, 6.3**
     *
     * When no OrderInsurance PRIMARY exists but Order.insuranceId is set,
     * the source SHALL be ORDER_LEGACY_FK.
     */
    it('returns ORDER_LEGACY_FK source when only Order.insuranceId exists', async () => {
      await fc.assert(
        fc.asyncProperty(arbUuid, arbUuid, async (orderId, legacyInsuranceId) => {
          // No junction record
          (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue(null);

          // Legacy FK exists
          (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
            insuranceId: legacyInsuranceId,
          });

          const result = await service.getOrderPrimaryInsurance(orderId);

          expect(result.source).toBe('ORDER_LEGACY_FK');
          expect(result.insuranceId).toBe(legacyInsuranceId);
          expect(result.orderInsurance).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.4, 6.3**
     *
     * When neither OrderInsurance PRIMARY nor Order.insuranceId exists,
     * the system SHALL throw NotFoundException.
     */
    it('throws NotFoundException when neither junction nor legacy FK exists', async () => {
      await fc.assert(
        fc.asyncProperty(arbUuid, async (orderId) => {
          // No junction record
          (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue(null);

          // No legacy FK
          (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
            insuranceId: null,
          });

          await expect(service.getOrderPrimaryInsurance(orderId)).rejects.toThrow(
            NotFoundException,
          );
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.4, 6.3**
     *
     * When the order itself does not exist, the system SHALL throw NotFoundException.
     */
    it('throws NotFoundException when order does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(arbUuid, async (orderId) => {
          // No junction record
          (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue(null);

          // Order not found
          (prismaService.order.findUnique as jest.Mock).mockResolvedValue(null);

          await expect(service.getOrderPrimaryInsurance(orderId)).rejects.toThrow(
            NotFoundException,
          );
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 16: Cascade consistency validation', () => {
    /**
     * **Validates: Requirements 6.4, 6.5**
     *
     * When order PRIMARY matches visit.insuranceId AND visit.insuranceId is in
     * patient active enrollments → isConsistent=true.
     */
    it('returns isConsistent=true when full cascade is valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbUuid,
          arbUuid,
          arbUuid,
          async (orderId, visitId, patientId, insuranceId) => {
            // Order exists with visit relation
            (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
              id: orderId,
              visitId,
              visit: {
                id: visitId,
                patientId,
                insuranceId,
              },
            });

            // OrderInsurance PRIMARY exists matching insurance
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'oi-id',
              orderId,
              insuranceId,
              coverageType: 'PRIMARY',
              claimStatus: 'PENDING',
              coveredAmount: null,
              copayAmount: null,
              memberNumber: null,
              migrationBatchId: null,
              submittedAt: null,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
              paidAt: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Patient has the insurance as active enrollment
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue([
              {
                id: 'pi-id',
                patientId,
                insuranceId,
                priority: 1,
                isActive: true,
                validFrom: null,
                validUntil: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]);

            const result = await service.validateCascadeConsistency(orderId);

            expect(result.isConsistent).toBe(true);
            expect(result.breakLevel).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 6.4, 6.5**
     *
     * When order PRIMARY doesn't match visit.insuranceId → breakLevel='ORDER'.
     */
    it('returns breakLevel=ORDER when order PRIMARY mismatches visit insurance', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbUuid,
          arbUuid,
          arbUuid,
          arbUuid,
          async (orderId, visitId, patientId, orderInsuranceId, visitInsuranceId) => {
            // Ensure they differ to exercise the mismatch case
            fc.pre(orderInsuranceId !== visitInsuranceId);

            // Order exists with visit relation
            (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
              id: orderId,
              visitId,
              visit: {
                id: visitId,
                patientId,
                insuranceId: visitInsuranceId,
              },
            });

            // OrderInsurance PRIMARY exists with different insurance than visit
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'oi-id',
              orderId,
              insuranceId: orderInsuranceId,
              coverageType: 'PRIMARY',
              claimStatus: 'PENDING',
              coveredAmount: null,
              copayAmount: null,
              memberNumber: null,
              migrationBatchId: null,
              submittedAt: null,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
              paidAt: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            const result = await service.validateCascadeConsistency(orderId);

            expect(result.isConsistent).toBe(false);
            expect(result.breakLevel).toBe('ORDER');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 6.4, 6.5**
     *
     * When visit.insuranceId not in patient active enrollments → breakLevel='VISIT'.
     */
    it('returns breakLevel=VISIT when visit insurance not in patient enrollments', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbUuid,
          arbUuid,
          arbUuid,
          arbUuid,
          async (orderId, visitId, patientId, sharedInsuranceId, otherInsuranceId) => {
            // Ensure the patient's active enrollments don't include the shared insurance
            fc.pre(sharedInsuranceId !== otherInsuranceId);

            // Order exists with visit relation — both use same insuranceId
            (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
              id: orderId,
              visitId,
              visit: {
                id: visitId,
                patientId,
                insuranceId: sharedInsuranceId,
              },
            });

            // OrderInsurance PRIMARY matches visit insurance
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'oi-id',
              orderId,
              insuranceId: sharedInsuranceId,
              coverageType: 'PRIMARY',
              claimStatus: 'PENDING',
              coveredAmount: null,
              copayAmount: null,
              memberNumber: null,
              migrationBatchId: null,
              submittedAt: null,
              approvedAt: null,
              rejectedAt: null,
              rejectionReason: null,
              paidAt: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // Patient's active enrollments do NOT include the shared insurance
            (prismaService.patientInsurance.findMany as jest.Mock).mockResolvedValue([
              {
                id: 'pi-id',
                patientId,
                insuranceId: otherInsuranceId,
                priority: 1,
                isActive: true,
                validFrom: null,
                validUntil: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]);

            const result = await service.validateCascadeConsistency(orderId);

            expect(result.isConsistent).toBe(false);
            expect(result.breakLevel).toBe('VISIT');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Patient insurance fallback from legacy FK', () => {
    /**
     * **Validates: Requirements 1.5, 8.5**
     *
     * When PatientInsurance junction with priority=1 exists,
     * resolvePatientInsuranceId returns the junction value.
     */
    it('returns junction insuranceId when priority=1 record exists', async () => {
      await fc.assert(
        fc.asyncProperty(arbUuid, arbUuid, async (patientId, junctionInsuranceId) => {
          // Junction record with priority=1 exists
          (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue({
            id: 'pi-id',
            patientId,
            insuranceId: junctionInsuranceId,
            priority: 1,
            isActive: true,
            validFrom: null,
            validUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            insurance: { id: junctionInsuranceId, name: 'Test Insurance' },
          });

          const result = await service.resolvePatientInsuranceId(patientId);

          expect(result).toBe(junctionInsuranceId);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 1.5, 8.5**
     *
     * When no junction record exists but Patient.insuranceId is set,
     * resolvePatientInsuranceId returns the legacy FK value.
     */
    it('returns legacy FK value when no junction record exists', async () => {
      await fc.assert(
        fc.asyncProperty(arbUuid, arbUuid, async (patientId, legacyInsuranceId) => {
          // No junction record with priority=1
          (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue(null);

          // Legacy FK exists
          (prismaService.patient.findUnique as jest.Mock).mockResolvedValue({
            insuranceId: legacyInsuranceId,
          });

          const result = await service.resolvePatientInsuranceId(patientId);

          expect(result).toBe(legacyInsuranceId);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 1.5, 8.5**
     *
     * When neither junction record nor Patient.insuranceId exists,
     * resolvePatientInsuranceId returns null.
     */
    it('returns null when neither junction nor legacy FK exists', async () => {
      await fc.assert(
        fc.asyncProperty(arbUuid, async (patientId) => {
          // No junction record
          (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue(null);

          // No legacy FK
          (prismaService.patient.findUnique as jest.Mock).mockResolvedValue({
            insuranceId: null,
          });

          const result = await service.resolvePatientInsuranceId(patientId);

          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 1.5, 8.5**
     *
     * Junction always takes priority over legacy FK — even when both exist,
     * the junction value is returned.
     */
    it('junction takes priority over legacy FK when both exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid,
          arbUuid,
          arbUuid,
          async (patientId, junctionInsuranceId, legacyInsuranceId) => {
            // Ensure they differ to prove junction takes precedence
            fc.pre(junctionInsuranceId !== legacyInsuranceId);

            // Junction record with priority=1 exists
            (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'pi-id',
              patientId,
              insuranceId: junctionInsuranceId,
              priority: 1,
              isActive: true,
              validFrom: null,
              validUntil: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              insurance: { id: junctionInsuranceId, name: 'Test Insurance' },
            });

            // Legacy FK also exists (should be ignored)
            (prismaService.patient.findUnique as jest.Mock).mockResolvedValue({
              insuranceId: legacyInsuranceId,
            });

            const result = await service.resolvePatientInsuranceId(patientId);

            // Junction takes priority
            expect(result).toBe(junctionInsuranceId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
