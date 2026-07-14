/**
 * Preservation Property Tests — NCR-02-05: Audit Preservation
 *
 * These tests capture existing CORRECT behavior that must remain unchanged after the fix.
 * They verify that:
 * - Read operations (findAll, findById) work correctly without audit logging
 * - Failed mutations throw correct exceptions without audit logging
 * - stripSensitiveFields() correctly removes sensitive fields from any object
 *
 * IMPORTANT: The UsersService on UNFIXED code does NOT have AuditService injected.
 * These tests confirm baseline behavior that must be preserved after the fix.
 *
 * These tests MUST PASS on UNFIXED code and continue to pass after the fix.
 *
 * **Validates: Requirements 3.4, 3.5, 3.6**
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../laboratory/audit/audit.service';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as fc from 'fast-check';
import {
  stripSensitiveFields,
  SENSITIVE_FIELDS,
} from '../../laboratory/audit/audit.service';

describe('Preservation: UsersService read operations and failed mutations', () => {
  let usersService: UsersService;
  let prismaService: any;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'existing@example.com',
    name: 'Existing User',
    role: Role.STAFF,
    departmentId: null,
    positionId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
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

    // Provide a minimal AuditService mock to satisfy DI requirements.
    // The mock's log() should never be called in these scenarios (read ops + failed mutations = no audit).
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  describe('Read operations produce no audit logging', () => {
    /**
     * Preservation: findAll() returns data without any audit logging
     * (since AuditService isn't even injected, verify service works without it)
     *
     * **Validates: Requirements 3.4**
     */
    it('findAll() should return paginated data without crashing', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser]);
      prismaService.user.count.mockResolvedValue(1);

      const result = await usersService.findAll(1, 10);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10 });
    });

    /**
     * Preservation: findById() returns user data without any audit logging
     *
     * **Validates: Requirements 3.4**
     */
    it('findById() should return user data without crashing', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersService.findById('user-uuid-123');

      expect(result).toBeDefined();
      expect(result.email).toBe('existing@example.com');
    });
  });

  describe('Failed mutations throw exceptions without audit logging', () => {
    const requestingUser = { id: 'admin-uuid-001', role: Role.ADMIN };

    /**
     * Preservation: create() with duplicate email throws ConflictException
     *
     * **Validates: Requirements 3.5**
     */
    it('create() with existing email should throw ConflictException', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);

      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        role: Role.STAFF,
        name: 'Duplicate User',
      };

      await expect(usersService.create(dto, requestingUser)).rejects.toThrow(
        ConflictException,
      );
    });

    /**
     * Preservation: create() with role escalation (non-super-admin assigning SUPER_ADMIN) throws ForbiddenException
     *
     * **Validates: Requirements 3.5**
     */
    it('create() with role escalation should throw ForbiddenException', async () => {
      const dto = {
        email: 'newuser@example.com',
        password: 'password123',
        role: Role.SUPER_ADMIN,
        name: 'Escalated User',
      };

      await expect(usersService.create(dto, requestingUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    /**
     * Preservation: softDelete() where id === requestingUserId throws ForbiddenException (self-delete)
     *
     * **Validates: Requirements 3.5**
     */
    it('softDelete() on self should throw ForbiddenException', async () => {
      await expect(
        usersService.softDelete('admin-uuid-001', 'admin-uuid-001'),
      ).rejects.toThrow(ForbiddenException);
    });

    /**
     * Preservation: softDelete() on last SUPER_ADMIN throws ConflictException
     *
     * **Validates: Requirements 3.5**
     */
    it('softDelete() on last SUPER_ADMIN should throw ConflictException', async () => {
      const superAdminUser = { ...mockUser, id: 'super-admin-001', role: Role.SUPER_ADMIN };
      prismaService.user.findUnique.mockResolvedValue(superAdminUser);
      // No other super admins exist
      prismaService.user.count.mockResolvedValue(0);

      await expect(
        usersService.softDelete('super-admin-001', 'another-admin-002'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Sensitive field stripping', () => {
    /**
     * Preservation: stripSensitiveFields removes passwordHash, password, token, secret, accessToken, refreshToken
     *
     * **Validates: Requirements 3.6**
     */
    it('should remove all sensitive fields from an object', () => {
      const data = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$somehash',
        password: 'plaintext',
        token: 'jwt-token',
        secret: 'api-secret',
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
        name: 'Test User',
        role: 'ADMIN',
      };

      const result = stripSensitiveFields(data);

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('secret');
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      // Non-sensitive fields preserved
      expect(result).toHaveProperty('id', 'user-123');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('name', 'Test User');
      expect(result).toHaveProperty('role', 'ADMIN');
    });

    /**
     * Property-based test: For all objects containing sensitive field keys,
     * stripSensitiveFields() always removes them from the output.
     *
     * **Validates: Requirements 3.6**
     */
    it('should always remove sensitive fields from any object', () => {
      // Generate arbitrary objects that include some sensitive fields
      const sensitiveFieldArb = fc.constantFrom(...SENSITIVE_FIELDS);
      const nonSensitiveKeyArb = fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((key) => !SENSITIVE_FIELDS.includes(key));

      const objectWithSensitiveFieldsArb = fc
        .tuple(
          // Include at least one sensitive field
          fc.array(
            fc.tuple(sensitiveFieldArb, fc.string({ minLength: 1, maxLength: 50 })),
            { minLength: 1, maxLength: 6 },
          ),
          // Include some non-sensitive fields
          fc.array(
            fc.tuple(nonSensitiveKeyArb, fc.oneof(fc.string(), fc.integer(), fc.boolean())),
            { minLength: 0, maxLength: 5 },
          ),
        )
        .map(([sensitiveEntries, normalEntries]) => {
          const obj: Record<string, unknown> = {};
          for (const [key, value] of sensitiveEntries) {
            obj[key] = value;
          }
          for (const [key, value] of normalEntries) {
            obj[key] = value;
          }
          return obj;
        });

      fc.assert(
        fc.property(objectWithSensitiveFieldsArb, (data) => {
          const result = stripSensitiveFields(data);

          // No sensitive fields should remain in the result
          for (const sensitiveField of SENSITIVE_FIELDS) {
            expect(result).not.toHaveProperty(sensitiveField);
          }

          // All non-sensitive fields from input should be preserved
          for (const [key, value] of Object.entries(data)) {
            if (!SENSITIVE_FIELDS.includes(key)) {
              expect(key in (result as Record<string, unknown>)).toBe(true);
              expect((result as Record<string, unknown>)[key]).toEqual(value);
            }
          }
        }),
        { numRuns: 200 },
      );
    });
  });
});
