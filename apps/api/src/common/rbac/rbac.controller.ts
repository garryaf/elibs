import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RbacService } from './rbac.service';

@Controller('api/v1/rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  /**
   * GET /api/v1/rbac/permissions
   * List all permissions, optionally filtered by resource group.
   */
  @Get('permissions')
  async listPermissions(@Query('resource') resource?: string) {
    const permissions = await this.rbacService.listPermissions(resource);
    return { data: permissions, total: permissions.length };
  }

  /**
   * GET /api/v1/rbac/roles/:role/permissions
   * Get all permissions assigned to a specific role.
   */
  @Get('roles/:role/permissions')
  async getRolePermissions(@Param('role') role: string) {
    const validRole = this.validateRole(role);
    const permissions = await this.rbacService.getPermissionsForRole(validRole);
    return { role: validRole, data: permissions, total: permissions.length };
  }

  /**
   * PUT /api/v1/rbac/roles/:role/permissions
   * Assign or revoke permissions for a role.
   * Body: { permissions: [{ permissionId: string, isGranted: boolean }] }
   */
  @Put('roles/:role/permissions')
  @HttpCode(HttpStatus.OK)
  async assignRolePermissions(
    @Param('role') role: string,
    @Body() body: { permissions: { permissionId: string; isGranted: boolean }[] },
  ) {
    const validRole = this.validateRole(role);
    const result = await this.rbacService.assignPermissionsToRole(
      validRole,
      body.permissions,
    );
    return { message: `Updated ${result.updated} permission(s) for role ${validRole}`, ...result };
  }

  /**
   * GET /api/v1/rbac/matrix
   * Get the full role-permission matrix.
   */
  @Get('matrix')
  async getPermissionMatrix() {
    return this.rbacService.getPermissionMatrix();
  }

  /**
   * Validate that the provided string is a valid Role enum value.
   */
  private validateRole(role: string): Role {
    const upperRole = role.toUpperCase();
    if (!Object.values(Role).includes(upperRole as Role)) {
      throw new Error(`Invalid role: ${role}. Valid roles: ${Object.values(Role).join(', ')}`);
    }
    return upperRole as Role;
  }
}
