/**
 * Unit Validation Test — Task 4.4: Enforce Relasi Satuan ke TestMaster
 *
 * Verifies that the MasterDataService validates units against MeasurementUnit master
 * when creating or updating a test. Only units present in MeasurementUnit (active) are accepted.
 *
 * Key scenarios:
 * - Creating a test with a valid unit code (e.g., "g/dL") succeeds
 * - Creating a test with an invalid unit code throws BadRequestException with ERR_INVALID_UNIT
 * - Updating a test with an invalid unit code throws BadRequestException with ERR_INVALID_UNIT
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MasterDataService } from '../master-data.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TariffResolverService } from '../tariff-resolver.service';
import { BadRequestException } from '@nestjs/common';

describe('Unit Validation: MasterDataService enforces MeasurementUnit lookup', () => {
  let service: MasterDataService;
  let prismaService: any;

  const validUnitRecord = {
    id: 'unit-uuid-001',
    code: 'g/dL',
    name: 'gram per deciliter',
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingTest = {
    id: 'test-uuid-001',
    code: 'HB',
    name: 'Hemoglobin',
    categoryId: 'cat-uuid-001',
    unit: 'g/dL',
    method: null,
    sampleType: null,
    price: 50000,
    requiresDoctorApproval: true,
    isActive: true,
    tatMinutes: null,
    tatCategory: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      testMaster: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      measurementUnit: {
        findFirst: jest.fn(),
      },
      sampleTypeMaster: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterDataService,
        { provide: PrismaService, useValue: prismaService },
        {
          provide: TariffResolverService,
          useValue: { getActiveTariff: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MasterDataService>(MasterDataService);
  });

  describe('createTest() with unit validation', () => {
    it('should succeed when unit code exists in MeasurementUnit master', async () => {
      // No duplicate code
      prismaService.testMaster.findFirst.mockResolvedValue(null);
      // Valid unit found
      prismaService.measurementUnit.findFirst.mockResolvedValue(
        validUnitRecord,
      );
      // Create succeeds
      prismaService.testMaster.create.mockResolvedValue({
        ...existingTest,
        id: 'new-test-uuid',
      });

      const dto = {
        code: 'HB',
        name: 'Hemoglobin',
        categoryId: 'cat-uuid-001',
        unit: 'g/dL',
        price: 50000,
      };

      const result = await service.createTest(dto);

      expect(result).toBeDefined();
      expect(prismaService.measurementUnit.findFirst).toHaveBeenCalledWith({
        where: { code: 'g/dL', isActive: true },
      });
    });

    it('should throw BadRequestException with ERR_INVALID_UNIT when unit code does not exist', async () => {
      // No duplicate code
      prismaService.testMaster.findFirst.mockResolvedValue(null);
      // Unit NOT found
      prismaService.measurementUnit.findFirst.mockResolvedValue(null);

      const dto = {
        code: 'HB',
        name: 'Hemoglobin',
        categoryId: 'cat-uuid-001',
        unit: 'INVALID_UNIT',
        price: 50000,
      };

      await expect(service.createTest(dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createTest(dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          errorCode: 'ERR_INVALID_UNIT',
        });
      }
    });

    it('should skip unit validation when unit is not provided', async () => {
      // No duplicate code
      prismaService.testMaster.findFirst.mockResolvedValue(null);
      // Create succeeds
      prismaService.testMaster.create.mockResolvedValue({
        ...existingTest,
        unit: null,
      });

      const dto = {
        code: 'HB',
        name: 'Hemoglobin',
        categoryId: 'cat-uuid-001',
        price: 50000,
        // unit is not provided
      };

      const result = await service.createTest(dto);

      expect(result).toBeDefined();
      expect(prismaService.measurementUnit.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('updateTest() with unit validation', () => {
    it('should succeed when updating with a valid unit code', async () => {
      // Test exists
      prismaService.testMaster.findFirst.mockResolvedValue(existingTest);
      // Valid unit found
      prismaService.measurementUnit.findFirst.mockResolvedValue(
        validUnitRecord,
      );
      // Update succeeds
      prismaService.testMaster.update.mockResolvedValue({
        ...existingTest,
        unit: 'g/dL',
      });

      const dto = { unit: 'g/dL' };

      const result = await service.updateTest('test-uuid-001', dto);

      expect(result).toBeDefined();
      expect(prismaService.measurementUnit.findFirst).toHaveBeenCalledWith({
        where: { code: 'g/dL', isActive: true },
      });
    });

    it('should throw BadRequestException with ERR_INVALID_UNIT when updating with invalid unit', async () => {
      // Test exists
      prismaService.testMaster.findFirst.mockResolvedValue(existingTest);
      // Unit NOT found
      prismaService.measurementUnit.findFirst.mockResolvedValue(null);

      const dto = { unit: 'INVALID_UNIT' };

      await expect(service.updateTest('test-uuid-001', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.updateTest('test-uuid-001', dto);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          errorCode: 'ERR_INVALID_UNIT',
        });
      }
    });

    it('should skip unit validation when unit is not in the update DTO', async () => {
      // Test exists
      prismaService.testMaster.findFirst.mockResolvedValue(existingTest);
      // Update succeeds
      prismaService.testMaster.update.mockResolvedValue({
        ...existingTest,
        name: 'Updated Name',
      });

      const dto = { name: 'Updated Name' };

      const result = await service.updateTest('test-uuid-001', dto);

      expect(result).toBeDefined();
      expect(prismaService.measurementUnit.findFirst).not.toHaveBeenCalled();
    });
  });
});
