// Feature: lis-gap-remediation, Property 11: Discount requires approved ApprovalRequest

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from '../payment.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BarcodeService } from '../../../common/barcode';
import { AuditService } from '../../audit/audit.service';
import { OrderStateMachineService } from '../../lab-workflow/order-state-machine.service';
import { DiscountApprovalService } from '../../../approval/discount-approval.service';
import { OrderStatus, PaymentMethod } from '@prisma/client';

/**
 * **Validates: Requirements 9.2, 9.3**
 *
 * Property 11: Discount requires approved ApprovalRequest
 *
 * For any payment with a discount, there SHALL be a matching approved
 * ApprovalRequest with requestType=DISCOUNT. If no such approved request
 * exists, the payment SHALL be rejected with ERR_DISCOUNT_NOT_APPROVED.
 * When an approved DISCOUNT request exists, the payment succeeds and
 * the discount is applied correctly.
 */
describe('Payment Property Tests - Discount Approval Invariant', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let discountApprovalService: DiscountApprovalService;

  const createTestingModule = async (hasApprovedDiscount: boolean) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: BarcodeService,
          useValue: {
            generate: jest.fn().mockResolvedValue({
              barcodeData: 'BARCODE-DATA',
              barcodeImage: 'base64-barcode-image',
            }),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: OrderStateMachineService,
          useValue: {
            transition: jest.fn().mockResolvedValue(undefined),
            getValidTransitions: jest.fn().mockReturnValue(['PAID']),
          },
        },
        {
          provide: DiscountApprovalService,
          useValue: {
            hasApprovedDiscountRequest: jest.fn().mockResolvedValue(hasApprovedDiscount),
            getApprovedDiscount: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    return module;
  };

  describe('Property 11: Discount requires approved ApprovalRequest', () => {
    /**
     * Without an approved DISCOUNT ApprovalRequest, applying a discount
     * SHALL be rejected with ERR_DISCOUNT_NOT_APPROVED.
     *
     * **Validates: Requirements 9.2**
     */
    it('rejects discount when no approved DISCOUNT ApprovalRequest exists', async () => {
      const module = await createTestingModule(false);
      service = module.get<PaymentService>(PaymentService);
      prismaService = module.get<PrismaService>(PrismaService);

      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 10, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate discount ratio (0, 1) to derive a valid discount amount
          fc.double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, discountRatio) => {
            const discountAmount = totalAmount * discountRatio;

            // Guard: ensure discount is positive and doesn't exceed total
            if (discountAmount <= 0 || discountAmount > totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-no-approval';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-DISC-0001',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test Patient' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // Act & Assert: should throw BadRequestException with ERR_DISCOUNT_NOT_APPROVED
            try {
              await service.processPayment(
                orderId,
                {
                  paymentMethod: PaymentMethod.CASH,
                  amountPaid: totalAmount,
                  discountAmount,
                  discountReason: 'Unapproved discount',
                },
                'user-uuid-1',
              );
              // If we reach here, the property is violated
              throw new Error('Expected payment to be rejected without approved discount');
            } catch (error) {
              expect(error).toBeInstanceOf(BadRequestException);
              const response = (error as BadRequestException).getResponse();
              if (typeof response === 'object' && response !== null) {
                expect((response as any).errorCode).toBe('ERR_DISCOUNT_NOT_APPROVED');
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * With an approved DISCOUNT ApprovalRequest, applying a discount
     * SHALL succeed and the payment amount SHALL reflect the discount.
     *
     * **Validates: Requirements 9.2, 9.3**
     */
    it('accepts discount when an approved DISCOUNT ApprovalRequest exists', async () => {
      const module = await createTestingModule(true);
      service = module.get<PaymentService>(PaymentService);
      prismaService = module.get<PrismaService>(PrismaService);

      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 10, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate discount ratio (0, 1) to derive a valid discount amount
          fc.double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, discountRatio) => {
            const discountAmount = totalAmount * discountRatio;

            // Guard: ensure discount is positive and doesn't exceed total
            if (discountAmount <= 0 || discountAmount > totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-with-approval';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-DISC-0002',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test Patient' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
            (prismaService.order.update as jest.Mock).mockImplementation((args: any) => {
              return Promise.resolve({
                ...mockOrder,
                ...args.data,
                patient: mockOrder.patient,
                orderDetails: mockOrder.orderDetails,
              });
            });

            // Act: should succeed
            const result = await service.processPayment(
              orderId,
              {
                paymentMethod: PaymentMethod.CASH,
                amountPaid: totalAmount,
                discountAmount,
                discountReason: 'Approved discount',
              },
              'user-uuid-1',
            );

            // Assert: payment succeeded
            expect(result).toBeDefined();
            expect(result.id).toBe(orderId);

            // Assert: amountPaid reflects discount (totalAmount - discountAmount)
            const expectedPayable = totalDecimal.minus(new Decimal(discountAmount));
            const actualAmountPaid = new Decimal(result.amountPaid!.toString());
            expect(actualAmountPaid.equals(expectedPayable)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * The discount approval check is per-order: different order IDs with
     * discounts are each independently validated for approval existence.
     *
     * **Validates: Requirements 9.2**
     */
    it('checks approval per specific orderId for each discount payment', async () => {
      const module = await createTestingModule(false);
      service = module.get<PaymentService>(PaymentService);
      prismaService = module.get<PrismaService>(PrismaService);
      discountApprovalService = module.get<DiscountApprovalService>(DiscountApprovalService);

      await fc.assert(
        fc.asyncProperty(
          // Generate random order IDs
          fc.uuid(),
          // Generate totalAmount
          fc.double({ min: 10, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate discount ratio
          fc.double({ min: 0.01, max: 0.5, noNaN: true, noDefaultInfinity: true }),
          async (orderId, totalAmount, discountRatio) => {
            const discountAmount = totalAmount * discountRatio;
            if (discountAmount <= 0 || discountAmount > totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);

            const mockOrder = {
              id: orderId,
              orderNumber: `LAB-DISC-${orderId.slice(0, 4)}`,
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test Patient' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // Act & Assert: service checks approval for THIS specific orderId
            await expect(
              service.processPayment(
                orderId,
                {
                  paymentMethod: PaymentMethod.CASH,
                  amountPaid: totalAmount,
                  discountAmount,
                  discountReason: 'Discount for specific order',
                },
                'user-uuid-1',
              ),
            ).rejects.toThrow(BadRequestException);

            // Verify hasApprovedDiscountRequest was called with the correct orderId
            expect(
              discountApprovalService.hasApprovedDiscountRequest,
            ).toHaveBeenCalledWith(orderId);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
