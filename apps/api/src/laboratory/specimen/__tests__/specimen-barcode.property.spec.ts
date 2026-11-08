// Feature: lis-gap-remediation, Property 1: Specimen barcode uniqueness and format compliance

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SpecimenService } from '../specimen.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SampleCondition } from '@prisma/client';

/**
 * **Validates: Requirements 1.1, 1.2**
 *
 * Property 1: Specimen barcode uniqueness and format compliance
 *
 * For any Order with N distinct sample types, creating specimens SHALL produce
 * exactly N Specimen records, each with a unique barcode matching the format
 * `{orderNumber}-{sampleTypeCode}-{sequence}`.
 */
describe('Specimen Barcode Generation Property Tests', () => {
  let service: SpecimenService;
  let prismaService: any;

  // Generators for realistic sample type codes
  const sampleTypeCodeArb = fc.stringMatching(/^[A-Z]{2,6}$/);

  // Generator for order numbers (realistic format)
  const orderNumberArb = fc.stringMatching(/^ORD-\d{8}-\d{4}$/);

  // Generator for a set of distinct sample types (1 to 10)
  const distinctSampleTypesArb = fc
    .uniqueArray(sampleTypeCodeArb, { minLength: 1, maxLength: 10 })
    .filter((arr) => arr.length >= 1);

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn(),
      },
      specimen: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecimenService,
        {
          provide: PrismaService,
          useValue: prismaService,
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
  });

  describe('Property 1: Specimen barcode uniqueness and format compliance', () => {
    /**
     * For any order with N tests having distinct sample types,
     * createSpecimensForOrder produces exactly N specimens.
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('produces exactly N specimens for N distinct sample types', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderNumberArb,
          distinctSampleTypesArb,
          async (orderNumber, sampleTypes) => {
            const orderId = 'order-uuid-' + Math.random().toString(36).slice(2);

            // Build order details: one test per sample type
            const orderDetails = sampleTypes.map((st, idx) => ({
              id: `detail-${idx}`,
              test: { sampleType: st },
            }));

            // Mock order lookup
            prismaService.order.findUnique.mockResolvedValue({
              id: orderId,
              orderNumber,
              orderDetails,
            });

            // Mock no existing specimens
            prismaService.specimen.findMany.mockResolvedValue([]);

            // Mock transaction to execute callback and track created specimens
            const createdSpecimens: any[] = [];
            prismaService.$transaction.mockImplementation(async (cb: any) => {
              const tx = {
                specimen: {
                  create: jest.fn().mockImplementation(({ data }) => {
                    const specimen = {
                      id: `specimen-${createdSpecimens.length}`,
                      ...data,
                    };
                    createdSpecimens.push(specimen);
                    return Promise.resolve(specimen);
                  }),
                },
              };
              return cb(tx);
            });

            const result = await service.createSpecimensForOrder(
              orderId,
              'user-123',
            );

            // Property: Exactly N specimens for N distinct sample types
            expect(result).toHaveLength(sampleTypes.length);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Each barcode matches the format `{orderNumber}-{sampleTypeCode}-{XX}`
     * where XX is a zero-padded sequence number.
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('each barcode matches format {orderNumber}-{sampleTypeCode}-{XX}', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderNumberArb,
          distinctSampleTypesArb,
          async (orderNumber, sampleTypes) => {
            const orderId = 'order-uuid-' + Math.random().toString(36).slice(2);

            const orderDetails = sampleTypes.map((st, idx) => ({
              id: `detail-${idx}`,
              test: { sampleType: st },
            }));

            prismaService.order.findUnique.mockResolvedValue({
              id: orderId,
              orderNumber,
              orderDetails,
            });

            prismaService.specimen.findMany.mockResolvedValue([]);

            prismaService.$transaction.mockImplementation(async (cb: any) => {
              const tx = {
                specimen: {
                  create: jest.fn().mockImplementation(({ data }) => {
                    return Promise.resolve({
                      id: `specimen-${Math.random().toString(36).slice(2)}`,
                      ...data,
                    });
                  }),
                },
              };
              return cb(tx);
            });

            const result = await service.createSpecimensForOrder(
              orderId,
              'user-123',
            );

            // Property: Each barcode matches the expected format
            const barcodeRegex = /^.+-[A-Z]{2,6}-\d{2}$/;

            for (const specimen of result) {
              // Verify general format compliance
              expect(specimen.barcode).toMatch(barcodeRegex);

              // Verify that the barcode starts with the order number
              expect(specimen.barcode.startsWith(orderNumber + '-')).toBe(true);

              // Verify that the barcode contains the specimen's sample type code
              const parts = specimen.barcode.split('-');
              // Format: {orderNumber parts}-{sampleTypeCode}-{sequence}
              // orderNumber is like ORD-20260101-0001, so after splitting by '-':
              // parts = [ORD, 20260101, 0001, sampleTypeCode, sequence]
              const sequencePart = parts[parts.length - 1];
              const sampleTypePart = parts[parts.length - 2];

              expect(sampleTypes).toContain(sampleTypePart);
              expect(sequencePart).toMatch(/^\d{2}$/);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * All barcodes in the result set are unique.
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('all barcodes in the result set are unique', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderNumberArb,
          distinctSampleTypesArb,
          async (orderNumber, sampleTypes) => {
            const orderId = 'order-uuid-' + Math.random().toString(36).slice(2);

            const orderDetails = sampleTypes.map((st, idx) => ({
              id: `detail-${idx}`,
              test: { sampleType: st },
            }));

            prismaService.order.findUnique.mockResolvedValue({
              id: orderId,
              orderNumber,
              orderDetails,
            });

            prismaService.specimen.findMany.mockResolvedValue([]);

            prismaService.$transaction.mockImplementation(async (cb: any) => {
              const tx = {
                specimen: {
                  create: jest.fn().mockImplementation(({ data }) => {
                    return Promise.resolve({
                      id: `specimen-${Math.random().toString(36).slice(2)}`,
                      ...data,
                    });
                  }),
                },
              };
              return cb(tx);
            });

            const result = await service.createSpecimensForOrder(
              orderId,
              'user-123',
            );

            // Property: All barcodes are unique
            const barcodes = result.map((s: any) => s.barcode);
            const uniqueBarcodes = new Set(barcodes);
            expect(uniqueBarcodes.size).toBe(barcodes.length);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Barcode format is deterministic for the same input — calling with the
     * same order and sample types produces the same barcodes.
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('barcode generation is deterministic for the same input', async () => {
      await fc.assert(
        fc.asyncProperty(
          orderNumberArb,
          distinctSampleTypesArb,
          async (orderNumber, sampleTypes) => {
            const orderId = 'order-uuid-fixed';

            const orderDetails = sampleTypes.map((st, idx) => ({
              id: `detail-${idx}`,
              test: { sampleType: st },
            }));

            const setupMocks = () => {
              prismaService.order.findUnique.mockResolvedValue({
                id: orderId,
                orderNumber,
                orderDetails,
              });

              prismaService.specimen.findMany.mockResolvedValue([]);

              prismaService.$transaction.mockImplementation(async (cb: any) => {
                const tx = {
                  specimen: {
                    create: jest.fn().mockImplementation(({ data }) => {
                      return Promise.resolve({
                        id: `specimen-${Math.random().toString(36).slice(2)}`,
                        ...data,
                      });
                    }),
                  },
                };
                return cb(tx);
              });
            };

            // First call
            setupMocks();
            const result1 = await service.createSpecimensForOrder(
              orderId,
              'user-123',
            );

            // Second call with same input
            setupMocks();
            const result2 = await service.createSpecimensForOrder(
              orderId,
              'user-123',
            );

            // Property: Same inputs produce same barcodes
            const barcodes1 = result1.map((s: any) => s.barcode).sort();
            const barcodes2 = result2.map((s: any) => s.barcode).sort();
            expect(barcodes1).toEqual(barcodes2);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
