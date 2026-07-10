-- CreateEnum
CREATE TYPE "BpjsVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "bpjs_order_details" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sepNumber" VARCHAR(19),
    "verificationStatus" "BpjsVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "referringFacilityCode" VARCHAR(20),
    "referringFacilityName" TEXT,
    "classLevel" INTEGER,
    "diagnosisCode" VARCHAR(10),
    "diagnosisName" TEXT,
    "procedureCode" VARCHAR(10),
    "guaranteeLetterNo" VARCHAR(50),
    "coB" DECIMAL(12,2),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bpjs_order_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bpjs_order_details_orderId_key" ON "bpjs_order_details"("orderId");

-- CreateIndex
CREATE INDEX "bpjs_order_details_sepNumber_idx" ON "bpjs_order_details"("sepNumber");

-- CreateIndex
CREATE INDEX "bpjs_order_details_verificationStatus_idx" ON "bpjs_order_details"("verificationStatus");

-- AddForeignKey
ALTER TABLE "bpjs_order_details" ADD CONSTRAINT "bpjs_order_details_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
