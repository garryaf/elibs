/**
 * Bug Condition Exploration Test — NCR-01-09: Middleware Cookie Bypass
 *
 * These tests encode the EXPECTED (correct) behavior:
 * - Requests with only `elis_authenticated=true` (no `elis_token`) MUST be rejected
 * - Requests with expired `elis_token` + `elis_authenticated=true` MUST be rejected
 *
 * On UNFIXED code, these tests are EXPECTED TO FAIL because the legacy fallback
 * `else if (authCookie?.value === "true")` grants access without JWT validation.
 *
 * Validates: Requirements 2.1, 2.2
 */

// Mock next/server before importing middleware
const mockRedirect = jest.fn();
const mockNext = jest.fn();

jest.mock('next/server', () => {
  // Create a mock cookie map class
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

  // Mock NextResponse
  const NextResponseMock = {
    redirect: (url: URL) => {
      const response = {
        status: 307,
        headers: new Map([['location', url.toString()]]),
        cookies: { delete: jest.fn() },
      };
      // Normalize headers.get to work like a Headers object
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

  // Mock NextRequest
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

// Helper: create a valid-looking but expired JWT (exp in the past)
function createExpiredJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'ADMIN',
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    }),
  ).toString('base64url');
  const signature = 'fakesignature';
  return `${header}.${payload}.${signature}`;
}

// Helper: create a mock NextRequest
function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
  const { NextRequest } = require('next/server');
  const url = `http://localhost:3000${pathname}`;
  const request = new NextRequest(url, { cookies });
  // Set cookies after construction (matching the mock pattern)
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value);
  }
  return request;
}

describe('NCR-01-09: Middleware Cookie Bypass Bug Condition', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockNext.mockClear();
  });

  describe('Bug Condition: Cookie-only authentication must be REJECTED', () => {
    it('should REJECT request to /dashboard/patients with only elis_authenticated=true (no elis_token)', () => {
      // Bug condition: elis_authenticated=true present, elis_token absent
      // Expected behavior: redirect to login
      const request = createMockRequest('/dashboard/patients', {
        elis_authenticated: 'true',
      });

      const response = middleware(request);

      // The middleware should redirect to login page (status 307)
      expect(response).toBeDefined();
      expect(response.status).toBe(307);

      // Should have been redirected, not passed through
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should REJECT request with expired elis_token AND elis_authenticated=true', () => {
      // Bug condition: expired JWT + boolean cookie fallback
      // Expected behavior: redirect to login (expired token should not be valid)
      const expiredToken = createExpiredJwt();
      const request = createMockRequest('/dashboard/patients', {
        elis_token: expiredToken,
        elis_authenticated: 'true',
      });

      const response = middleware(request);

      // The middleware should redirect to login page (status 307)
      expect(response).toBeDefined();
      expect(response.status).toBe(307);

      // Should have been redirected, not passed through
      expect(mockRedirect).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
