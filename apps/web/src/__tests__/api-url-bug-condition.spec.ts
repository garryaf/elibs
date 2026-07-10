/**
 * Bug Condition Exploration Test — URL Misconfiguration & Frontend Unwrap
 *
 * **Validates: Requirements 1.2, 1.4, 2.2, 2.4**
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms:
 * - NEXT_PUBLIC_API_URL="" resolves to empty string instead of "http://localhost:3001"
 * - No defensive unwrapResponse() utility exists to handle double-wrapped responses
 *
 * Counterexamples expected:
 * - NEXT_PUBLIC_API_URL="" resolves to "" (same-origin) instead of "http://localhost:3001"
 * - Double-wrapped response causes .map() crash when iterated
 */

import * as fc from 'fast-check';

describe('Bug Condition: API URL Resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Test 3 — URL Resolution with empty NEXT_PUBLIC_API_URL', () => {
    it('should resolve base URL to http://localhost:3001 when NEXT_PUBLIC_API_URL is empty', async () => {
      // Simulate empty env var (the bug condition in docker-compose.yml)
      process.env.NEXT_PUBLIC_API_URL = '';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test'; // non-production

      // Re-import the module to pick up the new env value
      const apiModule = await import('../lib/api');

      // The fixed API client should resolve to http://localhost:3001 when
      // NEXT_PUBLIC_API_URL is empty in non-production environments.
      // Access the apiClient's baseUrl via a constructed URL check
      // The apiClient uses the API_BASE_URL resolved at module load time
      expect((apiModule.apiClient as any).baseUrl).toBe('http://localhost:3001');
    });

    it('should NOT produce same-origin requests when NEXT_PUBLIC_API_URL is empty', async () => {
      process.env.NEXT_PUBLIC_API_URL = '';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test'; // non-production

      const apiModule = await import('../lib/api');
      const baseUrl = (apiModule.apiClient as any).baseUrl;
      const endpoint = '/api/v1/users';
      const fullUrl = `${baseUrl}${endpoint}`;

      // The bug: fullUrl becomes "/api/v1/users" (relative, same-origin → hits Next.js on port 3000)
      // Expected: fullUrl should be "http://localhost:3001/api/v1/users" (absolute → hits NestJS)
      expect(fullUrl).toBe('http://localhost:3001/api/v1/users');
    });

    it('property: for any API endpoint, empty NEXT_PUBLIC_API_URL should resolve to localhost:3001', async () => {
      process.env.NEXT_PUBLIC_API_URL = '';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test'; // non-production

      const apiModule = await import('../lib/api');
      const baseUrl = (apiModule.apiClient as any).baseUrl;

      fc.assert(
        fc.property(
          fc.constantFrom(
            '/api/v1/users',
            '/api/v1/master/test-categories',
            '/api/v1/patients',
            '/api/v1/orders',
            '/api/v1/lab/queue',
          ),
          (endpoint) => {
            const fullUrl = `${baseUrl}${endpoint}`;

            // Property: URL must start with http://localhost:3001
            return fullUrl.startsWith('http://localhost:3001');
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});

describe('Bug Condition: Frontend Response Unwrap', () => {
  describe('Test 4 — Frontend Unwrap: double-wrapped response handling', () => {
    /**
     * Simulates what the frontend receives from the API.
     * On UNFIXED code, there is NO unwrapResponse utility.
     * This test asserts that such a utility exists and works correctly.
     */

    // Try to import unwrapResponse — on unfixed code this won't exist
    let unwrapResponse: ((data: unknown) => unknown) | undefined;

    beforeAll(async () => {
      try {
        // Attempt to import the utility that should exist after the fix
        const apiModule = await import('../lib/api');
        unwrapResponse = (apiModule as any).unwrapResponse;
      } catch {
        // Module import may fail in test environment, that's expected
        unwrapResponse = undefined;
      }
    });

    it('unwrapResponse utility should exist in the API client', () => {
      // On UNFIXED code, this utility does not exist
      // This test will FAIL — confirming the bug condition
      expect(unwrapResponse).toBeDefined();
      expect(typeof unwrapResponse).toBe('function');
    });

    it('should extract inner payload from double-wrapped response without .map() crash', () => {
      // Simulate a double-wrapped response from UsersController
      const doubleWrappedResponse = {
        success: true,
        message: 'Success',
        data: {
          success: true,
          message: 'Users retrieved successfully',
          data: {
            data: [
              { id: 'uuid-1', email: 'user1@example.com', name: 'User 1', role: 'ADMIN' },
              { id: 'uuid-2', email: 'user2@example.com', name: 'User 2', role: 'STAFF' },
            ],
            meta: { total: 2, page: 1, limit: 10 },
          },
        },
      };

      // If unwrapResponse exists, use it; otherwise try the raw approach (which will fail)
      if (unwrapResponse) {
        const unwrapped = unwrapResponse(doubleWrappedResponse.data) as any;
        // After unwrapping, we should get the inner { data: [...], meta: {...} }
        expect(unwrapped).toHaveProperty('data');
        expect(Array.isArray(unwrapped.data)).toBe(true);
        expect(unwrapped.meta).toBeDefined();
        // Should NOT crash with .map()
        expect(() => unwrapped.data.map((item: any) => item.id)).not.toThrow();
      } else {
        // On unfixed code: trying to use .data directly leads to the double-wrap problem
        // The frontend does: response.data.data expecting an array
        // But with double-wrap: response.data = { success, message, data: { data, meta } }
        // So response.data.data = { data: [...], meta: {...} } — an object, not an array
        const responseData = doubleWrappedResponse.data;

        // This is what the frontend does — accesses .data expecting the paginated result
        // With double-wrap, responseData itself IS the inner envelope
        // The frontend then tries .data on it, getting yet another level
        const extracted = (responseData as any).data;

        // The bug: extracted is { data: [...], meta: {...} } — NOT an array
        // Frontend then calls extracted.map() which CRASHES
        // We assert the EXPECTED behavior: extracted should be an array (after proper unwrap)
        expect(Array.isArray(extracted)).toBe(true);
      }
    });

    it('property: double-wrapped responses should be safely unwrapped to extract arrays', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              role: fc.constantFrom('ADMIN', 'STAFF', 'SUPER_ADMIN'),
            }),
            { minLength: 0, maxLength: 10 },
          ),
          (users) => {
            // Generate a double-wrapped response
            const doubleWrapped = {
              success: true,
              message: 'Success',
              data: {
                success: true,
                message: 'Users retrieved successfully',
                data: {
                  data: users,
                  meta: { total: users.length, page: 1, limit: 10 },
                },
              },
            };

            if (unwrapResponse) {
              // With the fix: unwrapResponse should extract inner data
              const unwrapped = unwrapResponse(doubleWrapped.data) as any;
              return Array.isArray(unwrapped.data) && unwrapped.data.length === users.length;
            } else {
              // Without the fix: the raw access pattern fails
              // response.data (the inner envelope) is NOT the paginated result
              const innerData = doubleWrapped.data;
              // Frontend expects innerData to be { data: [...], meta } directly
              // But it's actually { success, message, data: { data: [...], meta } }
              // So innerData.data is NOT an array — it's { data: [...], meta }
              return !Array.isArray((innerData as any).data);
              // This returns true (confirming the bug exists) but the TEST
              // should fail because we're asserting the EXPECTED behavior below
            }
          },
        ),
        { numRuns: 20 },
      );

      // The definitive assertion: unwrapResponse must exist for the property to hold
      expect(unwrapResponse).toBeDefined();
    });
  });
});
