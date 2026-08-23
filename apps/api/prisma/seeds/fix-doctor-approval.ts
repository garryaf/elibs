/**
 * Fix Doctor Approval Configuration
 *
 * Updates requiresDoctorApproval to TRUE for all clinically significant tests.
 * Per best practice laboratorium klinik Indonesia:
 * - Semua tes Kimia Klinik HARUS divalidasi dokter (SGOT, SGPT, Glukosa, Kolesterol, dll)
 * - Semua tes Hematologi HARUS divalidasi dokter (CBC, Hemoglobin, WBC, dll)
 * - Semua tes Koagulasi HARUS divalidasi dokter (APTT, PT)
 * - Tes Serologi/Imunoserologi (HBsAg, Anti-HIV, Widal) HARUS divalidasi dokter
 * - Tes Mikrobiologi (Kultur, BTA) HARUS divalidasi dokter
 *
 * Hanya tes sederhana (Urinalisis Rutin dipstick) yang bisa auto-approve.
 *
 * Usage:
 *   npx ts-node prisma/seeds/fix-doctor-approval.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('[fix-doctor-approval] Updating requiresDoctorApproval settings...\n');

  // Categories that MUST require doctor approval
  const categoriesRequiringApproval = [
    'Kimia Klinik',
    'Hematologi',
    'Koagulasi',
    'Serologi',
    'Imunoserologi',
    'Mikrobiologi',
    'Endokrinologi',
  ];

  // Get category IDs
  const categories = await prisma.testCategory.findMany({
    where: { name: { in: categoriesRequiringApproval } },
    select: { id: true, name: true },
  });

  console.log(`[fix-doctor-approval] Categories to update:`);
  for (const cat of categories) {
    console.log(`  - ${cat.name}`);
  }

  const categoryIds = categories.map((c) => c.id);

  // Update all tests in these categories
  const result = await prisma.testMaster.updateMany({
    where: {
      categoryId: { in: categoryIds },
      requiresDoctorApproval: false,
    },
    data: {
      requiresDoctorApproval: true,
    },
  });

  console.log(`\n[fix-doctor-approval] Updated ${result.count} tests to requiresDoctorApproval=true`);

  // Also set specific tests that are always critical regardless of category
  const criticalTestCodes = ['SER-002']; // Anti-HIV must always require approval
  const criticalResult = await prisma.testMaster.updateMany({
    where: {
      code: { in: criticalTestCodes },
      requiresDoctorApproval: false,
    },
    data: {
      requiresDoctorApproval: true,
    },
  });

  if (criticalResult.count > 0) {
    console.log(`[fix-doctor-approval] Updated ${criticalResult.count} additional critical tests`);
  }

  // Print summary
  const totalTests = await prisma.testMaster.count();
  const requireApproval = await prisma.testMaster.count({ where: { requiresDoctorApproval: true } });
  const autoApprove = await prisma.testMaster.count({ where: { requiresDoctorApproval: false } });

  console.log(`\n[fix-doctor-approval] === Summary ===`);
  console.log(`  Total tests: ${totalTests}`);
  console.log(`  Require doctor approval: ${requireApproval} (${Math.round(requireApproval / totalTests * 100)}%)`);
  console.log(`  Auto-approve (no doctor): ${autoApprove} (${Math.round(autoApprove / totalTests * 100)}%)`);

  // List remaining auto-approve tests
  const remaining = await prisma.testMaster.findMany({
    where: { requiresDoctorApproval: false },
    include: { category: { select: { name: true } } },
    orderBy: { code: 'asc' },
  });

  if (remaining.length > 0) {
    console.log(`\n[fix-doctor-approval] Tests that remain auto-approve:`);
    for (const t of remaining) {
      console.log(`  ${t.code.padEnd(12)} ${t.name.padEnd(30)} (${t.category.name})`);
    }
  }

  console.log('\n[fix-doctor-approval] Done!');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fix-doctor-approval] Error: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
