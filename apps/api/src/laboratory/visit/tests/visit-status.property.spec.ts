import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService } from '../../audit/audit.service';
import { InsuranceConsolidationService } from '../../../insurance/insurance-consolidation.service';

// Use string literals for enums to avoid Prisma client import issues in tests
const VisitStatus = {
  REGISTERED: 'REGISTERED' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT' as const,
  PAID: 'PAID' as const,
  SAMPLE_COLLECTED: 'SAMPLE_COLLECTED' as const,
  IN_ANALYSIS: 'IN_ANALYSIS' as const,
  VERIFIED: 'VERIFIED' as const,
  APPROVED: 'APPROVED' as const,
  NOTIFIED: 'NOTIFIED' as const,
  CANCELLED: 'CANCELLED' as const,
};

type VisitStatusType = (typeof VisitStatus)[keyof typeof VisitStatus];
type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

const ALL_VISIT_STATUSES: VisitStatusType[] = [
  VisitStatus.REGISTERED,
  VisitStatus.IN_PROGRESS,
  VisitStatus.COMPLETED,
  VisitStatus.CANCELLED,
];

const ALL_ORDER_STATUSES: OrderStatusType[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.SAMPLE_COLLECTED,
  OrderStatus.IN_ANALYSIS,
  OrderStatus.VERIFIED,
  OrderStatus.APPROVED,
  OrderStatus.NOTIFIED,
  OrderStatus.CANCELLED,
];

const ALLOWED_TRANSITIONS: Array<[VisitStatusType, VisitStatusType]> = [
  [VisitStatus.REGISTERED, VisitStatus.IN_PROGRESS],
  [VisitStatus.REGISTERED, VisitStatus.CANCELLED],
  [VisitStatus.IN_PROGRESS, VisitStatus.COMPLETED],
  [VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED],
];

function isAllowedTransition(
  current: VisitStatusType,
  target: VisitStatusType,
): boolean {
  return ALLOWED_TRANSITIONS.some(
    ([c, t]) => c === current && t === target,
  );
}

/**
 * **Validates: Requirements 3.7, 3.8**
 */
describe('Feature: visit-management, Property 5: Status Transition Enforcement', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      clinic: { findFirst: jest.fn() },
      insurance: { findFirst: jest.fn() },
      visit: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      order: { findMany: jest.fn() },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn().mockResolvedValue('VST-202507-0001'),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockConsolidationService = {
      validateVisitInsurance: jest.fn().mockResolvedValue(undefined),
      getDefaultInsurance: jest.fn().mockResolvedValue(null),
      getActiveInsurances: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: VisitNumberGeneratorService,
          useValue: mockVisitNumberGenerator,
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: InsuranceConsolidationService, useValue: mockConsolidationService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should allow transition iff (current, target) is in the allowed set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ALL_VISIT_STATUSES),
        fc.constantFrom(...ALL_VISIT_STATUSES),
        async (currentStatus, targetStatus) => {
          const visitId = 'visit-id-1';
          const allowed = isAllowedTransition(currentStatus, targetStatus);

          // Reset mocks between iterations to avoid leaking state
          jest.clearAllMocks();

          // We test transitions indirectly through:
          // - transitionToInProgress (→ IN_PROGRESS)
          // - cancel (→ CANCELLED)
          // - evaluateCompletion (→ COMPLETED)

          if (targetStatus === VisitStatus.IN_PROGRESS) {
            // Test via transitionToInProgress
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              status: currentStatus,
            });
            mockPrisma.visit.update.mockResolvedValue({
              id: visitId,
              status: VisitStatus.IN_PROGRESS,
            });

            if (allowed || currentStatus === VisitStatus.IN_PROGRESS) {
              // REGISTERED → IN_PROGRESS is allowed
              // IN_PROGRESS → IN_PROGRESS is idempotent (no-op)
              await expect(
                visitService.transitionToInProgress(visitId),
              ).resolves.not.toThrow();
            } else {
              // COMPLETED/CANCELLED → IN_PROGRESS is rejected
              await expect(
                visitService.transitionToInProgress(visitId),
              ).rejects.toThrow(BadRequestException);
            }
          } else if (targetStatus === VisitStatus.CANCELLED) {
            // Test via cancel
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              status: currentStatus,
              patient: { id: 'p1', name: 'Test' },
              doctor: null,
              clinic: null,
              insurance: null,
            });
            mockPrisma.order.findMany.mockResolvedValue([]);
            mockPrisma.visit.update.mockResolvedValue({
              id: visitId,
              status: VisitStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelReason: 'test',
              patient: { id: 'p1', name: 'Test' },
              doctor: null,
              clinic: null,
              insurance: null,
            });

            if (allowed) {
              const result = await visitService.cancel(
                visitId,
                { reason: 'test cancellation' },
                'user-1',
              );
              expect(result.status).toBe(VisitStatus.CANCELLED);
            } else {
              await expect(
                visitService.cancel(
                  visitId,
                  { reason: 'test cancellation' },
                  'user-1',
                ),
              ).rejects.toThrow(BadRequestException);
            }
          } else if (targetStatus === VisitStatus.COMPLETED) {
            // Test via evaluateCompletion
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              status: currentStatus,
            });
            // Provide terminal orders to trigger completion
            mockPrisma.order.findMany.mockResolvedValue([
              { status: OrderStatus.NOTIFIED },
            ]);
            mockPrisma.visit.update.mockResolvedValue({
              id: visitId,
              status: VisitStatus.COMPLETED,
            });

            if (allowed) {
              // IN_PROGRESS → COMPLETED should succeed
              await expect(
                visitService.evaluateCompletion(visitId),
              ).resolves.not.toThrow();
              expect(mockPrisma.visit.update).toHaveBeenCalledWith(
                expect.objectContaining({
                  data: { status: VisitStatus.COMPLETED },
                }),
              );
            } else {
              // evaluateCompletion early-returns for non-IN_PROGRESS visits
              await expect(
                visitService.evaluateCompletion(visitId),
              ).resolves.not.toThrow();
              // Should NOT update the visit
              expect(mockPrisma.visit.update).not.toHaveBeenCalled();
            }
          } else if (targetStatus === VisitStatus.REGISTERED) {
            // No transition targets REGISTERED — it's the initial state only
            // There's no service method to transition TO REGISTERED
            // So all (current, REGISTERED) pairs are disallowed
            expect(allowed).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 3.2, 3.3**
 */
describe('Feature: visit-management, Property 6: Order Addition Transitions to IN_PROGRESS (Idempotent)', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      clinic: { findFirst: jest.fn() },
      insurance: { findFirst: jest.fn() },
      visit: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      order: { findMany: jest.fn() },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn().mockResolvedValue('VST-202507-0001'),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: VisitNumberGeneratorService,
          useValue: mockVisitNumberGenerator,
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: InsuranceConsolidationService, useValue: { validateVisitInsurance: jest.fn().mockResolvedValue(undefined), getDefaultInsurance: jest.fn().mockResolvedValue(null), getActiveInsurances: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should result in IN_PROGRESS status for visits in REGISTERED or IN_PROGRESS', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(VisitStatus.REGISTERED, VisitStatus.IN_PROGRESS),
        fc.uuid(),
        async (initialStatus, visitId) => {
          // Reset mocks between iterations
          jest.clearAllMocks();

          mockPrisma.visit.findUnique.mockResolvedValue({
            id: visitId,
            status: initialStatus,
          });
          mockPrisma.visit.update.mockResolvedValue({
            id: visitId,
            status: VisitStatus.IN_PROGRESS,
          });

          // Call transitionToInProgress (simulating order addition)
          await visitService.transitionToInProgress(visitId);

          if (initialStatus === VisitStatus.REGISTERED) {
            // Should update the visit to IN_PROGRESS
            expect(mockPrisma.visit.update).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { id: visitId },
                data: { status: VisitStatus.IN_PROGRESS },
              }),
            );
          } else {
            // Already IN_PROGRESS — idempotent, no update call
            expect(mockPrisma.visit.update).not.toHaveBeenCalled();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 3.5, 3.6**
 */
describe('Feature: visit-management, Property 7: Cancellation Precondition', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      clinic: { findFirst: jest.fn() },
      insurance: { findFirst: jest.fn() },
      visit: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      order: { findMany: jest.fn() },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn().mockResolvedValue('VST-202507-0001'),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: VisitNumberGeneratorService,
          useValue: mockVisitNumberGenerator,
        },
        { provide: AuditService, useValue: mockAuditService },
        { provide: InsuranceConsolidationService, useValue: { validateVisitInsurance: jest.fn().mockResolvedValue(undefined), getDefaultInsurance: jest.fn().mockResolvedValue(null), getActiveInsurances: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should succeed iff visit has no orders or all orders are PENDING_PAYMENT', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(VisitStatus.REGISTERED, VisitStatus.IN_PROGRESS),
        fc.array(fc.constantFrom(...ALL_ORDER_STATUSES), {
          minLength: 0,
          maxLength: 10,
        }),
        fc.uuid(),
        async (visitStatus, orderStatuses, visitId) => {
          // Reset mocks between iterations
          jest.clearAllMocks();

          // Mock visit in a cancellable status
          mockPrisma.visit.findUnique.mockResolvedValue({
            id: visitId,
            status: visitStatus,
            patient: { id: 'p1', name: 'Test' },
            doctor: null,
            clinic: null,
            insurance: null,
          });

          // Mock orders with the generated statuses
          const orders = orderStatuses.map((status, idx) => ({
            id: `order-${idx}`,
            status,
            visitId,
          }));
          mockPrisma.order.findMany.mockResolvedValue(orders);

          // Mock the update for successful cancellation
          mockPrisma.visit.update.mockResolvedValue({
            id: visitId,
            status: VisitStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: 'test reason',
            patient: { id: 'p1', name: 'Test' },
            doctor: null,
            clinic: null,
            insurance: null,
          });

          // Determine if cancellation should succeed:
          // - No orders → success
          // - All orders are PENDING_PAYMENT → success
          // - Any order beyond PENDING_PAYMENT → failure
          const shouldSucceed =
            orders.length === 0 ||
            orders.every((o) => o.status === OrderStatus.PENDING_PAYMENT);

          if (shouldSucceed) {
            const result = await visitService.cancel(
              visitId,
              { reason: 'test reason' },
              'user-1',
            );
            expect(result.status).toBe(VisitStatus.CANCELLED);
          } else {
            await expect(
              visitService.cancel(
                visitId,
                { reason: 'test reason' },
                'user-1',
              ),
            ).rejects.toThrow(BadRequestException);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
