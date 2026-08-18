/**
 * Validasi SampleType Codes — Fix TestMaster.sampleType terhadap SampleTypeMaster.code
 *
 * Script ini:
 * 1. Query semua TestMaster records
 * 2. Untuk setiap record, cek apakah sampleType ada di SampleTypeMaster.code
 * 3. Jika tidak cocok, coba mapping nama deskriptif ke code:
 *    - "Darah EDTA" → "EDTA"
 *    - "Serum" / "Serum (SST)" → "SST"
 *    - "Urine" / "Urin" → "URINE"
 *    - "Sputum" → "SPUTUM"
 *    - "Plasma Citrate" → "CITRATE"
 *    - "Plasma Heparin" → "HEPARIN"
 *    - "Feses" → "FECES" (jika ada)
 *    - "Swab" → "SWAB" (jika ada)
 * 4. Jika mapping tidak ditemukan, nullify sampleType
 * 5. Report jumlah record yang di-fix / nullify
 *
 * Idempotent: aman dijalankan berulang kali (sudah valid = skip).
 *
 * Cara jalankan:
 *   npx ts-node prisma/seeds/validate-sample-type-codes.ts
 */
import { PrismaClient } from '@prisma/client';

// ════════════════════════════════════════════════════════════════════════════════
// SAMPLE TYPE MAPPINGS — descriptive name → SampleTypeMaster.code
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Maps common descriptive sampleType values (lowercase) to valid SampleTypeMaster.code.
 * These are the old values that may exist in databases seeded before the fix.
 */
const SAMPLE_TYPE_MAPPINGS: Record<string, string> = {
  // EDTA variations
  'darah edta': 'EDTA',
  'darah (edta)': 'EDTA',
  'edta blood': 'EDTA',
  'whole blood edta': 'EDTA',
  'whole blood': 'EDTA',

  // SST / Serum variations
  'serum': 'SST',
  'serum (sst)': 'SST',
  'serum sst': 'SST',
  'darah (sst)': 'SST',
  'darah sst': 'SST',

  // Citrate variations
  'plasma citrate': 'CITRATE',
  'citrate': 'CITRATE',
  'na-citrate': 'CITRATE',
  'plasma (citrate)': 'CITRATE',

  // Heparin variations
  'plasma heparin': 'HEPARIN',
  'heparin': 'HEPARIN',
  'li-heparin': 'HEPARIN',
  'plasma (heparin)': 'HEPARIN',

  // Urine variations
  'urine': 'URINE',
  'urin': 'URINE',
  'urin pagi': 'URINE',
  'midstream urine': 'URINE',

  // Sputum variations
  'sputum': 'SPUTUM',
  'dahak': 'SPUTUM',

  // NaF variations
  'naf': 'NaF',
  'sodium fluoride': 'NaF',
  'na-fluoride': 'NaF',
  'darah naf': 'NaF',

  // Stool/Feces variations
  'feses': 'FECES',
  'feces': 'FECES',
  'tinja': 'FECES',
  'stool': 'FECES',

  // Swab variations
  'swab': 'SWAB',
  'swab tenggorok': 'SWAB',
  'swab nasofaring': 'SWAB',
};

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION LOGIC
// ════════════════════════════════════════════════════════════════════════════════

export async function validateSampleTypeCodes(client?: PrismaClient): Promise<void> {
  const prisma = client ?? new PrismaClient();

  console.log('\n[validate-sample-type] === Validasi SampleType Codes ===');
  console.log('[validate-sample-type] Checking TestMaster.sampleType against SampleTypeMaster.code\n');

  try {
    // 1. Fetch all valid SampleTypeMaster codes
    const sampleTypes = await prisma.sampleTypeMaster.findMany({
      where: { isActive: true },
    });

    const validCodes = new Set(sampleTypes.map((st) => st.code));
    const codeByLower = new Map(sampleTypes.map((st) => [st.code.toLowerCase(), st.code]));
    // Also build name → code map for direct name matching
    const codeByName = new Map(sampleTypes.map((st) => [st.name.toLowerCase(), st.code]));

    console.log(`[validate-sample-type] Valid SampleTypeMaster codes (${validCodes.size}):`);
    console.log(`[validate-sample-type]   ${Array.from(validCodes).join(', ')}\n`);

    // 2. Fetch all TestMaster records with non-null sampleType
    const tests = await prisma.testMaster.findMany({
      where: {
        sampleType: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        sampleType: true,
      },
    });

    console.log(`[validate-sample-type] Found ${tests.length} TestMaster records with sampleType set\n`);

    let alreadyValid = 0;
    let fixed = 0;
    let nullified = 0;

    for (const test of tests) {
      const currentValue = test.sampleType!;
      const trimmed = currentValue.trim();

      // 3. Check exact match — already valid
      if (validCodes.has(trimmed)) {
        // Fix whitespace if needed
        if (trimmed !== currentValue) {
          await prisma.testMaster.update({
            where: { id: test.id },
            data: { sampleType: trimmed },
          });
          console.log(`[validate-sample-type] ✅ ${test.code}: trimmed "${currentValue}" → "${trimmed}"`);
          fixed++;
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
          data: { sampleType: caseMatch },
        });
        console.log(`[validate-sample-type] ✅ ${test.code}: case-fixed "${currentValue}" → "${caseMatch}"`);
        fixed++;
        continue;
      }

      // 5. Try descriptive name → code mappings
      const mappedCode = SAMPLE_TYPE_MAPPINGS[trimmed.toLowerCase()];
      if (mappedCode && validCodes.has(mappedCode)) {
        await prisma.testMaster.update({
          where: { id: test.id },
          data: { sampleType: mappedCode },
        });
        console.log(`[validate-sample-type] ✅ ${test.code}: mapped "${currentValue}" → "${mappedCode}"`);
        fixed++;
        continue;
      }

      // 6. Try matching against SampleTypeMaster.name (e.g., "Darah EDTA" is a name)
      const nameMatch = codeByName.get(trimmed.toLowerCase());
      if (nameMatch) {
        await prisma.testMaster.update({
          where: { id: test.id },
          data: { sampleType: nameMatch },
        });
        console.log(`[validate-sample-type] ✅ ${test.code}: name-matched "${currentValue}" → "${nameMatch}"`);
        fixed++;
        continue;
      }

      // 7. Partial match — check if the value contains a known code
      let partialMatch: string | null = null;
      for (const code of validCodes) {
        if (trimmed.toLowerCase().includes(code.toLowerCase())) {
          partialMatch = code;
          break;
        }
      }
      if (partialMatch) {
        await prisma.testMaster.update({
          where: { id: test.id },
          data: { sampleType: partialMatch },
        });
        console.log(`[validate-sample-type] ✅ ${test.code}: partial-matched "${currentValue}" → "${partialMatch}"`);
        fixed++;
        continue;
      }

      // 8. No match found — nullify
      await prisma.testMaster.update({
        where: { id: test.id },
        data: { sampleType: null },
      });
      console.log(`[validate-sample-type] ⚠️  ${test.code} (${test.name}): "${currentValue}" → NULL (no mapping found)`);
      nullified++;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n[validate-sample-type] ═══════════════════════════════════════════════');
    console.log('[validate-sample-type] Validasi SampleType Codes — Summary:');
    console.log(`[validate-sample-type]   Already valid:  ${alreadyValid}`);
    console.log(`[validate-sample-type]   Fixed/mapped:   ${fixed}`);
    console.log(`[validate-sample-type]   Nullified:      ${nullified}`);
    console.log(`[validate-sample-type]   Total checked:  ${tests.length}`);
    console.log('[validate-sample-type] ═══════════════════════════════════════════════\n');

    if (nullified > 0) {
      console.log('[validate-sample-type] 💡 Records yang di-nullify perlu diperiksa manual.');
      console.log('[validate-sample-type]    Tambahkan mapping ke SAMPLE_TYPE_MAPPINGS jika pattern diketahui.');
    }

    if (fixed === 0 && nullified === 0) {
      console.log('[validate-sample-type] ✅ Semua TestMaster.sampleType sudah valid!');
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
  validateSampleTypeCodes()
    .then(() => {
      console.log('[validate-sample-type] Done.');
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error(`[validate-sample-type] Fatal: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    });
}
