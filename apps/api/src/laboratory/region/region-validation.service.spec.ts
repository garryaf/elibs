import { BadRequestException } from '@nestjs/common';
import { RegionValidationService } from './region-validation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('RegionValidationService', () => {
  let service: RegionValidationService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      kelurahanDesa: {
        findFirst: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new RegionValidationService(prisma);
  });

  describe('validateHierarchy', () => {
    it('should return true when all region IDs are empty (all-empty allowed)', async () => {
      const result = await service.validateHierarchy(null, null, null, null);
      expect(result).toBe(true);
      expect(prisma.kelurahanDesa.findFirst).not.toHaveBeenCalled();
    });

    it('should return true when all region IDs are undefined', async () => {
      const result = await service.validateHierarchy(
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should return true when all region IDs are empty strings', async () => {
      const result = await service.validateHierarchy('', '', '', '');
      expect(result).toBe(true);
    });

    it('should throw BadRequestException when only provinsiId is provided', async () => {
      await expect(
        service.validateHierarchy('32', null, null, null),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.validateHierarchy('32', null, null, null),
      ).rejects.toMatchObject({
        response: {
          errorCode: 'ERR_VALIDATION',
          message:
            'All region levels are required when any region is selected',
        },
      });
    });

    it('should throw BadRequestException when only three levels are provided', async () => {
      await expect(
        service.validateHierarchy('32', '3201', '320101', null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when only two levels are provided', async () => {
      await expect(
        service.validateHierarchy('32', '3201', null, null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when some are empty strings and some are filled', async () => {
      await expect(
        service.validateHierarchy('32', '', '320101', '3201012001'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return true when all four IDs form a valid hierarchy', async () => {
      (prisma.kelurahanDesa.findFirst as jest.Mock).mockResolvedValue({
        id: '3201012001',
        kecamatanId: '320101',
        name: 'PAKANSARI',
      });

      const result = await service.validateHierarchy(
        '32',
        '3201',
        '320101',
        '3201012001',
      );
      expect(result).toBe(true);
      expect(prisma.kelurahanDesa.findFirst).toHaveBeenCalledWith({
        where: {
          id: '3201012001',
          kecamatanId: '320101',
          kecamatan: {
            kabupatenKotaId: '3201',
            kabupatenKota: {
              provinsiId: '32',
            },
          },
        },
      });
    });

    it('should throw BadRequestException when hierarchy is inconsistent', async () => {
      (prisma.kelurahanDesa.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateHierarchy('32', '3201', '320101', '9999999999'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.validateHierarchy('32', '3201', '320101', '9999999999'),
      ).rejects.toMatchObject({
        response: {
          errorCode: 'ERR_VALIDATION',
          message: 'Region hierarchy is inconsistent',
        },
      });
    });
  });
});
