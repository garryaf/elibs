-- AlterTable: Add effectiveFrom and effectiveTo to tariffs
ALTER TABLE "tariffs" ADD COLUMN "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tariffs" ADD COLUMN "effectiveTo" TIMESTAMP(3);

-- Backfill existing records: set effectiveFrom to createdAt
UPDATE "tariffs" SET "effectiveFrom" = "createdAt";

-- Drop old unique constraint and add new one including effectiveFrom
ALTER TABLE "tariffs" DROP CONSTRAINT IF EXISTS "tariffs_testId_clinicId_insuranceId_key";
CREATE UNIQUE INDEX "tariffs_testId_clinicId_insuranceId_effectiveFrom_key" ON "tariffs"("testId", "clinicId", "insuranceId", "effectiveFrom");
