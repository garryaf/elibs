/**
 * Preservation Property Tests — NCR-01-09: Middleware
 *
 * These tests capture existing CORRECT behavior that must remain unchanged after the fix.
 * They verify that:
 * - Valid JWT access to /dashboard/* routes continues to work
 * - Unauthenticated access to login page (/) continues to work
 * - Authenticated redirect from / to /dashboard continues to work
 *
 * These tests MUST PASS on UNFIXED code and continue to pass after the fix.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import * as fc from 'fast-check';

// Mock next/server before importing middleware
const mockRedirect = jest.fn();
const mockNext = jest.fn();

jest.mock('next/server', () => {
  class MockRequestCookies {
    private cookies: Map<string, { name: string; value: string }>;
    constructor(cookies: Record<string, string> = {}) {
      this.cookies = new Map();
      for (const [name, value] of Object.entries(cookies)) {
        this.cookies.set(name, { name, value });
      }
    }
    get(name: string) {
      return this.cookies.get(name) || undefined;
    }
    set(name: string, value: string) {
      this.cookies.set(name, { name, value });
    }
    delete(name: string) {
      this.cookies.delete(name);
    }
  }

  const NextResponseMock = {
    redirect: (url: URL) => {
      const response = {
        status: 307,
        headers: new Map([['location', url.toString()]]),
        cookies: { delete: jest.fn() },
      };
      (response.headers as any).get = (key: string) => response.headers.get(key);
      mockRedirect(url.toString());
      return response;
    },
    next: () => {
      const response = { status: 200, headers: new Map(), cookies: {} };
      mockNext();
      return response;
    },
  };

  class MockNextRequest {
    nextUrl: URL;
    url: string;
    cookies: MockRequestCookies;

    constructor(url: string | URL, options: { cookies?: Record<string, string> } = {}) {
      this.nextUrl = typeof url === 'string' ? new URL(url) : url;
      this.url = this.nextUrl.toString();
      this.cookies = new MockRequestCookies(options.cookies || {});
    }
  }

  return {
    NextResponse: NextResponseMock,
    NextRequest: MockNextRequest,
    __esModule: true,
  };
});

// Import middleware AFTER mocking
import { middleware } from '@/middleware';

// Helper: create a valid (non-expired) JWT
function createValidJwt(payload?: {
  sub?: string;
  email?: string;
  role?: string;
  exp?: number;
}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      sub: payload?.sub || 'user-123',
      email: payload?.email || 'test@example.com',
      role: payload?.role || 'ADMIN',
      exp: payload?.exp || Math.floor(Date.now() / 1000) + 3600, // valid for 1 hour from now
    }),
  ).toString('base64url');
  const signature = 'fakesignature';
  return `${header}.${body}.${signature}`;
}

// Helper: create a mock NextRequest
function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
  const { NextRequest } = require('next/server');
  const url = `http://localhost:3000${pathname}`;
  const request = new NextRequest(url, { cookies });
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe('Preservation: Middleware valid JWT access and login page behavior', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockNext.mockClear();
  });

  /**
   * Preservation: Valid JWT access preserved
   * Request to /dashboard/patients with valid non-expired elis_token → middleware calls NextResponse.next()
   *
   * **Validates: Requirements 3.1**
   */
  it('should grant access to /dashboard/patients with valid non-expired elis_token', () => {
    const validToken = createValidJwt();
    const request = createMockRequest('/dashboard/patients', {
      elis_token: validToken,
    });

    const response = middleware(request);

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  /**
   * Preservation: Unauthenticated login page access preserved
   * Request to / with no cookies → middleware calls NextResponse.next() (login page shown)
   *
   * **Validates: Requirements 3.2**
   */
  it('should allow unauthenticated access to login page /', () => {
    const request = createMockRequest('/');

    const response = middleware(request);

    expect(response).toBeDefined();
    expect(response.status).toBe(200);
    expect(mockNext).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  /**
   * Preservation: Authenticated redirect to dashboard preserved
   * Request to / with valid elis_token → middleware redirects to /dashboard
   *
   * **Validates: Requirements 3.3**
   */
  it('should redirect authenticated user from / to /dashboard', () => {
    const validToken = createValidJwt();
    const request = createMockRequest('/', {
      elis_token: validToken,
    });

    const response = middleware(request);

    expect(response).toBeDefined();
    expect(response.status).toBe(307);
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/dashboard'));
    expect(mockNext).not.toHaveBeenCalled();
  });

  /**
   * Property-based test: For all valid, non-expired JWT payloads,
   * middleware continues to grant access to /dashboard/* routes.
   *
   * **Validates: Requirements 3.1**
   */
  it('should grant access for all valid non-expired JWT payloads to /dashboard/* routes', () => {
    const roles = ['ADMIN', 'SUPER_ADMIN', 'STAFF', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN'];

    // Generate valid JWT payload with future expiry
    const validJwtPayloadArb = fc.record({
      sub: fc.uuid(),
      email: fc.emailAddress(),
      role: fc.constantFrom(...roles),
      // exp must be in the future: at least 31 seconds from now (to pass the 30s buffer)
      exp: fc.integer({
        min: Math.floor(Date.now() / 1000) + 60,
        max: Math.floor(Date.now() / 1000) + 86400,
      }),
    });

    // Generate various /dashboard/* paths
    const dashboardPathArb = fc.constantFrom(
      '/dashboard',
      '/dashboard/patients',
      '/dashboard/visits',
      '/dashboard/orders',
      '/dashboard/settings',
      '/dashboard/users',
      '/dashboard/laboratory',
    );

    fc.assert(
      fc.property(validJwtPayloadArb, dashboardPathArb, (payload, path) => {
        mockRedirect.mockClear();
        mockNext.mockClear();

        const token = createValidJwt(payload);
        const request = createMockRequest(path, { elis_token: token });

        const response = middleware(request);

        // Valid JWT must always grant access
        expect(response.status).toBe(200);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRedirect).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
