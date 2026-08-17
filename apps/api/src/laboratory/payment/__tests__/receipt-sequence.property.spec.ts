// Feature: lis-gap-remediation, Property 9: Receipt number sequential guarantee

import * as fc from 'fast-check';
import { ReceiptSequenceService } from '../receipt-sequence.service';

/**
 * **Validates: Requirements 8.5, 8.6**
 *
 * Property 9: Receipt number sequential guarantee
 *
 * For any sequence of N receipt number generations on the same day, the numbers
 * SHALL be monotonically increasing and consecutive (no gaps). All numbers SHALL
 * match the format RCP-YYYYMMDD-XXXX.
 */
describe('Receipt Number Sequential Guarantee Property Tests', () => {
  const RECEIPT_FORMAT_REGEX = /^RCP-\d{8}-\d{4}$/;

  describe('Property 9: Receipt number sequential guarantee', () => {
    /**
     * For any valid dateKey (8-digit string YYYYMMDD) and sequence number (1-9999),
     * format() SHALL produce a string matching RCP-YYYYMMDD-XXXX and parse() SHALL
     * recover the original dateKey and sequence.
     *
     * **Validates: Requirements 8.5, 8.6**
     */
    it('format() produces valid receipt numbers that parse() can round-trip', () => {
      fc.assert(
        fc.property(
          // Generate valid date keys (YYYYMMDD format)
          fc.integer({ min: 2020, max: 2099 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).chain((month) =>
              fc.integer({ min: 1, max: 28 }).map((day) => {
                const y = year.toString();
                const m = month.toString().padStart(2, '0');
                const d = day.toString().padStart(2, '0');
                return `${y}${m}${d}`;
              }),
            ),
          ),
          // Generate valid sequence numbers (1-9999)
          fc.integer({ min: 1, max: 9999 }),
          (dateKey, sequence) => {
            const formatted = ReceiptSequenceService.format(dateKey, sequence);

            // Must match RCP-YYYYMMDD-XXXX format
            expect(formatted).toMatch(RECEIPT_FORMAT_REGEX);

            // Must be parseable back to original components
            const parsed = ReceiptSequenceService.parse(formatted);
            expect(parsed).not.toBeNull();
            expect(parsed!.dateKey).toBe(dateKey);
            expect(parsed!.sequence).toBe(sequence);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * For any sequence of N consecutive receipt numbers on the same day,
     * the sequence numbers SHALL be monotonically increasing and consecutive (no gaps).
     *
     * **Validates: Requirements 8.5, 8.6**
     */
    it('sequential generation produces monotonically increasing consecutive numbers', () => {
      fc.assert(
        fc.property(
          // Generate a starting sequence number
          fc.integer({ min: 1, max: 9000 }),
          // Generate a count of sequential receipts (2 to 50)
          fc.integer({ min: 2, max: 50 }),
          // Generate a valid date key
          fc.integer({ min: 2020, max: 2099 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).chain((month) =>
              fc.integer({ min: 1, max: 28 }).map((day) => {
                const y = year.toString();
                const m = month.toString().padStart(2, '0');
                const d = day.toString().padStart(2, '0');
                return `${y}${m}${d}`;
              }),
            ),
          ),
          (startSeq, count, dateKey) => {
            // Simulate N sequential receipt number generations
            const receipts: string[] = [];
            for (let i = 0; i < count; i++) {
              receipts.push(ReceiptSequenceService.format(dateKey, startSeq + i));
            }

            // All must match the format
            for (const receipt of receipts) {
              expect(receipt).toMatch(RECEIPT_FORMAT_REGEX);
            }

            // Parse all and verify monotonically increasing and consecutive
            const parsed = receipts.map((r) => ReceiptSequenceService.parse(r)!);

            for (let i = 1; i < parsed.length; i++) {
              // Same date partition
              expect(parsed[i].dateKey).toBe(parsed[0].dateKey);
              // Strictly increasing
              expect(parsed[i].sequence).toBeGreaterThan(parsed[i - 1].sequence);
              // Consecutive (no gaps)
              expect(parsed[i].sequence).toBe(parsed[i - 1].sequence + 1);
            }
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * For any string NOT matching RCP-YYYYMMDD-XXXX format, parse() SHALL return null.
     *
     * **Validates: Requirements 8.5, 8.6**
     */
    it('parse() returns null for invalid receipt number formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Random strings
            fc.string({ minLength: 0, maxLength: 30 }),
            // Almost-valid formats with wrong prefix
            fc.integer({ min: 1, max: 9999 }).map(
              (seq) => `INV-20260101-${seq.toString().padStart(4, '0')}`,
            ),
            // Missing components
            fc.constant('RCP-'),
            fc.constant('RCP-20260101'),
            fc.constant('RCP-20260101-'),
            // Wrong digit counts
            fc.integer({ min: 1, max: 999 }).map(
              (seq) => `RCP-20260101-${seq}`,
            ),
            fc.constant('RCP-2026010-0001'),
          ),
          (invalidInput) => {
            // Filter out any accidentally valid format (unlikely but possible with random strings)
            if (RECEIPT_FORMAT_REGEX.test(invalidInput)) return;

            const parsed = ReceiptSequenceService.parse(invalidInput);
            expect(parsed).toBeNull();
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * For any set of unique (dateKey, sequence) pairs, all formatted receipt numbers
     * SHALL be unique (no collisions).
     *
     * **Validates: Requirements 8.5, 8.6**
     */
    it('unique (dateKey, sequence) pairs produce unique receipt numbers', () => {
      fc.assert(
        fc.property(
          // Generate a list of unique sequence numbers for the same date
          fc.integer({ min: 2020, max: 2099 }).chain((year) =>
            fc.integer({ min: 1, max: 12 }).chain((month) =>
              fc.integer({ min: 1, max: 28 }).map((day) => {
                const y = year.toString();
                const m = month.toString().padStart(2, '0');
                const d = day.toString().padStart(2, '0');
                return `${y}${m}${d}`;
              }),
            ),
          ),
          fc.uniqueArray(fc.integer({ min: 1, max: 9999 }), { minLength: 2, maxLength: 100 }),
          (dateKey, sequences) => {
            const receipts = sequences.map((seq) =>
              ReceiptSequenceService.format(dateKey, seq),
            );

            // All receipt numbers must be unique
            const uniqueReceipts = new Set(receipts);
            expect(uniqueReceipts.size).toBe(receipts.length);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
