import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all permissions, optionally filtered by resource.
   */
  async listPermissions(resource?: string) {
    const where = resource ? { resource } : {};
    return this.prisma.permission.findMany({
      where,
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Get all permissions granted to a specific role.
   */
  async getPermissionsForRole(role: Role) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role, isGranted: true },
      include: { permission: true },
      orderBy: { permission: { resource: 'asc' } },
    });

    return rolePermissions.map((rp) => ({
      id: rp.id,
      permissionId: rp.permission.id,
      code: rp.permission.code,
      name: rp.permission.name,
      resource: rp.permission.resource,
      action: rp.permission.action,
      isGranted: rp.isGranted,
      createdAt: rp.createdAt,
    }));
  }

  /**
   * Assign or revoke permissions for a role.
   * Accepts an array of { permissionId, isGranted } objects.
   * Uses upsert to handle both new assignments and updates.
   */
  async assignPermissionsToRole(
    role: Role,
    assignments: { permissionId: string; isGranted: boolean }[],
  ) {
    const results = await Promise.all(
      assignments.map((assignment) =>
        this.prisma.rolePermission.upsert({
          where: {
            role_permissionId: {
              role,
              permissionId: assignment.permissionId,
            },
          },
          create: {
            role,
            permissionId: assignment.permissionId,
            isGranted: assignment.isGranted,
          },
          update: {
            isGranted: assignment.isGranted,
          },
        }),
      ),
    );

    return { updated: results.length };
  }

  /**
   * Get full role-permission matrix.
   * Returns all roles with their assigned permissions.
   */
  async getPermissionMatrix() {
    const allPermissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    const allRolePermissions = await this.prisma.rolePermission.findMany({
      where: { isGranted: true },
      select: { role: true, permissionId: true },
    });

    // Build a lookup: role -> Set<permissionId>
    const rolePermMap = new Map<string, Set<string>>();
    for (const rp of allRolePermissions) {
      if (!rolePermMap.has(rp.role)) {
        rolePermMap.set(rp.role, new Set());
      }
      rolePermMap.get(rp.role)!.add(rp.permissionId);
    }

    // Build matrix
    const roles = Object.values(Role);
    const matrix = roles.map((role) => ({
      role,
      permissions: allPermissions.map((perm) => ({
        permissionId: perm.id,
        code: perm.code,
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        isGranted: rolePermMap.get(role)?.has(perm.id) ?? false,
      })),
    }));

    return {
      roles,
      permissions: allPermissions.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        resource: p.resource,
        action: p.action,
      })),
      matrix,
    };
  }

  /**
   * Check if a role has a specific permission (used by guard internally).
   */
  async hasPermission(role: Role, permissionCode: string): Promise<boolean> {
    if (role === 'SUPER_ADMIN') return true;

    const rp = await this.prisma.rolePermission.findFirst({
      where: {
        role,
        permission: { code: permissionCode },
        isGranted: true,
      },
    });

    return !!rp;
  }
}
