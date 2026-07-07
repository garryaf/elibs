import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from '../dashboard.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('DashboardService - getRegionDistribution', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      patient: {
        groupBy: jest.fn(),
      },
      provinsi: {
        findMany: jest.fn(),
      },
      kabupatenKota: {
        findMany: jest.fn(),
      },
      kecamatan: {
        findMany: jest.fn(),
      },
      kelurahanDesa: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get(PrismaService);
  });

  describe('No filter - group by Provinsi', () => {
    it('should return patient counts grouped by provinsi', async () => {
      (prisma.patient.groupBy as jest.Mock).mockResolvedValue([
        { provinsiId: '32', _count: { id: 150 } },
        { provinsiId: '33', _count: { id: 89 } },
      ]);
      (prisma.provinsi.findMany as jest.Mock).mockResolvedValue([
        { id: '32', name: 'JAWA BARAT' },
        { id: '33', name: 'JAWA TENGAH' },
      ]);

      const result = await service.getRegionDistribution({});

      expect(result).toEqual([
        { id: '32', name: 'JAWA BARAT', count: 150 },
        { id: '33', name: 'JAWA TENGAH', count: 89 },
      ]);

      expect(prisma.patient.groupBy).toHaveBeenCalledWith({
        by: ['provinsiId'],
        where: {
          deletedAt: null,
          provinsiId: { not: null },
        },
        _count: { id: true },
      });
    });

    it('should return empty array when no patients have region data', async () => {
      (prisma.patient.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.provinsi.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRegionDistribution({});

      expect(result).toEqual([]);
    });
  });

  describe('provinsiId filter - group by KabupatenKota', () => {
    it('should return patient counts grouped by kabupaten/kota within provinsi', async () => {
      (prisma.patient.groupBy as jest.Mock).mockResolvedValue([
        { kabupatenKotaId: '3201', _count: { id: 75 } },
        { kabupatenKotaId: '3202', _count: { id: 50 } },
      ]);
      (prisma.kabupatenKota.findMany as jest.Mock).mockResolvedValue([
        { id: '3201', name: 'KABUPATEN BOGOR' },
        { id: '3202', name: 'KABUPATEN SUKABUMI' },
      ]);

      const result = await service.getRegionDistribution({ provinsiId: '32' });

      expect(result).toEqual([
        { id: '3201', name: 'KABUPATEN BOGOR', count: 75 },
        { id: '3202', name: 'KABUPATEN SUKABUMI', count: 50 },
      ]);

      expect(prisma.patient.groupBy).toHaveBeenCalledWith({
        by: ['kabupatenKotaId'],
        where: {
          deletedAt: null,
          provinsiId: '32',
          kabupatenKotaId: { not: null },
        },
        _count: { id: true },
      });
    });
  });

  describe('kabupatenKotaId filter - group by Kecamatan', () => {
    it('should return patient counts grouped by kecamatan within kabupaten/kota', async () => {
      (prisma.patient.groupBy as jest.Mock).mockResolvedValue([
        { kecamatanId: '320101', _count: { id: 30 } },
        { kecamatanId: '320102', _count: { id: 20 } },
      ]);
      (prisma.kecamatan.findMany as jest.Mock).mockResolvedValue([
        { id: '320101', name: 'CIBINONG' },
        { id: '320102', name: 'BOJONGGEDE' },
      ]);

      const result = await service.getRegionDistribution({
        kabupatenKotaId: '3201',
      });

      expect(result).toEqual([
        { id: '320101', name: 'CIBINONG', count: 30 },
        { id: '320102', name: 'BOJONGGEDE', count: 20 },
      ]);

      expect(prisma.patient.groupBy).toHaveBeenCalledWith({
        by: ['kecamatanId'],
        where: {
          deletedAt: null,
          kabupatenKotaId: '3201',
          kecamatanId: { not: null },
        },
        _count: { id: true },
      });
    });
  });

  describe('kecamatanId filter - group by KelurahanDesa', () => {
    it('should return patient counts grouped by kelurahan/desa within kecamatan', async () => {
      (prisma.patient.groupBy as jest.Mock).mockResolvedValue([
        { kelurahanDesaId: '3201012001', _count: { id: 15 } },
        { kelurahanDesaId: '3201012002', _count: { id: 10 } },
      ]);
      (prisma.kelurahanDesa.findMany as jest.Mock).mockResolvedValue([
        { id: '3201012001', name: 'PAKANSARI' },
        { id: '3201012002', name: 'CIRIUNG' },
      ]);

      const result = await service.getRegionDistribution({
        kecamatanId: '320101',
      });

      expect(result).toEqual([
        { id: '3201012001', name: 'PAKANSARI', count: 15 },
        { id: '3201012002', name: 'CIRIUNG', count: 10 },
      ]);

      expect(prisma.patient.groupBy).toHaveBeenCalledWith({
        by: ['kelurahanDesaId'],
        where: {
          deletedAt: null,
          kecamatanId: '320101',
          kelurahanDesaId: { not: null },
        },
        _count: { id: true },
      });
    });
  });

  describe('Most specific filter takes precedence', () => {
    it('should use kecamatanId when both provinsiId and kecamatanId are provided', async () => {
      (prisma.patient.groupBy as jest.Mock).mockResolvedValue([
        { kelurahanDesaId: '3201012001', _count: { id: 5 } },
      ]);
      (prisma.kelurahanDesa.findMany as jest.Mock).mockResolvedValue([
        { id: '3201012001', name: 'PAKANSARI' },
      ]);

      const result = await service.getRegionDistribution({
        provinsiId: '32',
        kecamatanId: '320101',
      });

      expect(result).toEqual([
        { id: '3201012001', name: 'PAKANSARI', count: 5 },
      ]);

      // Should group by kelurahanDesaId since kecamatanId is the most specific
      expect(prisma.patient.groupBy).toHaveBeenCalledWith({
        by: ['kelurahanDesaId'],
        where: {
          deletedAt: null,
          kecamatanId: '320101',
          kelurahanDesaId: { not: null },
        },
        _count: { id: true },
      });
    });
  });
});
