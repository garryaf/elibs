---
Document ID: AUDIT-eLIS-2026-PLAN-001
Title: Enterprise Per-Menu Audit — Plan & Index
Framework: Kiro Enterprise Framework v3
Mode: Incremental Audit → Gap Analysis → FS Sync
Status: In Progress
Author: Enterprise Auditor
Date: 2026-07-10
---

# Enterprise Per-Menu Audit — Plan & Index

## 1. Objective

Audit setiap menu/feature eLIS secara end-to-end (UI → State → API → Service → DB → Response),
menghasilkan bukti file-level untuk tiap kesimpulan, memperbarui FS agar cerminkan implementasi
aktual, dan menjaga konteks per iterasi ≤ 8000 token (Framework V3 Context Loading Strategy).

**Prinsip:**

- Read-only audit — tidak ada perubahan kode.
- Satu menu = satu file (`docs/audit/NN-<slug>.md`).
- Setiap kesimpulan wajib berevidensi (path file + baris atau nama simbol).
- Reuse hasil `docs/17-Audit/` dan sebutkan referensinya.
- Tidak menandai fitur "complete" hanya berdasarkan keberadaan file.

## 2. Inventori Menu (dari sidebar frontend)

Sumber: `apps/web/src/app/dashboard/*` + `apps/web/src/components/layout/sidebar.tsx`.

| # | Menu / Route | Sub-Menu | Modul Backend Terkait | Prior Audit |
|---|---|---|---|---|
| 01 | Login (`/`) | — | `auth`, `users` | rbac-review, security tests |
| 02 | Dashboard (`/dashboard`) | Overview, Recent Orders | `laboratory/dashboard` | dashboard-gap-analysis |
| 03 | Pasien (`/dashboard/patients`) | List, Form Modal | `laboratory/patient` | feature-coverage FR-03 |
| 04 | Registrasi (`/dashboard/registration`) | Search → Register → Visit | `patient` + `visit` | enterprise-registration-workflow spec |
| 05 | Kunjungan (`/dashboard/visits`) | List, New Visit | `laboratory/visit` | visit-management spec |
| 06 | Order & Kasir (`/dashboard/orders`) | List, New, Detail, Payment, Report | `order`, `payment` | feature-coverage FR-04, FR-05 |
| 07 | Laboratorium (`/dashboard/laboratory`) | Queue, Results, Approval, Lab Dashboard, Detail | `lab-workflow` | feature-coverage FR-06..FR-10 |
| 08 | Validasi Dokter (`/dashboard/doctor`) | Approval Queue | `lab-workflow` (approve endpoint) | feature-coverage FR-10 |
| 09 | Laporan (`/dashboard/reports`) | 6 report types | ❌ **belum ada backend** | functional-gap FG-SET-003 |
| 10 | Audit Trail (`/dashboard/audit-trail`) | List + filter | `laboratory/audit` | rbac-review §5 |
| 11 | Pengaturan (`/dashboard/settings`) | 12 tabs (Users, Categories, Tests, Panels, Tariffs, Doctors, Clinics, Insurances, Equipment, Reagents, Sample Types, Units, Wilayah, SMTP) | `users`, `master-data`, `region`, `notification/settings` | functional-gap-report FG-ADM-*, FG-MD-* |

Total: **11 top-level menu** dengan ~28 sub-halaman/tab.

## 3. Urutan Eksekusi (prioritized)

Prioritas berdasarkan dampak bisnis dan kekentalan bukti bug yang sudah terlihat selama sesi:

| Wave | # | Menu | Rasional Prioritas |
|---|---|---|---|
| 1 | 01 | Login & Auth | Fondasi keamanan; bug envelope duplikat baru ketemu; dampak menyebar ke semua menu |
| 1 | 11 | Pengaturan (Users tab dulu) | RBAC + user management jadi tulang punggung akses |
| 2 | 03 | Pasien | Entitas paling banyak dirujuk (visits, orders); NIK/MRN uniqueness kritis |
| 2 | 04 | Registrasi | Workflow multi-step; bug jaringan barusan dilaporkan |
| 2 | 05 | Kunjungan | Prasyarat order; sequence generator |
| 3 | 06 | Order & Kasir | State machine kompleks; tariff resolver; payment |
| 3 | 07 | Laboratorium | Auto-flagging, delta check, verify |
| 3 | 08 | Validasi Dokter | Approve/reject + trigger notifikasi |
| 4 | 02 | Dashboard | Read-only aggregation; risiko rendah |
| 4 | 10 | Audit Trail | Consumer-only pada `audit_logs` |
| 4 | 09 | Laporan | Sudah divonis P1 (backend belum ada) di `functional-gap-report` |

## 4. Format Output per Menu

Setiap file `docs/audit/NN-<slug>.md` mengikuti struktur:

1. **Implementation Status** — ringkasan status per FR/FS
2. **End-to-End Flow** — trace UI → DB → Response, disertai path file
3. **Functional Gap** — FR yang MISSING/PARTIAL/BROKEN
4. **Frontend Gap** — komponen, form, validation, RBAC-visible actions
5. **Backend/API Gap** — controller, DTO, service, error handling
6. **Database Gap** — kolom yang tidak tersimpan, kolom yang tidak dipakai
7. **Duplicate/Repeated Logic** — bukti duplikasi semantik
8. **Dead Code Candidates** — kandidat dengan pemetaan referensi (bukan asumsi)
9. **NCR Gap Matrix** — tabel formal (kolom: ID, Menu, FR ID, Layer, Finding, Evidence, Root Cause, Impact, Priority, Required Action, Status)
10. **Required Actions** — daftar action item terurutan prioritas
11. **FS/FR Update** — patch yang direkomendasikan ke FS docx / SRS

## 5. Kebijakan Reuse

Sebelum mulai audit menu baru, buka dan sitasi:

- `docs/17-Audit/_inventory/feature-coverage-matrix.md` — cakupan dokumen per FR
- `docs/17-Audit/_inventory/functional-gap-report.md` — daftar gap fungsional yang sudah ditemukan
- `docs/17-Audit/rbac-review.md` — audit RBAC end-to-end
- `docs/17-Audit/navigation-review.md` — audit navigasi & routing
- `docs/17-Audit/dashboard-gap-analysis.md` — audit dashboard
- `docs/17-Audit/_inventory/documentation-implementation-gaps.md` — GAP-DI-*

Jika menemukan bukti baru yang **membatalkan** temuan prior, catat rujukan silang di NCR
Gap Matrix dengan kolom `Supersedes` atau `Cross-Ref`.

## 6. Indeks File Audit (di folder ini)

| File | Menu | Status |
|---|---|---|
| `01-login-auth.md` | Login & Auth | ✅ Done (wave 1) |
| `02-settings-users.md` | Pengaturan → Users | ✅ Done (wave 1) |
| `03-patients.md` | Pasien | ✅ Done (wave 2) |
| `04-registration.md` | Registrasi | ✅ Done (wave 2) |
| `05-visits.md` | Kunjungan | ✅ Done (wave 2) |
| `06-orders-payment.md` | Order & Kasir | ⏳ Planned |
| `07-laboratory.md` | Laboratorium | ⏳ Planned |
| `08-doctor-approval.md` | Validasi Dokter | ⏳ Planned |
| `09-dashboard.md` | Dashboard | ⏳ Planned |
| `10-audit-trail.md` | Audit Trail | ⏳ Planned |
| `11-reports.md` | Laporan | ⏳ Planned |
| `99-consolidated-summary.md` | Enterprise Gap Summary | ⏳ Setelah semua menu selesai |

## 7. Cara Melanjutkan Audit Berikutnya

Perintah standar untuk menu berikutnya (contoh):

> "Audit menu Pengaturan → Users berikutnya, output ke `docs/audit/02-settings-users.md`."

Setiap turn menghasilkan 1 file audit lengkap dengan 11 seksi + NCR Gap Matrix.
