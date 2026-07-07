// Feature: laboratory-management, Property 14: Delta Check Bounded Results

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { LabWorkflowService } from '../lab-workflow.service';
import { OrderStateMachineService } from '../order-state-machine.service';
import { AutoFlaggingService } from '../auto-flagging.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

/**
 * **Validates: Requirements FR8.2**
 *
 * Property 14: Delta Check Bounded Results
 *
 * *For any* number N of historical results (N from 0 to 20), the getDeltaCheck
 * method SHALL return at most 5 results per test, ordered by date descending.
 * If N > 5, exactly 5 are returned (the most recent ones).
 * If N <= 5, exactly N are returned.
 */
describe('Delta Check Property Tests', () => {
  let service: LabWorkflowService;
  let prismaService: PrismaService;

  const TEST_ID = 'test-uuid-1';
  const ORDER_ID = 'order-uuid-1';
  const PATIENT_ID = 'patient-uuid-1';

  const mockOrder = {
    id: ORDER_ID,
    orderNumber: 'LAB-20250703-0001',
    patientId: PATIENT_ID,
    status: OrderStatus.IN_ANALYSIS,
    orderDetails: [
      {
        id: 'detail-uuid-1',
        testId: TEST_ID,
        test: { id: TEST_ID, name: 'Hemoglobin' },
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabWorkflowService,
        {
          provide: OrderStateMachineService,
          useValue: {
            transition: jest.fn(),
            canTransition: jest.fn(),
          },
        },
        {
          provide: AutoFlaggingService,
          useValue: {
            calculateFlag: jest.fn(),
            calculateFlags: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
            },
            orderDetail: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LabWorkflowService>(LabWorkflowService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  /**
   * Property 14: Delta Check Bounded Results
   *
   * *For any* N historical results (0 to 20), the delta check SHALL return
   * at most 5 results per test, ordered by resultEnteredAt descending.
   *
   * **Validates: Requirements FR8.2**
   */
  describe('Property 14: Delta Check Bounded Results', () => {
    it('returns at most 5 historical results per test, ordered by date descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 20 }),
          async (n) => {
            // Reset mocks between runs
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.orderDetail.findMany as jest.Mock).mockReset();

            // Generate N historical results with distinct dates
            const baseDate = new Date('2025-01-01T00:00:00Z');
            const allHistoricalResults = Array.from({ length: n }, (_, i) => ({
              id: `history-${i}`,
              testId: TEST_ID,
              resultValue: `${10 + i}`,
              flag: 'NORMAL',
              resultEnteredAt: new Date(
                baseDate.getTime() + i * 86400000, // each day apart
              ),
              order: { orderNumber: `LAB-20250101-${String(i + 1).padStart(4, '0')}` },
            }));

            // Sort all by date descending (most recent first)
            const sortedDesc = [...allHistoricalResults].sort(
              (a, b) =>
                b.resultEnteredAt.getTime() - a.resultEnteredAt.getTime(),
            );

            // The DB simulates `take: 5, orderBy: { resultEnteredAt: 'desc' }`
            // So it returns at most 5 of the most recent results
            const dbResult = sortedDesc.slice(0, 5);

            // Mock order.findUnique to return the order with its test
            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
              mockOrder,
            );

            // Mock orderDetail.findMany to simulate DB behavior (take: 5, orderBy desc)
            (prismaService.orderDetail.findMany as jest.Mock).mockResolvedValue(
              dbResult,
            );

            // Act
            const result = await service.getDeltaCheck(ORDER_ID);

            // Assert: result is an array with one test entry
            expect(result).toHaveLength(1);
            const testResult = result[0];
            expect(testResult.testId).toBe(TEST_ID);
            expect(testResult.testName).toBe('Hemoglobin');

            // Assert: at most 5 historical results returned
            expect(testResult.history.length).toBeLessThanOrEqual(5);

            // Assert: if N > 5, exactly 5 returned; if N <= 5, exactly N returned
            const expectedCount = Math.min(n, 5);
            expect(testResult.history.length).toBe(expectedCount);

            // Assert: results are ordered by date descending
            for (let i = 1; i < testResult.history.length; i++) {
              const prevDate = new Date(testResult.history[i - 1].resultDate).getTime();
              const currDate = new Date(testResult.history[i].resultDate).getTime();
              expect(prevDate).toBeGreaterThanOrEqual(currDate);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('returns empty history array when no historical results exist (N=0)', async () => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prismaService.orderDetail.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getDeltaCheck(ORDER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].history).toHaveLength(0);
    });

    it('queries with take: 5 and orderBy resultEnteredAt desc for any N', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 20 }),
          async (n) => {
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.orderDetail.findMany as jest.Mock).mockReset();

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(
              mockOrder,
            );
            (prismaService.orderDetail.findMany as jest.Mock).mockResolvedValue(
              [],
            );

            await service.getDeltaCheck(ORDER_ID);

            // Assert: the findMany is called with take: 5 and orderBy desc
            expect(prismaService.orderDetail.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                take: 5,
                orderBy: { resultEnteredAt: 'desc' },
              }),
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
