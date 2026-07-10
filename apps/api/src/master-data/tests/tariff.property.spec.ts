// Feature: laboratory-management, Property 8: Discount Range Validation

import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateTariffDto } from '../dto/create-tariff.dto';

/**
 * **Validates: Requirements FR2.6**
 */
describe('Tariff Property Tests', () => {
  /**
   * Property 8: Discount Range Validation
   *
   * *For any* numeric value V supplied as the discount field of CreateTariffDto,
   * the validator SHALL accept V iff 0 ≤ V ≤ 100.
   *
   * **Validates: Requirements FR2.6**
   */
  describe('Property 8: Discount Range Validation', () => {
    const validBaseDto = {
      testId: '550e8400-e29b-41d4-a716-446655440000',
      price: 50000,
    };

    it('should accept discount values between 0 and 100 inclusive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: 0, max: 100, noNaN: true }),
          async (discount) => {
            const dto = plainToInstance(CreateTariffDto, {
              ...validBaseDto,
              discount,
            });

            const errors = await validate(dto);
            const discountErrors = errors.filter(
              (e) => e.property === 'discount',
            );

            expect(discountErrors).toHaveLength(0);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should reject discount values below 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({
            min: -1e10,
            max: -0.0000001,
            noNaN: true,
          }),
          async (discount) => {
            const dto = plainToInstance(CreateTariffDto, {
              ...validBaseDto,
              discount,
            });

            const errors = await validate(dto);
            const discountErrors = errors.filter(
              (e) => e.property === 'discount',
            );

            expect(discountErrors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should reject discount values above 100', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({
            min: 100.0000001,
            max: 1e10,
            noNaN: true,
          }),
          async (discount) => {
            const dto = plainToInstance(CreateTariffDto, {
              ...validBaseDto,
              discount,
            });

            const errors = await validate(dto);
            const discountErrors = errors.filter(
              (e) => e.property === 'discount',
            );

            expect(discountErrors.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
