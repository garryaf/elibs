import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Core permissions for the eLIS RBAC system.
 * Organized by resource group with standard CRUD + domain-specific actions.
 */
interface PermissionDef {
  code: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

const PERMISSIONS: PermissionDef[] = [
  // === PATIENTS ===
  { code: 'patients.create', name: 'Buat Pasien Baru', description: 'Membuat data pasien baru', resource: 'patients', action: 'create' },
  { code: 'patients.read', name: 'Lihat Data Pasien', description: 'Melihat daftar dan detail pasien', resource: 'patients', action: 'read' },
  { code: 'patients.update', name: 'Ubah Data Pasien', description: 'Mengubah data pasien', resource: 'patients', action: 'update' },
  { code: 'patients.delete', name: 'Hapus Pasien', description: 'Menghapus data pasien (soft delete)', resource: 'patients', action: 'delete' },
  { code: 'patients.export', name: 'Ekspor Data Pasien', description: 'Mengekspor data pasien ke file', resource: 'patients', action: 'export' },

  // === ORDERS ===
  { code: 'orders.create', name: 'Buat Order Baru', description: 'Membuat order pemeriksaan baru', resource: 'orders', action: 'create' },
  { code: 'orders.read', name: 'Lihat Order', description: 'Melihat daftar dan detail order', resource: 'orders', action: 'read' },
  { code: 'orders.update', name: 'Ubah Order', description: 'Mengubah data order', resource: 'orders', action: 'update' },
  { code: 'orders.cancel', name: 'Batalkan Order', description: 'Membatalkan order', resource: 'orders', action: 'cancel' },
  { code: 'orders.approve', name: 'Setujui Order', description: 'Menyetujui order (approval workflow)', resource: 'orders', action: 'approve' },
  { code: 'orders.export', name: 'Ekspor Data Order', description: 'Mengekspor data order ke file', resource: 'orders', action: 'export' },

  // === LAB WORKFLOW ===
  { code: 'lab.collect-sample', name: 'Ambil Sampel', description: 'Melakukan pengambilan sampel', resource: 'lab', action: 'create' },
  { code: 'lab.enter-result', name: 'Input Hasil', description: 'Menginput hasil pemeriksaan', resource: 'lab', action: 'update' },
  { code: 'lab.verify', name: 'Verifikasi Hasil', description: 'Memverifikasi hasil pemeriksaan (analis)', resource: 'lab', action: 'verify' },
  { code: 'lab.approve', name: 'Approve Hasil', description: 'Menyetujui hasil pemeriksaan (dokter)', resource: 'lab', action: 'approve' },
  { code: 'lab.read', name: 'Lihat Workflow Lab', description: 'Melihat status workflow laboratorium', resource: 'lab', action: 'read' },
  { code: 'lab.reject', name: 'Tolak Sampel', description: 'Menolak sampel yang tidak memenuhi syarat', resource: 'lab', action: 'cancel' },

  // === USERS ===
  { code: 'users.create', name: 'Buat User Baru', description: 'Membuat akun user baru', resource: 'users', action: 'create' },
  { code: 'users.read', name: 'Lihat Data User', description: 'Melihat daftar dan detail user', resource: 'users', action: 'read' },
  { code: 'users.update', name: 'Ubah Data User', description: 'Mengubah data user', resource: 'users', action: 'update' },
  { code: 'users.delete', name: 'Hapus User', description: 'Menghapus akun user', resource: 'users', action: 'delete' },

  // === MASTER DATA ===
  { code: 'master-data.create', name: 'Buat Master Data', description: 'Membuat data master (test, kategori, panel)', resource: 'master-data', action: 'create' },
  { code: 'master-data.read', name: 'Lihat Master Data', description: 'Melihat data master', resource: 'master-data', action: 'read' },
  { code: 'master-data.update', name: 'Ubah Master Data', description: 'Mengubah data master', resource: 'master-data', action: 'update' },
  { code: 'master-data.delete', name: 'Hapus Master Data', description: 'Menghapus data master (soft delete)', resource: 'master-data', action: 'delete' },
  { code: 'master-data.export', name: 'Ekspor Master Data', description: 'Mengekspor data master ke file', resource: 'master-data', action: 'export' },

  // === DASHBOARD ===
  { code: 'dashboard.read', name: 'Lihat Dashboard', description: 'Melihat data dashboard', resource: 'dashboard', action: 'read' },
  { code: 'dashboard.export', name: 'Ekspor Dashboard', description: 'Mengekspor data dashboard', resource: 'dashboard', action: 'export' },

  // === REPORTS ===
  { code: 'reports.read', name: 'Lihat Laporan', description: 'Melihat laporan', resource: 'reports', action: 'read' },
  { code: 'reports.create', name: 'Buat Laporan', description: 'Membuat laporan baru', resource: 'reports', action: 'create' },
  { code: 'reports.export', name: 'Ekspor Laporan', description: 'Mengekspor laporan ke file', resource: 'reports', action: 'export' },

  // === AUDIT ===
  { code: 'audit.read', name: 'Lihat Audit Trail', description: 'Melihat log audit trail', resource: 'audit', action: 'read' },
  { code: 'audit.export', name: 'Ekspor Audit Trail', description: 'Mengekspor audit trail', resource: 'audit', action: 'export' },

  // === SETTINGS ===
  { code: 'settings.read', name: 'Lihat Pengaturan', description: 'Melihat pengaturan sistem', resource: 'settings', action: 'read' },
  { code: 'settings.update', name: 'Ubah Pengaturan', description: 'Mengubah pengaturan sistem', resource: 'settings', action: 'update' },

  // === REGIONS ===
  { code: 'regions.read', name: 'Lihat Data Wilayah', description: 'Melihat data wilayah (provinsi, kota, kecamatan)', resource: 'regions', action: 'read' },
  { code: 'regions.create', name: 'Buat Data Wilayah', description: 'Menambah data wilayah', resource: 'regions', action: 'create' },
  { code: 'regions.update', name: 'Ubah Data Wilayah', description: 'Mengubah data wilayah', resource: 'regions', action: 'update' },
  { code: 'regions.delete', name: 'Hapus Data Wilayah', description: 'Menghapus data wilayah', resource: 'regions', action: 'delete' },
  { code: 'regions.export', name: 'Ekspor Data Wilayah', description: 'Mengekspor data wilayah', resource: 'regions', action: 'export' },

  // === NOTIFICATIONS ===
  { code: 'notifications.read', name: 'Lihat Notifikasi', description: 'Melihat log notifikasi', resource: 'notifications', action: 'read' },
  { code: 'notifications.create', name: 'Kirim Notifikasi', description: 'Mengirim notifikasi ke pasien', resource: 'notifications', action: 'create' },
  { code: 'notifications.update', name: 'Ubah Pengaturan Notifikasi', description: 'Mengubah pengaturan notifikasi', resource: 'notifications', action: 'update' },

  // === BATCH INVOICES ===
  { code: 'batch-invoices.create', name: 'Buat Invoice Batch', description: 'Membuat invoice batch untuk asuransi', resource: 'batch-invoices', action: 'create' },
  { code: 'batch-invoices.read', name: 'Lihat Invoice Batch', description: 'Melihat daftar invoice batch', resource: 'batch-invoices', action: 'read' },
  { code: 'batch-invoices.update', name: 'Ubah Invoice Batch', description: 'Mengubah invoice batch', resource: 'batch-invoices', action: 'update' },
  { code: 'batch-invoices.delete', name: 'Hapus Invoice Batch', description: 'Menghapus/membatalkan invoice batch', resource: 'batch-invoices', action: 'delete' },
  { code: 'batch-invoices.approve', name: 'Setujui Invoice Batch', description: 'Menyetujui dan mengirim invoice batch', resource: 'batch-invoices', action: 'approve' },
  { code: 'batch-invoices.export', name: 'Ekspor Invoice Batch', description: 'Mengekspor invoice batch ke file', resource: 'batch-invoices', action: 'export' },

  // === TARIFFS ===
  { code: 'tariffs.create', name: 'Buat Tarif', description: 'Membuat tarif baru', resource: 'tariffs', action: 'create' },
  { code: 'tariffs.read', name: 'Lihat Tarif', description: 'Melihat daftar tarif', resource: 'tariffs', action: 'read' },
  { code: 'tariffs.update', name: 'Ubah Tarif', description: 'Mengubah tarif', resource: 'tariffs', action: 'update' },
  { code: 'tariffs.delete', name: 'Hapus Tarif', description: 'Menghapus tarif', resource: 'tariffs', action: 'delete' },

  // === EQUIPMENT ===
  { code: 'equipment.create', name: 'Buat Data Alat', description: 'Menambahkan alat laboratorium', resource: 'equipment', action: 'create' },
  { code: 'equipment.read', name: 'Lihat Data Alat', description: 'Melihat data alat laboratorium', resource: 'equipment', action: 'read' },
  { code: 'equipment.update', name: 'Ubah Data Alat', description: 'Mengubah data alat laboratorium', resource: 'equipment', action: 'update' },
  { code: 'equipment.delete', name: 'Hapus Data Alat', description: 'Menghapus data alat laboratorium', resource: 'equipment', action: 'delete' },

  // === REAGENTS ===
  { code: 'reagents.create', name: 'Buat Data Reagen', description: 'Menambahkan data reagen', resource: 'reagents', action: 'create' },
  { code: 'reagents.read', name: 'Lihat Data Reagen', description: 'Melihat data reagen', resource: 'reagents', action: 'read' },
  { code: 'reagents.update', name: 'Ubah Data Reagen', description: 'Mengubah data reagen', resource: 'reagents', action: 'update' },
  { code: 'reagents.delete', name: 'Hapus Data Reagen', description: 'Menghapus data reagen', resource: 'reagents', action: 'delete' },
];

/**
 * Role-permission mapping.
 * SUPER_ADMIN gets ALL permissions (handled dynamically).
 * ADMIN gets most permissions except user.delete and system-level settings.
 */
const ADMIN_EXCLUDED_PERMISSIONS = [
  'users.delete',
  'settings.update',
  'audit.export',
];

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  // ADMIN gets everything except excluded
  ADMIN: PERMISSIONS
    .map((p) => p.code)
    .filter((code) => !ADMIN_EXCLUDED_PERMISSIONS.includes(code)),

  // KASIR: patient registration, orders, payments
  KASIR: [
    'patients.create', 'patients.read', 'patients.update',
    'orders.create', 'orders.read', 'orders.update', 'orders.cancel',
    'batch-invoices.read',
    'dashboard.read',
    'master-data.read',
    'tariffs.read',
    'regions.read',
  ],

  // SAMPLING: sample collection workflow
  SAMPLING: [
    'patients.read',
    'orders.read',
    'lab.collect-sample', 'lab.read', 'lab.reject',
    'dashboard.read',
    'master-data.read',
  ],

  // ANALIS: lab result entry + verification
  ANALIS: [
    'patients.read',
    'orders.read',
    'lab.enter-result', 'lab.verify', 'lab.read',
    'dashboard.read',
    'master-data.read',
    'equipment.read',
    'reagents.read',
  ],

  // DOKTER: approval workflow + reading
  DOKTER: [
    'patients.read',
    'orders.read',
    'lab.approve', 'lab.read',
    'dashboard.read',
    'reports.read',
    'master-data.read',
  ],

  // CS: patient registration + order status checking
  CS: [
    'patients.create', 'patients.read', 'patients.update',
    'orders.create', 'orders.read',
    'notifications.read', 'notifications.create',
    'dashboard.read',
    'master-data.read',
    'regions.read',
  ],

  // OWNER: read-only dashboard + reports
  OWNER: [
    'patients.read',
    'orders.read',
    'dashboard.read', 'dashboard.export',
    'reports.read', 'reports.export',
    'audit.read',
    'master-data.read',
    'batch-invoices.read',
  ],

  // MANAGER: broad read + some management
  MANAGER: [
    'patients.read', 'patients.export',
    'orders.read', 'orders.export',
    'lab.read',
    'dashboard.read', 'dashboard.export',
    'reports.read', 'reports.create', 'reports.export',
    'audit.read', 'audit.export',
    'master-data.read',
    'batch-invoices.read', 'batch-invoices.export',
    'settings.read',
    'tariffs.read',
  ],

  // MARKETING: limited access for partner management
  MARKETING: [
    'patients.read',
    'orders.read',
    'dashboard.read',
    'reports.read',
    'master-data.read',
    'batch-invoices.read',
  ],

  // KLINIK_PARTNER: external partner limited access
  KLINIK_PARTNER: [
    'patients.create', 'patients.read',
    'orders.create', 'orders.read',
    'lab.read',
    'dashboard.read',
    'master-data.read',
  ],
};

export async function seedPermissions(): Promise<void> {
  console.log('\n[seed] === RBAC Permissions ===');

  // Seed all permissions
  let createdCount = 0;
  for (const perm of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { code: perm.code } });
    if (existing) {
      continue;
    }
    await prisma.permission.create({ data: perm });
    createdCount++;
  }
  console.log(`[seed] ✅ Permissions: ${createdCount} created, ${PERMISSIONS.length - createdCount} already existed`);

  // Seed SUPER_ADMIN: gets ALL permissions
  console.log('[seed] Assigning SUPER_ADMIN → ALL permissions...');
  const allPermissions = await prisma.permission.findMany({ select: { id: true } });
  let superAdminCount = 0;
  for (const perm of allPermissions) {
    const existing = await prisma.rolePermission.findUnique({
      where: { role_permissionId: { role: 'SUPER_ADMIN', permissionId: perm.id } },
    });
    if (!existing) {
      await prisma.rolePermission.create({
        data: { role: 'SUPER_ADMIN', permissionId: perm.id, isGranted: true },
      });
      superAdminCount++;
    }
  }
  console.log(`[seed] ✅ SUPER_ADMIN: ${superAdminCount} new assignments`);

  // Seed other roles
  for (const [roleName, permCodes] of Object.entries(ROLE_PERMISSION_MAP)) {
    let roleCount = 0;
    for (const code of permCodes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) {
        console.warn(`[seed] ⚠️ Permission not found: ${code}`);
        continue;
      }
      const existing = await prisma.rolePermission.findUnique({
        where: { role_permissionId: { role: roleName as Role, permissionId: permission.id } },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: { role: roleName as Role, permissionId: permission.id, isGranted: true },
        });
        roleCount++;
      }
    }
    console.log(`[seed] ✅ ${roleName}: ${roleCount} new assignments (${permCodes.length} total)`);
  }

  console.log(`[seed] ✅ RBAC seeding complete — ${PERMISSIONS.length} permissions across ${Object.keys(ROLE_PERMISSION_MAP).length + 1} roles`);
}
