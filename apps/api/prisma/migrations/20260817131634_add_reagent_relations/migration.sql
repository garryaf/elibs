-- AlterTable
ALTER TABLE "reagents" ADD COLUMN     "equipmentId" UUID;

-- CreateTable
CREATE TABLE "reagent_test_mappings" (
    "id" UUID NOT NULL,
    "reagentId" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "usagePerTest" DECIMAL(8,4),

    CONSTRAINT "reagent_test_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reagent_test_mappings_reagentId_testId_key" ON "reagent_test_mappings"("reagentId", "testId");

-- AddForeignKey
ALTER TABLE "reagents" ADD CONSTRAINT "reagents_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reagent_test_mappings" ADD CONSTRAINT "reagent_test_mappings_reagentId_fkey" FOREIGN KEY ("reagentId") REFERENCES "reagents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reagent_test_mappings" ADD CONSTRAINT "reagent_test_mappings_testId_fkey" FOREIGN KEY ("testId") REFERENCES "test_masters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
