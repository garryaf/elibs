import * as fc from 'fast-check';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';

/**
 * **Validates: Requirements 2.4**
 *
 * FOR ALL generated Visit_Numbers, parsing the format `VST-YYYYMM-XXXX`
 * then formatting back SHALL produce the original Visit_Number (round-trip property).
 */
describe('Feature: visit-management, Property 1: Visit Number Round-Trip', () => {
  it('should round-trip parse/format visit numbers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 9999 }),
        (year, month, seq) => {
          const yearStr = year.toString();
          const monthStr = month.toString().padStart(2, '0');

          // Format a visit number from components
          const visitNumber = VisitNumberGeneratorService.format(
            yearStr,
            monthStr,
            seq,
          );

          // Parse it back into components
          const parsed = VisitNumberGeneratorService.parse(visitNumber);

          // Parse must succeed
          expect(parsed).not.toBeNull();

          // Parsed components must match originals
          expect(parsed!.year).toBe(yearStr);
          expect(parsed!.month).toBe(monthStr);
          expect(parsed!.sequence).toBe(seq);

          // Re-formatting from parsed components must produce the original string
          const reformatted = VisitNumberGeneratorService.format(
            parsed!.year,
            parsed!.month,
            parsed!.sequence,
          );
          expect(reformatted).toBe(visitNumber);
        },
      ),
      { numRuns: 100 },
    );
  });
});
