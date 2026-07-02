// Feature: architecture-foundation, Property 1: Bcrypt cost factor invariant
import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';

/**
 * Property 1: Bcrypt cost factor invariant
 *
 * For any valid password string, hashing it with bcrypt cost factor 12
 * SHALL produce a hash whose prefix encodes cost factor 12
 * (i.e., the hash starts with `$2b$12$` or `$2a$12$`).
 *
 * **Validates: Requirements 2.7**
 */
describe('Property 1: Bcrypt cost factor invariant', () => {
  const BCRYPT_COST_FACTOR = 12;

  it(
    'should always produce a hash with cost factor 12 prefix for any password',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 72 }),
          async (password: string) => {
            const hash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);

            // Bcrypt hashes must start with either $2b$12$ or $2a$12$
            const hasValidPrefix =
              hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$');

            expect(hasValidPrefix).toBe(true);
            expect(hash).toHaveLength(60); // bcrypt hashes are always 60 chars
          },
        ),
        { numRuns: 100 },
      );
    },
    120000, // bcrypt with cost 12 is intentionally slow (~250ms/hash); 100 runs need ~25s
  );
});
