// Feature: architecture-foundation, Property 12: LoggingInterceptor records request metadata
// Feature: architecture-foundation, Property 13: X-Request-ID generation and propagation
import * as fc from 'fast-check';
import { LoggingInterceptor } from './logging.interceptor';
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of } from 'rxjs';

/**
 * Validates: Requirements 8.1, 8.2, 8.4
 *
 * Property 12: For any completed HTTP request with a given method and path,
 * the log entry produced SHALL contain the HTTP method, request path, response
 * status code, and a non-negative duration in milliseconds.
 *
 * Property 13: For any incoming request, if the X-Request-ID header is provided,
 * the response SHALL echo that same value in the X-Request-ID response header
 * and the log entry. If the header is absent, the interceptor SHALL generate a
 * valid UUID v4 and use it in both the response header and the log entry.
 */
describe('LoggingInterceptor - Property Tests', () => {
  const UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function createMockContext(
    method: string,
    url: string,
    statusCode: number,
    requestId?: string,
  ) {
    const headers: Record<string, string> = {};
    if (requestId !== undefined) {
      headers['x-request-id'] = requestId;
    }

    const request = { method, url, headers };
    const response = { statusCode, setHeader: jest.fn() };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, response };
  }

  function createMockCallHandler(): CallHandler {
    return { handle: () => of(null) };
  }

  describe('Property 12: LoggingInterceptor records request metadata', () => {
    it('for any completed HTTP request, the log entry contains method, path, statusCode, and non-negative durationMs', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      try {
        fc.assert(
          fc.property(
            fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            fc
              .array(fc.stringMatching(/^[a-z0-9]+$/), { minLength: 1, maxLength: 4 })
              .map((segments) => '/' + segments.join('/')),
            fc.integer({ min: 100, max: 599 }),
            (method, path, statusCode) => {
              logSpy.mockClear();

              const interceptor = new LoggingInterceptor();
              const { context } = createMockContext(method, path, statusCode);
              const callHandler = createMockCallHandler();

              // of(null) emits synchronously, so tap() fires within subscribe
              interceptor.intercept(context, callHandler).subscribe();

              expect(logSpy).toHaveBeenCalledTimes(1);

              const loggedObject = logSpy.mock.calls[0][0];

              // Must contain the HTTP method
              expect(loggedObject.method).toBe(method);

              // Must contain the request path
              expect(loggedObject.path).toBe(path);

              // Must contain the response status code
              expect(loggedObject.statusCode).toBe(statusCode);

              // Must contain a non-negative duration in milliseconds
              expect(typeof loggedObject.durationMs).toBe('number');
              expect(loggedObject.durationMs).toBeGreaterThanOrEqual(0);
            },
          ),
          { numRuns: 100 },
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });

  describe('Property 13: X-Request-ID generation and propagation', () => {
    it('if X-Request-ID header is provided, the response echoes that value and it appears in the log entry', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      try {
        fc.assert(
          fc.property(fc.uuid(), (requestId) => {
            logSpy.mockClear();

            const interceptor = new LoggingInterceptor();
            const { context, response } = createMockContext('GET', '/test', 200, requestId);
            const callHandler = createMockCallHandler();

            interceptor.intercept(context, callHandler).subscribe();

            // Response header should echo the provided X-Request-ID
            expect(response.setHeader).toHaveBeenCalledWith('X-Request-ID', requestId);

            // Log entry should contain the same requestId
            expect(logSpy).toHaveBeenCalledTimes(1);
            const loggedObject = logSpy.mock.calls[0][0];
            expect(loggedObject.requestId).toBe(requestId);
          }),
          { numRuns: 100 },
        );
      } finally {
        logSpy.mockRestore();
      }
    });

    it('if X-Request-ID header is absent, the interceptor generates a valid UUID v4 for both response header and log entry', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

      try {
        fc.assert(
          fc.property(
            fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            fc
              .array(fc.stringMatching(/^[a-z0-9]+$/), { minLength: 1, maxLength: 4 })
              .map((segments) => '/' + segments.join('/')),
            (method, path) => {
              logSpy.mockClear();

              const interceptor = new LoggingInterceptor();
              const { context, response } = createMockContext(method, path, 200);
              const callHandler = createMockCallHandler();

              interceptor.intercept(context, callHandler).subscribe();

              // setHeader should have been called with X-Request-ID
              expect(response.setHeader).toHaveBeenCalledWith(
                'X-Request-ID',
                expect.any(String),
              );

              const generatedId = response.setHeader.mock.calls.find(
                (call: [string, string]) => call[0] === 'X-Request-ID',
              )?.[1] as string;

              // Generated ID must be a valid UUID v4
              expect(generatedId).toMatch(UUID_V4_REGEX);

              // Log entry should contain the same generated requestId
              expect(logSpy).toHaveBeenCalledTimes(1);
              const loggedObject = logSpy.mock.calls[0][0];
              expect(loggedObject.requestId).toBe(generatedId);
            },
          ),
          { numRuns: 100 },
        );
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
