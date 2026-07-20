-- Sprint 4 Schema Additions
-- Adds missing fields identified during the enterprise deep audit

-- MED-008: Doctor rejection tracking fields
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejectedBy" UUID;

-- MED-010: Payment actor tracking
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paidBy" UUID;

-- LOW-005: Notification timestamp
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3);

-- LOW-001: Equipment status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EquipmentStatus') THEN
    CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');
  END IF;
END
$$;

-- Convert equipment.status from text to enum (if column exists as text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'equipment' AND column_name = 'status' AND data_type = 'text'
  ) THEN
    ALTER TABLE "equipment" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "equipment" ALTER COLUMN "status" TYPE "EquipmentStatus" USING "status"::"EquipmentStatus";
    ALTER TABLE "equipment" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"EquipmentStatus";
  END IF;
END
$$;
