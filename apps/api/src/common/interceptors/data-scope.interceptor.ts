import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Role } from '@prisma/client';

/**
 * Interceptor that enforces clinic-level data isolation for KLINIK_PARTNER users.
 *
 * - If the user has role KLINIK_PARTNER and no clinicId assigned, throws 403.
 * - If the user has role KLINIK_PARTNER and a clinicId, attaches
 *   `request.dataScope = { clinicId }` for downstream service-layer filtering.
 * - For all other roles, passes through without modification.
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === Role.KLINIK_PARTNER) {
      if (!user.clinicId) {
        throw new ForbiddenException({
          errorCode: 'ERR_NO_CLINIC_ASSIGNED',
          message: 'Klinik belum ditetapkan untuk user ini. Hubungi admin untuk menetapkan klinik.',
          userRole: user.role,
        });
      }
      // Attach clinicId to request for service-layer filtering
      request.dataScope = { clinicId: user.clinicId };
    }

    return next.handle();
  }
}
