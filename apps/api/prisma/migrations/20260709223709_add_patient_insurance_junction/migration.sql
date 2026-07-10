-- CreateTable
CREATE TABLE "patient_insurances" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "insuranceId" UUID NOT NULL,
    "memberNumber" VARCHAR(50),
    "policyNumber" VARCHAR(50),
    "priority" INTEGER NOT NULL DEFAULT 1,
    "type" "InsuranceType",
    "bpjsClassLevel" INTEGER,
    "validFrom" DATE,
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_insurances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_insurances_patientId_priority_idx" ON "patient_insurances"("patientId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "patient_insurances_patientId_insuranceId_key" ON "patient_insurances"("patientId", "insuranceId");

-- AddForeignKey
ALTER TABLE "patient_insurances" ADD CONSTRAINT "patient_insurances_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurances" ADD CONSTRAINT "patient_insurances_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "insurances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
