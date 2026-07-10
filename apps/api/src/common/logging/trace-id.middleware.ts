import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware that ensures every request has a trace ID (X-Request-ID).
 * - Uses the incoming X-Request-ID header if present
 * - Generates a UUID v4 if no header is present
 * - Sets X-Request-ID on the response header for client correlation
 * - Stores traceId on the request object for pino-http to pick up via req.id
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId =
      (req.headers['x-request-id'] as string) || randomUUID();

    // Store on request for pino-http (pino-http reads req.id)
    (req as any).id = traceId;

    // Also set on headers so downstream code can access it
    req.headers['x-request-id'] = traceId;

    // Set response header for client correlation
    res.setHeader('X-Request-ID', traceId);

    next();
  }
}
