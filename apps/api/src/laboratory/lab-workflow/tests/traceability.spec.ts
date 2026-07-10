import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LabWorkflowService } from '../lab-workflow.service';
import { OrderStateMachineService } from '../order-state-machine.service';
import { AutoFlaggingService } from '../auto-flagging.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OrderStatus, SampleCondition } from '@prisma/client';

/**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 *
 * Traceability Chain Enforcement Unit Tests
 *
 * Every lab workflow operation (sample collection, result entry, verification,
 * approval) must verify that the referenced Order has a non-null visitId before
 * proceeding, enforcing the traceability chain: Visit → Order → {operation}.
 */
describe('LabWorkflowService - Traceability Chain Enforcement', () => {
  let service: LabWorkflowService;
  let prismaService: PrismaService;

  const orderId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440001';

  const baseOrder = {
    id: orderId,
    orderNumber: 'LAB-20250703-0001',
    patientId: 'patient-uuid-1',
    visitId: null,
    barcode: 'LAB-20250703-0001',
    barcodeImage: 'base64-barcode-image',
    totalAmount: 150000,
    sampleCondition: null,
    rejectionReason: null,
    patient: {
      id: 'patient-uuid-1',
      name: 'Test Patient',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
    },
    orderDetails: [
      {
        id: 'detail-uuid-1',
        orderId,
        testId: 'test-uuid-1',
        resultValue: null,
        flag: null,
        status: 'PENDING',
        test: { id: 'test-uuid-1', name: 'CBC', requiresDoctorApproval: false },
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
              update: jest.fn(),
            },
            orderDetail: {
              findMany: jest.fn(),
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
   * Requirement 6.1: WHEN a sample collection operation is performed,
   * THE Order_Service SHALL verify that the referenced Order has a non-null
   * visitId before recording the sample.
   */
  describe('confirmSample rejects when order.visitId is null', () => {
    it('should throw BadRequestException with ERR_VALIDATION and "no visit linkage" message', async () => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.PAID,
        visitId: null,
      });

      await expect(
        service.confirmSample(
          orderId,
          { sampleCondition: SampleCondition.ACCEPTABLE },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.confirmSample(
          orderId,
          { sampleCondition: SampleCondition.ACCEPTABLE },
          userId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          errorCode: 'ERR_VALIDATION',
        });
        expect((response as any).message).toContain('no visit linkage');
      }
    });
  });

  /**
   * Requirement 6.2: WHEN a result entry operation is performed,
   * THE Order_Service SHALL verify that the referenced OrderDetail's parent
   * Order has a non-null visitId before persisting the result.
   */
  describe('enterResults rejects when order.visitId is null', () => {
    it('should throw BadRequestException with ERR_VALIDATION and "no visit linkage" message', async () => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.SAMPLE_COLLECTED,
        visitId: null,
      });

      await expect(
        service.enterResults(
          orderId,
          {
            results: [
              { orderDetailId: 'detail-uuid-1', resultValue: '5.5' },
            ],
          },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.enterResults(
          orderId,
          {
            results: [
              { orderDetailId: 'detail-uuid-1', resultValue: '5.5' },
            ],
          },
          userId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          errorCode: 'ERR_VALIDATION',
        });
        expect((response as any).message).toContain('no visit linkage');
      }
    });
  });

  /**
   * Requirement 6.3: WHEN a verification operation is performed,
   * THE Order_Service SHALL verify that the referenced Order has a non-null
   * visitId before recording the verification.
   */
  describe('verifyResults rejects when order.visitId is null', () => {
    it('should throw BadRequestException with ERR_VALIDATION and "no visit linkage" message', async () => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.IN_ANALYSIS,
        visitId: null,
      });

      await expect(
        service.verifyResults(
          orderId,
          { verificationNotes: 'All looks good' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.verifyResults(
          orderId,
          { verificationNotes: 'All looks good' },
          userId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          errorCode: 'ERR_VALIDATION',
        });
        expect((response as any).message).toContain('no visit linkage');
      }
    });
  });

  /**
   * Requirement 6.4: WHEN an approval operation is performed,
   * THE Order_Service SHALL verify that the referenced Order has a non-null
   * visitId before recording the approval.
   */
  describe('approveOrder rejects when order.visitId is null', () => {
    it('should throw BadRequestException with ERR_VALIDATION and "no visit linkage" message', async () => {
      (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
        ...baseOrder,
        status: OrderStatus.VERIFIED,
        visitId: null,
      });

      await expect(
        service.approveOrder(
          orderId,
          { decision: 'APPROVE', interpretation: 'Normal results' },
          userId,
        ),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.approveOrder(
          orderId,
          { decision: 'APPROVE', interpretation: 'Normal results' },
          userId,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          errorCode: 'ERR_VALIDATION',
        });
        expect((response as any).message).toContain('no visit linkage');
      }
    });
  });
});
