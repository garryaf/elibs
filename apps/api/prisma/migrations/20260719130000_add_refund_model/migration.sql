-- CreateEnum: RefundStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
    CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED');
  END IF;
END
$$;

-- CreateTable: refunds
CREATE TABLE IF NOT EXISTS "refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "refundMethod" "PaymentMethod",
  "processedAt" TIMESTAMP(3),
  "processedBy" UUID,
  "reference" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: refunds.orderId -> orders.id
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex: refunds.orderId
CREATE INDEX IF NOT EXISTS "refunds_orderId_idx" ON "refunds"("orderId");
