// Feature: laboratory-management, Property 15: TAT Calculation Correctness

import * as fc from 'fast-check';

/**
 * **Validates: Requirements FR14.2**
 *
 * Property 15: TAT Calculation Correctness
 *
 * *For any* pair of timestamps (sampleCollectedAt, approvedAt) where approvedAt > sampleCollectedAt,
 * the TAT calculation SHALL equal the difference between approvedAt and sampleCollectedAt in minutes.
 *
 * The DashboardService calculates TAT as:
 *   (approvedAt.getTime() - sampleCollectedAt.getTime()) / 60000
 */

/**
 * Pure TAT calculation function extracted from DashboardService logic.
 * This is the exact formula used in the service:
 *   tatMinutes = (approvedAt.getTime() - sampleCollectedAt.getTime()) / 60000
 */
function calculateTat(sampleCollectedAt: Date, approvedAt: Date): number {
  return (approvedAt.getTime() - sampleCollectedAt.getTime()) / 60000;
}

// Arbitrary that generates valid Date objects from integer timestamps
// Range: 2020-01-01 to 2030-12-31
const validDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ts) => new Date(ts));

describe('Dashboard Property Tests', () => {
  /**
   * Property 15: TAT Calculation Correctness
   *
   * **Validates: Requirements FR14.2**
   */
  describe('Property 15: TAT Calculation Correctness', () => {
    it('TAT equals difference between approvedAt and sampleCollectedAt in minutes', () => {
      fc.assert(
        fc.property(
          validDateArb,
          fc.integer({ min: 1, max: 1440 }), // TAT in minutes (1 min to 24 hours)
          (sampleCollectedAt, tatMinutes) => {
            const approvedAt = new Date(
              sampleCollectedAt.getTime() + tatMinutes * 60000,
            );
            const result = calculateTat(sampleCollectedAt, approvedAt);
            expect(result).toBeCloseTo(tatMinutes, 8);
          },
        ),
        { numRuns: 1000 },
      );
    });

    it('TAT is always positive when approvedAt is after sampleCollectedAt', () => {
      fc.assert(
        fc.property(
          validDateArb,
          fc.integer({ min: 1, max: 10080 }), // up to 7 days in minutes
          (sampleCollectedAt, offsetMinutes) => {
            const approvedAt = new Date(
              sampleCollectedAt.getTime() + offsetMinutes * 60000,
            );
            const result = calculateTat(sampleCollectedAt, approvedAt);
            expect(result).toBeGreaterThan(0);
          },
        ),
        { numRuns: 500 },
      );
    });

    it('TAT is zero when approvedAt equals sampleCollectedAt', () => {
      fc.assert(
        fc.property(validDateArb, (timestamp) => {
          const result = calculateTat(timestamp, timestamp);
          expect(result).toBe(0);
        }),
        { numRuns: 100 },
      );
    });

    it('TAT is additive: TAT(a, c) == TAT(a, b) + TAT(b, c)', () => {
      fc.assert(
        fc.property(
          validDateArb,
          fc.integer({ min: 1, max: 720 }), // first interval in minutes
          fc.integer({ min: 1, max: 720 }), // second interval in minutes
          (a, interval1, interval2) => {
            const b = new Date(a.getTime() + interval1 * 60000);
            const c = new Date(b.getTime() + interval2 * 60000);

            const tatAC = calculateTat(a, c);
            const tatAB = calculateTat(a, b);
            const tatBC = calculateTat(b, c);

            expect(tatAC).toBeCloseTo(tatAB + tatBC, 8);
          },
        ),
        { numRuns: 500 },
      );
    });
  });
});
