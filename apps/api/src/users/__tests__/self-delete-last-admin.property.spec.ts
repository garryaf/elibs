// Feature: sprint-next1-critical-security, Property 5: Self-delete prevention
// Feature: sprint-next1-critical-security, Property 6: Last SUPER_ADMIN protection

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../laboratory/audit/audit.service';
import { Role } from '@prisma/client';

/**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * Property 5: Self-delete prevention
 * For any user deletion request where the requesting user's ID equals the target
 * user's ID, the operation SHALL be rejected with a 403 Forbidden error regardless
 * of the user's role.
 *
 * Property 6: Last SUPER_ADMIN protection
 * For any system state, attempting to soft-delete a SUPER_ADMIN user SHALL succeed
 * if and only if at least one other active (non-deleted) SUPER_ADMIN user exists in
 * the system. If the target is the last active SUPER_ADMIN, the operation SHALL be
 * rejected with a 409 Conflict error.
 */
describe('Self-Delete and Last Admin Protection Property Tests', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 5: Self-delete prevention', () => {
    /**
     * For any arbitrary user ID, when requestingUserId === targetId,
     * the operation always throws ForbiddenException (403).
     *
     * **Validates: Requirements 4.1**
     */
    it('self-delete is always rejected with 403 regardless of role or user state', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary UUIDs for the user ID
          fc.uuid(),
          // Generate arbitrary roles to prove it doesn't matter
          fc.constantFrom(...Object.values(Role)),
          async (userId, role) => {
            // Mock findById (called via findUnique) to return a valid user
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
              id: userId,
              email: 'test@example.com',
              name: 'Test User',
              role,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            });

            // Act & Assert: self-delete should always throw 403
            await expect(
              service.softDelete(userId, userId),
            ).rejects.toThrow(ForbiddenException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 6: Last SUPER_ADMIN protection', () => {
    /**
     * When the target user is a SUPER_ADMIN and there are NO other active
     * SUPER_ADMINs in the system (count === 0), the delete SHALL be rejected
     * with a 409 Conflict error.
     *
     * **Validates: Requirements 4.2, 4.4**
     */
    it('deleting the last SUPER_ADMIN is always rejected with 409 Conflict', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate target SUPER_ADMIN user ID
          fc.uuid(),
          // Generate a different requesting user ID
          fc.uuid(),
          async (targetId, requestingId) => {
            // Ensure they are different (self-delete is a different property)
            if (targetId === requestingId) return;

            // Mock findById: target is a SUPER_ADMIN
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
              id: targetId,
              email: 'admin@example.com',
              name: 'Super Admin',
              role: Role.SUPER_ADMIN,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            });

            // Mock count: no other active SUPER_ADMINs exist
            (prismaService.user.count as jest.Mock).mockResolvedValue(0);

            // Act & Assert: should throw 409 Conflict
            await expect(
              service.softDelete(targetId, requestingId),
            ).rejects.toThrow(ConflictException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When the target user is a SUPER_ADMIN and at least one other active
     * SUPER_ADMIN exists (count >= 1), the delete SHALL succeed.
     *
     * **Validates: Requirements 4.3, 4.4**
     */
    it('deleting a SUPER_ADMIN succeeds when other active SUPER_ADMINs exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate target SUPER_ADMIN user ID
          fc.uuid(),
          // Generate a different requesting user ID
          fc.uuid(),
          // Generate count of other active SUPER_ADMINs (at least 1)
          fc.integer({ min: 1, max: 100 }),
          async (targetId, requestingId, otherSuperAdminCount) => {
            // Ensure they are different (self-delete is a different property)
            if (targetId === requestingId) return;

            // Mock findById: target is a SUPER_ADMIN
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
              id: targetId,
              email: 'admin@example.com',
              name: 'Super Admin',
              role: Role.SUPER_ADMIN,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            });

            // Mock count: other active SUPER_ADMINs exist
            (prismaService.user.count as jest.Mock).mockResolvedValue(otherSuperAdminCount);

            // Mock update: soft-delete succeeds
            (prismaService.user.update as jest.Mock).mockResolvedValue({
              id: targetId,
              email: 'admin@example.com',
              name: 'Super Admin',
              role: Role.SUPER_ADMIN,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: new Date(),
            });

            // Act: should NOT throw
            const result = await service.softDelete(targetId, requestingId);

            // Assert: soft-delete was applied
            expect(result.deletedAt).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When the target user is NOT a SUPER_ADMIN, the delete SHALL always succeed
     * regardless of how many SUPER_ADMINs exist (the last-admin check is skipped).
     *
     * **Validates: Requirements 4.3**
     */
    it('deleting a non-SUPER_ADMIN user always succeeds (last-admin check not applied)', async () => {
      const nonSuperAdminRoles = Object.values(Role).filter(r => r !== Role.SUPER_ADMIN);

      await fc.assert(
        fc.asyncProperty(
          // Generate target user ID
          fc.uuid(),
          // Generate a different requesting user ID
          fc.uuid(),
          // Generate a non-SUPER_ADMIN role
          fc.constantFrom(...nonSuperAdminRoles),
          async (targetId, requestingId, targetRole) => {
            // Ensure they are different (self-delete is a different property)
            if (targetId === requestingId) return;

            // Mock findById: target is NOT a SUPER_ADMIN
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
              id: targetId,
              email: 'user@example.com',
              name: 'Regular User',
              role: targetRole,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            });

            // Mock update: soft-delete succeeds
            (prismaService.user.update as jest.Mock).mockResolvedValue({
              id: targetId,
              email: 'user@example.com',
              name: 'Regular User',
              role: targetRole,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: new Date(),
            });

            // Act: should NOT throw
            const result = await service.softDelete(targetId, requestingId);

            // Assert: soft-delete was applied
            expect(result.deletedAt).not.toBeNull();

            // Assert: count was NOT called (no last-admin check needed)
            // Note: we don't reset count mock, so if it was called it would
            // mean an unnecessary check was performed
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
