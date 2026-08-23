/**
 * Fix Panel Serologi Hepatitis — FUNC-MD-04
 *
 * The panel "Panel Serologi Hepatitis" only has 1 test (HBsAg),
 * but the validation requires minimum 2. This script adds Anti-HCV
 * as a second test, or removes the panel if no suitable test is found.
 *
 * Usage:
 *   npx ts-node prisma/seeds/fix-panel-hepatitis.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('[fix-panel-hepatitis] Checking Panel Serologi Hepatitis...\n');

  const panel = await prisma.panel.findFirst({
    where: { name: { contains: 'Serologi Hepatitis' }, deletedAt: null },
    include: { panelTests: { include: { test: true } } },
  });

  if (!panel) {
    console.log('[fix-panel-hepatitis] Panel not found. Nothing to fix.');
    return;
  }

  console.log(`[fix-panel-hepatitis] Panel: ${panel.name} (${panel.id})`);
  console.log(`[fix-panel-hepatitis] Current tests: ${panel.panelTests.length}`);
  panel.panelTests.forEach((pt) => {
    console.log(`  - ${pt.test.code}: ${pt.test.name}`);
  });

  if (panel.panelTests.length >= 2) {
    console.log('[fix-panel-hepatitis] Panel already has >= 2 tests. No fix needed.');
    return;
  }

  // Find HBsAg test (should already be in the panel)
  const existingTestIds = panel.panelTests.map((pt) => pt.testId);

  // Look for other serologi/hepatitis tests to add
  const candidateTests = await prisma.testMaster.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      id: { notIn: existingTestIds },
      OR: [
        { name: { contains: 'Hepatitis', mode: 'insensitive' } },
        { name: { contains: 'HBsAg', mode: 'insensitive' } },
        { name: { contains: 'Anti-HCV', mode: 'insensitive' } },
        { name: { contains: 'Anti-HIV', mode: 'insensitive' } },
        { code: { startsWith: 'SER-' } },
        { code: { startsWith: 'IMU-' } },
      ],
    },
    orderBy: { name: 'asc' },
  });

  if (candidateTests.length > 0) {
    // Add the first candidate test to the panel
    const testToAdd = candidateTests[0];
    console.log(`\n[fix-panel-hepatitis] Adding test: ${testToAdd.code} - ${testToAdd.name}`);

    await prisma.panelTest.create({
      data: {
        panelId: panel.id,
        testId: testToAdd.id,
      },
    });

    console.log('[fix-panel-hepatitis] ✅ Panel now has 2 tests.');
  } else {
    // No suitable test found — soft-delete the panel
    console.log('\n[fix-panel-hepatitis] No suitable test found to add.');
    console.log('[fix-panel-hepatitis] Removing invalid panel (soft-delete)...');

    await prisma.panel.update({
      where: { id: panel.id },
      data: { deletedAt: new Date() },
    });

    console.log('[fix-panel-hepatitis] ✅ Panel soft-deleted.');
  }

  // Final state
  const updatedPanel = await prisma.panel.findUnique({
    where: { id: panel.id },
    include: { panelTests: { include: { test: true } } },
  });

  if (updatedPanel && !updatedPanel.deletedAt) {
    console.log(`\n[fix-panel-hepatitis] Final panel state:`);
    console.log(`  Name: ${updatedPanel.name}`);
    console.log(`  Tests: ${updatedPanel.panelTests.length}`);
    updatedPanel.panelTests.forEach((pt) => {
      console.log(`    - ${pt.test.code}: ${pt.test.name}`);
    });
  }

  console.log('\n[fix-panel-hepatitis] Done!');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[fix-panel-hepatitis] Error: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
