import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed default role hierarchy.
 * 
 * Hierarchy:
 * - SUPER_ADMIN (level 0) - top of hierarchy
 * - OWNER (level 1) - parentRole: SUPER_ADMIN
 * - MANAGER (level 2) - parentRole: OWNER
 * - ADMIN (level 3) - parentRole: MANAGER
 * - Operational roles (level 4) - parentRole: ADMIN
 *   - KASIR, SAMPLING, ANALIS, DOKTER, CS, MARKETING, KLINIK_PARTNER
 */
export async function seedRoleHierarchy(): Promise<void> {
  console.log('\n[seed] === Role Hierarchy ===');

  const hierarchyEntries: { role: Role; parentRole: Role | null; level: number }[] = [
    { role: Role.SUPER_ADMIN, parentRole: null, level: 0 },
    { role: Role.OWNER, parentRole: Role.SUPER_ADMIN, level: 1 },
    { role: Role.MANAGER, parentRole: Role.OWNER, level: 2 },
    { role: Role.ADMIN, parentRole: Role.MANAGER, level: 3 },
    // Operational roles at level 4 with parentRole = ADMIN
    { role: Role.KASIR, parentRole: Role.ADMIN, level: 4 },
    { role: Role.SAMPLING, parentRole: Role.ADMIN, level: 4 },
    { role: Role.ANALIS, parentRole: Role.ADMIN, level: 4 },
    { role: Role.DOKTER, parentRole: Role.ADMIN, level: 4 },
    { role: Role.CS, parentRole: Role.ADMIN, level: 4 },
    { role: Role.MARKETING, parentRole: Role.ADMIN, level: 4 },
    { role: Role.KLINIK_PARTNER, parentRole: Role.ADMIN, level: 4 },
  ];

  for (const entry of hierarchyEntries) {
    const existing = await prisma.roleHierarchy.findUnique({
      where: { role: entry.role },
    });

    if (existing) {
      console.log(`[seed] Role hierarchy exists: ${entry.role} (level ${entry.level})`);
      continue;
    }

    await prisma.roleHierarchy.create({
      data: {
        role: entry.role,
        parentRole: entry.parentRole,
        level: entry.level,
      },
    });
    console.log(
      `[seed] ✅ Created hierarchy: ${entry.role} → parent: ${entry.parentRole ?? 'none'} (level ${entry.level})`,
    );
  }
}

// Allow running standalone
if (require.main === module) {
  seedRoleHierarchy()
    .then(() => {
      console.log('[seed] ✅ Role hierarchy seeding complete!');
    })
    .catch((error) => {
      console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
