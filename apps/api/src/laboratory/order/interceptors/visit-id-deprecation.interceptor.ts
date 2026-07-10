import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor that logs a deprecation warning when a POST /api/v1/orders
 * request is received without a visitId field.
 *
 * Since the global ValidationPipe will reject the request with HTTP 400,
 * this interceptor logs the warning BEFORE that rejection occurs, capturing
 * the user ID and timestamp for audit/deprecation tracking purposes.
 *
 * Execution order: Guards (JwtAuth) → Interceptors → Pipes (ValidationPipe) → Handler
 * This means the interceptor has access to the authenticated user but runs before
 * the validation pipe rejects the request body.
 */
@Injectable()
export class VisitIdDeprecationInterceptor implements NestInterceptor {
  private readonly logger = new Logger('OrderDeprecation');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Check if visitId is missing or null in the raw request body
    if (!body || body.visitId === undefined || body.visitId === null || body.visitId === '') {
      const userId = request.user?.id || 'unknown';
      const timestamp = new Date().toISOString();

      this.logger.warn(
        `Deprecation: POST /api/v1/orders request received without visitId. ` +
        `visitId is now a required field. ` +
        `userId=${userId}, timestamp=${timestamp}. ` +
        `Caller must create a Visit first via POST /api/v1/visits.`,
      );
    }

    return next.handle();
  }
}
