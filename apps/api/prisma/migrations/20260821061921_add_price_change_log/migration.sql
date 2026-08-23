-- CreateTable
CREATE TABLE "price_change_logs" (
    "id" UUID NOT NULL,
    "entityType" VARCHAR(30) NOT NULL,
    "entityId" UUID NOT NULL,
    "testId" UUID,
    "testCode" VARCHAR(30),
    "testName" TEXT,
    "previousPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "previousDiscount" DECIMAL(5,2),
    "newDiscount" DECIMAL(5,2),
    "changeType" VARCHAR(30) NOT NULL,
    "changeReason" TEXT,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "approvalId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_change_logs_testId_idx" ON "price_change_logs"("testId");

-- CreateIndex
CREATE INDEX "price_change_logs_entityType_entityId_idx" ON "price_change_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "price_change_logs_changedBy_idx" ON "price_change_logs"("changedBy");

-- CreateIndex
CREATE INDEX "price_change_logs_createdAt_idx" ON "price_change_logs"("createdAt");
