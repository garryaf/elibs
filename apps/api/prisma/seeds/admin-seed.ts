import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seeds the initial admin user for first-time deployment.
 * This user can then create other users via the Settings > Users UI.
 */
async function main(): Promise<void> {
  console.log('[admin-seed] Creating initial admin user...');

  const adminEmail = 'admin@elis.local';
  const adminPassword = 'Admin@1234';

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`[admin-seed] Admin user already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('[admin-seed] ✅ Admin user created successfully');
  console.log(`[admin-seed]    Email: ${adminEmail}`);
  console.log(`[admin-seed]    Password: ${adminPassword}`);
  console.log('[admin-seed]    Role: SUPER_ADMIN');
  console.log('[admin-seed] ⚠️  Change the password immediately after first login!');
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[admin-seed] Error: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
