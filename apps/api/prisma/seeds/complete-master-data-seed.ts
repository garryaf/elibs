/**
 * Complete Master Data Seed — Contoh Data Lengkap untuk Semua Fitur Master Data
 *
 * Menambahkan data contoh untuk:
 * 1. Jenis Sampel (SampleTypeMaster)
 * 1b. Metode (MethodMaster)
 * 2. Satuan Ukur (MeasurementUnit)
 * 3. Nilai Referensi (ReferenceValue)
 * 4. Panel / Paket Pemeriksaan
 * 5. Alat (Equipment)
 * 6. Reagen (Reagent)
 * 7. Tarif (multi-tier pricing)
 *
 * Prasyarat: Jalankan seed utama dulu (npx prisma db seed)
 *
 * Cara jalankan:
 *   npx ts-node prisma/seeds/complete-master-data-seed.ts
 */
import { PrismaClient, Gender, EquipmentStatus } from '@prisma/client';

// Module-level prisma instance used only when running standalone
let prisma: PrismaClient;

// ════════════════════════════════════════════════════════════════════════════════
// 1. JENIS SAMPEL (SampleTypeMaster)
// ════════════════════════════════════════════════════════════════════════════════

async function seedSampleTypes(): Promise<void> {
  console.log('\n[seed] === Jenis Sampel ===');

  const sampleTypes = [
    { code: 'EDTA', name: 'Darah EDTA', container: 'Tabung tutup ungu (K3-EDTA)', instructions: 'Homogenisasi 8-10x inversi setelah pengambilan.' },
    { code: 'SST', name: 'Serum (SST)', container: 'Tabung tutup kuning (SST/gel separator)', instructions: 'Diamkan 30 menit sebelum sentrifugasi.' },
    { code: 'CITRATE', name: 'Plasma Citrate', container: 'Tabung tutup biru (Na-Citrate 3.2%)', instructions: 'Isi tepat sampai garis batas.' },
    { code: 'HEPARIN', name: 'Plasma Heparin', container: 'Tabung tutup hijau (Li-Heparin)', instructions: 'Homogenisasi 8-10x inversi.' },
    { code: 'URINE', name: 'Urin', container: 'Cup urin steril', instructions: 'Urin porsi tengah (midstream), pagi hari lebih baik.' },
    { code: 'SPUTUM', name: 'Sputum', container: 'Pot sputum steril', instructions: 'Sampel pagi sebelum makan/minum.' },
    { code: 'FECES', name: 'Feses', container: 'Pot feses steril', instructions: 'Ambil bagian yang berlendir/berdarah jika ada.' },
    { code: 'SWAB', name: 'Swab', container: 'Swab steril dalam transport medium', instructions: 'Kirim segera ke lab.' },
  ];

  for (const st of sampleTypes) {
    const existing = await prisma.sampleTypeMaster.findFirst({ where: { code: st.code } });
    if (existing) {
      console.log(`[seed] Jenis sampel sudah ada: ${st.code}`);
      continue;
    }
    await prisma.sampleTypeMaster.create({ data: st });
    console.log(`[seed] ✅ Jenis Sampel: ${st.code} - ${st.name}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 1b. METODE (MethodMaster)
// ════════════════════════════════════════════════════════════════════════════════

async function seedMethods(): Promise<void> {
  console.log('\n[seed] === Metode ===');

  const methods = [
    { code: 'MTD-FOTOMETRI', name: 'Fotometri', description: 'Pengukuran intensitas cahaya yang diserap/dipancarkan larutan' },
    { code: 'MTD-TURBIDIMETRI', name: 'Turbidimetri', description: 'Pengukuran kekeruhan larutan untuk kuantitasi antigen-antibodi' },
    { code: 'MTD-IMPEDANSI', name: 'Impedansi', description: 'Prinsip Coulter — hitung sel berdasarkan perubahan impedansi listrik' },
    { code: 'MTD-ICT', name: 'Immunochromatography', description: 'Tes cepat berbasis lateral flow (strip test)' },
    { code: 'MTD-ENZYMATIC', name: 'Enzimatik', description: 'Reaksi enzimatik untuk kuantitasi substrat (GOD-PAP, CHOD-PAP, dll)' },
    { code: 'MTD-KINETIC', name: 'Kinetik', description: 'Pengukuran laju reaksi enzim (IFCC/DGKC method)' },
    { code: 'MTD-MICROSCOPY', name: 'Mikroskopi', description: 'Observasi visual menggunakan mikroskop' },
    { code: 'MTD-CULTURA', name: 'Kultur', description: 'Penanaman mikroorganisme di media kultur' },
    { code: 'MTD-DIPSTICK', name: 'Dipstick', description: 'Reaksi kimia kering pada strip (urinalisis)' },
    { code: 'MTD-COAGULOMETRIC', name: 'Koagulometri', description: 'Deteksi pembentukan fibrin (PT, APTT)' },
  ];

  for (const method of methods) {
    const existing = await prisma.methodMaster.findFirst({ where: { code: method.code } });
    if (existing) {
      console.log(`[seed] Metode sudah ada: ${method.code}`);
      continue;
    }
    await prisma.methodMaster.create({ data: method });
    console.log(`[seed] ✅ Metode: ${method.code} - ${method.name}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. SATUAN UKUR (MeasurementUnit)
// ════════════════════════════════════════════════════════════════════════════════

async function seedMeasurementUnits(): Promise<void> {
  console.log('\n[seed] === Satuan Ukur ===');

  const units = [
    { code: 'g/dL', name: 'gram per desiliter', description: 'Satuan untuk hemoglobin, albumin' },
    { code: 'mg/dL', name: 'miligram per desiliter', description: 'Satuan untuk glukosa, kolesterol, kreatinin' },
    { code: 'U/L', name: 'unit per liter', description: 'Satuan untuk enzim (SGOT, SGPT, ALP)' },
    { code: '/µL', name: 'per mikroliter', description: 'Satuan untuk hitung sel darah (WBC, RBC, PLT)' },
    { code: '%', name: 'persen', description: 'Satuan untuk hematokrit, basofil' },
    { code: 'mmol/L', name: 'milimol per liter', description: 'Satuan untuk elektrolit (Na, K, Cl)' },
    { code: 'mIU/mL', name: 'mili-internasional unit per mL', description: 'Satuan untuk hormon (TSH, hCG)' },
    { code: 'ng/mL', name: 'nanogram per mililiter', description: 'Satuan untuk tumor marker, vitamin D' },
    { code: 'pg/mL', name: 'pikogram per mililiter', description: 'Satuan untuk B12, feritin' },
    { code: 'sec', name: 'detik', description: 'Satuan untuk waktu pembekuan (PT, APTT)' },
    { code: 'mm/jam', name: 'milimeter per jam', description: 'Satuan untuk LED (laju endap darah)' },
    { code: 'fL', name: 'femtoliter', description: 'Satuan untuk MCV (volume eritrosit)' },
    { code: 'pg', name: 'pikogram', description: 'Satuan untuk MCH (hemoglobin per eritrosit)' },
  ];

  for (const unit of units) {
    const existing = await prisma.measurementUnit.findFirst({ where: { code: unit.code } });
    if (existing) {
      console.log(`[seed] Satuan sudah ada: ${unit.code}`);
      continue;
    }
    await prisma.measurementUnit.create({ data: unit });
    console.log(`[seed] ✅ Satuan: ${unit.code} - ${unit.name}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. NILAI REFERENSI (ReferenceValue)
// ════════════════════════════════════════════════════════════════════════════════

interface RefValueInput {
  testCode: string;
  gender: Gender;
  minAge: number;
  maxAge: number;
  minRef: number;
  maxRef: number;
  criticalMin?: number;
  criticalMax?: number;
}

const referenceValuesData: RefValueInput[] = [
  // HEM-001 Hemoglobin
  { testCode: 'HEM-001', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 13.0, maxRef: 17.0, criticalMin: 7.0, criticalMax: 20.0 },
  { testCode: 'HEM-001', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 12.0, maxRef: 15.5, criticalMin: 7.0, criticalMax: 20.0 },

  // HEM-002 Hematokrit
  { testCode: 'HEM-002', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 40.0, maxRef: 54.0, criticalMin: 20.0, criticalMax: 65.0 },
  { testCode: 'HEM-002', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 36.0, maxRef: 48.0, criticalMin: 20.0, criticalMax: 65.0 },

  // HEM-003 Leukosit (WBC) — in 10³/µL
  { testCode: 'HEM-003', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 10.0, criticalMin: 2.0, criticalMax: 30.0 },
  { testCode: 'HEM-003', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 4.0, maxRef: 10.0, criticalMin: 2.0, criticalMax: 30.0 },

  // HEM-004 Trombosit (in 10³/µL for DB compatibility — display converts)
  { testCode: 'HEM-004', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 999 },
  { testCode: 'HEM-004', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 150, maxRef: 400, criticalMin: 50, criticalMax: 999 },

  // KIM-001 Glukosa Puasa
  { testCode: 'KIM-001', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 70, maxRef: 100, criticalMin: 40, criticalMax: 500 },
  { testCode: 'KIM-001', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 70, maxRef: 100, criticalMin: 40, criticalMax: 500 },

  // KIM-002 Kolesterol Total
  { testCode: 'KIM-002', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 200 },
  { testCode: 'KIM-002', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 200 },

  // KIM-003 SGOT (AST)
  { testCode: 'KIM-003', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 5, maxRef: 40, criticalMax: 500 },
  { testCode: 'KIM-003', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 5, maxRef: 32, criticalMax: 500 },

  // KIM-004 SGPT (ALT)
  { testCode: 'KIM-004', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 7, maxRef: 56, criticalMax: 1000 },
  { testCode: 'KIM-004', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 7, maxRef: 45, criticalMax: 1000 },

  // KIM-005 Kreatinin
  { testCode: 'KIM-005', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0.7, maxRef: 1.3, criticalMax: 10.0 },
  { testCode: 'KIM-005', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0.6, maxRef: 1.1, criticalMax: 10.0 },

  // URI-002 Protein Urin
  { testCode: 'URI-002', gender: 'MALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 15 },
  { testCode: 'URI-002', gender: 'FEMALE', minAge: 0, maxAge: 150, minRef: 0, maxRef: 15 },
];

async function seedReferenceValues(): Promise<void> {
  console.log('\n[seed] === Nilai Referensi ===');

  // Build test code → id map
  const tests = await prisma.testMaster.findMany({ where: { deletedAt: null } });
  const testMap = new Map(tests.map((t) => [t.code, t.id]));

  let created = 0;
  let skipped = 0;

  for (const rv of referenceValuesData) {
    const testId = testMap.get(rv.testCode);
    if (!testId) {
      console.log(`[seed] ⚠️  Test not found: ${rv.testCode} — skipping`);
      skipped++;
      continue;
    }

    // Check if already exists (unique constraint: testId + gender + minAge + maxAge)
    const existing = await prisma.referenceValue.findFirst({
      where: { testId, gender: rv.gender, minAge: rv.minAge, maxAge: rv.maxAge },
    });
    if (existing) {
      console.log(`[seed] Referensi sudah ada: ${rv.testCode} ${rv.gender}`);
      skipped++;
      continue;
    }

    await prisma.referenceValue.create({
      data: {
        testId,
        gender: rv.gender,
        minAge: rv.minAge,
        maxAge: rv.maxAge,
        minRef: rv.minRef,
        maxRef: rv.maxRef,
        criticalMin: rv.criticalMin ?? null,
        criticalMax: rv.criticalMax ?? null,
      },
    });
    created++;
    console.log(`[seed] ✅ Referensi: ${rv.testCode} ${rv.gender} (${rv.minRef}–${rv.maxRef})`);
  }

  console.log(`[seed] Referensi done. Created: ${created}, Skipped: ${skipped}`);
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. PANEL / PAKET PEMERIKSAAN
// ════════════════════════════════════════════════════════════════════════════════

interface PanelInput {
  name: string;
  description: string;
  price: number;
  testCodes: string[];
}

const panelsData: PanelInput[] = [
  {
    name: 'Darah Lengkap (CBC)',
    description: 'Hematologi rutin: Hemoglobin, Hematokrit, Leukosit, Trombosit',
    price: 85000,
    testCodes: ['HEM-001', 'HEM-002', 'HEM-003', 'HEM-004'],
  },
  {
    name: 'Panel Fungsi Hati',
    description: 'SGOT (AST) dan SGPT (ALT) untuk evaluasi fungsi hati',
    price: 95000,
    testCodes: ['KIM-003', 'KIM-004'],
  },
  {
    name: 'Panel Metabolik Dasar',
    description: 'Glukosa, Kolesterol, dan Kreatinin untuk screening metabolik',
    price: 120000,
    testCodes: ['KIM-001', 'KIM-002', 'KIM-005'],
  },
  {
    name: 'Panel Screening Lengkap',
    description: 'Paket lengkap: hematologi + kimia klinik + urinalisis',
    price: 280000,
    testCodes: ['HEM-001', 'HEM-002', 'HEM-003', 'HEM-004', 'KIM-001', 'KIM-002', 'KIM-003', 'KIM-004', 'KIM-005', 'URI-001'],
  },
  {
    name: 'Panel Serologi Hepatitis',
    description: 'Screening hepatitis B dengan HBsAg rapid test',
    price: 75000,
    testCodes: ['SER-001'],
  },
];

async function seedPanels(): Promise<void> {
  console.log('\n[seed] === Panel / Paket ===');

  const tests = await prisma.testMaster.findMany({ where: { deletedAt: null } });
  const testMap = new Map(tests.map((t) => [t.code, t.id]));

  for (const panel of panelsData) {
    const existing = await prisma.panel.findFirst({ where: { name: panel.name, deletedAt: null } });
    if (existing) {
      console.log(`[seed] Panel sudah ada: ${panel.name}`);
      continue;
    }

    const testIds = panel.testCodes
      .map((code) => testMap.get(code))
      .filter((id): id is string => !!id);

    if (testIds.length < 2 && panel.testCodes.length >= 2) {
      console.log(`[seed] ⚠️  Not enough tests found for panel: ${panel.name}`);
      continue;
    }

    const created = await prisma.panel.create({
      data: {
        name: panel.name,
        description: panel.description,
        price: panel.price,
        panelTests: {
          create: testIds.map((testId) => ({ testId })),
        },
      },
    });
    console.log(`[seed] ✅ Panel: ${created.name} (${testIds.length} tes, Rp ${panel.price.toLocaleString()})`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. ALAT (Equipment)
// ════════════════════════════════════════════════════════════════════════════════

async function seedEquipments(): Promise<void> {
  console.log('\n[seed] === Alat ===');

  const equipments = [
    { code: 'EQP-001', name: 'Hematology Analyzer BC-5380', manufacturer: 'Mindray', model: 'BC-5380', serialNumber: 'MR2024-HEM-001', location: 'Lab Hematologi', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-002', name: 'Chemistry Analyzer BS-480', manufacturer: 'Mindray', model: 'BS-480', serialNumber: 'MR2024-CHM-001', location: 'Lab Kimia Klinik', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-003', name: 'Urinalysis Analyzer UC-3500', manufacturer: 'Sysmex', model: 'UC-3500', serialNumber: 'SX2023-URI-001', location: 'Lab Urinalisis', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-004', name: 'Centrifuge EBA 200S', manufacturer: 'Hettich', model: 'EBA 200S', serialNumber: 'HT2024-CTF-001', location: 'Area Pre-Analitik', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-005', name: 'Microscope CX43', manufacturer: 'Olympus', model: 'CX43', serialNumber: 'OL2024-MIC-001', location: 'Lab Mikrobiologi', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-006', name: 'Refrigerator Lab -20°C', manufacturer: 'Thermo Fisher', model: 'TSX Series', serialNumber: 'TF2023-REF-001', location: 'Ruang Penyimpanan', status: EquipmentStatus.ACTIVE },
    { code: 'EQP-007', name: 'Coagulation Analyzer CA-660', manufacturer: 'Sysmex', model: 'CA-660', serialNumber: 'SX2024-COA-001', location: 'Lab Hematologi', status: EquipmentStatus.MAINTENANCE },
  ];

  for (const eq of equipments) {
    const existing = await prisma.equipment.findFirst({ where: { code: eq.code } });
    if (existing) {
      console.log(`[seed] Alat sudah ada: ${eq.code}`);
      continue;
    }
    await prisma.equipment.create({
      data: {
        code: eq.code,
        name: eq.name,
        manufacturer: eq.manufacturer,
        model: eq.model,
        serialNumber: eq.serialNumber,
        location: eq.location,
        status: eq.status,
      },
    });
    console.log(`[seed] ✅ Alat: ${eq.code} - ${eq.name} (${eq.status})`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. REAGEN (Reagent)
// ════════════════════════════════════════════════════════════════════════════════

async function seedReagents(): Promise<void> {
  console.log('\n[seed] === Reagen ===');

  const reagents = [
    { code: 'RGN-001', name: 'M-53D Diluent', manufacturer: 'Mindray', lotNumber: 'LOT-2026-001', expiryDate: new Date('2027-06-30'), quantity: 5, unit: 'Liter', storageTemp: '15-30°C' },
    { code: 'RGN-002', name: 'M-53D Lyse', manufacturer: 'Mindray', lotNumber: 'LOT-2026-002', expiryDate: new Date('2027-06-30'), quantity: 3, unit: 'Liter', storageTemp: '15-30°C' },
    { code: 'RGN-003', name: 'M-53D Rinse', manufacturer: 'Mindray', lotNumber: 'LOT-2026-003', expiryDate: new Date('2027-12-31'), quantity: 4, unit: 'Liter', storageTemp: '15-30°C' },
    { code: 'RGN-004', name: 'Glucose Reagent GOD-PAP', manufacturer: 'DiaSys', lotNumber: 'LOT-2026-101', expiryDate: new Date('2027-03-31'), quantity: 10, unit: 'mL (100mL/bottle)', storageTemp: '2-8°C' },
    { code: 'RGN-005', name: 'Cholesterol CHOD-PAP', manufacturer: 'DiaSys', lotNumber: 'LOT-2026-102', expiryDate: new Date('2027-03-31'), quantity: 8, unit: 'mL (100mL/bottle)', storageTemp: '2-8°C' },
    { code: 'RGN-006', name: 'AST/GOT Reagent', manufacturer: 'DiaSys', lotNumber: 'LOT-2026-103', expiryDate: new Date('2027-04-30'), quantity: 6, unit: 'mL (50mL/bottle)', storageTemp: '2-8°C' },
    { code: 'RGN-007', name: 'ALT/GPT Reagent', manufacturer: 'DiaSys', lotNumber: 'LOT-2026-104', expiryDate: new Date('2027-04-30'), quantity: 6, unit: 'mL (50mL/bottle)', storageTemp: '2-8°C' },
    { code: 'RGN-008', name: 'Creatinine Jaffe Reagent', manufacturer: 'DiaSys', lotNumber: 'LOT-2026-105', expiryDate: new Date('2027-05-31'), quantity: 5, unit: 'mL (100mL/bottle)', storageTemp: '2-8°C' },
    { code: 'RGN-009', name: 'HBsAg Rapid Test Kit', manufacturer: 'SD Biosensor', lotNumber: 'LOT-2026-201', expiryDate: new Date('2027-09-30'), quantity: 50, unit: 'pcs', storageTemp: '2-30°C' },
    { code: 'RGN-010', name: 'Urine Test Strip 10P', manufacturer: 'Dirui', lotNumber: 'LOT-2026-301', expiryDate: new Date('2027-08-31'), quantity: 200, unit: 'pcs', storageTemp: '15-30°C' },
  ];

  for (const rg of reagents) {
    const existing = await prisma.reagent.findFirst({ where: { code: rg.code } });
    if (existing) {
      console.log(`[seed] Reagen sudah ada: ${rg.code}`);
      continue;
    }
    await prisma.reagent.create({
      data: {
        code: rg.code,
        name: rg.name,
        manufacturer: rg.manufacturer,
        lotNumber: rg.lotNumber,
        expiryDate: rg.expiryDate,
        quantity: rg.quantity,
        unit: rg.unit,
        storageTemp: rg.storageTemp,
      },
    });
    console.log(`[seed] ✅ Reagen: ${rg.code} - ${rg.name} (stok: ${rg.quantity} ${rg.unit})`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. TARIF (Multi-tier Pricing)
// ════════════════════════════════════════════════════════════════════════════════

async function seedTariffs(): Promise<void> {
  console.log('\n[seed] === Tarif ===');

  const tests = await prisma.testMaster.findMany({ where: { deletedAt: null } });
  const testMap = new Map(tests.map((t) => [t.code, t.id]));

  const clinics = await prisma.clinic.findMany({ where: { isActive: true } });
  const insurances = await prisma.insurance.findMany({ where: { isActive: true } });

  const klinikUtama = clinics.find((c) => c.code === 'CLN-001');
  const bpjs = insurances.find((i) => i.code === 'INS-001');
  const prudential = insurances.find((i) => i.code === 'INS-002');

  if (!klinikUtama || !bpjs || !prudential) {
    console.log('[seed] ⚠️  Klinik/Asuransi belum lengkap, skip tarif');
    return;
  }

  // Tarif khusus BPJS (diskon 20% dari harga standar)
  const bpjsTariffs = [
    { testCode: 'HEM-001', price: 28000, discount: 0 },
    { testCode: 'HEM-003', price: 32000, discount: 0 },
    { testCode: 'KIM-001', price: 36000, discount: 0 },
    { testCode: 'KIM-005', price: 40000, discount: 0 },
  ];

  for (const tariff of bpjsTariffs) {
    const testId = testMap.get(tariff.testCode);
    if (!testId) continue;

    const existing = await prisma.tariff.findFirst({
      where: { testId, insuranceId: bpjs.id, clinicId: null },
    });
    if (existing) {
      console.log(`[seed] Tarif BPJS sudah ada: ${tariff.testCode}`);
      continue;
    }

    await prisma.tariff.create({
      data: {
        testId,
        insuranceId: bpjs.id,
        clinicId: null,
        price: tariff.price,
        discount: tariff.discount,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    console.log(`[seed] ✅ Tarif BPJS: ${tariff.testCode} = Rp ${tariff.price.toLocaleString()}`);
  }

  // Tarif khusus Klinik Utama Sehat (diskon 10%)
  const clinicTariffs = [
    { testCode: 'HEM-001', price: 31500, discount: 10 },
    { testCode: 'KIM-001', price: 40500, discount: 10 },
    { testCode: 'KIM-002', price: 45000, discount: 10 },
  ];

  for (const tariff of clinicTariffs) {
    const testId = testMap.get(tariff.testCode);
    if (!testId) continue;

    const existing = await prisma.tariff.findFirst({
      where: { testId, clinicId: klinikUtama.id, insuranceId: null },
    });
    if (existing) {
      console.log(`[seed] Tarif klinik sudah ada: ${tariff.testCode}`);
      continue;
    }

    await prisma.tariff.create({
      data: {
        testId,
        clinicId: klinikUtama.id,
        insuranceId: null,
        price: tariff.price,
        discount: tariff.discount,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    console.log(`[seed] ✅ Tarif Klinik Utama: ${tariff.testCode} = Rp ${tariff.price.toLocaleString()} (diskon ${tariff.discount}%)`);
  }

  // Tarif Prudential (harga premium)
  const prudentialTariffs = [
    { testCode: 'HEM-001', price: 45000, discount: 0 },
    { testCode: 'KIM-001', price: 55000, discount: 0 },
    { testCode: 'KIM-003', price: 65000, discount: 0 },
    { testCode: 'KIM-004', price: 65000, discount: 0 },
  ];

  for (const tariff of prudentialTariffs) {
    const testId = testMap.get(tariff.testCode);
    if (!testId) continue;

    const existing = await prisma.tariff.findFirst({
      where: { testId, insuranceId: prudential.id, clinicId: null },
    });
    if (existing) {
      console.log(`[seed] Tarif Prudential sudah ada: ${tariff.testCode}`);
      continue;
    }

    await prisma.tariff.create({
      data: {
        testId,
        insuranceId: prudential.id,
        clinicId: null,
        price: tariff.price,
        discount: tariff.discount,
        effectiveFrom: new Date('2026-01-01'),
      },
    });
    console.log(`[seed] ✅ Tarif Prudential: ${tariff.testCode} = Rp ${tariff.price.toLocaleString()}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTED FUNCTION — for use from main seed index
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Seeds all complete master data. Can be called from the main seed index
 * by passing an existing PrismaClient instance, or run standalone.
 */
export async function seedCompleteMasterData(client?: PrismaClient): Promise<void> {
  prisma = client ?? new PrismaClient();

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  eLIS — Complete Master Data Seed (Contoh Data Lengkap) ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await seedSampleTypes();
  await seedMethods();
  await seedMeasurementUnits();
  await seedReferenceValues();
  await seedPanels();
  await seedEquipments();
  await seedReagents();
  await seedTariffs();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Complete master data seeding finished!');
  console.log('');
  console.log('Data yang ditambahkan:');
  console.log('  • Jenis Sampel: 8 records (EDTA, SST, Citrate, dll)');
  console.log('  • Metode: 10 records (Fotometri, Turbidimetri, Impedansi, dll)');
  console.log('  • Satuan Ukur: 13 records (g/dL, mg/dL, U/L, dll)');
  console.log('  • Nilai Referensi: 20 records (per gender per tes)');
  console.log('  • Panel/Paket: 5 records (CBC, Fungsi Hati, dll)');
  console.log('  • Alat: 7 records (Analyzer, Centrifuge, dll)');
  console.log('  • Reagen: 10 records (Diluent, GOD-PAP, dll)');
  console.log('  • Tarif: 11 records (BPJS, Klinik, Prudential)');
  console.log('═══════════════════════════════════════════════════════════');

  // Only disconnect if we created the client ourselves (standalone mode)
  if (!client) {
    await prisma.$disconnect();
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// STANDALONE MAIN — only runs when executed directly
// ════════════════════════════════════════════════════════════════════════════════

// Check if this file is being run directly (not imported)
const isRunDirectly = require.main === module;

if (isRunDirectly) {
  seedCompleteMasterData()
    .catch((error: unknown) => {
      console.error(`[seed] Fatal: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    });
}
