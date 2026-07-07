import { PrismaClient } from '@prisma/client';

// EMSIFA API response interfaces
interface EmsifaProvince {
  id: string;
  name: string;
}

interface EmsifaRegency {
  id: string;
  province_id: string;
  name: string;
}

interface EmsifaDistrict {
  id: string;
  regency_id: string;
  name: string;
}

interface EmsifaVillage {
  id: string;
  district_id: string;
  name: string;
}

const EMSIFA_BASE_URL =
  'https://emsifa.github.io/api-wilayah-indonesia/api';

const prisma = new PrismaClient();

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}

async function checkApiAvailability(): Promise<void> {
  try {
    const response = await fetch(`${EMSIFA_BASE_URL}/provinces.json`, {
      method: 'HEAD',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[region-seed] EMSIFA API is unavailable: ${message}`,
    );
    console.error(
      `[region-seed] Please check your internet connection and try again.`,
    );
    process.exit(1);
  }
}

async function syncProvinsi(): Promise<EmsifaProvince[]> {
  console.log('[region-seed] Syncing Provinsi...');
  const provinces = await fetchJson<EmsifaProvince[]>(
    `${EMSIFA_BASE_URL}/provinces.json`,
  );

  for (const prov of provinces) {
    await prisma.provinsi.upsert({
      where: { id: prov.id },
      update: { name: prov.name },
      create: { id: prov.id, name: prov.name },
    });
  }

  console.log(`[region-seed] Syncing Provinsi... ${provinces.length} records`);
  return provinces;
}

async function syncKabupatenKota(
  provinces: EmsifaProvince[],
): Promise<EmsifaRegency[]> {
  console.log('[region-seed] Syncing Kabupaten/Kota...');
  const allRegencies: EmsifaRegency[] = [];

  for (const prov of provinces) {
    const regencies = await fetchJson<EmsifaRegency[]>(
      `${EMSIFA_BASE_URL}/regencies/${prov.id}.json`,
    );

    for (const reg of regencies) {
      await prisma.kabupatenKota.upsert({
        where: { id: reg.id },
        update: { name: reg.name },
        create: {
          id: reg.id,
          provinsiId: reg.province_id,
          name: reg.name,
        },
      });
    }

    allRegencies.push(...regencies);
    console.log(
      `[region-seed] Syncing Kabupaten/Kota for province ${prov.name}... ${regencies.length} records`,
    );
  }

  console.log(
    `[region-seed] Total Kabupaten/Kota: ${allRegencies.length} records`,
  );
  return allRegencies;
}

async function syncKecamatan(
  regencies: EmsifaRegency[],
): Promise<EmsifaDistrict[]> {
  console.log('[region-seed] Syncing Kecamatan...');
  const allDistricts: EmsifaDistrict[] = [];

  for (const reg of regencies) {
    const districts = await fetchJson<EmsifaDistrict[]>(
      `${EMSIFA_BASE_URL}/districts/${reg.id}.json`,
    );

    for (const dist of districts) {
      await prisma.kecamatan.upsert({
        where: { id: dist.id },
        update: { name: dist.name },
        create: {
          id: dist.id,
          kabupatenKotaId: dist.regency_id,
          name: dist.name,
        },
      });
    }

    allDistricts.push(...districts);
    console.log(
      `[region-seed] Syncing Kecamatan for regency ${reg.name}... ${districts.length} records`,
    );
  }

  console.log(
    `[region-seed] Total Kecamatan: ${allDistricts.length} records`,
  );
  return allDistricts;
}

async function syncKelurahanDesa(
  districts: EmsifaDistrict[],
): Promise<void> {
  console.log('[region-seed] Syncing Kelurahan/Desa...');
  let totalVillages = 0;

  for (const dist of districts) {
    const villages = await fetchJson<EmsifaVillage[]>(
      `${EMSIFA_BASE_URL}/villages/${dist.id}.json`,
    );

    for (const village of villages) {
      await prisma.kelurahanDesa.upsert({
        where: { id: village.id },
        update: { name: village.name },
        create: {
          id: village.id,
          kecamatanId: village.district_id,
          name: village.name,
        },
      });
    }

    totalVillages += villages.length;
    console.log(
      `[region-seed] Syncing Kelurahan/Desa for district ${dist.name}... ${villages.length} records`,
    );
  }

  console.log(
    `[region-seed] Total Kelurahan/Desa: ${totalVillages} records`,
  );
}

async function main(): Promise<void> {
  console.log('[region-seed] Starting region data seeding...');
  console.log(`[region-seed] Source: ${EMSIFA_BASE_URL}`);

  // Check API availability before starting
  await checkApiAvailability();

  const startTime = Date.now();

  // Process levels sequentially: Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa
  const provinces = await syncProvinsi();
  const regencies = await syncKabupatenKota(provinces);
  const districts = await syncKecamatan(regencies);
  await syncKelurahanDesa(districts);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[region-seed] Seeding completed in ${elapsed}s`);
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`[region-seed] Fatal error: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
