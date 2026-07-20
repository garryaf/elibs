import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @RequirePermission decorator, allow (backward compat with @Roles)
    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN',
        message: 'Authentication required for this resource',
        requiredPermission,
      });
    }

    // SUPER_ADMIN bypasses permission check
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Check database for role-permission mapping
    const rolePermission = await this.prisma.rolePermission.findFirst({
      where: {
        role: user.role,
        permission: { code: requiredPermission },
        isGranted: true,
      },
    });

    if (!rolePermission) {
      throw new ForbiddenException({
        errorCode: 'ERR_FORBIDDEN',
        message: `Missing permission: ${requiredPermission} for role ${user.role}`,
        requiredPermission,
        userRole: user.role,
      });
    }

    return true;
  }
}
