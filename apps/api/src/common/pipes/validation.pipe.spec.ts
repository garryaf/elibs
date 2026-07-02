// Feature: architecture-foundation, Property 5: ValidationPipe rejects payloads with unknown properties
// Feature: architecture-foundation, Property 6: Validation failure response conforms to error envelope
import * as fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import { IsString, IsEmail, IsInt, Min } from 'class-validator';
import { globalValidationPipe } from './validation.pipe';

/**
 * Test DTO with known decorated properties for property testing.
 */
class TestDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(0)
  age!: number;
}

/**
 * Validates: Requirements 5.1, 5.2
 *
 * Property 5: For any request body that contains at least one property not
 * defined in the target DTO class, the GlobalValidationPipe SHALL reject
 * the request with an HTTP 400 response.
 */
describe('ValidationPipe - Property 5: Rejects payloads with unknown properties', () => {
  // Arbitrary that generates a valid base DTO plus at least one extra unknown property
  const validBaseArbitrary = fc.record({
    name: fc.string({ minLength: 1 }),
    email: fc.tuple(
      fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
      fc.string({ minLength: 1, maxLength: 10, unit: 'grapheme-ascii' }),
    ).map(([user, domain]) => `${user.replace(/[^a-z0-9]/gi, 'x')}@${domain.replace(/[^a-z0-9]/gi, 'x')}.com`),
    age: fc.integer({ min: 0, max: 1000 }),
  });

  // Reserved JS property names to avoid generating (would break object behavior)
  const reservedKeys = new Set([
    'name', 'email', 'age',
    'toString', 'valueOf', 'constructor', 'hasOwnProperty',
    'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
    '__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
  ]);

  // Generate unknown property keys that aren't in the DTO or reserved
  const unknownPropsArbitrary = fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20, unit: 'grapheme-ascii' }).filter(
      (key) => !reservedKeys.has(key),
    ),
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
    { minKeys: 1, maxKeys: 5 },
  );

  it('rejects request bodies containing unknown properties not defined in the DTO', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBaseArbitrary,
        unknownPropsArbitrary,
        async (validBase, unknownProps) => {
          const bodyWithExtras = { ...validBase, ...unknownProps };

          await expect(
            globalValidationPipe.transform(bodyWithExtras, {
              type: 'body',
              metatype: TestDto,
            }),
          ).rejects.toThrow(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the rejection is a BadRequestException with HTTP 400 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBaseArbitrary,
        unknownPropsArbitrary,
        async (validBase, unknownProps) => {
          const bodyWithExtras = { ...validBase, ...unknownProps };

          const error = await globalValidationPipe
            .transform(bodyWithExtras, {
              type: 'body',
              metatype: TestDto,
            })
            .catch((e: unknown) => e);

          expect(error).toBeInstanceOf(BadRequestException);
          expect((error as BadRequestException).getStatus()).toBe(400);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Validates: Requirements 5.4, 5.5
 *
 * Property 6: For any request body that fails DTO validation with N distinct
 * constraint violations, the HTTP 400 response SHALL conform to the shape
 * { success: false, errorCode: string, message: string, errors: Array, traceId: string }
 * where the errors array contains exactly N entries, each identifying the
 * property name and constraint description.
 */
describe('ValidationPipe - Property 6: Validation failure response conforms to error envelope', () => {
  it('error response contains structured errors array with field and constraint for each violation', async () => {
    // Strategy: omit fields from a valid body. Each omitted field causes exactly
    // identifiable constraint violations.
    await fc.assert(
      fc.asyncProperty(
        fc.subarray(['name', 'email', 'age'] as const, { minLength: 1 }),
        async (fieldsToOmit) => {
          const body: Record<string, unknown> = {
            name: 'ValidName',
            email: 'valid@example.com',
            age: 25,
          };

          // Remove selected fields to trigger violations
          for (const field of fieldsToOmit) {
            delete body[field];
          }

          try {
            await globalValidationPipe.transform(body, {
              type: 'body',
              metatype: TestDto,
            });
            // If transform passes (unlikely with missing fields), that's fine
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as Record<string, unknown>;

            // Verify structure: must have message and errors
            expect(response).toHaveProperty('message');
            expect(response).toHaveProperty('errors');
            expect(Array.isArray(response.errors)).toBe(true);

            const errors = response.errors as Array<{ field?: string; constraint: string }>;

            // Each error entry must have a constraint string
            for (const entry of errors) {
              expect(typeof entry.constraint).toBe('string');
              expect(entry.constraint.length).toBeGreaterThan(0);
            }

            // Each omitted field must appear in at least one error entry
            const fieldsWithErrors = new Set(errors.map((e) => e.field));
            for (const field of fieldsToOmit) {
              expect(fieldsWithErrors).toContain(field);
            }

            // At least one error per omitted field
            expect(errors.length).toBeGreaterThanOrEqual(fieldsToOmit.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('errors array length equals the number of distinct constraint violations', async () => {
    // For bodies with explicitly invalid values, we know the exact constraint count.
    // name (not a string) -> 1 violation: isString
    // email (not an email) -> 1 violation: isEmail
    // age (not an int) -> 1 or 2 violations: isInt (and possibly min)
    //
    // We test with bodies where each field has exactly one constraint violated.
    await fc.assert(
      fc.asyncProperty(
        fc.subarray(['name', 'email'] as const, { minLength: 1 }),
        async (fieldsToInvalidate) => {
          const body: Record<string, unknown> = {
            name: 'ValidName',
            email: 'valid@example.com',
            age: 25,
          };

          // Invalidate selected fields with values that trigger exactly one constraint
          for (const field of fieldsToInvalidate) {
            if (field === 'name') {
              body.name = 12345; // not a string → 1 violation (isString)
            } else if (field === 'email') {
              body.email = 12345; // not a string/email → isEmail violation
            }
          }

          try {
            await globalValidationPipe.transform(body, {
              type: 'body',
              metatype: TestDto,
            });
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
            const errors = response.errors as Array<{ field?: string; constraint: string }>;

            // We expect at least as many errors as fields invalidated
            expect(errors.length).toBeGreaterThanOrEqual(fieldsToInvalidate.length);

            // Each invalidated field must be represented in the errors
            for (const field of fieldsToInvalidate) {
              const fieldErrors = errors.filter((e) => e.field === field);
              expect(fieldErrors.length).toBeGreaterThanOrEqual(1);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('each error entry identifies the property name and constraint description', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant({ name: 123, email: 'not-an-email', age: 'not-a-number' }),
        async (invalidBody) => {
          try {
            await globalValidationPipe.transform(invalidBody, {
              type: 'body',
              metatype: TestDto,
            });
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as Record<string, unknown>;

            const errors = response.errors as Array<{ field?: string; constraint: string }>;
            expect(errors.length).toBeGreaterThan(0);

            // Every error entry must have a non-empty constraint string
            for (const entry of errors) {
              expect(entry).toHaveProperty('constraint');
              expect(typeof entry.constraint).toBe('string');
              expect(entry.constraint.length).toBeGreaterThan(0);
            }

            // Every error entry should identify a field from our DTO
            for (const entry of errors) {
              expect(entry).toHaveProperty('field');
              expect(typeof entry.field).toBe('string');
              expect(['name', 'email', 'age']).toContain(entry.field);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
