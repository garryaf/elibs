import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface MigrationReport {
  totalPatientRecords: number;
  totalOrderRecords: number;
  patientsMigrated: number;
  patientsSkipped: Array<{ patientId: string; reason: string }>;
  ordersMigrated: number;
  ordersSkipped: Array<{ orderId: string; reason: string }>;
  priorityConflictsResolved: number;
  batchId: string;
  executedAt: Date;
}

@Injectable()
export class InsuranceMigrationService {
  private readonly logger = new Logger(InsuranceMigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes forward migration: copies legacy FK values (Patient.insuranceId, Order.insuranceId)
   * into their respective junction tables (PatientInsurance, OrderInsurance).
   *
   * - Generates a unique batchId to mark all created records for potential rollback
   * - Resolves duplicate priorities per patient (sequential assignment based on createdAt)
   * - Skips records with invalid FK references or existing junction records
   * - Executes within a database transaction (full rollback on any error)
   *
   * @returns MigrationReport with complete counts and skip reasons
   */
  async migrateForward(): Promise<MigrationReport> {
    const batchId = `insurance-migration-${Date.now()}`;
    const executedAt = new Date();

    this.logger.log(`Starting forward migration with batchId: ${batchId}`);

    const report = await this.prisma.$transaction(async (tx) => {
      const patientsSkipped: Array<{ patientId: string; reason: string }> = [];
      const ordersSkipped: Array<{ orderId: string; reason: string }> = [];
      let patientsMigrated = 0;
      let ordersMigrated = 0;
      let priorityConflictsResolved = 0;

      // --- Step 1: Resolve duplicate priorities per patient ---
      // Find patients with duplicate priorities among active records
      const duplicatePriorityPatients = await tx.$queryRaw<
        Array<{ patient_id: string }>
      >`
        SELECT patient_id
        FROM patient_insurances
        WHERE is_active = true
        GROUP BY patient_id, priority
        HAVING COUNT(*) > 1
      `;

      for (const { patient_id: patientId } of duplicatePriorityPatients) {
        // Get all active records for this patient ordered by createdAt
        const records = await tx.patientInsurance.findMany({
          where: { patientId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });

        // Reassign sequential priorities based on createdAt
        for (let i = 0; i < records.length; i++) {
          const newPriority = i + 1;
          if (records[i].priority !== newPriority) {
            await tx.patientInsurance.update({
              where: { id: records[i].id },
              data: { priority: newPriority },
            });
            priorityConflictsResolved++;
          }
        }
      }

      // --- Step 2: Migrate Patient.insuranceId → PatientInsurance junction ---
      // Find patients with non-null insuranceId, not soft-deleted, no existing junction
      const patientsToMigrate = await tx.patient.findMany({
        where: {
          insuranceId: { not: null },
          deletedAt: null,
          patientInsurances: { none: {} },
        },
        select: { id: true, insuranceId: true },
      });

      const totalPatientRecords = patientsToMigrate.length;

      // Get all valid insurance IDs in one query for FK validation
      const validInsuranceIds = new Set(
        (await tx.insurance.findMany({ select: { id: true } })).map(
          (i) => i.id,
        ),
      );

      for (const patient of patientsToMigrate) {
        const insuranceId = patient.insuranceId!;

        // Validate FK reference
        if (!validInsuranceIds.has(insuranceId)) {
          patientsSkipped.push({
            patientId: patient.id,
            reason: 'FK_NOT_FOUND',
          });
          this.logger.warn(
            `Skipping patient ${patient.id}: insuranceId ${insuranceId} does not reference a valid Insurance record`,
          );
          continue;
        }

        // Create PatientInsurance junction record with priority=1
        await tx.patientInsurance.create({
          data: {
            patientId: patient.id,
            insuranceId,
            priority: 1,
            isActive: true,
            migrationBatchId: batchId,
          },
        });
        patientsMigrated++;
      }

      // --- Step 3: Migrate Order.insuranceId → OrderInsurance junction ---
      // Find orders with non-null insuranceId and no existing PRIMARY OrderInsurance
      const ordersToMigrate = await tx.order.findMany({
        where: {
          insuranceId: { not: null },
          orderInsurances: {
            none: { coverageType: 'PRIMARY' },
          },
        },
        select: { id: true, insuranceId: true },
      });

      const totalOrderRecords = ordersToMigrate.length;

      for (const order of ordersToMigrate) {
        const insuranceId = order.insuranceId!;

        // Validate FK reference
        if (!validInsuranceIds.has(insuranceId)) {
          ordersSkipped.push({ orderId: order.id, reason: 'FK_NOT_FOUND' });
          this.logger.warn(
            `Skipping order ${order.id}: insuranceId ${insuranceId} does not reference a valid Insurance record`,
          );
          continue;
        }

        // Create OrderInsurance junction record with PRIMARY coverage
        await tx.orderInsurance.create({
          data: {
            orderId: order.id,
            insuranceId,
            coverageType: 'PRIMARY',
            claimStatus: 'PENDING',
            migrationBatchId: batchId,
          },
        });
        ordersMigrated++;
      }

      return {
        totalPatientRecords,
        totalOrderRecords,
        patientsMigrated,
        patientsSkipped,
        ordersMigrated,
        ordersSkipped,
        priorityConflictsResolved,
        batchId,
        executedAt,
      };
    });

    this.logger.log(
      `Migration complete: ${report.patientsMigrated} patients migrated, ${report.ordersMigrated} orders migrated, ${report.priorityConflictsResolved} priority conflicts resolved`,
    );

    return report;
  }

  /**
   * Rolls back a previous migration by removing all records created with the given batchId.
   *
   * - Deletes PatientInsurance records where migrationBatchId = batchId
   * - Deletes OrderInsurance records where migrationBatchId = batchId
   * - Executes within a database transaction
   *
   * @param batchId - The migration batch identifier to roll back
   */
  async rollback(batchId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.orderInsurance.deleteMany({
        where: { migrationBatchId: batchId },
      });
      await tx.patientInsurance.deleteMany({
        where: { migrationBatchId: batchId },
      });
    });
    this.logger.log(`Migration batch ${batchId} rolled back successfully`);
  }

  /**
   * Generates a report for a previously executed migration batch.
   *
   * @param batchId - The migration batch identifier to report on
   * @returns MigrationReport with counts of records created by the batch
   */
  async generateReport(batchId: string): Promise<MigrationReport> {
    const patientRecords = await this.prisma.patientInsurance.findMany({
      where: { migrationBatchId: batchId },
    });

    const orderRecords = await this.prisma.orderInsurance.findMany({
      where: { migrationBatchId: batchId },
    });

    return {
      totalPatientRecords: patientRecords.length,
      totalOrderRecords: orderRecords.length,
      patientsMigrated: patientRecords.length,
      patientsSkipped: [], // Historical skip info not available post-migration
      ordersMigrated: orderRecords.length,
      ordersSkipped: [], // Historical skip info not available post-migration
      priorityConflictsResolved: 0, // Historical conflict info not available post-migration
      batchId,
      executedAt: patientRecords[0]?.createdAt ?? orderRecords[0]?.createdAt ?? new Date(),
    };
  }
}
