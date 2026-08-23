-- CreateEnum
CREATE TYPE "AgeUnit" AS ENUM ('YEARS', 'MONTHS', 'DAYS');

-- AlterTable: Add ageUnit to reference_values with default YEARS
ALTER TABLE "reference_values" ADD COLUMN "ageUnit" "AgeUnit" NOT NULL DEFAULT 'YEARS';

-- Drop old unique constraint and create new one including ageUnit
DROP INDEX IF EXISTS "reference_values_testId_gender_minAge_maxAge_key";
CREATE UNIQUE INDEX "reference_values_testId_gender_ageUnit_minAge_maxAge_key" ON "reference_values"("testId", "gender", "ageUnit", "minAge", "maxAge");

-- CreateTable: QualitativeReferenceValue
CREATE TABLE "qualitative_reference_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "testId" UUID NOT NULL,
    "optionValue" TEXT NOT NULL,
    "flag" "Flag" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualitative_reference_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qualitative_reference_values_testId_optionValue_key" ON "qualitative_reference_values"("testId", "optionValue");

-- AddForeignKey
ALTER TABLE "qualitative_reference_values" ADD CONSTRAINT "qualitative_reference_values_testId_fkey" FOREIGN KEY ("testId") REFERENCES "test_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
