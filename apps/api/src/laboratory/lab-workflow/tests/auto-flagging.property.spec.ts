// Feature: laboratory-management, Property 1: Auto-Flagging Determinism

import * as fc from 'fast-check';
import { AutoFlaggingService } from '../auto-flagging.service';
import { Flag, Gender } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * **Validates: Requirements FR7.2, FR7.3, FR7.4, FR7.5, FR7.6**
 */
describe('Auto-Flagging Property Tests', () => {
  /**
   * Generate valid reference ranges with the constraint:
   * criticalMin ≤ minRef ≤ maxRef ≤ criticalMax
   *
   * Strategy: generate 4 sorted values to guarantee ordering.
   */
  const sortedRangeArb = fc
    .tuple(
      fc.double({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true }),
    )
    .map(([a, b, c, d]) => {
      const sorted = [a, b, c, d].sort((x, y) => x - y);
      return {
        criticalMin: sorted[0],
        minRef: sorted[1],
        maxRef: sorted[2],
        criticalMax: sorted[3],
      };
    });

  // Generate a result value within a specific zone
  const criticalLowArb = (criticalMin: number) =>
    fc.double({
      min: -1000,
      max: criticalMin - Number.EPSILON,
      noNaN: true,
      noDefaultInfinity: true,
    }).filter((v) => v < criticalMin);

  const lowArb = (criticalMin: number, minRef: number) =>
    fc.double({
      min: criticalMin,
      max: minRef - Number.EPSILON,
      noNaN: true,
      noDefaultInfinity: true,
    }).filter((v) => v >= criticalMin && v < minRef);

  const normalArb = (minRef: number, maxRef: number) =>
    fc.double({
      min: minRef,
      max: maxRef,
      noNaN: true,
      noDefaultInfinity: true,
    }).filter((v) => v >= minRef && v <= maxRef);

  const highArb = (maxRef: number, criticalMax: number) =>
    fc.double({
      min: maxRef + Number.EPSILON,
      max: criticalMax,
      noNaN: true,
      noDefaultInfinity: true,
    }).filter((v) => v > maxRef && v <= criticalMax);

  const criticalHighArb = (criticalMax: number) =>
    fc.double({
      min: criticalMax + Number.EPSILON,
      max: 2000,
      noNaN: true,
      noDefaultInfinity: true,
    }).filter((v) => v > criticalMax);

  /**
   * Helper: create a mock PrismaService that returns a reference with the given ranges.
   */
  function createServiceWithReference(ref: {
    criticalMin: number;
    minRef: number;
    maxRef: number;
    criticalMax: number;
  }): AutoFlaggingService {
    const mockPrisma = {
      referenceValue: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'ref-1',
            testId: 'test-1',
            gender: Gender.MALE,
            minAge: 0,
            maxAge: 150,
            minRef: new Decimal(ref.minRef),
            maxRef: new Decimal(ref.maxRef),
            criticalMin: new Decimal(ref.criticalMin),
            criticalMax: new Decimal(ref.criticalMax),
          },
        ]),
      },
    } as any;

    return new AutoFlaggingService(mockPrisma);
  }

  /**
   * Property 1: Auto-Flagging Determinism
   *
   * *For any* numeric result value and *for any* reference range
   * (minRef, maxRef, criticalMin, criticalMax) where criticalMin ≤ minRef
   * and criticalMax ≥ maxRef, the auto-flagging function SHALL produce
   * exactly one flag according to:
   * - CRITICAL if value < criticalMin or value > criticalMax
   * - LOW if value < minRef
   * - HIGH if value > maxRef
   * - otherwise NORMAL
   *
   * **Validates: Requirements FR7.2, FR7.3, FR7.4, FR7.5, FR7.6**
   */
  describe('Property 1: Auto-Flagging Determinism', () => {
    it('values below criticalMin produce CRITICAL flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedRangeArb.filter(
            (r) => r.criticalMin > -999, // ensure room below criticalMin
          ),
          async (range) => {
            // Generate a value strictly below criticalMin
            const resultValue = range.criticalMin - 1;
            const service = createServiceWithReference(range);
            const flag = await service.calculateFlag(
              resultValue,
              'test-1',
              30,
              Gender.MALE,
            );
            expect(flag).toBe(Flag.CRITICAL);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('values above criticalMax produce CRITICAL flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedRangeArb.filter(
            (r) => r.criticalMax < 1999, // ensure room above criticalMax
          ),
          async (range) => {
            // Generate a value strictly above criticalMax
            const resultValue = range.criticalMax + 1;
            const service = createServiceWithReference(range);
            const flag = await service.calculateFlag(
              resultValue,
              'test-1',
              30,
              Gender.MALE,
            );
            expect(flag).toBe(Flag.CRITICAL);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('values between criticalMin (inclusive) and minRef (exclusive) produce LOW flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedRangeArb.filter(
            (r) => r.minRef - r.criticalMin > 0.01, // ensure room in LOW zone
          ),
          async (range) => {
            // Pick a value in the LOW zone: criticalMin ≤ value < minRef
            const resultValue =
              range.criticalMin +
              (range.minRef - range.criticalMin) * 0.5;
            const service = createServiceWithReference(range);
            const flag = await service.calculateFlag(
              resultValue,
              'test-1',
              30,
              Gender.MALE,
            );
            expect(flag).toBe(Flag.LOW);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('values between maxRef (exclusive) and criticalMax (inclusive) produce HIGH flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedRangeArb.filter(
            (r) => r.criticalMax - r.maxRef > 0.01, // ensure room in HIGH zone
          ),
          async (range) => {
            // Pick a value in the HIGH zone: maxRef < value ≤ criticalMax
            const resultValue =
              range.maxRef + (range.criticalMax - range.maxRef) * 0.5;
            const service = createServiceWithReference(range);
            const flag = await service.calculateFlag(
              resultValue,
              'test-1',
              30,
              Gender.MALE,
            );
            expect(flag).toBe(Flag.HIGH);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('values within minRef to maxRef (inclusive) produce NORMAL flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedRangeArb,
          async (range) => {
            // Pick a value in the NORMAL zone: minRef ≤ value ≤ maxRef
            const resultValue =
              range.minRef + (range.maxRef - range.minRef) * 0.5;
            const service = createServiceWithReference(range);
            const flag = await service.calculateFlag(
              resultValue,
              'test-1',
              30,
              Gender.MALE,
            );
            expect(flag).toBe(Flag.NORMAL);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('exactly one flag is produced for any arbitrary result value', async () => {
      await fc.assert(
        fc.asyncProperty(
          sortedRangeArb,
          fc.double({ min: -1000, max: 2000, noNaN: true, noDefaultInfinity: true }),
          async (range, resultValue) => {
            const service = createServiceWithReference(range);
            const flag = await service.calculateFlag(
              resultValue,
              'test-1',
              30,
              Gender.MALE,
            );

            // Exactly one flag must be produced (never null when reference exists)
            expect(flag).not.toBeNull();
            expect([Flag.NORMAL, Flag.LOW, Flag.HIGH, Flag.CRITICAL]).toContain(
              flag,
            );

            // Verify the flag matches the expected zone
            if (resultValue < range.criticalMin) {
              expect(flag).toBe(Flag.CRITICAL);
            } else if (resultValue > range.criticalMax) {
              expect(flag).toBe(Flag.CRITICAL);
            } else if (resultValue < range.minRef) {
              expect(flag).toBe(Flag.LOW);
            } else if (resultValue > range.maxRef) {
              expect(flag).toBe(Flag.HIGH);
            } else {
              expect(flag).toBe(Flag.NORMAL);
            }
          },
        ),
        { numRuns: 500 },
      );
    });
  });
});
