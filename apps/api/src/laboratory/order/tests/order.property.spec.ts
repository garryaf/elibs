// Feature: laboratory-management, Property 5: Order Creation Invariants

import * as fc from 'fast-check';
import { OrderService } from '../order.service';
import { TariffResolverService } from '../tariff-resolver.service';
import { OrderStatus } from '@prisma/client';

/**
 * **Validates: Requirements FR4.2, FR4.6**
 */
describe('Order Creation Property Tests', () => {
  /**
   * Property 5: Order Creation Invariants
   *
   * *For any* valid order creation request with N test IDs (N ≥ 1), the created
   * order SHALL have status PENDING_PAYMENT, SHALL have exactly N OrderDetail
   * records, and each OrderDetail SHALL have status PENDING.
   *
   * **Validates: Requirements FR4.2, FR4.6**
   */
  describe('Property 5: Order Creation Invariants', () => {
    it('order status is PENDING_PAYMENT, exactly N OrderDetail records created, each with status PENDING', () => {
      // Generate 1–10 test IDs
      const testIdsArb = fc.array(fc.uuid(), { minLength: 1, maxLength: 10 });

      fc.assert(
        fc.asyncProperty(testIdsArb, async (testIds) => {
          // Track what gets passed to the transaction
          let capturedOrderData: any = null;
          let capturedOrderDetailsData: any[] = [];
          const createdOrderId = 'order-id-123';

          // Build mock pricing items based on testIds
          const pricingItems = testIds.map((testId) => ({
            testId,
            tariff: {
              basePrice: 100,
              discount: 0,
              finalPrice: 100,
              tariffId: `tariff-${testId}`,
              resolution: 'DEFAULT' as const,
            },
          }));

          const mockPricing = {
            items: pricingItems,
            subtotal: testIds.length * 100,
            totalDiscount: 0,
            totalAmount: testIds.length * 100,
          };

          // Mock TariffResolverService
          const mockTariffResolver = {
            resolveOrderTotal: jest.fn().mockResolvedValue(mockPricing),
          };

          // Mock PrismaService
          const mockPrisma = {
            patient: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'patient-1',
                name: 'Test Patient',
                deletedAt: null,
              }),
            },
            testMaster: {
              findMany: jest.fn().mockResolvedValue(
                testIds.map((id) => ({
                  id,
                  name: `Test-${id}`,
                  isActive: true,
                  deletedAt: null,
                })),
              ),
            },
            order: {
              count: jest.fn().mockResolvedValue(0),
              findUnique: jest.fn().mockImplementation(() => {
                return {
                  id: createdOrderId,
                  orderNumber: 'LAB-20250703-0001',
                  patientId: 'patient-1',
                  status: capturedOrderData?.status,
                  totalAmount: mockPricing.totalAmount,
                  orderDetails: capturedOrderDetailsData,
                  patient: { id: 'patient-1', name: 'Test Patient' },
                };
              }),
            },
            $transaction: jest.fn().mockImplementation(async (callback) => {
              const tx = {
                order: {
                  create: jest.fn().mockImplementation(({ data }) => {
                    capturedOrderData = data;
                    return { id: createdOrderId, ...data };
                  }),
                },
                orderDetail: {
                  createMany: jest.fn().mockImplementation(({ data }) => {
                    capturedOrderDetailsData = data;
                    return { count: data.length };
                  }),
                },
              };
              return callback(tx);
            }),
          };

          const service = new OrderService(
            mockPrisma as any,
            mockTariffResolver as any,
          );

          const dto = {
            patientId: 'patient-1',
            testIds,
          };

          await service.create(dto, 'user-1');

          // Invariant 1: Order status is PENDING_PAYMENT
          expect(capturedOrderData.status).toBe(OrderStatus.PENDING_PAYMENT);

          // Invariant 2: Exactly N OrderDetail records created
          expect(capturedOrderDetailsData).toHaveLength(testIds.length);

          // Invariant 3: Each OrderDetail has status PENDING
          for (const detail of capturedOrderDetailsData) {
            expect(detail.status).toBe('PENDING');
          }

          // Additional: Each OrderDetail maps to a unique test from the input
          const detailTestIds = capturedOrderDetailsData.map((d) => d.testId);
          for (const testId of testIds) {
            expect(detailTestIds).toContain(testId);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
