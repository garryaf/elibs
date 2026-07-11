// Feature: sprint-next1-critical-security, Property 4: Privilege escalation guard

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt to avoid slow hashing in property tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * Property 4: Privilege escalation guard
 *
 * For any user creation or update request where the target role is SUPER_ADMIN,
 * the operation SHALL succeed if and only if the requesting user's role is SUPER_ADMIN.
 * For all other requesting roles (including ADMIN), the operation SHALL be rejected
 * with a 403 Forbidden error.
 */
describe('Privilege Escalation Guard Property Tests', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const ALL_ROLES: Role[] = [
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.OWNER,
    Role.MANAGER,
    Role.KASIR,
    Role.CS,
    Role.SAMPLING,
    Role.ANALIS,
    Role.DOKTER,
    Role.KLINIK_PARTNER,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn().mockResolvedValue(null),
              findUnique: jest.fn().mockResolvedValue({
                id: 'target-uuid',
                email: 'target@example.com',
                name: 'Target User',
                role: Role.ADMIN,
                departmentId: null,
                positionId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              }),
              create: jest.fn().mockImplementation((args: any) =>
                Promise.resolve({
                  id: 'new-user-uuid',
                  email: args.data.email,
                  name: args.data.name,
                  role: args.data.role,
                  departmentId: null,
                  positionId: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  deletedAt: null,
                }),
              ),
              update: jest.fn().mockImplementation((args: any) =>
                Promise.resolve({
                  id: args.where.id,
                  email: 'target@example.com',
                  name: 'Target User',
                  role: args.data.role || Role.ADMIN,
                  departmentId: null,
                  positionId: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  deletedAt: null,
                }),
              ),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 4: Privilege escalation guard', () => {
    /**
     * For arbitrary (requestingRole, targetRole) pairs:
     * Operation succeeds iff targetRole !== SUPER_ADMIN || requestingRole === SUPER_ADMIN
     *
     * Tests create() path.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     */
    it('create: succeeds iff targetRole !== SUPER_ADMIN || requestingRole === SUPER_ADMIN', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ALL_ROLES),
          fc.constantFrom(...ALL_ROLES),
          async (requestingRole, targetRole) => {
            // Reset mocks for each iteration
            (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaService.user.create as jest.Mock).mockImplementation((args: any) =>
              Promise.resolve({
                id: 'new-user-uuid',
                email: args.data.email,
                name: args.data.name,
                role: args.data.role,
                departmentId: null,
                positionId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              }),
            );

            const shouldSucceed =
              targetRole !== Role.SUPER_ADMIN || requestingRole === Role.SUPER_ADMIN;

            const createPromise = service.create(
              {
                email: 'newuser@example.com',
                password: 'password123',
                role: targetRole,
                name: 'New User',
              },
              { id: 'requester-uuid', role: requestingRole },
            );

            if (shouldSucceed) {
              await expect(createPromise).resolves.toBeDefined();
            } else {
              await expect(createPromise).rejects.toThrow(ForbiddenException);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For arbitrary (requestingRole, targetRole) pairs:
     * Operation succeeds iff targetRole !== SUPER_ADMIN || requestingRole === SUPER_ADMIN
     *
     * Tests update() path.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     */
    it('update: succeeds iff targetRole !== SUPER_ADMIN || requestingRole === SUPER_ADMIN', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...ALL_ROLES),
          fc.constantFrom(...ALL_ROLES),
          async (requestingRole, targetRole) => {
            // Reset mocks: findById (findUnique) must return the target user
            (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
              id: 'target-uuid',
              email: 'target@example.com',
              name: 'Target User',
              role: Role.ADMIN,
              departmentId: null,
              positionId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            });
            (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);
            (prismaService.user.update as jest.Mock).mockImplementation((args: any) =>
              Promise.resolve({
                id: args.where.id,
                email: 'target@example.com',
                name: 'Target User',
                role: args.data.role || Role.ADMIN,
                departmentId: null,
                positionId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              }),
            );

            const shouldSucceed =
              targetRole !== Role.SUPER_ADMIN || requestingRole === Role.SUPER_ADMIN;

            const updatePromise = service.update(
              'target-uuid',
              { role: targetRole },
              { id: 'requester-uuid', role: requestingRole },
            );

            if (shouldSucceed) {
              await expect(updatePromise).resolves.toBeDefined();
            } else {
              await expect(updatePromise).rejects.toThrow(ForbiddenException);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
