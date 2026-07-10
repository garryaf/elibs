-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('TARIFF_CHANGE', 'HIGH_VALUE_ORDER', 'MASTER_DATA_DELETE');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- DropIndex
DROP INDEX "tariffs_testId_clinicId_insuranceId_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "departmentId" UUID,
ADD COLUMN     "positionId" UUID;

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
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
    "id" UUID NOT NULL,
    "approvalRequestId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "approverId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_hierarchy" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "parentRole" "Role",
    "level" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "role_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_requestType_status_idx" ON "approval_requests"("requestType", "status");

-- CreateIndex
CREATE INDEX "approval_steps_approvalRequestId_idx" ON "approval_steps"("approvalRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "positions_code_key" ON "positions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_hierarchy_role_key" ON "role_hierarchy"("role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
