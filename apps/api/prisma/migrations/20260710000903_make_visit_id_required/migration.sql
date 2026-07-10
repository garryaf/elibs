-- PREREQUISITE: The legacy order migration (MigrationService.runLegacyMigration)
-- MUST be completed before applying this migration.
-- Original prerequisite was: SELECT COUNT(*) FROM orders WHERE "visitId" IS NULL; -- Must be 0
-- This migration now handles NULL values by creating placeholder visits.

/*
  Warnings:

  - Made the column `visitId` on table `orders` required. This step will fail if there are existing NULL values in that column.
  - Orders with NULL visitId will be assigned to auto-created placeholder visits.

*/

-- Step 1: Create placeholder visits for orders that have NULL visitId
-- Each order gets its own placeholder visit linked to the same patient
INSERT INTO "visits" ("id", "patientId", "visitNumber", "registrationDate", "status", "paymentMethod", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  o."patientId",
  'LEGACY-' || o."orderNumber",
  COALESCE(o."createdAt", NOW()),
  'COMPLETED',
  COALESCE(o."paymentMethod", 'CASH'),
  NOW(),
  NOW()
FROM "orders" o
WHERE o."visitId" IS NULL
  AND o."patientId" IS NOT NULL;

-- Step 2: Update orders to point to their newly created placeholder visits
UPDATE "orders" o
SET "visitId" = v."id"
FROM "visits" v
WHERE o."visitId" IS NULL
  AND v."patientId" = o."patientId"
  AND v."visitNumber" = 'LEGACY-' || o."orderNumber";

-- Step 3: Handle edge case where patientId might be NULL (shouldn't happen due to FK, but safety net)
DO $$ 
DECLARE
  placeholder_visit_id UUID;
  fallback_patient_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM "orders" WHERE "visitId" IS NULL LIMIT 1) THEN
    SELECT "id" INTO fallback_patient_id FROM "patients" LIMIT 1;
    
    IF fallback_patient_id IS NOT NULL THEN
      INSERT INTO "visits" ("id", "patientId", "visitNumber", "registrationDate", "status", "paymentMethod", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), fallback_patient_id, 'LEGACY-ORPHAN-' || extract(epoch from now())::text, NOW(), 'COMPLETED', 'CASH', NOW(), NOW())
      RETURNING "id" INTO placeholder_visit_id;

      UPDATE "orders" SET "visitId" = placeholder_visit_id WHERE "visitId" IS NULL;
    ELSE
      -- No patients exist at all, just delete orphan orders
      DELETE FROM "order_details" WHERE "orderId" IN (SELECT "id" FROM "orders" WHERE "visitId" IS NULL);
      DELETE FROM "orders" WHERE "visitId" IS NULL;
    END IF;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_visitId_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "visitId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
