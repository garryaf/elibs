-- AlterTable
ALTER TABLE "panels" ADD COLUMN     "discount" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sample_types" ADD COLUMN     "minimumVolume" TEXT,
ADD COLUMN     "stabilityPeriod" TEXT,
ADD COLUMN     "storageTemperature" TEXT;

-- AlterTable
ALTER TABLE "test_masters" ADD COLUMN     "fastingHours" INTEGER,
ADD COLUMN     "fastingRequired" BOOLEAN NOT NULL DEFAULT false;
