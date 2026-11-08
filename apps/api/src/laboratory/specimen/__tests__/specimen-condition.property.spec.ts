// Feature: lis-gap-remediation, Property 2: Specimen condition requires rejection reason

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SpecimenService } from '../specimen.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SampleCondition } from '@prisma/client';

/**
 * **Validates: Requirements 1.3, 1.4**
 *
 * Property 2: Specimen condition requires rejection reason
 *
 * For any specimen condition recording where condition ≠ ACCEPTABLE, the system
 * SHALL require a non-empty rejectionReason with max 200 characters. When
 * condition = ACCEPTABLE, rejectionReason SHALL be null.
 */
describe('Specimen Condition Validation Property Tests', () => {
  let service: SpecimenService;
  let prismaService: PrismaService;

  const NON_ACCEPTABLE_CONDITIONS: SampleCondition[] = [
    SampleCondition.LIPEMIC,
    SampleCondition.HEMOLYTIC,
    SampleCondition.HEMOLYZED,
    SampleCondition.CLOTTED,
    SampleCondition.INSUFFICIENT,
    SampleCondition.OTHER,
  ];

  const ALL_CONDITIONS: SampleCondition[] = [
    SampleCondition.ACCEPTABLE,
    ...NON_ACCEPTABLE_CONDITIONS,
  ];

  const mockSpecimen = {
    id: 'specimen-uuid',
    orderId: 'order-uuid',
    sampleTypeCode: 'BLOOD',
    barcode: 'ORD-001-BLOOD-01',
    condition: SampleCondition.ACCEPTABLE,
    rejectionReason: null,
    transportTemperature: null,
    temperatureCompliant: null,
    collectedAt: null,
    collectedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecimenService,
        {
          provide: PrismaService,
          useValue: {
            specimen: {
              findUnique: jest.fn().mockResolvedValue(mockSpecimen),
            },
            $transaction: jest.fn().mockImplementation(async (fn: any) => {
              const tx = {
                specimen: {
                  update: jest.fn().mockImplementation((args: any) =>
                    Promise.resolve({
                      ...mockSpecimen,
                      condition: args.data.condition,
                      rejectionReason: args.data.rejectionReason ?? null,
                    }),
                  ),
                },
                sampleCollectionAttempt: {
                  create: jest.fn().mockResolvedValue({ id: 'attempt-uuid' }),
                },
              };
              return fn(tx);
            }),
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

    service = module.get<SpecimenService>(SpecimenService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 2: Specimen condition requires rejection reason', () => {
    /**
     * When condition !== ACCEPTABLE and rejectionReason is missing or empty,
     * recordCondition SHALL throw BadRequestException.
     *
     * **Validates: Requirements 1.3, 1.4**
     */
    it('throws BadRequestException when condition !== ACCEPTABLE and rejectionReason is missing/empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...NON_ACCEPTABLE_CONDITIONS),
          fc.constantFrom(undefined, '', '   ', '\t', '\n'),
          async (condition, rejectionReason) => {
            const dto = { condition, rejectionReason } as any;

            await expect(
              service.recordCondition('specimen-uuid', dto, 'user-uuid'),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When condition !== ACCEPTABLE and rejectionReason exceeds 200 characters,
     * recordCondition SHALL throw BadRequestException.
     *
     * **Validates: Requirements 1.3, 1.4**
     */
    it('throws BadRequestException when condition !== ACCEPTABLE and rejectionReason exceeds 200 chars', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...NON_ACCEPTABLE_CONDITIONS),
          fc
            .string({ minLength: 201, maxLength: 500 })
            .filter((s) => s.trim().length > 0),
          async (condition, rejectionReason) => {
            const dto = { condition, rejectionReason };

            await expect(
              service.recordCondition('specimen-uuid', dto, 'user-uuid'),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When condition === ACCEPTABLE, the rejectionReason in the persisted specimen
     * SHALL be null regardless of what value is passed in the DTO.
     *
     * **Validates: Requirements 1.3, 1.4**
     */
    it('clears rejectionReason to null when condition === ACCEPTABLE', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null),
            fc.constant(''),
            fc.string({ minLength: 1, maxLength: 200 }),
          ),
          async (rejectionReason) => {
            const dto = {
              condition: SampleCondition.ACCEPTABLE,
              rejectionReason: rejectionReason as string | undefined,
            };

            const result = await service.recordCondition(
              'specimen-uuid',
              dto,
              'user-uuid',
            );

            expect(result.rejectionReason).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When condition !== ACCEPTABLE and rejectionReason is valid (1-200 chars, non-empty),
     * recordCondition SHALL succeed and return the updated specimen.
     *
     * **Validates: Requirements 1.3, 1.4**
     */
    it('succeeds when condition !== ACCEPTABLE with valid rejectionReason (1-200 chars)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...NON_ACCEPTABLE_CONDITIONS),
          fc
            .string({ minLength: 1, maxLength: 200 })
            .filter((s) => s.trim().length > 0),
          async (condition, rejectionReason) => {
            const dto = { condition, rejectionReason };

            const result = await service.recordCondition(
              'specimen-uuid',
              dto,
              'user-uuid',
            );

            expect(result).toBeDefined();
            expect(result.condition).toBe(condition);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
