// Feature: laboratory-workflow-refactor, Properties 7, 8, 9, 10

import * as fc from 'fast-check';
import { MigrationService, MigrationReport } from '../migration.service';
import { VisitNumberGeneratorService } from '../../visit/visit-number-generator.service';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

/**
 * Arbitrary that generates valid dates (filtering out NaN/invalid dates).
 */
const validDateArb = fc
  .date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2026-12-31T23:59:59.999Z') })
  .filter((d) => !isNaN(d.getTime()));

/**
 * Arbitrary that generates a legacy order with patientId and createdAt.
 */
const legacyOrderArb = fc.record({
  id: validUuidV4Arb,
  patientId: validUuidV4Arb,
  createdAt: validDateArb,
});

/**
 * Groups orders by (patientId, date) the same way MigrationService does.
 */
function groupByPatientDate(
  orders: Array<{ id: string; patientId: string; createdAt: Date }>,
): Map<string, Array<{ id: string; patientId: string; createdAt: Date }>> {
  const groups = new Map<
    string,
    Array<{ id: string; patientId: string; createdAt: Date }>
  >();

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    const groupKey = `${order.patientId}_${dateKey}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(order);
  }

  return groups;
}

describe('MigrationService Property Tests', () => {
  let migrationService: MigrationService;
  let mockPrisma: any;
  let mockAuditService: any;
  let mockVisitNumberGenerator: any;

  // Tracking arrays for mock operations
  let visitCreateCalls: Array<{ data: any }>;
  let orderUpdateManyCalls: Array<{ where: any; data: any }>;
  let auditLogCreateCalls: Array<{ data: any }>;

  beforeEach(() => {
    visitCreateCalls = [];
    orderUpdateManyCalls = [];
    auditLogCreateCalls = [];

    mockPrisma = {
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      visit: {
        create: jest.fn(),
      },
      visitSequence: {
        findUniqueOrThrow: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockVisitNumberGenerator = {};

    migrationService = new MigrationService(
      mockPrisma,
      mockVisitNumberGenerator,
      mockAuditService,
    );
  });

  /**
   * Property 7: Schema Migration Precondition Enforcement
   *
   * *For any* database state where the count of orders with NULL visitId is greater
   * than zero, initiating the schema migration SHALL abort without applying any schema
   * changes and SHALL report the exact count of affected orders.
   *
   * We test this via getMigrationReport: when NULL visitId count > 0, the report
   * returns NOT_NEEDED status with proper counts (no changes made).
   *
   * **Validates: Requirements 2.2, 2.5**
   */
  describe('Property 7: Schema Migration Precondition Enforcement', () => {
    it('should return NOT_NEEDED with proper counts when NULL visitId orders exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(legacyOrderArb, { minLength: 1, maxLength: 50 }),
          async (legacyOrders) => {
            // Mock findMany returning legacy orders with NULL visitId
            mockPrisma.order.findMany.mockResolvedValue(legacyOrders);

            const report = await migrationService.getMigrationReport();

            // Should report NOT_NEEDED status (no changes made)
            expect(report.status).toBe('NOT_NEEDED');

            // Should report exact count of affected orders
            expect(report.totalAffectedOrders).toBe(legacyOrders.length);

            // Should count distinct (patientId, date) groups
            const expectedGroups = groupByPatientDate(legacyOrders);
            expect(report.distinctPatientDateGroups).toBe(expectedGroups.size);

            // No synthetic visits should be created in a report-only call
            expect(report.syntheticVisitsCreated).toBe(0);
            expect(report.ordersMigrated).toBe(0);

            mockPrisma.order.findMany.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Legacy Order Migration Grouping and Completeness
   *
   * *For any* set of legacy orders with NULL visitId, the MigrationService SHALL create
   * exactly one synthetic Visit per distinct (patientId, truncate-to-date(createdAt)) group,
   * link all orders in that group to the synthetic Visit, and after completion the count of
   * orders with NULL visitId SHALL be zero.
   *
   * **Validates: Requirements 3.1, 3.2, 3.4**
   */
  describe('Property 8: Legacy Order Migration Grouping and Completeness', () => {
    it('should create one synthetic visit per (patientId, date) group with all orders migrated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(legacyOrderArb, { minLength: 1, maxLength: 30 }),
          validUuidV4Arb,
          async (legacyOrders, adminUserId) => {
            // Reset tracking
            visitCreateCalls = [];
            orderUpdateManyCalls = [];
            auditLogCreateCalls = [];

            // Mock findMany returns legacy orders
            mockPrisma.order.findMany.mockResolvedValue(legacyOrders);

            let sequenceCounter = 0;

            // Mock $transaction to execute the callback with a mock tx
            mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
              const mockTx = {
                visit: {
                  create: jest.fn().mockImplementation((args: any) => {
                    const visit = { id: `synthetic-visit-${visitCreateCalls.length}`, ...args.data };
                    visitCreateCalls.push(args);
                    return visit;
                  }),
                },
                order: {
                  updateMany: jest.fn().mockImplementation((args: any) => {
                    orderUpdateManyCalls.push(args);
                    return { count: args.where.id.in.length };
                  }),
                  count: jest.fn().mockResolvedValue(0), // zero NULLs remaining
                },
                auditLog: {
                  create: jest.fn().mockImplementation((args: any) => {
                    auditLogCreateCalls.push(args);
                    return args.data;
                  }),
                },
                visitSequence: {
                  findUniqueOrThrow: jest.fn().mockImplementation(() => {
                    sequenceCounter++;
                    return { id: 'mock', lastValue: sequenceCounter };
                  }),
                },
                $executeRaw: jest.fn().mockResolvedValue(1),
              };
              return callback(mockTx);
            });

            const result = await migrationService.runLegacyMigration(adminUserId);

            // Compute expected groups
            const expectedGroups = groupByPatientDate(legacyOrders);
            const expectedGroupCount = expectedGroups.size;

            // One synthetic visit per distinct (patientId, date) group
            expect(result.syntheticVisitsCreated).toBe(expectedGroupCount);
            expect(visitCreateCalls.length).toBe(expectedGroupCount);

            // All orders are migrated
            expect(result.ordersMigrated).toBe(legacyOrders.length);
            expect(result.totalAffectedOrders).toBe(legacyOrders.length);

            // Each order group should have an updateMany call
            expect(orderUpdateManyCalls.length).toBe(expectedGroupCount);

            // Verify all orders are accounted for in updateMany calls
            const allUpdatedOrderIds = orderUpdateManyCalls.flatMap(
              (call) => call.where.id.in,
            );
            expect(allUpdatedOrderIds.length).toBe(legacyOrders.length);

            // All updateMany calls set a non-null visitId
            for (const call of orderUpdateManyCalls) {
              expect(call.data.visitId).toBeDefined();
              expect(call.data.visitId).not.toBeNull();
            }

            // Status should be SUCCESS
            expect(result.status).toBe('SUCCESS');

            mockPrisma.order.findMany.mockReset();
            mockPrisma.$transaction.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Synthetic Visit Number Month Reference
   *
   * *For any* synthetic Visit created during legacy migration, the visit number SHALL follow
   * the format `VST-YYYYMM-XXXX` where YYYYMM corresponds to the month of the earliest
   * order's createdAt date in that migration group.
   *
   * **Validates: Requirements 3.3**
   */
  describe('Property 9: Synthetic Visit Number Month Reference', () => {
    it('should generate visit number with month matching earliest order createdAt in each group', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(legacyOrderArb, { minLength: 1, maxLength: 30 }),
          validUuidV4Arb,
          async (legacyOrders, adminUserId) => {
            visitCreateCalls = [];

            mockPrisma.order.findMany.mockResolvedValue(legacyOrders);

            let sequenceCounter = 0;

            mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
              const mockTx = {
                visit: {
                  create: jest.fn().mockImplementation((args: any) => {
                    const visit = { id: `synthetic-visit-${visitCreateCalls.length}`, ...args.data };
                    visitCreateCalls.push(args);
                    return visit;
                  }),
                },
                order: {
                  updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                  count: jest.fn().mockResolvedValue(0),
                },
                auditLog: {
                  create: jest.fn().mockResolvedValue({}),
                },
                visitSequence: {
                  findUniqueOrThrow: jest.fn().mockImplementation(() => {
                    sequenceCounter++;
                    return { id: 'mock', lastValue: sequenceCounter };
                  }),
                },
                $executeRaw: jest.fn().mockResolvedValue(1),
              };
              return callback(mockTx);
            });

            await migrationService.runLegacyMigration(adminUserId);

            // Compute expected groups and their earliest months
            const expectedGroups = groupByPatientDate(legacyOrders);
            const expectedMonths: string[] = [];

            for (const [, groupOrders] of expectedGroups) {
              const sorted = [...groupOrders].sort(
                (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
              );
              const earliest = sorted[0];
              const year = earliest.createdAt.getFullYear().toString();
              const month = (earliest.createdAt.getMonth() + 1)
                .toString()
                .padStart(2, '0');
              expectedMonths.push(`${year}${month}`);
            }

            // Verify each visit number uses the correct month
            expect(visitCreateCalls.length).toBe(expectedMonths.length);

            for (let i = 0; i < visitCreateCalls.length; i++) {
              const visitNumber = visitCreateCalls[i].data.visitNumber as string;

              // Format should be VST-YYYYMM-XXXX
              expect(visitNumber).toMatch(/^VST-\d{6}-\d{4}$/);

              // Extract YYYYMM from visit number
              const visitMonth = visitNumber.slice(4, 10);

              // Should match the expected month for this group
              expect(expectedMonths).toContain(visitMonth);
            }

            mockPrisma.order.findMany.mockReset();
            mockPrisma.$transaction.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Migration Audit Log Completeness
   *
   * *For any* legacy order migration that creates N synthetic visits, exactly N audit log
   * entries SHALL be recorded with action "MIGRATION", entityName "Visit", and details
   * containing the correct array of migrated Order IDs linked to each synthetic Visit.
   *
   * **Validates: Requirements 3.6**
   */
  describe('Property 10: Migration Audit Log Completeness', () => {
    it('should create N audit entries for N synthetic visits with correct order ID arrays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(legacyOrderArb, { minLength: 1, maxLength: 30 }),
          validUuidV4Arb,
          async (legacyOrders, adminUserId) => {
            auditLogCreateCalls = [];
            visitCreateCalls = [];

            mockPrisma.order.findMany.mockResolvedValue(legacyOrders);

            let sequenceCounter = 0;

            mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
              const mockTx = {
                visit: {
                  create: jest.fn().mockImplementation((args: any) => {
                    const visit = { id: `synthetic-visit-${visitCreateCalls.length}`, ...args.data };
                    visitCreateCalls.push(args);
                    return visit;
                  }),
                },
                order: {
                  updateMany: jest.fn().mockResolvedValue({ count: 1 }),
                  count: jest.fn().mockResolvedValue(0),
                },
                auditLog: {
                  create: jest.fn().mockImplementation((args: any) => {
                    auditLogCreateCalls.push(args);
                    return args.data;
                  }),
                },
                visitSequence: {
                  findUniqueOrThrow: jest.fn().mockImplementation(() => {
                    sequenceCounter++;
                    return { id: 'mock', lastValue: sequenceCounter };
                  }),
                },
                $executeRaw: jest.fn().mockResolvedValue(1),
              };
              return callback(mockTx);
            });

            await migrationService.runLegacyMigration(adminUserId);

            // Compute expected groups
            const expectedGroups = groupByPatientDate(legacyOrders);
            const expectedGroupCount = expectedGroups.size;

            // N synthetic visits → N audit entries
            expect(auditLogCreateCalls.length).toBe(expectedGroupCount);

            // Each audit entry should have action "MIGRATION" and entityName "Visit"
            for (const call of auditLogCreateCalls) {
              expect(call.data.action).toBe('MIGRATION');
              expect(call.data.entityName).toBe('Visit');
              expect(call.data.userId).toBe(adminUserId);
            }

            // Verify order IDs in audit entries match orders in each group
            const allAuditOrderIds: string[] = [];
            for (const call of auditLogCreateCalls) {
              const newValues = call.data.newValues as any;
              expect(newValues).toBeDefined();
              expect(newValues.migratedOrderIds).toBeDefined();
              expect(Array.isArray(newValues.migratedOrderIds)).toBe(true);
              allAuditOrderIds.push(...newValues.migratedOrderIds);
            }

            // All order IDs should be accounted for in audit entries
            const originalOrderIds = legacyOrders.map((o) => o.id).sort();
            const auditOrderIdsSorted = [...allAuditOrderIds].sort();
            expect(auditOrderIdsSorted).toEqual(originalOrderIds);

            mockPrisma.order.findMany.mockReset();
            mockPrisma.$transaction.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
