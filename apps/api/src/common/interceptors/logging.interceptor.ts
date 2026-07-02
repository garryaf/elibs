import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate or propagate X-Request-ID
    const requestId =
      (request.headers['x-request-id'] as string) || crypto.randomUUID();

    // Store requestId on the request object for downstream use (e.g., AllExceptionsFilter)
    request.headers['x-request-id'] = requestId;

    // Set X-Request-ID response header for client correlation
    response.setHeader('X-Request-ID', requestId);

    // Record start timestamp
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger.log({
          method: request.method,
          path: request.url,
          statusCode: response.statusCode,
          durationMs,
          requestId,
        });
      }),
    );
  }
}
