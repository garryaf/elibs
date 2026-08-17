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
 * Interceptor that enforces clinic-level data isolation for scoped roles.
 *
 * Scoped roles (KLINIK_PARTNER, DOKTER):
 * - If the user has no clinicId assigned, throws 403.
 * - If the user has a clinicId, attaches `request.dataScope = { clinicId }`
 *   for downstream service-layer filtering.
 *
 * For all other roles, passes through without modification.
 *
 * Requirement 17.4: Enforce clinic scope for DOKTER role approval queue access.
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  private readonly SCOPED_ROLES: Role[] = [Role.KLINIK_PARTNER, Role.DOKTER];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role && this.SCOPED_ROLES.includes(user.role)) {
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
