import { PrismaClient, InsuranceType, Gender, PaymentMethod, OrderStatus, VisitStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── UTILS ────────────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

// ─── MASTER DATA ──────────────────────────────────────────────────────────────

async function seedDoctors() {
  console.log('\n[seed] === Seeding Doctors ===');
  const doctors = [
    { code: 'DR-001', name: 'dr. Ahmad Fauzi, Sp.PK', specialization: 'Sp.PK (Patologi Klinik)', phone: '08123456001' },
    { code: 'DR-002', name: 'dr. Siti Rahmawati, Sp.PK', specialization: 'Sp.PK (Patologi Klinik)', phone: '08123456002' },
    { code: 'DR-003', name: 'dr. Budi Santoso, Sp.PD', specialization: 'Sp.PD (Penyakit Dalam)', phone: '08123456003' },
    { code: 'DR-004', name: 'dr. Dewi Lestari, Sp.A', specialization: 'Sp.A (Anak)', phone: '08123456004' },
    { code: 'DR-005', name: 'dr. Andi Wijaya, Sp.B', specialization: 'Sp.B (Bedah)', phone: '08123456005' },
    { code: 'DR-006', name: 'dr. Maya Indah, Sp.OG', specialization: 'Sp.OG (Kandungan)', phone: '08123456006' },
    { code: 'DR-007', name: 'dr. Rudi Hartono', specialization: 'Dokter Umum (IGD)', phone: '08123456007' },
    { code: 'DR-008', name: 'dr. Nina Marlina', specialization: 'Dokter Umum (MCU)', phone: '08123456008' },
    { code: 'DR-009', name: 'dr. Joko Susanto, Sp.P', specialization: 'Sp.P (Paru)', phone: '08123456009' },
    { code: 'DR-010', name: 'dr. Surya Saputra, Sp.S', specialization: 'Sp.S (Saraf)', phone: '08123456010' },
  ];

  for (const doc of doctors) {
    await prisma.doctor.upsert({
      where: { code: doc.code },
      update: { ...doc, isActive: true },
      create: { ...doc, isActive: true },
    });
  }
  console.log(`[seed] Upserted ${doctors.length} doctors.`);
}

async function seedClinics() {
  console.log('\n[seed] === Seeding Clinics/Polis ===');
  const clinics = [
    { code: 'POL-001', name: 'Poliklinik Penyakit Dalam', address: 'Lantai 1, Sayap Timur', phone: 'Ext 101' },
    { code: 'POL-002', name: 'Poliklinik Anak', address: 'Lantai 1, Sayap Barat', phone: 'Ext 102' },
    { code: 'POL-003', name: 'Instalasi Gawat Darurat (IGD)', address: 'Lantai Dasar, Depan', phone: 'Ext 118' },
    { code: 'POL-004', name: 'Medical Check Up (MCU)', address: 'Lantai 2, Sayap Timur', phone: 'Ext 201' },
    { code: 'POL-005', name: 'Poliklinik Kandungan (Obgyn)', address: 'Lantai 2, Sayap Barat', phone: 'Ext 202' },
    { code: 'RAN-001', name: 'Rawat Inap - Ruang Mawar (Kelas 1)', address: 'Lantai 3', phone: 'Ext 301' },
    { code: 'RAN-002', name: 'Rawat Inap - Ruang Melati (VIP)', address: 'Lantai 4', phone: 'Ext 401' },
    { code: 'ICU-001', name: 'Intensive Care Unit (ICU)', address: 'Lantai Dasar, Belakang', phone: 'Ext 199' },
  ];

  for (const cli of clinics) {
    await prisma.clinic.upsert({
      where: { code: cli.code },
      update: { ...cli, isActive: true },
      create: { ...cli, isActive: true },
    });
  }
  console.log(`[seed] Upserted ${clinics.length} clinics/rooms.`);
}

async function seedInsurances() {
  console.log('\n[seed] === Seeding Insurances ===');
  const insurances = [
    { code: 'INS-BPJS', name: 'BPJS Kesehatan', type: InsuranceType.BPJS, phone: '1500400', email: 'info@bpjs.go.id' },
    { code: 'INS-TK', name: 'BPJS Ketenagakerjaan', type: InsuranceType.BPJS, phone: '175', email: 'info@bpjs-tk.go.id' },
    { code: 'INS-PRU', name: 'Prudential Life Assurance', type: InsuranceType.SWASTA, phone: '1500085', email: 'cs@prudential.co.id' },
    { code: 'INS-ALL', name: 'Allianz Life Indonesia', type: InsuranceType.SWASTA, phone: '1500136', email: 'contactus@allianz.co.id' },
    { code: 'INS-INH', name: 'Mandiri Inhealth', type: InsuranceType.SWASTA, phone: '14022', email: 'info@mandiriinhealth.co.id' },
    { code: 'COR-TLK', name: 'PT Telkom Indonesia', type: InsuranceType.CORPORATE, phone: '021-147', email: 'corporate@telkom.co.id' },
    { code: 'COR-PLN', name: 'PT PLN (Persero)', type: InsuranceType.CORPORATE, phone: '123', email: 'pln123@pln.co.id' },
  ];

  for (const ins of insurances) {
    await prisma.insurance.upsert({
      where: { code: ins.code },
      update: { ...ins, isActive: true },
      create: { ...ins, isActive: true },
    });
  }
  console.log(`[seed] Upserted ${insurances.length} insurances.`);
}

async function seedTestCategories() {
  console.log('\n[seed] === Seeding Test Categories ===');
  const categories = [
    { name: 'Hematologi', description: 'Pemeriksaan sel darah, koagulasi, dan imunohematologi' },
    { name: 'Kimia Klinik', description: 'Fungsi hati, fungsi ginjal, profil lipid, diabetes, dll' },
    { name: 'Imunoserologi', description: 'Pemeriksaan antibodi, antigen, penanda infeksi dan tumor' },
    { name: 'Urinalisa', description: 'Pemeriksaan makroskopis dan mikroskopis urin' },
    { name: 'Mikrobiologi', description: 'Kultur bakteri, sensitivitas antibiotik, BTA' },
    { name: 'Endokrinologi', description: 'Pemeriksaan hormon tiroid, reproduksi, dll' },
  ];

  for (const cat of categories) {
    await prisma.testCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: { ...cat },
    });
  }
  console.log(`[seed] Upserted ${categories.length} test categories.`);
}

async function seedTestMasterAndReferences() {
  console.log('\n[seed] === Seeding Test Master & Reference Values ===');
  
  const categories = await prisma.testCategory.findMany();
  const catMap = new Map(categories.map((c) => [c.name, c.id]));

  type RefValue = { gender: Gender; minAge: number; maxAge: number; minRef: number; maxRef: number; criticalMin?: number; criticalMax?: number };
  type TestDef = {
    code: string; name: string; categoryName: string; price: number; unit: string; sampleType: string;
    requiresDoctorApproval: boolean;
    refs: RefValue[];
  };

  const tests: TestDef[] = [
    // ─── HEMATOLOGI ───────────────────────────────────────────────────────────
    {
      code: 'HEM-HB', name: 'Hemoglobin (Hb)', categoryName: 'Hematologi', price: 40000, unit: 'g/dL', sampleType: 'EDTA', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 15, maxAge: 150, minRef: 13.0, maxRef: 17.0, criticalMin: 7.0, criticalMax: 20.0 },
        { gender: Gender.FEMALE, minAge: 15, maxAge: 150, minRef: 12.0, maxRef: 15.0, criticalMin: 7.0, criticalMax: 20.0 },
        { gender: Gender.MALE, minAge: 0, maxAge: 14, minRef: 11.0, maxRef: 16.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 14, minRef: 11.0, maxRef: 16.0 },
      ],
    },
    {
      code: 'HEM-LEKO', name: 'Leukosit (WBC)', categoryName: 'Hematologi', price: 35000, unit: '10^3/µL', sampleType: 'EDTA', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 10.0, criticalMin: 2.0, criticalMax: 30.0 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 10.0, criticalMin: 2.0, criticalMax: 30.0 },
      ],
    },
    {
      code: 'HEM-TROM', name: 'Trombosit (PLT)', categoryName: 'Hematologi', price: 40000, unit: '10^3/µL', sampleType: 'EDTA', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 1000 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 1000 },
      ],
    },
    {
      code: 'HEM-HT', name: 'Hematokrit (Ht)', categoryName: 'Hematologi', price: 30000, unit: '%', sampleType: 'EDTA', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 15, maxAge: 150, minRef: 40, maxRef: 50 },
        { gender: Gender.FEMALE, minAge: 15, maxAge: 150, minRef: 36, maxRef: 46 },
      ],
    },
    // ─── KIMIA KLINIK ──────────────────────────────────────────────────────────
    {
      code: 'KIM-GLUP', name: 'Glukosa Puasa (GDP)', categoryName: 'Kimia Klinik', price: 45000, unit: 'mg/dL', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 70, maxRef: 99, criticalMin: 40, criticalMax: 400 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 70, maxRef: 99, criticalMin: 40, criticalMax: 400 },
      ],
    },
    {
      code: 'KIM-HBA1C', name: 'HbA1c', categoryName: 'Kimia Klinik', price: 180000, unit: '%', sampleType: 'EDTA', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 5.6 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 5.6 },
      ],
    },
    {
      code: 'KIM-SGOT', name: 'SGOT (AST)', categoryName: 'Kimia Klinik', price: 55000, unit: 'U/L', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 40 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 32 },
      ],
    },
    {
      code: 'KIM-SGPT', name: 'SGPT (ALT)', categoryName: 'Kimia Klinik', price: 55000, unit: 'U/L', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 41 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 33 },
      ],
    },
    {
      code: 'KIM-URE', name: 'Ureum', categoryName: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 15, maxRef: 43 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 15, maxRef: 43 },
      ],
    },
    {
      code: 'KIM-KREA', name: 'Kreatinin', categoryName: 'Kimia Klinik', price: 50000, unit: 'mg/dL', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0.6, maxRef: 1.1 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0.5, maxRef: 0.9 },
      ],
    },
    {
      code: 'KIM-CHOL', name: 'Kolesterol Total', categoryName: 'Kimia Klinik', price: 55000, unit: 'mg/dL', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 200 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 200 },
      ],
    },
    // ─── IMUNOSEROLOGI ────────────────────────────────────────────────────────
    {
      code: 'SER-HBSAG', name: 'HBsAg', categoryName: 'Imunoserologi', price: 120000, unit: 'Index', sampleType: 'SST', requiresDoctorApproval: true,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0.99 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0.99 },
      ],
    },
    {
      code: 'SER-NS1', name: 'Dengue NS1 Antigen', categoryName: 'Imunoserologi', price: 250000, unit: 'Index', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0.99 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 0.99 },
      ],
    },
    {
      code: 'SER-WID', name: 'Widal (S. Typhi O)', categoryName: 'Imunoserologi', price: 80000, unit: 'Titer', sampleType: 'SST', requiresDoctorApproval: false,
      refs: [
        // Using numeric proxy for titer (e.g. 1/80 = 80)
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 80 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0, maxRef: 80 },
      ],
    },
    // ─── ENDOKRINOLOGI ────────────────────────────────────────────────────────
    {
      code: 'END-TSHS', name: 'TSHs', categoryName: 'Endokrinologi', price: 200000, unit: 'µIU/mL', sampleType: 'SST', requiresDoctorApproval: true,
      refs: [
        { gender: Gender.MALE, minAge: 0, maxAge: 150, minRef: 0.27, maxRef: 4.2 },
        { gender: Gender.FEMALE, minAge: 0, maxAge: 150, minRef: 0.27, maxRef: 4.2 },
      ],
    },
  ];

  for (const test of tests) {
    const categoryId = catMap.get(test.categoryName);
    if (!categoryId) continue;

    const upsertedTest = await prisma.testMaster.upsert({
      where: { code: test.code },
      update: {
        name: test.name, categoryId, price: test.price, unit: test.unit, sampleType: test.sampleType, requiresDoctorApproval: test.requiresDoctorApproval, isActive: true
      },
      create: {
        code: test.code, name: test.name, categoryId, price: test.price, unit: test.unit, sampleType: test.sampleType, requiresDoctorApproval: test.requiresDoctorApproval, isActive: true
      }
    });

    for (const ref of test.refs) {
      await prisma.referenceValue.upsert({
        where: {
          testId_gender_minAge_maxAge: {
            testId: upsertedTest.id, gender: ref.gender, minAge: ref.minAge, maxAge: ref.maxAge
          }
        },
        update: { minRef: ref.minRef, maxRef: ref.maxRef, criticalMin: ref.criticalMin, criticalMax: ref.criticalMax },
        create: {
          testId: upsertedTest.id, gender: ref.gender, minAge: ref.minAge, maxAge: ref.maxAge, minRef: ref.minRef, maxRef: ref.maxRef, criticalMin: ref.criticalMin, criticalMax: ref.criticalMax
        }
      });
    }
  }
  console.log(`[seed] Upserted ${tests.length} comprehensive lab tests with reference values.`);
}

// ─── DUMMY TRANSACTIONS (PATIENTS & ORDERS) ───────────────────────────────────

async function seedDummyTransactions() {
  console.log('\n[seed] === Seeding Dummy Patients & Orders ===');

  const doctors = await prisma.doctor.findMany();
  const clinics = await prisma.clinic.findMany();
  const insurances = await prisma.insurance.findMany();
  const allTests = await prisma.testMaster.findMany();

  if (doctors.length === 0 || clinics.length === 0 || allTests.length === 0) {
    console.log('[seed] ⚠️ Missing master data for transactions. Skipping.');
    return;
  }

  // 1. Generate 30 Patients
  const names = [
    'Agus', 'Budi', 'Siti', 'Dewi', 'Eko', 'Fitri', 'Gita', 'Hendra', 'Indah', 'Joko',
    'Kusuma', 'Lestari', 'Mulyadi', 'Nina', 'Oki', 'Putri', 'Rudi', 'Sari', 'Tono', 'Umi',
    'Vina', 'Wawan', 'Yudi', 'Zainal', 'Rina', 'Andi', 'Bambang', 'Cahya', 'Deni', 'Endang'
  ];
  const lastNames = ['Saputra', 'Wijaya', 'Santoso', 'Pratama', 'Hidayat', 'Kurniawan', 'Purnama', 'Setiawan', 'Nugroho', 'Lubis'];

  // Reuse existing patients if the seeder was run before
  let patients = await prisma.patient.findMany({ take: 30, orderBy: { createdAt: 'asc' } });
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (patients.length < 30) {
    // Get max existing MRN number to continue from
    const lastPatient = await prisma.patient.findFirst({ orderBy: { mrn: 'desc' }, where: { mrn: { startsWith: `MRN-${yearMonth}-` } } });
    let patientCounter = lastPatient ? parseInt(lastPatient.mrn.split('-').pop() || '0') + 1 : 1;

    const toCreate = 30 - patients.length;
    for (let i = 0; i < toCreate; i++) {
      const fn = randomItem(names);
      const ln = randomItem(lastNames);
      const gender = randomItem([Gender.MALE, Gender.FEMALE]);
      const ts = Date.now() + i; // timestamp-based suffix for uniqueness
      const mrn = `MRN-${yearMonth}-${String(patientCounter++).padStart(5, '0')}`;
      const dob = new Date();
      dob.setFullYear(randomInt(1950, 2015));
      dob.setMonth(randomInt(0, 11));
      dob.setDate(randomInt(1, 28));

      // Build unique NIK using timestamp to prevent collisions
      const nikSuffix = String(ts).slice(-12).padStart(12, '0');
      const p = await prisma.patient.create({
        data: {
          mrn,
          nik: `3271${nikSuffix}`,
          name: `${fn} ${ln}`,
          dateOfBirth: dob,
          gender,
          phone: `081${randomInt(100000000, 999999999)}`,
          address: `Jl. Merdeka No. ${randomInt(1, 100)}, Jakarta`,
        }
      });
      patients.push(p);

      // Assign Insurance for 70% of patients
      if (Math.random() < 0.7) {
        const ins = randomItem(insurances);
        const existingIns = await prisma.patientInsurance.findFirst({ where: { patientId: p.id, insuranceId: ins.id } });
        if (!existingIns) {
          await prisma.patientInsurance.create({
            data: {
              patientId: p.id,
              insuranceId: ins.id,
              priority: 1,
              type: ins.type,
              memberNumber: `MEM-${randomInt(100000, 999999)}`,
              isActive: true
            }
          });
        }
      }
    }
    console.log(`[seed] Created ${toCreate} new patients (total: ${patients.length}).`);
  } else {
    console.log(`[seed] Reusing ${patients.length} existing patients.`);
  }



  // 2. Generate 50 Orders
  const orderStatuses = [
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.SAMPLE_COLLECTED,
    OrderStatus.IN_ANALYSIS,
    OrderStatus.VERIFIED,
    OrderStatus.APPROVED,
    OrderStatus.APPROVED, // Weight towards APPROVED to have history data
    OrderStatus.APPROVED,
  ];

  // Start orderCounter AFTER the last existing order/visit count to avoid collisions on re-run
  const existingOrderCount = await prisma.order.count();
  const existingVisitCount = await prisma.visit.count();
  let orderCounter = Math.max(existingOrderCount, existingVisitCount) + 1;

  // A short epoch token unique to this run (last 6 digits of ms timestamp)
  const runToken = String(Date.now()).slice(-6);

  for (let i = 0; i < 50; i++) {
    const patient = randomItem(patients);
    const doctor = randomItem(doctors);
    const clinic = randomItem(clinics);
    const status = randomItem(orderStatuses);

    // Spread visits across the past 30 days to avoid the partial unique constraint
    // (one active visit per patient per day)
    const visitDate = new Date(now);
    visitDate.setDate(visitDate.getDate() - randomInt(0, 29));
    visitDate.setHours(randomInt(7, 16), randomInt(0, 59), 0, 0);

    const dateKey = `${visitDate.getFullYear()}${String(visitDate.getMonth() + 1).padStart(2, '0')}${String(visitDate.getDate()).padStart(2, '0')}`;
    const seq = String(orderCounter).padStart(4, '0');
    const visitNumber = `VST-${dateKey}-${runToken}-${seq}`;
    const orderNumber = `ORD-${dateKey}-${runToken}-${seq}`;
    const barcode = `BC-${dateKey}-${runToken}-${seq}`;
    orderCounter++;

    // Completed statuses should have COMPLETED visit, pending ones IN_PROGRESS
    const isCompleted = ['VERIFIED', 'APPROVED'].includes(status);
    const visitStatus = isCompleted ? VisitStatus.COMPLETED : VisitStatus.IN_PROGRESS;

    // Check patient's primary insurance
    const ptIns = await prisma.patientInsurance.findFirst({
      where: { patientId: patient.id, priority: 1, isActive: true },
      include: { insurance: true }
    });

    const paymentMethod = ptIns ? (ptIns.insurance.type === InsuranceType.BPJS ? PaymentMethod.BPJS : PaymentMethod.INSURANCE) : PaymentMethod.CASH;

    const visit = await prisma.visit.create({
      data: {
        visitNumber,
        patientId: patient.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        paymentMethod,
        insuranceId: ptIns?.insuranceId || null,
        status: visitStatus,
        registrationDate: visitDate,
      }
    });

    // Select 2-5 random tests for the order
    const numTests = randomInt(2, 5);
    const orderTests = [];
    const usedTestIds = new Set<string>();
    for (let j = 0; j < numTests; j++) {
      let t = randomItem(allTests);
      while (usedTestIds.has(t.id)) {
        t = randomItem(allTests);
      }
      usedTestIds.add(t.id);
      orderTests.push(t);
    }

    const totalAmount = orderTests.reduce((sum, t) => sum + Number(t.price), 0);

    const isPaid = status !== OrderStatus.PENDING_PAYMENT;

    await prisma.order.create({
      data: {
        orderNumber,
        patientId: patient.id,
        visitId: visit.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        insuranceId: ptIns?.insuranceId || null,
        paymentMethod,
        status,
        totalAmount,
        amountPaid: isPaid ? totalAmount : null,
        paidAt: isPaid ? new Date() : null,
        barcode,
        sampleCollectedAt: (['SAMPLE_COLLECTED', 'IN_ANALYSIS', 'VERIFIED', 'APPROVED'].includes(status)) ? new Date() : null,
        verifiedAt: (['VERIFIED', 'APPROVED'].includes(status)) ? new Date() : null,
        
        orderDetails: {
          create: orderTests.map((t) => {
            let resultValue = null;
            if (isCompleted) {
              // Generate fake result value based on unit (very naive approach)
              if (t.unit === '%') resultValue = randomFloat(30, 50, 1).toString();
              else if (t.unit === 'g/dL') resultValue = randomFloat(10, 16, 1).toString();
              else if (t.unit === 'U/L') resultValue = randomInt(10, 60).toString();
              else if (t.unit === 'mg/dL') resultValue = randomInt(50, 200).toString();
              else if (t.unit === '10^3/µL') resultValue = randomInt(5, 300).toString();
              else resultValue = randomFloat(0.1, 5, 2).toString();
            }

            return {
              testId: t.id,
              price: t.price,
              discount: 0,
              finalPrice: t.price,
              status: status === OrderStatus.VERIFIED ? 'VERIFIED' : status === OrderStatus.IN_ANALYSIS ? 'RESULT_ENTERED' : status === OrderStatus.APPROVED ? 'APPROVED' : 'PENDING',
              resultValue,
            };
          }),
        },
      }
    });

    if (ptIns && paymentMethod !== PaymentMethod.CASH) {
      // Find order just created to attach insurance mapping
      const orderRecord = await prisma.order.findUnique({ where: { orderNumber } });
      if (orderRecord) {
        await prisma.orderInsurance.create({
          data: {
            orderId: orderRecord.id,
            insuranceId: ptIns.insuranceId,
            coverageType: 'PRIMARY',
            claimStatus: 'PENDING',
            memberNumber: ptIns.memberNumber,
          }
        });
      }
    }
  }

  console.log(`[seed] Created 50 comprehensive orders spanning all statuses.`);
}


// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed] ========================================');
  console.log('[seed] === Real World Hospital & Lab Seeder ===');
  console.log('[seed] ========================================');

  await seedDoctors();
  await seedClinics();
  await seedInsurances();
  await seedTestCategories();
  await seedTestMasterAndReferences();
  await seedDummyTransactions();

  console.log('\n[seed] ✅ Real World seeding completed successfully!');
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
