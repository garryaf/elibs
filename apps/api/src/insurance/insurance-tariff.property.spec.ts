// Feature: insurance-source-consolidation, Property 6: Tariff resolution uses OrderInsurance PRIMARY

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TariffResolverService } from '../laboratory/order/tariff-resolver.service';
import { InsuranceConsolidationService } from './insurance-consolidation.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * **Validates: Requirements 2.3**
 *
 * Property 6: Tariff resolution uses OrderInsurance PRIMARY
 *
 * For any order that has an OrderInsurance record with coverageType = PRIMARY,
 * the TariffResolverService SHALL use that record's insuranceId for pricing
 * resolution rather than Order.insuranceId.
 */
describe('TariffResolverService Property Tests - Property 6', () => {
  let tariffResolver: TariffResolverService;
  let consolidationService: InsuranceConsolidationService;
  let prismaService: any;
  let loggerWarnSpy: jest.SpyInstance;

  // --- Arbitraries ---
  const arbUuid = fc.uuid().map((v) => v.toString());
  const arbPrice = fc.integer({ min: 1000, max: 10000000 }).map((n) => new Decimal(n));
  const arbDiscount = fc.integer({ min: 0, max: 100 }).map((n) => new Decimal(n));

  beforeEach(async () => {
    const mockPrisma = {
      tariff: {
        findFirst: jest.fn(),
      },
      testMaster: {
        findFirst: jest.fn(),
      },
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
        TariffResolverService,
        InsuranceConsolidationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    tariffResolver = module.get<TariffResolverService>(TariffResolverService);
    consolidationService = module.get<InsuranceConsolidationService>(
      InsuranceConsolidationService,
    );
    prismaService = module.get<PrismaService>(PrismaService);

    // Spy on logger warn to verify deprecation logging
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
  });

  describe('Property 6: Tariff resolution uses OrderInsurance PRIMARY', () => {
    /**
     * **Validates: Requirements 2.3**
     *
     * For any order with an OrderInsurance PRIMARY record,
     * resolveOrderTotalForOrder SHALL use the junction insuranceId
     * for tariff lookup — NOT Order.insuranceId.
     */
    it('uses junction insuranceId (not legacy FK) when OrderInsurance PRIMARY exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid, // orderId
          arbUuid, // junctionInsuranceId (from OrderInsurance PRIMARY)
          arbUuid, // legacyInsuranceId (from Order.insuranceId — should NOT be used)
          fc.array(arbUuid, { minLength: 1, maxLength: 3 }), // testIds
          fc.option(arbUuid, { nil: undefined }), // clinicId
          arbPrice, // tariff price
          arbDiscount, // tariff discount
          async (
            orderId,
            junctionInsuranceId,
            legacyInsuranceId,
            testIds,
            clinicId,
            price,
            discount,
          ) => {
            // Ensure junction and legacy differ so we can verify which is used
            fc.pre(junctionInsuranceId !== legacyInsuranceId);

            // Mock: getOrderPrimaryInsurance returns junction source
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'oi-id',
              orderId,
              insuranceId: junctionInsuranceId,
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

            // Mock: tariff lookup returns a tariff for the junction insuranceId
            (prismaService.tariff.findFirst as jest.Mock).mockImplementation(
              async ({ where }: { where: any }) => {
                // Return tariff only when queried with junctionInsuranceId
                if (where.insuranceId === junctionInsuranceId) {
                  return {
                    id: 'tariff-id',
                    testId: where.testId,
                    clinicId: where.clinicId ?? null,
                    insuranceId: junctionInsuranceId,
                    price,
                    discount,
                  };
                }
                return null;
              },
            );

            // Mock: testMaster fallback (in case tariff not found for some resolution levels)
            (prismaService.testMaster.findFirst as jest.Mock).mockImplementation(
              async ({ where }: { where: any }) => ({
                id: where.id,
                price: new Decimal(50000),
              }),
            );

            const result = await tariffResolver.resolveOrderTotalForOrder(
              orderId,
              testIds,
              clinicId,
            );

            // Verify: the resolver produced results
            expect(result.items).toHaveLength(testIds.length);

            // Verify: no deprecation warning was logged (junction path used)
            const deprecationCalls = loggerWarnSpy.mock.calls.filter(
              (call) =>
                typeof call[0] === 'string' &&
                call[0].includes('[DEPRECATED]'),
            );
            expect(deprecationCalls).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.3**
     *
     * When OrderInsurance PRIMARY exists, the tariff is resolved using
     * the junction insuranceId and the result reflects insurance-specific pricing.
     */
    it('tariff pricing reflects the junction insuranceId, not the legacy FK', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid, // orderId
          arbUuid, // junctionInsuranceId
          arbUuid, // testId
          fc.option(arbUuid, { nil: undefined }), // clinicId
          arbPrice, // price for junction insurance tariff
          arbDiscount, // discount for junction insurance tariff
          async (orderId, junctionInsuranceId, testId, clinicId, price, discount) => {
            // Mock: getOrderPrimaryInsurance returns junction source
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'oi-id',
              orderId,
              insuranceId: junctionInsuranceId,
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

            // Mock: specific tariff for junction insuranceId
            (prismaService.tariff.findFirst as jest.Mock).mockImplementation(
              async ({ where }: { where: any }) => {
                if (where.insuranceId === junctionInsuranceId) {
                  return {
                    id: 'tariff-specific',
                    testId: where.testId,
                    clinicId: where.clinicId ?? null,
                    insuranceId: junctionInsuranceId,
                    price,
                    discount,
                  };
                }
                return null;
              },
            );

            const result = await tariffResolver.resolveOrderTotalForOrder(
              orderId,
              [testId],
              clinicId,
            );

            // Verify: pricing matches the junction insurance tariff
            expect(result.items).toHaveLength(1);
            const item = result.items[0];
            expect(item.tariff.basePrice).toBe(Number(price));
            expect(item.tariff.discount).toBe(Number(discount));

            const expectedFinalPrice = Number(price) * (1 - Number(discount) / 100);
            expect(item.tariff.finalPrice).toBeCloseTo(expectedFinalPrice);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.3**
     *
     * Fallback case: When no OrderInsurance PRIMARY exists and Order.insuranceId
     * is used, the system SHALL log a deprecation warning.
     */
    it('logs deprecation warning when falling back to legacy Order.insuranceId', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid, // orderId
          arbUuid, // legacyInsuranceId
          fc.array(arbUuid, { minLength: 1, maxLength: 3 }), // testIds
          fc.option(arbUuid, { nil: undefined }), // clinicId
          async (orderId, legacyInsuranceId, testIds, clinicId) => {
            // Reset spy for each iteration
            loggerWarnSpy.mockClear();

            // Mock: no OrderInsurance PRIMARY record
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue(null);

            // Mock: Order.insuranceId exists (legacy FK)
            (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
              insuranceId: legacyInsuranceId,
            });

            // Mock: tariff lookup (return null so it falls through to testMaster)
            (prismaService.tariff.findFirst as jest.Mock).mockResolvedValue(null);

            // Mock: testMaster fallback
            (prismaService.testMaster.findFirst as jest.Mock).mockImplementation(
              async ({ where }: { where: any }) => ({
                id: where.id,
                price: new Decimal(50000),
              }),
            );

            const result = await tariffResolver.resolveOrderTotalForOrder(
              orderId,
              testIds,
              clinicId,
            );

            // Verify: result was produced
            expect(result.items).toHaveLength(testIds.length);

            // Verify: deprecation warning was logged
            const deprecationCalls = loggerWarnSpy.mock.calls.filter(
              (call) =>
                typeof call[0] === 'string' &&
                call[0].includes('[DEPRECATED]') &&
                call[0].includes(orderId),
            );
            expect(deprecationCalls.length).toBeGreaterThanOrEqual(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.3**
     *
     * The resolveOrderTotalForOrder method delegates to resolveOrderTotal
     * with the resolved insuranceId from the junction, not the legacy FK.
     */
    it('delegates to resolveOrderTotal with junction insuranceId', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbUuid, // orderId
          arbUuid, // junctionInsuranceId
          arbUuid, // testId
          fc.option(arbUuid, { nil: undefined }), // clinicId
          async (orderId, junctionInsuranceId, testId, clinicId) => {
            // Spy on resolveOrderTotal to capture arguments
            const resolveOrderTotalSpy = jest.spyOn(tariffResolver, 'resolveOrderTotal');

            // Mock: getOrderPrimaryInsurance returns junction source
            (prismaService.orderInsurance.findFirst as jest.Mock).mockResolvedValue({
              id: 'oi-id',
              orderId,
              insuranceId: junctionInsuranceId,
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

            // Mock: tariff returns null, fallback to testMaster
            (prismaService.tariff.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaService.testMaster.findFirst as jest.Mock).mockResolvedValue({
              id: testId,
              price: new Decimal(75000),
            });

            await tariffResolver.resolveOrderTotalForOrder(orderId, [testId], clinicId);

            // Verify: resolveOrderTotal was called with the junction insuranceId
            expect(resolveOrderTotalSpy).toHaveBeenCalledWith(
              [testId],
              clinicId,
              junctionInsuranceId,
            );

            resolveOrderTotalSpy.mockRestore();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
