// Feature: lis-gap-remediation, Property 5: Qualitative result validation

import * as fc from 'fast-check';
import { ResultType } from '@prisma/client';
import { AnalyzerService } from '../analyzer.service';
import { CsvResultRowDto } from '../dto/csv-result-row.dto';

/**
 * **Validates: Requirements 2.4**
 *
 * Property 5: Qualitative result validation
 *
 * For any test with resultType QUALITATIVE and a non-empty qualitativeOptions list,
 * a submitted resultValue SHALL be accepted ONLY if it is a member of qualitativeOptions;
 * otherwise it SHALL be rejected with a validation error.
 */
describe('Qualitative Result Validation Property Tests', () => {
  let service: AnalyzerService;

  beforeAll(() => {
    // Create service instance with null prisma (not needed for validateRow)
    service = new AnalyzerService(null as any);
  });

  // Generator for non-empty qualitative options lists (1-10 distinct options)
  const qualitativeOptionsArb = fc
    .uniqueArray(fc.string({ minLength: 1, maxLength: 30 }), {
      minLength: 1,
      maxLength: 10,
    })
    .filter((arr) => arr.length > 0);

  // Generator for a valid CSV result row
  const csvRowArb = (resultValue: string): CsvResultRowDto => ({
    orderNumber: 'ORD-001',
    testCode: 'TEST-001',
    resultValue,
  });

  // Generator for a QUALITATIVE test config with non-empty options
  const qualitativeTestConfigArb = (options: string[]) => ({
    resultType: ResultType.QUALITATIVE,
    qualitativeOptions: options,
    code: 'TEST-001',
    isActive: true,
  });

  describe('Property 5: Qualitative result validation', () => {
    /**
     * ACCEPTED: When resultType is QUALITATIVE and resultValue IS in qualitativeOptions,
     * validateRow returns null (valid).
     *
     * **Validates: Requirements 2.4**
     */
    it('accepts resultValue that IS a member of qualitativeOptions', () => {
      fc.assert(
        fc.property(
          qualitativeOptionsArb.chain((options) =>
            fc.constantFrom(...options).map((selectedValue) => ({
              options,
              selectedValue,
            })),
          ),
          ({ options, selectedValue }) => {
            const row = csvRowArb(selectedValue);
            const testConfig = qualitativeTestConfigArb(options);

            const result = service.validateRow(row, testConfig);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * REJECTED: When resultType is QUALITATIVE and resultValue is NOT in qualitativeOptions,
     * validateRow returns an error.
     *
     * **Validates: Requirements 2.4**
     */
    it('rejects resultValue that is NOT a member of qualitativeOptions', () => {
      fc.assert(
        fc.property(
          qualitativeOptionsArb,
          fc.string({ minLength: 1, maxLength: 30 }),
          (options, candidateValue) => {
            // Skip if the candidate happens to be in the options
            fc.pre(!options.includes(candidateValue));

            const row = csvRowArb(candidateValue);
            const testConfig = qualitativeTestConfigArb(options);

            const result = service.validateRow(row, testConfig);
            expect(result).not.toBeNull();
            expect(result!.field).toBe('resultValue');
            expect(result!.message).toContain('not a valid option');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * EMPTY OPTIONS: When qualitativeOptions is empty, any value is accepted
     * for QUALITATIVE tests.
     *
     * **Validates: Requirements 2.4**
     */
    it('accepts any value when qualitativeOptions is empty', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (anyValue) => {
          const row = csvRowArb(anyValue);
          const testConfig = {
            resultType: ResultType.QUALITATIVE,
            qualitativeOptions: [],
            code: 'TEST-001',
            isActive: true,
          };

          const result = service.validateRow(row, testConfig);
          expect(result).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * NUMERIC REJECTION: For NUMERIC tests, non-numeric strings are rejected.
     *
     * **Validates: Requirements 2.4**
     */
    it('rejects non-numeric strings for NUMERIC resultType', () => {
      // Generator for strings that cannot be parsed as valid numbers
      const nonNumericStringArb = fc
        .string({ minLength: 1, maxLength: 30 })
        .filter((s) => isNaN(parseFloat(s)));

      fc.assert(
        fc.property(nonNumericStringArb, (invalidValue) => {
          const row = csvRowArb(invalidValue);
          const testConfig = {
            resultType: ResultType.NUMERIC,
            qualitativeOptions: [],
            code: 'TEST-001',
            isActive: true,
          };

          const result = service.validateRow(row, testConfig);
          expect(result).not.toBeNull();
          expect(result!.field).toBe('resultValue');
          expect(result!.message).toContain('not a valid number');
        }),
        { numRuns: 100 },
      );
    });

    /**
     * NUMERIC ACCEPTANCE: For NUMERIC tests, valid numeric strings are accepted.
     *
     * **Validates: Requirements 2.4**
     */
    it('accepts valid numeric strings for NUMERIC resultType', () => {
      fc.assert(
        fc.property(
          fc.double({
            noNaN: true,
            noDefaultInfinity: true,
            min: -100000,
            max: 100000,
          }),
          (numValue) => {
            const row = csvRowArb(String(numValue));
            const testConfig = {
              resultType: ResultType.NUMERIC,
              qualitativeOptions: [],
              code: 'TEST-001',
              isActive: true,
            };

            const result = service.validateRow(row, testConfig);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * NULL TEST CONFIG: When testConfig is null, validation returns an error
     * regardless of resultValue.
     *
     * **Validates: Requirements 2.4**
     */
    it('returns error when test config is null (test not found)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 30 }), (anyValue) => {
          const row = csvRowArb(anyValue);
          const result = service.validateRow(row, null);
          expect(result).not.toBeNull();
          expect(result!.field).toBe('testCode');
          expect(result!.message).toContain('not found');
        }),
        { numRuns: 50 },
      );
    });
  });
});
