// Feature: laboratory-management, Property 9: Non-Acceptable Sample Preserves Status

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { LabWorkflowService } from '../lab-workflow.service';
import { OrderStateMachineService } from '../order-state-machine.service';
import { AutoFlaggingService } from '../auto-flagging.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrderStatus, SampleCondition } from '@prisma/client';

/**
 * **Validates: Requirements FR6.4**
 *
 * Property 9: Non-Acceptable Sample Preserves Status
 *
 * IF the sampleCondition is not ACCEPTABLE, THEN the order SHALL remain in
 * PAID status and the rejectionReason SHALL be recorded on the order.
 */
describe('Sample Collection Property Tests', () => {
  let service: LabWorkflowService;
  let prismaService: PrismaService;

  const NON_ACCEPTABLE_CONDITIONS = [
    SampleCondition.LIPEMIC,
    SampleCondition.HEMOLYTIC,
    SampleCondition.CLOTTED,
    SampleCondition.INSUFFICIENT,
  ];

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'LAB-20250703-0001',
    patientId: 'patient-uuid-1',
    status: OrderStatus.PAID,
    barcode: 'LAB-20250703-0001',
    barcodeImage: 'base64-barcode-image',
    totalAmount: 150000,
    sampleCondition: null,
    rejectionReason: null,
    patient: { id: 'patient-uuid-1', name: 'Test Patient' },
    orderDetails: [],
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
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LabWorkflowService>(LabWorkflowService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  /**
   * Property 9: Non-Acceptable Sample Preserves Status
   *
   * *For any* non-ACCEPTABLE SampleCondition value and *for any* rejection reason,
   * when confirmSample is called, the order SHALL remain in PAID status,
   * sampleCondition SHALL be set to the given condition, and rejectionReason
   * SHALL be recorded.
   *
   * **Validates: Requirements FR6.4**
   */
  describe('Property 9: Non-Acceptable Sample Preserves Status', () => {
    it('order remains PAID and records sampleCondition + rejectionReason for any non-ACCEPTABLE condition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...NON_ACCEPTABLE_CONDITIONS),
          fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
          async (condition, rejectionReason) => {
            // Reset mocks between runs
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.order.update as jest.Mock).mockReset();

            // Setup: mock findUnique to return a PAID order with barcode
            (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
              ...mockOrder,
            });

            // Setup: mock update to dynamically return based on call arguments
            (prismaService.order.update as jest.Mock).mockImplementation(
              (args: any) => {
                return Promise.resolve({
                  ...mockOrder,
                  ...args.data,
                  patient: mockOrder.patient,
                  orderDetails: mockOrder.orderDetails,
                });
              },
            );

            // Act
            const result = await service.confirmSample(
              mockOrder.id,
              { sampleCondition: condition, rejectionReason },
              'user-uuid-1',
            );

            // Assert: order.update was called with sampleCondition and rejectionReason (NOT a status change)
            expect(prismaService.order.update).toHaveBeenCalledWith({
              where: { id: mockOrder.id },
              data: {
                sampleCondition: condition,
                rejectionReason: rejectionReason ?? null,
              },
              include: { patient: true, orderDetails: true },
            });

            // Assert: returned order still has PAID status (no status transition)
            expect(result.status).toBe(OrderStatus.PAID);

            // Assert: sampleCondition is set to the non-acceptable condition
            expect(result.sampleCondition).toBe(condition);

            // Assert: rejectionReason is recorded
            expect(result.rejectionReason).toBe(rejectionReason ?? null);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('state machine transition is NOT called for non-acceptable conditions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...NON_ACCEPTABLE_CONDITIONS),
          async (condition) => {
            const orderStateMachine = (service as any).orderStateMachine;

            // Reset mock call tracking
            orderStateMachine.transition.mockClear();
            (prismaService.order.findUnique as jest.Mock).mockReset();
            (prismaService.order.update as jest.Mock).mockReset();

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
              ...mockOrder,
            });

            (prismaService.order.update as jest.Mock).mockImplementation(
              (args: any) => {
                return Promise.resolve({
                  ...mockOrder,
                  ...args.data,
                  patient: mockOrder.patient,
                  orderDetails: mockOrder.orderDetails,
                });
              },
            );

            await service.confirmSample(
              mockOrder.id,
              { sampleCondition: condition },
              'user-uuid-1',
            );

            // The state machine should NOT be invoked for non-acceptable samples
            expect(orderStateMachine.transition).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
