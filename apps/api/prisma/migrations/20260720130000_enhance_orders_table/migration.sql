-- Enhance Orders Table Migration
-- Adds OrderPriority enum, priority column, reportVersion, depositAmount, receiptNumber, barcodeText
-- Requirements: 17.1, 11.4, 8.3, 8.5, 18.1

-- Create OrderPriority enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderPriority') THEN
    CREATE TYPE "OrderPriority" AS ENUM ('ROUTINE', 'URGENT', 'CITO');
  END IF;
END
$$;

-- Add priority column (nullable, defaults to ROUTINE)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "priority" "OrderPriority" DEFAULT 'ROUTINE';

-- Add reportVersion column (non-null, defaults to 1)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "reportVersion" INTEGER NOT NULL DEFAULT 1;

-- Add depositAmount column (nullable, Decimal(12,2))
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(12, 2);

-- Add receiptNumber column (nullable, unique, VarChar(30))
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "receiptNumber" VARCHAR(30);

-- Add barcodeText column (nullable, VarChar(100))
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "barcodeText" VARCHAR(100);

-- Add unique constraint on receiptNumber (partial index to allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "orders_receiptNumber_key" ON "orders" ("receiptNumber") WHERE "receiptNumber" IS NOT NULL;
