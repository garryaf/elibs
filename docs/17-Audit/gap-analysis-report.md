# eLIS — Feature Gap Analysis Report

| Field | Value |
|-------|-------|
| Report ID | GAP-ELIS-2026-001 |
| Date | 2026-07-07 |
| Author | Enterprise Solution Architect |
| Status | Analysis Complete — Awaiting Implementation Approval |

---

## 1. Executive Summary

Setelah analisis menyeluruh terhadap Functional Specification (FS-TS-ELIS-LAB-NCR0001) dibandingkan dengan source code aktual, ditemukan bahwa:

- **Backend API**: 95% selesai — semua 26 endpoints ter-register dan berfungsi
- **Database**: 90% selesai — semua 12 model Prisma terdeploy
- **Frontend**: 40% real implementation — SELURUH halaman masih menggunakan mock/static data
- **Auth Integration**: Baru saja diperbaiki (login flow functional)

**Critical Finding**: Frontend tidak pernah memanggil backend API. Semua data yang ditampilkan berasal dari file mock statis (`mock-orders.ts`, `mock-patients.ts`, `mock-tests.ts`).

---

## 2. Feature Coverage Matrix

| # | Feature | Backend | Database | Frontend | Data Source | Status |
|---|---------|---------|----------|----------|-------------|--------|
| FR-01 | Master Data CRUD | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-tests.ts` | PARTIAL |
| FR-02 | Tariff & Pricing | ✅ Real API | ✅ PostgreSQL | ❌ N/A | Not displayed | PARTIAL |
| FR-03 | Patient Registration | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-patients.ts` | PARTIAL |
| FR-04 | Lab Order Creation | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-orders.ts` | PARTIAL |
| FR-05 | Payment & Billing | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-orders.ts` | PARTIAL |
| FR-06 | Sample Collection | ✅ Real API | ✅ PostgreSQL | ❌ Mock | inline mock | PARTIAL |
| FR-07 | Result Entry | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-orders.ts` | PARTIAL |
| FR-08 | Delta Check | ✅ Real API | ✅ PostgreSQL | ❌ Mock | inline `MOCK_DELTA_CHECK` | PARTIAL |
| FR-09 | Technician Verification | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-orders.ts` | PARTIAL |
| FR-10 | Doctor Approval | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-orders.ts` | PARTIAL |
| FR-11 | Notification | ✅ BullMQ | ✅ PostgreSQL | ❌ N/A | Queue only | PARTIAL |
| FR-12 | Order Cancellation | ✅ Real API | ✅ PostgreSQL | ❌ Mock | `mock-orders.ts` | PARTIAL |
| FR-13 | Audit Trail | ✅ Real API | ✅ PostgreSQL | ❌ N/A | No UI | PARTIAL |
| FR-14 | Dashboard | ✅ Real API | ✅ PostgreSQL | ❌ Mock | inline `MOCK_SUMMARY` | PARTIAL |
| FR-15 | Frontend Lab UI | N/A | N/A | ❌ Mock | All mock files | PARTIAL |

---

## 3. Mock Data Analysis

### Files Using Mock Data (Critical — Must Migrate to Real API)

| # | File | Mock Import | Priority |
|---|------|-------------|----------|
| 1 | `dashboard/orders/page.tsx` | `MOCK_ORDERS` | HIGH |
| 2 | `dashboard/orders/[id]/page.tsx` | `MOCK_ORDERS` | HIGH |
| 3 | `dashboard/orders/[id]/report/page.tsx` | `MOCK_ORDERS` | MEDIUM |
| 4 | `dashboard/orders/new/page.tsx` | `MOCK_PATIENTS`, `MOCK_TESTS` | HIGH |
| 5 | `dashboard/patients/page.tsx` | `MOCK_PATIENTS` | HIGH |
| 6 | `dashboard/laboratory/queue/page.tsx` | `MOCK_QUEUE_ORDERS` (inline) | HIGH |
| 7 | `dashboard/laboratory/results/page.tsx` | `MOCK_ORDERS` | HIGH |
| 8 | `dashboard/laboratory/results/[orderId]/page.tsx` | `MOCK_ORDERS`, `MOCK_DELTA_CHECK` | HIGH |
| 9 | `dashboard/laboratory/[id]/page.tsx` | `MOCK_ORDERS` | HIGH |
| 10 | `dashboard/laboratory/approval/page.tsx` | `MOCK_ORDERS` | HIGH |
| 11 | `dashboard/laboratory/lab-dashboard/page.tsx` | `MOCK_SUMMARY` (inline) | MEDIUM |
| 12 | `dashboard/doctor/page.tsx` | `MOCK_ORDERS` | HIGH |

---

## 4. Database Gap Analysis

### 4.1 Patient Model — Missing Fields

Per requirement Section 3 (Patient Master Enhancement), fields berikut BELUM ADA di schema:

| Field | Type | Status | Required For |
|-------|------|--------|--------------|
| `province` | String? | ❌ MISSING | Executive Dashboard analytics |
| `city` | String? | ❌ MISSING | Patient distribution |
| `district` | String? | ❌ MISSING | Geographic analytics |
| `village` | String? | ❌ MISSING | Geographic analytics |
| `postalCode` | String? | ❌ MISSING | Geographic analytics |
| `bloodType` | String? | ❌ MISSING | Clinical reference |
| `emergencyContact` | String? | ❌ MISSING | Clinical safety |
| `insuranceId` | String? | ❌ MISSING | Insurance integration |

### 4.2 Missing Master Data Models

Per requirement Section 4, berikut master data yang BELUM ada di database:

| # | Master Data | Current Status | Impact |
|---|-------------|----------------|--------|
| 1 | Doctor / Referral | ❌ Missing model | Order `doctorId` has no FK |
| 2 | Clinic | ❌ Missing model | Tariff `clinicId` has no FK |
| 3 | Insurance | ❌ Missing model | Tariff `insuranceId` has no FK |
| 4 | Laboratory Staff | ❌ Uses User model | No lab-specific fields |
| 5 | Reagent | ❌ Missing | QC tracking needed |
| 6 | Equipment | ❌ Missing | Calibration tracking |
| 7 | Calibration | ❌ Missing | Equipment QC |
| 8 | Sample Type | ❌ Hardcoded enum | Should be configurable |
| 9 | Unit (measurement) | ❌ Hardcoded string | Should be standardized |
| 10 | Result Interpretation | ❌ Missing | Automated interpretation |

### 4.3 Existing but Without Foreign Key Enforcement

| Field | Model | References | FK Exists? |
|-------|-------|-----------|------------|
| `clinicId` | Order | Clinic | ❌ No FK |
| `doctorId` | Order | Doctor | ❌ No FK |
| `insuranceId` | Order | Insurance | ❌ No FK |
| `clinicId` | Tariff | Clinic | ❌ No FK |
| `insuranceId` | Tariff | Insurance | ❌ No FK |

---

## 5. Implementation Priority (Phase-Based)

### Phase F: Frontend-API Integration (HIGHEST PRIORITY)

| # | Task | Files Affected | Effort |
|---|------|---------------|--------|
| F.1 | Create `api.ts` hooks/services for all endpoints | `src/lib/api.ts` | Medium |
| F.2 | Migrate Orders page to real API | `dashboard/orders/page.tsx` | Medium |
| F.3 | Migrate Patients page to real API | `dashboard/patients/page.tsx` | Medium |
| F.4 | Migrate New Order page to real API | `dashboard/orders/new/page.tsx` | Medium |
| F.5 | Migrate Order Detail page to real API | `dashboard/orders/[id]/page.tsx` | Medium |
| F.6 | Migrate Lab Queue page to real API | `dashboard/laboratory/queue/page.tsx` | Medium |
| F.7 | Migrate Result Entry to real API | `dashboard/laboratory/results/` | High |
| F.8 | Migrate Doctor Approval to real API | `dashboard/laboratory/approval/page.tsx` | Medium |
| F.9 | Migrate Dashboard to real API | `dashboard/laboratory/lab-dashboard/page.tsx` | Low |
| F.10 | Add auth token to all API calls | `src/lib/api.ts` | Low |
| F.11 | Remove all mock files | `src/lib/mock-*.ts` | Low |

### Phase G: Patient Master Enhancement

| # | Task | Files Affected | Effort |
|---|------|---------------|--------|
| G.1 | Add address fields to Patient schema | `schema.prisma` | Low |
| G.2 | Create Prisma migration | `prisma/migrations/` | Low |
| G.3 | Update PatientModule DTO | `patient/dto/` | Low |
| G.4 | Update Patient API | `patient/patient.service.ts` | Low |
| G.5 | Update Patient UI form | `dashboard/patients/page.tsx` | Medium |

### Phase H: Master Data Extension

| # | Task | Files Affected | Effort |
|---|------|---------------|--------|
| H.1 | Create Doctor model + CRUD | `schema.prisma`, new module | Medium |
| H.2 | Create Clinic model + CRUD | `schema.prisma`, new module | Medium |
| H.3 | Create Insurance model + CRUD | `schema.prisma`, new module | Medium |
| H.4 | Add FK constraints | `schema.prisma` | Low |
| H.5 | Create Equipment model + CRUD | `schema.prisma`, new module | Medium |
| H.6 | Create Reagent model + CRUD | `schema.prisma`, new module | Medium |
| H.7 | Create SampleType configurable model | `schema.prisma` | Low |

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Frontend has zero real data integration | CRITICAL | Phase F must be done first |
| No FK enforcement on doctorId/clinicId/insuranceId | HIGH | Phase H adds proper models |
| Patient model incomplete for analytics | MEDIUM | Phase G adds geographic fields |
| Mock data gives false confidence during demos | HIGH | Phase F.11 removes all mocks |

---

## 7. Recommendation

**Immediate Action Required (Phase F)**: Migrate seluruh frontend dari mock data ke real API calls. Ini adalah gap paling kritis karena demo/testing akan menampilkan data palsu, bukan data dari database.

**Sequence**: F → G → H

---

> Report Status: Complete — Ready for implementation approval.
