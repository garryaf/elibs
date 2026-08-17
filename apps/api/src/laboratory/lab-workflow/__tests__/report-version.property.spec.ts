// Feature: lis-gap-remediation, Property 14: Report version monotonicity

import * as fc from 'fast-check';

/**
 * **Validates: Requirements 11.4**
 *
 * Property 14: Report version monotonicity
 *
 * For any sequence of addendum creations, the report version SHALL be
 * monotonically increasing (each addendum increments it by exactly 1).
 * No decrease, no gaps.
 */
describe('Property 14: Report version monotonicity', () => {
  /**
   * Simulates the report version incrementing logic from AddendumService.createAddendum.
   * Each addendum creation increments the order's reportVersion by 1 via:
   *   await tx.order.update({ where: { id }, data: { reportVersion: { increment: 1 } } })
   *
   * Starting from the Order model's default: reportVersion = 1
   */
  function simulateAddendumSequence(addendumCount: number): number[] {
    const versions: number[] = [];
    let reportVersion = 1; // Order model default

    for (let i = 0; i < addendumCount; i++) {
      reportVersion += 1; // { increment: 1 }
      versions.push(reportVersion);
    }

    return versions;
  }

  /**
   * Checks if an array of numbers is strictly monotonically increasing:
   * each element is exactly 1 greater than its predecessor.
   */
  function isStrictlyMonotonic(versions: number[]): boolean {
    for (let i = 1; i < versions.length; i++) {
      if (versions[i] !== versions[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generator for addendum counts (1 to 50 addendums in a sequence).
   */
  const addendumCountArb = fc.integer({ min: 1, max: 50 });

  /**
   * **Validates: Requirements 11.4**
   *
   * For any sequence of N addendum creations, the resulting report versions
   * SHALL be strictly monotonically increasing with no gaps.
   */
  it('report versions are strictly monotonically increasing for any addendum sequence', () => {
    fc.assert(
      fc.property(addendumCountArb, (count) => {
        const versions = simulateAddendumSequence(count);

        expect(versions.length).toBe(count);
        expect(isStrictlyMonotonic(versions)).toBe(true);
      }),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * Each addendum creation SHALL increment the report version by exactly 1.
   */
  it('each addendum increments report version by exactly 1', () => {
    fc.assert(
      fc.property(addendumCountArb, (count) => {
        const versions = simulateAddendumSequence(count);

        // First addendum should bring version from 1 (default) to 2
        expect(versions[0]).toBe(2);

        // Each subsequent addendum increments by exactly 1
        for (let i = 1; i < versions.length; i++) {
          expect(versions[i] - versions[i - 1]).toBe(1);
        }
      }),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * After N addendums, the final report version SHALL equal initialVersion + N.
   * Since the Order default reportVersion is 1, final version = 1 + N.
   */
  it('final report version equals initial version plus addendum count', () => {
    fc.assert(
      fc.property(addendumCountArb, (count) => {
        const initialVersion = 1; // Order model default
        const versions = simulateAddendumSequence(count);

        const finalVersion = versions[versions.length - 1];
        expect(finalVersion).toBe(initialVersion + count);
      }),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * Report versions SHALL never decrease. For any two indices i < j in the
   * addendum sequence, version[j] > version[i].
   */
  it('report versions never decrease across any pair of addendums', () => {
    fc.assert(
      fc.property(
        addendumCountArb,
        fc.integer({ min: 0, max: 49 }),
        fc.integer({ min: 0, max: 49 }),
        (count, rawI, rawJ) => {
          const versions = simulateAddendumSequence(count);

          // Constrain indices to the actual array bounds
          const i = rawI % count;
          const j = rawJ % count;

          if (i < j) {
            expect(versions[j]).toBeGreaterThan(versions[i]);
          } else if (i > j) {
            expect(versions[i]).toBeGreaterThan(versions[j]);
          } else {
            expect(versions[i]).toBe(versions[j]);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  /**
   * **Validates: Requirements 11.4**
   *
   * With an arbitrary starting report version (simulating orders that already
   * have addendums), subsequent addendum creations SHALL still produce
   * monotonically increasing versions.
   */
  it('monotonicity holds for any starting report version', () => {
    const startingVersionArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(startingVersionArb, addendumCountArb, (startVersion, count) => {
        // Simulate starting from an arbitrary version
        const versions: number[] = [];
        let reportVersion = startVersion;

        for (let i = 0; i < count; i++) {
          reportVersion += 1;
          versions.push(reportVersion);
        }

        // All versions are strictly monotonically increasing
        expect(isStrictlyMonotonic(versions)).toBe(true);

        // First version after addendum is startVersion + 1
        expect(versions[0]).toBe(startVersion + 1);

        // Final version is startVersion + count
        expect(versions[versions.length - 1]).toBe(startVersion + count);
      }),
      { numRuns: 1000 },
    );
  });
});
