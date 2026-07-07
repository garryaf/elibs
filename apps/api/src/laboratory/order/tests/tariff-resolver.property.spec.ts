// Feature: laboratory-management, Property 3: Tariff Resolution Priority
// Feature: laboratory-management, Property 4: Order Total Equals Sum of Parts

import * as fc from 'fast-check';
import { TariffResolverService } from '../tariff-resolver.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * **Validates: Requirements FR2.4, FR4.3**
 */
describe('Tariff Resolver Property Tests', () => {
  /**
   * Property 3: Tariff Resolution Priority
   *
   * *For any* test with multiple tariff records at different specificity levels,
   * the tariff resolver SHALL always return the most specific match: specific
   * (clinic+insurance) takes priority over clinic-only, which takes priority over
   * insurance-only, which takes priority over default.
   *
   * **Validates: Requirements FR2.4**
   */
  describe('Property 3: Tariff Resolution Priority', () => {
    it('SPECIFIC tariff always wins when present, regardless of other levels', () => {
      const priceArb = fc.float({ min: 1, max: 100000, noNaN: true });
      const discountArb = fc.float({ min: 0, max: 100, noNaN: true });

      fc.assert(
        fc.asyncProperty(
          priceArb,
          discountArb,
          priceArb,
          discountArb,
          priceArb,
          discountArb,
          priceArb,
          discountArb,
          async (
            specificPrice,
            specificDiscount,
            clinicPrice,
            clinicDiscount,
            insurancePrice,
            insuranceDiscount,
            defaultPrice,
            defaultDiscount,
          ) => {
            const testId = 'test-1';
            const clinicId = 'clinic-1';
            const insuranceId = 'insurance-1';

            // Mock prisma to return tariffs at all levels
            const mockPrisma = {
              tariff: {
                findFirst: jest.fn().mockImplementation(({ where }) => {
                  if (
                    where.clinicId === clinicId &&
                    where.insuranceId === insuranceId
                  ) {
                    return Promise.resolve({
                      id: 'tariff-specific',
                      price: new Decimal(specificPrice),
                      discount: new Decimal(specificDiscount),
                    });
                  }
                  if (
                    where.clinicId === clinicId &&
                    where.insuranceId === null
                  ) {
                    return Promise.resolve({
                      id: 'tariff-clinic',
                      price: new Decimal(clinicPrice),
                      discount: new Decimal(clinicDiscount),
                    });
                  }
                  if (
                    where.clinicId === null &&
                    where.insuranceId === insuranceId
                  ) {
                    return Promise.resolve({
                      id: 'tariff-insurance',
                      price: new Decimal(insurancePrice),
                      discount: new Decimal(insuranceDiscount),
                    });
                  }
                  if (
                    where.clinicId === null &&
                    where.insuranceId === null
                  ) {
                    return Promise.resolve({
                      id: 'tariff-default',
                      price: new Decimal(defaultPrice),
                      discount: new Decimal(defaultDiscount),
                    });
                  }
                  return Promise.resolve(null);
                }),
              },
              testMaster: {
                findFirst: jest.fn(),
              },
            };

            const service = new TariffResolverService(mockPrisma as any);
            const result = await service.resolvePrice(
              testId,
              clinicId,
              insuranceId,
            );

            // SPECIFIC must always win
            expect(result.resolution).toBe('SPECIFIC');
            expect(result.tariffId).toBe('tariff-specific');
            expect(result.basePrice).toBeCloseTo(specificPrice, 4);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('CLINIC_ONLY wins when no SPECIFIC tariff exists', () => {
      const priceArb = fc.float({ min: 1, max: 100000, noNaN: true });
      const discountArb = fc.float({ min: 0, max: 100, noNaN: true });

      fc.assert(
        fc.asyncProperty(
          priceArb,
          discountArb,
          priceArb,
          discountArb,
          priceArb,
          discountArb,
          async (
            clinicPrice,
            clinicDiscount,
            insurancePrice,
            insuranceDiscount,
            defaultPrice,
            defaultDiscount,
          ) => {
            const testId = 'test-1';
            const clinicId = 'clinic-1';
            const insuranceId = 'insurance-1';

            const mockPrisma = {
              tariff: {
                findFirst: jest.fn().mockImplementation(({ where }) => {
                  // No SPECIFIC tariff
                  if (
                    where.clinicId === clinicId &&
                    where.insuranceId === insuranceId
                  ) {
                    return Promise.resolve(null);
                  }
                  if (
                    where.clinicId === clinicId &&
                    where.insuranceId === null
                  ) {
                    return Promise.resolve({
                      id: 'tariff-clinic',
                      price: new Decimal(clinicPrice),
                      discount: new Decimal(clinicDiscount),
                    });
                  }
                  if (
                    where.clinicId === null &&
                    where.insuranceId === insuranceId
                  ) {
                    return Promise.resolve({
                      id: 'tariff-insurance',
                      price: new Decimal(insurancePrice),
                      discount: new Decimal(insuranceDiscount),
                    });
                  }
                  if (
                    where.clinicId === null &&
                    where.insuranceId === null
                  ) {
                    return Promise.resolve({
                      id: 'tariff-default',
                      price: new Decimal(defaultPrice),
                      discount: new Decimal(defaultDiscount),
                    });
                  }
                  return Promise.resolve(null);
                }),
              },
              testMaster: {
                findFirst: jest.fn(),
              },
            };

            const service = new TariffResolverService(mockPrisma as any);
            const result = await service.resolvePrice(
              testId,
              clinicId,
              insuranceId,
            );

            // CLINIC_ONLY must win
            expect(result.resolution).toBe('CLINIC_ONLY');
            expect(result.tariffId).toBe('tariff-clinic');
            expect(result.basePrice).toBeCloseTo(clinicPrice, 4);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('INSURANCE_ONLY wins when no SPECIFIC or CLINIC_ONLY tariff exists', () => {
      const priceArb = fc.float({ min: 1, max: 100000, noNaN: true });
      const discountArb = fc.float({ min: 0, max: 100, noNaN: true });

      fc.assert(
        fc.asyncProperty(
          priceArb,
          discountArb,
          priceArb,
          discountArb,
          async (
            insurancePrice,
            insuranceDiscount,
            defaultPrice,
            defaultDiscount,
          ) => {
            const testId = 'test-1';
            const clinicId = 'clinic-1';
            const insuranceId = 'insurance-1';

            const mockPrisma = {
              tariff: {
                findFirst: jest.fn().mockImplementation(({ where }) => {
                  // No SPECIFIC tariff
                  if (
                    where.clinicId === clinicId &&
                    where.insuranceId === insuranceId
                  ) {
                    return Promise.resolve(null);
                  }
                  // No CLINIC_ONLY tariff
                  if (
                    where.clinicId === clinicId &&
                    where.insuranceId === null
                  ) {
                    return Promise.resolve(null);
                  }
                  if (
                    where.clinicId === null &&
                    where.insuranceId === insuranceId
                  ) {
                    return Promise.resolve({
                      id: 'tariff-insurance',
                      price: new Decimal(insurancePrice),
                      discount: new Decimal(insuranceDiscount),
                    });
                  }
                  if (
                    where.clinicId === null &&
                    where.insuranceId === null
                  ) {
                    return Promise.resolve({
                      id: 'tariff-default',
                      price: new Decimal(defaultPrice),
                      discount: new Decimal(defaultDiscount),
                    });
                  }
                  return Promise.resolve(null);
                }),
              },
              testMaster: {
                findFirst: jest.fn(),
              },
            };

            const service = new TariffResolverService(mockPrisma as any);
            const result = await service.resolvePrice(
              testId,
              clinicId,
              insuranceId,
            );

            // INSURANCE_ONLY must win
            expect(result.resolution).toBe('INSURANCE_ONLY');
            expect(result.tariffId).toBe('tariff-insurance');
            expect(result.basePrice).toBeCloseTo(insurancePrice, 4);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('DEFAULT wins when no SPECIFIC, CLINIC_ONLY, or INSURANCE_ONLY tariff exists', () => {
      const priceArb = fc.float({ min: 1, max: 100000, noNaN: true });
      const discountArb = fc.float({ min: 0, max: 100, noNaN: true });

      fc.assert(
        fc.asyncProperty(priceArb, discountArb, async (defaultPrice, defaultDiscount) => {
          const testId = 'test-1';
          const clinicId = 'clinic-1';
          const insuranceId = 'insurance-1';

          const mockPrisma = {
            tariff: {
              findFirst: jest.fn().mockImplementation(({ where }) => {
                // Only DEFAULT exists
                if (where.clinicId === null && where.insuranceId === null) {
                  return Promise.resolve({
                    id: 'tariff-default',
                    price: new Decimal(defaultPrice),
                    discount: new Decimal(defaultDiscount),
                  });
                }
                return Promise.resolve(null);
              }),
            },
            testMaster: {
              findFirst: jest.fn(),
            },
          };

          const service = new TariffResolverService(mockPrisma as any);
          const result = await service.resolvePrice(
            testId,
            clinicId,
            insuranceId,
          );

          // DEFAULT must win
          expect(result.resolution).toBe('DEFAULT');
          expect(result.tariffId).toBe('tariff-default');
          expect(result.basePrice).toBeCloseTo(defaultPrice, 4);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Order Total Equals Sum of Parts
   *
   * *For any* set of test IDs with resolved tariffs, the order totalAmount SHALL
   * equal the sum of all individual OrderDetail finalPrice values (where
   * finalPrice = tariffPrice × (1 - discount/100)).
   *
   * **Validates: Requirements FR4.3**
   */
  describe('Property 4: Order Total Equals Sum of Parts', () => {
    it('totalAmount === sum of all item finalPrice values', () => {
      // Generate 1-10 test items, each with a price and discount
      const testItemArb = fc.record({
        price: fc.float({ min: 1, max: 100000, noNaN: true }),
        discount: fc.float({ min: 0, max: 100, noNaN: true }),
      });

      const testItemsArb = fc.array(testItemArb, { minLength: 1, maxLength: 10 });

      fc.assert(
        fc.asyncProperty(testItemsArb, async (testItems) => {
          const testIds = testItems.map((_, i) => `test-${i}`);

          const mockPrisma = {
            tariff: {
              findFirst: jest.fn().mockImplementation(({ where }) => {
                const index = testIds.indexOf(where.testId);
                if (index === -1) return Promise.resolve(null);

                // Return a DEFAULT tariff for each test
                return Promise.resolve({
                  id: `tariff-${index}`,
                  price: new Decimal(testItems[index].price),
                  discount: new Decimal(testItems[index].discount),
                });
              }),
            },
            testMaster: {
              findFirst: jest.fn(),
            },
          };

          const service = new TariffResolverService(mockPrisma as any);
          const result = await service.resolveOrderTotal(testIds);

          // Verify totalAmount === sum of all item finalPrice values
          const expectedTotalAmount = result.items.reduce(
            (sum, item) => sum + item.tariff.finalPrice,
            0,
          );
          expect(result.totalAmount).toBeCloseTo(expectedTotalAmount, 8);

          // Verify subtotal === sum of all item basePrice values
          const expectedSubtotal = result.items.reduce(
            (sum, item) => sum + item.tariff.basePrice,
            0,
          );
          expect(result.subtotal).toBeCloseTo(expectedSubtotal, 8);

          // Verify totalDiscount === subtotal - totalAmount
          expect(result.totalDiscount).toBeCloseTo(
            result.subtotal - result.totalAmount,
            8,
          );
        }),
        { numRuns: 100 },
      );
    });

    it('each item finalPrice === basePrice * (1 - discount/100)', () => {
      const testItemArb = fc.record({
        price: fc.float({ min: 1, max: 100000, noNaN: true }),
        discount: fc.float({ min: 0, max: 100, noNaN: true }),
      });

      const testItemsArb = fc.array(testItemArb, { minLength: 1, maxLength: 10 });

      fc.assert(
        fc.asyncProperty(testItemsArb, async (testItems) => {
          const testIds = testItems.map((_, i) => `test-${i}`);

          const mockPrisma = {
            tariff: {
              findFirst: jest.fn().mockImplementation(({ where }) => {
                const index = testIds.indexOf(where.testId);
                if (index === -1) return Promise.resolve(null);

                return Promise.resolve({
                  id: `tariff-${index}`,
                  price: new Decimal(testItems[index].price),
                  discount: new Decimal(testItems[index].discount),
                });
              }),
            },
            testMaster: {
              findFirst: jest.fn(),
            },
          };

          const service = new TariffResolverService(mockPrisma as any);
          const result = await service.resolveOrderTotal(testIds);

          // Verify each item's finalPrice matches the formula
          for (let i = 0; i < result.items.length; i++) {
            const item = result.items[i];
            const expectedFinalPrice =
              item.tariff.basePrice * (1 - item.tariff.discount / 100);
            expect(item.tariff.finalPrice).toBeCloseTo(expectedFinalPrice, 8);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
