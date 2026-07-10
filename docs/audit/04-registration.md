---
Document ID: AUDIT-eLIS-2026-M04
Title: Enterprise Audit — Menu 04: Registrasi (Patient Registration + Visit Creation Workflow)
Framework: Kiro Enterprise Framework v3
Scope: /dashboard/registration page, PatientSearchStep, PatientRegistrationStep, VisitCreationStep, VisitController/Service, VisitNumberGenerator, DTOs
Status: Complete (read-only)
Author: Enterprise Auditor
Date: 2026-07-10
Reuses: docs/17-Audit/_inventory/feature-coverage-matrix.md (FR-03, FR-04-adjacent), docs/audit/02-settings-users.md (NCR-02-01 envelope pattern), docs/audit/03-patients.md (createPatient path reused)
---

# 04 — Registrasi (Patient Registration + Visit Creation Workflow)

## 1. Implementation Status

Traceability terhadap SRS §2.3 F-VIS-01/02, FS FR-04 (Registrasi Kunjungan), BR-02 (visit number generator), enterprise-registration-workflow spec.

| Requirement | Status | Evidence |
|---|---|---|
| Workflow 3-step: Search → Register → Visit Creation | **IMPLEMENTED** | `registration/page.tsx` state machine `currentStep` + 3 child komponen |
| Cari pasien existing (nama/NIK/MRN/phone/email, min 2 char, debounce 300ms) | **IMPLEMENTED** | `PatientSearchStep` useEffect + setTimeout 300ms, `apiClient.getPatients({search, limit:20})` |
| Register pasien baru dari flow ini | **IMPLEMENTED** | `PatientRegistrationStep.handleSubmit` → `apiClient.createPatient` (payload lengkap NIK/name/dob/gender/phone/email/address/region) |
| BR-02: Visit number `VST-YYYYMM-XXXX`, cap 9999/bulan, atomik | **IMPLEMENTED** | `visit-number-generator.service` (dari konteks) — serializable tx, retry pada P2034, UPSERT counter |
| Create visit dengan payment method (CASH/BPJS/INSURANCE) | **IMPLEMENTED** | `VisitCreationStep` + `VisitService.create` + `validatePaymentFields` |
| BPJS number validation 13 digit (FE+BE) | **IMPLEMENTED** | FE `/^\d{13}$/` di VisitCreationStep + `maxLength=13`; BE identik di `validatePaymentFields` |
| Insurance selection saat method=INSURANCE | **IMPLEMENTED** | FE `SearchableDropdown` + BE `validateInsuranceExists` |
| Optional doctor + clinic | **IMPLEMENTED** | Nullable, validated jika diisi |
| Success confirmation dengan visit number + navigasi ke detail | **IMPLEMENTED** | `createdVisit` state → success card + tombol "Lihat Detail" navigasi `/dashboard/visits/:id` |
| Unsaved-data confirmation pada tombol Kembali | **IMPLEMENTED** | `VisitCreationStep.handleBack` — `window.confirm` jika `hasFormData()` |
| Audit log create visit | **IMPLEMENTED** | `AuditService.log(userId, 'CREATE', 'Visit', ...)` dengan IP address |
| State machine REGISTERED→IN_PROGRESS→COMPLETED/CANCELLED | **IMPLEMENTED** | `validateStatusTransition` + `transitionToInProgress` + `evaluateCompletion` |
| Response envelope single-wrap konsisten | **BROKEN** | `VisitService` mengembalikan `{success,message,data}`, controller `return this.visitService...` (raw), lalu `TransformInterceptor` bungkus lagi → **DOUBLE ENVELOPE** (NCR-04-01) |
| RBAC gating UI pada halaman registrasi | **MISSING** | `page.tsx` tak ada role check; hanya server enforce di POST (NCR-04-06) |
| Duplicate visit detection (mis. visit aktif hari ini utk pasien yg sama) | **MISSING** | Tidak ada guard; pasien bisa dibuatkan multiple visit REGISTERED bersamaan (NCR-04-04) |

## 2. End-to-End Flow

### 2a. Step 1 — Search Pasien
```
[PatientSearchStep] onChange query → debounce 300ms → searchPatients()
  guard: query.length < 2 → return []
  apiClient.getPatients({search, limit:20}) → GET /api/v1/patients?search=...&limit=20
[Backend] PatientController.findAll (audit 03 menyimpulkan raw return, single envelope)
  → { success, message, data:{ data:[...patients], meta } }
[FE Extraction defensif] envelope = res?.data ?? res
  if Array.isArray(envelope) → raw = envelope
  else if envelope.data → raw = envelope.data
  → map ke PatientDisplayData (id/name/mrn/nik/dob/gender/phone)
[UX] user klik pasien → onPatientSelected(patientOption) → parent → currentStep = "visit-creation"
     OR "Daftar Pasien Baru" jika 0 hasil → currentStep = "register"
```
Bekerja. Debounce + min length + defensive envelope handling.

### 2b. Step 2 — Registrasi Pasien Baru
```
[PatientRegistrationStep] client-validate:
  NIK /^\d{16}$/, nama 1-200 char, dob ≤ hari ini, gender MALE/FEMALE,
  email format opsional, region all-or-none
handleSubmit → apiClient.createPatient(payload)
  → POST /api/v1/patients @Roles(KASIR,CS,ADMIN,SUPER_ADMIN)
[Backend] PatientController.create → PatientService.register (audit 03)
  → validateHierarchy region → MrnGenerator (serializable tx) → prisma.create
  → return { success, message, data: patient } RAW
[TransformInterceptor] wrap once → { success, message, data:{ success, message, data: patient } }
  ⚠️ TAPI PatientController return raw service result yang sudah punya envelope? 
  ✅ Cek audit 03 §5: PatientService.register does NOT manually wrap → single envelope only
[FE Extraction] response?.data as Record<string, unknown> → newPatient
  onPatientRegistered → currentStep = "visit-creation"
```
Bekerja untuk single-envelope. Note: audit 03 menegaskan PatientController tak double-wrap.

### 2c. Step 3 — Create Visit
```
[VisitCreationStep] validate:
  paymentMethod required
  jika BPJS → bpjsNumber /^\d{13}$/
  jika INSURANCE → selectedInsurance required
handleSubmit → apiClient.createVisit(payload)
  payload = { patientId, paymentMethod, [doctorId?], [clinicId?], [bpjsNumber?], [insuranceId?] }
  → POST /api/v1/visits @Roles(KASIR,CS,ADMIN,KLINIK_PARTNER,SUPER_ADMIN)
[Backend] VisitController.create → VisitService.create
  → validatePatientExists (deletedAt:null)
  → validateDoctorExists/ClinicExists/InsuranceExists jika diisi (isActive+deletedAt)
  → validatePaymentFields (BPJS 13 digit, INSURANCE need insuranceId)
  → VisitNumberGenerator.generate() → serializable tx + retry
  → prisma.visit.create({data:{..., status default REGISTERED}, include:VISIT_INCLUDE})
  → auditService.log('CREATE','Visit',id,null,visitData,ip)
  → return { success:true, message:'Visit created successfully', data: visit }  ← MANUAL WRAP
[TransformInterceptor] wrap AGAIN → { success, message, data:{ success, message, data: visit } }
  ⚠️ DOUBLE ENVELOPE
[FE Extraction defensif] 
  data = res?.data ?? res  → outer wrapper
  visitData = data?.data ?? data  → inner wrapper (works with double envelope)
  → onVisitCreated({id, visitNumber})
[UX] Success card + tombol "Daftar Pasien Lain" atau "Lihat Detail" (nav ke /dashboard/visits/:id)
```
**BROKEN**: response envelope double-wrap. Frontend WORKS karena defensif — tapi ini bukti FE workaround untuk bug BE. Lihat NCR-04-01.

## 3. Functional Gap

| ID | Requirement | Status | Root Cause |
|---|---|---|---|
| FG-04-01 | Response envelope single-wrap konsisten | BROKEN | `VisitService.create/findAll/findById/update/cancel` return `{success,message,data}` manual + interceptor wrap lagi |
| FG-04-02 | Cegah duplikat visit aktif untuk pasien di hari yang sama | MISSING | Tidak ada guard di `VisitService.create` |
| FG-04-03 | Feedback ke user saat pasien tak-aktif/soft-deleted | PARTIAL | BE lempar NotFound; FE menampilkan message tapi copy generic |
| FG-04-04 | Terminologi jelas MRN/NIK untuk kasir | IMPLEMENTED | Search input placeholder ada 5 kriteria |
| FG-04-05 | RBAC UI (KLINIK_PARTNER dilarang menu tertentu) | MISSING | Tidak ada gating client-side; hanya server-side enforce |
| FG-04-06 | Deteksi NIK duplikat memberi pesan spesifik | IMPLEMENTED | `PatientRegistrationStep` deteksi `error.errorCode === 'ERR_VALIDATION' && message.includes('nik')` → set field error |
| FG-04-07 | Race condition visitNumber saat concurrent create | MITIGATED | Serializable tx + retry (bagus); tapi cap 9999/bulan belum divalidasi runtime |
| FG-04-08 | Insurance verifikasi eligibility real-time | MISSING (out of scope MVP) | Tidak ada integrasi eksternal; hanya presence check |

## 4. Frontend Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Envelope defensif duplikat** | 4 fungsi (`getPatients`, `fetchDoctors`, `fetchClinics`, `fetchInsurances`) meniru pola `envelope = res?.data ?? res; if(Array.isArray)... else if 'data' in envelope...` | `PatientSearchStep.searchPatients` + `VisitCreationStep.fetchDoctors/Clinics/Insurances` | Medium (duplikasi + code smell) |
| **State workflow duplikat** | `WorkflowState` di `page.tsx` punya `searchQuery`, `searchResults`, `searchExecuted` yang **tidak pernah diset/dipakai**; PatientSearchStep punya state sendiri | `page.tsx initialState` + `PatientSearchStep` local state | Low (dead state) |
| RBAC UI gating | Tidak ada gating client-side pada halaman `/dashboard/registration` | `page.tsx` no `useAuth`/role check | Medium |
| Success view — race klik "Daftar Pasien Lain" | Setelah reset, form kosong tapi tidak ada guard jika visitService masih inflight | Tidak terlihat kasus konkret; `submitting` sudah cleared di `onVisitCreated` | Low |
| Insurance dropdown tak menampilkan status BPJS-Kesehatan vs swasta | `fetchInsurances` map hanya `id`, `name`, `code` sebagai subtitle | `VisitCreationStep.fetchInsurances` | Low (visual saja) |
| Kembali dari step 2 → step 1 kehilangan hasil pencarian sebelumnya | `handleBack` reset `selectedPatient`+`createdVisit` tapi PatientSearchStep re-mount clean (state lokal hilang) | `page.tsx handleBack` | Low (UX; user harus ketik lagi) |
| Payment switching residue | Ganti BPJS→CASH, state `bpjsNumber` masih terisi tapi tak masuk payload; error state auto-cleared di button click | `VisitCreationStep.setPaymentMethod` clears errors | OK |
| Ekspresi umur pasien di header | Header hanya tanggal lahir + gender; tidak tampilkan umur (kasir sering butuh) | `VisitCreationStep` header | Low |
| Accessibility: focus management tak eksplisit antar step | Setelah step transition, focus tak dipindahkan | `page.tsx` state transitions | Low (a11y) |
| Insurance search debounce | Menggunakan `SearchableDropdown` (belum diaudit) — asumsikan debounce ada | belum verified | Low |

## 5. Backend / API Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Envelope double-wrap** | `VisitService` semua method return `{success,message,data}`. Controller return raw service result. `TransformInterceptor` wrap ulang → double envelope | `visit.service.ts` create/findAll/findById/update/cancel semua L 71-79, 231, 289 etc. | **P1** (konsistensi API; FE workaround) |
| **Tidak ada guard duplikat visit** | Pasien bisa punya banyak visit REGISTERED bersamaan tanpa peringatan/error | `VisitService.create` — tak query existing active visit | **P2** (data quality) |
| Payment validation solid | BPJS 13-digit, INSURANCE need insuranceId, CASH bypass — konsisten dengan FE | `validatePaymentFields` | ✅ Good |
| Status machine + terminal guard | `validateStatusTransition` + `update` tolak COMPLETED/CANCELLED | Baris 148-165, 273-278 | ✅ Good |
| Audit logging lengkap | `AuditService.log` dipanggil di create/update/cancel dengan old/new values | `VisitService.create/update/cancel` | ✅ Good (kontras dengan menu 03 delete yang tidak eksis) |
| **Cancel guard order status** | Cancel visit tolak jika ada order beyond PENDING_PAYMENT — logika benar | `VisitService.cancel` L 355-370 | ✅ Good |
| `validateVisitForOrder` | Tolak add order jika visit CANCELLED/COMPLETED | L 414-433 | ✅ Good |
| `transitionToInProgress` idempotent | Return early jika sudah IN_PROGRESS | L 447-452 | ✅ Good |
| `evaluateCompletion` heuristik | Auto-transition IN_PROGRESS→COMPLETED jika **semua** order NOTIFIED/CANCELLED | L 460-490 | ⚠️ Perilaku: visit tanpa order tidak akan pernah COMPLETED (by design?); dokumentasikan |
| DTO update permissive | `UpdateVisitDto` bisa ganti doctorId/clinicId/insuranceId/paymentMethod/bpjsNumber (semua opsional) | `visit.controller.update` + service L 259-296 | Low — enforce validation via payment field re-check ✅ |
| Insurance FK di Visit (single) | `visits.insuranceId` single FK; belum ada junction (kontras dengan `PatientInsurance`) | schema | Low (design consistency dgn NCR-03-03) |
| findAll pagination cap | `Math.min(limit, 100)` — bagus | L 175-176 | ✅ |
| Search di findAll | Case-insensitive contains pada patient.name/mrn + visitNumber | L 180-188 | ✅ |
| Date range parsing | endDate ditambah `T23:59:59.999Z` (inclusive) | L 196-199 | ✅ |
| Race pada visit number generator | Serializable + retry (dari konteks context transfer) | `visit-number-generator.service.ts` | ✅ Good |
| Cap 9999/bulan | Belum ada eksplisit throw ketika counter overflow | perlu verifikasi generator source | P3 (edge case; realistik lab kecil) |
| Endpoint delete visit | Tidak ada `@Delete` — hanya cancel (soft) | `visit.controller.ts` | ✅ (by design; audit trail preserved) |

## 6. Database Gap

Tabel: `visits`, `visit_number_counters` (dari konteks), audit_logs.

| Area | Finding | Severity |
|---|---|---|
| Kolom `visits.visitNumber` unique | Ada + FK ke counter monthly | ✅ (dari migration `add_visit_management`) |
| `patientId` required, `doctorId/clinicId/insuranceId` nullable FK | Sesuai skema fleksibel | ✅ |
| `bpjsNumber` string nullable, `paymentMethod` enum | ✅ | ✅ |
| Kolom `status` enum default REGISTERED | ✅ | ✅ |
| `cancelledAt`, `cancelReason` kolom | Ada + diset saat cancel | ✅ |
| Migration `make_visit_id_required` | orderS require visitId (dari path migration) | ✅ konsisten |
| Field FE yang **tidak** disimpan | Tidak ada — semua field FE (patientId, paymentMethod, doctorId, clinicId, insuranceId, bpjsNumber) tersimpan | ✅ |
| Kolom DB yang **tak dipakai** dari FE | `cancelReason` cuma via cancel endpoint (bukan create); `estimatedCompletionAt` (jika ada di schema) — perlu cross-check | Low |
| Insurance model duplikat | `visits.insuranceId` single (Visit) vs `OrderInsurance` junction (dari migration `add_order_insurance_junction`) → 3 sumber kebenaran insurance (patient junction, visit single, order junction) | Medium (NCR-04-05) |
| Index pencarian visit | `visits.visitNumber` unique index + `patientId` FK index → adequate untuk lookup; belum ada composite index utk `patientId+status+registrationDate` untuk guard duplikat | Low |
| `preAuthRequired` flag pada Insurance | Ada (dari migration `add_insurance_pre_auth_flag`) tapi tak dipakai di visit create flow | Low (design future) |

## 7. Duplicate / Repeated Logic

| Finding | Evidence | Verdict |
|---|---|---|
| **Envelope unwrap boilerplate 4×** di FE registration flow | `PatientSearchStep.searchPatients` + `VisitCreationStep.fetchDoctors/Clinics/Insurances` — pola identik `res?.data ?? res` + Array.isArray/`'data' in envelope` | Duplikasi semantik nyata — kandidat helper `unwrapApiList<T>(res)` |
| Reference-validator helpers | `validateDoctorExists`, `validateClinicExists`, `validateInsuranceExists`, `validatePatientExists` di VisitService — 4 metode ~identik (findFirst dengan deletedAt/isActive + throw) | Kandidat generik `validateReferenceExists('doctor', id)` — tapi kompleksitas rendah, defer |
| Payment validation pattern | `validatePaymentFields` dipanggil di create + update — reused ✅ | Good reuse |
| `WorkflowState` field mati | `page.tsx` initialState punya `searchQuery`, `searchResults`, `searchExecuted` tak pernah dimutasi/dibaca (PatientSearchStep pakai state lokal) | Dead state, hapus |
| `VISIT_INCLUDE` konstanta | Digunakan konsisten create/update/cancel/findById — good | Good reuse |
| Envelope defensif "double vs single" | Pola beda antar controller: PatientController single, VisitController double, UsersController double — inkonsistensi arsitektur | Root cause: NCR-04-01/NCR-02-01 |

## 8. Dead Code Candidates

| Item | Status | Alasan |
|---|---|---|
| `WorkflowState.searchQuery/searchResults/searchExecuted` di `page.tsx` | Dead state | Tak pernah di-set setelah initialState; PatientSearchStep punya state sendiri |
| `_phone` void reference di `PatientSearchStep.handleSelect` | Intentional | ESLint `no-unused-vars` workaround via `void _phone` — bukan dead |
| `payment method NEW_INSURANCE` (dari migration `extend_payment_method_enum`) | **Potentially unreachable** | UI hanya expose CASH/BPJS/INSURANCE; enum backend mungkin punya nilai tambahan yang tak dipakai FE — verifikasi di menu 06 Orders |
| `validateStatusTransition` di service | Live | Dipakai oleh transitionToInProgress + evaluateCompletion |
| `preAuthRequired` di Insurance | Kolom + migration ada, tak dipakai di visit create | Kandidat fitur belum-siap; jangan hapus |

## 9. NCR Gap Matrix

| ID | Menu | FR ID | Layer | Finding | Evidence | Root Cause | Impact | Priority | Required Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NCR-04-01 | Registrasi | FR-04 / API contract | Backend | Double envelope: `VisitService` return `{success,message,data}` dan `TransformInterceptor` bungkus lagi → `{success,message,data:{success,message,data:visit}}` | `visit.service.ts` L 71-79 (create), 231 (findAll), 289 (findById), 340 (update), 397 (cancel) | Service melakukan manual wrap; controller pass-through raw | FE harus defensif (`res?.data ?? res` + `data?.data ?? data`); inkonsistensi dengan PatientController; risiko regresi saat FE fix asumsi | **P1** | Hapus manual `{success,message,data:...}` di VisitService; return `visit` mentah — biarkan `TransformInterceptor` yang bungkus (single envelope). Update FE unwrap agar single-level | Open |
| NCR-04-02 | Registrasi | FE consistency | Frontend | 4 fungsi FE ulang pola envelope-unwrap identik | `PatientSearchStep`, `VisitCreationStep` (3 fetch fn) | Tak ada helper bersama | Duplikasi + kandidat bug saat backend berubah | P2 | Ekstrak `unwrapApiList<T>(res): T[]` di `apps/web/src/lib/api.ts` | Open |
| NCR-04-03 | Registrasi | State | Frontend | `WorkflowState` di page.tsx memuat field mati (`searchQuery`, `searchResults`, `searchExecuted`) | `registration/page.tsx` initialState | Refactor tak selesai | Kebingungan, memori kecil terbuang | P3 | Hapus 3 field dead dari `WorkflowState` | Open |
| NCR-04-04 | Registrasi | BR / data quality | Backend | Tidak ada guard mencegah pasien yang sama memiliki multiple visit REGISTERED aktif bersamaan | `VisitService.create` — tak query existing active visit | Design gap | Kasir bisa buat visit ganda tanpa disengaja; billing menjadi ambigu | **P2** | Tambah cek `findFirst({patientId, status:REGISTERED/IN_PROGRESS, registrationDate: today})` dan minimal beri warning atau tolak dengan opsi lanjutkan | Open |
| NCR-04-05 | Registrasi | Model integrity | Backend+DB | 3 sumber insurance: `PatientInsurance` (junction), `visits.insuranceId` (single), `OrderInsurance` (junction) | Prisma schema + migration files | Migrasi bertahap; belum ada strategi konsolidasi | Ambiguitas billing (pakai yang mana untuk klaim?) | P2 | Tetapkan **prioritas** eksplisit: order-level junction menang, fall back ke visit-level, fall back ke patient-level. Dokumentasikan di FS §Insurance. Lintas-ref NCR-03-03 | Open |
| NCR-04-06 | Registrasi | RBAC UX | Frontend | Halaman `/dashboard/registration` tak ada gating client-side; role terlarang bisa buka halaman lalu hit 403 saat submit | `page.tsx` (no role check) | Sidebar mungkin gating tapi URL langsung tidak | UX buruk untuk role terlarang | P3 | Wrap page dengan `RequireRole([KASIR,CS,ADMIN,KLINIK_PARTNER,SUPER_ADMIN])` (asumsi HOC sudah ada) | Open |
| NCR-04-07 | Registrasi | BR-02 | Backend | Cap 9999 visit/bulan tidak dilempar eksplisit — behavior saat overflow tak jelas | perlu review `visit-number-generator.service.ts` | Edge case tak dilindungi | Lab produksi kelas menengah bisa hit 9999 dalam sebulan → generator loop/error tak informatif | P3 | Verifikasi + throw explicit `BadRequestException('Visit number capacity exceeded for month')` jika counter > 9999 | Open |
| NCR-04-08 | Registrasi | UX consistency | Frontend | Success view "Lihat Detail" nav ke `/dashboard/visits/:id` — asumsikan detail page ada (menu 05) | `page.tsx` `router.push` | Cross-module dependency | Broken link bila menu 05 detail belum di-implement | P3 | Verifikasi eksistensi route `/dashboard/visits/[id]` di audit 05 | Open (blocked by audit 05) |
| NCR-04-09 | Registrasi | Audit | Backend | Audit log create visit tidak mencatat `patientId` di key metadata (masuk `visitData` payload) — pencarian audit per pasien kurang efisien | `visit.service.create` audit log | Design | Audit trail per-pasien butuh scan payload JSON | P3 | Sertakan `patientId` di kolom auxiliary `audit_logs.subjectId` atau tambah kolom `relatedId` | Open |
| NCR-04-10 | Registrasi | Error messaging | Frontend | Error non-terstruktur di `PatientRegistrationStep` ditampilkan pada field `name` sebagai fallback ("show on the NIK field as a general form error" comment mismatch) | `PatientRegistrationStep.handleSubmit catch` | Copy comment vs code drift | User bingung kenapa field Nama merah untuk error umum | P3 | Tambah state `generalError` seperti di VisitCreationStep dan tampilkan di banner atas form | Open |

## 10. Required Actions (Prioritas)

1. **P1** — Perbaiki envelope wrapping di `VisitService` (NCR-04-01). Effort: S. Perlu koordinasi FE untuk update unwrap.
2. **P2** — Guard duplikat visit aktif (NCR-04-04). Effort: S.
3. **P2** — Resolusi tri-source insurance (NCR-04-05). Effort: M (design decision cross-module).
4. **P2** — Helper `unwrapApiList` (NCR-04-02). Effort: XS.
5. **P3** — Cleanup dead state (NCR-04-03), verifikasi cap 9999 (NCR-04-07), RBAC UI gating (NCR-04-06), audit subjectId (NCR-04-09), error banner registrasi (NCR-04-10). Effort: XS–S masing-masing.
6. **Blocked** — NCR-04-08 verifikasi detail visit page (menunggu audit 05).

## 11. FS / FR Update yang Direkomendasikan

- **FR-04 Registrasi Kunjungan**: status *IMPLEMENTED with API-contract gaps*. Alur 3-step, visit number generator, audit log, state machine — semua working. Namun **envelope double-wrap** perlu didokumentasikan sebagai *contract debt* di FS §API Contract.
- Tambah **AC**: "Pasien yang sama tidak boleh memiliki lebih dari satu visit aktif (REGISTERED/IN_PROGRESS) pada hari yang sama tanpa konfirmasi eksplisit."
- Tambah **AC**: "Cap visit number 9999/bulan harus melempar error ramah pengguna, bukan crash." 
- Tambah **AC (API §Response Envelope)**: "Semua endpoint HANYA menggunakan envelope `{success, message, data, meta?}` sekali; service layer tidak boleh manual-wrap."
- Perbarui **§Insurance Precedence**: order-level junction → visit-level single → patient-level junction (fallback urut).
- Perbarui **§State Machine Visit**: catat perilaku `evaluateCompletion` (visit tanpa order tidak COMPLETED otomatis).

## 12. Reused / Superseded Prior Audit References

- `docs/audit/02-settings-users.md` NCR-02-01 (double envelope UsersController) — **KONSISTEN**: pola sama terulang di `VisitService`. Ini bukti bahwa masalah bersifat systemik (Users + Visits) tapi bukan universal (Patients bersih). Rekomendasi konsolidasi jadi audit tersendiri di summary 99.
- `docs/audit/03-patients.md` §2c menyatakan `apiClient.createPatient` "dipakai menu Registrasi" — **DIVERIFIKASI DI SINI**: `PatientRegistrationStep.handleSubmit` memang memanggil `createPatient`, jadi bukan dead code global.
- `docs/17-Audit/_inventory/feature-coverage-matrix.md` FR-04 — jika mencatat coverage <100%, audit ini menambahkan bukti bahwa **backend workflow kritis sudah lengkap** kecuali kontrak envelope. Rekomendasikan naikkan coverage ke 90% dengan catatan NCR-04-01/04.
- `enterprise-registration-workflow` spec (bila ada) — perlu diverifikasi apakah menyebutkan cek duplikat visit; jika ya, FG-04-02 statusnya *BROKEN*, bukan *MISSING*.

## 13. No-Code-Modification Attestation

Audit read-only. Tidak ada perubahan kode, DTO, atau schema. Semua kesimpulan berbasis file evidence.
