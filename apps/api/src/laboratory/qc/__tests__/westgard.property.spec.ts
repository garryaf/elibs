// Feature: lis-gap-remediation, Property 7: Westgard rule evaluation determinism

import * as fc from 'fast-check';
import {
  evaluateWestgardRules,
  QCResultData,
  WestgardResult,
} from '../westgard.engine';

/**
 * **Validates: Requirements 4.5**
 *
 * Property 7: Westgard rule evaluation determinism
 *
 * For any sequence of QC results and fixed mean/SD parameters,
 * evaluateWestgardRules SHALL always produce the same result (deterministic),
 * and a passing result SHALL have zero rejection-rule violations.
 */
describe('evaluateWestgardRules — Property 7: Determinism & Correctness', () => {
  // ---------------------------------------------------------------------------
  // Arbitraries
  // ---------------------------------------------------------------------------

  /** Generate a positive standard deviation (never zero or negative for normal operation) */
  const arbPositiveSD = fc.double({
    min: 0.01,
    max: 1000,
    noNaN: true,
    noDefaultInfinity: true,
  });

  /** Generate a mean value */
  const arbMean = fc.double({
    min: -10000,
    max: 10000,
    noNaN: true,
    noDefaultInfinity: true,
  });

  /** Generate a single QC result value */
  const arbResultValue = fc.double({
    min: -100000,
    max: 100000,
    noNaN: true,
    noDefaultInfinity: true,
  });

  /** Generate an array of QC results (0 to 20 data points) */
  const arbResults: fc.Arbitrary<QCResultData[]> = fc.array(
    arbResultValue.map((value) => ({ value })),
    { minLength: 0, maxLength: 20 },
  );

  /** Generate values constrained within ±1SD of the mean */
  function arbWithin1SD(
    mean: number,
    sd: number,
  ): fc.Arbitrary<QCResultData[]> {
    return fc.array(
      fc
        .double({
          min: mean - sd,
          max: mean + sd,
          noNaN: true,
          noDefaultInfinity: true,
        })
        .map((value) => ({ value })),
      { minLength: 1, maxLength: 20 },
    );
  }

  // ---------------------------------------------------------------------------
  // Rejection rules (1-2s is warning-only, NOT a rejection rule)
  // ---------------------------------------------------------------------------
  const REJECTION_RULES = ['1-3s', '2-2s', 'R-4s', '4-1s', '10x'] as const;

  // ---------------------------------------------------------------------------
  // Property 7.1: Determinism — same input always produces same output
  // ---------------------------------------------------------------------------
  it('should be deterministic: same inputs always produce the same output', () => {
    fc.assert(
      fc.property(arbResults, arbMean, arbPositiveSD, (results, mean, sd) => {
        const result1 = evaluateWestgardRules(results, mean, sd);
        const result2 = evaluateWestgardRules(results, mean, sd);

        // Structural equality: same pass/fail status
        expect(result1.passed).toBe(result2.passed);

        // Same number of violations
        expect(result1.violations.length).toBe(result2.violations.length);

        // Same violations in order
        for (let i = 0; i < result1.violations.length; i++) {
          expect(result1.violations[i].rule).toBe(result2.violations[i].rule);
          expect(result1.violations[i].dataPoints).toEqual(
            result2.violations[i].dataPoints,
          );
        }
      }),
      { numRuns: 200 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 7.2: passed === true implies zero rejection-rule violations
  // ---------------------------------------------------------------------------
  it('should have zero rejection-rule violations when result.passed === true', () => {
    fc.assert(
      fc.property(arbResults, arbMean, arbPositiveSD, (results, mean, sd) => {
        const result = evaluateWestgardRules(results, mean, sd);

        if (result.passed) {
          const rejectionViolations = result.violations.filter((v) =>
            REJECTION_RULES.includes(v.rule as any),
          );
          expect(rejectionViolations).toHaveLength(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 7.3: sd === 0 or empty results → passed: true with no violations
  // ---------------------------------------------------------------------------
  it('should return passed: true with no violations when sd === 0', () => {
    fc.assert(
      fc.property(arbResults, arbMean, (results, mean) => {
        const result = evaluateWestgardRules(results, mean, 0);

        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  it('should return passed: true with no violations when results are empty', () => {
    fc.assert(
      fc.property(arbMean, arbPositiveSD, (mean, sd) => {
        const result = evaluateWestgardRules([], mean, sd);

        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 7.4: Values within ±1SD of mean should never trigger any violation
  //
  // Note: The 10x rule triggers when 10+ consecutive values are all on the same
  // side of the mean, regardless of distance. So we constrain the test to fewer
  // than 10 values to validate that no SD-threshold rules (1-2s, 1-3s, 2-2s,
  // R-4s, 4-1s) fire when values are within ±1SD.
  // ---------------------------------------------------------------------------
  it('should never trigger any violation when all values are within ±1SD of mean (fewer than 10 results)', () => {
    fc.assert(
      fc.property(
        arbMean.filter((m) => Math.abs(m) < 5000),
        arbPositiveSD.filter((s) => s > 0.1 && s < 500),
        fc.array(
          fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
          {
            minLength: 1,
            maxLength: 9,
          },
        ),
        (mean, sd, fractions) => {
          // Map fractions [0,1] → values strictly within (mean - sd, mean + sd)
          const epsilon = sd * 0.001;
          const low = mean - sd + epsilon;
          const high = mean + sd - epsilon;
          const results: QCResultData[] = fractions.map((f) => ({
            value: low + f * (high - low),
          }));

          const result = evaluateWestgardRules(results, mean, sd);

          expect(result.passed).toBe(true);
          expect(result.violations).toHaveLength(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('should never trigger SD-threshold rules (1-2s, 1-3s, 2-2s, R-4s, 4-1s) when all values are within ±1SD of mean', () => {
    fc.assert(
      fc.property(
        arbMean.filter((m) => Math.abs(m) < 5000),
        arbPositiveSD.filter((s) => s > 0.1 && s < 500),
        fc.array(
          fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
          {
            minLength: 1,
            maxLength: 20,
          },
        ),
        (mean, sd, fractions) => {
          const epsilon = sd * 0.001;
          const low = mean - sd + epsilon;
          const high = mean + sd - epsilon;
          const results: QCResultData[] = fractions.map((f) => ({
            value: low + f * (high - low),
          }));

          const result = evaluateWestgardRules(results, mean, sd);

          // SD-threshold rules should never fire for values within ±1SD
          const sdThresholdViolations = result.violations.filter(
            (v) => v.rule !== '10x',
          );
          expect(sdThresholdViolations).toHaveLength(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 7.5: Converse — passed === false implies at least one rejection rule
  // ---------------------------------------------------------------------------
  it('should have at least one rejection-rule violation when result.passed === false', () => {
    fc.assert(
      fc.property(arbResults, arbMean, arbPositiveSD, (results, mean, sd) => {
        const result = evaluateWestgardRules(results, mean, sd);

        if (!result.passed) {
          const rejectionViolations = result.violations.filter((v) =>
            REJECTION_RULES.includes(v.rule as any),
          );
          expect(rejectionViolations.length).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 200 },
    );
  });
});
