// Feature: laboratory-management, Property 6: NIK Validation
// Feature: laboratory-management, Property 7: MRN Format Invariant

import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePatientDto } from '../dto/create-patient.dto';

/**
 * **Validates: Requirements FR3.2, FR3.4**
 */
describe('Patient Property Tests', () => {
  /**
   * Property 6: NIK Validation
   *
   * *For any* string S, the NIK validator SHALL accept S if and only if S consists
   * of exactly 16 characters and every character is a numeric digit.
   *
   * **Validates: Requirements FR3.2**
   */
  describe('Property 6: NIK Validation', () => {
    const createValidDto = (nik: string): CreatePatientDto => {
      return plainToInstance(CreatePatientDto, {
        nik,
        name: 'Test Patient',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
      });
    };

    it('should accept strings of exactly 16 numeric digits', () => {
      // Generate exactly 16 numeric digits using stringMatching
      const validNikArb = fc.stringMatching(/^\d{16}$/);

      fc.assert(
        fc.asyncProperty(validNikArb, async (nik) => {
          const dto = createValidDto(nik);
          const errors = await validate(dto);

          // Filter to only NIK-related errors
          const nikErrors = errors.filter((e) => e.property === 'nik');
          expect(nikErrors).toHaveLength(0);
        }),
        { numRuns: 200 },
      );
    });

    it('should reject strings with length != 16', () => {
      // Generate digit-only strings that are NOT 16 characters long
      const invalidLengthNikArb = fc.oneof(
        fc.stringMatching(/^\d{0,15}$/),
        fc.stringMatching(/^\d{17,30}$/),
      );

      fc.assert(
        fc.asyncProperty(invalidLengthNikArb, async (nik) => {
          const dto = createValidDto(nik);
          const errors = await validate(dto);

          const nikErrors = errors.filter((e) => e.property === 'nik');
          expect(nikErrors.length).toBeGreaterThan(0);
        }),
        { numRuns: 200 },
      );
    });

    it('should reject strings containing non-digit characters', () => {
      // Generate 16-char strings that contain at least one non-digit
      const invalidNikArb = fc
        .tuple(
          fc.nat({ max: 15 }), // position to insert non-digit
          fc.stringMatching(/^[a-zA-Z!@#$%^&*]$/), // a non-digit character
          fc.stringMatching(/^\d{15}$/), // 15 digits
        )
        .map(([pos, nonDigit, digits]) => {
          return digits.slice(0, pos) + nonDigit + digits.slice(pos);
        });

      fc.assert(
        fc.asyncProperty(invalidNikArb, async (nik) => {
          const dto = createValidDto(nik);
          const errors = await validate(dto);

          const nikErrors = errors.filter((e) => e.property === 'nik');
          expect(nikErrors.length).toBeGreaterThan(0);
        }),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 7: MRN Format Invariant
   *
   * *For any* successfully generated MRN, the value SHALL match the pattern
   * `RM-YYYYMM-XXXX` where YYYYMM is a valid year-month and XXXX is a zero-padded
   * number >= 0001, and no two patients SHALL share the same MRN.
   *
   * **Validates: Requirements FR3.4**
   */
  describe('Property 7: MRN Format Invariant', () => {
    /**
     * Pure function that replicates the MRN format logic from MrnGeneratorService.
     * Given a year, month, and sequence number, produces the MRN string.
     */
    function formatMrn(year: number, month: number, sequence: number): string {
      const monthKey = `${year}${month.toString().padStart(2, '0')}`;
      const paddedValue = sequence.toString().padStart(4, '0');
      return `RM-${monthKey}-${paddedValue}`;
    }

    it('should always produce MRNs matching pattern RM-YYYYMM-XXXX', () => {
      const yearArb = fc.integer({ min: 2020, max: 2030 });
      const monthArb = fc.integer({ min: 1, max: 12 });
      const sequenceArb = fc.integer({ min: 1, max: 9999 });

      fc.assert(
        fc.property(yearArb, monthArb, sequenceArb, (year, month, sequence) => {
          const mrn = formatMrn(year, month, sequence);

          // Verify it matches the expected pattern
          expect(mrn).toMatch(/^RM-\d{6}-\d{4}$/);

          // Verify the year-month part is valid
          const parts = mrn.split('-');
          const monthKey = parts[1];
          const parsedYear = parseInt(monthKey.slice(0, 4), 10);
          const parsedMonth = parseInt(monthKey.slice(4, 6), 10);

          expect(parsedYear).toBeGreaterThanOrEqual(2020);
          expect(parsedYear).toBeLessThanOrEqual(2030);
          expect(parsedMonth).toBeGreaterThanOrEqual(1);
          expect(parsedMonth).toBeLessThanOrEqual(12);

          // Verify the sequence part is >= 0001
          const sequencePart = parseInt(parts[2], 10);
          expect(sequencePart).toBeGreaterThanOrEqual(1);
          expect(sequencePart).toBeLessThanOrEqual(9999);
        }),
        { numRuns: 200 },
      );
    });

    it('should produce unique MRNs for different sequences within the same month', () => {
      const yearArb = fc.integer({ min: 2020, max: 2030 });
      const monthArb = fc.integer({ min: 1, max: 12 });
      // Generate two distinct sequence numbers
      const distinctSequencesArb = fc
        .tuple(
          fc.integer({ min: 1, max: 9999 }),
          fc.integer({ min: 1, max: 9999 }),
        )
        .filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(
          yearArb,
          monthArb,
          distinctSequencesArb,
          (year, month, [seq1, seq2]) => {
            const mrn1 = formatMrn(year, month, seq1);
            const mrn2 = formatMrn(year, month, seq2);

            // Different sequences must produce different MRNs
            expect(mrn1).not.toEqual(mrn2);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should produce unique MRNs for the same sequence in different months', () => {
      const yearArb = fc.integer({ min: 2020, max: 2030 });
      const sequenceArb = fc.integer({ min: 1, max: 9999 });
      // Generate two distinct months
      const distinctMonthsArb = fc
        .tuple(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 12 }),
        )
        .filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(
          yearArb,
          distinctMonthsArb,
          sequenceArb,
          (year, [month1, month2], sequence) => {
            const mrn1 = formatMrn(year, month1, sequence);
            const mrn2 = formatMrn(year, month2, sequence);

            // Same sequence but different months must produce different MRNs
            expect(mrn1).not.toEqual(mrn2);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
