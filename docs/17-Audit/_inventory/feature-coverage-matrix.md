# Feature Coverage Matrix — Cross-Document Verification

| Field           | Value                                              |
|-----------------|----------------------------------------------------|
| **Document ID** | AUDIT-eLIS-2026-003                                |
| **Version**     | 1.0                                                |
| **Date**        | 2026-07-08                                         |
| **Author**      | Enterprise Architect (Audit System)                |
| **Classification** | Internal                                        |
| **Status**      | Draft                                              |

---

## 1. Purpose

This document verifies that every feature defined in the Functional Specification
(`FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md`) has a corresponding entry in
each of the following document types:

1. **BRD** — `docs/01-BRD/BRD-eLIS-v1.0.md`
2. **SRS** — `docs/02-SRS/SRS-eLIS-v1.0.md`
3. **Database Design** — `docs/04-Database/Database-Design-eLIS-v1.0.md`
4. **API Specification** — `docs/08-API/API-Docs-eLIS-v1.0.md`
5. **Frontend Architecture** — `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`

**Validates: Requirement 1.4**

---

## 2. Feature List (Extracted from Functional Specification)

| Feature ID | Feature Name                          | Key Capabilities |
|------------|---------------------------------------|------------------|
| FR-01      | Lab Test Master Data Management       | CRUD TestMaster, TestCategory, Panel, Reference Values |
| FR-02      | Tariff and Pricing Configuration      | CRUD Tariff, priority-based lookup, discount validation |
| FR-03      | Patient Registration                  | NIK validation, MRN auto-generation, search |
| FR-04      | Lab Order Creation                    | Order with N tests, auto-calculation via TariffResolver |
| FR-05      | Payment and Billing                   | Payment processing, barcode Code-128, invoice |
| FR-06      | Sample Collection and Tracking        | Barcode scan, sample condition, rejection |
| FR-07      | Laboratory Result Entry               | Auto-flagging (H/L/C/N), reference value comparison |
| FR-08      | Delta Check                           | Historical result comparison (max 5 previous) |
| FR-09      | Technician Verification               | Status IN_ANALYSIS→VERIFIED, audit log |
| FR-10      | Doctor Approval                       | Approve/reject, auto-approval, approval queue |
| FR-11      | Result Notification and Distribution  | BullMQ, Email, WhatsApp, PDF generation |
| FR-12      | Order Cancellation                    | Cancel PENDING_PAYMENT orders, audit log |
| FR-13      | Audit Trail                           | Immutable C/U/D logging, sensitive field exclusion |
| FR-14      | Laboratory Dashboard                  | TAT metrics, volume, queue counts |
| FR-15      | Frontend Laboratory UI                | Queue, Result Entry, Approval, Dashboard screens |

---

## 3. Coverage Matrix

Legend:
- ✅ **Covered** — Feature explicitly referenced or described in the document
- ⚠️ **Partial** — Feature mentioned generally but lacking specific detail
- ❌ **Missing** — No corresponding entry found for this feature

| Feature ID | Feature Name                     | BRD | SRS | Database | API Spec | Frontend |
|------------|----------------------------------|:---:|:---:|:--------:|:--------:|:--------:|
| FR-01      | Lab Test Master Data Management  | ⚠️  | ✅  | ✅       | ✅       | ❌       |
| FR-02      | Tariff and Pricing Configuration | ✅  | ✅  | ❌       | ❌       | ❌       |
| FR-03      | Patient Registration             | ✅  | ✅  | ✅       | ✅       | ❌       |
| FR-04      | Lab Order Creation               | ✅  | ✅  | ✅       | ✅       | ❌       |
| FR-05      | Payment and Billing              | ✅  | ✅  | ❌       | ✅       | ❌       |
| FR-06      | Sample Collection and Tracking   | ✅  | ⚠️  | ❌       | ✅       | ❌       |
| FR-07      | Laboratory Result Entry          | ✅  | ✅  | ⚠️       | ✅       | ❌       |
| FR-08      | Delta Check                      | ✅  | ❌  | ❌       | ❌       | ❌       |
| FR-09      | Technician Verification          | ⚠️  | ⚠️  | ❌       | ✅       | ❌       |
| FR-10      | Doctor Approval                  | ✅  | ✅  | ❌       | ✅       | ❌       |
| FR-11      | Result Notification & Distribution | ✅ | ❌  | ❌       | ❌       | ❌       |
| FR-12      | Order Cancellation               | ❌  | ❌  | ❌       | ❌       | ❌       |
| FR-13      | Audit Trail                      | ✅  | ✅  | ✅       | ❌       | ❌       |
| FR-14      | Laboratory Dashboard             | ✅  | ❌  | ❌       | ❌       | ❌       |
| FR-15      | Frontend Laboratory UI           | ⚠️  | ❌  | ❌       | ❌       | ⚠️       |

---

## 4. Coverage Statistics

### Summary by Document Type

| Document Type       | Covered (✅) | Partial (⚠️) | Missing (❌) | Coverage % |
|---------------------|:------------:|:------------:|:------------:|:----------:|
| BRD                 | 10           | 3            | 2            | 66.7%      |
| SRS                 | 8            | 3            | 4            | 53.3%      |
| Database Design     | 4            | 1            | 10           | 26.7%      |
| API Specification   | 8            | 0            | 7            | 53.3%      |
| Frontend Architecture | 0          | 2            | 13           | 0.0%       |

### Summary by Feature

| Feature ID | Documents Covered (of 5) | Coverage % |
|------------|:------------------------:|:----------:|
| FR-01      | 3 (+ 1 partial)         | 60%        |
| FR-02      | 2                        | 40%        |
| FR-03      | 4                        | 80%        |
| FR-04      | 4                        | 80%        |
| FR-05      | 3                        | 60%        |
| FR-06      | 2 (+ 1 partial)         | 40%        |
| FR-07      | 3 (+ 1 partial)         | 60%        |
| FR-08      | 1                        | 20%        |
| FR-09      | 1 (+ 2 partial)         | 20%        |
| FR-10      | 3                        | 60%        |
| FR-11      | 1                        | 20%        |
| FR-12      | 0                        | 0%         |
| FR-13      | 3                        | 60%        |
| FR-14      | 1                        | 20%        |
| FR-15      | 0 (+ 2 partial)         | 0%         |

**Overall Coverage Rate**: 30 full covers out of 75 cells = **40.0%**
**Including Partials**: 42 out of 75 cells = **56.0%**

---

## 5. Detailed Gap Analysis

### 5.1 Gaps in BRD (`docs/01-BRD/BRD-eLIS-v1.0.md`)

| Feature ID | Status | Evidence |
|------------|--------|----------|
| FR-01 | ⚠️ Partial | BRD §08 mentions "Master Data: Pemeriksaan, Paket, Harga" and §12 FR-01 covers "Order Management" but does not separately specify TestCategory/Panel CRUD. Reference Values not mentioned. |
| FR-09 | ⚠️ Partial | BRD §11 describes "Analis lab menginput hasil" and "Approve" step but does not explicitly name a separate "Technician Verification" step between analysis and doctor approval. |
| FR-12 | ❌ Missing | No mention of order cancellation workflow in BRD. |
| FR-15 | ⚠️ Partial | BRD mentions "Bento Grid" UI (§14) and role-based UI but does not specify individual laboratory UI screens (Queue, Result Entry, Approval, Dashboard). |

### 5.2 Gaps in SRS (`docs/02-SRS/SRS-eLIS-v1.0.md`)

| Feature ID | Status | Evidence |
|------------|--------|----------|
| FR-06 | ⚠️ Partial | SRS §7.2 Activity Diagram mentions "Sampel_Diterima" and "Pengecekan_Kualitas" but does not define specific API endpoints or sample condition validation rules. |
| FR-08 | ❌ Missing | Delta Check feature not mentioned anywhere in SRS. No historical result comparison requirement documented. |
| FR-09 | ⚠️ Partial | SRS §2.5 F-LAB-03 mentions "diverifikasi Teknisi" but does not specify the verification endpoint, validation rules, or status transition separately. |
| FR-11 | ❌ Missing | SRS does not document notification distribution requirements. No mention of BullMQ queues, PDF generation, or WhatsApp/Email delivery. SRS §7.5 Deployment shows Worker→Email/WA but no functional requirement. |
| FR-12 | ❌ Missing | No order cancellation requirement in SRS. |
| FR-14 | ❌ Missing | No dashboard requirement in SRS. Only mentioned as scope in BRD §08. |
| FR-15 | ❌ Missing | No frontend screen specifications in SRS. |

### 5.3 Gaps in Database Design (`docs/04-Database/Database-Design-eLIS-v1.0.md`)

| Feature ID | Status | Evidence |
|------------|--------|----------|
| FR-02 | ❌ Missing | No Tariff entity or pricing model in ERD. Database Design only shows TEST_MASTER with a `price` field but no separate Tariff table, no clinicId/insuranceId pricing dimensions. |
| FR-05 | ❌ Missing | No Payment or Invoice model in ERD. ORDER entity has `totalAmount` but payment status, payment method, barcode storage not modeled. |
| FR-06 | ❌ Missing | No sample collection model. No sampleCondition, sampleCollectedAt, or rejectionReason fields documented. |
| FR-07 | ⚠️ Partial | TEST_MASTER has `minRef` and `maxRef` fields but ERD does not show separate ReferenceValue entity for age/gender-specific ranges. No criticalMin/criticalMax fields. |
| FR-08 | ❌ Missing | No data model supporting delta check (historical result queries). |
| FR-09 | ❌ Missing | No verification status tracking in ORDER_DETAIL. No `verifiedBy` or `verifiedAt` fields. |
| FR-10 | ❌ Missing | No approval model. No `approvedBy`, `approvedAt`, `rejectionReason`, or `requiresDoctorApproval` fields in schema. |
| FR-11 | ❌ Missing | No NotificationLog model. No queue configuration documented. |
| FR-12 | ❌ Missing | No cancellation model. ORDER has `status` but no `cancelledBy`, `cancellationReason` fields. |
| FR-14 | ❌ Missing | No dashboard-specific views or materialized queries documented. |
| FR-15 | ❌ Missing | Not applicable to database design (frontend feature). |

### 5.4 Gaps in API Specification (`docs/08-API/API-Docs-eLIS-v1.0.md`)

| Feature ID | Status | Evidence |
|------------|--------|----------|
| FR-02 | ❌ Missing | No tariff endpoints documented. API Spec §5.2 only lists `/master/tests`, `/master/clinics`, `/master/doctors` — no `/master/tariffs`. |
| FR-08 | ❌ Missing | No delta check endpoint documented (expected: `GET /api/v1/lab/:orderId/delta-check`). |
| FR-09 | ❌ Missing | API Spec §5.5 lists `/verify` endpoint but does not describe verification validation rules or error handling. Actually present as `POST /:orderId/verify` — CORRECTED to Covered in matrix. |
| FR-11 | ❌ Missing | No notification endpoints documented. No queue management API listed. |
| FR-12 | ❌ Missing | No order cancellation endpoint documented (expected: `POST /api/v1/orders/:id/cancel`). |
| FR-13 | ❌ Missing | No audit log query endpoint documented (expected: `GET /api/v1/audit-logs`). |
| FR-14 | ❌ Missing | No dashboard endpoints documented (expected: `GET /api/v1/dashboard/lab-summary`, `GET /api/v1/dashboard/lab-volume`). |
| FR-15 | ❌ Missing | Not applicable to API specification (frontend feature). |

**Note**: API Specification §5.5 does include `POST /:orderId/verify` and `POST /:orderId/approve`, so FR-09 and FR-10 are actually covered at a high level in the API doc.

### 5.5 Gaps in Frontend Architecture (`docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`)

| Feature ID | Status | Evidence |
|------------|--------|----------|
| FR-01 to FR-14 | ❌ Missing | Frontend Architecture document defines technology stack, directory structure, theming, and general patterns but does NOT specify any feature-specific screens, components, or routes for the Laboratory module. It is a general architecture document, not a feature specification. |
| FR-15 | ⚠️ Partial | The document describes the general frontend architecture (Next.js App Router, Shadcn/UI, TanStack Query, responsive design) that enables the Lab UI, but does not specify Lab-specific screens (Queue, Result Entry, Approval, Dashboard), their routes, or their component structure. The `(dashboard)/` route group is mentioned in directory structure but no lab sub-routes are defined. |

**Assessment**: The Frontend Architecture document is an architecture-level document, not a feature specification. It intentionally describes patterns rather than specific screens. However, per Requirement 1.4, every FS feature should have a "corresponding entry" — at minimum a reference to the feature's frontend components, routes, or pages.

---

## 6. Critical Coverage Gaps (Priority Assessment)

### Severity: Critical (Feature completely absent from 4+ documents)

| Feature ID | Feature Name            | Missing From      | Impact |
|------------|-------------------------|-------------------|--------|
| FR-12      | Order Cancellation      | ALL 5 documents   | Feature fully specified in FS but zero traceability to any upstream/downstream doc |
| FR-08      | Delta Check             | SRS, DB, API, FE (4/5) | Critical clinical feature with minimal documentation trail |
| FR-14      | Laboratory Dashboard    | SRS, DB, API, FE (4/5) | Operational monitoring feature not traced through design docs |
| FR-11      | Result Notification     | SRS, DB, API, FE (4/5) | Patient-facing delivery mechanism not documented in technical specs |

### Severity: High (Feature missing from 3 documents)

| Feature ID | Feature Name                  | Missing From       | Impact |
|------------|-------------------------------|-------------------|--------|
| FR-15      | Frontend Laboratory UI        | SRS, DB, API (+ partial in BRD, FE) | UI screens lack technical specification |
| FR-02      | Tariff and Pricing            | DB, API, FE (3/5) | Pricing model not reflected in technical design documents |
| FR-06      | Sample Collection & Tracking  | DB, API partial missing, FE (3/5) | Physical workflow step lacks data model |

### Severity: Medium (Feature missing from 2 documents)

| Feature ID | Feature Name                  | Missing From   | Impact |
|------------|-------------------------------|----------------|--------|
| FR-05      | Payment and Billing           | DB, FE         | Payment data model undocumented |
| FR-09      | Technician Verification       | DB, FE         | Verification data model undocumented |
| FR-01      | Lab Test Master Data          | FE (+ partial BRD) | Master data UI components not specified |
| FR-10      | Doctor Approval               | DB, FE         | Approval data model undocumented |
| FR-13      | Audit Trail                   | API, FE        | Audit query API and UI not specified |

---

## 7. Root Cause Analysis

### Why Documentation Gaps Exist

1. **BRD and SRS were written pre-implementation** (dated 2026-06-30) while the FS was written post-implementation (2026-07-07). The FS captures many features that were added during development phases but never back-propagated to BRD/SRS.

2. **Database Design is a conceptual document** showing only a simplified ERD with 6 core entities. The actual Prisma schema (25+ models) far exceeds what was captured in the design document. The Database Design was never updated after Phase A-E implementations.

3. **API Specification is a high-level overview** listing only "Core" endpoints (§5). It was intended as a starting template, not a comprehensive API reference. Many endpoints implemented in later phases (dashboard, audit, notification, cancellation, delta-check, tariffs) were never added.

4. **Frontend Architecture is pattern-focused**, not feature-focused. It describes HOW to build frontend features (stack, patterns, structure) but does not specify WHAT features exist or their specific implementations.

5. **Feature FR-12 (Order Cancellation)** appears to have been added during implementation without updating any design document — a pure "code-first" addition.

---

## 8. Recommendations

### Immediate Actions (P1 — Must Have)

1. **Update Database Design Document** — Add all 25+ models from the current Prisma schema, particularly: Tariff, ReferenceValue, Panel, PanelTest, MrnSequence, NotificationLog, and workflow-related fields on Order/OrderDetail.

2. **Update API Specification** — Add all implemented endpoints not currently documented: tariffs, delta-check, cancellation, audit-logs, dashboard, notifications. The FS §2.2 "API Endpoints Summary" contains 27 endpoints; the API doc lists approximately 15.

3. **Update SRS** — Back-fill functional requirements for: Delta Check (FR-08), Notification Distribution (FR-11), Order Cancellation (FR-12), Dashboard (FR-14), and Frontend UI (FR-15).

### Short-Term Actions (P2 — Should Have)

4. **Create Frontend Feature Specification** — Document lab-specific screens (routes, components, data requirements) either as an addendum to Frontend Architecture or as a separate document (e.g., `docs/06-Frontend/Frontend-Features-Lab-v1.0.md`).

5. **Establish Documentation Sync Process** — Implement a rule that any new feature added during development must have a corresponding entry added to BRD/SRS/DB/API docs before the feature phase is considered complete.

### Long-Term Actions (P3 — Could Have)

6. **Consolidate API Documentation** — Consider auto-generating API docs from NestJS Swagger annotations to prevent drift between code and documentation.

7. **Introduce Documentation-as-Code** — Link FS feature IDs to their implementation via code annotations or ADR references so traceability is maintained automatically.

---

## 9. Methodology Notes

### How Coverage Was Determined

- **BRD**: Searched for feature-related keywords in Scope (§08), Functional Requirements (§12), Business Rules (§16), and Future Process (§11). A feature is "Covered" if its core capability is explicitly described; "Partial" if only mentioned in passing or as part of a broader scope statement.

- **SRS**: Searched Functional Requirements (§2), System Diagrams (§7), and RBAC matrix (§4). A feature is "Covered" if it has a dedicated requirement ID or is explicitly described in a diagram.

- **Database Design**: Checked ERD (§2), Data Modeling (§3), and Indexing (§4) for entity definitions supporting each feature. A feature is "Covered" if its data model is represented; "Partial" if only partially modeled.

- **API Specification**: Checked endpoint listings (§5) for corresponding API routes. A feature is "Covered" if its CRUD/action endpoints are listed; "Missing" if no endpoints for the feature exist.

- **Frontend Architecture**: Checked directory structure (§2), and component descriptions for feature-specific frontend specifications. Since this is a pattern document, most features are "Missing" at the feature-specific level.

---

**END OF FEATURE COVERAGE MATRIX**
