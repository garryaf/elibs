-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'PAID');

-- CreateTable
CREATE TABLE "order_insurances" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "insuranceId" UUID NOT NULL,
    "coverageType" "CoverageType" NOT NULL DEFAULT 'PRIMARY',
    "claimReference" VARCHAR(50),
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "coveredAmount" DECIMAL(12,2),
    "copayAmount" DECIMAL(12,2),
    "memberNumber" VARCHAR(50),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_insurances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_insurances_orderId_idx" ON "order_insurances"("orderId");

-- CreateIndex
CREATE INDEX "order_insurances_claimStatus_idx" ON "order_insurances"("claimStatus");

-- CreateIndex
CREATE INDEX "order_insurances_insuranceId_claimStatus_idx" ON "order_insurances"("insuranceId", "claimStatus");

-- CreateIndex
CREATE UNIQUE INDEX "order_insurances_orderId_coverageType_key" ON "order_insurances"("orderId", "coverageType");

-- AddForeignKey
ALTER TABLE "order_insurances" ADD CONSTRAINT "order_insurances_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_insurances" ADD CONSTRAINT "order_insurances_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "insurances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
