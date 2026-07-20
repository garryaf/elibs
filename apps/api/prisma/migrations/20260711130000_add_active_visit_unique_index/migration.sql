-- Deduplicate: keep the earliest visit per patient per day for active statuses.
-- Mark duplicates as COMPLETED so the unique index can be created.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "patientId", CAST("registrationDate" AS date)
           ORDER BY "registrationDate" ASC, "createdAt" ASC
         ) AS rn
  FROM "visits"
  WHERE "status" IN ('REGISTERED', 'IN_PROGRESS')
)
UPDATE "visits"
SET "status" = 'COMPLETED'
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- CreateIndex
CREATE UNIQUE INDEX "visits_patient_active_per_day" ON "visits" ("patientId", (CAST("registrationDate" AS date))) WHERE "status" IN ('REGISTERED', 'IN_PROGRESS');
