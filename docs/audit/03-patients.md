---
Document ID: AUDIT-eLIS-2026-M03
Title: Enterprise Audit — Menu 03: Pasien (Patient Management)
Framework: Kiro Enterprise Framework v3
Scope: patients page + PatientFormModal/PatientTable, PatientController/Service, MRN generator, DTOs, PatientInsurance
Status: Complete (read-only)
Author: Enterprise Auditor
Date: 2026-07-10
Reuses: docs/17-Audit/_inventory/feature-coverage-matrix.md (FR-03), functional-gap-report.md (FG-MD-001/002/007)
---

# 03 — Pasien (Patient Management)

## 1. Implementation Status

Traceability terhadap SRS §2.3 F-PAT-01, FS FR-03, BR-01.

| Requirement | Status | Evidence |
|---|---|---|
| F-PAT-01: Validasi NIK unik 16 digit | **IMPLEMENTED** | `create-patient.dto.ts` `@Matches(/^\d{16}$/)`; service `validateNikFormat` + cek unik `findFirst({nik, deletedAt:null})` |
| BR-01: MRN auto-generate `RM-YYYYMM-XXXX`, tak bisa diubah | **IMPLEMENTED** | `mrn-generator.service.ts` — serializable tx + UPSERT atomik; `RM-${monthKey}-${padded}` |
| List pasien + pagination + search | **IMPLEMENTED** | `patient.service.findAll` page/limit/search/sort + `meta` |
| Detail pasien | **IMPLEMENTED** | `GET /patients/:id` → `findById` + region include |
| Update pasien | **IMPLEMENTED** | `PUT /patients/:id` |
| Soft-delete / nonaktifkan pasien | **BROKEN** | **Tidak ada endpoint DELETE** di `patient.controller.ts`; frontend "Nonaktifkan" hanya ubah state lokal (NCR-03-01) |
| Registrasi pasien baru dari menu Pasien | **NOT USED (by design)** | `PatientFormModal` guard `if(!editData) return null`; tombol "Daftarkan" redirect ke `/dashboard/registration` (menu 04) |
| Multi-insurance per pasien (1–5) | **IMPLEMENTED (backend)** | `PatientInsurance` model + 4 endpoint insurances → **supersedes** FG-MD-002 "Not Implemented" |
| Region hierarki (provinsi→kelurahan) | **IMPLEMENTED** | `RegionValidationService.validateHierarchy` dipanggil saat register/update |
| Export data pasien | **MISSING/BROKEN** | Tombol Export placeholder tanpa handler (NCR-03-05) |

## 2. End-to-End Flow

### 2a. List + Search
```
[patients/page.tsx: search input → debounce 300ms → loadPatients]
  apiClient.getPatients({ limit:200, search }) → GET /api/v1/patients?limit=200&search=...
[Backend] PatientController.findAll @Roles(banyak role read)
  → patientService.findAll → Prisma where{deletedAt:null, OR:[name/mrn/phone/email contains, nik startsWith]}
     include REGION_INCLUDE; orderBy createdAt desc; take 20 default (di sini limit=200)
  → return { data:[...], meta } (RAW, TIDAK di-wrap manual)
[TransformInterceptor] → { success, message, data:{ data:[...], meta } }  (single wrap ✅)
[Frontend extraction] loadPatients: envelope=res.data → inner=envelope.data (array) → map ke Patient type
  map: dob←dateOfBirth, status← deletedAt? INACTIVE:ACTIVE, lastVisit←updatedAt
```
Bekerja. **Search server-side jalan** (beda dari tab Users yang client-only). Namun frontend juga filter ulang client-side (`filteredPatients`) — redundan.

### 2b. Edit pasien
```
[Table action "Edit Data" → handleEdit → PatientFormModal(editData)]
  validate() client: NIK 16 digit, nama≥3, dob, phone, address≥5, email regex, region all-or-none
  handleSubmit → onSubmit(form) → page.handleSubmit
    → apiClient.updatePatient(id, { name, nik, dateOfBirth, gender, phone, address, email, ...region })
    → PUT /api/v1/patients/:id  @Roles(KASIR,CS,ADMIN,SUPER_ADMIN)
[Backend] update → validateHierarchy jika ada region → prisma.update → transformRegionResponse
```
⚠️ Catatan: `page.handleSubmit` mengirim `nik` saat update, tapi `UpdatePatientDto` **tidak punya field `nik`** (whitelist pipe akan strip). NIK jadi tak bisa diubah via update — sesuai BR-01, tapi silent-strip (NCR-03-06).

### 2c. "Nonaktifkan" (delete)
```
[Table action "Nonaktifkan" → onDelete → page.handleDelete]
  page.handleDelete(patient): setPatients(prev => map status INACTIVE)  ← HANYA STATE LOKAL
  ✗ TIDAK memanggil API apa pun. Reload berikutnya → pasien kembali ACTIVE.
```
**BROKEN** — lihat NCR-03-01.

## 3. Functional Gap

| ID | Requirement | Status | Root Cause |
|---|---|---|---|
| FG-03-01 | Soft-delete pasien | BROKEN | Tidak ada endpoint backend + frontend palsu (state-only) |
| FG-03-02 | Export data pasien (BRD §08 report) | MISSING | Tombol placeholder |
| FG-03-03 | Multi-insurance UI | PARTIAL | Backend lengkap (4 endpoint), tapi tak ada UI di modal pasien untuk kelola insurance |
| FG-03-04 | Stats "Kunjungan Hari Ini" akurat | BROKEN | Dihitung dari `updatedAt` pasien, bukan tabel `visits` — menyesatkan |
| FG-03-05 | Feedback error saat update gagal | MISSING | `handleSubmit` catch kosong ("could add toast later") |
| FG-03-06 | Delta/riwayat lab pasien di detail (API §5.3 "detail beserta riwayat lab") | MISSING | View modal hanya tampil biodata; tak ada order history |

## 4. Frontend Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| Delete palsu | `handleDelete` mutasi state lokal, tak panggil API | `patients/page.tsx handleDelete` | **High** — user kira pasien dinonaktifkan padahal tidak |
| Export non-fungsional | Tombol Download tanpa `onClick` | `#patient-export-btn` | Medium |
| Update error silent | `catch {}` tanpa notifikasi | `page.handleSubmit` | Medium |
| Double filtering | Server search + client `filteredPatients` filter ulang | `page.tsx` | Low (redundan; boros tapi tak salah) |
| Stats hari ini keliru | `lastVisit = updatedAt`; edit data → dihitung "kunjungan hari ini" | `stats.today` | Medium (metric salah) |
| Pagination terbatas | `getPatients({limit:200})` lalu `PatientTable` paginate lokal @6/hal | `page.tsx`, `PatientTable PAGE_SIZE=6` | Low (bekerja s.d. 200; >200 terpotong) |
| Modal create disabled | `PatientFormModal` return null jika bukan edit | by design (registrasi di menu 04) | OK (tapi kode form create mati/dead — lihat §8) |
| RBAC UI | Semua role yang bisa lihat menu melihat tombol Edit/Nonaktifkan | tak ada gating | Low (server enforce PUT; delete tak ada) |
| Region validation | All-or-none divalidasi baik di FE & BE | `validateRegion` + `validateHierarchy` | Good |
| Accessibility | Form field pakai `<label htmlFor>`, aria-modal | Good | ✅ |

## 5. Backend / API Gap

| Area | Finding | Evidence | Severity |
|---|---|---|---|
| **Tidak ada DELETE pasien** | Controller tak punya `@Delete` → soft-delete pasien tak mungkin via API | `patient.controller.ts` (hanya POST/GET/GET:id/PUT + insurances) | **High** |
| Envelope | Controller return **raw** service result (tidak wrap manual) → interceptor wrap sekali. **KONSISTEN & BENAR** (beda dari UsersController) | `patient.controller.ts` semua method | ✅ Good — jadi NCR-02-01 TIDAK berlaku di patient |
| DTO quality | `CreatePatientDto`/`UpdatePatientDto` lengkap dengan validator kuat | `dto/*.ts` | ✅ Good |
| Region FK type | `provinsiId` dkk `@IsString` (bukan validasi format kode EMSIFA), tapi `validateHierarchy` menutup | dto + service | Low |
| Insurance endpoints | Multi-insurance lengkap: get/add/update/remove, priority 1–5, BPJS class, validity dates | `patient.service` insurance methods | ✅ Good (supersede FG-MD-002/007 sebagian) |
| `parseInt` tanpa guard | `page/limit` parseInt tanpa validasi (NaN risk) | `patient.controller.findAll` | Low |
| Audit log | Perlu verifikasi C/U pasien tercatat di `audit_logs` | middleware audit | P2 (NCR-03-04) |
| Insurance update priority uniqueness | `updatePatientInsurance` tak cek duplikasi priority (2 asuransi priority=1) | `patient.service.updatePatientInsurance` | Medium |

## 6. Database Gap

Tabel: `patients`, `patient_insurances` (baru), region tables.

| Area | Finding | Severity |
|---|---|---|
| Kolom region (provinsiId..kelurahanDesaId) | Ada + FK + dipakai | ✅ |
| Kolom legacy free-text (province/city/district/village) | Ada, **diisi?** — `register` menyimpan `dto.province` dll, tapi frontend modal tidak mengirimnya (hanya kirim region FK). Kolom legacy jadi jarang terisi | Low — potensi kolom hampir-tak-dipakai |
| `PatientInsurance` model | Ada (junction) dengan priority, memberNumber, policyNumber, type, bpjsClassLevel, validFrom/Until | ✅ supersede gap prior |
| `patients.insuranceId` (single FK lama) | Masih ada **berdampingan** dengan PatientInsurance junction → **dua sumber kebenaran** insurance | Medium (ambiguitas: mana yang dipakai billing?) |
| Soft-delete kolom `deletedAt` | Ada, tapi **tak ada jalur** yang men-set-nya (no delete endpoint) | High (kolom ada, logika hilang) |
| Index pencarian nama | Migrasi `add_patient_name_search_index` + `pg_trgm` | ✅ Good untuk search |

## 7. Duplicate / Repeated Logic

| Finding | Evidence | Verdict |
|---|---|---|
| Filtering ganda: server `search` + client `filteredPatients` | `page.tsx loadPatients` + `useMemo filteredPatients` | Redundan semantik; hapus salah satu (server-side sudah cukup) |
| Extraction envelope defensif diulang (patients, settings, dll.) | `loadPatients` vs `settings fetchData` | Duplikasi lintas file — kandidat helper bersama `unwrapApiList()` |
| Region shape transform | `transformRegionResponse` dipakai konsisten di service | Bukan duplikat (good reuse) |
| Insurance single FK vs junction | `patients.insuranceId` & `PatientInsurance` | Duplikasi model insurance — perlu keputusan arsitektur |

## 8. Dead Code Candidates

| Item | Status | Alasan |
|---|---|---|
| `PatientFormModal` cabang create (`initialForm`, teks "Daftarkan Pasien Baru", tombol submit create) | **Unreachable** | Guard `if(!editData) return null` → modal tak pernah render tanpa editData. Kode create mode efektif mati (registrasi via menu 04) |
| `page.handleSubmit` cabang `if(!editingPatient) return` | Partially dead | Selalu ada editingPatient saat modal terbuka |
| `apiClient.createPatient` | **NOT USED** oleh menu Pasien | Dipakai menu Registrasi (04) — verifikasi di audit 04; bukan dead global |
| Export button | Non-functional (placeholder) | Bukan dead code, tapi fitur kosong |
| `PatientStatusBadge` | Live | Dipakai di table & detail |

Rekomendasi: jangan hapus; tandai create-mode `PatientFormModal` untuk di-refactor/di-satu-kan dengan flow registrasi agar tak ada dua form pasien.

## 9. NCR Gap Matrix

| ID | Menu | FR ID | Layer | Finding | Evidence | Root Cause | Impact | Priority | Required Action | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| NCR-03-01 | Pasien | F-PAT/soft-delete | Backend+FE | "Nonaktifkan" pasien palsu: tidak ada endpoint DELETE, frontend hanya ubah state lokal | `patient.controller.ts` tanpa @Delete; `page.handleDelete` state-only | Endpoint belum dibuat; handler FE placeholder | Staf yakin pasien nonaktif padahal masih aktif; data integrity | **P1** | Tambah `DELETE /patients/:id` (soft-delete set deletedAt) + FE panggil API + refresh | Open |
| NCR-03-02 | Pasien | DB | Backend | Kolom `patients.deletedAt` ada tapi tak pernah di-set (logika hilang) | schema + service | Fitur delete tak diimplementasi | Soft-delete pattern tak lengkap | P1 | Sertakan dalam NCR-03-01 | Open |
| NCR-03-03 | Pasien | Insurance | Backend+DB | Dua sumber kebenaran insurance: `patients.insuranceId` (single) & `PatientInsurance` (junction) | schema Patient + PatientInsurance | Migrasi bertahap tanpa deprecate kolom lama | Billing bisa baca sumber berbeda → inkonsistensi | **P2** | Tetapkan junction sebagai sumber tunggal; deprecate/isi-migrasi `insuranceId` | Open |
| NCR-03-04 | Pasien | SRS §5 | Backend | Verifikasi audit log untuk create/update pasien | middleware audit scope | Kemungkinan hanya modul tertentu | Perubahan data pasien mungkin tak ter-audit (BR-08) | P2 | Verifikasi & pastikan `patients` C/U/D masuk audit_logs | Open |
| NCR-03-05 | Pasien | BRD §08 | Frontend | Tombol Export tidak berfungsi | `#patient-export-btn` tanpa onClick | Placeholder | Fitur terlihat tapi mati (UX broken) | P3 | Implement export CSV via endpoint atau sembunyikan sampai siap | Open |
| NCR-03-06 | Pasien | BR-01 | FE+BE | FE mengirim `nik` di update tapi UpdatePatientDto strip diam-diam | `page.handleSubmit` vs `update-patient.dto.ts` | Whitelist pipe drop unknown | Tidak berbahaya tapi membingungkan; NIK edit tak jelas ditolak | P3 | Hilangkan `nik` dari payload update FE; dokumentasikan NIK immutable | Open |
| NCR-03-07 | Pasien | Metric | Frontend | Stats "Kunjungan Hari Ini" dari `updatedAt` pasien, bukan `visits` | `stats.today` | Proxy metric salah | Angka dashboard pasien menyesatkan | P3 | Hitung dari data `visits` (registrationDate) via endpoint | Open |
| NCR-03-08 | Pasien | FE | Frontend | Update pasien gagal tanpa feedback (catch kosong) | `page.handleSubmit catch {}` | Belum ada toast | User tak tahu update gagal | P2 | Tambah notifikasi sukses/gagal | Open |
| NCR-03-09 | Pasien | Insurance | Backend | `updatePatientInsurance` tak cegah dua asuransi priority sama | `patient.service` | Validasi kurang | Ambiguitas primary/secondary | P3 | Enforce unique priority per patient atau re-order otomatis | Open |
| NCR-03-10 | Pasien | FR-03 detail | FE+BE | Detail pasien tak menampilkan riwayat lab (API §5.3 janjikan) | View modal biodata saja | Belum diimplementasi | Dokter/analis tak lihat histori dari profil pasien | P3 | Tambah tab riwayat order di detail pasien (reuse delta-check/order list) | Open |

## 10. Required Actions (Prioritas)

1. **P1** — Implement soft-delete pasien end-to-end (NCR-03-01/02). Effort: S.
2. **P2** — Resolusi dua-sumber insurance (NCR-03-03). Effort: M (keputusan arsitektur + migrasi).
3. **P2** — Verifikasi audit coverage pasien (NCR-03-04) + feedback error update (NCR-03-08). Effort: S.
4. **P3** — Export (NCR-03-05), NIK payload cleanup (NCR-03-06), stats akurat (NCR-03-07), priority uniqueness (NCR-03-09), riwayat lab di detail (NCR-03-10). Effort: S–M.

## 11. FS / FR Update yang Direkomendasikan

- **FR-03 Patient Registration**: status *IMPLEMENTED with gaps* — register/list/search/update solid, tapi **soft-delete BROKEN** dan detail tanpa riwayat lab.
- **Supersede** `functional-gap-report.md` FG-MD-002 (Multi-Insurance "Not Implemented") → **kini IMPLEMENTED di backend** (`PatientInsurance`). Perbarui status jadi *PARTIAL* (backend done, UI belum). Cross-ref NCR-03-03.
- **Supersede sebagian** FG-MD-001 (InsuranceType enum) & FG-MD-007 (BPJS fields): schema kini punya `InsuranceType` enum dan `PatientInsurance.bpjsClassLevel`. Perbarui status.
- Tambah **AC**: "Penghapusan pasien harus soft-delete via API dan tercermin setelah reload."; "Insurance pasien memakai junction `PatientInsurance` sebagai satu-satunya sumber."

## 12. Reused / Superseded Prior Audit References

- `feature-coverage-matrix.md` FR-03 (Patient Registration, coverage 80%) — konsisten; audit ini menambah bukti runtime.
- `functional-gap-report.md`:
  - FG-MD-002 Multi-Insurance → **SUPERSEDED** (backend implemented).
  - FG-MD-001 InsuranceType enum → **SUPERSEDED** (enum ada di schema).
  - FG-MD-007 BPJS fields → **PARTIALLY SUPERSEDED** (`bpjsClassLevel` ada di PatientInsurance).
- Menu 02 NCR-02-01 (double envelope) → **TIDAK berlaku** di PatientController (return raw, benar). Konfirmasi bahwa masalah envelope spesifik ke UsersController/master-data, bukan universal.

## 13. No-Code-Modification Attestation

Audit read-only. Tidak ada perubahan kode.
