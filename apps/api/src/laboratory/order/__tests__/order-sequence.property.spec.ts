// Feature: lis-gap-remediation, Property 12: Order number sequential guarantee

import * as fc from 'fast-check';
import { OrderSequenceService } from '../order-sequence.service';

/**
 * **Validates: Requirements 10.2**
 *
 * Property 12: Order number sequential guarantee
 *
 * For any sequence of N order numbers in the same month, the format SHALL be
 * LAB-YYYYMM-XXXX and the sequence SHALL be monotonically increasing and consecutive.
 */
describe('Order Number Sequential Guarantee Property Tests', () => {
  const ORDER_FORMAT_REGEX = /^LAB-\d{6}-\d{4}$/;

  describe('Property 12: Order number sequential guarantee', () => {
    /**
     * For any valid monthKey (6-digit string YYYYMM) and sequence number (1-9999),
     * format() SHALL produce a string matching LAB-YYYYMM-XXXX and parse() SHALL
     * recover the original monthKey and sequence.
     *
     * **Validates: Requirements 10.2**
     */
    it('format() produces valid order numbers that parse() can round-trip', () => {
      fc.assert(
        fc.property(
          // Generate valid month keys (YYYYMM format)
          fc.integer({ min: 2020, max: 2099 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).map((month) => {
              const y = year.toString();
              const m = month.toString().padStart(2, '0');
              return `${y}${m}`;
            }),
          ),
          // Generate valid sequence numbers (1-9999)
          fc.integer({ min: 1, max: 9999 }),
          (monthKey, sequence) => {
            const formatted = OrderSequenceService.format(monthKey, sequence);

            // Must match LAB-YYYYMM-XXXX format
            expect(formatted).toMatch(ORDER_FORMAT_REGEX);

            // Must be parseable back to original components
            const parsed = OrderSequenceService.parse(formatted);
            expect(parsed).not.toBeNull();
            expect(parsed!.monthKey).toBe(monthKey);
            expect(parsed!.sequence).toBe(sequence);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * For any sequence of N consecutive order numbers in the same month,
     * the sequence numbers SHALL be monotonically increasing and consecutive (no gaps).
     *
     * **Validates: Requirements 10.2**
     */
    it('sequential generation produces monotonically increasing consecutive numbers', () => {
      fc.assert(
        fc.property(
          // Generate a starting sequence number
          fc.integer({ min: 1, max: 9000 }),
          // Generate a count of sequential orders (2 to 50)
          fc.integer({ min: 2, max: 50 }),
          // Generate a valid month key
          fc.integer({ min: 2020, max: 2099 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).map((month) => {
              const y = year.toString();
              const m = month.toString().padStart(2, '0');
              return `${y}${m}`;
            }),
          ),
          (startSeq, count, monthKey) => {
            // Simulate N sequential order number generations
            const orderNumbers: string[] = [];
            for (let i = 0; i < count; i++) {
              orderNumbers.push(
                OrderSequenceService.format(monthKey, startSeq + i),
              );
            }

            // All must match the format
            for (const orderNumber of orderNumbers) {
              expect(orderNumber).toMatch(ORDER_FORMAT_REGEX);
            }

            // Parse all and verify monotonically increasing and consecutive
            const parsed = orderNumbers.map(
              (n) => OrderSequenceService.parse(n)!,
            );

            for (let i = 1; i < parsed.length; i++) {
              // Same month partition
              expect(parsed[i].monthKey).toBe(parsed[0].monthKey);
              // Strictly increasing
              expect(parsed[i].sequence).toBeGreaterThan(
                parsed[i - 1].sequence,
              );
              // Consecutive (no gaps)
              expect(parsed[i].sequence).toBe(parsed[i - 1].sequence + 1);
            }
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * For any string NOT matching LAB-YYYYMM-XXXX format, parse() SHALL return null.
     *
     * **Validates: Requirements 10.2**
     */
    it('parse() returns null for invalid order number formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Random strings
            fc.string({ minLength: 0, maxLength: 30 }),
            // Almost-valid formats with wrong prefix
            fc.integer({ min: 1, max: 9999 }).map(
              (seq) => `ORD-202601-${seq.toString().padStart(4, '0')}`,
            ),
            // Missing components
            fc.constant('LAB-'),
            fc.constant('LAB-202601'),
            fc.constant('LAB-202601-'),
            // Wrong digit counts
            fc.integer({ min: 1, max: 999 }).map(
              (seq) => `LAB-202601-${seq}`,
            ),
            fc.constant('LAB-20260-0001'), // 5 digits instead of 6
            fc.constant('LAB-2026011-0001'), // 7 digits instead of 6
          ),
          (invalidInput) => {
            // Filter out any accidentally valid format (unlikely but possible with random strings)
            if (ORDER_FORMAT_REGEX.test(invalidInput)) return;

            const parsed = OrderSequenceService.parse(invalidInput);
            expect(parsed).toBeNull();
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * For any set of unique (monthKey, sequence) pairs, all formatted order numbers
     * SHALL be unique (no collisions).
     *
     * **Validates: Requirements 10.2**
     */
    it('unique (monthKey, sequence) pairs produce unique order numbers', () => {
      fc.assert(
        fc.property(
          // Generate a valid month key
          fc.integer({ min: 2020, max: 2099 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).map((month) => {
              const y = year.toString();
              const m = month.toString().padStart(2, '0');
              return `${y}${m}`;
            }),
          ),
          fc.uniqueArray(fc.integer({ min: 1, max: 9999 }), {
            minLength: 2,
            maxLength: 100,
          }),
          (monthKey, sequences) => {
            const orderNumbers = sequences.map((seq) =>
              OrderSequenceService.format(monthKey, seq),
            );

            // All order numbers must be unique
            const uniqueNumbers = new Set(orderNumbers);
            expect(uniqueNumbers.size).toBe(orderNumbers.length);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
