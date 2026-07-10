import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit/visit-number-generator.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';

export interface MigrationReport {
  totalAffectedOrders: number;
  distinctPatientDateGroups: number;
  syntheticVisitsCreated: number;
  ordersMigrated: number;
  status: 'SUCCESS' | 'FAILED' | 'NOT_NEEDED';
}

@Injectable()
export class MigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visitNumberGenerator: VisitNumberGeneratorService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Returns a report of how many orders need migration, grouped by patient-date.
   * Does NOT perform any mutation.
   */
  async getMigrationReport(): Promise<MigrationReport> {
    // Use raw query because Prisma types now enforce non-null visitId,
    // but this service runs BEFORE the schema migration is applied
    const legacyOrders = await this.prisma.order.findMany({
      where: { visitId: null as unknown as string },
      select: { id: true, patientId: true, createdAt: true },
    });

    if (legacyOrders.length === 0) {
      return {
        totalAffectedOrders: 0,
        distinctPatientDateGroups: 0,
        syntheticVisitsCreated: 0,
        ordersMigrated: 0,
        status: 'NOT_NEEDED',
      };
    }

    const groups = this.groupOrdersByPatientDate(legacyOrders);

    return {
      totalAffectedOrders: legacyOrders.length,
      distinctPatientDateGroups: groups.size,
      syntheticVisitsCreated: 0,
      ordersMigrated: 0,
      status: 'NOT_NEEDED',
    };
  }

  /**
   * Identifies legacy orders with NULL visitId, creates synthetic visits,
   * and links orders. Runs within a single transaction.
   */
  async runLegacyMigration(userId: string): Promise<MigrationReport> {
    // Fetch legacy orders outside the transaction to determine scope
    // Use type cast because Prisma types enforce non-null visitId in schema,
    // but this service runs BEFORE the schema migration is applied
    const legacyOrders = await this.prisma.order.findMany({
      where: { visitId: null as unknown as string },
      select: { id: true, patientId: true, createdAt: true },
    });

    // Handle zero-rows case
    if (legacyOrders.length === 0) {
      return {
        totalAffectedOrders: 0,
        distinctPatientDateGroups: 0,
        syntheticVisitsCreated: 0,
        ordersMigrated: 0,
        status: 'NOT_NEEDED',
      };
    }

    const groups = this.groupOrdersByPatientDate(legacyOrders);

    // Log initial migration report audit entry
    await this.auditService.log(
      userId,
      'MIGRATION_REPORT',
      'Order',
      'system',
      null,
      {
        totalAffectedOrders: legacyOrders.length,
        distinctPatientDateGroups: groups.size,
      },
    );

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          let syntheticVisitsCreated = 0;
          let ordersMigrated = 0;

          for (const [, groupOrders] of groups) {
            // Use earliest order's createdAt for month reference
            const sortedOrders = [...groupOrders].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
            );
            const earliestOrder = sortedOrders[0];
            const patientId = earliestOrder.patientId;
            const registrationDate = earliestOrder.createdAt;

            // Generate visit number using raw SQL inside the transaction
            // to avoid nested SERIALIZABLE transaction conflicts
            const monthKey = this.getMonthKey(earliestOrder.createdAt);
            const visitNumber = await this.generateVisitNumberInTransaction(
              tx,
              monthKey,
            );

            // Create synthetic visit
            const syntheticVisit = await tx.visit.create({
              data: {
                visitNumber,
                status: 'COMPLETED',
                registrationDate,
                patientId,
                paymentMethod: 'CASH',
              },
            });

            // Update all orders in this group to reference the synthetic visit
            const orderIds = groupOrders.map((o) => o.id);
            await tx.order.updateMany({
              where: { id: { in: orderIds } },
              data: { visitId: syntheticVisit.id },
            });

            syntheticVisitsCreated++;
            ordersMigrated += orderIds.length;

            // Log audit entry for each synthetic visit created
            await tx.auditLog.create({
              data: {
                userId,
                action: 'MIGRATION',
                entityName: 'Visit',
                entityId: syntheticVisit.id,
                oldValues: Prisma.JsonNull,
                newValues: {
                  visitNumber: syntheticVisit.visitNumber,
                  patientId: syntheticVisit.patientId,
                  migratedOrderIds: orderIds,
                } as unknown as Prisma.InputJsonValue,
                ipAddress: null,
              },
            });
          }

          // Verify that zero orders remain with NULL visitId
          const remainingNullCount = await tx.order.count({
            where: { visitId: null as unknown as string },
          });

          if (remainingNullCount > 0) {
            throw new Error(
              `Migration verification failed: ${remainingNullCount} orders still have NULL visitId`,
            );
          }

          return {
            totalAffectedOrders: legacyOrders.length,
            distinctPatientDateGroups: groups.size,
            syntheticVisitsCreated,
            ordersMigrated,
            status: 'SUCCESS' as const,
          };
        },
        {
          timeout: 120000, // 2 minute timeout for large migrations
        },
      );

      return result;
    } catch (error) {
      // Transaction was automatically rolled back by Prisma
      if (error instanceof Error && error.message.includes('Migration verification failed')) {
        return {
          totalAffectedOrders: legacyOrders.length,
          distinctPatientDateGroups: groups.size,
          syntheticVisitsCreated: 0,
          ordersMigrated: 0,
          status: 'FAILED',
        };
      }

      throw new InternalServerErrorException({
        errorCode: 'ERR_INTERNAL',
        message: 'Legacy migration failed, all changes rolled back',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Groups orders by (patientId, truncated date of createdAt).
   */
  private groupOrdersByPatientDate(
    orders: Array<{ id: string; patientId: string; createdAt: Date }>,
  ): Map<string, Array<{ id: string; patientId: string; createdAt: Date }>> {
    const groups = new Map<
      string,
      Array<{ id: string; patientId: string; createdAt: Date }>
    >();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const groupKey = `${order.patientId}_${dateKey}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(order);
    }

    return groups;
  }

  /**
   * Extracts the YYYYMM month key from a date.
   */
  private getMonthKey(date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Generates a visit number inside an existing transaction using raw SQL.
   * This avoids nested SERIALIZABLE transaction conflicts with VisitNumberGeneratorService.
   */
  private async generateVisitNumberInTransaction(
    tx: Prisma.TransactionClient,
    monthKey: string,
  ): Promise<string> {
    // UPSERT: insert with lastValue=1 or increment existing lastValue atomically
    await tx.$executeRaw`
      INSERT INTO visit_sequences (id, "lastValue")
      VALUES (${monthKey}, 1)
      ON CONFLICT (id) DO UPDATE
      SET "lastValue" = visit_sequences."lastValue" + 1
    `;

    const sequence = await tx.visitSequence.findUniqueOrThrow({
      where: { id: monthKey },
    });

    if (sequence.lastValue > 9999) {
      throw new Error(
        `Monthly visit number capacity (9999) exceeded for month ${monthKey}`,
      );
    }

    const year = monthKey.slice(0, 4);
    const month = monthKey.slice(4, 6);
    return VisitNumberGeneratorService.format(year, month, sequence.lastValue);
  }
}
