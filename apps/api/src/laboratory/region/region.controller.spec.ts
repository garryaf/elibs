import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { RegionController } from './region.controller';
import { RegionService } from './region.service';
import { RegionSyncService } from './region-sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

/**
 * Integration tests for RegionController sync endpoint authorization.
 *
 * These tests validate the guard chain (JwtAuthGuard + RolesGuard) on
 * POST /api/v1/regions/sync. The RegionSyncService is mocked so tests
 * only exercise the authorization layer.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */
describe('RegionController - POST /api/v1/regions/sync authorization', () => {
  let app: INestApplication;

  // Simulated user set by each test; null means no authentication
  let mockUser: { id: string; email: string; role: Role } | null = null;

  const mockSyncResult = {
    provinsi: 34,
    kabupatenKota: 514,
    kecamatan: 7201,
    kelurahanDesa: 83436,
    errors: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RegionController],
      providers: [
        {
          provide: RegionService,
          useValue: {
            findAllProvinsi: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }),
            findKabupatenKotaByProvinsi: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }),
            findKecamatanByKabupatenKota: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }),
            findKelurahanDesaByKecamatan: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } }),
          },
        },
        {
          provide: RegionSyncService,
          useValue: {
            syncAll: jest.fn().mockResolvedValue(mockSyncResult),
          },
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          if (!mockUser) {
            // Simulate 401 - no valid token (matches real Passport behavior)
            throw new UnauthorizedException();
          }
          // Attach user to request (mimics Passport behavior)
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
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
    mockUser = null;
  });

  it('should return 201 for SUPER_ADMIN user (NestJS POST default)', async () => {
    mockUser = { id: 'user-1', email: 'superadmin@test.com', role: Role.SUPER_ADMIN };

    const response = await request(app.getHttpServer())
      .post('/api/v1/regions/sync')
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Region sync completed',
      data: mockSyncResult,
    });
  });

  it('should return 201 for ADMIN user (NestJS POST default)', async () => {
    mockUser = { id: 'user-2', email: 'admin@test.com', role: Role.ADMIN };

    const response = await request(app.getHttpServer())
      .post('/api/v1/regions/sync')
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Region sync completed',
      data: mockSyncResult,
    });
  });

  it('should return 403 for KASIR user', async () => {
    mockUser = { id: 'user-3', email: 'kasir@test.com', role: Role.KASIR };

    await request(app.getHttpServer())
      .post('/api/v1/regions/sync')
      .expect(403);
  });

  it('should return 401 for unauthenticated request (no token)', async () => {
    mockUser = null;

    await request(app.getHttpServer())
      .post('/api/v1/regions/sync')
      .expect(401);
  });
});
