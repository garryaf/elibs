import * as fc from 'fast-check';
import { envValidationSchema } from './env.validation';

// Feature: architecture-foundation, Property 2: Environment validation schema rejects invalid configurations
// **Validates: Requirements 3.2, 3.3**

describe('envValidationSchema - Property Tests', () => {
  /**
   * Helper: generates a valid base env object that passes all schema validation.
   */
  const validEnvArbitrary = fc.record({
    DATABASE_URL: fc.webUrl(),
    JWT_SECRET: fc.string({ minLength: 32, maxLength: 64 }),
    JWT_EXPIRATION: fc.tuple(
      fc.integer({ min: 1, max: 9999 }),
      fc.constantFrom('s', 'm', 'h', 'd'),
    ).map(([num, unit]) => `${num}${unit}`),
    CORS_ORIGINS: fc.string({ minLength: 1, maxLength: 50 }),
    PORT: fc.integer({ min: 1, max: 65535 }),
  });

  // Feature: architecture-foundation, Property 2: Environment validation schema rejects invalid configurations
  describe('Property 2: Environment validation schema rejects invalid configurations', () => {
    const requiredKeys = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRATION', 'CORS_ORIGINS'] as const;

    it('rejects env objects with at least one required variable missing', () => {
      fc.assert(
        fc.property(
          validEnvArbitrary,
          fc.subarray([...requiredKeys, 'PORT'] as const, { minLength: 1 }),
          (validEnv, keysToRemove) => {
            const invalidEnv = { ...validEnv };
            for (const key of keysToRemove) {
              delete (invalidEnv as Record<string, unknown>)[key];
            }
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            // PORT has a default so removing it won't cause an error alone
            const removedRequired = keysToRemove.filter(k => k !== 'PORT');
            if (removedRequired.length > 0) {
              expect(error).toBeDefined();
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects env objects with JWT_SECRET shorter than 32 characters', () => {
      fc.assert(
        fc.property(
          validEnvArbitrary,
          fc.string({ minLength: 0, maxLength: 31 }),
          (validEnv, shortSecret) => {
            const invalidEnv = { ...validEnv, JWT_SECRET: shortSecret };
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects env objects with PORT outside 1-65535', () => {
      fc.assert(
        fc.property(
          validEnvArbitrary,
          fc.oneof(
            fc.integer({ min: -10000, max: 0 }),
            fc.integer({ min: 65536, max: 100000 }),
          ),
          (validEnv, invalidPort) => {
            const invalidEnv = { ...validEnv, PORT: invalidPort };
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects env objects with JWT_EXPIRATION not matching duration pattern', () => {
      // Generate strings that do NOT match /^\d+[smhd]$/
      const invalidExpirationArbitrary = fc.oneof(
        fc.constant(''),                            // empty string
        fc.constant('abc'),                         // no digits
        fc.constant('10x'),                         // invalid unit
        fc.constant('10ms'),                        // multi-char unit
        fc.constant('s10'),                         // reversed order
        fc.constant('10'),                          // no unit
        fc.constant(' 10s'),                        // leading space
        fc.constant('10s '),                        // trailing space
        fc.constantFrom('abc', 'xyz', '!@#', 'hello', 'test', 'foo', 'bar', '123abc', 'ms100', 'xx'),
      );

      fc.assert(
        fc.property(
          validEnvArbitrary,
          invalidExpirationArbitrary,
          (validEnv, invalidExpiration) => {
            const invalidEnv = { ...validEnv, JWT_EXPIRATION: invalidExpiration };
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: architecture-foundation, Property 3: Environment validation error messages identify offending variables
  describe('Property 3: Environment validation error messages identify offending variables', () => {
    const requiredKeys = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRATION', 'CORS_ORIGINS'] as const;

    it('error messages contain the name of missing required variables', () => {
      fc.assert(
        fc.property(
          validEnvArbitrary,
          fc.subarray([...requiredKeys], { minLength: 1 }),
          (validEnv, keysToRemove) => {
            const invalidEnv = { ...validEnv };
            for (const key of keysToRemove) {
              delete (invalidEnv as Record<string, unknown>)[key];
            }
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
            const message = error!.message;
            for (const key of keysToRemove) {
              expect(message).toContain(key);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('error messages contain JWT_SECRET when it is too short', () => {
      fc.assert(
        fc.property(
          validEnvArbitrary,
          fc.string({ minLength: 1, maxLength: 31 }),
          (validEnv, shortSecret) => {
            const invalidEnv = { ...validEnv, JWT_SECRET: shortSecret };
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
            expect(error!.message).toContain('JWT_SECRET');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('error messages contain PORT when it is out of range', () => {
      fc.assert(
        fc.property(
          validEnvArbitrary,
          fc.oneof(
            fc.integer({ min: -10000, max: 0 }),
            fc.integer({ min: 65536, max: 100000 }),
          ),
          (validEnv, invalidPort) => {
            const invalidEnv = { ...validEnv, PORT: invalidPort };
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
            expect(error!.message).toContain('PORT');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('error messages contain JWT_EXPIRATION when pattern is invalid', () => {
      const invalidExpirationArbitrary = fc.oneof(
        fc.constant(''),
        fc.constant('abc'),
        fc.constant('10x'),
        fc.constant('10ms'),
        fc.constant('s10'),
        fc.constant('10'),
        fc.constantFrom('abc', 'xyz', '!@#', 'hello', 'test', 'foo', 'bar', '123abc', 'ms100', 'xx'),
      );

      fc.assert(
        fc.property(
          validEnvArbitrary,
          invalidExpirationArbitrary,
          (validEnv, invalidExpiration) => {
            const invalidEnv = { ...validEnv, JWT_EXPIRATION: invalidExpiration };
            const { error } = envValidationSchema.validate(invalidEnv, { abortEarly: false });
            expect(error).toBeDefined();
            expect(error!.message).toContain('JWT_EXPIRATION');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
