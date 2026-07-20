-- AlterTable: Add migrationBatchId to order_insurances for rollback tracking
ALTER TABLE "order_insurances" ADD COLUMN "migration_batch_id" VARCHAR(50);

-- AlterTable: Add migrationBatchId to patient_insurances for rollback tracking
ALTER TABLE "patient_insurances" ADD COLUMN "migration_batch_id" VARCHAR(50);

-- CreateIndex: Enforce priority uniqueness per patient
CREATE UNIQUE INDEX "patient_insurances_patientId_priority_key" ON "patient_insurances"("patientId", "priority");
