-- Enhance test_masters table
-- Add ResultType enum, resultType column, qualitativeOptions array, and deltaAlertThreshold
-- Requirements: 2.3, 2.4, 5.2

-- CreateEnum: ResultType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResultType') THEN
    CREATE TYPE "ResultType" AS ENUM ('NUMERIC', 'TEXT', 'QUALITATIVE');
  END IF;
END
$$;

-- AlterTable: test_masters
ALTER TABLE "test_masters" ADD COLUMN IF NOT EXISTS "resultType" "ResultType" NOT NULL DEFAULT 'NUMERIC';
ALTER TABLE "test_masters" ADD COLUMN IF NOT EXISTS "qualitativeOptions" TEXT[];
ALTER TABLE "test_masters" ADD COLUMN IF NOT EXISTS "deltaAlertThreshold" DECIMAL(5,2);
