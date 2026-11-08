// Feature: lis-gap-remediation, Property 3: Auto-flagging correctness

import * as fc from 'fast-check';
import { applyAutoFlag, ResultFlag, ReferenceRange } from '../auto-flagging';

/**
 * **Validates: Requirements 2.7, 3.1**
 *
 * Property 3: Auto-flagging correctness
 *
 * For any numeric result value and configured reference ranges (minRef, maxRef,
 * criticalMin, criticalMax), the auto-flagging function SHALL produce:
 * - NORMAL when value is between minRef and maxRef (inclusive)
 * - HIGH when value > maxRef and value <= criticalMax (or no criticalMax)
 * - LOW when value < minRef and value >= criticalMin (or no criticalMin)
 * - CRITICAL when value > criticalMax or value < criticalMin
 */
describe('Auto-flagging Correctness Property Tests', () => {
  // Generator for valid reference ranges where minRef <= maxRef
  // and criticalMin <= minRef, criticalMax >= maxRef when present
  const referenceRangeArb: fc.Arbitrary<ReferenceRange> = fc
    .tuple(
      fc.double({
        min: -10000,
        max: 10000,
        noNaN: true,
        noDefaultInfinity: true,
      }),
      fc.double({ min: 0.01, max: 5000, noNaN: true, noDefaultInfinity: true }),
    )
    .chain(([base, spread]) => {
      const minRef = base;
      const maxRef = base + spread; // ensures maxRef > minRef
      return fc
        .tuple(
          fc.option(
            fc.double({
              min: 0.01,
              max: 5000,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            { nil: undefined },
          ),
          fc.option(
            fc.double({
              min: 0.01,
              max: 5000,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            { nil: undefined },
          ),
        )
        .map(([criticalLowSpread, criticalHighSpread]) => {
          const range: ReferenceRange = { minRef, maxRef };
          if (criticalLowSpread !== undefined) {
            range.criticalMin = minRef - criticalLowSpread; // criticalMin < minRef
          }
          if (criticalHighSpread !== undefined) {
            range.criticalMax = maxRef + criticalHighSpread; // criticalMax > maxRef
          }
          return range;
        });
    });

  // Generator for result values (wide range to hit all flag categories)
  const resultValueArb = fc.double({
    min: -20000,
    max: 20000,
    noNaN: true,
    noDefaultInfinity: true,
  });

  describe('Property 3: Auto-flagging correctness', () => {
    /**
     * NORMAL: value within [minRef, maxRef] inclusive SHALL produce NORMAL flag.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces NORMAL when value is within [minRef, maxRef] inclusive', () => {
      fc.assert(
        fc.property(referenceRangeArb, (range) => {
          // Generate a value strictly within normal range
          const { minRef, maxRef } = range;
          // Test at boundaries and midpoint
          expect(applyAutoFlag(minRef, range)).toBe(ResultFlag.NORMAL);
          expect(applyAutoFlag(maxRef, range)).toBe(ResultFlag.NORMAL);
          const midpoint = (minRef + maxRef) / 2;
          expect(applyAutoFlag(midpoint, range)).toBe(ResultFlag.NORMAL);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * NORMAL with arbitrary values: any value in [minRef, maxRef] SHALL produce NORMAL.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces NORMAL for any value in [minRef, maxRef]', () => {
      fc.assert(
        fc.property(
          referenceRangeArb.chain((range) =>
            fc
              .double({
                min: range.minRef,
                max: range.maxRef,
                noNaN: true,
                noDefaultInfinity: true,
              })
              .map((value) => ({ value, range })),
          ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.NORMAL);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * HIGH: value > maxRef and <= criticalMax (or no criticalMax) SHALL produce HIGH.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces HIGH when value > maxRef and within critical high bound', () => {
      fc.assert(
        fc.property(
          referenceRangeArb
            .filter((r) => r.criticalMax !== undefined)
            .chain((range) =>
              fc
                .double({
                  min: range.maxRef + 0.001,
                  max: range.criticalMax!,
                  noNaN: true,
                  noDefaultInfinity: true,
                })
                .filter((v) => v > range.maxRef && v <= range.criticalMax!)
                .map((value) => ({ value, range })),
            ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.HIGH);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * HIGH without criticalMax: any value > maxRef SHALL produce HIGH when no criticalMax.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces HIGH for value > maxRef when no criticalMax configured', () => {
      fc.assert(
        fc.property(
          referenceRangeArb
            .map((r) => ({ ...r, criticalMax: undefined }))
            .chain((range) =>
              fc
                .double({
                  min: range.maxRef + 0.001,
                  max: range.maxRef + 10000,
                  noNaN: true,
                  noDefaultInfinity: true,
                })
                .filter((v) => v > range.maxRef)
                .map((value) => ({ value, range })),
            ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.HIGH);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * LOW: value < minRef and >= criticalMin (or no criticalMin) SHALL produce LOW.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces LOW when value < minRef and within critical low bound', () => {
      fc.assert(
        fc.property(
          referenceRangeArb
            .filter((r) => r.criticalMin !== undefined)
            .chain((range) =>
              fc
                .double({
                  min: range.criticalMin!,
                  max: range.minRef - 0.001,
                  noNaN: true,
                  noDefaultInfinity: true,
                })
                .filter((v) => v < range.minRef && v >= range.criticalMin!)
                .map((value) => ({ value, range })),
            ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.LOW);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * LOW without criticalMin: any value < minRef SHALL produce LOW when no criticalMin.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces LOW for value < minRef when no criticalMin configured', () => {
      fc.assert(
        fc.property(
          referenceRangeArb
            .map((r) => ({ ...r, criticalMin: undefined }))
            .chain((range) =>
              fc
                .double({
                  min: range.minRef - 10000,
                  max: range.minRef - 0.001,
                  noNaN: true,
                  noDefaultInfinity: true,
                })
                .filter((v) => v < range.minRef)
                .map((value) => ({ value, range })),
            ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.LOW);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * CRITICAL HIGH: value > criticalMax SHALL produce CRITICAL.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces CRITICAL when value > criticalMax', () => {
      fc.assert(
        fc.property(
          referenceRangeArb
            .filter((r) => r.criticalMax !== undefined)
            .chain((range) =>
              fc
                .double({
                  min: range.criticalMax! + 0.001,
                  max: range.criticalMax! + 10000,
                  noNaN: true,
                  noDefaultInfinity: true,
                })
                .filter((v) => v > range.criticalMax!)
                .map((value) => ({ value, range })),
            ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.CRITICAL);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * CRITICAL LOW: value < criticalMin SHALL produce CRITICAL.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('produces CRITICAL when value < criticalMin', () => {
      fc.assert(
        fc.property(
          referenceRangeArb
            .filter((r) => r.criticalMin !== undefined)
            .chain((range) =>
              fc
                .double({
                  min: range.criticalMin! - 10000,
                  max: range.criticalMin! - 0.001,
                  noNaN: true,
                  noDefaultInfinity: true,
                })
                .filter((v) => v < range.criticalMin!)
                .map((value) => ({ value, range })),
            ),
          ({ value, range }) => {
            expect(applyAutoFlag(value, range)).toBe(ResultFlag.CRITICAL);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Exhaustive partition: for any value and valid range, the result is always
     * one of the four valid flags (NORMAL, HIGH, LOW, CRITICAL).
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('always produces one of the four valid flags for any value and range', () => {
      fc.assert(
        fc.property(resultValueArb, referenceRangeArb, (value, range) => {
          const flag = applyAutoFlag(value, range);
          expect([
            ResultFlag.NORMAL,
            ResultFlag.HIGH,
            ResultFlag.LOW,
            ResultFlag.CRITICAL,
          ]).toContain(flag);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * Consistency: the flag categories form a complete partition of the number line.
     * Given any value and range, exactly one category applies.
     *
     * **Validates: Requirements 2.7, 3.1**
     */
    it('flag assignment is consistent with range boundaries', () => {
      fc.assert(
        fc.property(resultValueArb, referenceRangeArb, (value, range) => {
          const flag = applyAutoFlag(value, range);
          const { minRef, maxRef, criticalMin, criticalMax } = range;

          switch (flag) {
            case ResultFlag.NORMAL:
              expect(value).toBeGreaterThanOrEqual(minRef);
              expect(value).toBeLessThanOrEqual(maxRef);
              break;
            case ResultFlag.HIGH:
              expect(value).toBeGreaterThan(maxRef);
              if (criticalMax !== undefined) {
                expect(value).toBeLessThanOrEqual(criticalMax);
              }
              break;
            case ResultFlag.LOW:
              expect(value).toBeLessThan(minRef);
              if (criticalMin !== undefined) {
                expect(value).toBeGreaterThanOrEqual(criticalMin);
              }
              break;
            case ResultFlag.CRITICAL:
              // Must be outside critical bounds
              if (value > maxRef) {
                expect(criticalMax).toBeDefined();
                expect(value).toBeGreaterThan(criticalMax!);
              } else {
                expect(criticalMin).toBeDefined();
                expect(value).toBeLessThan(criticalMin!);
              }
              break;
          }
        }),
        { numRuns: 200 },
      );
    });
  });
});
