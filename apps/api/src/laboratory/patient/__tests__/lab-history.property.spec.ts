// Feature: ncr-visits-patient-remediation, Property: Lab History Pagination

import * as fc from 'fast-check';
import { PatientService } from '../patient.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RegionValidationService } from '../../region/region-validation.service';
import { MrnGeneratorService } from '../mrn-generator.service';
import { AuditService } from '../../audit/audit.service';

/**
 * Property-Based Tests: Lab History Pagination
 *
 * Tests the pagination behavior of the getLabHistory service method:
 * 1. items.length ≤ limit for any valid page/limit
 * 2. meta.totalPages === Math.ceil(total / limit)
 * 3. Items ordered by createdAt descending
 *
 * **Validates: Requirements 3.9**
 */
describe('Lab History Pagination Property Tests', () => {
  /**
   * Helper: generates a mock dataset of orders with createdAt dates in descending order
   */
  function generateOrderDataset(size: number): any[] {
    const baseDate = new Date('2026-01-01T00:00:00.000Z').getTime();
    return Array.from({ length: size }, (_, i) => ({
      id: `order-${i}`,
      orderNumber: `ORD-2026-${String(i + 1).padStart(4, '0')}`,
      status: 'COMPLETED',
      paymentMethod: 'CASH',
      createdAt: new Date(baseDate - i * 86400000), // Each item 1 day earlier
      visit: { visitNumber: `VST-2026-${String(i + 1).padStart(4, '0')}` },
      orderDetails: [
        {
          id: `detail-${i}-1`,
          test: { name: `Test ${i}` },
          resultValue: '10.5',
          flag: 'NORMAL',
          status: 'COMPLETED',
          createdAt: new Date(baseDate - i * 86400000),
        },
      ],
    }));
  }

  /**
   * Creates a mock PrismaService that returns a paginated slice of a dataset
   */
  function createMockPrisma(totalDataset: any[]) {
    const mockPrisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({ id: 'patient-uuid', name: 'Test Patient', deletedAt: null }),
        findUnique: jest.fn().mockResolvedValue({ id: 'patient-uuid', name: 'Test Patient', deletedAt: null }),
      },
      order: {
        findMany: jest.fn().mockImplementation(({ skip, take }: { skip: number; take: number }) => {
          const sliced = totalDataset.slice(skip, skip + take);
          return Promise.resolve(sliced);
        }),
        count: jest.fn().mockResolvedValue(totalDataset.length),
      },
    } as unknown as PrismaService;
    return mockPrisma;
  }

  function createService(mockPrisma: PrismaService): PatientService {
    const mockMrnGenerator = { generate: jest.fn() } as unknown as MrnGeneratorService;
    const mockRegionValidation = { validateHierarchy: jest.fn() } as unknown as RegionValidationService;
    const mockAuditService = { log: jest.fn() } as unknown as AuditService;
    return new PatientService(mockPrisma, mockMrnGenerator, mockRegionValidation, mockAuditService);
  }

  /**
   * Property 1: For any valid (page, limit) and dataset size, items.length ≤ limit
   *
   * **Validates: Requirements 3.9**
   */
  describe('Property 1: items.length ≤ limit', () => {
    it('returned items count never exceeds the requested limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // page
          fc.integer({ min: 1, max: 50 }),   // limit
          fc.integer({ min: 0, max: 200 }),  // dataset size
          async (page, limit, datasetSize) => {
            const dataset = generateOrderDataset(datasetSize);
            const mockPrisma = createMockPrisma(dataset);
            const service = createService(mockPrisma);

            const result = await service.getLabHistory('patient-uuid', { page, limit });

            expect(result.data.items.length).toBeLessThanOrEqual(limit);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 2: For any total and limit, meta.totalPages === Math.ceil(total / limit)
   *
   * **Validates: Requirements 3.9**
   */
  describe('Property 2: meta.totalPages === Math.ceil(total / limit)', () => {
    it('totalPages is always ceil(total / limit)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // page
          fc.integer({ min: 1, max: 50 }),   // limit
          fc.integer({ min: 0, max: 200 }),  // dataset size (= total)
          async (page, limit, datasetSize) => {
            const dataset = generateOrderDataset(datasetSize);
            const mockPrisma = createMockPrisma(dataset);
            const service = createService(mockPrisma);

            const result = await service.getLabHistory('patient-uuid', { page, limit });

            const expectedTotalPages = Math.ceil(datasetSize / limit);
            expect(result.data.meta.totalPages).toBe(expectedTotalPages);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  /**
   * Property 3: Items are ordered by createdAt descending (each item's date ≥ next item's date)
   *
   * **Validates: Requirements 3.9**
   */
  describe('Property 3: Items ordered by createdAt descending', () => {
    it('each item createdAt is >= the next item createdAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),  // page (keep small to have data on page)
          fc.integer({ min: 2, max: 50 }),  // limit (at least 2 to check ordering)
          fc.integer({ min: 2, max: 200 }), // dataset size (at least 2 items)
          async (page, limit, datasetSize) => {
            const dataset = generateOrderDataset(datasetSize);
            const mockPrisma = createMockPrisma(dataset);
            const service = createService(mockPrisma);

            const result = await service.getLabHistory('patient-uuid', { page, limit });
            const items = result.data.items;

            // Check ordering: each item's createdAt >= next item's createdAt
            for (let i = 0; i < items.length - 1; i++) {
              const currentDate = new Date(items[i].createdAt).getTime();
              const nextDate = new Date(items[i + 1].createdAt).getTime();
              expect(currentDate).toBeGreaterThanOrEqual(nextDate);
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
