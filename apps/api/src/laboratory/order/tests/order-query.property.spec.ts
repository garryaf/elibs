// Feature: laboratory-workflow-refactor, Properties 11, 13

import * as fc from 'fast-check';
import { OrderService } from '../order.service';
import { VisitService } from '../../visit/visit.service';
import { VisitStatus, OrderStatus } from '@prisma/client';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

/**
 * Property 11: API Response Includes Visit Information
 *
 * *For any* successfully created or queried Order that has a non-null visitId,
 * the API response payload SHALL include the associated Visit's `visitNumber`
 * and `status` fields.
 *
 * **Validates: Requirements 4.4, 4.5, 6.5**
 */
describe('Feature: laboratory-workflow-refactor, Property 11: API Response Includes Visit Information', () => {
  it('findById response SHALL include visit.visitNumber and visit.status for any order with non-null visitId', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUuidV4Arb,
        validUuidV4Arb,
        fc.constantFrom('VST-202601-0001', 'VST-202506-0042', 'VST-202412-1234'),
        fc.constantFrom(VisitStatus.REGISTERED, VisitStatus.IN_PROGRESS, VisitStatus.COMPLETED),
        async (orderId, visitId, visitNumber, visitStatus) => {
          const mockPrisma = {
            order: {
              findUnique: jest.fn().mockResolvedValue({
                id: orderId,
                orderNumber: 'LAB-20250101-0001',
                visitId,
                patientId: 'patient-1',
                status: OrderStatus.PENDING_PAYMENT,
                totalAmount: 100,
                patient: { id: 'patient-1', name: 'Test Patient' },
                orderDetails: [],
                visit: { visitNumber, status: visitStatus },
              }),
            },
          };

          const service = new OrderService(
            mockPrisma as any,
            {} as any,
            {} as any,
            {} as any,
          );

          const result = await service.findById(orderId);

          // Response SHALL include visit information
          expect(result).toHaveProperty('visit');
          expect(result.visit).toHaveProperty('visitNumber', visitNumber);
          expect(result.visit).toHaveProperty('status', visitStatus);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('findAll response SHALL include visit.visitNumber and visit.status for each order with non-null visitId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            orderId: validUuidV4Arb,
            visitId: validUuidV4Arb,
            visitNumber: fc.constantFrom('VST-202601-0001', 'VST-202506-0042', 'VST-202412-1234'),
            visitStatus: fc.constantFrom(VisitStatus.REGISTERED, VisitStatus.IN_PROGRESS, VisitStatus.COMPLETED),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        async (orders) => {
          const orderData = orders.map((o) => ({
            id: o.orderId,
            orderNumber: `LAB-20250101-0001`,
            visitId: o.visitId,
            patientId: 'patient-1',
            status: OrderStatus.PENDING_PAYMENT,
            totalAmount: 100,
            patient: { id: 'patient-1', name: 'Test Patient' },
            orderDetails: [],
            visit: { visitNumber: o.visitNumber, status: o.visitStatus },
          }));

          const mockPrisma = {
            order: {
              findMany: jest.fn().mockResolvedValue(orderData),
              count: jest.fn().mockResolvedValue(orderData.length),
            },
          };

          const service = new OrderService(
            mockPrisma as any,
            {} as any,
            {} as any,
            {} as any,
          );

          const result = await service.findAll({ page: '1', limit: '20' } as any);

          // Each order in response SHALL have visit information
          for (let i = 0; i < result.data.length; i++) {
            const order = result.data[i];
            expect(order).toHaveProperty('visit');
            expect(order.visit).toHaveProperty('visitNumber', orders[i].visitNumber);
            expect(order.visit).toHaveProperty('status', orders[i].visitStatus);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 13: Visit-Based Order Query Filter Correctness
 *
 * *For any* visit with N associated orders, querying `GET /api/v1/visits/:id/orders`
 * with pagination parameters (page, limit where 1 ≤ limit ≤ 100) SHALL return only
 * orders belonging to that visit, with `data.length ≤ limit`, `meta.total == N`,
 * and `meta.totalPages == ceil(N / limit)`.
 *
 * **Validates: Requirements 10.1, 10.2, 10.4**
 */
describe('Feature: laboratory-workflow-refactor, Property 13: Visit-Based Order Query Filter Correctness', () => {
  it('paginated query returns correct subset and meta for any visit with N orders', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUuidV4Arb,
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 5 }),
        async (visitId, totalOrders, limit, page) => {
          // Ensure page is valid for the given total and limit
          const totalPages = Math.ceil(totalOrders / limit);
          fc.pre(page <= totalPages);

          // Calculate expected data length for this page
          const skip = (page - 1) * limit;
          const expectedDataLength = Math.min(limit, totalOrders - skip);

          // Generate mock orders for this page
          const pageOrders = Array.from({ length: expectedDataLength }, (_, i) => ({
            id: `order-${skip + i}`,
            orderNumber: `LAB-20250101-${String(skip + i + 1).padStart(4, '0')}`,
            visitId,
            patientId: 'patient-1',
            status: OrderStatus.PENDING_PAYMENT,
            totalAmount: 100,
            orderDetails: [],
            patient: { id: 'patient-1', name: 'Test Patient', mrn: 'MRN-001' },
          }));

          const mockPrisma = {
            visit: {
              findUnique: jest.fn().mockResolvedValue({
                id: visitId,
                status: VisitStatus.IN_PROGRESS,
                patientId: 'patient-1',
              }),
            },
            order: {
              findMany: jest.fn().mockResolvedValue(pageOrders),
              count: jest.fn().mockResolvedValue(totalOrders),
            },
          };

          const service = new VisitService(
            mockPrisma as any,
            {} as any,
            {} as any,
          );

          const result = await service.findOrdersByVisit(visitId, {
            page: String(page),
            limit: String(limit),
          } as any);

          // Invariant 1: data.length <= limit
          expect(result.data.length).toBeLessThanOrEqual(limit);

          // Invariant 2: data.length equals expected for this page
          expect(result.data.length).toBe(expectedDataLength);

          // Invariant 3: meta.total == N (total orders for visit)
          expect(result.meta.total).toBe(totalOrders);

          // Invariant 4: meta.totalPages == ceil(N / limit)
          expect(result.meta.totalPages).toBe(totalPages);

          // Invariant 5: meta.page matches requested page
          expect(result.meta.page).toBe(page);

          // Invariant 6: meta.limit matches capped limit
          expect(result.meta.limit).toBe(Math.min(limit, 100));

          // Invariant 7: All returned orders belong to the queried visit
          for (const order of result.data) {
            expect(order.visitId).toBe(visitId);
          }

          // Verify prisma was called with correct filter
          expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({ visitId }),
              skip,
              take: Math.min(limit, 100),
            }),
          );
          expect(mockPrisma.order.count).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({ visitId }),
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('query with limit > 100 SHALL be capped to 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUuidV4Arb,
        fc.integer({ min: 101, max: 500 }),
        async (visitId, oversizedLimit) => {
          const mockPrisma = {
            visit: {
              findUnique: jest.fn().mockResolvedValue({
                id: visitId,
                status: VisitStatus.IN_PROGRESS,
                patientId: 'patient-1',
              }),
            },
            order: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            },
          };

          const service = new VisitService(
            mockPrisma as any,
            {} as any,
            {} as any,
          );

          const result = await service.findOrdersByVisit(visitId, {
            page: '1',
            limit: String(oversizedLimit),
          } as any);

          // Limit should be capped to 100
          expect(result.meta.limit).toBe(100);

          // Prisma take should be capped to 100
          expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              take: 100,
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
