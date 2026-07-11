/**
 * Property Test: Sync endpoint rejects all unauthorized roles
 *
 * Feature: settings-master-data-restructure, Property 1: Sync endpoint rejects all unauthorized roles
 *
 * **Validates: Requirements 1.4**
 *
 * Property 1: For any user whose role is NOT in the set {SUPER_ADMIN, ADMIN},
 * sending a POST request to `/api/v1/regions/sync` with a valid JWT SHALL
 * return HTTP 403 Forbidden.
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { RegionSyncService } from './region-sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

describe('Property 1: Sync endpoint rejects all unauthorized roles', () => {
  /**
   * **Validates: Requirements 1.4**
   */

  let app: INestApplication;
  let mockSyncAll: jest.Mock;

  // Closure variable that controls which role the mocked JwtAuthGuard attaches
  let currentRole: Role;

  // All roles that are NOT authorized for the sync endpoint
  const unauthorizedRoles: Role[] = Object.values(Role).filter(
    (role) => role !== Role.SUPER_ADMIN && role !== Role.ADMIN,
  );

  beforeAll(async () => {
    mockSyncAll = jest.fn().mockResolvedValue({
      provinsi: 34,
      kabupatenKota: 514,
      kecamatan: 7201,
      kelurahanDesa: 83436,
      errors: [],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RegionController],
      providers: [
        {
          provide: RegionService,
          useValue: {
            findAllProvinsi: jest.fn(),
            findKabupatenKotaByProvinsi: jest.fn(),
            findKecamatanByKabupatenKota: jest.fn(),
            findKelurahanDesaByKecamatan: jest.fn(),
          },
        },
        {
          provide: RegionSyncService,
          useValue: { syncAll: mockSyncAll },
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          // Always authenticate — attach user with the role under test
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'test-user-id', email: 'test@test.com', role: currentRole };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockSyncAll.mockClear();
  });

  it('should return 403 for any role other than SUPER_ADMIN or ADMIN (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...unauthorizedRoles),
        async (role: Role) => {
          currentRole = role;

          const response = await request(app.getHttpServer())
            .post('/api/v1/regions/sync')
            .send();

          // Property assertion: unauthorized roles MUST receive 403
          expect(response.status).toBe(403);

          // Sync service must NOT be invoked for unauthorized roles
          expect(mockSyncAll).not.toHaveBeenCalled();
          mockSyncAll.mockClear();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Sanity checks to confirm the property boundary
  it('should NOT return 403 for SUPER_ADMIN (sanity check)', async () => {
    currentRole = Role.SUPER_ADMIN;

    const response = await request(app.getHttpServer())
      .post('/api/v1/regions/sync')
      .send();

    expect(response.status).not.toBe(403);
  });

  it('should NOT return 403 for ADMIN (sanity check)', async () => {
    currentRole = Role.ADMIN;

    const response = await request(app.getHttpServer())
      .post('/api/v1/regions/sync')
      .send();

    expect(response.status).not.toBe(403);
  });
});
