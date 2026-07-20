-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "discountReason" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clinicId" UUID;

-- CreateIndex (only if not exists)
-- NOTE: This is a historical no-op. The partial index from migration 22 supersedes this.
-- Kept for migration sequence integrity. No functional impact.
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- AddForeignKey (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_clinicId_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Partial index on clinicId for DataScopeInterceptor performance
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users("clinicId") WHERE "clinicId" IS NOT NULL;
