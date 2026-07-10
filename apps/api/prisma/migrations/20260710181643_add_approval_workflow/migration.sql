-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('TARIFF_CHANGE', 'HIGH_VALUE_ORDER', 'MASTER_DATA_DELETE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestType" "ApprovalType" NOT NULL,
    "requesterId" UUID NOT NULL,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 1,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "approvalRequestId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "approverId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_requestType_status_idx" ON "approval_requests"("requestType", "status");

-- CreateIndex
CREATE INDEX "approval_steps_approvalRequestId_idx" ON "approval_steps"("approvalRequestId");

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
