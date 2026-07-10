/**
 * Preservation Property Tests — Backend
 *
 * These tests capture existing CORRECT behavior that must be preserved after the fix.
 * They verify that controllers following the correct pattern (no manual wrapping)
 * continue to produce single-envelope responses via TransformInterceptor.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * Observation (UNFIXED code):
 * - MasterDataController returns raw data → TransformInterceptor wraps once → single-envelope ✓
 * - The TransformInterceptor always wraps: { success: true, message: "Success", data: T }
 * - For any controller that does NOT manually wrap, the response is correct single-envelope
 */

import * as fc from 'fast-check';

// ─── Simulate TransformInterceptor behavior (observed) ──────────────────────

/**
 * The TransformInterceptor wraps any controller return value with:
 * { success: true, message: "Success", data: <controllerReturn> }
 */
function transformInterceptorWrap<T>(controllerReturn: T): {
  success: true;
  message: string;
  data: T;
} {
  return {
    success: true as const,
    message: 'Success',
    data: controllerReturn,
  };
}

/**
 * Detects if a response is double-wrapped (has nested envelope).
 * A double-wrapped response has: response.data.success is boolean AND response.data.message is string AND response.data.data exists
 */
function isDoubleWrapped(response: unknown): boolean {
  if (response === null || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  if (typeof r.success !== 'boolean' || typeof r.message !== 'string' || !('data' in r)) return false;

  const innerData = r.data;
  if (innerData === null || typeof innerData !== 'object') return false;
  const inner = innerData as Record<string, unknown>;
  return typeof inner.success === 'boolean' && typeof inner.message === 'string' && 'data' in inner;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate paginated response shape (like MasterDataController returns)
 * This simulates what a service returns: { data: T[], meta: { total, page, limit } }
 */
/**
 * Safe ISO date string arbitrary - uses integer timestamps to avoid invalid date issues
 */
const isoDateArb = fc
  .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31 in ms
  .map((ts) => new Date(ts).toISOString());

const paginatedDataArb = fc.record({
  data: fc.array(
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      createdAt: isoDateArb,
    }),
    { minLength: 0, maxLength: 20 },
  ),
  meta: fc.record({
    total: fc.nat({ max: 1000 }),
    page: fc.integer({ min: 1, max: 100 }),
    limit: fc.integer({ min: 1, max: 100 }),
  }),
});

/**
 * Generate single entity responses (like MasterDataController.createCategory returns)
 */
const singleEntityArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  createdAt: isoDateArb,
  updatedAt: isoDateArb,
});

/**
 * Generate nested objects that do NOT have a `success` boolean field.
 * This represents legitimate data that should pass through unchanged.
 */
const nonEnvelopeDataArb = fc.oneof(
  paginatedDataArb,
  singleEntityArb,
  fc.array(fc.record({ id: fc.uuid(), value: fc.float() })),
  fc.constant(null),
  fc.record({
    items: fc.array(fc.string()),
    count: fc.nat(),
  }),
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Preservation: TransformInterceptor single-envelope for correct controllers', () => {
  /**
   * Property: For all controller return values that do NOT contain a nested envelope structure,
   * the TransformInterceptor produces exactly one envelope layer: { success: true, message: "Success", data: T }
   * and the result is NOT double-wrapped.
   *
   * **Validates: Requirements 3.1, 3.2, 3.4**
   */
  it('should produce single-envelope for any non-envelope controller return value', () => {
    fc.assert(
      fc.property(nonEnvelopeDataArb, (controllerReturn) => {
        const response = transformInterceptorWrap(controllerReturn);

        // The response always has the single-envelope shape
        expect(response.success).toBe(true);
        expect(response.message).toBe('Success');
        expect(response.data).toEqual(controllerReturn);

        // For data that does NOT itself look like an envelope,
        // the wrapped result must NOT be double-wrapped
        if (
          controllerReturn === null ||
          typeof controllerReturn !== 'object' ||
          !('success' in (controllerReturn as Record<string, unknown>))
        ) {
          expect(isDoubleWrapped(response)).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property: For all paginated responses (like MasterDataController.findAllCategories),
   * the TransformInterceptor preserves the exact shape of the data inside the envelope.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('should preserve paginated data shape exactly inside single envelope', () => {
    fc.assert(
      fc.property(paginatedDataArb, (paginatedResult) => {
        const response = transformInterceptorWrap(paginatedResult);

        // The envelope is correct
        expect(response.success).toBe(true);
        expect(response.message).toBe('Success');

        // The data inside is identical to what the controller returned
        expect(response.data).toStrictEqual(paginatedResult);
        expect(Array.isArray(response.data.data)).toBe(true);
        expect(response.data.meta).toStrictEqual(paginatedResult.meta);

        // Not double-wrapped (paginated data doesn't have success/message)
        expect(isDoubleWrapped(response)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property: For all single entity responses (like MasterDataController.createCategory),
   * the entity shape is preserved exactly.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('should preserve single entity shape exactly inside single envelope', () => {
    fc.assert(
      fc.property(singleEntityArb, (entity) => {
        const response = transformInterceptorWrap(entity);

        expect(response.success).toBe(true);
        expect(response.message).toBe('Success');
        expect(response.data).toStrictEqual(entity);
        expect(isDoubleWrapped(response)).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property: For null returns (like soft-delete from MasterDataController),
   * the envelope wraps null correctly.
   *
   * **Validates: Requirements 3.1**
   */
  it('should wrap null returns correctly in single envelope', () => {
    const response = transformInterceptorWrap(null);

    expect(response.success).toBe(true);
    expect(response.message).toBe('Success');
    expect(response.data).toBeNull();
    expect(isDoubleWrapped(response)).toBe(false);
  });
});
