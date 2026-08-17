-- Add Specimen Tracking Tables
-- Requirements: 1.1, 1.3, 1.5, 1.6
-- Creates specimens, sample_collection_attempts, custody_handoffs tables
-- Extends SampleCondition enum with HEMOLYZED and OTHER values

-- Extend SampleCondition enum with missing values
ALTER TYPE "SampleCondition" ADD VALUE IF NOT EXISTS 'HEMOLYZED';
ALTER TYPE "SampleCondition" ADD VALUE IF NOT EXISTS 'OTHER';

-- CreateTable: specimens
CREATE TABLE "specimens" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sampleTypeCode" VARCHAR(20) NOT NULL,
    "barcode" VARCHAR(50) NOT NULL,
    "condition" "SampleCondition" NOT NULL DEFAULT 'ACCEPTABLE',
    "rejectionReason" VARCHAR(200),
    "transportTemperature" DECIMAL(4,1),
    "temperatureCompliant" BOOLEAN,
    "collectedAt" TIMESTAMP(3),
    "collectedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sample_collection_attempts
CREATE TABLE "sample_collection_attempts" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "specimenId" UUID NOT NULL,
    "sampleCondition" "SampleCondition" NOT NULL,
    "rejectionReason" VARCHAR(200),
    "collectedBy" UUID NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_collection_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: custody_handoffs
CREATE TABLE "custody_handoffs" (
    "id" UUID NOT NULL,
    "specimenId" UUID NOT NULL,
    "fromUserId" UUID NOT NULL,
    "toUserId" UUID NOT NULL,
    "handoffAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "custody_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique barcode on specimens
CREATE UNIQUE INDEX "specimens_barcode_key" ON "specimens"("barcode");

-- CreateIndex: orderId on specimens
CREATE INDEX "specimens_orderId_idx" ON "specimens"("orderId");

-- CreateIndex: barcode on specimens
CREATE INDEX "specimens_barcode_idx" ON "specimens"("barcode");

-- CreateIndex: specimenId on sample_collection_attempts
CREATE INDEX "sample_collection_attempts_specimenId_idx" ON "sample_collection_attempts"("specimenId");

-- CreateIndex: orderId on sample_collection_attempts
CREATE INDEX "sample_collection_attempts_orderId_idx" ON "sample_collection_attempts"("orderId");

-- CreateIndex: specimenId on custody_handoffs
CREATE INDEX "custody_handoffs_specimenId_idx" ON "custody_handoffs"("specimenId");

-- AddForeignKey: specimens.orderId -> orders.id
ALTER TABLE "specimens" ADD CONSTRAINT "specimens_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: sample_collection_attempts.specimenId -> specimens.id
ALTER TABLE "sample_collection_attempts" ADD CONSTRAINT "sample_collection_attempts_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "specimens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: custody_handoffs.specimenId -> specimens.id
ALTER TABLE "custody_handoffs" ADD CONSTRAINT "custody_handoffs_specimenId_fkey" FOREIGN KEY ("specimenId") REFERENCES "specimens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
