/*
  Warnings:

  - The `type` column on the `insurances` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('BPJS', 'SWASTA', 'CORPORATE');

-- DropIndex
DROP INDEX "patients_name_trgm_idx";

-- AlterTable
ALTER TABLE "insurances" DROP COLUMN "type",
ADD COLUMN     "type" "InsuranceType";
