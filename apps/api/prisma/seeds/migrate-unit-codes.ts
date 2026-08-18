/**
 * Migrasi Unit Codes — Mapping TestMaster.unit free-text ke MeasurementUnit.code
 *
 * Script ini:
 * 1. Ambil semua TestMaster yang punya unit non-null
 * 2. Ambil semua MeasurementUnit untuk lookup
 * 3. Cek apakah unit sudah match exact dengan MeasurementUnit.code
 * 4. Jika tidak, coba common mappings (case-insensitive, trimmed)
 * 5. Jika tetap tidak match, log warning (tidak nullify, biarkan untuk manual review)
 *
 * Idempotent: aman dijalankan berulang kali.
 *
 * Cara jalankan standalone:
 *   npx ts-node prisma/seeds/migrate-unit-codes.ts
 */
import { PrismaClient } from '@prisma/client';

// ════════════════════════════════════════════════════════════════════════════════
// COMMON UNIT MAPPINGS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Maps common free-text unit variations to valid MeasurementUnit.code values.
 * Keys are lowercase/trimmed variants. Values are the canonical code.
 */
const UNIT_MAPPINGS: Record<string, string> = {
  // Case variations
  'g/dl': 'g/dL',
  'mg/dl': 'mg/dL',
  'u/l': 'U/L',
  'iu/l': 'U/L',
  'ml': 'mL',

  // Cell count variations
  '10^3/µl': '/µL',
  '10^3/ul': '/µL',
  'x10^3/µl': '/µL',
  'x10^3/ul': '/µL',
  '10³/µl': '/µL',
  '10³/ul': '/µL',
  'ribu/µl': '/µL',
  'ribu/ul': '/µL',
  '/ul': '/µL',
  '/µl': '/µL',
  'sel/µl': '/µL',
  'sel/ul': '/µL',

  // Percentage
  'persen': '%',
  'percent': '%',

  // Electrolytes
  'mmol/l': 'mmol/L',
  'meq/l': 'mmol/L',

  // Hormone/immunology
  'miu/ml': 'mIU/mL',
  'µiu/ml': 'mIU/mL',
  'uiu/ml': 'mIU/mL',

  // Tumor markers
  'ng/ml': 'ng/mL',
  'pg/ml': 'pg/mL',

  // Time
  'detik': 'sec',
  'seconds': 'sec',
  's': 'sec',

  // ESR
  'mm/hr': 'mm/jam',
  'mm/hour': 'mm/jam',
  'mm/h': 'mm/jam',

  // Volume
  'fl': 'fL',
  'femtoliter': 'fL',
};

/**
 * Values that are intentionally non-unit (placeholder or qualitative),
 * which should be left as-is without warning.
 */
const SKIP_VALUES = new Set(['-', 'n/a', 'none', 'qualitative', 'titer', 'index']);

// ════════════════════════════════════════════════════════════════════════════════
// MIGRATION LOGIC
// ════════════════════════════════════════════════════════════════════════════════

export async function migrateUnitCodes(client?: PrismaClient): Promise<void> {
  const prisma = client ?? new PrismaClient();

  console.log('\n[migrate-unit] === Migrasi Unit Codes ===');
  console.log('[migrate-unit] Mapping TestMaster.unit → MeasurementUnit.code\n');

  try {
    // 1. Fetch all MeasurementUnit records
    const measurementUnits = await prisma.measurementUnit.findMany({
      where: { isActive: true },
    });

    // Build lookup: code → code (exact) and lowercase → code (for fuzzy)
    const validCodes = new Set(measurementUnits.map((u) => u.code));
    const codeByLower = new Map(measurementUnits.map((u) => [u.code.toLowerCase(), u.code]));

    console.log(`[migrate-unit] Found ${measurementUnits.length} valid MeasurementUnit codes:`);
    console.log(`[migrate-unit]   ${Array.from(validCodes).join(', ')}\n`);

    // 2. Fetch all TestMaster with non-null unit
    const tests = await prisma.testMaster.findMany({
      where: {
        unit: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
      },
    });

    console.log(`[migrate-unit] Found ${tests.length} TestMaster records with unit set\n`);

    let alreadyValid = 0;
    let mapped = 0;
    let skipped = 0;
    let noMatch = 0;

    for (const test of tests) {
      const currentUnit = test.unit!;
      const trimmed = currentUnit.trim();

      // Skip placeholder/qualitative values
      if (SKIP_VALUES.has(trimmed.toLowerCase())) {
        skipped++;
        continue;
      }

      // 3. Check exact match
      if (validCodes.has(trimmed)) {
        // Already valid — update if whitespace was trimmed
        if (trimmed !== currentUnit) {
          await prisma.testMaster.update({
            where: { id: test.id },
            data: { unit: trimmed },
          });
          console.log(`[migrate-unit] ✅ ${test.code}: trimmed "${currentUnit}" → "${trimmed}"`);
          mapped++;
        } else {
          alreadyValid++;
        }
        continue;
      }

      // 4. Check case-insensitive exact match against valid codes
      const caseMatch = codeByLower.get(trimmed.toLowerCase());
      if (caseMatch) {
        await prisma.testMaster.update({
          where: { id: test.id },
          data: { unit: caseMatch },
        });
        console.log(`[migrate-unit] ✅ ${test.code}: case-fixed "${currentUnit}" → "${caseMatch}"`);
        mapped++;
        continue;
      }

      // 5. Try common mappings
      const mappedCode = UNIT_MAPPINGS[trimmed.toLowerCase()];
      if (mappedCode && validCodes.has(mappedCode)) {
        await prisma.testMaster.update({
          where: { id: test.id },
          data: { unit: mappedCode },
        });
        console.log(`[migrate-unit] ✅ ${test.code}: mapped "${currentUnit}" → "${mappedCode}"`);
        mapped++;
        continue;
      }

      // 6. No match — log warning but don't nullify
      console.log(
        `[migrate-unit] ⚠️  ${test.code} (${test.name}): unit "${currentUnit}" — no matching MeasurementUnit found. Left for manual review.`,
      );
      noMatch++;
    }

    // Summary
    console.log('\n[migrate-unit] ═══════════════════════════════════════');
    console.log('[migrate-unit] Migrasi Unit Codes — Summary:');
    console.log(`[migrate-unit]   Already valid:  ${alreadyValid}`);
    console.log(`[migrate-unit]   Mapped:         ${mapped}`);
    console.log(`[migrate-unit]   Skipped (n/a):  ${skipped}`);
    console.log(`[migrate-unit]   No match:       ${noMatch}`);
    console.log('[migrate-unit] ═══════════════════════════════════════\n');

    if (noMatch > 0) {
      console.log('[migrate-unit] 💡 Tip: Untuk unit yang tidak match, tambahkan');
      console.log('[migrate-unit]    entry baru di MeasurementUnit atau update UNIT_MAPPINGS.');
    }
  } finally {
    // Only disconnect if we created the client ourselves
    if (!client) {
      await prisma.$disconnect();
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// STANDALONE MAIN — only runs when executed directly
// ════════════════════════════════════════════════════════════════════════════════

const isRunDirectly = require.main === module;

if (isRunDirectly) {
  migrateUnitCodes()
    .then(() => {
      console.log('[migrate-unit] Done.');
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(`[migrate-unit] Fatal: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    });
}
