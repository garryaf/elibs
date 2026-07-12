/**
 * Bug Condition Exploration Test — NCR-02-05: Missing User CRUD Audit Logs
 *
 * These tests encode the EXPECTED (correct) behavior:
 * - UsersService.create() MUST call AuditService.log() with correct params
 * - UsersService.update() MUST call AuditService.log() with old/new values
 * - UsersService.softDelete() MUST call AuditService.log() with DELETE action
 *
 * On UNFIXED code, these tests are EXPECTED TO FAIL because:
 * - AuditService is not injected into UsersService
 * - No audit logging calls exist in the service methods
 *
 * Validates: Requirements 2.3, 2.4, 2.5
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../laboratory/audit/audit.service';
import { Role } from '@prisma/client';

describe('NCR-02-05: Missing User CRUD Audit Logs Bug Condition', () => {
  let usersService: UsersService;
  let prismaService: any;
  let auditService: any;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'newuser@example.com',
    name: 'Test User',
    role: Role.STAFF,
    departmentId: null,
    positionId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  const requestingUser = { id: 'admin-uuid-001', role: Role.SUPER_ADMIN };

  beforeEach(async () => {
    // Mock PrismaService
    prismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    // Mock AuditService
    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('Bug Condition: User CREATE must produce audit log', () => {
    it('should call AuditService.log() with action "CREATE" after successful user creation', async () => {
      // Setup: no existing user with same email
      prismaService.user.findFirst.mockResolvedValue(null);
      // Setup: create returns mock user
      prismaService.user.create.mockResolvedValue(mockUser);

      const dto = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        role: Role.STAFF,
        name: 'Test User',
      };

      await usersService.create(dto, requestingUser, '192.168.1.1');

      // Assert: AuditService.log() MUST be called with correct parameters
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        requestingUser.id, // userId
        'CREATE', // action
        'User', // entityName
        mockUser.id, // entityId
        null, // oldValues (null for create)
        expect.objectContaining({ email: 'newuser@example.com' }), // newValues
        '192.168.1.1', // ipAddress
      );
    });
  });

  describe('Bug Condition: User UPDATE must produce audit log', () => {
    it('should call AuditService.log() with action "UPDATE" and old/new values after successful user update', async () => {
      const oldUser = { ...mockUser };
      const updatedUser = { ...mockUser, email: 'updated@example.com', updatedAt: new Date('2026-01-02') };

      // Setup: findById returns existing user (for validation and old values)
      prismaService.user.findUnique.mockResolvedValue(oldUser);
      // Setup: no conflict on email
      prismaService.user.findFirst.mockResolvedValue(null);
      // Setup: update returns updated user
      prismaService.user.update.mockResolvedValue(updatedUser);

      const dto = { email: 'updated@example.com' };

      await usersService.update(mockUser.id, dto, requestingUser, '10.0.0.1');

      // Assert: AuditService.log() MUST be called with correct parameters
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        requestingUser.id, // userId
        'UPDATE', // action
        'User', // entityName
        mockUser.id, // entityId
        expect.objectContaining({ email: 'newuser@example.com' }), // oldValues (previous state)
        expect.objectContaining({ email: 'updated@example.com' }), // newValues (updated state)
        '10.0.0.1', // ipAddress
      );
    });
  });

  describe('Bug Condition: User DELETE must produce audit log', () => {
    it('should call AuditService.log() with action "DELETE" after successful soft-delete', async () => {
      const existingUser = { ...mockUser };
      const deletedUser = { ...mockUser, deletedAt: new Date('2026-01-05') };

      // Setup: findById returns existing user (for self-delete check and old values)
      prismaService.user.findUnique.mockResolvedValue(existingUser);
      // Setup: count of other super admins (for last-admin check)
      prismaService.user.count.mockResolvedValue(1);
      // Setup: update (soft-delete) returns deleted user
      prismaService.user.update.mockResolvedValue(deletedUser);

      await usersService.softDelete(mockUser.id, 'another-admin-uuid', '172.16.0.1');

      // Assert: AuditService.log() MUST be called with correct parameters
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        'another-admin-uuid', // userId (requesting user)
        'DELETE', // action
        'User', // entityName
        mockUser.id, // entityId
        expect.objectContaining({ email: 'newuser@example.com' }), // oldValues (user state before deletion)
        null, // newValues (null for delete)
        '172.16.0.1', // ipAddress
      );
    });
  });
});
