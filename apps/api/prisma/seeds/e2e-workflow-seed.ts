/**
 * E2E Workflow Testing Seed
 * 
 * Membuat data testing end-to-end yang mensimulasikan alur kerja laboratorium nyata:
 * 1. Buat users dengan berbagai role
 * 2. Isi master data dengan data real klinik lab
 * 3. Registrasi 5-6 pasien satu per satu
 * 4. Buat visit & order per pasien dengan berbagai metode bayar
 * 5. Proses sampling → analisis → verifikasi → approval → billing → bayar
 * 
 * User pertama: admin@elis.local / Admin@1234 (sudah ada dari seed utama)
 * 
 * Cara jalankan:
 *   npx ts-node prisma/seeds/e2e-workflow-seed.ts
 */

import {
  PrismaClient,
  Gender,
  InsuranceType,
  PaymentMethod,
  OrderStatus,
  VisitStatus,
  OrderDetailStatus,
  SampleCondition,
  Flag,
  EquipmentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ════════════════════════════════════════════════════════════════════════════════
// STEP 1: USERS — Buat user dengan berbagai role
// ════════════════════════════════════════════════════════════════════════════════

async function seedUsers(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 1: Membuat Users Berbagai Role     ║');
  console.log('╚══════════════════════════════════════════╝');

  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const adminHash = await bcrypt.hash('Admin@1234', 12);

  const users = [
    // Admin utama (sudah ada, tapi kita pastikan)
    { email: 'admin@elis.local', name: 'Administrator Utama', role: 'SUPER_ADMIN' as const, hash: adminHash },
    // CS / Front desk — registrasi pasien & visit
    { email: 'cs.rina@elis.local', name: 'Rina Sari (CS)', role: 'CS' as const, hash: passwordHash },
    // Kasir — pembayaran
    { email: 'kasir.dian@elis.local', name: 'Dian Permata (Kasir)', role: 'KASIR' as const, hash: passwordHash },
    // Petugas Sampling — pengambilan sampel
    { email: 'sampling.agus@elis.local', name: 'Agus Prasetyo (Sampling)', role: 'SAMPLING' as const, hash: passwordHash },
    // Analis Lab — input hasil
    { email: 'analis.maya@elis.local', name: 'Maya Kusuma (Analis)', role: 'ANALIS' as const, hash: passwordHash },
    { email: 'analis.budi@elis.local', name: 'Budi Santoso (Analis Senior)', role: 'ANALIS' as const, hash: passwordHash },
    // Dokter — verifikasi & approval
    { email: 'dokter.ahmad@elis.local', name: 'dr. Ahmad Fauzi, Sp.PK', role: 'DOKTER' as const, hash: passwordHash },
    // Manager — oversight
    { email: 'manager.siti@elis.local', name: 'Siti Rahmawati (Manager Lab)', role: 'MANAGER' as const, hash: passwordHash },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`[user] Sudah ada: ${u.email} (${u.role})`);
      continue;
    }
    await prisma.user.create({
      data: { email: u.email, name: u.name, role: u.role, passwordHash: u.hash },
    });
    console.log(`[user] ✅ Created: ${u.email} / Demo@1234 (${u.role})`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// STEP 2: MASTER DATA — Data real laboratorium klinik
// ════════════════════════════════════════════════════════════════════════════════

async function seedMasterDataReal(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 2: Master Data Real Laboratorium   ║');
  console.log('╚══════════════════════════════════════════╝');

  // --- Doctors ---
  console.log('\n[master] === Dokter Perujuk ===');
  const doctors = [
    { code: 'DR-PK01', name: 'dr. Ahmad Fauzi, Sp.PK', specialization: 'Patologi Klinik', phone: '08123456001', licenseNumber: 'SIP-3201/2024/001' },
    { code: 'DR-PD01', name: 'dr. Budi Hartono, Sp.PD', specialization: 'Penyakit Dalam', phone: '08123456002', licenseNumber: 'SIP-3201/2024/002' },
    { code: 'DR-AN01', name: 'dr. Dewi Lestari, Sp.A', specialization: 'Anak', phone: '08123456003', licenseNumber: 'SIP-3201/2024/003' },
    { code: 'DR-OG01', name: 'dr. Fitri Handayani, Sp.OG', specialization: 'Obstetri & Ginekologi', phone: '08123456004', licenseNumber: 'SIP-3201/2024/004' },
    { code: 'DR-UM01', name: 'dr. Rudi Setiawan', specialization: 'Dokter Umum', phone: '08123456005', licenseNumber: 'SIP-3201/2024/005' },
    { code: 'DR-UM02', name: 'dr. Nina Marlina', specialization: 'Dokter Umum (IGD)', phone: '08123456006', licenseNumber: 'SIP-3201/2024/006' },
  ];
  for (const doc of doctors) {
    await prisma.doctor.upsert({ where: { code: doc.code }, update: doc, create: { ...doc, isActive: true } });
  }
  console.log(`[master] ✅ ${doctors.length} dokter perujuk`);

  // --- Clinics / Poli ---
  console.log('\n[master] === Klinik / Poli ===');
  const clinics = [
    { code: 'POL-IPD', name: 'Poliklinik Penyakit Dalam', address: 'Gedung A Lt. 1', phone: 'Ext 101' },
    { code: 'POL-ANK', name: 'Poliklinik Anak', address: 'Gedung A Lt. 1', phone: 'Ext 102' },
    { code: 'POL-OBG', name: 'Poliklinik Kebidanan', address: 'Gedung B Lt. 2', phone: 'Ext 201' },
    { code: 'IGD-001', name: 'Instalasi Gawat Darurat', address: 'Gedung Utama Lt. Dasar', phone: 'Ext 118' },
    { code: 'MCU-001', name: 'Medical Check Up', address: 'Gedung C Lt. 1', phone: 'Ext 301' },
    { code: 'RWI-001', name: 'Rawat Inap Kelas 1', address: 'Gedung D Lt. 3', phone: 'Ext 401' },
  ];
  for (const cli of clinics) {
    await prisma.clinic.upsert({ where: { code: cli.code }, update: cli, create: { ...cli, isActive: true } });
  }
  console.log(`[master] ✅ ${clinics.length} klinik/poli`);

  // --- Insurances ---
  console.log('\n[master] === Asuransi ===');
  const insurances = [
    { code: 'INS-BPJS', name: 'BPJS Kesehatan', type: InsuranceType.BPJS, phone: '1500400', email: 'info@bpjs-kesehatan.go.id' },
    { code: 'INS-PRDN', name: 'Prudential Life Assurance', type: InsuranceType.SWASTA, phone: '1500085', email: 'customer.id@prudential.co.id' },
    { code: 'INS-ALIZ', name: 'Allianz Life Indonesia', type: InsuranceType.SWASTA, phone: '1500136', email: 'contactus@allianz.co.id' },
    { code: 'INS-MINH', name: 'Mandiri Inhealth', type: InsuranceType.SWASTA, phone: '14022', email: 'info@mandiriinhealth.co.id' },
    { code: 'COR-TLKM', name: 'PT Telkom Indonesia (Corporate)', type: InsuranceType.CORPORATE, phone: '021-1500133', email: 'corporate@telkom.co.id' },
    { code: 'COR-PTRN', name: 'PT Pertamina (Persero)', type: InsuranceType.CORPORATE, phone: '1500000', email: 'pcc@pertamina.com' },
  ];
  for (const ins of insurances) {
    await prisma.insurance.upsert({ where: { code: ins.code }, update: ins, create: { ...ins, isActive: true } });
  }
  console.log(`[master] ✅ ${insurances.length} asuransi`);

  // --- Test Categories ---
  console.log('\n[master] === Kategori Pemeriksaan ===');
  const categories = [
    { name: 'Hematologi', description: 'Pemeriksaan darah lengkap, hitung jenis, koagulasi' },
    { name: 'Kimia Klinik', description: 'Fungsi hati, ginjal, profil lipid, glukosa, elektrolit' },
    { name: 'Imunoserologi', description: 'Hepatitis marker, HIV, dengue, typhoid' },
    { name: 'Urinalisis', description: 'Pemeriksaan urin rutin & sedimen' },
    { name: 'Endokrinologi', description: 'Hormon tiroid, reproduksi, metabolik' },
    { name: 'Koagulasi', description: 'PT, APTT, INR, fibrinogen' },
  ];
  for (const cat of categories) {
    await prisma.testCategory.upsert({ where: { name: cat.name }, update: { description: cat.description }, create: cat });
  }
  console.log(`[master] ✅ ${categories.length} kategori`);

  // --- Test Master with Reference Values ---
  console.log('\n[master] === Pemeriksaan Lab & Nilai Referensi ===');
  const allCategories = await prisma.testCategory.findMany();
  const catMap = new Map(allCategories.map((c) => [c.name, c.id]));

  type RefDef = { gender: Gender; minAge: number; maxAge: number; minRef: number; maxRef: number; criticalMin?: number; criticalMax?: number };
  const tests: Array<{
    code: string; name: string; category: string; price: number; unit: string; sampleType: string;
    method?: string; requiresDoctorApproval: boolean; tatMinutes: number; refs: RefDef[];
  }> = [
    // HEMATOLOGI
    { code: 'HEM-CBC01', name: 'Hemoglobin (Hb)', category: 'Hematologi', price: 35000, unit: 'g/dL', sampleType: 'EDTA', method: 'Impedansi', requiresDoctorApproval: false, tatMinutes: 60,
      refs: [
        { gender: Gender.MALE, minAge: 15, maxAge: 150, minRef: 13.0, maxRef: 17.5, criticalMin: 7.0, criticalMax: 20.0 },
        { gender: Gender.FEMALE, minAge: 15, maxAge: 150, minRef: 12.0, maxRef: 15.5, criticalMin: 7.0, criticalMax: 20.0 },
        { gender: Gender.MALE, minAge: 0, maxAge: 14, minRef: 11.0, maxRef: 16.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 14, minRef: 11.0, maxRef: 16.0 },
      ] },
    { code: 'HEM-CBC02', name: 'Leukosit (WBC)', category: 'Hematologi', price: 35000, unit: '10^3/µL', sampleType: 'EDTA', method: 'Impedansi', requiresDoctorApproval: false, tatMinutes: 60,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 10.0, criticalMin: 2.0, criticalMax: 30.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 10.0, criticalMin: 2.0, criticalMax: 30.0 },
      ] },
    { code: 'HEM-CBC03', name: 'Trombosit (PLT)', category: 'Hematologi', price: 35000, unit: '10^3/µL', sampleType: 'EDTA', method: 'Impedansi', requiresDoctorApproval: false, tatMinutes: 60,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 1000 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 1000 },
      ] },
    { code: 'HEM-CBC04', name: 'Hematokrit (Ht)', category: 'Hematologi', price: 30000, unit: '%', sampleType: 'EDTA', method: 'Impedansi', requiresDoctorApproval: false, tatMinutes: 60,
      refs: [
        { gender: Gender.MALE, minAge: 15, maxAge: 150, minRef: 40, maxRef: 54 },
        { gender: Gender.FEMALE, minAge: 15, maxAge: 150, minRef: 36, maxRef: 47 },
      ] },
    { code: 'HEM-CBC05', name: 'Eritrosit (RBC)', category: 'Hematologi', price: 35000, unit: '10^6/µL', sampleType: 'EDTA', method: 'Impedansi', requiresDoctorApproval: false, tatMinutes: 60,
      refs: [
        { gender: Gender.MALE, minAge: 15, maxAge: 150, minRef: 4.5, maxRef: 5.9 },
        { gender: Gender.FEMALE, minAge: 15, maxAge: 150, minRef: 4.0, maxRef: 5.2 },
      ] },
    { code: 'HEM-LED', name: 'LED (Laju Endap Darah)', category: 'Hematologi', price: 25000, unit: 'mm/jam', sampleType: 'EDTA', method: 'Westergren', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 10 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 20 },
      ] },
    // KIMIA KLINIK
    { code: 'KIM-GDP', name: 'Glukosa Puasa (GDP)', category: 'Kimia Klinik', price: 45000, unit: 'mg/dL', sampleType: 'SST', method: 'Enzimatik (GOD-PAP)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 70, maxRef: 100, criticalMin: 40, criticalMax: 400 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 70, maxRef: 100, criticalMin: 40, criticalMax: 400 },
      ] },
    { code: 'KIM-GD2J', name: 'Glukosa 2 Jam PP', category: 'Kimia Klinik', price: 45000, unit: 'mg/dL', sampleType: 'SST', method: 'Enzimatik (GOD-PAP)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 70, maxRef: 140 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 70, maxRef: 140 },
      ] },
    { code: 'KIM-SGOT', name: 'SGOT (AST)', category: 'Kimia Klinik', price: 55000, unit: 'U/L', sampleType: 'SST', method: 'Kinetik (IFCC)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 5, maxRef: 40, criticalMin: undefined, criticalMax: 500 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 5, maxRef: 32, criticalMin: undefined, criticalMax: 500 },
      ] },
    { code: 'KIM-SGPT', name: 'SGPT (ALT)', category: 'Kimia Klinik', price: 55000, unit: 'U/L', sampleType: 'SST', method: 'Kinetik (IFCC)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 7, maxRef: 56, criticalMin: undefined, criticalMax: 1000 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 7, maxRef: 45, criticalMin: undefined, criticalMax: 1000 },
      ] },
    { code: 'KIM-UREM', name: 'Ureum (BUN)', category: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'SST', method: 'Enzimatik', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 15, maxRef: 43, criticalMin: undefined, criticalMax: 100 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 15, maxRef: 43, criticalMin: undefined, criticalMax: 100 },
      ] },
    { code: 'KIM-KREA', name: 'Kreatinin', category: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'SST', method: 'Jaffe/Enzimatik', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0.7, maxRef: 1.3, criticalMin: undefined, criticalMax: 10.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0.6, maxRef: 1.1, criticalMin: undefined, criticalMax: 10.0 },
      ] },
    { code: 'KIM-CHOL', name: 'Kolesterol Total', category: 'Kimia Klinik', price: 55000, unit: 'mg/dL', sampleType: 'SST', method: 'Enzimatik (CHOD-PAP)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 200 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 200 },
      ] },
    { code: 'KIM-TRIG', name: 'Trigliserida', category: 'Kimia Klinik', price: 55000, unit: 'mg/dL', sampleType: 'SST', method: 'Enzimatik (GPO-PAP)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 150 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 150 },
      ] },
    { code: 'KIM-ASUR', name: 'Asam Urat', category: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'SST', method: 'Enzimatik (Uricase)', requiresDoctorApproval: false, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 3.5, maxRef: 7.2 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 2.6, maxRef: 6.0 },
      ] },
    // IMUNOSEROLOGI
    { code: 'SER-HBSAG', name: 'HBsAg (Rapid)', category: 'Imunoserologi', price: 85000, unit: 'Reaktif/Non-Reaktif', sampleType: 'SST', method: 'Immunochromatography', requiresDoctorApproval: true, tatMinutes: 30,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0.99 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0.99 },
      ] },
    { code: 'SER-WIDAL', name: 'Widal (S. Typhi O & H)', category: 'Imunoserologi', price: 80000, unit: 'Titer', sampleType: 'SST', method: 'Aglutinasi', requiresDoctorApproval: false, tatMinutes: 60,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 80 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 80 },
      ] },
    // URINALISIS
    { code: 'URI-RTIN', name: 'Urinalisis Rutin (Dipstick)', category: 'Urinalisis', price: 35000, unit: '-', sampleType: 'URINE', method: 'Dipstick', requiresDoctorApproval: false, tatMinutes: 30,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0 },
      ] },
    // KOAGULASI
    { code: 'KOA-PT', name: 'PT (Prothrombin Time)', category: 'Koagulasi', price: 95000, unit: 'sec', sampleType: 'CITRATE', method: 'Koagulometri', requiresDoctorApproval: true, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 10.0, maxRef: 13.5, criticalMin: undefined, criticalMax: 30.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 10.0, maxRef: 13.5, criticalMin: undefined, criticalMax: 30.0 },
      ] },
    { code: 'KOA-APTT', name: 'APTT', category: 'Koagulasi', price: 95000, unit: 'sec', sampleType: 'CITRATE', method: 'Koagulometri', requiresDoctorApproval: true, tatMinutes: 120,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 25.0, maxRef: 35.0, criticalMin: undefined, criticalMax: 60.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 25.0, maxRef: 35.0, criticalMin: undefined, criticalMax: 60.0 },
      ] },
  ];

  let testCount = 0;
  for (const t of tests) {
    const categoryId = catMap.get(t.category);
    if (!categoryId) { console.log(`[master] ⚠️ Category missing: ${t.category}`); continue; }

    const upserted = await prisma.testMaster.upsert({
      where: { code: t.code },
      update: { name: t.name, categoryId, price: t.price, unit: t.unit, sampleType: t.sampleType, method: t.method, requiresDoctorApproval: t.requiresDoctorApproval, tatMinutes: t.tatMinutes, tatCategory: 'ROUTINE', isActive: true },
      create: { code: t.code, name: t.name, categoryId, price: t.price, unit: t.unit, sampleType: t.sampleType, method: t.method, requiresDoctorApproval: t.requiresDoctorApproval, tatMinutes: t.tatMinutes, tatCategory: 'ROUTINE', isActive: true },
    });

    for (const ref of t.refs) {
      await prisma.referenceValue.upsert({
        where: { testId_gender_ageUnit_minAge_maxAge: { testId: upserted.id, gender: ref.gender, ageUnit: "YEARS", minAge: ref.minAge, maxAge: ref.maxAge } },
        update: { minRef: ref.minRef, maxRef: ref.maxRef, criticalMin: ref.criticalMin ?? null, criticalMax: ref.criticalMax ?? null },
        create: { testId: upserted.id, gender: ref.gender, minAge: ref.minAge, maxAge: ref.maxAge, minRef: ref.minRef, maxRef: ref.maxRef, criticalMin: ref.criticalMin ?? null, criticalMax: ref.criticalMax ?? null },
      });
    }
    testCount++;
  }
  console.log(`[master] ✅ ${testCount} pemeriksaan lab + nilai referensi`);

  // --- Equipment ---
  console.log('\n[master] === Alat Laboratorium ===');
  const equipments = [
    { code: 'EQP-HEM01', name: 'Mindray BC-5380 (Hematology)', manufacturer: 'Mindray', model: 'BC-5380', serialNumber: 'BC5380-2024-001', location: 'Lab Hematologi', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-CHM01', name: 'Mindray BS-480 (Chemistry)', manufacturer: 'Mindray', model: 'BS-480', serialNumber: 'BS480-2024-001', location: 'Lab Kimia Klinik', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-CTF01', name: 'Hettich EBA 200S (Centrifuge)', manufacturer: 'Hettich', model: 'EBA 200S', serialNumber: 'EBA200S-2024-001', location: 'Area Pre-Analitik', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-COA01', name: 'Sysmex CA-660 (Coagulation)', manufacturer: 'Sysmex', model: 'CA-660', serialNumber: 'CA660-2024-001', location: 'Lab Hematologi', status: EquipmentStatus.ACTIVE },
  ];
  for (const eq of equipments) {
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: eq,
      create: { ...eq, isActive: true, lastCalibration: new Date('2026-07-01'), nextCalibration: new Date('2027-01-01') },
    });
  }
  console.log(`[master] ✅ ${equipments.length} alat`);

  // --- Sample Types ---
  console.log('\n[master] === Jenis Sampel ===');
  const sampleTypes = [
    { code: 'EDTA', name: 'Darah EDTA (Whole Blood)', container: 'Tabung tutup ungu (K3-EDTA 3mL)', instructions: 'Homogenisasi 8-10x inversi. Jangan dikocok keras.' },
    { code: 'SST', name: 'Serum (SST)', container: 'Tabung tutup kuning (SST/Gel 5mL)', instructions: 'Diamkan 30 menit, sentrifugasi 3000 rpm 10 menit.' },
    { code: 'CITRATE', name: 'Plasma Citrate', container: 'Tabung tutup biru (Na-Citrate 3.2%)', instructions: 'Isi tepat garis batas. Rasio darah:citrate = 9:1.' },
    { code: 'URINE', name: 'Urin Porsi Tengah', container: 'Cup urin steril 60mL', instructions: 'Midstream, pagi hari. Kirim ke lab < 1 jam.' },
    { code: 'NaF', name: 'Plasma NaF (Glukosa)', container: 'Tabung tutup abu-abu (NaF/KOx)', instructions: 'Untuk pemeriksaan glukosa. Anti-glikolisis.' },
  ];
  for (const st of sampleTypes) {
    const existing = await prisma.sampleTypeMaster.findFirst({ where: { code: st.code } });
    if (!existing) await prisma.sampleTypeMaster.create({ data: st });
  }
  console.log(`[master] ✅ ${sampleTypes.length} jenis sampel`);
}

// ════════════════════════════════════════════════════════════════════════════════
// STEP 3: PASIEN — Registrasi 6 pasien dengan kondisi berbeda
// ════════════════════════════════════════════════════════════════════════════════

interface PatientDef {
  mrn: string;
  nik: string;
  name: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  address: string;
  bloodType?: string;
  insurance?: { code: string; memberNumber: string; type: InsuranceType; priority: number };
}

async function seedPatients(): Promise<string[]> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 3: Registrasi 6 Pasien            ║');
  console.log('╚══════════════════════════════════════════╝');

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const patients: PatientDef[] = [
    {
      mrn: `MRN-${ym}-E2E01`, nik: '3201150708850001',
      name: 'Hendra Wijaya', dateOfBirth: new Date('1985-08-07'), gender: Gender.MALE,
      phone: '081234567001', address: 'Jl. Sudirman No. 45, Bekasi', bloodType: 'O',
      insurance: { code: 'INS-BPJS', memberNumber: '0001234567890', type: InsuranceType.BPJS, priority: 1 },
    },
    {
      mrn: `MRN-${ym}-E2E02`, nik: '3201231205900002',
      name: 'Siti Aminah', dateOfBirth: new Date('1990-05-12'), gender: Gender.FEMALE,
      phone: '081234567002', address: 'Jl. Gatot Subroto No. 12, Jakarta Selatan', bloodType: 'B',
      insurance: { code: 'INS-PRDN', memberNumber: 'PRU-2024-789456', type: InsuranceType.SWASTA, priority: 1 },
    },
    {
      mrn: `MRN-${ym}-E2E03`, nik: '3201010312780003',
      name: 'Bambang Susanto', dateOfBirth: new Date('1978-12-03'), gender: Gender.MALE,
      phone: '081234567003', address: 'Jl. Thamrin No. 88, Jakarta Pusat', bloodType: 'A',
      // CASH — tanpa asuransi
    },
    {
      mrn: `MRN-${ym}-E2E04`, nik: '3201452509950004',
      name: 'Dewi Kartika', dateOfBirth: new Date('1995-09-25'), gender: Gender.FEMALE,
      phone: '081234567004', address: 'Jl. Pahlawan No. 7, Tangerang',
      insurance: { code: 'COR-TLKM', memberNumber: 'TLKM-EMP-2024-0456', type: InsuranceType.CORPORATE, priority: 1 },
    },
    {
      mrn: `MRN-${ym}-E2E05`, nik: '3201680104600005',
      name: 'Sutrisno', dateOfBirth: new Date('1960-04-01'), gender: Gender.MALE,
      phone: '081234567005', address: 'Jl. Diponegoro No. 23, Depok', bloodType: 'AB',
      insurance: { code: 'INS-BPJS', memberNumber: '0001234567891', type: InsuranceType.BPJS, priority: 1 },
    },
    {
      mrn: `MRN-${ym}-E2E06`, nik: '3201991511200006',
      name: 'Aisyah Putri Ramadhani', dateOfBirth: new Date('2020-11-15'), gender: Gender.FEMALE,
      phone: '081234567006', address: 'Jl. Kemang Raya No. 55, Jakarta Selatan',
      insurance: { code: 'INS-ALIZ', memberNumber: 'ALZ-FAM-2024-1122', type: InsuranceType.SWASTA, priority: 1 },
    },
  ];

  const patientIds: string[] = [];

  for (const p of patients) {
    let patient = await prisma.patient.findFirst({ where: { OR: [{ mrn: p.mrn }, { nik: p.nik }] } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          mrn: p.mrn, nik: p.nik, name: p.name, dateOfBirth: p.dateOfBirth, gender: p.gender,
          phone: p.phone, address: p.address, bloodType: p.bloodType,
        },
      });
      console.log(`[pasien] ✅ ${p.name} (${p.mrn}) — ${p.gender}, lahir ${p.dateOfBirth.toISOString().slice(0, 10)}`);
    } else {
      console.log(`[pasien] Sudah ada: ${p.name} (${p.mrn})`);
    }
    patientIds.push(patient.id);

    // Assign insurance
    if (p.insurance) {
      const ins = await prisma.insurance.findFirst({ where: { code: p.insurance.code } });
      if (ins) {
        const existingPI = await prisma.patientInsurance.findFirst({ where: { patientId: patient.id, insuranceId: ins.id } });
        if (!existingPI) {
          await prisma.patientInsurance.create({
            data: {
              patientId: patient.id, insuranceId: ins.id,
              memberNumber: p.insurance.memberNumber, type: p.insurance.type, priority: p.insurance.priority, isActive: true,
            },
          });
          console.log(`[pasien]    └─ Asuransi: ${ins.name} (${p.insurance.memberNumber})`);
        }
      }
    }
  }

  return patientIds;
}

// ════════════════════════════════════════════════════════════════════════════════
// STEP 4-8: WORKFLOW — Full lifecycle per pasien
// ════════════════════════════════════════════════════════════════════════════════

interface OrderScenario {
  patientIdx: number;
  doctorCode: string;
  clinicCode: string;
  paymentMethod: PaymentMethod;
  insuranceCode?: string;
  testCodes: string[];
  priority?: 'ROUTINE' | 'URGENT' | 'CITO';
  description: string;
}

async function seedFullWorkflow(patientIds: string[]): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 4-8: Full Workflow per Pasien      ║');
  console.log('╚══════════════════════════════════════════╝');

  const doctors = await prisma.doctor.findMany();
  const clinics = await prisma.clinic.findMany();
  const insurances = await prisma.insurance.findMany();
  const allTests = await prisma.testMaster.findMany();
  const users = await prisma.user.findMany();

  const docMap = new Map(doctors.map((d) => [d.code, d]));
  const cliMap = new Map(clinics.map((c) => [c.code, c]));
  const insMap = new Map(insurances.map((i) => [i.code, i]));
  const testMap = new Map(allTests.map((t) => [t.code, t]));

  const getUser = (email: string) => users.find((u) => u.email === email);
  const csUser = getUser('cs.rina@elis.local');
  const kasirUser = getUser('kasir.dian@elis.local');
  const samplingUser = getUser('sampling.agus@elis.local');
  const analisUser = getUser('analis.maya@elis.local');
  const dokterUser = getUser('dokter.ahmad@elis.local');

  const now = new Date();
  const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  // Skenario per pasien
  const scenarios: OrderScenario[] = [
    {
      patientIdx: 0, doctorCode: 'DR-PD01', clinicCode: 'POL-IPD', paymentMethod: PaymentMethod.BPJS, insuranceCode: 'INS-BPJS',
      testCodes: ['HEM-CBC01', 'HEM-CBC02', 'HEM-CBC03', 'HEM-CBC04', 'KIM-GDP', 'KIM-KREA'],
      description: 'Pasien 1 (Hendra) — BPJS, Poli Dalam, DL + Kimia Klinik',
    },
    {
      patientIdx: 1, doctorCode: 'DR-OG01', clinicCode: 'POL-OBG', paymentMethod: PaymentMethod.INSURANCE, insuranceCode: 'INS-PRDN',
      testCodes: ['HEM-CBC01', 'HEM-CBC02', 'HEM-CBC03', 'KIM-GDP', 'URI-RTIN'],
      description: 'Pasien 2 (Siti) — Prudential, Poli Obgyn, DL + Urinalisis',
    },
    {
      patientIdx: 2, doctorCode: 'DR-UM01', clinicCode: 'MCU-001', paymentMethod: PaymentMethod.CASH,
      testCodes: ['HEM-CBC01', 'HEM-CBC02', 'HEM-CBC03', 'HEM-CBC04', 'KIM-GDP', 'KIM-CHOL', 'KIM-TRIG', 'KIM-SGOT', 'KIM-SGPT', 'KIM-ASUR', 'URI-RTIN'],
      description: 'Pasien 3 (Bambang) — CASH, MCU Lengkap',
    },
    {
      patientIdx: 3, doctorCode: 'DR-PD01', clinicCode: 'POL-IPD', paymentMethod: PaymentMethod.INSURANCE, insuranceCode: 'COR-TLKM',
      testCodes: ['HEM-CBC01', 'KIM-GDP', 'KIM-SGOT', 'KIM-SGPT', 'KIM-UREM', 'KIM-KREA', 'SER-HBSAG'],
      description: 'Pasien 4 (Dewi) — Corporate Telkom, Screening + Hepatitis',
    },
    {
      patientIdx: 4, doctorCode: 'DR-UM02', clinicCode: 'IGD-001', paymentMethod: PaymentMethod.BPJS, insuranceCode: 'INS-BPJS',
      testCodes: ['HEM-CBC01', 'HEM-CBC02', 'HEM-CBC03', 'KIM-GDP', 'KIM-UREM', 'KIM-KREA', 'KOA-PT', 'KOA-APTT'],
      priority: 'CITO',
      description: 'Pasien 5 (Sutrisno) — BPJS, IGD, CITO (DL + Koagulasi)',
    },
    {
      patientIdx: 5, doctorCode: 'DR-AN01', clinicCode: 'POL-ANK', paymentMethod: PaymentMethod.INSURANCE, insuranceCode: 'INS-ALIZ',
      testCodes: ['HEM-CBC01', 'HEM-CBC02', 'HEM-CBC03', 'SER-WIDAL'],
      description: 'Pasien 6 (Aisyah, 5 thn) — Allianz, Poli Anak, DL + Widal',
    },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    console.log(`\n[workflow] ─── ${sc.description} ───`);

    const patientId = patientIds[sc.patientIdx];
    const doctor = docMap.get(sc.doctorCode);
    const clinic = cliMap.get(sc.clinicCode);
    const insurance = sc.insuranceCode ? insMap.get(sc.insuranceCode) : null;

    if (!doctor || !clinic) { console.log(`[workflow] ⚠️ Doctor/Clinic missing`); continue; }

    const orderTests = sc.testCodes.map((code) => testMap.get(code)).filter(Boolean) as typeof allTests;
    if (orderTests.length === 0) { console.log(`[workflow] ⚠️ No tests found`); continue; }

    const totalAmount = orderTests.reduce((sum, t) => sum + Number(t.price), 0);
    const seq = String(i + 1).padStart(3, '0');
    const visitNumber = `VST-E2E-${dateKey}-${seq}`;
    const orderNumber = `ORD-E2E-${dateKey}-${seq}`;
    const barcode = `BC-E2E-${dateKey}-${seq}`;

    // Check if already exists
    const existingOrder = await prisma.order.findFirst({ where: { orderNumber } });
    if (existingOrder) {
      console.log(`[workflow] Sudah ada: ${orderNumber}`);
      patientIds.push(patientId); // keep going
      continue;
    }

    // ─── STEP 4: Visit Registration (by CS) ───
    const visit = await prisma.visit.create({
      data: {
        visitNumber, patientId, doctorId: doctor.id, clinicId: clinic.id,
        paymentMethod: sc.paymentMethod, insuranceId: insurance?.id ?? null,
        status: VisitStatus.COMPLETED, registrationDate: now,
      },
    });
    console.log(`[workflow] 4️⃣  Visit: ${visitNumber} (${sc.paymentMethod})`);

    // ─── STEP 5: Order + Payment (by Kasir) ───
    const order = await prisma.order.create({
      data: {
        orderNumber, patientId, visitId: visit.id, doctorId: doctor.id, clinicId: clinic.id,
        insuranceId: insurance?.id ?? null, paymentMethod: sc.paymentMethod,
        status: OrderStatus.APPROVED, // Final state
        priority: (sc.priority as any) ?? 'ROUTINE',
        totalAmount, amountPaid: totalAmount, paidAt: now, paidBy: kasirUser?.id,
        barcode, barcodeText: barcode,
        sampleCollectedAt: now, sampleCollectedBy: samplingUser?.id, sampleCondition: SampleCondition.ACCEPTABLE,
        verifiedAt: now, verifiedBy: dokterUser?.id,
        approvedAt: now, approvedBy: dokterUser?.id,
        receiptNumber: `RCP-E2E-${dateKey}-${seq}`,
        orderDetails: {
          create: orderTests.map((t) => {
            // Generate realistic result values
            const resultValue = generateRealisticResult(t.code, patientIds[sc.patientIdx], sc.patientIdx);
            const flag = determineFlag(t.code, resultValue, sc.patientIdx < 3 ? Gender.MALE : Gender.FEMALE);
            return {
              testId: t.id, price: t.price, discount: 0, finalPrice: t.price,
              status: OrderDetailStatus.APPROVED, resultValue, flag,
              resultEnteredAt: now, resultEnteredBy: analisUser?.id,
              verifiedAt: now, verifiedBy: dokterUser?.id,
            };
          }),
        },
      },
    });
    console.log(`[workflow] 5️⃣  Order: ${orderNumber} — Rp ${totalAmount.toLocaleString()} (${orderTests.length} tes)`);
    console.log(`[workflow] 6️⃣  Sampling: ${barcode} — ACCEPTABLE`);
    console.log(`[workflow] 7️⃣  Hasil diinput oleh Analis`);
    console.log(`[workflow] 8️⃣  Verified & Approved oleh Dokter`);

    // Payment component
    await prisma.paymentComponent.create({
      data: {
        orderId: order.id, paymentMethod: sc.paymentMethod, amount: totalAmount,
        insuranceId: insurance?.id ?? null,
        reference: sc.paymentMethod === PaymentMethod.CASH ? `CASH-${seq}` : `REF-${sc.insuranceCode}-${seq}`,
        paidAt: now, reconciliationStatus: 'MATCHED',
      },
    });
    console.log(`[workflow] 💰 Pembayaran: ${sc.paymentMethod} — Rp ${totalAmount.toLocaleString()}`);

    // Order-Insurance junction for insured patients
    if (insurance) {
      const patientIns = await prisma.patientInsurance.findFirst({ where: { patientId, insuranceId: insurance.id } });
      await prisma.orderInsurance.create({
        data: {
          orderId: order.id, insuranceId: insurance.id, coverageType: 'PRIMARY',
          claimStatus: 'APPROVED', coveredAmount: totalAmount, memberNumber: patientIns?.memberNumber ?? null,
          approvedAt: now,
        },
      });
      console.log(`[workflow] 🏥 Klaim asuransi: ${insurance.name} — APPROVED`);
    }

    console.log(`[workflow] ✅ SELESAI: ${sc.description}`);
  }
}

// ─── Helper: Generate realistic lab results ───

function generateRealisticResult(testCode: string, _patientId: string, patientIdx: number): string {
  // Simulate slight variations — some normal, some borderline
  const resultMap: Record<string, () => string> = {
    'HEM-CBC01': () => (patientIdx === 4 ? '10.2' : (12.5 + Math.random() * 3).toFixed(1)),  // Pasien 5 low Hb (elderly IGD)
    'HEM-CBC02': () => (patientIdx === 5 ? '12.8' : (5.5 + Math.random() * 3).toFixed(1)),    // Pasien 6 high WBC (infection)
    'HEM-CBC03': () => (200 + Math.floor(Math.random() * 150)).toString(),
    'HEM-CBC04': () => (38 + Math.random() * 10).toFixed(1),
    'HEM-CBC05': () => (4.2 + Math.random() * 1.2).toFixed(2),
    'HEM-LED': () => (patientIdx === 4 ? '35' : (5 + Math.floor(Math.random() * 10)).toString()),
    'KIM-GDP': () => (patientIdx === 2 ? '145' : (75 + Math.floor(Math.random() * 20)).toString()), // Pasien 3 high glucose
    'KIM-GD2J': () => (100 + Math.floor(Math.random() * 30)).toString(),
    'KIM-SGOT': () => (15 + Math.floor(Math.random() * 20)).toString(),
    'KIM-SGPT': () => (12 + Math.floor(Math.random() * 25)).toString(),
    'KIM-UREM': () => (20 + Math.floor(Math.random() * 15)).toString(),
    'KIM-KREA': () => (0.7 + Math.random() * 0.4).toFixed(2),
    'KIM-CHOL': () => (patientIdx === 2 ? '245' : (160 + Math.floor(Math.random() * 30)).toString()), // Pasien 3 high cholesterol
    'KIM-TRIG': () => (patientIdx === 2 ? '210' : (90 + Math.floor(Math.random() * 40)).toString()),
    'KIM-ASUR': () => (4.0 + Math.random() * 2).toFixed(1),
    'SER-HBSAG': () => '0.12', // Non-reaktif
    'SER-WIDAL': () => (patientIdx === 5 ? '160' : '40'), // Pasien 6 positive widal
    'URI-RTIN': () => 'Normal',
    'KOA-PT': () => (11.0 + Math.random() * 2).toFixed(1),
    'KOA-APTT': () => (patientIdx === 4 ? '42.5' : (27.0 + Math.random() * 5).toFixed(1)), // Pasien 5 prolonged APTT
  };

  const fn = resultMap[testCode];
  return fn ? fn() : (Math.random() * 10).toFixed(2);
}

function determineFlag(testCode: string, resultValue: string, gender: Gender): Flag {
  const val = parseFloat(resultValue);
  if (isNaN(val)) return Flag.NORMAL;

  // Simplified flag determination for demo
  const flagRules: Record<string, { low: number; high: number; critLow?: number; critHigh?: number }> = {
    'HEM-CBC01': gender === Gender.MALE ? { low: 13, high: 17.5, critLow: 7, critHigh: 20 } : { low: 12, high: 15.5, critLow: 7, critHigh: 20 },
    'HEM-CBC02': { low: 4, high: 10, critLow: 2, critHigh: 30 },
    'HEM-CBC03': { low: 150, high: 400, critLow: 50, critHigh: 1000 },
    'KIM-GDP': { low: 70, high: 100, critLow: 40, critHigh: 400 },
    'KIM-CHOL': { low: 0, high: 200 },
    'KIM-TRIG': { low: 0, high: 150 },
    'KOA-APTT': { low: 25, high: 35, critHigh: 60 },
  };

  const rule = flagRules[testCode];
  if (!rule) return Flag.NORMAL;

  if (rule.critLow && val < rule.critLow) return Flag.CRITICAL;
  if (rule.critHigh && val > rule.critHigh) return Flag.CRITICAL;
  if (val < rule.low) return Flag.LOW;
  if (val > rule.high) return Flag.HIGH;
  return Flag.NORMAL;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  eLIS — E2E Workflow Testing Seed                       ║');
  console.log('║  Simulasi alur kerja laboratorium end-to-end            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Skenario:');
  console.log('  1. Pasien BPJS — Poli Dalam, DL + Kimia Klinik');
  console.log('  2. Pasien Prudential — Poli Obgyn, DL + Urinalisis');
  console.log('  3. Pasien CASH — MCU Lengkap (11 tes)');
  console.log('  4. Pasien Corporate Telkom — Screening + Hepatitis');
  console.log('  5. Pasien BPJS — IGD CITO, DL + Koagulasi');
  console.log('  6. Pasien Anak (Allianz) — Poli Anak, DL + Widal');

  await seedUsers();
  await seedMasterDataReal();
  const patientIds = await seedPatients();
  await seedFullWorkflow(patientIds);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ E2E Workflow Seed SELESAI!                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Akun tersedia:');
  console.log('  admin@elis.local      / Admin@1234 (SUPER_ADMIN)');
  console.log('  cs.rina@elis.local    / Demo@1234  (CS — registrasi)');
  console.log('  kasir.dian@elis.local / Demo@1234  (KASIR — pembayaran)');
  console.log('  sampling.agus@elis.local / Demo@1234 (SAMPLING)');
  console.log('  analis.maya@elis.local / Demo@1234 (ANALIS — input hasil)');
  console.log('  analis.budi@elis.local / Demo@1234 (ANALIS — senior)');
  console.log('  dokter.ahmad@elis.local / Demo@1234 (DOKTER — verifikasi)');
  console.log('  manager.siti@elis.local / Demo@1234 (MANAGER)');
  console.log('');
  console.log('6 pasien dengan workflow lengkap:');
  console.log('  Registrasi → Visit → Order → Bayar → Sampling → Analisis → Verifikasi → Approval');
}

main()
  .catch((error: unknown) => {
    console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
