import { Injectable, UnprocessableEntityException } from '@nestjs/common';
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
   * Get all roles that a given role inherits from by walking hierarchy downward.
   * A parent role inherits all permissions from descendant (child) roles.
   * E.g., OWNER inherits MANAGER, ADMIN, KASIR, etc.
   */
  async getInheritedRoles(role: Role): Promise<Role[]> {
    const hierarchy = await this.prisma.roleHierarchy.findMany();
    const roles: Role[] = [role];

    const collectChildren = (parentRole: Role) => {
      const children = hierarchy.filter((h) => h.parentRole === parentRole);
      for (const child of children) {
        if (!roles.includes(child.role)) {
          roles.push(child.role);
          collectChildren(child.role);
        }
      }
    };

    collectChildren(role);
    return roles;
  }

  /**
   * Check if a role has a specific permission (used by guard internally).
   * Resolves inherited permissions via role hierarchy.
   */
  async hasPermission(role: Role, permissionCode: string): Promise<boolean> {
    if (role === 'SUPER_ADMIN') return true;

    // Get all roles in hierarchy (this role + all descendant roles it inherits from)
    const inheritedRoles = await this.getInheritedRoles(role);

    // Check if ANY of the inherited roles has the permission
    const rp = await this.prisma.rolePermission.findFirst({
      where: {
        role: { in: inheritedRoles },
        permission: { code: permissionCode },
        isGranted: true,
      },
    });

    return !!rp;
  }

  /**
   * Get the full role hierarchy configuration.
   */
  async getHierarchy() {
    return this.prisma.roleHierarchy.findMany({
      orderBy: { level: 'asc' },
    });
  }

  /**
   * Create or update a role hierarchy entry.
   * Validates that no cycle would be created before persisting.
   */
  async upsertHierarchyEntry(
    role: Role,
    parentRole: Role | null,
    level: number,
  ) {
    // Validate no cycle
    if (parentRole) {
      await this.validateNoCycle(role, parentRole);
    }

    return this.prisma.roleHierarchy.upsert({
      where: { role },
      create: { role, parentRole, level },
      update: { parentRole, level },
    });
  }

  /**
   * Detect if setting parentRole for a role would create a cycle.
   * A cycle exists if following parentRole from the proposed parent
   * eventually leads back to the role being updated.
   */
  async validateNoCycle(role: Role, proposedParent: Role): Promise<void> {
    if (role === proposedParent) {
      throw new UnprocessableEntityException(
        `Cycle detected: role "${role}" cannot be its own parent`,
      );
    }

    const hierarchy = await this.prisma.roleHierarchy.findMany();

    // Build a map of role -> parentRole for traversal
    // Use current hierarchy but replace the entry for `role` with the proposed parent
    const parentMap = new Map<Role, Role | null>();
    for (const entry of hierarchy) {
      if (entry.role === role) {
        // Use proposed parent instead of current
        parentMap.set(entry.role, proposedParent);
      } else {
        parentMap.set(entry.role, entry.parentRole);
      }
    }

    // If role doesn't exist in hierarchy yet, add it with proposed parent
    if (!parentMap.has(role)) {
      parentMap.set(role, proposedParent);
    }

    // Walk up from proposedParent; if we reach `role`, there's a cycle
    const visited = new Set<Role>();
    let current: Role | null = proposedParent;

    while (current !== null) {
      if (current === role) {
        throw new UnprocessableEntityException(
          `Cycle detected: setting parent of "${role}" to "${proposedParent}" would create a circular hierarchy`,
        );
      }
      if (visited.has(current)) {
        // Already visited, no further cycle involving `role`
        break;
      }
      visited.add(current);
      current = parentMap.get(current) ?? null;
    }
  }

  /**
   * Delete a hierarchy entry for a role.
   */
  async deleteHierarchyEntry(role: Role) {
    // Check if any other roles reference this role as parent
    const children = await this.prisma.roleHierarchy.findMany({
      where: { parentRole: role },
    });

    if (children.length > 0) {
      throw new UnprocessableEntityException(
        `Cannot delete hierarchy entry for "${role}": it is referenced as parent by ${children.map((c) => c.role).join(', ')}`,
      );
    }

    return this.prisma.roleHierarchy.delete({
      where: { role },
    });
  }
}
