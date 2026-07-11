// Feature: laboratory-management, Property 12: Auto-Approval When No Doctor Required

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { LabWorkflowService } from '../lab-workflow.service';
import { OrderStateMachineService } from '../order-state-machine.service';
import { AutoFlaggingService } from '../auto-flagging.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

/**
 * **Validates: Requirements FR10.5**
 *
 * Property 12: Auto-Approval When No Doctor Required
 *
 * WHERE ALL Test_Master entries in an order have requiresDoctorApproval=false,
 * THE Order_Lifecycle SHALL auto-transition from VERIFIED to APPROVED after
 * technician verification completes.
 *
 * WHERE ANY Test_Master entry has requiresDoctorApproval=true,
 * the order SHALL remain in VERIFIED status awaiting doctor approval.
 */
describe('Property 12: Auto-Approval When No Doctor Required', () => {
  let service: LabWorkflowService;
  let prismaService: PrismaService;
  let orderStateMachine: {
    transition: jest.Mock;
    canTransition: jest.Mock;
    getValidTransitions: jest.Mock;
  };

  beforeEach(async () => {
    orderStateMachine = {
      transition: jest.fn().mockResolvedValue({}),
      canTransition: jest.fn().mockReturnValue(true),
      getValidTransitions: jest.fn().mockReturnValue([]),
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
              update: jest.fn().mockResolvedValue({}),
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
   * When ALL tests in an order have requiresDoctorApproval=false,
   * verifyResults should auto-transition the order from VERIFIED to APPROVED.
   */
  it('auto-approves when ALL tests have requiresDoctorApproval=false', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate N tests (1 to 10), ALL with requiresDoctorApproval=false
        fc.integer({ min: 1, max: 10 }),
        fc.uuid(),
        fc.uuid(),
        async (numTests, orderId, userId) => {
          // Reset mocks
          orderStateMachine.transition.mockClear();
          (prismaService.order.findUnique as jest.Mock).mockReset();

          // Create order details where ALL associated tests have requiresDoctorApproval=false
          const orderDetails = Array.from({ length: numTests }, (_, i) => ({
            id: `detail-${i}`,
            orderId,
            testId: `test-${i}`,
            resultValue: '10.5',
            status: 'RESULT_ENTERED',
            test: {
              id: `test-${i}`,
              name: `Test ${i}`,
              requiresDoctorApproval: false,
            },
          }));

          const mockOrder = {
            id: orderId,
            orderNumber: 'LAB-20250703-0001',
            patientId: 'patient-uuid-1',
            visitId: 'visit-uuid-1',
            status: OrderStatus.IN_ANALYSIS,
            orderDetails,
          };

          const mockVerifiedOrder = {
            ...mockOrder,
            status: OrderStatus.VERIFIED,
            orderDetails,
          };

          // First call: verifyResults queries the order (IN_ANALYSIS)
          // Second call: autoApproveIfEligible queries the order again (now VERIFIED)
          (prismaService.order.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockOrder)         // verifyResults initial query
            .mockResolvedValueOnce(mockVerifiedOrder)  // autoApproveIfEligible query
            .mockResolvedValue(mockVerifiedOrder);     // any subsequent calls

          // First transition: IN_ANALYSIS → VERIFIED
          // Second transition: VERIFIED → APPROVED (auto-approval)
          orderStateMachine.transition
            .mockResolvedValueOnce(mockVerifiedOrder)
            .mockResolvedValueOnce({ ...mockOrder, status: OrderStatus.APPROVED });

          await service.verifyResults(orderId, {}, userId);

          // Assert: state machine was called twice
          // 1st call: IN_ANALYSIS → VERIFIED
          expect(orderStateMachine.transition).toHaveBeenCalledWith(
            orderId,
            OrderStatus.VERIFIED,
            expect.objectContaining({ userId }),
          );

          // 2nd call: VERIFIED → APPROVED (auto-approval)
          expect(orderStateMachine.transition).toHaveBeenCalledWith(
            orderId,
            OrderStatus.APPROVED,
            expect.objectContaining({ userId }),
          );

          expect(orderStateMachine.transition).toHaveBeenCalledTimes(2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * When ANY test in the order has requiresDoctorApproval=true,
   * the order should NOT be auto-approved. It stays in VERIFIED status.
   */
  it('does NOT auto-approve when ANY test has requiresDoctorApproval=true', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate N tests (2 to 10), at least one with requiresDoctorApproval=true
        fc.integer({ min: 2, max: 10 }),
        // Index of the test that requires doctor approval (0 to N-1)
        fc.integer({ min: 0, max: 9 }),
        fc.uuid(),
        fc.uuid(),
        async (numTests, requiresApprovalIdxRaw, orderId, userId) => {
          // Ensure the index is within bounds
          const requiresApprovalIdx = requiresApprovalIdxRaw % numTests;

          // Reset mocks
          orderStateMachine.transition.mockClear();
          (prismaService.order.findUnique as jest.Mock).mockReset();

          // Create order details where ONE test has requiresDoctorApproval=true
          const orderDetails = Array.from({ length: numTests }, (_, i) => ({
            id: `detail-${i}`,
            orderId,
            testId: `test-${i}`,
            resultValue: '10.5',
            status: 'RESULT_ENTERED',
            test: {
              id: `test-${i}`,
              name: `Test ${i}`,
              requiresDoctorApproval: i === requiresApprovalIdx,
            },
          }));

          const mockOrder = {
            id: orderId,
            orderNumber: 'LAB-20250703-0001',
            patientId: 'patient-uuid-1',
            visitId: 'visit-uuid-1',
            status: OrderStatus.IN_ANALYSIS,
            orderDetails,
          };

          const mockVerifiedOrder = {
            ...mockOrder,
            status: OrderStatus.VERIFIED,
            orderDetails,
          };

          // First call: verifyResults queries the order (IN_ANALYSIS)
          // Second call: autoApproveIfEligible queries the order (VERIFIED)
          (prismaService.order.findUnique as jest.Mock)
            .mockResolvedValueOnce(mockOrder)          // verifyResults initial query
            .mockResolvedValueOnce(mockVerifiedOrder); // autoApproveIfEligible query

          // Only one transition call for IN_ANALYSIS → VERIFIED
          orderStateMachine.transition
            .mockResolvedValueOnce(mockVerifiedOrder);

          await service.verifyResults(orderId, {}, userId);

          // Assert: state machine was called only ONCE (IN_ANALYSIS → VERIFIED)
          expect(orderStateMachine.transition).toHaveBeenCalledWith(
            orderId,
            OrderStatus.VERIFIED,
            expect.objectContaining({ userId }),
          );

          // Auto-approval SHOULD NOT have been triggered
          expect(orderStateMachine.transition).not.toHaveBeenCalledWith(
            orderId,
            OrderStatus.APPROVED,
            expect.anything(),
          );

          expect(orderStateMachine.transition).toHaveBeenCalledTimes(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
