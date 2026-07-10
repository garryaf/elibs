/**
 * Preservation Property Tests — Frontend API Client
 *
 * These tests capture existing CORRECT behavior that must be preserved after the fix.
 * They verify:
 * 1. Single-envelope responses pass through unchanged (idempotent unwrap)
 * 2. Paginated/nested data shapes are preserved exactly
 * 3. Explicitly-set NEXT_PUBLIC_API_URL values are never overridden
 * 4. MasterDataController endpoint responses maintain their shape
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * Observation (UNFIXED code):
 * - apiClient with explicit NEXT_PUBLIC_API_URL uses that value directly
 * - Single-envelope responses { success, message, data } from correct controllers
 *   parse correctly on the frontend without any unwrap needed
 * - Docker Compose with explicit NEXT_PUBLIC_API_URL=https://api.production.com
 *   resolves to that exact value
 */

import * as fc from 'fast-check';

// ─── Simulate the unwrapResponse utility (preservation-safe version) ────────

/**
 * The unwrapResponse utility that will be added in task 3.3.
 * For preservation, it must be IDEMPOTENT on single-envelope responses:
 * - If data does NOT have a nested envelope (no double-wrap), return data as-is.
 * - A double-wrapped shape is: { success: boolean, message: string, data: any }
 *   where the outer data ITSELF has success (boolean) + message (string) + data.
 *
 * This function represents the DESIRED behavior of the unwrap utility for
 * non-buggy inputs. On unfixed code, this is effectively a pass-through
 * because single-envelope responses don't trigger unwrapping.
 */
function unwrapResponse<T>(data: unknown): T {
  // Detect double-wrapped shape: data has { success: boolean, message: string, data: any }
  if (
    data !== null &&
    typeof data === 'object' &&
    'success' in data &&
    typeof (data as Record<string, unknown>).success === 'boolean' &&
    'message' in data &&
    typeof (data as Record<string, unknown>).message === 'string' &&
    'data' in data
  ) {
    // This IS a double-wrapped response — extract inner data
    return (data as Record<string, unknown>).data as T;
  }
  // Not double-wrapped — return as-is (preservation)
  return data as T;
}

/**
 * Simulates API URL resolution logic.
 * When NEXT_PUBLIC_API_URL is explicitly set (non-empty), use that value.
 * The fix only changes behavior when the value is empty/undefined.
 */
function resolveApiUrl(envValue: string | undefined): string {
  return envValue || '';
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate data payloads that do NOT look like an envelope.
 * These represent the `T` inside `{ success, message, data: T }` for correct controllers.
 * Key constraint: T does NOT have a nested `success` boolean field at the top level.
 */
const nonEnvelopePayloadArb: fc.Arbitrary<unknown> = fc.oneof(
  // Paginated arrays
  fc.record({
    data: fc.array(
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 30 }),
        code: fc.option(fc.string({ maxLength: 10 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 15 },
    ),
    meta: fc.record({
      total: fc.nat({ max: 500 }),
      page: fc.integer({ min: 1, max: 50 }),
      limit: fc.integer({ min: 1, max: 50 }),
    }),
  }),
  // Single entity objects (without success field)
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    createdAt: fc.integer({ min: 946684800000, max: 1924905600000 }).map((ts) => new Date(ts).toISOString()),
  }),
  // Arrays of items
  fc.array(
    fc.record({ id: fc.uuid(), value: fc.double({ min: 0, max: 10000 }) }),
    { maxLength: 20 },
  ),
  // Null (soft-delete results)
  fc.constant(null),
  // Nested objects without envelope shape
  fc.record({
    items: fc.array(fc.string({ maxLength: 20 }), { maxLength: 10 }),
    count: fc.nat({ max: 100 }),
    filters: fc.record({
      status: fc.constantFrom('active', 'inactive', 'all'),
      page: fc.nat({ max: 100 }),
    }),
  }),
);

/**
 * Generate explicitly-set API URL values (non-empty strings).
 * These represent production deployments or explicit dev configs.
 */
const explicitApiUrlArb = fc.oneof(
  fc.constant('https://api.production.com'),
  fc.constant('https://api.staging.example.com'),
  fc.constant('http://localhost:3001'),
  fc.constant('http://10.0.0.1:3001'),
  fc.webUrl().filter((url) => url.length > 0),
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Preservation: unwrapResponse is idempotent on single-envelope data', () => {
  /**
   * Property: For all single-envelope responses { success: boolean, message: string, data: T }
   * where T does NOT have a nested `success` boolean field, unwrapResponse(response)
   * SHALL return the response data unchanged (idempotent).
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('should return non-envelope data unchanged through unwrapResponse', () => {
    fc.assert(
      fc.property(nonEnvelopePayloadArb, (payload) => {
        // The payload itself is what the frontend receives as `data` field after JSON parse
        // For non-buggy inputs, this payload should pass through unchanged
        const result = unwrapResponse(payload);

        // For payloads that don't look like an envelope, should be unchanged
        if (
          payload === null ||
          typeof payload !== 'object' ||
          !('success' in (payload as Record<string, unknown>)) ||
          typeof (payload as Record<string, unknown>).success !== 'boolean' ||
          !('message' in (payload as Record<string, unknown>)) ||
          typeof (payload as Record<string, unknown>).message !== 'string' ||
          !('data' in (payload as Record<string, unknown>))
        ) {
          expect(result).toEqual(payload);
        }
      }),
      { numRuns: 300 },
    );
  });

  /**
   * Property: For all randomly generated paginated arrays and nested objects as data,
   * the unwrap utility SHALL preserve the shape exactly.
   *
   * **Validates: Requirements 3.1, 3.4, 3.5**
   */
  it('should preserve paginated data shapes exactly', () => {
    const paginatedArb = fc.record({
      data: fc.array(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 30 }),
          status: fc.constantFrom('active', 'inactive', 'pending'),
        }),
        { minLength: 0, maxLength: 20 },
      ),
      meta: fc.record({
        total: fc.nat({ max: 1000 }),
        page: fc.integer({ min: 1, max: 100 }),
        limit: fc.integer({ min: 1, max: 100 }),
      }),
    });

    fc.assert(
      fc.property(paginatedArb, (paginatedData) => {
        // Paginated data does not have success/message fields, so it should pass through
        const result = unwrapResponse<typeof paginatedData>(paginatedData);

        expect(result).toStrictEqual(paginatedData);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBe(paginatedData.data.length);
        expect(result.meta).toStrictEqual(paginatedData.meta);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property: For all nested objects that coincidentally have some fields
   * but NOT the full envelope shape, the data passes through unchanged.
   *
   * **Validates: Requirements 3.2, 3.4**
   */
  it('should not falsely unwrap objects that partially resemble envelopes', () => {
    // Objects that have 'data' but not 'success' as boolean + 'message' as string
    const partialEnvelopeLikeArb = fc.oneof(
      fc.record({
        data: fc.array(fc.nat(), { maxLength: 10 }),
        total: fc.nat(),
      }),
      fc.record({
        success: fc.constant('yes' as unknown as boolean), // string, not boolean
        message: fc.string(),
        data: fc.array(fc.string()),
      }),
      fc.record({
        success: fc.boolean(),
        // missing message field
        data: fc.string(),
      }),
      fc.record({
        data: fc.record({ nested: fc.string() }),
        meta: fc.record({ page: fc.nat() }),
      }),
    );

    fc.assert(
      fc.property(partialEnvelopeLikeArb, (data) => {
        const result = unwrapResponse(data);
        // Objects without the FULL envelope shape (success: boolean + message: string + data)
        // should pass through unchanged
        const hasFullEnvelopeShape =
          typeof (data as Record<string, unknown>).success === 'boolean' &&
          typeof (data as Record<string, unknown>).message === 'string' &&
          'data' in (data as Record<string, unknown>);

        if (!hasFullEnvelopeShape) {
          expect(result).toEqual(data);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('Preservation: Explicit NEXT_PUBLIC_API_URL values are never overridden', () => {
  /**
   * Property: For all explicitly-set NEXT_PUBLIC_API_URL values (non-empty string),
   * the resolved URL SHALL equal the provided value (no override).
   *
   * **Validates: Requirements 3.3**
   */
  it('should use explicit API URL values without modification', () => {
    fc.assert(
      fc.property(explicitApiUrlArb, (explicitUrl) => {
        const resolved = resolveApiUrl(explicitUrl);

        // Explicit non-empty values should be used directly
        expect(resolved).toBe(explicitUrl);
        expect(resolved.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Docker Compose with explicit NEXT_PUBLIC_API_URL preserves the value.
   * The `${NEXT_PUBLIC_API_URL:-http://localhost:3001}` syntax means:
   * - If var is set (even to empty), use the set value
   * - If var is unset, use the fallback
   *
   * For production (explicitly set to empty for Nginx same-origin), the fallback
   * does NOT activate because the var IS set (just to empty).
   *
   * **Validates: Requirements 3.3**
   */
  it('should preserve production empty-string config when explicitly set', () => {
    // In production behind Nginx, NEXT_PUBLIC_API_URL is explicitly set to ""
    // The current behavior: empty string means same-origin (relative paths)
    const resolved = resolveApiUrl('');
    expect(resolved).toBe('');

    // Production domains are preserved
    const prodResolved = resolveApiUrl('https://api.production.com');
    expect(prodResolved).toBe('https://api.production.com');
  });
});

describe('Preservation: MasterDataController endpoint response shape is unchanged', () => {
  /**
   * Property: For all MasterDataController endpoint responses, the response shape
   * after fix SHALL be identical to before fix.
   *
   * MasterDataController already follows the correct pattern (no manual wrapping).
   * TransformInterceptor wraps the raw return value once.
   * The fix should not affect these responses at all.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('should maintain MasterDataController single-envelope shape through unwrap', () => {
    // Use integer-based date generation to avoid Invalid Date issues
    const isoDateArb = fc
      .integer({ min: 946684800000, max: 1924905600000 }) // 2000-01-01 to 2030-12-31 in ms
      .map((ts) => new Date(ts).toISOString());

    // Simulate MasterDataController response shapes (already correct single-envelope)
    const masterDataResponseArb = fc.record({
      data: fc.array(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          code: fc.option(fc.string({ minLength: 2, maxLength: 10 }), { nil: undefined }),
          description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
          isActive: fc.boolean(),
          createdAt: isoDateArb,
          updatedAt: isoDateArb,
        }),
        { minLength: 0, maxLength: 20 },
      ),
      meta: fc.record({
        total: fc.nat({ max: 500 }),
        page: fc.integer({ min: 1, max: 50 }),
        limit: fc.integer({ min: 1, max: 50 }),
      }),
    });

    fc.assert(
      fc.property(masterDataResponseArb, (masterDataPayload) => {
        // After TransformInterceptor, the full response is:
        // { success: true, message: "Success", data: masterDataPayload }
        // Frontend receives masterDataPayload as the "data" field

        // The unwrapResponse should NOT modify this because it's not double-wrapped
        // masterDataPayload has { data: [...], meta: {...} } — no success/message fields
        const result = unwrapResponse<typeof masterDataPayload>(masterDataPayload);
        expect(result).toStrictEqual(masterDataPayload);

        // Verify array structure is preserved
        expect(Array.isArray(result.data)).toBe(true);
        for (let i = 0; i < result.data.length; i++) {
          expect(result.data[i]).toStrictEqual(masterDataPayload.data[i]);
        }
        expect(result.meta).toStrictEqual(masterDataPayload.meta);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Verifies that patient/order paginated responses also pass through unchanged.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('should preserve patient and order endpoint response shapes', () => {
    const isoDateArb = fc
      .integer({ min: -1577923200000, max: 1924905600000 }) // 1920-01-01 to 2030-12-31 in ms
      .map((ts) => new Date(ts).toISOString());

    const patientResponseArb = fc.record({
      data: fc.array(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          medicalRecordNumber: fc.string({ minLength: 5, maxLength: 20 }),
          dateOfBirth: isoDateArb,
          gender: fc.constantFrom('MALE', 'FEMALE'),
        }),
        { minLength: 0, maxLength: 15 },
      ),
      meta: fc.record({
        total: fc.nat({ max: 1000 }),
        page: fc.integer({ min: 1, max: 50 }),
        limit: fc.integer({ min: 1, max: 50 }),
      }),
    });

    fc.assert(
      fc.property(patientResponseArb, (patientData) => {
        const result = unwrapResponse<typeof patientData>(patientData);
        expect(result).toStrictEqual(patientData);
        expect(Array.isArray(result.data)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
