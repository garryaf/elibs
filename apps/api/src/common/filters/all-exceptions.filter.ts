import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export interface ErrorEnvelope {
  success: false;
  errorCode: string;
  message: string;
  errors: Array<{ field?: string; constraint: string }>;
  traceId: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const traceId =
      (request.headers['x-request-id'] as string) || randomUUID();

    let status: number;
    let message: string;
    let errorCode: string;
    let errors: Array<{ field?: string; constraint: string }> = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = typeof resp.message === 'string' ? resp.message : exception.message;

        // Preserve validation error arrays from HttpExceptions (e.g., from ValidationPipe)
        if (Array.isArray(resp.message)) {
          // If message is an array of strings (default NestJS validation format)
          errors = (resp.message as unknown[]).map((msg) => {
            if (typeof msg === 'string') {
              return { constraint: msg };
            }
            if (typeof msg === 'object' && msg !== null) {
              const entry = msg as Record<string, unknown>;
              return {
                ...(entry.field ? { field: entry.field as string } : {}),
                constraint: (entry.constraint as string) || String(msg),
              };
            }
            return { constraint: String(msg) };
          });
          message = typeof resp.error === 'string' ? resp.error : exception.message;
        }

        // If the response already has a structured errors array
        if (Array.isArray(resp.errors)) {
          errors = (resp.errors as unknown[]).map((err) => {
            if (typeof err === 'object' && err !== null) {
              const entry = err as Record<string, unknown>;
              return {
                ...(entry.field ? { field: entry.field as string } : {}),
                constraint: (entry.constraint as string) || String(err),
              };
            }
            return { constraint: String(err) };
          });
        }
      } else {
        message = exception.message;
      }

      errorCode = this.mapStatusToErrorCode(status);

      // Preserve custom errorCode from the exception response (e.g., ERR_DUPLICATE_ACTIVE_VISIT)
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (typeof resp.errorCode === 'string') {
          errorCode = resp.errorCode;
        }
      }
    } else {
      // Unknown/unhandled exception
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_SERVER_ERROR';

      // Log full stack trace server-side
      if (exception instanceof Error) {
        this.logger.error(
          `Unhandled exception: ${exception.message}`,
          exception.stack,
        );
      } else {
        this.logger.error('Unhandled exception', String(exception));
      }
    }

    // Log HttpExceptions at warn level for debugging
    if (exception instanceof HttpException) {
      this.logger.warn(
        `HttpException ${status}: ${message} [traceId=${traceId}]`,
      );
    }

    const envelope: ErrorEnvelope = {
      success: false,
      errorCode,
      message,
      errors,
      traceId,
    };

    response.status(status).json(envelope);
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
