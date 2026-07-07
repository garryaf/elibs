# Functional & Technical Specification

| Field         | Value                                                          |
|---------------|----------------------------------------------------------------|
| Specification | MIKA_FS_TS-ELIS-LAB-NCR0001_Laboratory Management Module      |
| Project Name  | eLIS (Enterprise Laboratory Information System)                |
| Business Unit | Clinical Laboratory                                            |
| Version       | 1.0                                                            |
| Last revised  | 2026-07-07                                                     |
| Status        | Release                                                        |
| Author        | Development Team                                               |
| Protection    | Internal                                                       |

## Project Profile
- Project Name: eLIS — Enterprise Laboratory Information System
- Project Type: Implementation Project
- Business Unit: Clinical Laboratory
- Project Start: 01 Jul 2026
- Project End: 07 Jul 2026

---

## 1. Functional Specification

### 1.1 Overview

Modul Laboratory Management merupakan modul inti eLIS yang mencakup alur kerja
laboratorium lengkap mulai dari konfigurasi master data pemeriksaan, registrasi
pasien, pembuatan order, pembayaran, pengambilan sampel dengan pelacakan barcode,
input hasil dengan auto-flagging, verifikasi teknisi, approval dokter, hingga
pengiriman notifikasi otomatis ke pasien.

Modul ini dibangun dengan pendekatan bertahap (phased) dan telah selesai
diimplementasi melalui 5 fase: Master Data & Patient (Phase A), Orders &
Payment (Phase B), Lab Workflow (Phase C), Notifications & Dashboard (Phase D),
dan Frontend UI (Phase E).

### 1.2 Profile and Background

Laboratorium klinik membutuhkan sistem informasi terintegrasi yang mengelola
seluruh siklus pemeriksaan dari pendaftaran pasien hingga pengiriman hasil.
Proses manual yang ada saat ini rentan terhadap kesalahan transkripsi,
kehilangan sampel, dan keterlambatan pelaporan hasil.

eLIS Laboratory Management Module mengatasi masalah ini dengan menyediakan:
- Manajemen master data terpusat (tes, kategori, panel, referensi)
- Workflow berbasis state machine yang mencegah transisi status yang tidak valid
- Auto-flagging hasil pemeriksaan berdasarkan nilai referensi
- Notifikasi otomatis via Email dan WhatsApp
- Dashboard operasional real-time

#### Profile Table

| Field              | Description                                              |
|--------------------|----------------------------------------------------------|
| ID NO              | MIKA_FS_TS-ELIS-LAB-NCR0001                              |
| Description        | Laboratory Management Module - Complete Lab Workflow      |
| System             | eLIS (NestJS + Next.js + PostgreSQL)                      |
| Scheduling         | Milestones:                                              |
|                    | - Phase A (Master Data): Completed                       |
|                    | - Phase B (Orders & Payment): Completed                  |
|                    | - Phase C (Lab Workflow): Completed                      |
|                    | - Phase D (Notifications & Dashboard): Completed         |
|                    | - Phase E (Frontend UI): Completed                       |
| Functional owner   | Clinical Laboratory Manager                              |
| Classification     | [☒] API Module  [☒] Frontend  [☒] Database Migration     |
|                    | [☒] Background Jobs  [☒] Property Tests                  |
| Components         | [☒] NestJS API  [☒] Next.js Frontend  [☒] PostgreSQL     |
|                    | [☒] Prisma ORM  [☒] BullMQ/Redis  [☒] bwip-js           |
| Performance class  | [☒] Critical (real-time lab workflow)                     |
| Reference documents| BRD, SRS, Database Design, API Documentation             |

### 1.3 Functional Requirements

#### FR-01: Lab Test Master Data Management
- FR-01.1: CRUD endpoints untuk TestMaster (`/api/v1/master/tests`)
- FR-01.2: CRUD endpoints untuk TestCategory (`/api/v1/master/test-categories`)
- FR-01.3: CRUD endpoints untuk Panel (`/api/v1/master/panels`)
- FR-01.4: Validasi kode unik pada TestMaster
- FR-01.5: Soft-delete pada TestMaster, Panel, TestCategory
- FR-01.6: Konfigurasi Reference Value per gender dan age range
- FR-01.7: ERR_REFERENCE_CONFLICT saat delete test dengan referensi aktif
- FR-01.8: Role guard ADMIN/SUPER_ADMIN untuk write operations

#### FR-02: Tariff and Pricing Configuration
- FR-02.1: CRUD endpoints untuk Tariff (`/api/v1/master/tariffs`)
- FR-02.2: Validasi unique (testId, clinicId, insuranceId)
- FR-02.3: Support default tariff (clinicId=null, insuranceId=null)
- FR-02.4: Priority-based tariff lookup (specific → clinic → insurance → default)
- FR-02.5: Role guard ADMIN/SUPER_ADMIN
- FR-02.6: Validasi discount 0-100%

#### FR-03: Patient Registration
- FR-03.1: POST `/api/v1/patients` untuk registrasi
- FR-03.2: Validasi NIK 16 digit numerik
- FR-03.3: ERR_VALIDATION pada duplikasi NIK
- FR-03.4: Auto-generate MRN format RM-YYYYMM-XXXX
- FR-03.5: MRN immutable setelah dibuat
- FR-03.6: Role guard KASIR, CS, ADMIN, KLINIK_PARTNER untuk create
- FR-03.7: GET dengan pagination, search by name/NIK/MRN

#### FR-04: Lab Order Creation
- FR-04.1: POST `/api/v1/orders` dengan testIds (min 1)
- FR-04.2: Auto-generate orderNumber, initial status PENDING_PAYMENT
- FR-04.3: Kalkulasi totalAmount via TariffResolverService
- FR-04.4: Validasi patientId exists dan not soft-deleted
- FR-04.5: Validasi testIds exists dan active
- FR-04.6: Create OrderDetail per testId dengan status PENDING
- FR-04.7: Role guard KASIR, ADMIN, KLINIK_PARTNER
- FR-04.8: GET dengan pagination, filter status, date range

#### FR-05: Payment and Billing
- FR-05.1: POST `/api/v1/orders/:id/pay` (paymentMethod, amountPaid)
- FR-05.2: Transisi PENDING_PAYMENT → PAID
- FR-05.3: ERR_INVALID_STATE jika bukan PENDING_PAYMENT
- FR-05.4: Generate barcode Code-128 via bwip-js
- FR-05.5: GET `/api/v1/orders/:id/barcode` (base64 PNG)
- FR-05.6: GET `/api/v1/orders/:id/invoice`
- FR-05.7: Role guard KASIR, ADMIN

#### FR-06: Sample Collection and Tracking
- FR-06.1: POST `/api/v1/lab/:orderId/sample` (sampleCondition)
- FR-06.2: Transisi PAID → SAMPLE_COLLECTED jika ACCEPTABLE
- FR-06.3: ERR_INVALID_STATE jika bukan PAID
- FR-06.4: Status tetap PAID jika non-ACCEPTABLE, catat rejectionReason
- FR-06.5: Validasi barcode exists
- FR-06.6: Role guard SAMPLING, ADMIN
- FR-06.7: GET `/api/v1/lab/queue` (status PAID/SAMPLE_COLLECTED)

#### FR-07: Laboratory Result Entry
- FR-07.1: PUT `/api/v1/lab/:orderId/results` (array results)
- FR-07.2: Auto-flagging berdasarkan Reference Value
- FR-07.3: Flag LOW jika < minRef
- FR-07.4: Flag HIGH jika > maxRef
- FR-07.5: Flag CRITICAL jika < criticalMin atau > criticalMax
- FR-07.6: Flag NORMAL jika dalam range
- FR-07.7: Transisi SAMPLE_COLLECTED → IN_ANALYSIS saat semua hasil terisi
- FR-07.8: Validasi tipe data resultValue
- FR-07.9: Role guard ANALIS, ADMIN

#### FR-08: Delta Check
- FR-08.1: GET `/api/v1/lab/:orderId/delta-check`
- FR-08.2: Maksimal 5 hasil terakhir per test, ordered by date desc
- FR-08.3: Return resultValue, flag, resultDate, orderNumber
- FR-08.4: Return empty array jika tidak ada riwayat
- FR-08.5: Role guard ANALIS, DOKTER, ADMIN

#### FR-09: Technician Verification
- FR-09.1: POST `/api/v1/lab/:orderId/verify`
- FR-09.2: Validasi semua OrderDetail memiliki resultValue
- FR-09.3: Transisi IN_ANALYSIS → VERIFIED
- FR-09.4: ERR_INVALID_STATE jika bukan IN_ANALYSIS
- FR-09.5: Role guard ANALIS, ADMIN
- FR-09.6: Audit log pada verifikasi

#### FR-10: Doctor Approval
- FR-10.1: POST `/api/v1/lab/:orderId/approve` (decision: APPROVE/REJECT)
- FR-10.2: APPROVE: transisi VERIFIED → APPROVED
- FR-10.3: REJECT: transisi VERIFIED → IN_ANALYSIS + rejectionReason
- FR-10.4: ERR_INVALID_STATE jika bukan VERIFIED
- FR-10.5: Auto-approval jika semua tes requiresDoctorApproval=false
- FR-10.6: Role guard DOKTER, SUPER_ADMIN
- FR-10.7: GET `/api/v1/lab/approval-queue`

#### FR-11: Result Notification and Distribution
- FR-11.1: BullMQ queue untuk PDF generation dan delivery
- FR-11.2: Email notification dengan PDF attachment
- FR-11.3: WhatsApp notification (validasi phone prefix 62/08)
- FR-11.4: Transisi APPROVED → NOTIFIED setelah semua terkirim
- FR-11.5: Skip jika patient tidak consent
- FR-11.6: Retry 3x dengan exponential backoff
- FR-11.7: PDF report berisi nama, MRN, hasil, flags, interpretasi

#### FR-12: Order Cancellation
- FR-12.1: POST `/api/v1/orders/:id/cancel` (reason required)
- FR-12.2: Transisi PENDING_PAYMENT → CANCELLED
- FR-12.3: ERR_INVALID_STATE jika bukan PENDING_PAYMENT
- FR-12.4: Role guard KASIR, ADMIN, SUPER_ADMIN
- FR-12.5: Audit log pada cancellation

#### FR-13: Audit Trail
- FR-13.1: Audit log pada setiap Create/Update/Delete (Order, OrderDetail, Patient)
- FR-13.2: Exclude sensitive fields (passwordHash) dari log
- FR-13.3: Immutable audit_logs (no UPDATE/DELETE)
- FR-13.4: GET `/api/v1/audit-logs` dengan filter
- FR-13.5: Role guard ADMIN, SUPER_ADMIN

#### FR-14: Laboratory Dashboard
- FR-14.1: GET `/api/v1/dashboard/lab-summary` (total today, by status, avg TAT)
- FR-14.2: TAT = approvedAt - sampleCollectedAt (minutes)
- FR-14.3: GET `/api/v1/dashboard/lab-volume` (grouped by day)
- FR-14.4: Role guard OWNER, MANAGER, ADMIN, SUPER_ADMIN
- FR-14.5: Queue counts per status

#### FR-15: Frontend Laboratory UI
- FR-15.1: Queue screen (filter by status, pagination, search)
- FR-15.2: Result Entry form (input, auto-flag colors, delta check)
- FR-15.3: Doctor Approval screen (approve/reject + interpretation)
- FR-15.4: Barcode dan patient details pada queue
- FR-15.5: RBAC-based navigation rendering
- FR-15.6: "Calm Medical Experience" design (Sage Green + Muted Olive)

### 1.4 Layout / Form

#### Frontend Screens

| Screen | Route | Roles | Deskripsi |
|--------|-------|-------|-----------|
| Lab Queue | `/dashboard/laboratory/queue` | SAMPLING, ANALIS, DOKTER, ADMIN | Tabel order dengan filter status, search, pagination, expandable rows |
| Result Entry List | `/dashboard/laboratory/results` | ANALIS, ADMIN | Card view order yang siap diinput hasil |
| Result Entry Form | `/dashboard/laboratory/results/[orderId]` | ANALIS, ADMIN | Form input per parameter tes, flag colors, delta check panel |
| Doctor Approval | `/dashboard/laboratory/approval` | DOKTER, SUPER_ADMIN | Daftar order VERIFIED, tabel hasil, textarea interpretasi, tombol approve/reject |
| Lab Dashboard | `/dashboard/laboratory/lab-dashboard` | OWNER, MANAGER, ADMIN, SUPER_ADMIN | Metric cards, status breakdown, queue counts, volume chart |

#### Design System
- **Palette**: Sage Green (#6B8E6B) + Muted Olive (#8B8B6B)
- **Layout**: Bento Grid dengan rounded-2xl cards
- **Flag Colors**: Green (NORMAL), Amber/Yellow (HIGH/LOW), Red (CRITICAL)
- **Status Badges**: Color-coded per OrderStatus
- **Tab Navigation**: RBAC-filtered sub-navigation di laboratory layout

### 1.5 Process Flow / Logic Program

#### Order Lifecycle State Machine

```
[Start] → PENDING_PAYMENT
  → PAID (payment processed)
  → CANCELLED (cancellation requested)

PAID → SAMPLE_COLLECTED (sample condition = ACCEPTABLE)

SAMPLE_COLLECTED → IN_ANALYSIS (all results entered)

IN_ANALYSIS → VERIFIED (technician verified)

VERIFIED → APPROVED (doctor approved OR auto-approved)
VERIFIED → IN_ANALYSIS (doctor rejected → re-work)

APPROVED → NOTIFIED (notifications sent)

[Terminal States]: NOTIFIED, CANCELLED
```

#### Auto-Flagging Algorithm
```
Input: resultValue, referenceValue (minRef, maxRef, criticalMin, criticalMax)
Priority:
  1. IF criticalMin defined AND value < criticalMin → CRITICAL
  2. IF criticalMax defined AND value > criticalMax → CRITICAL
  3. IF value < minRef → LOW
  4. IF value > maxRef → HIGH
  5. ELSE → NORMAL
```

#### Tariff Resolution Priority
```
1. SPECIFIC: testId + clinicId + insuranceId → highest priority
2. CLINIC_ONLY: testId + clinicId (insuranceId=null)
3. INSURANCE_ONLY: testId + insuranceId (clinicId=null)
4. DEFAULT: testId only (clinicId=null, insuranceId=null)
5. FALLBACK: TestMaster.price (no tariff configured)
```

#### MRN Generation Algorithm
```
1. monthKey = format(now(), 'YYYYMM')
2. SERIALIZABLE transaction:
   UPSERT mrn_sequences SET lastValue = lastValue + 1
3. Return "RM-{monthKey}-{padStart(lastValue, 4, '0')}"
```

### 1.6 Customizing

| Konfigurasi | Deskripsi |
|-------------|-----------|
| DATABASE_URL | PostgreSQL connection string |
| REDIS_HOST | Redis host untuk BullMQ (default: localhost) |
| REDIS_PORT | Redis port untuk BullMQ (default: 6379) |
| JWT_SECRET | Secret key untuk JWT authentication |
| JWT_EXPIRATION | Token expiry time |
| CORS_ORIGINS | Allowed CORS origins |

---

## 2. Technical Specification

### 2.1 Object Detail

| No | Object Name | Type | Package/Path | Description |
|----|-------------|------|--------------|-------------|
| 1 | LaboratoryModule | NestJS Module | `src/laboratory/laboratory.module.ts` | Umbrella module untuk semua sub-module lab |
| 2 | MasterDataModule | NestJS Module | `src/laboratory/master-data/` | CRUD TestCategory, TestMaster, Panel, Tariff |
| 3 | PatientModule | NestJS Module | `src/laboratory/patient/` | Registrasi, MRN generation, search |
| 4 | OrderModule | NestJS Module | `src/laboratory/order/` | Order creation, tariff resolution |
| 5 | PaymentModule | NestJS Module | `src/laboratory/payment/` | Payment, barcode generation |
| 6 | LabWorkflowModule | NestJS Module | `src/laboratory/lab-workflow/` | Sample, results, verify, approve |
| 7 | NotificationModule | NestJS Module | `src/laboratory/notification/` | PDF, Email, WhatsApp via BullMQ |
| 8 | DashboardModule | NestJS Module | `src/laboratory/dashboard/` | Metrics, volume reporting |
| 9 | AuditModule | NestJS Module | `src/laboratory/audit/` | Audit logging, Prisma middleware |
| 10 | OrderStateMachineService | Service | `src/laboratory/lab-workflow/` | State machine enforcing valid transitions |
| 11 | TariffResolverService | Service | `src/laboratory/order/` | Priority-based tariff lookup |
| 12 | AutoFlaggingService | Service | `src/laboratory/lab-workflow/` | Deterministic result flagging |
| 13 | MrnGeneratorService | Service | `src/laboratory/patient/` | SERIALIZABLE MRN generation |
| 14 | BarcodeService | Service | `src/laboratory/payment/` | Code-128 barcode via bwip-js |
| 15 | PdfGeneratorService | Service | `src/laboratory/notification/` | PDF report generation |
| 16 | Prisma Migration | Migration | `prisma/migrations/` | All enums and 12 models |
| 17 | Lab Queue Page | Next.js Page | `app/dashboard/laboratory/queue/` | Frontend queue screen |
| 18 | Result Entry Page | Next.js Page | `app/dashboard/laboratory/results/` | Frontend result entry |
| 19 | Approval Page | Next.js Page | `app/dashboard/laboratory/approval/` | Frontend doctor approval |
| 20 | Dashboard Page | Next.js Page | `app/dashboard/laboratory/lab-dashboard/` | Frontend dashboard |

### 2.2 Capture / Processing Logic / Error Treatment / Notes

#### API Endpoints Summary

| Method | Path | Module | Roles |
|--------|------|--------|-------|
| GET/POST | `/api/v1/master/test-categories` | MasterData | Read: All Auth; Write: ADMIN |
| PUT/DELETE | `/api/v1/master/test-categories/:id` | MasterData | ADMIN, SUPER_ADMIN |
| GET/POST | `/api/v1/master/tests` | MasterData | Read: All Auth; Write: ADMIN |
| PUT/DELETE | `/api/v1/master/tests/:id` | MasterData | ADMIN, SUPER_ADMIN |
| GET/POST | `/api/v1/master/panels` | MasterData | Read: All Auth; Write: ADMIN |
| PUT/DELETE | `/api/v1/master/panels/:id` | MasterData | ADMIN, SUPER_ADMIN |
| GET/POST/PUT/DELETE | `/api/v1/master/tariffs` | MasterData | ADMIN, SUPER_ADMIN |
| POST | `/api/v1/patients` | Patient | KASIR, CS, ADMIN, KLINIK_PARTNER |
| GET | `/api/v1/patients` | Patient | All Authenticated |
| PUT | `/api/v1/patients/:id` | Patient | KASIR, CS, ADMIN |
| POST | `/api/v1/orders` | Order | KASIR, ADMIN, KLINIK_PARTNER |
| GET | `/api/v1/orders` | Order | All Authenticated |
| POST | `/api/v1/orders/:id/pay` | Payment | KASIR, ADMIN |
| POST | `/api/v1/orders/:id/cancel` | Order | KASIR, ADMIN, SUPER_ADMIN |
| GET | `/api/v1/orders/:id/barcode` | Payment | All Authenticated |
| GET | `/api/v1/orders/:id/invoice` | Payment | All Authenticated |
| GET | `/api/v1/lab/queue` | LabWorkflow | SAMPLING, ANALIS, DOKTER, ADMIN |
| POST | `/api/v1/lab/:orderId/sample` | LabWorkflow | SAMPLING, ADMIN |
| PUT | `/api/v1/lab/:orderId/results` | LabWorkflow | ANALIS, ADMIN |
| GET | `/api/v1/lab/:orderId/delta-check` | LabWorkflow | ANALIS, DOKTER, ADMIN |
| POST | `/api/v1/lab/:orderId/verify` | LabWorkflow | ANALIS, ADMIN |
| GET | `/api/v1/lab/approval-queue` | LabWorkflow | DOKTER, SUPER_ADMIN |
| POST | `/api/v1/lab/:orderId/approve` | LabWorkflow | DOKTER, SUPER_ADMIN |
| GET | `/api/v1/dashboard/lab-summary` | Dashboard | OWNER, MANAGER, ADMIN, SUPER_ADMIN |
| GET | `/api/v1/dashboard/lab-volume` | Dashboard | OWNER, MANAGER, ADMIN, SUPER_ADMIN |
| GET | `/api/v1/audit-logs` | Audit | ADMIN, SUPER_ADMIN |

#### Error Codes

| Error Code | HTTP | Description |
|------------|------|-------------|
| ERR_VALIDATION | 400 | Input validation failed |
| ERR_INVALID_STATE | 400 | Order not in required status |
| ERR_REFERENCE_CONFLICT | 400 | Cannot delete entity with active refs |
| ERR_DUPLICATE_NIK | 400 | Patient NIK already exists |
| ERR_DUPLICATE_CODE | 400 | Test code already exists |
| ERR_DUPLICATE_TARIFF | 400 | Tariff combination exists |
| ERR_NOT_FOUND | 404 | Entity not found |
| ERR_UNAUTHORIZED | 401 | Missing/invalid JWT |
| ERR_FORBIDDEN | 403 | Role insufficient |

#### Database Models (Prisma)

| Model | Table | Purpose |
|-------|-------|---------|
| TestCategory | test_categories | Grouping lab tests |
| TestMaster | test_masters | Lab test definitions |
| ReferenceValue | reference_values | Normal ranges per age/gender |
| Panel | panels | Test bundles |
| PanelTest | panel_tests | Panel-to-test mapping |
| Tariff | tariffs | Pricing per clinic/insurance |
| Patient | patients | Patient records with MRN |
| MrnSequence | mrn_sequences | Atomic MRN counter per month |
| Order | orders | Lab orders with lifecycle state |
| OrderDetail | order_details | Individual test items per order |
| NotificationLog | notification_logs | Delivery tracking |
| AuditLog | audit_logs | Immutable mutation log |

#### BullMQ Queue Configuration

| Queue | Concurrency | Retries | Backoff |
|-------|-------------|---------|---------|
| lab-pdf-generation | 3 | 3 | Exponential (1s, 2s, 4s) |
| lab-email-delivery | 5 | 3 | Exponential (2s, 4s, 8s) |
| lab-whatsapp-delivery | 2 | 3 | Exponential (5s, 10s, 20s) |

---

## 3. Unit Test / Property-Based Tests

### Correctness Properties (17 Properties, All Passing)

| # | Property | File | Validates | Runs |
|---|----------|------|-----------|------|
| 1 | Auto-Flagging Determinism | `lab-workflow/tests/auto-flagging.property.spec.ts` | FR-07 | 500 |
| 2 | State Machine Transition Validity | `lab-workflow/tests/state-machine.property.spec.ts` | FR-05,06,09,10,12 | 500 |
| 3 | Tariff Resolution Priority | `order/tests/tariff-resolver.property.spec.ts` | FR-02.4 | 100 |
| 4 | Order Total Equals Sum of Parts | `order/tests/tariff-resolver.property.spec.ts` | FR-04.3 | 100 |
| 5 | Order Creation Invariants | `order/tests/order.property.spec.ts` | FR-04.2,04.6 | 100 |
| 6 | NIK Validation | `patient/tests/patient.property.spec.ts` | FR-03.2 | 200 |
| 7 | MRN Format Invariant | `patient/tests/patient.property.spec.ts` | FR-03.4 | 200 |
| 8 | Discount Range Validation | `master-data/tests/tariff.property.spec.ts` | FR-02.6 | 200 |
| 9 | Non-Acceptable Sample Preserves Status | `lab-workflow/tests/sample.property.spec.ts` | FR-06.4 | 100 |
| 10 | Verification Requires Complete Results | `lab-workflow/tests/results.property.spec.ts` | FR-09.2 | 100 |
| 11 | All Results Entered Triggers Transition | `lab-workflow/tests/results.property.spec.ts` | FR-07.7 | 100 |
| 12 | Auto-Approval When No Doctor Required | `lab-workflow/tests/approval.property.spec.ts` | FR-10.5 | 100 |
| 13 | WhatsApp Phone Validation | `notification/tests/notification.property.spec.ts` | FR-11.3 | 200 |
| 14 | Delta Check Bounded Results | `lab-workflow/tests/delta-check.property.spec.ts` | FR-08.2 | 100 |
| 15 | TAT Calculation Correctness | `dashboard/tests/dashboard.property.spec.ts` | FR-14.2 | 1000 |
| 16 | Audit Log Sensitive Field Exclusion | `audit/tests/audit.property.spec.ts` | FR-13.2 | 200 |
| 17 | Audit Log Creation on Tracked Entities | `audit/tests/audit.property.spec.ts` | FR-13.1 | 100 |

### Test Scenarios

#### Scenario #01 — Master Data CRUD
| Step | Description | Endpoint | Input | Expected Result | Status |
|------|-------------|----------|-------|-----------------|--------|
| 1 | Create test category | POST /api/v1/master/test-categories | {name, description} | 201 Created | ✅ |
| 2 | Create test with unique code | POST /api/v1/master/tests | {code, name, categoryId, price} | 201 Created | ✅ |
| 3 | Reject duplicate code | POST /api/v1/master/tests | {code: existing} | 400 ERR_DUPLICATE_CODE | ✅ |
| 4 | Soft-delete test without refs | DELETE /api/v1/master/tests/:id | - | 200 + deletedAt set | ✅ |
| 5 | Reject delete with active refs | DELETE /api/v1/master/tests/:id | - | 400 ERR_REFERENCE_CONFLICT | ✅ |

#### Scenario #02 — Patient Registration & MRN
| Step | Description | Endpoint | Input | Expected Result | Status |
|------|-------------|----------|-------|-----------------|--------|
| 1 | Register patient with valid NIK | POST /api/v1/patients | {nik: 16 digits, ...} | 201 + MRN generated | ✅ |
| 2 | Reject invalid NIK (not 16 digits) | POST /api/v1/patients | {nik: "123"} | 400 validation error | ✅ |
| 3 | Reject duplicate NIK | POST /api/v1/patients | {nik: existing} | 400 ERR_VALIDATION | ✅ |
| 4 | MRN immutable on update | PUT /api/v1/patients/:id | {mrn: "new"} | MRN unchanged | ✅ |

#### Scenario #03 — Order Lifecycle
| Step | Description | Endpoint | Input | Expected Result | Status |
|------|-------------|----------|-------|-----------------|--------|
| 1 | Create order | POST /api/v1/orders | {patientId, testIds} | PENDING_PAYMENT | ✅ |
| 2 | Process payment | POST /api/v1/orders/:id/pay | {paymentMethod, amount} | PAID + barcode | ✅ |
| 3 | Confirm sample (ACCEPTABLE) | POST /api/v1/lab/:id/sample | {condition: ACCEPTABLE} | SAMPLE_COLLECTED | ✅ |
| 4 | Enter all results | PUT /api/v1/lab/:id/results | [{orderDetailId, value}] | IN_ANALYSIS | ✅ |
| 5 | Verify results | POST /api/v1/lab/:id/verify | {} | VERIFIED | ✅ |
| 6 | Doctor approve | POST /api/v1/lab/:id/approve | {decision: APPROVE} | APPROVED | ✅ |
| 7 | Cancel unpaid order | POST /api/v1/orders/:id/cancel | {reason: "..."} | CANCELLED | ✅ |
| 8 | Reject cancel on paid order | POST /api/v1/orders/:id/cancel | {reason: "..."} | 400 ERR_INVALID_STATE | ✅ |

---

## 4. Further Information / Authorization Detail

### Roles & Authorization

| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Full access to all modules |
| ADMIN | Master data CRUD, patient, orders, lab workflow, audit |
| OWNER | Dashboard access |
| MANAGER | Dashboard access |
| KASIR | Patient registration, order creation, payment, cancellation |
| CS | Patient registration |
| SAMPLING | Sample collection, lab queue |
| ANALIS | Result entry, verification, delta check, lab queue |
| DOKTER | Approval/rejection, delta check, approval queue |
| KLINIK_PARTNER | Patient registration, order creation |
| MARKETING | No laboratory access |

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend Framework | NestJS | Latest |
| ORM | Prisma | 5.22.0 |
| Database | PostgreSQL | 15+ |
| Queue | BullMQ + Redis | Latest |
| Barcode | bwip-js | Latest |
| Frontend | Next.js (App Router) | Latest |
| Testing | Jest + fast-check | Latest |
| Validation | class-validator + class-transformer | Latest |

### Implementation Tasks Summary (47/47 Completed)

#### Phase A: Database Schema & Master Data (8 tasks) ✅
| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Prisma schema migration for laboratory models | ✅ Completed |
| 1.2 | LaboratoryModule umbrella and MasterDataModule | ✅ Completed |
| 1.3 | Tariff CRUD endpoints | ✅ Completed |
| 1.4 | Property test: discount range validation | ✅ Completed |
| 1.5 | PatientModule with MRN generation | ✅ Completed |
| 1.6 | Property tests: NIK validation and MRN format | ✅ Completed |
| 1.7 | AuditModule with Prisma middleware | ✅ Completed |
| 1.8 | Property tests: audit log | ✅ Completed |

#### Phase B: Order Creation, Payment & Tariff (6 tasks) ✅
| Task | Description | Status |
|------|-------------|--------|
| 3.1 | TariffResolverService | ✅ Completed |
| 3.2 | Property tests: tariff resolution | ✅ Completed |
| 3.3 | OrderModule with order creation | ✅ Completed |
| 3.4 | Property test: order creation invariants | ✅ Completed |
| 3.5 | PaymentModule with barcode generation | ✅ Completed |
| 3.6 | Order Cancellation | ✅ Completed |

#### Phase C: Lab Workflow (13 tasks) ✅
| Task | Description | Status |
|------|-------------|--------|
| 5.1 | OrderStateMachineService | ✅ Completed |
| 5.2 | Property test: state machine transitions | ✅ Completed |
| 5.3 | LabWorkflowModule - Sample Collection | ✅ Completed |
| 5.4 | Property test: non-acceptable sample | ✅ Completed |
| 5.5 | AutoFlaggingService | ✅ Completed |
| 5.6 | Property test: auto-flagging | ✅ Completed |
| 5.7 | Result Entry endpoint | ✅ Completed |
| 5.8 | Property tests: result entry transitions | ✅ Completed |
| 5.9 | Delta Check endpoint | ✅ Completed |
| 5.10 | Property test: delta check | ✅ Completed |
| 5.11 | Verification endpoint | ✅ Completed |
| 5.12 | Doctor Approval endpoint | ✅ Completed |
| 5.13 | Property test: auto-approval | ✅ Completed |

#### Phase D: Notifications & Dashboard (5 tasks) ✅
| Task | Description | Status |
|------|-------------|--------|
| 7.1 | Install BullMQ and configure queue module | ✅ Completed |
| 7.2 | NotificationModule with BullMQ processors | ✅ Completed |
| 7.3 | Property test: WhatsApp phone validation | ✅ Completed |
| 7.4 | DashboardModule | ✅ Completed |
| 7.5 | Property test: TAT calculation | ✅ Completed |

#### Phase E: Frontend Laboratory UI (5 tasks) ✅
| Task | Description | Status |
|------|-------------|--------|
| 9.1 | Laboratory page layout and navigation | ✅ Completed |
| 9.2 | Lab Queue screen | ✅ Completed |
| 9.3 | Result Entry form | ✅ Completed |
| 9.4 | Doctor Approval screen | ✅ Completed |
| 9.5 | Laboratory Dashboard screen | ✅ Completed |

### References

| No | Name | Description | Path |
|----|------|-------------|------|
| 1 | Requirements | Functional requirements document | `.kiro/specs/laboratory-management/requirements.md` |
| 2 | Design | Technical design document | `.kiro/specs/laboratory-management/design.md` |
| 3 | Tasks | Implementation task list | `.kiro/specs/laboratory-management/tasks.md` |
| 4 | Prisma Schema | Database schema | `apps/api/prisma/schema.prisma` |
| 5 | FS/TS Template | Template reference | `docs/18-Functional-Spec/FS-TS-Steering-Template.md` |

### List of Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| eLIS | Enterprise Laboratory Information System |
| MRN | Medical Record Number |
| NIK | Nomor Induk Kependudukan (National ID) |
| TAT | Turnaround Time |
| RBAC | Role-Based Access Control |
| PBT | Property-Based Testing |
| DTO | Data Transfer Object |
| CRUD | Create, Read, Update, Delete |
| BullMQ | Bull Message Queue (background jobs) |
| JWT | JSON Web Token |
| API | Application Programming Interface |
| ORM | Object-Relational Mapping |

---

> **Document Status**: Release — All 47 tasks completed, 17 correctness properties validated.
