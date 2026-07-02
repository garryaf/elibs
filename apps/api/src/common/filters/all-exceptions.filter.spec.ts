import { AllExceptionsFilter, ErrorEnvelope } from './all-exceptions.filter';
import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockRequest: Record<string, unknown>;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should return 500 for unknown exceptions with generic message', () => {
    const error = new Error('Something secret broke');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(body.message).toBe('Internal server error');
    expect(body.errors).toEqual([]);
    expect(body.traceId).toBeDefined();
  });

  it('should never include stack traces in response body', () => {
    const error = new Error('Secret error');
    error.stack = 'Error: Secret error\n    at Object.<anonymous> (/app/src/main.ts:10:5)';

    filter.catch(error, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('at Object');
    expect(bodyStr).not.toContain('/app/src/main.ts');
    expect(bodyStr).not.toContain('Secret error');
  });

  it('should preserve HttpException status codes', () => {
    const exception = new NotFoundException('Resource not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.errorCode).toBe('NOT_FOUND');
  });

  it('should use X-Request-ID from request headers as traceId', () => {
    mockRequest.headers = { 'x-request-id': 'custom-trace-id-123' };
    const error = new Error('test');

    filter.catch(error, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.traceId).toBe('custom-trace-id-123');
  });

  it('should generate a UUID v4 traceId when X-Request-ID is not provided', () => {
    const error = new Error('test');

    filter.catch(error, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should map 400 to VALIDATION_ERROR errorCode', () => {
    const exception = new BadRequestException('Validation failed');

    filter.catch(exception, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.errorCode).toBe('VALIDATION_ERROR');
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('should map 401 to UNAUTHORIZED errorCode', () => {
    const exception = new UnauthorizedException();

    filter.catch(exception, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.errorCode).toBe('UNAUTHORIZED');
  });

  it('should map 403 to FORBIDDEN errorCode', () => {
    const exception = new ForbiddenException();

    filter.catch(exception, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.errorCode).toBe('FORBIDDEN');
  });

  it('should preserve validation error arrays from HttpException', () => {
    const validationErrors = [
      { field: 'email', constraint: 'email must be a valid email' },
      { field: 'name', constraint: 'name should not be empty' },
    ];
    const exception = new HttpException(
      { message: 'Validation failed', errors: validationErrors },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.errors).toEqual(validationErrors);
  });

  it('should handle NestJS default validation pipe error format (message as array)', () => {
    // NestJS ValidationPipe returns: { message: ['error1', 'error2'], error: 'Bad Request', statusCode: 400 }
    const exception = new BadRequestException({
      message: ['email must be an email', 'name should not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.errors).toHaveLength(2);
    expect(body.errors[0]).toEqual({ constraint: 'email must be an email' });
    expect(body.errors[1]).toEqual({ constraint: 'name should not be empty' });
    expect(body.message).toBe('Bad Request');
  });

  it('should handle non-Error thrown values (e.g., strings)', () => {
    filter.catch('string error', mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(body.message).toBe('Internal server error');
  });

  it('should return envelope with all required fields', () => {
    const exception = new InternalServerErrorException('Oops');

    filter.catch(exception, mockHost);

    const body: ErrorEnvelope = mockResponse.json.mock.calls[0][0];
    expect(body).toHaveProperty('success', false);
    expect(body).toHaveProperty('errorCode');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('errors');
    expect(body).toHaveProperty('traceId');
    expect(Array.isArray(body.errors)).toBe(true);
  });
});
