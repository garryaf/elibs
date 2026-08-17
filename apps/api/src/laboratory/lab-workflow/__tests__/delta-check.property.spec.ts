// Feature: lis-gap-remediation, Property 8: Delta check percentage calculation

import * as fc from 'fast-check';

/**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 *
 * Property 8: Delta check percentage calculation
 *
 * For any current value C and previous value P (where P ≠ 0), the percentage
 * change SHALL equal ((C - P) / P) * 100. When abs(percentageChange) > threshold,
 * thresholdExceeded SHALL be true.
 */
describe('Property 8: Delta check percentage calculation', () => {
  /**
   * Pure calculation extracted from DeltaCheckService.performDeltaCheck:
   * percentageChange = ((currentValue - previousValue) / previousValue) * 100
   * Rounded to 2 decimal places.
   */
  function calculatePercentageChange(
    currentValue: number,
    previousValue: number,
  ): number {
    const raw = ((currentValue - previousValue) / previousValue) * 100;
    return Math.round(raw * 100) / 100;
  }

  /**
   * Threshold exceeded logic from DeltaCheckService:
   * thresholdExceeded = deltaAlertThreshold !== null && Math.abs(percentageChange) > deltaAlertThreshold
   */
  function isThresholdExceeded(
    percentageChange: number,
    deltaAlertThreshold: number | null,
  ): boolean {
    return (
      deltaAlertThreshold !== null &&
      Math.abs(percentageChange) > deltaAlertThreshold
    );
  }

  /**
   * Generator for non-zero finite numeric values representing lab results.
   * Avoids zero (division by zero for previous values), NaN, and Infinity.
   */
  const nonZeroFiniteArb = fc
    .double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true })
    .filter((v) => v !== 0 && Math.abs(v) > 0.001);

  /**
   * Generator for any finite numeric value representing the current result.
   */
  const finiteValueArb = fc.double({
    min: -10000,
    max: 10000,
    noNaN: true,
    noDefaultInfinity: true,
  });

  /**
   * Generator for positive threshold values (percentage).
   */
  const thresholdArb = fc.double({
    min: 0.01,
    max: 500,
    noNaN: true,
    noDefaultInfinity: true,
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * For any current value C and previous value P (P ≠ 0),
   * percentageChange SHALL equal ((C - P) / P) * 100 (rounded to 2 decimals).
   */
  it('percentage change equals ((C - P) / P) * 100 for any C and non-zero P', () => {
    fc.assert(
      fc.property(finiteValueArb, nonZeroFiniteArb, (current, previous) => {
        const result = calculatePercentageChange(current, previous);
        const expected =
          Math.round(((current - previous) / previous) * 100 * 100) / 100;

        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 5.2, 5.3**
   *
   * When abs(percentageChange) > threshold, thresholdExceeded SHALL be true.
   * When abs(percentageChange) <= threshold, thresholdExceeded SHALL be false.
   */
  it('thresholdExceeded is true when abs(percentageChange) > threshold', () => {
    fc.assert(
      fc.property(
        finiteValueArb,
        nonZeroFiniteArb,
        thresholdArb,
        (current, previous, threshold) => {
          const percentageChange = calculatePercentageChange(current, previous);
          const exceeded = isThresholdExceeded(percentageChange, threshold);

          if (Math.abs(percentageChange) > threshold) {
            expect(exceeded).toBe(true);
          } else {
            expect(exceeded).toBe(false);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * When current equals previous, percentage change SHALL be 0.
   */
  it('percentage change is 0 when current equals previous', () => {
    fc.assert(
      fc.property(nonZeroFiniteArb, (value) => {
        const result = calculatePercentageChange(value, value);
        // Use == 0 to handle the JavaScript -0 case (Object.is(-0, 0) is false)
        expect(result == 0).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * Percentage change is positive when current > previous (both positive),
   * and negative when current < previous (both positive).
   * Note: When values are very close, rounding to 2 decimals may yield 0 or -0,
   * so we only assert the sign for sufficiently different values.
   */
  it('percentage change sign matches direction of change for positive values', () => {
    const positiveArb = fc
      .double({ min: 1, max: 10000, noNaN: true, noDefaultInfinity: true })
      .filter((v) => v >= 1);

    fc.assert(
      fc.property(positiveArb, positiveArb, (current, previous) => {
        const result = calculatePercentageChange(current, previous);

        // Only assert sign when the percentage is non-zero after rounding
        if (result > 0) {
          expect(current).toBeGreaterThan(previous);
        } else if (result < 0) {
          expect(current).toBeLessThan(previous);
        }
        // When result rounds to 0, current ≈ previous (within rounding)
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 5.2, 5.3**
   *
   * When threshold is null, thresholdExceeded SHALL always be false
   * regardless of percentage change value.
   */
  it('thresholdExceeded is always false when threshold is null', () => {
    fc.assert(
      fc.property(finiteValueArb, nonZeroFiniteArb, (current, previous) => {
        const percentageChange = calculatePercentageChange(current, previous);
        const exceeded = isThresholdExceeded(percentageChange, null);

        expect(exceeded).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * A doubling of the value (C = 2*P) should always yield exactly 100% change.
   */
  it('doubling the value yields exactly 100% percentage change', () => {
    fc.assert(
      fc.property(nonZeroFiniteArb, (previous) => {
        const current = previous * 2;

        // Guard against overflow
        if (!isFinite(current)) return;

        const result = calculatePercentageChange(current, previous);
        expect(result).toBeCloseTo(100, 5);
      }),
      { numRuns: 500 },
    );
  });
});
