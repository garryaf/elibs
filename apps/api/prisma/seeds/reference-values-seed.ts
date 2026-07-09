import { PrismaClient, Gender } from '@prisma/client';

const prisma = new PrismaClient();

interface RefValueInput {
  testCode: string;
  gender: Gender;
  minAge: number;
  maxAge: number;
  minRef: number;
  maxRef: number;
  criticalMin: number | null;
  criticalMax: number | null;
}

const referenceValues: RefValueInput[] = [
  // Hemoglobin (HEM-001)
  { testCode: 'HEM-001', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 13.0, maxRef: 17.5, criticalMin: 7.0, criticalMax: 20.0 },
  { testCode: 'HEM-001', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 12.0, maxRef: 16.0, criticalMin: 7.0, criticalMax: 18.0 },

  // Hematokrit (HEM-002)
  { testCode: 'HEM-002', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 40, maxRef: 54, criticalMin: 25, criticalMax: 60 },
  { testCode: 'HEM-002', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 36, maxRef: 48, criticalMin: 25, criticalMax: 60 },

  // Leukosit (HEM-003)
  { testCode: 'HEM-003', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 11.0, criticalMin: 2.0, criticalMax: 30.0 },
  { testCode: 'HEM-003', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 11.0, criticalMin: 2.0, criticalMax: 30.0 },

  // Trombosit (HEM-004)
  { testCode: 'HEM-004', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 1000 },
  { testCode: 'HEM-004', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 1000 },

  // Glukosa Darah Puasa (KK-001)
  { testCode: 'KK-001', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 70, maxRef: 100, criticalMin: 50, criticalMax: 400 },
  { testCode: 'KK-001', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 70, maxRef: 100, criticalMin: 50, criticalMax: 400 },

  // Kolesterol Total (KK-002)
  { testCode: 'KK-002', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 200, criticalMin: null, criticalMax: 300 },
  { testCode: 'KK-002', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 200, criticalMin: null, criticalMax: 300 },

  // SGOT (KK-003)
  { testCode: 'KK-003', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 40, criticalMin: null, criticalMax: 200 },
  { testCode: 'KK-003', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 32, criticalMin: null, criticalMax: 200 },

  // SGPT (KK-004)
  { testCode: 'KK-004', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 41, criticalMin: null, criticalMax: 200 },
  { testCode: 'KK-004', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 33, criticalMin: null, criticalMax: 200 },

  // Kreatinin (KK-005)
  { testCode: 'KK-005', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0.7, maxRef: 1.3, criticalMin: null, criticalMax: 10.0 },
  { testCode: 'KK-005', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0.6, maxRef: 1.1, criticalMin: null, criticalMax: 10.0 },
];

async function main(): Promise<void> {
  console.log('[seed] === Reference Values Seed ===');
  console.log(`[seed] DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);

  let upserted = 0;
  let skipped = 0;

  for (const ref of referenceValues) {
    // Find test by code
    const test = await prisma.testMaster.findUnique({
      where: { code: ref.testCode },
    });

    if (!test) {
      console.log(`[seed] ⚠️  Test not found: ${ref.testCode} — skipping`);
      skipped++;
      continue;
    }

    await prisma.referenceValue.upsert({
      where: {
        testId_gender_minAge_maxAge: {
          testId: test.id,
          gender: ref.gender,
          minAge: ref.minAge,
          maxAge: ref.maxAge,
        },
      },
      update: {
        minRef: ref.minRef,
        maxRef: ref.maxRef,
        criticalMin: ref.criticalMin,
        criticalMax: ref.criticalMax,
      },
      create: {
        testId: test.id,
        gender: ref.gender,
        minAge: ref.minAge,
        maxAge: ref.maxAge,
        minRef: ref.minRef,
        maxRef: ref.maxRef,
        criticalMin: ref.criticalMin,
        criticalMax: ref.criticalMax,
      },
    });

    upserted++;
    console.log(`[seed] ✅ ${ref.testCode} (${ref.gender}): ${ref.minRef}-${ref.maxRef}`);
  }

  console.log(`\n[seed] Done! Upserted: ${upserted}, Skipped: ${skipped}`);
}

main()
  .catch((error: unknown) => {
    console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
