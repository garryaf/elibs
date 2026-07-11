import * as fc from 'fast-check';
import { AllExceptionsFilter, ErrorEnvelope } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

/**
 * Property-based tests for AllExceptionsFilter
 * Feature: architecture-foundation
 */

function createMockHost(headers: Record<string, string> = {}) {
  const mockRequest = { headers };
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const mockHost = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
  } as unknown as ArgumentsHost;

  return { mockRequest, mockResponse, mockHost };
}

// Feature: architecture-foundation, Property 7: AllExceptionsFilter propagates traceId from X-Request-ID
describe('Property 7: AllExceptionsFilter propagates traceId from X-Request-ID', () => {
  /**
   * Validates: Requirements 6.2
   *
   * For any exception and any X-Request-ID header value, the error response
   * traceId equals the provided header value.
   */
  it('should propagate X-Request-ID header as traceId in error response', () => {
    const filter = new AllExceptionsFilter();

    fc.assert(
      fc.property(fc.uuid(), (requestId) => {
        const { mockResponse, mockHost } = createMockHost({
          'x-request-id': requestId,
        });

        filter.catch(new Error('test error'), mockHost);

        const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
        expect(body.traceId).toBe(requestId);
      }),
      { numRuns: 100 },
    );
  });

  it('should propagate arbitrary string X-Request-ID values', () => {
    const filter = new AllExceptionsFilter();

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 128 }),
        (requestId) => {
          const { mockResponse, mockHost } = createMockHost({
            'x-request-id': requestId,
          });

          filter.catch(new HttpException('error', 400), mockHost);

          const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
          expect(body.traceId).toBe(requestId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: architecture-foundation, Property 8: AllExceptionsFilter never leaks stack traces
describe('Property 8: AllExceptionsFilter never leaks stack traces', () => {
  /**
   * Validates: Requirements 6.3
   *
   * For any exception (including those with multi-line stack traces),
   * the JSON response body SHALL NOT contain substrings matching stack trace
   * patterns (lines starting with "    at ").
   */
  it('should never include stack trace patterns in response for Error instances', () => {
    const filter = new AllExceptionsFilter();

    const stackFrameArb = fc
      .record({
        fn: fc.string({ minLength: 1, maxLength: 30 }),
        file: fc.string({ minLength: 1, maxLength: 30 }),
        line: fc.nat({ max: 9999 }),
        col: fc.nat({ max: 999 }),
      })
      .map(
        ({ fn, file, line, col }) =>
          `    at ${fn} (/${file}.ts:${line}:${col})`,
      );

    const errorWithStackArb = fc
      .record({
        message: fc.string({ minLength: 1, maxLength: 100 }),
        frames: fc.array(stackFrameArb, { minLength: 1, maxLength: 10 }),
      })
      .map(({ message, frames }) => {
        const err = new Error(message);
        err.stack = `Error: ${message}\n${frames.join('\n')}`;
        return err;
      });

    fc.assert(
      fc.property(errorWithStackArb, (error) => {
        const { mockResponse, mockHost } = createMockHost();

        filter.catch(error, mockHost);

        const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
        const bodyStr = JSON.stringify(body);

        // Should not contain stack trace pattern "    at "
        expect(bodyStr).not.toMatch(/\s{4}at\s/);
        // Should not contain file path patterns from the stack
        expect(bodyStr).not.toMatch(/\.[tj]s:\d+:\d+/);
      }),
      { numRuns: 100 },
    );
  });

  it('should never leak stack traces for TypeError instances', () => {
    const filter = new AllExceptionsFilter();

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (message) => {
          const err = new TypeError(message);
          err.stack = `TypeError: ${message}\n    at Object.<anonymous> (/app/src/service.ts:42:7)\n    at Module._compile (node:internal/modules/cjs/loader:1376:14)`;

          const { mockResponse, mockHost } = createMockHost();
          filter.catch(err, mockHost);

          const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
          const bodyStr = JSON.stringify(body);

          expect(bodyStr).not.toMatch(/\s{4}at\s/);
          expect(bodyStr).not.toContain('Object.<anonymous>');
          expect(bodyStr).not.toContain('Module._compile');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: architecture-foundation, Property 9: AllExceptionsFilter preserves HttpException status codes
describe('Property 9: AllExceptionsFilter preserves HttpException status codes', () => {
  /**
   * Validates: Requirements 6.5
   *
   * For any HttpException with status code 400–599, the response status code
   * equals the HttpException status.
   */
  it('should preserve status code for any HttpException in range 400-599', () => {
    const filter = new AllExceptionsFilter();

    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (statusCode, message) => {
          const exception = new HttpException(message, statusCode);
          const { mockResponse, mockHost } = createMockHost();

          filter.catch(exception, mockHost);

          expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return the HttpException status code in response, not 500', () => {
    const filter = new AllExceptionsFilter();

    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 499 }),
        (statusCode) => {
          const exception = new HttpException(
            { message: 'Error occurred', statusCode },
            statusCode,
          );
          const { mockResponse, mockHost } = createMockHost();

          filter.catch(exception, mockHost);

          // The response status must match the HttpException status, not default to 500
          expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
          expect(mockResponse.status).not.toHaveBeenCalledWith(500);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: architecture-foundation, Property 10: AllExceptionsFilter preserves validation errors
describe('Property 10: AllExceptionsFilter preserves validation errors', () => {
  /**
   * Validates: Requirements 6.7
   *
   * For any HttpException whose response body contains an errors array,
   * the filter output includes those entries in the errors field.
   */
  it('should preserve validation errors array from HttpException response', () => {
    const filter = new AllExceptionsFilter();

    const validationErrorArb = fc.record({
      field: fc.string({ minLength: 1, maxLength: 30 }),
      constraint: fc.string({ minLength: 1, maxLength: 100 }),
    });

    fc.assert(
      fc.property(
        fc.array(validationErrorArb, { minLength: 1, maxLength: 10 }),
        (errors) => {
          const exception = new HttpException(
            { message: 'Validation failed', errors },
            HttpStatus.BAD_REQUEST,
          );
          const { mockResponse, mockHost } = createMockHost();

          filter.catch(exception, mockHost);

          const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];

          // Each error entry should be preserved
          expect(body.errors).toHaveLength(errors.length);
          errors.forEach((err, index) => {
            expect(body.errors[index].field).toBe(err.field);
            expect(body.errors[index].constraint).toBe(err.constraint);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should preserve errors array with optional field property', () => {
    const filter = new AllExceptionsFilter();

    const errorEntryArb = fc.oneof(
      // Error with field
      fc.record({
        field: fc.string({ minLength: 1, maxLength: 30 }),
        constraint: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      // Error without field (constraint only)
      fc.record({
        constraint: fc.string({ minLength: 1, maxLength: 100 }),
      }),
    );

    fc.assert(
      fc.property(
        fc.array(errorEntryArb, { minLength: 1, maxLength: 5 }),
        (errors) => {
          const exception = new HttpException(
            { message: 'Validation failed', errors },
            HttpStatus.BAD_REQUEST,
          );
          const { mockResponse, mockHost } = createMockHost();

          filter.catch(exception, mockHost);

          const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];

          expect(body.errors).toHaveLength(errors.length);
          errors.forEach((err, index) => {
            expect(body.errors[index].constraint).toBe(err.constraint);
            if ('field' in err) {
              expect(body.errors[index].field).toBe(err.field);
            }
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
