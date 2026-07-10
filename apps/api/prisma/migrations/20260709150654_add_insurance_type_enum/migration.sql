/*
  Warnings:

  - The `type` column on the `insurances` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "InsuranceType" AS ENUM ('BPJS', 'SWASTA', 'CORPORATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- DropIndex (idempotent)
DROP INDEX IF EXISTS "patients_name_trgm_idx";

-- AlterTable (add column only if it doesn't exist in new form)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurances' AND column_name = 'type' AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "insurances" DROP COLUMN "type";
    ALTER TABLE "insurances" ADD COLUMN "type" "InsuranceType";
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurances' AND column_name = 'type'
  ) THEN
    ALTER TABLE "insurances" ADD COLUMN "type" "InsuranceType";
  END IF;
END $$;
