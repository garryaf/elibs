-- AlterTable: Add per-parameter verification and rerun tracking columns to order_details
-- Requirements: 4.1 (per-parameter verification), 4.2 (rejection with reason), 4.6 (rerun tracking), 5.4 (delta check index)

-- Verification columns
ALTER TABLE "order_details" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "order_details" ADD COLUMN "verifiedBy" UUID;
ALTER TABLE "order_details" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "order_details" ADD COLUMN "rejectedBy" UUID;
ALTER TABLE "order_details" ADD COLUMN "rejectionReason" TEXT;

-- Rerun tracking columns
ALTER TABLE "order_details" ADD COLUMN "rerunCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "order_details" ADD COLUMN "rerunReason" VARCHAR(50);
ALTER TABLE "order_details" ADD COLUMN "previousResults" JSONB;

-- CreateIndex: Composite index for delta check optimization (testId + resultEnteredAt DESC)
CREATE INDEX "order_details_testId_resultEnteredAt_idx" ON "order_details"("testId", "resultEnteredAt" DESC);
