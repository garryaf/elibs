/**
 * Audit Dummy Data Seed
 * Creates 5+ realistic patient cases with full workflow data
 * for comprehensive frontend-to-backend testing across multiple user roles.
 *
 * Run: npx ts-node prisma/seeds/audit-dummy-data.ts
 */
import { PrismaClient, Gender, PaymentMethod, OrderStatus, VisitStatus, InsuranceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Additional Test Users (different roles) ─────────────────────────────────

async function seedAdditionalUsers(): Promise<void> {
  console.log('\n[audit-seed] === Additional Users for Multi-Role Testing ===');

  const passwordHash = await bcrypt.hash('Demo@1234', 12);
  const users = [
    { email: 'owner@elis.local', name: 'Pemilik Lab', role: 'OWNER' as const },
    { email: 'manager@elis.local', name: 'Manager Lab', role: 'MANAGER' as const },
    { email: 'cs@elis.local', name: 'Customer Service', role: 'CS' as const },
    { email: 'marketing@elis.local', name: 'Tim Marketing', role: 'MARKETING' as const },
    { email: 'klinik@elis.local', name: 'Klinik Partner Sehat', role: 'KLINIK_PARTNER' as const },
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (existing) {
      console.log(`[audit-seed] User exists: ${user.email}`);
      continue;
    }
    await prisma.user.create({ data: { ...user, passwordHash } });
    console.log(`[audit-seed] ✅ Created: ${user.email} (${user.role})`);
  }
}

// ─── 5 Realistic Patient Cases ───────────────────────────────────────────────

interface PatientCase {
  nik: string;
  name: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  address: string;
  email?: string;
  bloodType?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

const patientCases: PatientCase[] = [
  {
    nik: '3201011234560001',
    name: 'Ahmad Suryadi',
    dateOfBirth: new Date('1985-03-15'),
    gender: Gender.MALE,
    phone: '081234567890',
    address: 'Jl. Merdeka No. 45, Bandung',
    email: 'ahmad.suryadi@gmail.com',
    bloodType: 'O+',
    emergencyContact: 'Siti Suryadi',
    emergencyPhone: '081234567891',
  },
  {
    nik: '3201011234560002',
    name: 'Dewi Kartini',
    dateOfBirth: new Date('1990-08-22'),
    gender: Gender.FEMALE,
    phone: '081345678901',
    address: 'Jl. Sudirman No. 12, Jakarta Selatan',
    email: 'dewi.kartini@yahoo.com',
    bloodType: 'A+',
    emergencyContact: 'Budi Kartini',
    emergencyPhone: '081345678902',
  },
  {
    nik: '3201011234560003',
    name: 'Budi Raharjo',
    dateOfBirth: new Date('1978-11-05'),
    gender: Gender.MALE,
    phone: '081456789012',
    address: 'Jl. Gatot Subroto No. 88, Surabaya',
    bloodType: 'B+',
    emergencyContact: 'Ani Raharjo',
    emergencyPhone: '081456789013',
  },
  {
    nik: '3201011234560004',
    name: 'Sari Indah Permatasari',
    dateOfBirth: new Date('1995-02-14'),
    gender: Gender.FEMALE,
    phone: '081567890123',
    address: 'Jl. Diponegoro No. 33, Semarang',
    email: 'sari.permata@outlook.com',
    bloodType: 'AB+',
    emergencyContact: 'Rudi Permata',
    emergencyPhone: '081567890124',
  },
  {
    nik: '3201011234560005',
    name: 'Hendra Gunawan',
    dateOfBirth: new Date('1965-07-30'),
    gender: Gender.MALE,
    phone: '081678901234',
    address: 'Jl. Asia Afrika No. 7, Bandung',
    email: 'hendra.gunawan@gmail.com',
    bloodType: 'O-',
    emergencyContact: 'Maria Gunawan',
    emergencyPhone: '081678901235',
  },
];

async function seedPatients(): Promise<string[]> {
  console.log('\n[audit-seed] === Patients (5 realistic cases) ===');

  const patientIds: string[] = [];
  let mrnCounter = 1;

  for (const patient of patientCases) {
    const existing = await prisma.patient.findUnique({ where: { nik: patient.nik } });
    if (existing) {
      console.log(`[audit-seed] Patient exists: ${patient.name} (${patient.nik})`);
      patientIds.push(existing.id);
      continue;
    }

    // Generate MRN
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const mrn = `MRN-${year}${month}-${String(mrnCounter).padStart(5, '0')}`;
    mrnCounter++;

    const created = await prisma.patient.create({
      data: {
        mrn,
        ...patient,
      },
    });
    patientIds.push(created.id);
    console.log(`[audit-seed] ✅ Patient: ${patient.name} (MRN: ${mrn})`);
  }

  return patientIds;
}

// ─── Patient Insurance Assignments ───────────────────────────────────────────

async function seedPatientInsurances(patientIds: string[]): Promise<void> {
  console.log('\n[audit-seed] === Patient Insurance Assignments ===');

  // Get insurance IDs
  const bpjs = await prisma.insurance.findUnique({ where: { code: 'INS-001' } });
  const prudential = await prisma.insurance.findUnique({ where: { code: 'INS-002' } });
  const astra = await prisma.insurance.findUnique({ where: { code: 'INS-004' } });

  if (!bpjs || !prudential || !astra) {
    console.log('[audit-seed] ⚠️ Insurance records not found, skipping');
    return;
  }

  const assignments = [
    // Ahmad Suryadi → BPJS (primary)
    { patientId: patientIds[0], insuranceId: bpjs.id, priority: 1, type: InsuranceType.BPJS, memberNumber: '0001234567890', bpjsClassLevel: 1 },
    // Dewi Kartini → Prudential (primary)
    { patientId: patientIds[1], insuranceId: prudential.id, priority: 1, type: InsuranceType.SWASTA, memberNumber: 'PRU-2024-001234', policyNumber: 'POL-87654321' },
    // Budi Raharjo → BPJS (primary) + Astra Corporate (secondary)
    { patientId: patientIds[2], insuranceId: bpjs.id, priority: 1, type: InsuranceType.BPJS, memberNumber: '0001234567891', bpjsClassLevel: 2 },
    { patientId: patientIds[2], insuranceId: astra.id, priority: 2, type: InsuranceType.CORPORATE, memberNumber: 'AST-EMP-005678' },
    // Sari → Prudential
    { patientId: patientIds[3], insuranceId: prudential.id, priority: 1, type: InsuranceType.SWASTA, memberNumber: 'PRU-2024-005678' },
    // Hendra → No insurance (cash patient)
  ];

  for (const a of assignments) {
    const existing = await prisma.patientInsurance.findUnique({
      where: { patientId_insuranceId: { patientId: a.patientId, insuranceId: a.insuranceId } },
    });
    if (existing) {
      console.log(`[audit-seed] Insurance assignment exists for patient ${a.patientId.slice(0, 8)}`);
      continue;
    }
    await prisma.patientInsurance.create({
      data: {
        patientId: a.patientId,
        insuranceId: a.insuranceId,
        priority: a.priority,
        type: a.type,
        memberNumber: a.memberNumber || null,
        policyNumber: (a as any).policyNumber || null,
        bpjsClassLevel: a.bpjsClassLevel || null,
        isActive: true,
      },
    });
    console.log(`[audit-seed] ✅ Insurance: Patient ${a.patientId.slice(0, 8)} → ${a.type} (priority ${a.priority})`);
  }
}

// ─── Visits & Orders with Full Workflow ──────────────────────────────────────

async function seedVisitsAndOrders(patientIds: string[]): Promise<void> {
  console.log('\n[audit-seed] === Visits & Orders (5 cases) ===');

  // Get references
  const doctor = await prisma.doctor.findUnique({ where: { code: 'DR-001' } });
  const clinic = await prisma.clinic.findUnique({ where: { code: 'CLN-001' } });
  const bpjs = await prisma.insurance.findUnique({ where: { code: 'INS-001' } });
  const prudential = await prisma.insurance.findUnique({ where: { code: 'INS-002' } });

  if (!doctor || !clinic) {
    console.log('[audit-seed] ⚠️ Doctor/Clinic not found, skipping orders');
    return;
  }

  // Get test IDs
  const hemoglobin = await prisma.testMaster.findUnique({ where: { code: 'HEM-001' } });
  const cbc = await prisma.testMaster.findUnique({ where: { code: 'HEM-005' } });
  const glukosa = await prisma.testMaster.findUnique({ where: { code: 'KIM-001' } });
  const kolesterol = await prisma.testMaster.findUnique({ where: { code: 'KIM-002' } });
  const sgot = await prisma.testMaster.findUnique({ where: { code: 'KIM-003' } });
  const sgpt = await prisma.testMaster.findUnique({ where: { code: 'KIM-004' } });
  const kreatinin = await prisma.testMaster.findUnique({ where: { code: 'KIM-005' } });
  const hbsag = await prisma.testMaster.findUnique({ where: { code: 'SER-001' } });
  const urinalisis = await prisma.testMaster.findUnique({ where: { code: 'URI-001' } });

  if (!hemoglobin || !cbc || !glukosa || !kolesterol || !sgot || !sgpt || !kreatinin || !hbsag || !urinalisis) {
    console.log('[audit-seed] ⚠️ Some tests not found, skipping');
    return;
  }

  // Generate sequential visit/order numbers
  const now = new Date();
  const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  // Case 1: Ahmad → BPJS patient, CBC + Glukosa, PAID status
  const visit1 = await createVisitIfNotExists(
    `VST-${datePrefix}-AUD01`,
    patientIds[0], doctor.id, clinic.id, PaymentMethod.BPJS, bpjs?.id,
  );
  if (visit1) {
    await createOrderIfNotExists(
      `ORD-${datePrefix}-AUD01`,
      patientIds[0], visit1.id, doctor.id, clinic.id, bpjs?.id, PaymentMethod.BPJS,
      OrderStatus.PAID,
      [
        { testId: cbc.id, price: 85000 },
        { testId: glukosa.id, price: 45000 },
      ],
    );
    console.log(`[audit-seed] ✅ Case 1: Ahmad - BPJS, CBC+Glukosa, PAID`);
  }

  // Case 2: Dewi → Private Insurance, Full Panel (Hematologi + Kimia), IN_ANALYSIS
  const visit2 = await createVisitIfNotExists(
    `VST-${datePrefix}-AUD02`,
    patientIds[1], doctor.id, clinic.id, PaymentMethod.INSURANCE, prudential?.id,
  );
  if (visit2) {
    await createOrderIfNotExists(
      `ORD-${datePrefix}-AUD02`,
      patientIds[1], visit2.id, doctor.id, clinic.id, prudential?.id, PaymentMethod.INSURANCE,
      OrderStatus.IN_ANALYSIS,
      [
        { testId: cbc.id, price: 85000 },
        { testId: sgot.id, price: 55000 },
        { testId: sgpt.id, price: 55000 },
        { testId: kolesterol.id, price: 50000 },
        { testId: kreatinin.id, price: 50000 },
      ],
    );
    console.log(`[audit-seed] ✅ Case 2: Dewi - Prudential, Full Panel, IN_ANALYSIS`);
  }

  // Case 3: Budi → BPJS + Corporate, Urgent tests, SAMPLE_COLLECTED
  const visit3 = await createVisitIfNotExists(
    `VST-${datePrefix}-AUD03`,
    patientIds[2], doctor.id, clinic.id, PaymentMethod.BPJS, bpjs?.id,
  );
  if (visit3) {
    await createOrderIfNotExists(
      `ORD-${datePrefix}-AUD03`,
      patientIds[2], visit3.id, doctor.id, clinic.id, bpjs?.id, PaymentMethod.BPJS,
      OrderStatus.SAMPLE_COLLECTED,
      [
        { testId: hemoglobin.id, price: 35000 },
        { testId: hbsag.id, price: 75000 },
        { testId: urinalisis.id, price: 50000 },
      ],
    );
    console.log(`[audit-seed] ✅ Case 3: Budi - BPJS+Corp, Hb+HBsAg+Urinalisis, SAMPLE_COLLECTED`);
  }

  // Case 4: Sari → Private insurance, single test, PENDING_PAYMENT
  const visit4 = await createVisitIfNotExists(
    `VST-${datePrefix}-AUD04`,
    patientIds[3], doctor.id, clinic.id, PaymentMethod.INSURANCE, prudential?.id,
  );
  if (visit4) {
    await createOrderIfNotExists(
      `ORD-${datePrefix}-AUD04`,
      patientIds[3], visit4.id, doctor.id, clinic.id, prudential?.id, PaymentMethod.INSURANCE,
      OrderStatus.PENDING_PAYMENT,
      [
        { testId: glukosa.id, price: 45000 },
        { testId: kolesterol.id, price: 50000 },
      ],
    );
    console.log(`[audit-seed] ✅ Case 4: Sari - Prudential, Glukosa+Kolesterol, PENDING_PAYMENT`);
  }

  // Case 5: Hendra → Cash patient, VERIFIED (complete workflow)
  const visit5 = await createVisitIfNotExists(
    `VST-${datePrefix}-AUD05`,
    patientIds[4], doctor.id, clinic.id, PaymentMethod.CASH, undefined,
  );
  if (visit5) {
    await createOrderIfNotExists(
      `ORD-${datePrefix}-AUD05`,
      patientIds[4], visit5.id, doctor.id, clinic.id, undefined, PaymentMethod.CASH,
      OrderStatus.VERIFIED,
      [
        { testId: cbc.id, price: 85000 },
        { testId: sgot.id, price: 55000 },
        { testId: sgpt.id, price: 55000 },
        { testId: glukosa.id, price: 45000 },
        { testId: kreatinin.id, price: 50000 },
        { testId: urinalisis.id, price: 50000 },
      ],
    );
    console.log(`[audit-seed] ✅ Case 5: Hendra - Cash, Full Panel, VERIFIED`);
  }
}

async function createVisitIfNotExists(
  visitNumber: string,
  patientId: string,
  doctorId: string,
  clinicId: string,
  paymentMethod: PaymentMethod,
  insuranceId?: string,
) {
  const existing = await prisma.visit.findUnique({ where: { visitNumber } });
  if (existing) {
    console.log(`[audit-seed] Visit exists: ${visitNumber}`);
    return existing;
  }

  return prisma.visit.create({
    data: {
      visitNumber,
      patientId,
      doctorId,
      clinicId,
      paymentMethod,
      insuranceId: insuranceId || null,
      status: VisitStatus.IN_PROGRESS,
    },
  });
}

async function createOrderIfNotExists(
  orderNumber: string,
  patientId: string,
  visitId: string,
  doctorId: string,
  clinicId: string,
  insuranceId: string | undefined,
  paymentMethod: PaymentMethod,
  status: OrderStatus,
  tests: Array<{ testId: string; price: number }>,
) {
  const existing = await prisma.order.findUnique({ where: { orderNumber } });
  if (existing) {
    console.log(`[audit-seed] Order exists: ${orderNumber}`);
    return existing;
  }

  const totalAmount = tests.reduce((sum, t) => sum + t.price, 0);

  const order = await prisma.order.create({
    data: {
      orderNumber,
      patientId,
      visitId,
      doctorId,
      clinicId,
      insuranceId: insuranceId || null,
      paymentMethod,
      status,
      totalAmount,
      amountPaid: status !== OrderStatus.PENDING_PAYMENT ? totalAmount : null,
      paidAt: status !== OrderStatus.PENDING_PAYMENT ? new Date() : null,
      barcode: orderNumber.replace('ORD-', 'BC-'),
      sampleCollectedAt: (['SAMPLE_COLLECTED', 'IN_ANALYSIS', 'VERIFIED', 'APPROVED'] as string[]).includes(status) ? new Date() : null,
      verifiedAt: (['VERIFIED', 'APPROVED'] as string[]).includes(status) ? new Date() : null,
      orderDetails: {
        create: tests.map((t) => ({
          testId: t.testId,
          price: t.price,
          discount: 0,
          finalPrice: t.price,
          status: status === OrderStatus.VERIFIED ? 'VERIFIED' : status === OrderStatus.IN_ANALYSIS ? 'RESULT_ENTERED' : 'PENDING',
          resultValue: (['IN_ANALYSIS', 'VERIFIED', 'APPROVED'] as string[]).includes(status) ? generateResultValue() : null,
        })),
      },
    },
  });

  return order;
}

function generateResultValue(): string {
  // Generate realistic lab result values
  const values = ['12.5', '14.2', '98', '250000', '95', '180', '35', '42', '0.9', 'Non-Reactive'];
  return values[Math.floor(Math.random() * values.length)];
}

// ─── Main Execution ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[audit-seed] ════════════════════════════════════════');
  console.log('[audit-seed] === eLIS Audit Dummy Data Seed ===');
  console.log('[audit-seed] ════════════════════════════════════════');
  console.log('[audit-seed] Creates realistic test data for full audit testing');
  console.log('[audit-seed] across multiple user roles and business processes.\n');

  await seedAdditionalUsers();
  const patientIds = await seedPatients();
  await seedPatientInsurances(patientIds);
  await seedVisitsAndOrders(patientIds);

  console.log('\n[audit-seed] ════════════════════════════════════════');
  console.log('[audit-seed] ✅ Audit dummy data seeding complete!');
  console.log('[audit-seed] ════════════════════════════════════════');
  console.log('[audit-seed] Test accounts:');
  console.log('[audit-seed]   admin@elis.local / Admin@1234 (SUPER_ADMIN)');
  console.log('[audit-seed]   owner@elis.local / Demo@1234 (OWNER)');
  console.log('[audit-seed]   manager@elis.local / Demo@1234 (MANAGER)');
  console.log('[audit-seed]   kasir@elis.local / Demo@1234 (KASIR)');
  console.log('[audit-seed]   analis@elis.local / Demo@1234 (ANALIS)');
  console.log('[audit-seed]   dokter@elis.local / Demo@1234 (DOKTER)');
  console.log('[audit-seed]   sampling@elis.local / Demo@1234 (SAMPLING)');
  console.log('[audit-seed]   cs@elis.local / Demo@1234 (CS)');
  console.log('[audit-seed]   marketing@elis.local / Demo@1234 (MARKETING)');
  console.log('[audit-seed]   klinik@elis.local / Demo@1234 (KLINIK_PARTNER)');
  console.log('\n[audit-seed] Patient cases:');
  console.log('[audit-seed]   1. Ahmad Suryadi - BPJS, CBC+Glukosa → PAID');
  console.log('[audit-seed]   2. Dewi Kartini - Prudential, Full Panel → IN_ANALYSIS');
  console.log('[audit-seed]   3. Budi Raharjo - BPJS+Corporate, Hb+HBsAg → SAMPLE_COLLECTED');
  console.log('[audit-seed]   4. Sari Permatasari - Prudential, Glukosa+Kolesterol → PENDING_PAYMENT');
  console.log('[audit-seed]   5. Hendra Gunawan - Cash, Full Panel → VERIFIED');
}

main()
  .catch((error: unknown) => {
    console.error(`[audit-seed] Fatal: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
