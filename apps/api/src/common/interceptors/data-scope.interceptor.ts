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
 * Scoped roles (KLINIK_PARTNER):
 * - If the user has no clinicId assigned, throws 403.
 * - If the user has a clinicId, attaches `request.dataScope = { clinicId }`
 *   for downstream service-layer filtering.
 *
 * DOKTER role:
 * - If the user has a clinicId, attaches dataScope for optional filtering.
 * - If no clinicId is assigned, passes through (lab doctors approve across all clinics).
 *
 * For all other roles, passes through without modification.
 *
 * Requirement 17.4: Enforce clinic scope for KLINIK_PARTNER role.
 * Lab DOKTER (Sp.PK) needs cross-clinic approval access by design.
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  /** Roles that MUST have clinicId — access is blocked without it */
  private readonly STRICT_SCOPED_ROLES: Role[] = [Role.KLINIK_PARTNER];

  /** Roles that optionally use clinicId for filtering (not blocked if missing) */
  private readonly SOFT_SCOPED_ROLES: Role[] = [Role.DOKTER];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role && this.STRICT_SCOPED_ROLES.includes(user.role)) {
      if (!user.clinicId) {
        throw new ForbiddenException({
          errorCode: 'ERR_NO_CLINIC_ASSIGNED',
          message: 'Klinik belum ditetapkan untuk user ini. Hubungi admin untuk menetapkan klinik.',
          userRole: user.role,
        });
      }
      request.dataScope = { clinicId: user.clinicId };
    } else if (user?.role && this.SOFT_SCOPED_ROLES.includes(user.role)) {
      // DOKTER: attach clinicId if available (for optional filtering), but don't block
      if (user.clinicId) {
        request.dataScope = { clinicId: user.clinicId };
      }
    }

    return next.handle();
  }
}
