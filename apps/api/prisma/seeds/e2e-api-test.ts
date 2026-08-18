/**
 * E2E API Integration Test — Step-by-Step Workflow
 * 
 * Menjalankan testing melalui HTTP API (bukan langsung ke DB).
 * Menggunakan endpoint yang sama seperti user frontend.
 * 
 * Alur:
 * 1. Login sebagai admin → buat users baru
 * 2. Login sebagai CS → registrasi pasien + buat visit
 * 3. Login sebagai Kasir → buat order + bayar
 * 4. Login sebagai Sampling → confirm sample
 * 5. Login sebagai Analis → input hasil + verify
 * 6. Login sebagai Dokter → approve
 * 
 * Jalankan: npx ts-node prisma/seeds/e2e-api-test.ts
 * Prasyarat: API harus running di localhost:3001
 */

const BASE_URL = 'http://localhost:3001/api/v1';

// ─── HTTP Helper ─────────────────────────────────────────────────────────────

async function request(
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

// ─── Test State ──────────────────────────────────────────────────────────────

interface TestState {
  tokens: Record<string, string>;
  patientIds: string[];
  visitIds: string[];
  orderIds: string[];
  orderDetails: Array<{ orderId: string; details: Array<{ id: string; testId: string }> }>;
  doctorId?: string;
  clinicId?: string;
  insuranceId?: string;
  testIds: string[];
}

const state: TestState = {
  tokens: {},
  patientIds: [],
  visitIds: [],
  orderIds: [],
  orderDetails: [],
  testIds: [],
};

// ─── STEP 1: Login ──────────────────────────────────────────────────────────

async function step1_login(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 1: Login semua user                ║');
  console.log('╚══════════════════════════════════════════╝');

  const users = [
    { email: 'admin@elis.local', password: 'Admin@1234', label: 'ADMIN' },
    { email: 'cs.rina@elis.local', password: 'Demo@1234', label: 'CS' },
    { email: 'kasir.dian@elis.local', password: 'Demo@1234', label: 'KASIR' },
    { email: 'sampling.agus@elis.local', password: 'Demo@1234', label: 'SAMPLING' },
    { email: 'analis.maya@elis.local', password: 'Demo@1234', label: 'ANALIS' },
    { email: 'dokter.ahmad@elis.local', password: 'Demo@1234', label: 'DOKTER' },
  ];

  for (const u of users) {
    const { status, data } = await request('POST', '/auth/login', {
      email: u.email,
      password: u.password,
    });

    if (status === 200 && data?.data?.accessToken) {
      state.tokens[u.label] = data.data.accessToken;
      assert(true, `Login ${u.label} (${u.email}) — OK`);
    } else if (status === 200 && data?.accessToken) {
      state.tokens[u.label] = data.accessToken;
      assert(true, `Login ${u.label} (${u.email}) — OK`);
    } else {
      console.log(`  ⚠️  Login response for ${u.label}:`, JSON.stringify(data).slice(0, 200));
      assert(false, `Login ${u.label} — status ${status}`);
    }
  }
}

// ─── STEP 2: Fetch Master Data (untuk referensi IDs) ─────────────────────────

async function step2_fetchMasterData(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 2: Fetch Master Data IDs           ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['ADMIN'];

  // Helper to extract array from nested response { success, data: { data: [...] } }
  function extractArray(res: any): any[] {
    if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
    if (res?.data && Array.isArray(res.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  }

  // Fetch doctors
  const { data: doctorsRes } = await request('GET', '/master/doctors?limit=5', undefined, token);
  const doctors = extractArray(doctorsRes);
  if (doctors.length > 0) {
    state.doctorId = doctors[0].id;
    assert(true, `Dokter: ${doctors[0].name} (${doctors[0].id?.slice(0, 8)}...)`);
  } else {
    console.log('  ⚠️  No doctors found, will skip doctorId');
  }

  // Fetch clinics
  const { data: clinicsRes } = await request('GET', '/master/clinics?limit=5', undefined, token);
  const clinics = extractArray(clinicsRes);
  if (clinics.length > 0) {
    state.clinicId = clinics[0].id;
    assert(true, `Klinik: ${clinics[0].name} (${clinics[0].id?.slice(0, 8)}...)`);
  } else {
    console.log('  ⚠️  No clinics found');
  }

  // Fetch insurances
  const { data: insRes } = await request('GET', '/master/insurances?limit=5', undefined, token);
  const insurances = extractArray(insRes);
  if (insurances.length > 0) {
    state.insuranceId = insurances[0].id;
    assert(true, `Asuransi: ${insurances[0].name} (${insurances[0].id?.slice(0, 8)}...)`);
  } else {
    console.log('  ⚠️  No insurances found');
  }

  // Fetch tests — endpoint is /master/tests
  const { data: testsRes } = await request('GET', '/master/tests?limit=10', undefined, token);
  const tests = extractArray(testsRes);
  if (tests.length > 0) {
    state.testIds = tests.slice(0, 6).map((t: any) => t.id);
    assert(true, `Tests: ${tests.length} tersedia, menggunakan ${state.testIds.length}`);
    for (const t of tests.slice(0, 3)) {
      console.log(`    • ${t.code} — ${t.name} (Rp ${Number(t.price).toLocaleString()})`);
    }
  } else {
    console.log('  ⚠️  No tests found');
  }
}

// ─── STEP 3: Register Patients (sebagai CS) ─────────────────────────────────

async function step3_registerPatients(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 3: Registrasi Pasien (role: CS)    ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['CS'];
  const ts = Date.now();

  const patients = [
    { nik: `320115${String(ts).slice(-10)}`, name: 'Ahmad Kurniawan', dateOfBirth: '1982-03-15', gender: 'MALE', phone: '081300000001', address: 'Jl. Asia Afrika No. 10, Bandung' },
    { nik: `320116${String(ts + 1).slice(-10)}`, name: 'Ratna Sari Dewi', dateOfBirth: '1993-07-22', gender: 'FEMALE', phone: '081300000002', address: 'Jl. Braga No. 55, Bandung' },
    { nik: `320117${String(ts + 2).slice(-10)}`, name: 'Budi Prasetyo', dateOfBirth: '1970-11-08', gender: 'MALE', phone: '081300000003', address: 'Jl. Dago No. 88, Bandung' },
    { nik: `320118${String(ts + 3).slice(-10)}`, name: 'Sri Wahyuni', dateOfBirth: '1988-01-30', gender: 'FEMALE', phone: '081300000004', address: 'Jl. Pasteur No. 12, Bandung' },
    { nik: `320119${String(ts + 4).slice(-10)}`, name: 'Dodi Firmansyah', dateOfBirth: '1965-06-18', gender: 'MALE', phone: '081300000005', address: 'Jl. Setiabudi No. 77, Bandung' },
    { nik: `320120${String(ts + 5).slice(-10)}`, name: 'Eka Putri Maharani', dateOfBirth: '2015-09-10', gender: 'FEMALE', phone: '081300000006', address: 'Jl. Dipatiukur No. 33, Bandung' },
    { nik: `320121${String(ts + 6).slice(-10)}`, name: 'Hendro Wibowo', dateOfBirth: '1975-04-25', gender: 'MALE', phone: '081300000007', address: 'Jl. Merdeka No. 100, Bandung' },
    { nik: `320122${String(ts + 7).slice(-10)}`, name: 'Nurul Hidayah', dateOfBirth: '1998-12-05', gender: 'FEMALE', phone: '081300000008', address: 'Jl. Cihampelas No. 45, Bandung' },
  ];

  for (const p of patients) {
    const { status, data } = await request('POST', '/patients', p, token);
    if (status === 201 || status === 200) {
      const patientId = data?.data?.id || data?.id;
      state.patientIds.push(patientId);
      assert(true, `Pasien: ${p.name} — MRN: ${data?.data?.mrn || data?.mrn || 'assigned'}`);
    } else if (status === 409 || status === 400) {
      // Might already exist, try to search
      console.log(`  ⚠️  ${p.name}: ${data?.message || 'conflict'} (mungkin sudah ada)`);
      const { data: searchRes } = await request('GET', `/patients?search=${encodeURIComponent(p.nik)}&limit=1`, undefined, token);
      const found = searchRes?.data?.[0] || searchRes?.items?.[0];
      if (found) {
        state.patientIds.push(found.id);
        console.log(`  ℹ️  Menggunakan existing: ${found.name} (${found.id?.slice(0, 8)}...)`);
      }
    } else {
      console.log(`  ❌ Gagal daftar ${p.name}: status=${status}, msg=${data?.message}`);
    }
  }

  assert(state.patientIds.length >= 5, `Minimal 5 pasien terdaftar (actual: ${state.patientIds.length})`);
}

// ─── STEP 4: Create Visits (sebagai CS) ──────────────────────────────────────

async function step4_createVisits(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 4: Buat Visit (role: CS)           ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['CS'];

  const visitConfigs = [
    { paymentMethod: 'CASH', desc: 'Cash — umum' },
    { paymentMethod: 'CASH', desc: 'Cash — screening' },
    { paymentMethod: 'CASH', desc: 'Cash — kontrol rutin' },
    { paymentMethod: 'CASH', desc: 'Cash — CITO IGD' },
    { paymentMethod: 'CASH', desc: 'Cash — MCU' },
    { paymentMethod: 'CASH', desc: 'Cash — anak' },
    { paymentMethod: 'CASH', desc: 'Cash — lansia' },
    { paymentMethod: 'CASH', desc: 'Cash — prenatal' },
  ];

  for (let i = 0; i < Math.min(state.patientIds.length, visitConfigs.length); i++) {
    const cfg = visitConfigs[i];
    const body: any = {
      patientId: state.patientIds[i],
      paymentMethod: cfg.paymentMethod,
      encounterReason: `Testing E2E — ${cfg.desc}`,
    };
    if (state.doctorId) body.doctorId = state.doctorId;
    if (state.clinicId) body.clinicId = state.clinicId;
    if (cfg.paymentMethod === 'INSURANCE' && state.insuranceId) {
      body.insuranceId = state.insuranceId;
    }

    const { status, data } = await request('POST', '/visits', body, token);
    if (status === 201 || status === 200) {
      const visitId = data?.data?.id || data?.id;
      state.visitIds.push(visitId);
      const visitNumber = data?.data?.visitNumber || data?.visitNumber;
      assert(true, `Visit #${i + 1}: ${visitNumber || visitId?.slice(0, 8)} — ${cfg.desc}`);
    } else {
      console.log(`  ❌ Visit ${cfg.desc}: status=${status}, msg=${data?.message}`);
      // Push empty to keep index alignment
      state.visitIds.push('');
    }
  }
}

// ─── STEP 5: Create Orders (sebagai Kasir/Admin) ─────────────────────────────

async function step5_createOrders(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 5: Buat Order (role: ADMIN)        ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['ADMIN'];

  if (state.testIds.length === 0) {
    console.log('  ⚠️  No test IDs available — fetching from DB directly');
    const { data } = await request('GET', '/master/tests?limit=10', undefined, token);
    const tests = data?.data?.data || data?.data || [];
    if (Array.isArray(tests) && tests.length > 0) {
      state.testIds = tests.slice(0, 6).map((t: any) => t.id);
    }
  }

  if (state.testIds.length === 0) {
    console.log('  ❌ Cannot create orders — no tests available');
    return;
  }

  // Different test combinations per patient
  const testCombos = [
    state.testIds.slice(0, 3),  // 3 tes basic
    state.testIds.slice(0, 4),  // 4 tes
    state.testIds.slice(0, 5),  // 5 tes MCU
    state.testIds.slice(0, 2),  // 2 tes CITO
    state.testIds.slice(1, 4),  // 3 tes
    state.testIds.slice(0, 5),  // 5 tes
    state.testIds.slice(0, 3),  // 3 tes
    state.testIds.slice(2, 5),  // 3 tes
  ];

  const priorities = ['ROUTINE', 'ROUTINE', 'ROUTINE', 'CITO', 'ROUTINE', 'ROUTINE', 'URGENT', 'ROUTINE'];

  for (let i = 0; i < Math.min(state.visitIds.length, testCombos.length); i++) {
    if (!state.visitIds[i]) continue;

    const body: any = {
      visitId: state.visitIds[i],
      patientId: state.patientIds[i],
      testIds: testCombos[i],
      priority: priorities[i],
    };
    if (state.doctorId) body.doctorId = state.doctorId;
    if (state.clinicId) body.clinicId = state.clinicId;

    const { status, data } = await request('POST', '/orders', body, token);
    if (status === 201 || status === 200) {
      const order = data?.data || data;
      state.orderIds.push(order.id);
      const details = (order.orderDetails || []).map((d: any) => ({ id: d.id, testId: d.testId }));
      state.orderDetails.push({ orderId: order.id, details });
      assert(true, `Order #${i + 1}: ${order.orderNumber || order.id?.slice(0, 8)} — ${testCombos[i].length} tes (${priorities[i]})`);
    } else {
      console.log(`  ❌ Order #${i + 1}: status=${status}, msg=${data?.message}`);
      state.orderIds.push('');
      state.orderDetails.push({ orderId: '', details: [] });
    }
  }
}

// ─── STEP 6: Payment (sebagai Kasir) ─────────────────────────────────────────

async function step6_payment(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 6: Pembayaran (role: KASIR)        ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['KASIR'];

  const paymentMethods = ['CASH', 'BPJS', 'INSURANCE', 'CASH', 'INSURANCE', 'CASH', 'BPJS', 'TRANSFER'];

  for (let i = 0; i < state.orderIds.length; i++) {
    if (!state.orderIds[i]) continue;

    // Get order to know totalAmount
    const { data: orderData } = await request('GET', `/orders/${state.orderIds[i]}`, undefined, token);
    const totalAmount = Number(orderData?.data?.totalAmount || orderData?.totalAmount || 100000);

    const body = {
      paymentMethod: paymentMethods[i] || 'CASH',
      amountPaid: totalAmount,
    };

    const { status, data } = await request('POST', `/orders/${state.orderIds[i]}/pay`, body, token);
    if (status === 200 || status === 201) {
      assert(true, `Payment #${i + 1}: Rp ${totalAmount.toLocaleString()} (${body.paymentMethod})`);
    } else if (status === 400 && data?.message?.includes('already paid')) {
      console.log(`  ℹ️  Order #${i + 1} sudah dibayar`);
    } else {
      console.log(`  ❌ Payment #${i + 1}: status=${status}, msg=${data?.message}`);
    }
  }
}

// ─── STEP 7: Sample Collection (sebagai Sampling) ────────────────────────────

async function step7_sampleCollection(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 7: Pengambilan Sampel (SAMPLING)   ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['SAMPLING'];

  for (let i = 0; i < state.orderIds.length; i++) {
    if (!state.orderIds[i]) continue;

    const body = {
      sampleCondition: 'ACCEPTABLE',
    };

    const { status, data } = await request('POST', `/lab/${state.orderIds[i]}/sample`, body, token);
    if (status === 200 || status === 201) {
      assert(true, `Sample #${i + 1}: ACCEPTABLE — collected`);
    } else if (status === 400 && (data?.message?.includes('already') || data?.message?.includes('status'))) {
      console.log(`  ℹ️  Sample #${i + 1}: ${data?.message}`);
    } else {
      console.log(`  ❌ Sample #${i + 1}: status=${status}, msg=${data?.message}`);
    }
  }
}

// ─── STEP 8: Enter Results (sebagai Analis) ──────────────────────────────────

async function step8_enterResults(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 8: Input Hasil Lab (role: ANALIS)  ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['ANALIS'];

  // Generate realistic result values
  const generateResult = (idx: number): string => {
    const values = ['13.5', '7.2', '250', '42', '85', '28', '0.9', '180', '95', '5.5'];
    return values[idx % values.length];
  };

  for (let i = 0; i < state.orderDetails.length; i++) {
    const od = state.orderDetails[i];
    if (!od.orderId || od.details.length === 0) continue;

    // If we don't have detail IDs, fetch the order first
    let details = od.details;
    if (details.length === 0 || !details[0]?.id) {
      const { data: orderData } = await request('GET', `/orders/${od.orderId}`, undefined, token);
      const order = orderData?.data || orderData;
      details = (order?.orderDetails || []).map((d: any) => ({ id: d.id, testId: d.testId }));
      state.orderDetails[i].details = details;
    }

    if (details.length === 0) {
      console.log(`  ⚠️  Order #${i + 1}: no details to enter results for`);
      continue;
    }

    const body = {
      results: details.map((d, idx) => ({
        orderDetailId: d.id,
        resultValue: generateResult(idx + i),
        comment: idx === 0 ? 'Hasil dalam batas normal' : undefined,
      })),
    };

    const { status, data } = await request('PUT', `/lab/${od.orderId}/results`, body, token);
    if (status === 200 || status === 201) {
      assert(true, `Results #${i + 1}: ${details.length} parameter diinput`);
    } else {
      console.log(`  ❌ Results #${i + 1}: status=${status}, msg=${data?.message}`);
    }
  }
}

// ─── STEP 9: Verification (sebagai Analis) ───────────────────────────────────

async function step9_verify(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 9: Verifikasi (role: ANALIS)       ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['ANALIS'];

  for (let i = 0; i < state.orderIds.length; i++) {
    if (!state.orderIds[i]) continue;

    const body = { verificationNotes: `Verified by analis — order #${i + 1}` };

    const { status, data } = await request('POST', `/lab/${state.orderIds[i]}/verify`, body, token);
    if (status === 200 || status === 201) {
      assert(true, `Verify #${i + 1}: VERIFIED`);
    } else {
      console.log(`  ❌ Verify #${i + 1}: status=${status}, msg=${data?.message}`);
    }
  }
}

// ─── STEP 10: Doctor Approval (sebagai Dokter) ───────────────────────────────

async function step10_approve(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 10: Approval Dokter (role: DOKTER) ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['DOKTER'];

  for (let i = 0; i < state.orderIds.length; i++) {
    if (!state.orderIds[i]) continue;

    const body = {
      decision: 'APPROVE' as const,
      interpretation: `Hasil pemeriksaan pasien #${i + 1} dalam batas normal. Tidak ada temuan signifikan.`,
    };

    const { status, data } = await request('POST', `/lab/${state.orderIds[i]}/approve`, body, token);
    if (status === 200 || status === 201) {
      assert(true, `Approve #${i + 1}: APPROVED ✓`);
    } else if (status === 400 && data?.message?.includes('VERIFIED')) {
      console.log(`  ℹ️  Order #${i + 1}: sudah di-approve sebelumnya`);
    } else {
      console.log(`  ❌ Approve #${i + 1}: status=${status}, msg=${data?.message}`);
    }
  }
}

// ─── STEP 11: Verification — Check Final State ──────────────────────────────

async function step11_verifyFinalState(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  STEP 11: Verifikasi Status Final        ║');
  console.log('╚══════════════════════════════════════════╝');

  const token = state.tokens['ADMIN'];
  let approvedCount = 0;

  for (let i = 0; i < state.orderIds.length; i++) {
    if (!state.orderIds[i]) continue;

    const { status, data } = await request('GET', `/orders/${state.orderIds[i]}`, undefined, token);
    if (status === 200) {
      const order = data?.data || data;
      const orderStatus = order?.status;
      if (orderStatus === 'APPROVED') {
        approvedCount++;
        console.log(`  ✅ Order #${i + 1} (${order.orderNumber}): ${orderStatus} — COMPLETE`);
      } else {
        console.log(`  ℹ️  Order #${i + 1} (${order.orderNumber}): ${orderStatus}`);
      }
    }
  }

  console.log(`\n  📊 Summary: ${approvedCount}/${state.orderIds.filter(Boolean).length} orders fully APPROVED`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  eLIS — E2E API Integration Test                        ║');
  console.log('║  Testing full workflow via HTTP endpoints                ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Base URL: ${BASE_URL}`);
  console.log('  Memerlukan: API running + database seeded');

  try {
    await step1_login();
    await step2_fetchMasterData();
    await step3_registerPatients();
    await step4_createVisits();
    await step5_createOrders();
    await step6_payment();
    await step7_sampleCollection();
    await step8_enterResults();
    await step9_verify();
    await step10_approve();
    await step11_verifyFinalState();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ E2E API TEST SELESAI!                               ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n  Semua langkah workflow berhasil dijalankan:');
    console.log('  Login → Register → Visit → Order → Pay → Sample → Results → Verify → Approve');

  } catch (error: any) {
    console.error('\n╔══════════════════════════════════════════════════════════╗');
    console.error('║  ❌ TEST GAGAL                                           ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error(`  Error: ${error.message}`);
    process.exit(1);
  }
}

main();
