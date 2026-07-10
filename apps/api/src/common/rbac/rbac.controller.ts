import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { RbacService } from './rbac.service';

@ApiTags('RBAC')
@ApiBearerAuth()
@Controller('api/v1/rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'List all permissions, optionally filtered by resource' })
  async listPermissions(@Query('resource') resource?: string) {
    const permissions = await this.rbacService.listPermissions(resource);
    return { data: permissions, total: permissions.length };
  }

  @Get('roles/:role/permissions')
  @ApiOperation({ summary: 'Get all permissions assigned to a specific role' })
  async getRolePermissions(@Param('role') role: string) {
    const validRole = this.validateRole(role);
    const permissions = await this.rbacService.getPermissionsForRole(validRole);
    return { role: validRole, data: permissions, total: permissions.length };
  }

  @Put('roles/:role/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign or revoke permissions for a role' })
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

  @Get('matrix')
  @ApiOperation({ summary: 'Get the full role-permission matrix' })
  async getPermissionMatrix() {
    return this.rbacService.getPermissionMatrix();
  }

  @Get('hierarchy')
  @ApiOperation({ summary: 'Get the full role hierarchy' })
  async getHierarchy() {
    const data = await this.rbacService.getHierarchy();
    return { data, total: data.length };
  }

  @Post('hierarchy')
  @ApiOperation({ summary: 'Create or update a role hierarchy entry' })
  async upsertHierarchyEntry(
    @Body() body: { role: string; parentRole: string | null; level: number },
  ) {
    const validRole = this.validateRole(body.role);
    const validParentRole = body.parentRole
      ? this.validateRole(body.parentRole)
      : null;

    const entry = await this.rbacService.upsertHierarchyEntry(
      validRole,
      validParentRole,
      body.level,
    );

    return { message: `Hierarchy entry for ${validRole} saved`, data: entry };
  }

  @Put('hierarchy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a role hierarchy entry' })
  async updateHierarchyEntry(
    @Body() body: { role: string; parentRole: string | null; level: number },
  ) {
    const validRole = this.validateRole(body.role);
    const validParentRole = body.parentRole
      ? this.validateRole(body.parentRole)
      : null;

    const entry = await this.rbacService.upsertHierarchyEntry(
      validRole,
      validParentRole,
      body.level,
    );

    return { message: `Hierarchy entry for ${validRole} updated`, data: entry };
  }

  @Delete('hierarchy/:role')
  @ApiOperation({ summary: 'Delete a role hierarchy entry' })
  async deleteHierarchyEntry(@Param('role') role: string) {
    const validRole = this.validateRole(role);
    await this.rbacService.deleteHierarchyEntry(validRole);
    return { message: `Hierarchy entry for ${validRole} deleted` };
  }

  private validateRole(role: string): Role {
    const upperRole = role.toUpperCase();
    if (!Object.values(Role).includes(upperRole as Role)) {
      throw new Error(`Invalid role: ${role}. Valid roles: ${Object.values(Role).join(', ')}`);
    }
    return upperRole as Role;
  }
}
