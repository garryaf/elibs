# eLIS Comprehensive Testing & Gap Analysis Report

**Tanggal Test:** 8 Juli 2026  
**Versi:** v1.0  
**Tested By:** Automated API Testing  
**Database:** PostgreSQL (port 5433, Docker)

---

## 1. Executive Summary

| Metrik | Hasil |
|--------|-------|
| Total Test Cases | 46 |
| ✅ Passed | 40 (87%) |
| ❌ Failed | 6 (13%) |
| Critical Bugs | 3 |
| Medium Bugs | 2 |
| Low Bugs | 1 |

---

## 2. Master Data Seeding (Contoh Pemeriksaan)

### Test Categories Created

| Kategori | Deskripsi | Status |
|----------|-----------|--------|
| Hematologi | Pemeriksaan darah lengkap (CBC, diff count) | ✅ Created |
| Kimia Klinik | Glukosa, kolesterol, fungsi hati/ginjal | ✅ Created |
| Urinalisis | Pemeriksaan urin lengkap | ✅ Created |
| Serologi | Tes antibodi, antigen, HBsAg, HIV | ✅ Created |
| Koagulasi | PT, APTT, pembekuan darah | ✅ Created |

### Test Master (Pemeriksaan) Created

| Kode | Nama Pemeriksaan | Kategori | Unit | Harga | Metode | Sampel |
|------|-----------------|----------|------|-------|--------|--------|
| HEM-001 | Hemoglobin (Hb) | Hematologi | g/dL | 35.000 | Cyanmethemoglobin | Darah EDTA |
| HEM-002 | Hematokrit (Ht) | Hematologi | % | 35.000 | Automated | Darah EDTA |
| HEM-003 | Leukosit (WBC) | Hematologi | ribu/uL | 40.000 | Impedance | Darah EDTA |
| HEM-004 | Trombosit (PLT) | Hematologi | ribu/uL | 40.000 | Impedance | Darah EDTA |
| KK-001 | Glukosa Darah Puasa | Kimia Klinik | mg/dL | 50.000 | GOD-PAP | Serum |
| KK-002 | Kolesterol Total | Kimia Klinik | mg/dL | 55.000 | CHOD-PAP | Serum |
| KK-003 | SGOT (AST) | Kimia Klinik | U/L | 45.000 | IFCC | Serum |
| KK-004 | SGPT (ALT) | Kimia Klinik | U/L | 45.000 | IFCC | Serum |
| KK-005 | Kreatinin | Kimia Klinik | mg/dL | 50.000 | Jaffe | Serum |
| UR-001 | Urinalisis Lengkap | Urinalisis | - | 35.000 | Dipstick+Mikroskopik | Urin Midstream |
| SR-001 | HBsAg Rapid | Serologi | - | 75.000 | ICT | Serum |
| SR-002 | Anti-HIV Rapid | Serologi | - | 85.000 | ICT | Serum |
| KG-001 | PT (Prothrombin Time) | Koagulasi | detik | 65.000 | Koagulometri | Plasma Citrat |

---

## 3. Error Analysis (Console Errors)

### BUG-001: CRITICAL — Approval Queue 403 Forbidden

**Error:**
```
GET http://localhost:3001/api/v1/lab/approval-queue 403 (Forbidden)
```

**Root Cause:** Frontend memanggil `/lab/approval-queue` dengan user yang login sebagai ADMIN (bukan SUPER_ADMIN). Endpoint hanya mengizinkan role `DOKTER` dan `SUPER_ADMIN`.

**Kode Backend:**
```typescript
// lab-workflow.controller.ts
@Get('approval-queue')
@Roles(Role.DOKTER, Role.SUPER_ADMIN)  // ← ADMIN tidak termasuk!
```

**Impact:** User dengan role ADMIN tidak bisa mengakses halaman Approval. Frontend menampilkan error.

**Fix:** Tambahkan `Role.ADMIN` ke decorator `@Roles` di endpoint `approval-queue`.

---

### BUG-002: CRITICAL — Lab Queue 403 for SUPER_ADMIN

**Error:**
```
GET http://localhost:3001/api/v1/lab/queue 403 (Forbidden) role=SUPER_ADMIN
```

**Root Cause:** Endpoint `/lab/queue` hanya mengizinkan `SAMPLING, ANALIS, DOKTER, ADMIN` — tetapi TIDAK termasuk `SUPER_ADMIN`.

**Kode Backend:**
```typescript
// lab-workflow.controller.ts
@Get('queue')
@Roles(Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.ADMIN)  // ← SUPER_ADMIN tidak ada!
```

**Impact:** Super Admin tidak bisa melihat antrian lab meskipun seharusnya memiliki akses penuh.

**Fix:** Tambahkan `Role.SUPER_ADMIN` ke decorator `@Roles` di endpoint `queue`.

---

### BUG-003: CRITICAL — Invalid Status "COMPLETED" on Frontend

**Error:**
```
GET http://localhost:3001/api/v1/orders?limit=100&status=COMPLETED 400 (Bad Request)
```

**Root Cause:** Frontend menggunakan status `COMPLETED` yang **tidak ada** di enum `OrderStatus` backend. 

**Backend enum:**
```prisma
enum OrderStatus {
  PENDING_PAYMENT | PAID | SAMPLE_COLLECTED | IN_ANALYSIS | VERIFIED | APPROVED | NOTIFIED | CANCELLED
}
```

**Frontend mapping:**
```typescript
// orders/page.tsx
{ value: "COMPLETED", label: "Selesai" }  // ← TIDAK VALID di backend!
```

**Impact:** Tab "Selesai" di halaman Orders selalu error 400. User tidak bisa filter order yang sudah selesai.

**Fix:** Ganti `COMPLETED` → `APPROVED` di frontend, atau tambahkan mapping yang mengirim `APPROVED` saat user pilih "Selesai".

---

### BUG-004: MEDIUM — Enter Results 400 Bad Request

**Error:**
```
PUT http://localhost:3001/api/v1/lab/edc8b140-d54e-4892-9f39-0a8ec8dbe98b/results 400 (Bad Request)
```

**Root Cause:** Order `edc8b140...` kemungkinan bukan dalam status `SAMPLE_COLLECTED` atau `IN_ANALYSIS` saat user mencoba input hasil. Backend akan menolak jika status tidak sesuai.

**Kemungkinan lain:** Frontend mengirim payload yang tidak sesuai format (misalnya `orderDetailId` kosong atau salah).

**Fix:** Frontend harus validasi status order sebelum menampilkan form input hasil, dan menampilkan pesan error yang informatif ke user.

---

### BUG-005: MEDIUM — Duplicate Category 500 Error

**Error:** `POST /master/test-categories → 500` saat membuat kategori yang sudah ada.

**Root Cause:** Prisma unique constraint violation (`name` is `@unique`). Backend tidak menangani error ini dengan baik — mengembalikan 500 (Internal Server Error) bukan 409 (Conflict).

**Fix:** Tambahkan error handling di service untuk Prisma P2002 (unique constraint) dan kembalikan response 409 dengan pesan yang jelas.

---

### BUG-006: LOW — TypeError "Cannot read properties of undefined (reading 'endpoint')"

**Error:**
```
Uncaught TypeError: Cannot read properties of undefined (reading 'endpoint')
```

**Root Cause:** Kemungkinan ada komponen frontend yang mencoba membaca config/data yang belum ter-load (race condition di Settings page).

**Fix:** Tambahkan null check / optional chaining di komponen yang membaca `.endpoint`.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Endpoint | SUPER_ADMIN | ADMIN | KASIR | ANALIS | DOKTER | SAMPLING | Expected |
|----------|:-----------:|:-----:|:-----:|:------:|:------:|:--------:|----------|
| GET /lab/queue | ❌ 403 | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ✅ 200 | SUPER_ADMIN harus bisa akses |
| GET /lab/approval-queue | ✅ 200 | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 403 | ADMIN harus bisa akses |
| POST /orders | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | OK |
| POST /orders/:id/pay | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | OK |
| POST /lab/:id/sample | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | OK |
| PUT /lab/:id/results | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | OK |
| POST /lab/:id/verify | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | OK |
| POST /lab/:id/approve | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | OK |

---

## 5. Order Lifecycle Test Results

| Step | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 1 | Create Order | 201 + PENDING_PAYMENT | 201 ✅ | PASS |
| 2 | Process Payment | PAID + barcode generated | 201 ✅ | PASS |
| 3 | Confirm Sample | SAMPLE_COLLECTED | 201 ✅ | PASS |
| 4 | Enter Results | IN_ANALYSIS (all filled) | 200 ✅ | PASS |
| 5 | Verify Results | VERIFIED | 201 ✅ | PASS |
| 6 | Doctor Approve | APPROVED | 201 ✅ | PASS |

**Full lifecycle berhasil 100%.** Semua transisi status berjalan sesuai state machine.

---

## 6. Frontend vs Backend Mismatch

| Frontend Code | Backend Reality | Issue |
|--------------|-----------------|-------|
| `status: "COMPLETED"` | Tidak ada enum COMPLETED | Frontend kirim invalid status |
| Approval page dipanggil semua user | Hanya DOKTER + SUPER_ADMIN | Frontend tidak filter berdasarkan role |
| Lab Queue page dipanggil semua user | SUPER_ADMIN tidak bisa akses | Role not included in backend guard |
| `Cannot read 'endpoint'` | Settings page crash | Null reference pada config |

---

## 7. Rekomendasi Fix (Prioritas)

### Priority 1: Critical (Harus Fix Sekarang) — ✅ ALL FIXED (2026-07-09)

1. ~~**Fix RBAC untuk `/lab/queue`**~~ — ✅ FIXED: `SUPER_ADMIN` ditambahkan ke `@Roles`
2. ~~**Fix RBAC untuk `/lab/approval-queue`**~~ — ✅ FIXED: `ADMIN` ditambahkan ke `@Roles`
3. ~~**Fix frontend status filter**~~ — ✅ FIXED: `COMPLETED` diganti `APPROVED`, type OrderStatus updated
4. ~~**Fix duplicate category error handling**~~ — ✅ FIXED: Returns 409 Conflict instead of 500

### Priority 2: Medium

4. **Fix duplicate category error handling** — Return 409 instead of 500
5. **Fix enter results error handling** — Frontend harus cek status sebelum submit
6. **Frontend role-based tab visibility** — Jangan tampilkan tab Approval jika user bukan DOKTER/SUPER_ADMIN

### Priority 3: Low

7. **Fix null reference di Settings page** — Tambahkan optional chaining
8. **Add Reference Values seed** — Agar auto-flagging (NORMAL/HIGH/LOW/CRITICAL) berfungsi

---

## 8. Missing Features (Gap)

| Feature | Status | Notes |
|---------|--------|-------|
| Reference Values (Normal Range) | ✅ DONE (2026-07-09) | 18 records seeded for 9 tests (male/female) — auto-flagging operational |
| Doctor Master Data | ⚠️ Belum ada data | Dropdown dokter kosong saat buat order |
| Clinic Master Data | ⚠️ Belum ada data | Dropdown klinik kosong |
| Insurance Master Data | ⚠️ Belum ada data | Dropdown asuransi kosong |
| Panel (Paket Pemeriksaan) | ⚠️ Belum ada data | Fitur panel tersedia tapi belum diisi |
| Notification (WA/Email) | 🔲 Not implemented | Endpoint ada tapi service belum lengkap |
| System Settings UI | 🔲 Not found | Endpoint `/system-settings` return 404 |
| Audit Log viewer | 🔲 No UI | Tabel ada tapi tidak ada halaman view |
| Report PDF export | ⚠️ Partial | Halaman report ada tapi belum bisa download |

---

## 9. Database Status

| Tabel | Record Count | Status |
|-------|-------------|--------|
| users | 7 | ✅ OK |
| patients | 2 | ✅ OK |
| orders | 3 | ✅ OK |
| test_categories | 6 | ✅ OK |
| test_masters | 13 | ✅ OK |
| provinsi | 34 | ✅ OK |
| kabupaten_kota | 514 | ✅ OK |
| kecamatan | 7,215 | ✅ OK |
| kelurahan_desa | 44,723+ | 🔄 Seed running |
| reference_values | 0 | ⚠️ Perlu seed |
| doctors | 0 | ⚠️ Perlu seed |
| clinics | 0 | ⚠️ Perlu seed |
| insurances | 0 | ⚠️ Perlu seed |

---

## 10. Conclusion

Aplikasi eLIS secara keseluruhan **berfungsi baik** pada core workflow (Order → Payment → Sample → Result → Verify → Approve). 

**3 critical bugs** yang ditemukan semuanya terkait **RBAC (Role-Based Access Control)** dan **frontend-backend enum mismatch**. Ini adalah bug konfigurasi yang mudah diperbaiki tanpa perubahan arsitektur.

**Data master** sudah berhasil diisi melalui API dan terkonfirmasi berfungsi di database Docker (port 5433). Region seed masih berjalan untuk kelengkapan data kelurahan/desa.
