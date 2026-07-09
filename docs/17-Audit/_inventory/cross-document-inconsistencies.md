# Cross-Document Inconsistency Report

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-CDI |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document details all cross-document inconsistencies identified during the Documentation Consistency Review (Task 2.2). Each inconsistency records the two conflicting sources, the specific conflicting claims (quoted), severity classification, and recommended resolution.

**Validates: Requirements 1.3**

---

## 1. Severity Classification Rules

| Severity | Definition | Examples |
|----------|-----------|----------|
| **Critical** | Contradicts a safety, security, or data integrity requirement | Wrong role on security-sensitive endpoint, missing audit requirement |
| **High** | Contradicts core functional behavior | Wrong module structure leading to broken imports, incorrect API paths |
| **Medium** | Contradicts non-functional or UI specification | Frontend directory structure mismatch, UI component organization |
| **Low** | Terminology or formatting difference only | Role naming convention difference, label discrepancies |

---

## 2. Inconsistency Register

### INC-001: Role Naming — TEKNISI vs ANALIS

| Field | Detail |
|-------|--------|
| **ID** | INC-001 |
| **Source Document A** | `docs/02-SRS/SRS-eLIS-v1.0.md` (Section 4: RBAC Matrix) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (API Endpoints Summary) |
| **Conflicting Claim A** | SRS RBAC Matrix header: `"ADMIN | MANAGER | KASIR | TEKNISI | DOKTER_PJ | KLINIK"` — Uses role name **TEKNISI** for laboratory technician performing analysis and verification. Additionally states: `"Order dinyatakan final (Approved) jika seluruh pemeriksaan di dalam order tersebut telah diverifikasi Teknisi dan diapprove Dokter"` |
| **Conflicting Claim B** | FS API Endpoints: `"POST /api/v1/lab/:orderId/verify | LabWorkflow | ANALIS, ADMIN"` and role table: `"ANALIS | Result entry, verification, delta check, lab queue"` — Uses role name **ANALIS** for the same laboratory technician function. |
| **Implementation Evidence** | Prisma schema `enum Role` defines `ANALIS` (not TEKNISI). Guards in LabWorkflow use `@Roles(Role.ANALIS)`. |
| **Severity** | **High** |
| **Rationale** | This contradicts core functional behavior. If a developer implements code based on SRS using "TEKNISI", the role guard will fail because the enum value is "ANALIS". This directly affects which users can access lab workflow endpoints. |
| **Recommended Resolution** | Update SRS Section 4 RBAC Matrix to replace "TEKNISI" with "ANALIS" to match the implementation and Functional Specification. The FS (written post-implementation) is authoritative for role naming. |

---

### INC-002: Role Naming — DOKTER_PJ vs DOKTER

| Field | Detail |
|-------|--------|
| **ID** | INC-002 |
| **Source Document A** | `docs/02-SRS/SRS-eLIS-v1.0.md` (Section 4: RBAC Matrix) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (API Endpoints Summary) |
| **Conflicting Claim A** | SRS RBAC Matrix header uses **DOKTER_PJ** (Dokter Penanggung Jawab / Responsible Doctor) as the role with approval authority: `"Approval Lab | ... | R U (Approve) |"` |
| **Conflicting Claim B** | FS API Endpoints: `"POST /api/v1/lab/:orderId/approve | LabWorkflow | DOKTER, SUPER_ADMIN"` and role table: `"DOKTER | Approval/rejection, delta check, approval queue"` — Uses simplified role name **DOKTER**. |
| **Implementation Evidence** | Prisma schema `enum Role` defines `DOKTER` (not DOKTER_PJ). Lab workflow approval guard uses `@Roles(Role.DOKTER, Role.SUPER_ADMIN)`. |
| **Severity** | **High** |
| **Rationale** | Same functional impact as INC-001. A developer referencing SRS for the approval endpoint would use wrong role identifier, breaking authorization. |
| **Recommended Resolution** | Update SRS Section 4 to replace "DOKTER_PJ" with "DOKTER" to match implementation and FS. |

---

### INC-003: Role Naming — KLINIK vs KLINIK_PARTNER

| Field | Detail |
|-------|--------|
| **ID** | INC-003 |
| **Source Document A** | `docs/02-SRS/SRS-eLIS-v1.0.md` (Section 4: RBAC Matrix) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (Section: Roles and Responsibilities) |
| **Conflicting Claim A** | SRS RBAC Matrix uses **KLINIK** as role name for partner clinics with access pattern: `"Pasien | ... | C R |"` and `"Order & Kasir | ... | C R (Own) |"` |
| **Conflicting Claim B** | FS role table: `"KLINIK_PARTNER | Patient registration, order creation"` — Uses extended name **KLINIK_PARTNER**. |
| **Implementation Evidence** | Prisma schema `enum Role` defines `KLINIK_PARTNER` (not KLINIK). |
| **Severity** | **Low** |
| **Rationale** | Terminology difference. The semantic meaning is identical (partner clinic access). Less severe than INC-001/002 because this role is less frequently referenced in direct code guards for the laboratory module. |
| **Recommended Resolution** | Update SRS to use "KLINIK_PARTNER" to match implementation. Consider adding a glossary entry explaining the full name. |

---

### INC-004: SRS Role Set Incompleteness

| Field | Detail |
|-------|--------|
| **ID** | INC-004 |
| **Source Document A** | `docs/02-SRS/SRS-eLIS-v1.0.md` (Section 4: RBAC Matrix) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (Roles table) |
| **Conflicting Claim A** | SRS defines only **6 roles**: ADMIN, MANAGER, KASIR, TEKNISI, DOKTER_PJ, KLINIK |
| **Conflicting Claim B** | FS and implementation define **11 roles**: SUPER_ADMIN, OWNER, MANAGER, KASIR, ADMIN, SAMPLING, ANALIS, DOKTER, CS, MARKETING, KLINIK_PARTNER |
| **Implementation Evidence** | Prisma schema `enum Role` has 11 values. Missing from SRS: SUPER_ADMIN, OWNER, SAMPLING, CS, MARKETING. |
| **Severity** | **High** |
| **Rationale** | The SRS RBAC matrix omits 5 roles that exist in implementation. This means no documented access control specification exists for these roles in the SRS, creating ambiguity about their authorized operations. SUPER_ADMIN and OWNER are particularly critical as they have elevated privileges. |
| **Recommended Resolution** | Expand SRS Section 4 RBAC Matrix to include all 11 roles. Add columns for SUPER_ADMIN, OWNER, SAMPLING, CS, and MARKETING with their access levels per module. |

---

### INC-005: Database Design — Clinic-Doctor Relationship

| Field | Detail |
|-------|--------|
| **ID** | INC-005 |
| **Source Document A** | `docs/04-Database/Database-Design-eLIS-v1.0.md` (Section 2: ERD) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (Object Repository) |
| **Conflicting Claim A** | ERD declares relationship: `"CLINIC ||--o{ DOCTOR : has"` — indicating a one-to-many parent-child relationship where each Doctor belongs to exactly one Clinic. |
| **Conflicting Claim B** | FS object repository lists Doctor and Clinic as independent master data entities managed via `ReferenceMasterService` at separate endpoints (`/api/v1/master/doctors`, `/api/v1/master/clinics`) with no foreign key between them. Orders reference both independently: `clinicId` and `doctorId` as separate optional FK fields. |
| **Implementation Evidence** | Prisma `Doctor` model has no `clinicId` field. `Order` model references both `clinicId` and `doctorId` independently. Doctors are not children of Clinics. |
| **Severity** | **High** |
| **Rationale** | This contradicts core data modeling. The DB Design implies queries like "get all doctors belonging to clinic X" should work via FK, but no such relationship exists. Business logic relying on clinic-doctor ownership would fail. |
| **Recommended Resolution** | Update Database Design ERD to remove the `CLINIC ||--o{ DOCTOR : has` relationship. Replace with the actual structure where both are independent entities referenced by Order. If business requires clinic-doctor association, implement a junction table (`ClinicDoctor`) rather than direct FK. |

---

### INC-006: Database Design — Missing Entities

| Field | Detail |
|-------|--------|
| **ID** | INC-006 |
| **Source Document A** | `docs/04-Database/Database-Design-eLIS-v1.0.md` (Section 2: ERD) |
| **Source Document B** | `apps/api/prisma/schema.prisma` (implementation) |
| **Conflicting Claim A** | Database Design ERD documents only 7 entities: USER, PATIENT, ORDER, ORDER_DETAIL, TEST_MASTER, AUDIT_LOG, and implied CLINIC, DOCTOR, TEST_CATEGORY, INVOICE tables. No mention of Panel, Tariff, ReferenceValue, Insurance, Equipment, Reagent, SampleTypeMaster, MeasurementUnit, Region, Province, Regency, District, Village, SystemSetting, or Notification-related entities. |
| **Conflicting Claim B** | Prisma schema implements 25+ models including: Panel, PanelTest, Tariff, ReferenceValue, Insurance, Equipment, Reagent, SampleTypeMaster, MeasurementUnit, Doctor, Clinic, Province, Regency, District, Village, SystemSetting, Order (with full state machine fields), and notification queue entities. |
| **Implementation Evidence** | Prisma schema contains models not present in Database Design: `ReferenceValue`, `Panel`, `PanelTest`, `Tariff`, `Insurance`, `Equipment`, `Reagent`, `SampleTypeMaster`, `MeasurementUnit`, `Province`, `Regency`, `District`, `Village`, `SystemSetting`. |
| **Severity** | **Medium** |
| **Rationale** | While not blocking current functionality (implementation works), the Database Design document is severely incomplete as a reference for new developers. Missing entity documentation can lead to incorrect assumptions about data relationships and constraints. |
| **Recommended Resolution** | Update Database Design to include all entities currently in Prisma schema. Add complete ERD with relationships, data types, and constraints. Consider auto-generating ERD documentation from Prisma schema using tools like `prisma-erd-generator`. |

---

### INC-007: Backend Architecture — Module Structure

| Field | Detail |
|-------|--------|
| **ID** | INC-007 |
| **Source Document A** | `docs/07-Backend/Backend-Architecture-eLIS-v1.0.md` (Section: Directory Structure) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (Object Repository) |
| **Conflicting Claim A** | Backend Architecture documents 11 separate top-level modules under `src/`: `"├── patients/ # Modul Pasien"`, `"├── clinics/ # Modul Klinik Mitra"`, `"├── doctors/ # Modul Dokter Rujukan"`, `"├── master/ # Modul Test Master"`, `"├── orders/ # Modul Order & Kasir"`, `"├── billing/ # Modul Invoice & Payment"`, `"├── laboratory/ # Modul Analisa, Verifikasi, Approval"`, `"├── reports/ # Modul Laporan"`, `"├── notifications/ # Modul Queue Worker"`, `"└── audit/ # Modul Audit Trail"` |
| **Conflicting Claim B** | FS Object Repository documents a consolidated structure: `"LaboratoryModule | src/laboratory/laboratory.module.ts | Umbrella module untuk semua sub-module lab"` with sub-modules: MasterDataModule, PatientModule, OrderModule, PaymentModule, LabWorkflowModule, NotificationModule, DashboardModule, AuditModule — all under `src/laboratory/`. |
| **Implementation Evidence** | Actual `apps/api/src/` contains only 5 top-level directories: `auth/`, `common/`, `config/`, `health/`, `laboratory/`, `users/`. The `laboratory/` directory consolidates: `master-data/`, `patient/`, `order/`, `payment/`, `lab-workflow/`, `notification/`, `dashboard/`, `audit/`, `region/`. No `patients/`, `clinics/`, `doctors/`, `master/`, `orders/`, `billing/`, `reports/` directories exist at the top level. |
| **Severity** | **High** |
| **Rationale** | A developer referencing the Backend Architecture would create modules at the wrong directory level, breaking the established umbrella module pattern. Import paths would be incorrect (e.g., `../../patients/` vs `../patient/` within laboratory). |
| **Recommended Resolution** | Rewrite Backend Architecture Section 3 to reflect the actual consolidated structure with `laboratory/` as umbrella module. Document the rationale for consolidation (Bounded Context per ADR-0001 Modular Monolith decision). |

---

### INC-008: Frontend Architecture — Directory Structure

| Field | Detail |
|-------|--------|
| **ID** | INC-008 |
| **Source Document A** | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` (Section 2: Directory Structure) |
| **Source Document B** | Actual implementation at `apps/web/src/` |
| **Conflicting Claim A** | Frontend Architecture documents the following directories: `"├── components/ # Komponen UI"` (with `ui/`, `shared/`, `modules/` subdirectories), `"├── hooks/ # Custom React Hooks"`, `"├── services/ # API clients dan TanStack Query hooks"`, `"├── types/ # TypeScript Interfaces & Types"`, `"└── schemas/ # Zod Validation Schemas"` |
| **Conflicting Claim B** | Actual `apps/web/src/` contains only: `app/`, `components/` (with `laboratory/`, `layout/`, `orders/`, `patients/`, `regions/`, `ui/` — no `shared/` or `modules/`), `lib/`, `types/`, `middleware.ts`. Directories `hooks/`, `services/`, and `schemas/` do not exist. |
| **Implementation Evidence** | `ls apps/web/src/` shows: `app/`, `components/`, `lib/`, `types/`, `middleware.ts`. No `hooks/`, `services/`, or `schemas/` directories. Components are organized by domain (laboratory, orders, patients) rather than by architectural layer (shared, modules). |
| **Severity** | **Medium** |
| **Rationale** | Contradicts the documented UI specification and architectural pattern. New frontend developers following the Architecture document would create files in non-existent directories. However, this is a structural guidance issue rather than a functional break. |
| **Recommended Resolution** | Update Frontend Architecture Section 2 to reflect the actual Next.js App Router structure with domain-based component organization. Document that `hooks/` are co-located within components, API calls use server actions or are in `lib/`, and Zod schemas are inline with form components. Alternatively, create the documented directories and migrate code if the documented pattern is preferred. |

---

### INC-009: API Documentation — Verify Endpoint Role Assignment

| Field | Detail |
|-------|--------|
| **ID** | INC-009 |
| **Source Document A** | `docs/08-API/API-Docs-eLIS-v1.0.md` (Section 5.5: Modul Laboratorium) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (FR-09: Technician Verification) |
| **Conflicting Claim A** | API Docs state: `"POST /:orderId/verify : [RBAC: TEKNISI] Verifikasi hasil (Status VERIFIED)."` — assigns non-existent role **TEKNISI** to the verify endpoint. |
| **Conflicting Claim B** | FS states: `"FR-09.5: Role guard ANALIS, ADMIN"` — assigns roles **ANALIS** and **ADMIN** to the verify endpoint. |
| **Implementation Evidence** | Lab workflow controller uses `@Roles(Role.ANALIS, Role.ADMIN)` for the verify endpoint. Role TEKNISI does not exist in enum. |
| **Severity** | **High** |
| **Rationale** | API documentation directs integration developers to use a non-existent role for a critical lab workflow endpoint. Any external system (e.g., mobile app) relying on API docs for role configuration would assign the wrong role to technician users, blocking verification. |
| **Recommended Resolution** | Update API Docs Section 5.5 to replace `[RBAC: TEKNISI]` with `[RBAC: ANALIS, ADMIN]`. Also add the full role list for all endpoints as documented in the FS. |

---

### INC-010: API Documentation — Endpoint Scope Incompleteness

| Field | Detail |
|-------|--------|
| **ID** | INC-010 |
| **Source Document A** | `docs/08-API/API-Docs-eLIS-v1.0.md` (Sections 5.1-5.5) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (API Endpoints Summary) |
| **Conflicting Claim A** | API Docs list only 3 endpoints for Master Data: `"GET /tests"`, `"POST /tests"`, `"GET /clinics"`, `"GET /doctors"` under `/api/v1/master`. Total documented endpoints across all sections: ~15. |
| **Conflicting Claim B** | FS documents comprehensive endpoint table with 25+ endpoints including: test-categories CRUD, panels CRUD, tariffs CRUD, patients CRUD, orders with cancel, full lab workflow (queue, sample, results, delta-check, verify, approval-queue, approve), dashboard (lab-summary, lab-volume), and audit-logs. |
| **Implementation Evidence** | Controllers implement all FS-documented endpoints plus additional reference master endpoints (doctors, clinics, insurances, equipments, reagents, sample-types, units) totaling 40+ route handlers. |
| **Severity** | **Medium** |
| **Rationale** | The API Docs document is significantly incomplete but does not make incorrect claims about endpoints that ARE documented. Severity is Medium because the document exists as a summary rather than comprehensive spec, but developers/integrators relying on it will miss most available endpoints. |
| **Recommended Resolution** | Expand API Docs to include all implemented endpoints, or generate API documentation automatically from NestJS Swagger decorators. Add a notice that the FS document contains the authoritative API endpoint list. |

---

### INC-011: SRS Module Separation vs Implementation Consolidation

| Field | Detail |
|-------|--------|
| **ID** | INC-011 |
| **Source Document A** | `docs/02-SRS/SRS-eLIS-v1.0.md` (Section 2: Functional Requirements) |
| **Source Document B** | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` (Object Repository) |
| **Conflicting Claim A** | SRS defines 5 separate functional modules as distinct sections: `"2.1 Modul Authentication"`, `"2.2 Modul Master Data"`, `"2.3 Modul Manajemen Pasien & Order"`, `"2.4 Modul Kasir & Billing"`, `"2.5 Modul Analisa & Approval Lab"` — implying each is an independent module boundary. |
| **Conflicting Claim B** | FS consolidates modules 2.2–2.5 under a single LaboratoryModule umbrella: `"LaboratoryModule | src/laboratory/laboratory.module.ts | Umbrella module untuk semua sub-module lab"` with sub-modules for master-data, patient, order, payment, lab-workflow. |
| **Implementation Evidence** | All modules (master-data, patient, order, payment, lab-workflow) are sub-modules of LaboratoryModule registered in `laboratory.module.ts`. Only `auth` and `users` remain as independent top-level modules. |
| **Severity** | **Medium** |
| **Rationale** | The SRS module boundary doesn't match implementation architecture. While the requirements themselves remain valid regardless of packaging, the implied separation suggests independent deployability or independent team ownership that doesn't exist in practice. |
| **Recommended Resolution** | Add a note to SRS Section 2 clarifying that the module sections represent logical domain boundaries, not physical deployment units. Reference the architecture decision to consolidate under LaboratoryModule per ADR-0001 (Modular Monolith). |

---

## 3. Summary Statistics

| Severity | Count | Inconsistencies |
|----------|:-----:|-----------------|
| **Critical** | 0 | — |
| **High** | 6 | INC-001, INC-002, INC-004, INC-005, INC-007, INC-009 |
| **Medium** | 4 | INC-006, INC-008, INC-010, INC-011 |
| **Low** | 1 | INC-003 |
| **TOTAL** | **11** | |

---

## 4. Affected Document Pairs

| Document | Times Involved | As Source A | As Source B |
|----------|:--------------:|:-----------:|:-----------:|
| `docs/02-SRS/SRS-eLIS-v1.0.md` | 5 | 5 | 0 |
| `docs/08-API/API-Docs-eLIS-v1.0.md` | 2 | 2 | 0 |
| `docs/07-Backend/Backend-Architecture-eLIS-v1.0.md` | 1 | 1 | 0 |
| `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` | 1 | 1 | 0 |
| `docs/04-Database/Database-Design-eLIS-v1.0.md` | 2 | 2 | 0 |
| `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` | 8 | 0 | 8 |
| Implementation (`apps/api/prisma/schema.prisma`, source code) | 3 | 0 | 3 |

**Observation**: The SRS and early-phase documents (Database Design, Backend/Frontend Architecture, API Docs) — all dated 2026-06-30 — are consistently the "stale" source. The Functional Specification (dated 2026-07-08, written post-implementation) is authoritative and matches the actual implementation.

---

## 5. Resolution Priority

Recommended update order based on severity and downstream impact:

| Priority | Action | Affected Documents | Effort |
|:--------:|--------|-------------------|:------:|
| 1 | Update SRS RBAC Matrix: replace all role names with implementation enum values, add missing 5 roles | `docs/02-SRS/SRS-eLIS-v1.0.md` | S (≤2 SP) |
| 2 | Update API Docs: replace TEKNISI with ANALIS, expand endpoint coverage | `docs/08-API/API-Docs-eLIS-v1.0.md` | M (3-5 SP) |
| 3 | Update Backend Architecture: rewrite module structure to reflect laboratory umbrella pattern | `docs/07-Backend/Backend-Architecture-eLIS-v1.0.md` | M (3-5 SP) |
| 4 | Update Database Design: add all missing entities, fix Clinic-Doctor relationship | `docs/04-Database/Database-Design-eLIS-v1.0.md` | L (6-13 SP) |
| 5 | Update Frontend Architecture: reflect actual App Router + domain-based component structure | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` | M (3-5 SP) |

**Total estimated remediation effort**: 17-30 story points

---

## 6. Root Cause Analysis

All 11 inconsistencies share the same root cause:

> **Documentation was authored as forward-looking design (2026-06-30) before implementation began. Implementation then evolved the architecture based on practical decisions (consolidated module structure, expanded role set, removed unnecessary relationships). The documentation was not updated retroactively to reflect implementation decisions.**

The Functional Specification (`FS-TS-ELIS-LAB-NCR0001`, dated 2026-07-08) was written *after* implementation and correctly reflects the current state. Going forward, the FS should be considered the authoritative specification, and earlier documents should be reconciled to match it.

---

*End of Cross-Document Inconsistency Report — Generated for Task 2.2*
