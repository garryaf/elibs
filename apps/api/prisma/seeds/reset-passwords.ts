/**
 * Reset Passwords Seed
 *
 * Resets all user passwords to documented defaults for development/testing.
 * This ensures all roles can be tested without password guessing.
 *
 * Credentials after reset:
 *   admin@elis.local          → Admin@1234  (SUPER_ADMIN)
 *   kasir@elis.local          → Demo@1234   (KASIR)
 *   kasir.dian@elis.local     → Demo@1234   (KASIR)
 *   cs.rina@elis.local        → Demo@1234   (CS)
 *   analis@elis.local         → Demo@1234   (ANALIS)
 *   analis.maya@elis.local    → Demo@1234   (ANALIS)
 *   analis.budi@elis.local    → Demo@1234   (ANALIS)
 *   dokter@elis.local         → Demo@1234   (DOKTER)
 *   dokter.ahmad@elis.local   → Demo@1234   (DOKTER)
 *   sampling@elis.local       → Demo@1234   (SAMPLING)
 *   sampling.agus@elis.local  → Demo@1234   (SAMPLING)
 *   manager.siti@elis.local   → Demo@1234   (MANAGER)
 *
 * Usage:
 *   npx ts-node prisma/seeds/reset-passwords.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_PASSWORD = 'Admin@1234';
const DEMO_PASSWORD = 'Demo@1234';

async function main(): Promise<void> {
  console.log('[reset-passwords] Resetting all user passwords...\n');

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Reset admin password
  const adminResult = await prisma.user.updateMany({
    where: { email: 'admin@elis.local' },
    data: { passwordHash: adminHash },
  });
  console.log(`[reset-passwords] ✅ admin@elis.local → ${ADMIN_PASSWORD} (${adminResult.count} updated)`);

  // Reset all other users to Demo@1234
  const demoResult = await prisma.user.updateMany({
    where: { email: { not: 'admin@elis.local' } },
    data: { passwordHash: demoHash },
  });
  console.log(`[reset-passwords] ✅ All other users → ${DEMO_PASSWORD} (${demoResult.count} updated)`);

  // Print summary
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { email: true, role: true },
    orderBy: { role: 'asc' },
  });

  console.log('\n[reset-passwords] === User Credentials ===');
  console.log('─'.repeat(55));
  console.log('  Email'.padEnd(30) + 'Role'.padEnd(14) + 'Password');
  console.log('─'.repeat(55));
  for (const u of users) {
    const pw = u.email === 'admin@elis.local' ? ADMIN_PASSWORD : DEMO_PASSWORD;
    console.log(`  ${u.email.padEnd(28)} ${u.role.padEnd(12)} ${pw}`);
  }
  console.log('─'.repeat(55));
  console.log('\n[reset-passwords] Done! All users can now login.');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[reset-passwords] Error: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
