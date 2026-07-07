// Feature: laboratory-management, Property 10: Verification Requires Complete Results
// Feature: laboratory-management, Property 11: All Results Entered Triggers Transition

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { LabWorkflowService } from '../lab-workflow.service';
import { OrderStateMachineService } from '../order-state-machine.service';
import { AutoFlaggingService } from '../auto-flagging.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrderStatus, Gender } from '@prisma/client';

/**
 * **Validates: Requirements FR7.7, FR9.2**
 *
 * Property 10: Verification Requires Complete Results
 * Property 11: All Results Entered Triggers Transition
 */
describe('Result Entry Property Tests', () => {
  let service: LabWorkflowService;
  let prismaService: PrismaService;
  let orderStateMachine: { transition: jest.Mock; canTransition: jest.Mock };

  beforeEach(async () => {
    orderStateMachine = {
      transition: jest.fn().mockResolvedValue({}),
      canTransition: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabWorkflowService,
        {
          provide: OrderStateMachineService,
          useValue: orderStateMachine,
        },
        {
          provide: AutoFlaggingService,
          useValue: {
            calculateFlag: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
            },
            orderDetail: {
              update: jest.fn().mockResolvedValue({}),
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
   * Property 10: Verification Requires Complete Results
   *
   * *For any* order with N OrderDetails where fewer than N have resultValue entered,
   * the order SHALL NOT transition to IN_ANALYSIS. The state machine transition
   * is only called when ALL OrderDetails have results.
   *
   * **Validates: Requirements FR9.2**
   */
  describe('Property 10: Verification Requires Complete Results', () => {
    it('partial results do NOT trigger IN_ANALYSIS transition', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate N total OrderDetails (2 to 10)
          fc.integer({ min: 2, max: 10 }),
          // Generate how many we will enter results for (1 to N-1, always partial)
          fc.integer({ min: 1, max: 9 }),
          fc.uuid(),
          async (totalDetails, partialCountRaw, orderId) => {
            // Ensure partialCount < totalDetails
            const partialCount = Math.min(partialCountRaw, totalDetails - 1);

            // Reset mocks
            orderStateMachine.transition.mockClear();
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.orderDetail.update as jest.Mock).mockReset();
            (prismaService.orderDetail.findMany as jest.Mock).mockReset();

            // Create N OrderDetails, all with null resultValue initially
            const orderDetails = Array.from({ length: totalDetails }, (_, i) => ({
              id: `detail-${i}`,
              orderId,
              testId: `test-${i}`,
              resultValue: null,
              status: 'PENDING',
            }));

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-20250703-0001',
              patientId: 'patient-uuid-1',
              status: OrderStatus.SAMPLE_COLLECTED,
              patient: {
                id: 'patient-uuid-1',
                name: 'Test Patient',
                dateOfBirth: new Date('1990-01-01'),
                gender: Gender.MALE,
              },
              orderDetails,
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // After entering partial results, simulate that some still have null
            const updatedOrderDetails = orderDetails.map((od, i) => ({
              ...od,
              resultValue: i < partialCount ? '10.5' : null,
            }));
            (prismaService.orderDetail.findMany as jest.Mock).mockResolvedValue(
              updatedOrderDetails,
            );

            // Build results DTO for only partialCount items
            const resultsDto = {
              results: orderDetails.slice(0, partialCount).map((od) => ({
                orderDetailId: od.id,
                resultValue: '10.5',
              })),
            };

            await service.enterResults(orderId, resultsDto, 'user-uuid-1');

            // Assert: state machine transition to IN_ANALYSIS was NOT called
            expect(orderStateMachine.transition).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 11: All Results Entered Triggers Transition
   *
   * *For any* order in SAMPLE_COLLECTED status with N OrderDetails, entering
   * results for ALL N OrderDetails (such that all have resultValue) SHALL trigger
   * a transition to IN_ANALYSIS via the state machine.
   *
   * **Validates: Requirements FR7.7**
   */
  describe('Property 11: All Results Entered Triggers Transition', () => {
    it('entering all results triggers IN_ANALYSIS transition for SAMPLE_COLLECTED order', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate N OrderDetails (1 to 10)
          fc.integer({ min: 1, max: 10 }),
          fc.uuid(),
          async (totalDetails, orderId) => {
            // Reset mocks
            orderStateMachine.transition.mockClear();
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.orderDetail.update as jest.Mock).mockReset();
            (prismaService.orderDetail.findMany as jest.Mock).mockReset();

            // Create N OrderDetails, all with null resultValue
            const orderDetails = Array.from({ length: totalDetails }, (_, i) => ({
              id: `detail-${i}`,
              orderId,
              testId: `test-${i}`,
              resultValue: null,
              status: 'PENDING',
            }));

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-20250703-0001',
              patientId: 'patient-uuid-1',
              status: OrderStatus.SAMPLE_COLLECTED,
              patient: {
                id: 'patient-uuid-1',
                name: 'Test Patient',
                dateOfBirth: new Date('1990-01-01'),
                gender: Gender.MALE,
              },
              orderDetails,
            };

            (prismaService.order.findUnique as jest.Mock)
              .mockResolvedValueOnce(mockOrder)  // First call in enterResults
              .mockResolvedValue({               // Return call at end
                ...mockOrder,
                status: OrderStatus.IN_ANALYSIS,
                orderDetails: orderDetails.map((od) => ({
                  ...od,
                  resultValue: '10.5',
                  test: { id: od.testId, name: `Test ${od.testId}` },
                })),
              });

            // After entering ALL results, all OrderDetails have resultValue
            const updatedOrderDetails = orderDetails.map((od) => ({
              ...od,
              resultValue: '10.5',
            }));
            (prismaService.orderDetail.findMany as jest.Mock).mockResolvedValue(
              updatedOrderDetails,
            );

            // Build results DTO for ALL items
            const resultsDto = {
              results: orderDetails.map((od) => ({
                orderDetailId: od.id,
                resultValue: '10.5',
              })),
            };

            await service.enterResults(orderId, resultsDto, 'user-uuid-1');

            // Assert: state machine transition was called with IN_ANALYSIS
            expect(orderStateMachine.transition).toHaveBeenCalledWith(
              orderId,
              OrderStatus.IN_ANALYSIS,
              { userId: 'user-uuid-1' },
            );
            expect(orderStateMachine.transition).toHaveBeenCalledTimes(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('order already in IN_ANALYSIS does NOT trigger transition again when all results entered', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.uuid(),
          async (totalDetails, orderId) => {
            // Reset mocks
            orderStateMachine.transition.mockClear();
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.orderDetail.update as jest.Mock).mockReset();
            (prismaService.orderDetail.findMany as jest.Mock).mockReset();

            const orderDetails = Array.from({ length: totalDetails }, (_, i) => ({
              id: `detail-${i}`,
              orderId,
              testId: `test-${i}`,
              resultValue: null,
              status: 'PENDING',
            }));

            // Order is already IN_ANALYSIS (re-entering results after rejection)
            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-20250703-0001',
              patientId: 'patient-uuid-1',
              status: OrderStatus.IN_ANALYSIS,
              patient: {
                id: 'patient-uuid-1',
                name: 'Test Patient',
                dateOfBirth: new Date('1990-01-01'),
                gender: Gender.MALE,
              },
              orderDetails,
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // All results are filled after entering
            const updatedOrderDetails = orderDetails.map((od) => ({
              ...od,
              resultValue: '10.5',
            }));
            (prismaService.orderDetail.findMany as jest.Mock).mockResolvedValue(
              updatedOrderDetails,
            );

            const resultsDto = {
              results: orderDetails.map((od) => ({
                orderDetailId: od.id,
                resultValue: '10.5',
              })),
            };

            await service.enterResults(orderId, resultsDto, 'user-uuid-1');

            // Transition should NOT be called because order is already IN_ANALYSIS
            // (the service only transitions from SAMPLE_COLLECTED to IN_ANALYSIS)
            expect(orderStateMachine.transition).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
