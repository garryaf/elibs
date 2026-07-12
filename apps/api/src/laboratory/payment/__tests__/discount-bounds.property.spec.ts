// Feature: sprint-next1-critical-security, Property 7: Discount bounds and arithmetic

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentService } from '../payment.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { BarcodeService } from '../../../common/barcode';
import { AuditService } from '../../audit/audit.service';
import { OrderStatus, PaymentMethod } from '@prisma/client';

/**
 * **Validates: Requirements 5.3, 5.4, 5.6**
 *
 * Property 7: Discount bounds and arithmetic
 *
 * For any order with a given `totalAmount` and any `discountAmount` value:
 * - If `discountAmount > 0` AND `discountAmount <= totalAmount`, then the payment
 *   SHALL succeed and `amountPaid` SHALL equal `totalAmount - discountAmount`.
 * - If `discountAmount <= 0` OR `discountAmount > totalAmount`, then the payment
 *   SHALL be rejected with a 400 Bad Request error.
 */
describe('Payment Property Tests', () => {
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
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Property 7: Discount bounds and arithmetic', () => {
    /**
     * Valid discount: 0 < discountAmount <= totalAmount
     * Payment succeeds and amountPaid === totalAmount - discountAmount
     *
     * **Validates: Requirements 5.3, 5.6**
     */
    it('valid discount (0 < discount <= total) results in amountPaid = total - discount', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive finite doubles
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate a ratio in (0, 1] to derive a valid discountAmount
          fc.double({ min: 0.001, max: 1.0, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, ratio) => {
            // Derive discountAmount that satisfies 0 < discount <= total
            const discountAmount = totalAmount * ratio;

            // Skip edge case where floating point makes discount 0 or > total
            if (discountAmount <= 0 || discountAmount > totalAmount) return;

            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-test';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-TEST-0001',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test' },
              orderDetails: [],
            };

            // Reset and setup mocks
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
                amountPaid: totalAmount,
                discountAmount,
                discountReason: 'Test discount',
              },
              'user-uuid-1',
            );

            // Assert: amountPaid === totalAmount - discountAmount
            const expectedPaid = totalDecimal.minus(new Decimal(discountAmount));
            const actualPaid = new Decimal(result.amountPaid.toString());
            expect(actualPaid.equals(expectedPaid)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Invalid discount: discountAmount <= 0
     * Payment is rejected with 400 Bad Request
     *
     * **Validates: Requirements 5.3, 5.4**
     */
    it('discount <= 0 is rejected with BadRequestException', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive finite doubles
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate non-positive discount amounts (zero or negative)
          fc.double({ min: -1_000_000, max: 0, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, discountAmount) => {
            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-test';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-TEST-0001',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // Act & Assert: should throw 400
            await expect(
              service.processPayment(
                orderId,
                {
                  paymentMethod: PaymentMethod.CASH,
                  amountPaid: totalAmount,
                  discountAmount,
                  discountReason: 'Invalid discount',
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
     * Invalid discount: discountAmount > totalAmount
     * Payment is rejected with 400 Bad Request
     *
     * **Validates: Requirements 5.4**
     */
    it('discount > totalAmount is rejected with BadRequestException', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate totalAmount: positive finite doubles
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          // Generate a multiplier > 1 to make discount exceed total
          fc.double({ min: 1.001, max: 10, noNaN: true, noDefaultInfinity: true }),
          async (totalAmount, multiplier) => {
            const discountAmount = totalAmount * multiplier;
            const totalDecimal = new Decimal(totalAmount);
            const orderId = 'order-uuid-test';

            const mockOrder = {
              id: orderId,
              orderNumber: 'LAB-TEST-0001',
              status: OrderStatus.PENDING_PAYMENT,
              totalAmount: totalDecimal,
              patient: { id: 'patient-1', name: 'Test' },
              orderDetails: [],
            };

            (prismaService.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

            // Act & Assert: should throw 400
            await expect(
              service.processPayment(
                orderId,
                {
                  paymentMethod: PaymentMethod.CASH,
                  amountPaid: totalAmount,
                  discountAmount,
                  discountReason: 'Excessive discount',
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
