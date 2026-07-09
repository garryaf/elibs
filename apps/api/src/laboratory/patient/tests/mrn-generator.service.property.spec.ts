// Feature: patient-mrn-identifier, Property 1: MRN format correctness
// Feature: patient-mrn-identifier, Property 2: MRN sequence monotonicity

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { MrnGeneratorService } from '../mrn-generator.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('MrnGeneratorService Property Tests', () => {
  let service: MrnGeneratorService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MrnGeneratorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MrnGeneratorService>(MrnGeneratorService);
    prismaService = module.get(PrismaService);
  });

  /**
   * Property 1: MRN Format Correctness
   *
   * For any date (year and month) and any sequence number from 1 to 9999,
   * the generated MRN SHALL match the pattern `RM-YYYYMM-XXXX` where YYYY is
   * a 4-digit year, MM is a 2-digit month (01-12), and XXXX is zero-padded to 4 digits.
   *
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: MRN Format Correctness', () => {
    it('should always produce MRNs matching RM-YYYYMM-XXXX for any valid year, month, and sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2020, max: 2099 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 9999 }),
          async (year, month, sequence) => {
            // Mock the date to the specified year/month
            const mockDate = new Date(year, month - 1, 15);
            jest.useFakeTimers();
            jest.setSystemTime(mockDate);

            // Mock $transaction to return the sequence value
            prismaService.$transaction.mockImplementation(async (fn) => {
              const tx = {
                $executeRaw: jest.fn().mockResolvedValue(undefined),
                mrnSequence: {
                  findUniqueOrThrow: jest
                    .fn()
                    .mockResolvedValue({ id: '', lastValue: sequence }),
                },
              };
              return fn(tx as any);
            });

            const mrn = await service.generate();

            // Assert format matches RM-YYYYMM-XXXX
            expect(mrn).toMatch(/^RM-\d{6}-\d{4}$/);

            // Verify year/month components
            const parts = mrn.split('-');
            const monthKey = parts[1];
            const parsedYear = parseInt(monthKey.slice(0, 4), 10);
            const parsedMonth = parseInt(monthKey.slice(4, 6), 10);

            expect(parsedYear).toBe(year);
            expect(parsedMonth).toBe(month);

            // Verify the sequence portion is the zero-padded sequence
            const sequencePart = parseInt(parts[2], 10);
            expect(sequencePart).toBe(sequence);

            jest.useRealTimers();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: MRN Sequence Monotonicity
   *
   * For any series of N MRN generation calls within the same month (where N >= 2),
   * the sequence numbers extracted from the generated MRNs SHALL be strictly
   * monotonically increasing and all MRN values SHALL be distinct.
   *
   * **Validates: Requirements 1.3, 2.1**
   */
  describe('Property 2: MRN Sequence Monotonicity', () => {
    it('should produce strictly increasing sequence numbers for N sequential calls in the same month', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 20 }),
          async (n) => {
            // Fix date to a specific month
            const mockDate = new Date(2025, 6, 15); // July 2025
            jest.useFakeTimers();
            jest.setSystemTime(mockDate);

            // Track call count to simulate incrementing sequence
            let callCount = 0;

            prismaService.$transaction.mockImplementation(async (fn) => {
              callCount++;
              const currentValue = callCount;
              const tx = {
                $executeRaw: jest.fn().mockResolvedValue(undefined),
                mrnSequence: {
                  findUniqueOrThrow: jest
                    .fn()
                    .mockResolvedValue({ id: '202507', lastValue: currentValue }),
                },
              };
              return fn(tx as any);
            });

            // Generate N MRNs sequentially
            const mrns: string[] = [];
            for (let i = 0; i < n; i++) {
              const mrn = await service.generate();
              mrns.push(mrn);
            }

            // Extract sequence numbers from the last 4 digits
            const sequenceNumbers = mrns.map((mrn) => {
              const parts = mrn.split('-');
              return parseInt(parts[2], 10);
            });

            // Assert strict monotonic increase
            for (let i = 1; i < sequenceNumbers.length; i++) {
              expect(sequenceNumbers[i]).toBeGreaterThan(sequenceNumbers[i - 1]);
            }

            // Assert all MRN values are distinct
            const uniqueMrns = new Set(mrns);
            expect(uniqueMrns.size).toBe(mrns.length);

            jest.useRealTimers();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
