import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Decimal } from '@prisma/client/runtime/library';

export interface SuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

/**
 * Recursively converts Prisma Decimal instances to plain numbers
 * so JSON serialization produces numeric values instead of strings.
 */
function serializeDecimals(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Decimal) return obj.toNumber();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(serializeDecimals);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDecimals(value);
    }
    return result;
  }
  return obj;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        message: 'Success',
        data: serializeDecimals(data) as T,
      })),
    );
  }
}
