-- PREREQUISITE: The legacy order migration (MigrationService.runLegacyMigration)
-- MUST be completed before applying this migration.
-- Verify: SELECT COUNT(*) FROM orders WHERE "visitId" IS NULL; -- Must be 0

/*
  Warnings:

  - Made the column `visitId` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_visitId_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "visitId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
