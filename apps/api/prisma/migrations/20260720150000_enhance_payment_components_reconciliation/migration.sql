-- AlterTable: Add reconciliation tracking columns to payment_components
-- Requirements: 8.8 - Payment reconciliation tracking

ALTER TABLE "payment_components" ADD COLUMN "reconciliationStatus" VARCHAR(20);
ALTER TABLE "payment_components" ADD COLUMN "reconciledAt" TIMESTAMP(3);
ALTER TABLE "payment_components" ADD COLUMN "reconciliationRef" VARCHAR(100);
