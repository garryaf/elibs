-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "kabupatenKotaId" TEXT,
ADD COLUMN     "kecamatanId" TEXT,
ADD COLUMN     "kelurahanDesaId" TEXT,
ADD COLUMN     "provinsiId" TEXT;

-- CreateTable
CREATE TABLE "provinsi" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinsi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kabupaten_kota" (
    "id" TEXT NOT NULL,
    "provinsiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kabupaten_kota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kecamatan" (
    "id" TEXT NOT NULL,
    "kabupatenKotaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kecamatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kelurahan_desa" (
    "id" TEXT NOT NULL,
    "kecamatanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kelurahan_desa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kabupaten_kota_provinsiId_idx" ON "kabupaten_kota"("provinsiId");

-- CreateIndex
CREATE INDEX "kecamatan_kabupatenKotaId_idx" ON "kecamatan"("kabupatenKotaId");

-- CreateIndex
CREATE INDEX "kelurahan_desa_kecamatanId_idx" ON "kelurahan_desa"("kecamatanId");

-- AddForeignKey
ALTER TABLE "kabupaten_kota" ADD CONSTRAINT "kabupaten_kota_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES "provinsi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kecamatan" ADD CONSTRAINT "kecamatan_kabupatenKotaId_fkey" FOREIGN KEY ("kabupatenKotaId") REFERENCES "kabupaten_kota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kelurahan_desa" ADD CONSTRAINT "kelurahan_desa_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_provinsiId_fkey" FOREIGN KEY ("provinsiId") REFERENCES "provinsi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_kabupatenKotaId_fkey" FOREIGN KEY ("kabupatenKotaId") REFERENCES "kabupaten_kota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_kecamatanId_fkey" FOREIGN KEY ("kecamatanId") REFERENCES "kecamatan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_kelurahanDesaId_fkey" FOREIGN KEY ("kelurahanDesaId") REFERENCES "kelurahan_desa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
