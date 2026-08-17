/*
  Warnings:

  - The `status` column on the `equipments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `type` column on the `insurances` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[receiptNumber]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "price_list_items" DROP CONSTRAINT "price_list_items_testId_fkey";

-- AlterTable
ALTER TABLE "critical_value_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "equipments" DROP COLUMN "status",
ADD COLUMN     "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "insurances" DROP COLUMN "type",
ADD COLUMN     "type" "InsuranceType";

-- AlterTable
ALTER TABLE "methods" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "order_addendums" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "qc_results" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "qc_runs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "qc_samples" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "refunds" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_entityName_entityId_idx" ON "audit_logs"("entityName", "entityId");

-- CreateIndex (already exists from migration 20260720130000)
DROP INDEX IF EXISTS "orders_receiptNumber_key";
CREATE UNIQUE INDEX "orders_receiptNumber_key" ON "orders"("receiptNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "patients_phone_idx" ON "patients"("phone");

-- CreateIndex (already exists from migration 20260711120000)
DROP INDEX IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
