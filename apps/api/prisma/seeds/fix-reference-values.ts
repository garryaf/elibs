/**
 * Fix Missing Reference Values & Result Types
 *
 * 7 tests have no reference values and wrong resultType.
 * This seed:
 * 1. Updates resultType to QUALITATIVE for non-numeric tests
 * 2. Sets qualitativeOptions for qualitative tests
 * 3. Adds reference values for numeric tests that are missing them
 *
 * Tests fixed:
 * - SER-002 Anti-HIV (Rapid) → QUALITATIVE (Non-Reaktif / Reaktif)
 * - MIK-002 BTA → QUALITATIVE (Negatif / Positif 1+ / 2+ / 3+)
 * - SER-001 HBsAg (Rapid) → QUALITATIVE (Non-Reaktif / Reaktif)
 * - MIK-001 Kultur Urin → TEXT (free text result)
 * - SER-003 Widal → QUALITATIVE (Negatif / 1:80 / 1:160 / 1:320)
 * - HEM-005 Darah Lengkap (CBC) → keep NUMERIC, add reference values
 * - URI-001 Urinalisis Lengkap → TEXT (composite result)
 *
 * Usage:
 *   npx ts-node prisma/seeds/fix-reference-values.ts
 */

import { PrismaClient, Gender } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('[fix-reference-values] Fixing missing reference values and result types...\n');

  // ═══ Step 1: Update qualitative tests ═══

  const qualitativeUpdates = [
    {
      code: 'SER-002',
      resultType: 'QUALITATIVE' as const,
      qualitativeOptions: ['Non-Reaktif', 'Reaktif'],
      unit: '-',
    },
    {
      code: 'SER-001',
      resultType: 'QUALITATIVE' as const,
      qualitativeOptions: ['Non-Reaktif', 'Reaktif'],
      unit: '-',
    },
    {
      code: 'MIK-002',
      resultType: 'QUALITATIVE' as const,
      qualitativeOptions: ['Negatif', 'Scanty (1-2)', 'Positif 1+', 'Positif 2+', 'Positif 3+'],
      unit: '-',
    },
    {
      code: 'SER-003',
      resultType: 'QUALITATIVE' as const,
      qualitativeOptions: ['Negatif', '1:40', '1:80', '1:160', '1:320', '1:640'],
      unit: 'titer',
    },
    {
      code: 'SER-WIDAL',
      resultType: 'QUALITATIVE' as const,
      qualitativeOptions: ['Negatif', '1:40', '1:80', '1:160', '1:320', '1:640'],
      unit: 'titer',
    },
    {
      code: 'SER-HBSAG',
      resultType: 'QUALITATIVE' as const,
      qualitativeOptions: ['Non-Reaktif', 'Reaktif'],
      unit: '-',
    },
  ];

  for (const update of qualitativeUpdates) {
    const result = await prisma.testMaster.updateMany({
      where: { code: update.code },
      data: {
        resultType: update.resultType,
        qualitativeOptions: update.qualitativeOptions,
        unit: update.unit,
      },
    });
    if (result.count > 0) {
      console.log(`[qualitative] ${update.code} → ${update.resultType} (options: ${update.qualitativeOptions.join(', ')})`);
    }
  }

  // ═══ Step 2: Update TEXT result type tests ═══

  const textUpdates = [
    { code: 'MIK-001', unit: '-' },   // Kultur Urin — free text (organism + sensitivity)
    { code: 'URI-001', unit: '-' },    // Urinalisis Lengkap — composite text report
  ];

  for (const update of textUpdates) {
    const result = await prisma.testMaster.updateMany({
      where: { code: update.code },
      data: {
        resultType: 'TEXT',
        unit: update.unit,
      },
    });
    if (result.count > 0) {
      console.log(`[text] ${update.code} → TEXT`);
    }
  }

  // ═══ Step 3: Add reference values for HEM-005 (Darah Lengkap) ═══
  // Note: CBC is a panel-level test — individual parameters already have refs (HEM-CBC01..05)
  // For HEM-005 as standalone, we add a general WBC-based reference as a fallback
  const hem005 = await prisma.testMaster.findUnique({ where: { code: 'HEM-005' } });
  if (hem005) {
    // Check if already has reference values
    const existingRefs = await prisma.referenceValue.count({ where: { testId: hem005.id } });
    if (existingRefs === 0) {
      // Add WBC-equivalent reference (most common flagging parameter in CBC)
      await prisma.referenceValue.createMany({
        data: [
          { testId: hem005.id, gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 11.0, criticalMin: 2.0, criticalMax: 30.0 },
          { testId: hem005.id, gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 11.0, criticalMin: 2.0, criticalMax: 30.0 },
        ],
        skipDuplicates: true,
      });
      console.log('[reference] HEM-005 (Darah Lengkap) → Added reference values (WBC-based: 4.0-11.0 x10³/µL)');
    } else {
      console.log('[reference] HEM-005 already has reference values, skipping');
    }
  }

  // ═══ Step 4: Add critical ranges to tests that lack them ═══
  // For important Kimia Klinik tests, add critical ranges where missing

  const criticalRangeUpdates = [
    // SGPT: critical > 200 U/L
    { code: 'KIM-SGPT', criticalMax: 200 },
    { code: 'KIM-004', criticalMax: 200 },
    // SGOT: critical > 200 U/L
    { code: 'KIM-SGOT', criticalMax: 200 },
    { code: 'KIM-003', criticalMax: 200 },
    // Glukosa: critical < 40 or > 500 mg/dL
    { code: 'KIM-GDP', criticalMin: 40, criticalMax: 500 },
    { code: 'KIM-001', criticalMin: 40, criticalMax: 500 },
    { code: 'KIM-GD2J', criticalMin: 40, criticalMax: 500 },
    // Kreatinin: critical > 10 mg/dL
    { code: 'KIM-KREA', criticalMax: 10 },
    { code: 'KIM-005', criticalMax: 10 },
    // Hemoglobin: critical < 7 or > 20 g/dL
    { code: 'HEM-001', criticalMin: 7, criticalMax: 20 },
    { code: 'HEM-CBC01', criticalMin: 7, criticalMax: 20 },
    // Trombosit: critical < 50 or > 1000 x10³/µL
    { code: 'HEM-004', criticalMin: 50, criticalMax: 1000 },
    { code: 'HEM-CBC03', criticalMin: 50, criticalMax: 1000 },
  ];

  let criticalUpdated = 0;
  for (const update of criticalRangeUpdates) {
    const test = await prisma.testMaster.findUnique({ where: { code: update.code } });
    if (!test) continue;

    const refs = await prisma.referenceValue.findMany({ where: { testId: test.id } });
    for (const ref of refs) {
      const needsUpdate =
        (update.criticalMin !== undefined && ref.criticalMin === null) ||
        (update.criticalMax !== undefined && ref.criticalMax === null);

      if (needsUpdate) {
        await prisma.referenceValue.update({
          where: { id: ref.id },
          data: {
            ...(update.criticalMin !== undefined && ref.criticalMin === null ? { criticalMin: update.criticalMin } : {}),
            ...(update.criticalMax !== undefined && ref.criticalMax === null ? { criticalMax: update.criticalMax } : {}),
          },
        });
        criticalUpdated++;
      }
    }
  }

  if (criticalUpdated > 0) {
    console.log(`[critical] Updated ${criticalUpdated} reference value entries with critical ranges`);
  }

  // ═══ Summary ═══
  console.log('\n[fix-reference-values] === Summary ===');
  const allTests = await prisma.testMaster.findMany({
    include: { referenceValues: true },
    orderBy: { code: 'asc' },
  });

  const withRefs = allTests.filter((t) => t.referenceValues.length > 0).length;
  const numeric = allTests.filter((t) => t.resultType === 'NUMERIC').length;
  const qualitative = allTests.filter((t) => t.resultType === 'QUALITATIVE').length;
  const text = allTests.filter((t) => t.resultType === 'TEXT').length;

  console.log(`  Total tests: ${allTests.length}`);
  console.log(`  NUMERIC: ${numeric} | QUALITATIVE: ${qualitative} | TEXT: ${text}`);
  console.log(`  With reference values: ${withRefs}`);
  console.log(`  Without reference values: ${allTests.length - withRefs} (expected for QUALITATIVE/TEXT)`);
  console.log('\n[fix-reference-values] Done!');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fix-reference-values] Error: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
