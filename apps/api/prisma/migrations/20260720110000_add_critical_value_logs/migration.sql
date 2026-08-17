-- CreateEnum: CriticalValueStatus
-- Status lifecycle for critical value notifications: PENDING -> NOTIFIED -> ACKNOWLEDGED or ESCALATED
CREATE TYPE "CriticalValueStatus" AS ENUM ('PENDING', 'NOTIFIED', 'ACKNOWLEDGED', 'ESCALATED');

-- CreateTable: critical_value_logs
-- Tracks critical laboratory results requiring immediate clinician notification (Requirement 3.1, 3.5)
CREATE TABLE "critical_value_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "orderDetailId" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "resultValue" TEXT NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationStatus" "CriticalValueStatus" NOT NULL DEFAULT 'PENDING',
    "notifiedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" UUID,
    "acknowledgmentNotes" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalationMethod" VARCHAR(20),
    "clinicianId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "critical_value_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: orderId for fast lookup by order
CREATE INDEX "critical_value_logs_orderId_idx" ON "critical_value_logs"("orderId");

-- CreateIndex: notificationStatus for filtering active/pending alerts
CREATE INDEX "critical_value_logs_notificationStatus_idx" ON "critical_value_logs"("notificationStatus");

-- CreateIndex: patientId for patient-level critical value history
CREATE INDEX "critical_value_logs_patientId_idx" ON "critical_value_logs"("patientId");
