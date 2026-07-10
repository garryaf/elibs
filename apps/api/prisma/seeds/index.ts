import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedMasterData } from './master-data-seed';
import { seedPermissions } from './permission-seed';

const prisma = new PrismaClient();

/**
 * Master seed script — creates essential data for first-time deployment.
 * 
 * What it seeds:
 * 1. Admin user (SUPER_ADMIN) for initial access
 * 2. Sample test categories and tests (optional, for demo)
 * 
 * For region data, run separately: ts-node prisma/seeds/region-seed.ts
 * (Region seed takes 10-30 minutes due to EMSIFA API calls)
 */
async function seedAdminUser(): Promise<void> {
  console.log('\n[seed] === Admin User ===');

  const adminEmail = 'admin@elis.local';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log(`[seed] Admin already exists: ${adminEmail}`);
    return;
  }

  const passwordHash = await bcrypt.hash('Admin@1234', 12);
  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('[seed] ✅ Admin created: admin@elis.local / Admin@1234');
}

async function seedSampleUsers(): Promise<void> {
  console.log('\n[seed] === Sample Users ===');

  const users = [
    { email: 'kasir@elis.local', name: 'Kasir Demo', role: 'KASIR' as const },
    { email: 'analis@elis.local', name: 'Analis Demo', role: 'ANALIS' as const },
    { email: 'dokter@elis.local', name: 'dr. Demo', role: 'DOKTER' as const },
    { email: 'sampling@elis.local', name: 'Petugas Sampling', role: 'SAMPLING' as const },
  ];

  const passwordHash = await bcrypt.hash('Demo@1234', 12);

  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      console.log(`[seed] User exists: ${user.email}`);
      continue;
    }
    await prisma.user.create({
      data: { ...user, passwordHash },
    });
    console.log(`[seed] ✅ Created: ${user.email} (${user.role})`);
  }
}

async function seedTestCategories(): Promise<void> {
  console.log('\n[seed] === Test Categories ===');

  const categories = [
    { name: 'Hematologi', description: 'Pemeriksaan darah lengkap' },
    { name: 'Kimia Klinik', description: 'Pemeriksaan kimia darah' },
    { name: 'Urinalisis', description: 'Pemeriksaan urin' },
    { name: 'Serologi', description: 'Pemeriksaan serologi dan imunologi' },
    { name: 'Mikrobiologi', description: 'Kultur dan sensitivitas' },
  ];

  for (const cat of categories) {
    const existing = await prisma.testCategory.findUnique({ where: { name: cat.name } });
    if (existing) {
      console.log(`[seed] Category exists: ${cat.name}`);
      continue;
    }
    await prisma.testCategory.create({ data: cat });
    console.log(`[seed] ✅ Created category: ${cat.name}`);
  }
}

async function main(): Promise<void> {
  console.log('[seed] Starting eLIS database seeding...');

  await seedAdminUser();
  await seedSampleUsers();
  await seedTestCategories();
  await seedMasterData();
  await seedPermissions();

  console.log('\n[seed] ✅ Seeding complete!');
  console.log('[seed] Accounts available:');
  console.log('[seed]   admin@elis.local / Admin@1234 (SUPER_ADMIN)');
  console.log('[seed]   kasir@elis.local / Demo@1234 (KASIR)');
  console.log('[seed]   analis@elis.local / Demo@1234 (ANALIS)');
  console.log('[seed]   dokter@elis.local / Demo@1234 (DOKTER)');
  console.log('[seed]   sampling@elis.local / Demo@1234 (SAMPLING)');
  console.log('\n[seed] For region data, run: ts-node prisma/seeds/region-seed.ts');
}

main()
  .catch((error: unknown) => {
    console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
