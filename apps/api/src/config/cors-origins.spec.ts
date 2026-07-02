import * as fc from 'fast-check';
import { parseCorsOrigins } from './cors-origins';

// Feature: architecture-foundation, Property 4: CORS origins parsing
// **Validates: Requirements 4.2**

describe('parseCorsOrigins - Property Tests', () => {
  describe('Property 4: CORS origins parsing', () => {
    it('wildcard "*" returns true', () => {
      expect(parseCorsOrigins('*')).toBe(true);
    });

    it('for any non-empty comma-separated URL origins with optional whitespace, parsed array length equals the number of segments and entries are trimmed', () => {
      // Generate arrays of URL origins (1–10 items), excluding URLs that contain commas
      // since commas are the separator in the CORS_ORIGINS format
      const originArbitrary = fc.webUrl().filter((url) => !url.includes(','));
      const originsArrayArbitrary = fc.array(originArbitrary, { minLength: 1, maxLength: 10 });

      // Generate whitespace strings (spaces/tabs, 0–3 chars) for padding around commas
      const whitespaceArbitrary = fc
        .array(fc.constantFrom(' ', '\t', ' ', ''), { minLength: 0, maxLength: 3 })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(
          originsArrayArbitrary,
          fc.array(whitespaceArbitrary, { minLength: 20, maxLength: 20 }),
          (origins, whitespaces) => {
            // Join origins with commas and optional whitespace around commas
            const joined = origins
              .map((origin, i) => {
                const before = whitespaces[i * 2] || '';
                const after = whitespaces[i * 2 + 1] || '';
                return `${before}${origin}${after}`;
              })
              .join(',');

            const result = parseCorsOrigins(joined);

            // Result must be an array (not true, since input is not exactly '*')
            expect(Array.isArray(result)).toBe(true);
            const parsed = result as string[];

            // Length equals the number of comma-separated segments
            expect(parsed.length).toBe(origins.length);

            // Each entry is trimmed (no leading/trailing whitespace)
            for (const entry of parsed) {
              expect(entry).toBe(entry.trim());
            }

            // Each entry matches the corresponding original origin (after trimming)
            for (let i = 0; i < origins.length; i++) {
              expect(parsed[i]).toBe(origins[i]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
