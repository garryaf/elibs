import { PrismaClient, InsuranceType } from '@prisma/client';

const prisma = new PrismaClient();

// === DOCTORS ===

async function seedDoctors(): Promise<void> {
  console.log('\n[seed] === Doctors ===');

  const doctors = [
    { code: 'DR-001', name: 'Dr. Ahmad Fauzi', specialization: 'Sp.PK (Patologi Klinik)', phone: '08123456001' },
    { code: 'DR-002', name: 'Dr. Siti Rahmawati', specialization: 'Sp.PK (Patologi Klinik)', phone: '08123456002' },
    { code: 'DR-003', name: 'Dr. Budi Santoso', specialization: 'Sp.PA (Patologi Anatomi)', phone: '08123456003' },
    { code: 'DR-004', name: 'Dr. Dewi Lestari', specialization: 'Sp.PK (Patologi Klinik)', phone: '08123456004' },
    { code: 'DR-005', name: 'Dr. Andi Wijaya', specialization: 'Sp.An (Anestesi)', phone: '08123456005' },
  ];

  for (const doctor of doctors) {
    await prisma.doctor.upsert({
      where: { code: doctor.code },
      update: {
        name: doctor.name,
        specialization: doctor.specialization,
        phone: doctor.phone,
        isActive: true,
      },
      create: {
        ...doctor,
        isActive: true,
      },
    });
    console.log(`[seed] ✅ Doctor: ${doctor.code} - ${doctor.name}`);
  }
}

// === CLINICS ===

async function seedClinics(): Promise<void> {
  console.log('\n[seed] === Clinics ===');

  const clinics = [
    { code: 'CLN-001', name: 'Klinik Utama Sehat', address: 'Jl. Sudirman No. 10', phone: '02112345001' },
    { code: 'CLN-002', name: 'Klinik Pratama Harapan', address: 'Jl. Gatot Subroto No. 5', phone: '02112345002' },
    { code: 'CLN-003', name: 'RS Mitra Medika', address: 'Jl. TB Simatupang No. 8', phone: '02112345003' },
    { code: 'CLN-004', name: 'Klinik Kasih Ibu', address: 'Jl. Raya Bogor No. 15', phone: '02112345004' },
  ];

  for (const clinic of clinics) {
    await prisma.clinic.upsert({
      where: { code: clinic.code },
      update: {
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        isActive: true,
      },
      create: {
        ...clinic,
        isActive: true,
      },
    });
    console.log(`[seed] ✅ Clinic: ${clinic.code} - ${clinic.name}`);
  }
}

// === INSURANCE ===

async function seedInsurance(): Promise<void> {
  console.log('\n[seed] === Insurance ===');

  const insurances: Array<{
    code: string;
    name: string;
    type: InsuranceType;
    phone: string;
    email: string;
  }> = [
    { code: 'INS-001', name: 'BPJS Kesehatan', type: InsuranceType.BPJS, phone: '1500400', email: 'bpjs@bpjs-kesehatan.go.id' },
    { code: 'INS-002', name: 'Prudential Indonesia', type: InsuranceType.SWASTA, phone: '02115008081', email: 'cs@prudential.co.id' },
    { code: 'INS-003', name: 'Allianz Life', type: InsuranceType.SWASTA, phone: '02126506060', email: 'info@allianz.co.id' },
    { code: 'INS-004', name: 'Astra Insurance', type: InsuranceType.CORPORATE, phone: '02157999888', email: 'corporate@astra.co.id' },
    { code: 'INS-005', name: 'Mandiri Inhealth', type: InsuranceType.SWASTA, phone: '02152905555', email: 'info@mandiri-inhealth.co.id' },
  ];

  for (const ins of insurances) {
    await prisma.insurance.upsert({
      where: { code: ins.code },
      update: {
        name: ins.name,
        type: ins.type,
        phone: ins.phone,
        email: ins.email,
        isActive: true,
      },
      create: {
        ...ins,
        isActive: true,
      },
    });
    console.log(`[seed] ✅ Insurance: ${ins.code} - ${ins.name} (${ins.type})`);
  }
}

// === LAB TESTS (TestMaster) ===

interface TestInput {
  code: string;
  name: string;
  categoryName: string;
  price: number;
  unit: string;
  sampleType: string;
  requiresDoctorApproval?: boolean;
}

const labTests: TestInput[] = [
  // Hematologi
  { code: 'HEM-001', name: 'Hemoglobin (Hb)', categoryName: 'Hematologi', price: 35000, unit: 'g/dL', sampleType: 'Darah EDTA' },
  { code: 'HEM-002', name: 'Hematokrit (Ht)', categoryName: 'Hematologi', price: 35000, unit: '%', sampleType: 'Darah EDTA' },
  { code: 'HEM-003', name: 'Leukosit (WBC)', categoryName: 'Hematologi', price: 40000, unit: '/µL', sampleType: 'Darah EDTA' },
  { code: 'HEM-004', name: 'Trombosit', categoryName: 'Hematologi', price: 40000, unit: '/µL', sampleType: 'Darah EDTA' },
  { code: 'HEM-005', name: 'Darah Lengkap (CBC)', categoryName: 'Hematologi', price: 85000, unit: '-', sampleType: 'Darah EDTA' },

  // Kimia Klinik
  { code: 'KIM-001', name: 'Glukosa Puasa', categoryName: 'Kimia Klinik', price: 45000, unit: 'mg/dL', sampleType: 'Serum' },
  { code: 'KIM-002', name: 'Kolesterol Total', categoryName: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'Serum' },
  { code: 'KIM-003', name: 'SGOT (AST)', categoryName: 'Kimia Klinik', price: 55000, unit: 'U/L', sampleType: 'Serum' },
  { code: 'KIM-004', name: 'SGPT (ALT)', categoryName: 'Kimia Klinik', price: 55000, unit: 'U/L', sampleType: 'Serum' },
  { code: 'KIM-005', name: 'Kreatinin', categoryName: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'Serum' },

  // Urinalisis
  { code: 'URI-001', name: 'Urinalisis Lengkap', categoryName: 'Urinalisis', price: 50000, unit: '-', sampleType: 'Urin' },
  { code: 'URI-002', name: 'Protein Urin', categoryName: 'Urinalisis', price: 30000, unit: 'mg/dL', sampleType: 'Urin' },

  // Serologi
  { code: 'SER-001', name: 'HBsAg (Rapid)', categoryName: 'Serologi', price: 75000, unit: '-', sampleType: 'Serum' },
  { code: 'SER-002', name: 'Anti-HIV (Rapid)', categoryName: 'Serologi', price: 95000, unit: '-', sampleType: 'Serum' },
  { code: 'SER-003', name: 'Widal', categoryName: 'Serologi', price: 65000, unit: '-', sampleType: 'Serum' },

  // Mikrobiologi
  { code: 'MIK-001', name: 'Kultur Urin', categoryName: 'Mikrobiologi', price: 150000, unit: '-', sampleType: 'Urin', requiresDoctorApproval: true },
  { code: 'MIK-002', name: 'BTA (Bakteri Tahan Asam)', categoryName: 'Mikrobiologi', price: 85000, unit: '-', sampleType: 'Sputum' },
];

async function seedLabTests(): Promise<void> {
  console.log('\n[seed] === Lab Tests (TestMaster) ===');

  // Build category lookup map
  const categories = await prisma.testCategory.findMany();
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

  let created = 0;
  let skipped = 0;

  for (const test of labTests) {
    const categoryId = categoryMap.get(test.categoryName);
    if (!categoryId) {
      console.log(`[seed] ⚠️  Category not found: ${test.categoryName} — skipping ${test.code}`);
      skipped++;
      continue;
    }

    await prisma.testMaster.upsert({
      where: { code: test.code },
      update: {
        name: test.name,
        categoryId,
        price: test.price,
        unit: test.unit,
        sampleType: test.sampleType,
        requiresDoctorApproval: test.requiresDoctorApproval ?? false,
        isActive: true,
      },
      create: {
        code: test.code,
        name: test.name,
        categoryId,
        price: test.price,
        unit: test.unit,
        sampleType: test.sampleType,
        requiresDoctorApproval: test.requiresDoctorApproval ?? false,
        isActive: true,
      },
    });
    created++;
    console.log(`[seed] ✅ Test: ${test.code} - ${test.name} (${test.categoryName})`);
  }

  console.log(`[seed] Lab tests done. Upserted: ${created}, Skipped: ${skipped}`);
}

// === MAIN EXPORT ===

export async function seedMasterData(): Promise<void> {
  console.log('\n[seed] ========================================');
  console.log('[seed] === Master Data Seed ===');
  console.log('[seed] ========================================');

  await seedDoctors();
  await seedClinics();
  await seedInsurance();
  await seedLabTests();

  console.log('\n[seed] ✅ Master data seeding complete!');
  console.log('[seed]   Doctors: 5 records');
  console.log('[seed]   Clinics: 4 records');
  console.log('[seed]   Insurance: 5 records');
  console.log('[seed]   Lab Tests: 17 records');
}

// Allow standalone execution
if (require.main === module) {
  seedMasterData()
    .catch((error: unknown) => {
      console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
