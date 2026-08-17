// Feature: lis-gap-remediation, Property 10: Payment validation invariant

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
 * **Validates: Requirements 8.1**
 *
 * Property 10: Payment validation invariant
 *
 * For any single payment request, the system SHALL reject payments where
 * amountPaid < totalAmount (after discount), and for cash payments SHALL
 * calculate change as amountPaid - totalAmount when amountPaid > totalAmount.
 */
describe('Payment Property Tests - Payment Validation Invariant', () => {
  let service: PaymentService;
  let prismaService: PrismaService;

  beforeEach(async () => {
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
            hasApprovedDiscountRequest: jest.fn().mockResolvedValue(true),
            getApprovedDiscount: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 10: Payment validation invariant', () => {
    /**
     * Under-payment rejection: amountPaid < totalAmount (no discount)
     * Payment SHALL be rejected with ERR_UNDERPAYMENT error.
     *
     * **Validates: Requirements 8.1**
     */
    it('rejects under-payments where amountPaid < totalAmount', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 1, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate a ratio < 1 to derive an insufficient amountPaid
          fc.double({ min: 0.001, max: 0.999, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, ratio) => {
            const amountPaid = totalAmount * ratio;

            // Ensure amountPaid is strictly less than totalAmount (floating point guard)
            if (amountPaid >= totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-underpay';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-PAY-0001',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test Patient' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // Act & Assert: should throw BadRequestException
            await expect(
              service.processPayment(
                orderId,
                {
                  paymentMethod: PaymentMethod.CASH,
                  amountPaid,
                },
                'user-uuid-1',
              ),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Sufficient payment acceptance: amountPaid >= totalAmount (no discount)
     * Payment SHALL succeed when amount paid meets or exceeds total.
     *
     * **Validates: Requirements 8.1**
     */
    it('accepts payments where amountPaid >= totalAmount', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate a multiplier >= 1 to derive a sufficient amountPaid
          fc.double({ min: 1.0, max: 5.0, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, multiplier) => {
            const amountPaid = totalAmount * multiplier;

            // Skip edge case where floating point produces amountPaid < totalAmount
            if (amountPaid < totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-sufficient';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-PAY-0002',
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

            // Act: should not throw
            const result = await service.processPayment(
              orderId,
              {
                paymentMethod: PaymentMethod.CASH,
                amountPaid,
              },
              'user-uuid-1',
            );

            // Assert: result exists (payment succeeded)
            expect(result).toBeDefined();
            expect(result.id).toBe(orderId);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Cash change calculation: for CASH payments where amountPaid > totalAmount,
     * change SHALL equal amountPaid - totalAmount.
     *
     * **Validates: Requirements 8.1**
     */
    it('calculates correct change for cash overpayments', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate extra amount > 0 for overpayment
          fc.double({ min: 0.01, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, extraAmount) => {
            const amountPaid = totalAmount + extraAmount;

            // Guard: ensure amountPaid is strictly greater than totalAmount
            if (amountPaid <= totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-change';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-PAY-0003',
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

            // Act
            const result = await service.processPayment(
              orderId,
              {
                paymentMethod: PaymentMethod.CASH,
                amountPaid,
              },
              'user-uuid-1',
            );

            // Assert: change = amountPaid - totalAmount
            const expectedChange = new Decimal(amountPaid).minus(totalDecimal);
            const actualChange = new Decimal(result.change);
            // Use tolerance for floating point comparison
            const diff = expectedChange.minus(actualChange).abs();
            expect(diff.lte(new Decimal('0.01'))).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Non-cash overpayment: for non-CASH payments (e.g., TRANSFER, EDC),
     * change SHALL be 0 even when amountPaid > totalAmount.
     *
     * **Validates: Requirements 8.1**
     */
    it('does not calculate change for non-cash overpayments', async () => {
      const nonCashMethods = [
        PaymentMethod.TRANSFER,
        PaymentMethod.EDC,
        PaymentMethod.INSURANCE,
        PaymentMethod.BPJS,
      ];

      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate extra amount > 0 for overpayment
          fc.double({ min: 0.01, max: 100_000, noNaN: true, noDefaultInfinity: true }),
          // Pick a non-cash payment method
          fc.constantFrom(...nonCashMethods),
          async (totalAmount, extraAmount, paymentMethod) => {
            const amountPaid = totalAmount + extraAmount;

            if (amountPaid <= totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-noncash';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-PAY-0004',
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

            // Act
            const result = await service.processPayment(
              orderId,
              {
                paymentMethod,
                amountPaid,
              },
              'user-uuid-1',
            );

            // Assert: change should be 0 for non-cash
            expect(result.change).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Under-payment with discount: amountPaid < (totalAmount - discount)
     * Payment SHALL be rejected even when discount is applied.
     *
     * **Validates: Requirements 8.1**
     */
    it('rejects under-payments even with discount applied', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive amounts
          fc.double({ min: 10, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate discount ratio (0, 0.5] to keep discount below total
          fc.double({ min: 0.01, max: 0.5, noNaN: true, noDefaultInfinity: true }),
          // Generate underpay ratio (0, 1) to make amountPaid < payable
          fc.double({ min: 0.001, max: 0.999, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, discountRatio, underpayRatio) => {
            const discountAmount = totalAmount * discountRatio;
            const payableAmount = totalAmount - discountAmount;
            const amountPaid = payableAmount * underpayRatio;

            // Guards for floating point edge cases
            if (discountAmount <= 0 || discountAmount > totalAmount) return;
            if (payableAmount <= 0) return;
            if (amountPaid >= payableAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-discount-underpay';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-PAY-0005',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test Patient' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // Act & Assert: should throw BadRequestException
            await expect(
              service.processPayment(
                orderId,
                {
                  paymentMethod: PaymentMethod.CASH,
                  amountPaid,
                  discountAmount,
                  discountReason: 'Test discount',
                },
                'user-uuid-1',
              ),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
