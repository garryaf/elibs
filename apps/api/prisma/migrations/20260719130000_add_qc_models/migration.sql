-- CreateTable: qc_samples
-- QC sample material tracking for quality control alongside patient specimens
CREATE TABLE "qc_samples" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "lotNumber" VARCHAR(50) NOT NULL,
    "manufacturer" TEXT,
    "level" INTEGER NOT NULL,
    "expiryDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable: qc_runs
-- Individual QC run events linking a QC sample to a specific test
CREATE TABLE "qc_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qcSampleId" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "equipmentId" UUID,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: qc_results
-- Results of QC runs with Westgard rule evaluation
CREATE TABLE "qc_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qcRunId" UUID NOT NULL,
    "resultValue" DECIMAL(12, 4) NOT NULL,
    "expectedMean" DECIMAL(12, 4) NOT NULL,
    "expectedSD" DECIMAL(12, 4) NOT NULL,
    "zScore" DECIMAL(6, 3) NOT NULL,
    "westgardPass" BOOLEAN NOT NULL,
    "violatedRule" VARCHAR(10),

    CONSTRAINT "qc_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: composite index on qcSampleId + testId for efficient QC run lookups
CREATE INDEX "qc_runs_qcSampleId_testId_idx" ON "qc_runs"("qcSampleId", "testId");

-- CreateIndex: index on qcRunId for efficient result lookups by run
CREATE INDEX "qc_results_qcRunId_idx" ON "qc_results"("qcRunId");

-- AddForeignKey: qc_runs.qcSampleId -> qc_samples.id
ALTER TABLE "qc_runs" ADD CONSTRAINT "qc_runs_qcSampleId_fkey" FOREIGN KEY ("qcSampleId") REFERENCES "qc_samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: qc_results.qcRunId -> qc_runs.id
ALTER TABLE "qc_results" ADD CONSTRAINT "qc_results_qcRunId_fkey" FOREIGN KEY ("qcRunId") REFERENCES "qc_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
