# Functional Gap Report — Administration, Master Data & Settings Modules

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-006 |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect (Audit System) |
| **Classification** | Internal |
| **Status** | Draft |

---

## 1. Purpose

This report identifies **functional gaps** between documented features (BRD, SRS, FS) and their
actual implementation within the **Administration, Master Data, and Settings** modules of the
eLIS system. Each gap is classified with Feature ID, Feature Name, Expected Behavior,
Current Status, Evidence, Root Cause, Recommendation, and MoSCoW Priority (P1–P4).

**Scope:** Administration, Master Data, and Settings modules ONLY (per Requirement 4.7).

**Validates: Requirements 4.1, 4.7**

---

## 2. Methodology

### 2.1 Input Sources

| Source | Location | Relevance |
|--------|----------|-----------|
| BRD | `docs/01-BRD/BRD-eLIS-v1.0.md` | §08 Scope (Master Data, Security/Settings, RBAC), §15 User Role |
| SRS | `docs/02-SRS/SRS-eLIS-v1.0.md` | §2.2 Modul Master Data, §4 RBAC Matrix |
| Functional Spec | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` | FR-01, FR-02, Roles & Authorization |
| Implementation | `apps/api/src/laboratory/master-data/`, `apps/api/src/users/`, `apps/api/src/laboratory/notification/settings.controller.ts`, `apps/web/src/app/dashboard/settings/` | Backend + Frontend code |
| Intermediate Analysis | `docs/17-Audit/_inventory/documentation-implementation-gaps.md` | 6 actionable gaps identified |
| Feature Coverage Matrix | `docs/17-Audit/_inventory/feature-coverage-matrix.md` | 15 features checked |
| Insurance Schema Analysis | `docs/17-Audit/_inventory/insurance-schema-support.md` | Insurance data model gaps |
| Billing Workflow Analysis | `docs/17-Audit/_inventory/billing-workflow-insurance-rules.md` | Billing/insurance workflow gaps |

### 2.2 Module Scope Definition

Features are included in this report if they belong to one of these modules:

| Module | Backend Location | Frontend Location | Covers |
|--------|-----------------|-------------------|--------|
| **Administration** | `apps/api/src/users/` | Settings → Users tab | User CRUD, Role assignment |
| **Master Data** | `apps/api/src/laboratory/master-data/` | Settings → 12 tabs (Categories, Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Units, Wilayah) | Reference data management |
| **Settings** | `apps/api/src/laboratory/notification/settings.controller.ts`, `apps/api/src/laboratory/region/` | Settings → SMTP tab, Wilayah tab | System configuration |

### 2.3 Priority Classification (MoSCoW)

| Priority | Definition |
|----------|-----------|
| **P1** | Must Have — Blocks production use or causes data integrity failure |
| **P2** | Should Have — Degrades core workflow |
| **P3** | Could Have — Improves usability but has workaround |
| **P4** | Won't Have This Phase — Deferred with no current impact |

---

## 3. Summary Matrix

| Feature ID | Feature Name | Module | Current Status | Priority |
|:----------:|:-------------|:------:|:--------------:|:--------:|
| FG-ADM-001 | Dynamic Role & Permission Management | Administration | Partial | P2 |
| FG-ADM-002 | Role Hierarchy & Composition | Administration | Not Implemented | P3 |
| FG-ADM-003 | User Audit Trail Visibility | Administration | Partial | P3 |
| FG-MD-001 | Insurance Type Enum Constraint | Master Data | Partial | P1 |
| FG-MD-002 | Multi-Insurance per Patient (1–5) | Master Data | Not Implemented | P2 |
| FG-MD-003 | Reference Value Age/Gender Ranges in UI | Master Data | Partial | P2 |
| FG-MD-004 | Tariff Effective Date Management | Master Data | Not Implemented | P3 |
| FG-MD-005 | Master Data Import/Export | Master Data | Not Implemented | P3 |
| FG-MD-006 | Master Data Change Approval Workflow | Master Data | Not Implemented | P3 |
| FG-MD-007 | Insurance BPJS-Specific Fields | Master Data | Not Implemented | P2 |
| FG-SET-001 | Notification Delivery Management UI | Settings | Not Implemented | P2 |
| FG-SET-002 | System Settings Beyond SMTP | Settings | Not Implemented | P3 |
| FG-SET-003 | Reporting Module (Backend Service) | Settings | Not Implemented | P1 |

---

## 4. Detailed Gap Analysis

### FG-ADM-001: Dynamic Role & Permission Management

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-ADM-001 |
| **Feature Name** | Dynamic Role & Permission Management |
| **Module** | Administration |
| **Expected Behavior** | BRD §15 defines User Role management. SRS §4 RBAC Matrix specifies per-module CRUD permissions for 6 roles. The system should allow administrators to view and manage role-permission mappings, not just assign a role from a dropdown. Per BRD §08 Scope: "Permission" is listed as part of Master Data. |
| **Current Status** | **Partial** |
| **Evidence** | `apps/api/src/users/users.controller.ts` — User CRUD exists with role assignment via enum dropdown. `apps/web/src/app/dashboard/settings/page.tsx` — Users tab allows creating/editing users with role selection from 11-value enum. However, no Permission entity, no RolePermission table, no dynamic permission configuration UI exists. Role guards are compile-time constants (`@Roles(Role.ADMIN, Role.SUPER_ADMIN)`) hardcoded in each controller. |
| **Root Cause** | Implementation chose a simpler enum-based RBAC model sufficient for initial deployment. Dynamic permission management was deprioritized in favor of rapid delivery of core lab workflow. |
| **Recommendation** | Phase 1: Create a read-only Access Matrix viewer showing current role→endpoint mappings for audit/compliance. Phase 2: Evaluate whether enterprise deployment requires full dynamic RBAC (per Task 7 RBAC Review findings). Current enum-based approach is acceptable for single-clinic operation. |
| **Priority** | **P2** — Degrades core workflow for enterprise multi-department scenarios; single-clinic can operate with current enum approach. |

---

### FG-ADM-002: Role Hierarchy & Composition

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-ADM-002 |
| **Feature Name** | Role Hierarchy & Composition |
| **Module** | Administration |
| **Expected Behavior** | SRS §4 RBAC Matrix implies hierarchical access: ADMIN has full CRUD on Master Data and Manage User, while MANAGER has only Read. BRD §15 lists OWNER/MANAGER as having "Dashboard, Laporan, Master Data (Read-Only)" access. This implies a hierarchy (SUPER_ADMIN > ADMIN > MANAGER > others) where higher roles inherit lower role permissions. Additionally, the SRS RBAC Matrix suggests composition (a user might need both KASIR and SAMPLING capabilities). |
| **Current Status** | **Not Implemented** |
| **Evidence** | `apps/api/prisma/schema.prisma` — `role Role` is a single enum value per User. No `roles Role[]` array, no RoleHierarchy table, no inheritance logic in `RolesGuard`. Each user has exactly one role. `apps/api/src/common/guards/roles.guard.ts` checks `user.role` against the allowed list — no hierarchy traversal. |
| **Root Cause** | Single-role-per-user was the simplest implementation for initial delivery. Role hierarchy adds complexity to the guard logic and was not required for the initial 5-user pilot. |
| **Recommendation** | Track as enhancement for enterprise multi-department deployment. Current approach works if users are assigned the highest role they need. For Phase 2: evaluate multi-role support via array field or junction table. |
| **Priority** | **P3** — Improves usability; workaround exists (assign highest applicable role). |

---

### FG-ADM-003: User Audit Trail Visibility

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-ADM-003 |
| **Feature Name** | User Audit Trail Visibility |
| **Module** | Administration |
| **Expected Behavior** | BRD §08 Scope includes "Audit Trail" as a security feature. SRS §5 specifies audit_logs intercept all mutations. For Administration, user creation/modification/deletion should be visible in an audit trail accessible from the User Management interface. |
| **Current Status** | **Partial** |
| **Evidence** | `apps/api/src/laboratory/audit/` — AuditLog entity and service exist. User mutations are logged via `AuditInterceptor`. `apps/web/src/app/dashboard/audit-trail/page.tsx` — Audit Trail page exists as a separate menu item. However, there is no inline audit history within the Users tab itself (e.g., "View change history for this user"). The audit trail page shows all entities together without user-specific filtering from within Admin UI. |
| **Root Cause** | Audit trail was implemented as a standalone module. Integration into the Administration UI (contextual audit per entity) was not prioritized. |
| **Recommendation** | Add a "View History" action button per user row in the Users tab that opens a filtered audit trail view showing only changes to that specific user. Low effort — filter already available in audit API. |
| **Priority** | **P3** — Improves usability; workaround exists (navigate to Audit Trail page and filter manually). |

---

### FG-MD-001: Insurance Type Enum Constraint

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-001 |
| **Feature Name** | Insurance Type Enum Constraint |
| **Module** | Master Data |
| **Expected Behavior** | BRD §08 Scope lists "Asuransi" as Master Data. The Insurance model should distinguish between BPJS, Swasta (Private), and Corporate insurance types using a constrained enum — not free-text. This ensures data integrity for downstream billing logic that depends on insurance type (e.g., BPJS requires SEP, Corporate requires batch invoicing). |
| **Current Status** | **Partial** |
| **Evidence** | `apps/api/prisma/schema.prisma` — Insurance model has `type String?` (nullable free-text). No `InsuranceType` enum defined. `apps/api/src/laboratory/master-data/dto/create-reference-master.dto.ts` — `CreateInsuranceDto.type` is `@IsOptional() @IsString()` with no `@IsIn()` validation. Any string value (or null) can be stored. Frontend Insurance tab shows a free-text input for "type" field. See: `docs/17-Audit/_inventory/insurance-schema-support.md` §1.2. |
| **Root Cause** | Insurance was implemented as a generic reference master entity using the same pattern as Doctors/Clinics/Equipment. The type distinction (BPJS/Swasta/Corporate) was not enforced at the data layer because the full insurance workflow was deferred. |
| **Recommendation** | Create `InsuranceType` enum in Prisma schema with values `BPJS`, `SWASTA`, `CORPORATE`. Add migration to convert existing `type` string values. Update DTO validation with `@IsEnum(InsuranceType)`. Update frontend Insurance form to use a dropdown select. |
| **Priority** | **P1** — Blocks data integrity. Without constrained types, billing logic cannot reliably determine which insurance workflow to apply (BPJS vs Corporate vs Private). Garbage data in `type` field will cause errors in downstream processing. |

---

### FG-MD-002: Multi-Insurance per Patient (1–5)

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-002 |
| **Feature Name** | Multi-Insurance per Patient (1–5) |
| **Module** | Master Data |
| **Expected Behavior** | BRD §08 includes "Asuransi" in scope. Enterprise healthcare requires patients to have multiple insurance coverages (e.g., BPJS primary + private secondary). The system should support 1–5 insurance records per patient with primary/secondary designation. |
| **Current Status** | **Not Implemented** |
| **Evidence** | `apps/api/prisma/schema.prisma` — Patient model has single `insuranceId String? @db.Uuid` FK. No `PatientInsurance` junction table exists. Frontend patient form has a single insurance dropdown. See: `docs/17-Audit/_inventory/insurance-schema-support.md` §2. |
| **Root Cause** | Patient-Insurance relationship was implemented as a simple optional FK — the simplest model for initial lab workflow where insurance is informational rather than driving billing logic. M2M junction with priority tracking was deferred. |
| **Recommendation** | Create `PatientInsurance` junction table with fields: patientId, insuranceId, priority (1=primary), memberNumber, validFrom, validUntil, isActive. Add unique constraint on [patientId, insuranceId]. Update Patient registration form to support adding multiple insurance records. |
| **Priority** | **P2** — Degrades core workflow for patients with dual coverage. Workaround: assign primary insurance only. Blocks full insurance billing workflow. |

---

### FG-MD-003: Reference Value Age/Gender Ranges in UI

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-003 |
| **Feature Name** | Reference Value Age/Gender Ranges in UI |
| **Module** | Master Data |
| **Expected Behavior** | FS FR-01.6 specifies "Konfigurasi Reference Value per gender dan age range". The Master Data UI should allow administrators to configure reference values with age-range and gender-specific thresholds (minRef, maxRef, criticalMin, criticalMax) for each lab test. |
| **Current Status** | **Partial** |
| **Evidence** | `apps/api/prisma/schema.prisma` — `ReferenceValue` model exists with fields: testId, gender (enum MALE/FEMALE/ALL), ageMin, ageMax, minValue, maxValue, criticalMin, criticalMax, unit. Backend API: `apps/api/src/laboratory/master-data/master-data.service.ts` supports CRUD for reference values nested under tests. However, the frontend Settings → "Tes Laboratorium" tab shows test list with basic fields (code, name, category, price, status) but does NOT display or allow editing of reference values inline. No dedicated reference value management UI exists in the Settings page. |
| **Root Cause** | Reference values are managed via API (seeded via `reference-values-seed.ts`) but a frontend admin UI for configuring per-test reference value ranges was not built. The focus was on lab result auto-flagging (which reads reference values) rather than admin configuration. |
| **Recommendation** | Add a "Reference Values" sub-panel accessible from each test row (expand/detail view) in the Tes Laboratorium tab. Allow adding/editing reference value rows with gender, age range, min/max, critical min/max. Alternatively, create a dedicated "Reference Values" tab. |
| **Priority** | **P2** — Degrades core workflow. Lab managers cannot configure reference ranges through the UI — must use direct API calls or database seeds. This blocks operationally adding new tests with custom ranges without developer intervention. |

---

### FG-MD-004: Tariff Effective Date Management

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-004 |
| **Feature Name** | Tariff Effective Date Management |
| **Module** | Master Data |
| **Expected Behavior** | BRD FR-05 specifies "Multi-Tarif" capability. Enterprise pricing management requires tariff records to have effective date ranges (validFrom, validUntil) so that price changes can be scheduled in advance and historical pricing is preserved for audit/billing reconciliation. |
| **Current Status** | **Not Implemented** |
| **Evidence** | `apps/api/prisma/schema.prisma` — Tariff model has: id, testId, clinicId, insuranceId, price, discount, createdAt, updatedAt. No `effectiveFrom` or `effectiveTo` date fields exist. `TariffResolverService` always uses the current (single) tariff record without date-range filtering. See: `docs/17-Audit/_inventory/billing-workflow-insurance-rules.md` §3.2. |
| **Root Cause** | Tariff was implemented for current-state pricing only. Temporal pricing (schedule future rates, preserve historical rates) was not in scope for initial implementation. |
| **Recommendation** | Add `effectiveFrom DateTime @default(now())` and `effectiveTo DateTime?` fields to Tariff model. Update `TariffResolverService` to filter by current date. Update Tariff tab in Settings to show/edit date ranges. This enables scheduled price changes and historical audit. |
| **Priority** | **P3** — Improves usability; workaround exists (manually update tariff record when price changes, losing historical data). |

---

### FG-MD-005: Master Data Import/Export

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-005 |
| **Feature Name** | Master Data Import/Export |
| **Module** | Master Data |
| **Expected Behavior** | For enterprise operations, administrators need to bulk-import master data (lab tests, tariffs, reference values, doctors, clinics) from Excel/CSV files and export current master data for review/backup. BRD §08 mentions master data management broadly. SRS F-MD-01 specifies "REST API CRUD" for master entities but does not explicitly mention bulk operations. However, enterprise readiness implies bulk import capability for initial data migration. |
| **Current Status** | **Not Implemented** |
| **Evidence** | No import/export endpoints exist in `apps/api/src/laboratory/master-data/`. No file upload handling for CSV/Excel. No bulk create/update endpoints. Frontend Settings page provides only single-record CRUD modals. Initial data was loaded via `prisma/seeds/` scripts requiring developer access. |
| **Root Cause** | Initial deployment used seed scripts for data loading. The CRUD-per-record approach was sufficient for ongoing maintenance. Bulk import was not explicitly documented as a requirement in BRD/SRS. |
| **Recommendation** | Add bulk import endpoint (`POST /api/v1/master/{entity}/import`) accepting CSV/Excel with validation and error reporting. Add export endpoint (`GET /api/v1/master/{entity}/export?format=csv`). Priority is lower since workaround (individual CRUD + seeds) exists. |
| **Priority** | **P3** — Improves usability for initial deployment and mass updates; workaround exists (manual entry or developer-run seeds). |

---

### FG-MD-006: Master Data Change Approval Workflow

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-006 |
| **Feature Name** | Master Data Change Approval Workflow |
| **Module** | Master Data |
| **Expected Behavior** | Enterprise data governance requires that changes to critical master data (e.g., test prices, reference ranges, insurance agreements) undergo an approval workflow: ADMIN proposes change → SUPER_ADMIN/OWNER approves. BRD §15 states ADMIN manages Master Data, while OWNER/MANAGER have read-only access — implying separation of duties. |
| **Current Status** | **Not Implemented** |
| **Evidence** | All master data write operations are immediately persisted. `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` guards control WHO can write, but there is no multi-step approval. No `PendingChange` or `ChangeRequest` entity exists. No approval queue for master data modifications. Changes by ADMIN take effect immediately without SUPER_ADMIN review. |
| **Root Cause** | The current RBAC model provides access control (who can edit) but not workflow control (approval before effect). This is a common simplification for initial deployment. |
| **Recommendation** | For enterprise compliance: create a `ChangeRequest` entity tracking proposed master data changes with status (PENDING → APPROVED/REJECTED). Add approval endpoints. This is especially important for Tariff changes (pricing impact) and Reference Value changes (clinical impact). Evaluate need based on organizational requirement. |
| **Priority** | **P3** — Improves governance; workaround exists (restrict write access to SUPER_ADMIN only, or rely on audit trail for post-hoc review). |

---

### FG-MD-007: Insurance BPJS-Specific Fields

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-MD-007 |
| **Feature Name** | Insurance BPJS-Specific Fields |
| **Module** | Master Data |
| **Expected Behavior** | BRD §08 Scope includes "Asuransi" management. BRD §17 mentions BPJS integration as future scope. For BPJS insurance records in Master Data, the system should store BPJS-specific configuration: facility code (kode faskes), BPJS class levels supported (1/2/3), INA-CBG mapping codes, and BPJS API credentials. This enables the Insurance Master Data record to serve as configuration for BPJS workflow integration. |
| **Current Status** | **Not Implemented** |
| **Evidence** | `apps/api/prisma/schema.prisma` — Insurance model has only generic fields: id, code, name, type, phone, email, isActive. No BPJS-specific fields (facilityCode, classLevels, inaCbgMapping, apiCredentials). See: `docs/17-Audit/_inventory/insurance-schema-support.md` §1, `docs/17-Audit/_inventory/billing-workflow-insurance-rules.md` §2.3. |
| **Root Cause** | BRD explicitly marks full BPJS integration as "Future Expansion" (§17). The Insurance entity was built as a generic reference master for basic tariff linkage, not as a BPJS configuration store. |
| **Recommendation** | Phase 1: Add BPJS-specific optional fields to Insurance model (or create a separate `InsuranceBpjsConfig` extension table): facilityCode, supportedClasses, apiEndpoint. Phase 2: Implement BPJS API connectivity module. This bridges the gap between basic Insurance master data and operational BPJS readiness. |
| **Priority** | **P2** — Degrades core workflow for labs serving BPJS patients (majority of Indonesian healthcare). Without BPJS-specific fields, lab cannot configure BPJS operational parameters needed for claims processing. |

---

### FG-SET-001: Notification Delivery Management UI

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-SET-001 |
| **Feature Name** | Notification Delivery Management UI |
| **Module** | Settings |
| **Expected Behavior** | FS FR-11 specifies "Result Notification & Distribution" with BullMQ, Email, WhatsApp, PDF generation. BRD §08 includes "Notification (WA/Email)" in scope. For the Settings module, administrators should be able to: view notification delivery status/logs, retry failed notifications, configure notification templates, and monitor queue health. |
| **Current Status** | **Not Implemented** |
| **Evidence** | `apps/api/src/laboratory/notification/` — Backend notification services exist (email, WhatsApp, PDF, BullMQ processor). Settings controller provides SMTP configuration only. No frontend page exists for viewing delivery logs or managing notification status. See: `docs/17-Audit/_inventory/documentation-implementation-gaps.md` GAP-DI-001. SMTP settings (send configuration) is the only notification-related UI. No delivery log viewer, retry mechanism UI, or template editor exists. |
| **Root Cause** | SMTP configuration was prioritized as the minimum viable notification setting. Delivery monitoring and template management were deferred to focus on core lab workflow delivery. |
| **Recommendation** | Create a "Notifications" management section in Settings with: (1) Delivery Log table showing per-order notification status, (2) Retry button for failed deliveries, (3) Queue health metrics (pending/processing/failed counts), (4) Email/WhatsApp template editor. Can be a new tab or a separate page. |
| **Priority** | **P2** — Degrades core workflow. When notifications fail, administrators have no visibility or recovery mechanism through the UI. Must check server logs directly. |

---

### FG-SET-002: System Settings Beyond SMTP

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-SET-002 |
| **Feature Name** | System Settings Beyond SMTP |
| **Module** | Settings |
| **Expected Behavior** | BRD §08 Scope lists "Settings" as a security/system module. Enterprise systems typically require configurable settings for: organization profile (lab name, address, logo for reports), regional preferences (timezone, locale, date format), security policies (session timeout, password policy, login attempt limits), and operational parameters (auto-approval rules, notification schedules, retention periods). The `SystemSetting` model exists in schema but only SMTP keys are managed via UI. |
| **Current Status** | **Not Implemented** |
| **Evidence** | `apps/api/prisma/schema.prisma` — `SystemSetting` model exists (key-value store). `apps/api/src/laboratory/notification/settings.controller.ts` — Only SMTP settings (7 keys: smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_sender_name, smtp_sender_email) are exposed via API. Frontend SMTP tab is the only system settings UI. No general settings management (organization, security, operational parameters) exists. The `SystemSetting` table could store any key-value pair but only SMTP keys are utilized. |
| **Root Cause** | SystemSetting infrastructure was built specifically for SMTP configuration needs. General system configuration was handled via `.env` environment variables (not admin-configurable). Expanding settings management was deprioritized. |
| **Recommendation** | Create a "System Settings" section with categorized configuration panels: (1) Organization — lab name, address, logo, license number. (2) Security — session timeout, password policy (min length, complexity). (3) Operations — default pagination limits, auto-approval thresholds, notification retry limits. Leverage existing SystemSetting key-value model. |
| **Priority** | **P3** — Improves usability; workaround exists (configure via .env file with developer access). Non-blocking for basic operations. |

---

### FG-SET-003: Reporting Module (Backend Service)

| Field | Detail |
|-------|--------|
| **Feature ID** | FG-SET-003 |
| **Feature Name** | Reporting Module (Backend Service) |
| **Module** | Settings (Operational Reports) |
| **Expected Behavior** | BRD §08 Scope includes "Report" and "Dashboard" modules. BRD §15 states MANAGER role has "C R U" access to "Laporan" (Reports). SRS §4 RBAC Matrix includes "Laporan" as a module. The Backend Architecture document lists `reports/` as an expected top-level module. Reports page exists in frontend at `/dashboard/reports/page.tsx` with 6 report types (daily, monthly, patient, test, revenue, TAT) but no backend aggregation service provides the data. |
| **Current Status** | **Not Implemented** |
| **Evidence** | No `reports/` module exists in `apps/api/src/`. Frontend Reports page at `/dashboard/reports/page.tsx` renders report selection UI but relies on basic dashboard lab-summary API for data (which returns only current-day metrics). No date-range aggregation, no export (PDF/CSV), no per-report-type backend endpoint. See: `docs/17-Audit/_inventory/documentation-implementation-gaps.md` GAP-DI-004. |
| **Root Cause** | Reporting backend was listed in architecture docs but deprioritized during implementation sprints. The dashboard API provides real-time metrics but does not serve as a reporting engine (no historical aggregation, no export). |
| **Recommendation** | Create `apps/api/src/laboratory/reports/` module with endpoints for: (1) Daily summary report (tests completed, revenue, TAT by day), (2) Monthly statistics, (3) Patient demographics report, (4) Test volume by category, (5) Revenue by payment method/insurance, (6) TAT analysis. Each endpoint should support date range filtering and CSV/PDF export. This is critical because the frontend Reports page exists but shows no meaningful data. |
| **Priority** | **P1** — Blocks production use. The Reports page is visible to MANAGER/OWNER users but displays incomplete data. This creates a broken user experience where a visible feature does not work. Management cannot generate operational reports needed for business decisions. |

---

## 5. Features Verified as Complete

The following BRD/SRS/FS features within scope (Administration, Master Data, Settings) were verified as **fully implemented**:

| Feature | Source | Status | Evidence |
|---------|--------|--------|----------|
| Lab Test Master Data CRUD (TestMaster, TestCategory, Panel) | FS FR-01.1–01.5, 01.8 | ✅ Complete | `master-data.controller.ts` — full CRUD for tests, categories, panels. Frontend: Settings → 3 tabs. |
| Tariff & Pricing CRUD | FS FR-02.1–02.6 | ✅ Complete | `tariff.controller.ts` — full CRUD. `TariffResolverService` — 5-level priority cascade. Frontend: Settings → Tarif tab. |
| Tariff-Insurance Differential Pricing | BRD FR-05, FS FR-02.4 | ✅ Complete | Tariff unique constraint `[testId, clinicId, insuranceId]`. Priority resolver works correctly. |
| User CRUD with Role Assignment | BRD §15, SRS §4 | ✅ Complete | `users.controller.ts` — Create, Read, Update, SoftDelete. Frontend: Settings → Users tab with role dropdown. |
| Soft-Delete Pattern on Master Data | SRS F-MD-02 | ✅ Complete | All master entities use `deletedAt` field. `softDelete()` methods in services. |
| Insurance Master CRUD | BRD §08 | ✅ Complete | `InsuranceController` in `reference-master.controller.ts`. Frontend: Settings → Asuransi tab. |
| Doctor, Clinic, Equipment, Reagent, SampleType, Unit CRUD | BRD §08 (implicit) | ✅ Complete | 7 reference master controllers. Frontend: Settings → respective tabs. |
| SMTP Configuration Management | Implicit (notification delivery) | ✅ Complete | `settings.controller.ts` — GET/PUT/POST test. Frontend: Settings → SMTP tab. |
| Wilayah (Region) Master Data | Implementation-driven | ✅ Complete | `region/` module with EMSIFA sync. Frontend: Settings → Wilayah tab with sync button. |
| Role Guards on All Master Data Write Endpoints | FS FR-01.8, FR-02.5 | ✅ Complete | All write operations require `@Roles(Role.ADMIN, Role.SUPER_ADMIN)`. Read operations require only authentication. |
| Unique Code Validation on Master Entities | FS FR-01.4, FR-02.2 | ✅ Complete | `@unique` constraints in Prisma schema. DTO validation with appropriate decorators. |

---

## 6. Gap Statistics

### 6.1 By Module

| Module | Total Gaps | P1 | P2 | P3 | P4 |
|--------|:----------:|:--:|:--:|:--:|:--:|
| Administration | 3 | 0 | 1 | 2 | 0 |
| Master Data | 7 | 1 | 3 | 3 | 0 |
| Settings | 3 | 1 | 1 | 1 | 0 |
| **TOTAL** | **13** | **2** | **5** | **6** | **0** |


### 6.2 By Current Status

| Status | Count | Gap IDs |
|--------|:-----:|---------|
| Not Implemented | 9 | FG-ADM-002, FG-MD-002, FG-MD-004, FG-MD-005, FG-MD-006, FG-MD-007, FG-SET-001, FG-SET-002, FG-SET-003 |
| Partial | 4 | FG-ADM-001, FG-ADM-003, FG-MD-001, FG-MD-003 |
| Complete | 0 | — (all gaps are by definition non-complete) |

### 6.3 By Priority

| Priority | Count | Description | Gap IDs |
|----------|:-----:|-------------|---------|
| **P1** (Must Have) | 2 | Blocks production / data integrity | FG-MD-001, FG-SET-003 |
| **P2** (Should Have) | 5 | Degrades core workflow | FG-ADM-001, FG-MD-002, FG-MD-003, FG-MD-007, FG-SET-001 |
| **P3** (Could Have) | 6 | Has workaround | FG-ADM-002, FG-ADM-003, FG-MD-004, FG-MD-005, FG-MD-006, FG-SET-002 |
| **P4** (Won't Have) | 0 | — |  |

### 6.4 Estimated Remediation Effort

| Gap ID | Effort | Story Points |
|--------|--------|:------------:|
| FG-ADM-001 | M | 5 |
| FG-ADM-002 | L | 8 |
| FG-ADM-003 | S | 2 |
| FG-MD-001 | S | 2 |
| FG-MD-002 | L | 8 |
| FG-MD-003 | M | 5 |
| FG-MD-004 | M | 5 |
| FG-MD-005 | L | 8 |
| FG-MD-006 | L | 13 |
| FG-MD-007 | M | 5 |
| FG-SET-001 | M | 5 |
| FG-SET-002 | M | 5 |
| FG-SET-003 | L | 13 |
| **TOTAL** | | **84** |

---

## 7. Root Cause Summary

| Root Cause Category | Count | Affected Gaps |
|--------------------|:-----:|---------------|
| Deferred to future phase (explicit in BRD) | 2 | FG-MD-007, FG-MD-002 |
| Simpler implementation chosen for rapid delivery | 4 | FG-ADM-001, FG-ADM-002, FG-MD-001, FG-MD-004 |
| Frontend UI not built for existing backend | 3 | FG-MD-003, FG-SET-001, FG-ADM-003 |
| Feature not explicitly required in BRD/SRS | 2 | FG-MD-005, FG-MD-006 |
| Backend service not implemented despite frontend page existing | 1 | FG-SET-003 |
| Configuration handled via .env instead of admin UI | 1 | FG-SET-002 |

---

## 8. Recommendations — Prioritized Action Plan

### 8.1 Immediate Actions (P1 — Must Have)

| # | Gap ID | Action | Effort |
|---|--------|--------|--------|
| 1 | FG-MD-001 | Create `InsuranceType` enum, add migration, update DTO validation and frontend dropdown | S (2 SP) |
| 2 | FG-SET-003 | Create `apps/api/src/laboratory/reports/` module with 6 report endpoints, date-range filtering, and CSV export | L (13 SP) |

**Total P1 Effort:** 15 story points

### 8.2 Short-Term Actions (P2 — Should Have)

| # | Gap ID | Action | Effort |
|---|--------|--------|--------|
| 3 | FG-MD-003 | Add Reference Value management UI within the Tes Laboratorium tab (expandable sub-panel per test) | M (5 SP) |
| 4 | FG-SET-001 | Create Notification management UI (delivery logs table, retry button, queue metrics) | M (5 SP) |
| 5 | FG-ADM-001 | Create read-only Access Matrix viewer page showing role→endpoint mappings | M (5 SP) |
| 6 | FG-MD-002 | Create PatientInsurance junction table, update Patient registration flow for multi-insurance | L (8 SP) |
| 7 | FG-MD-007 | Add BPJS-specific optional fields to Insurance model or extension table | M (5 SP) |

**Total P2 Effort:** 28 story points

### 8.3 Medium-Term Actions (P3 — Could Have)

| # | Gap ID | Action | Effort |
|---|--------|--------|--------|
| 8 | FG-ADM-003 | Add "View History" per-user action linking to filtered audit trail | S (2 SP) |
| 9 | FG-MD-004 | Add effectiveFrom/effectiveTo fields to Tariff, update resolver | M (5 SP) |
| 10 | FG-MD-005 | Add bulk import/export endpoints for master data entities | L (8 SP) |
| 11 | FG-SET-002 | Create general System Settings panels (Organization, Security, Operations) | M (5 SP) |
| 12 | FG-ADM-002 | Evaluate and implement role hierarchy/composition model | L (8 SP) |
| 13 | FG-MD-006 | Create ChangeRequest entity and approval workflow for master data changes | L (13 SP) |

**Total P3 Effort:** 41 story points

---

## 9. Cross-References

| Gap ID | Related Findings |
|--------|-----------------|
| FG-MD-001 | [AUDIT-eLIS-2026-001-INS-SCHEMA]#§1.2, [AUDIT-eLIS-2026-004]#GAP-DI-005 |
| FG-MD-002 | [AUDIT-eLIS-2026-001-INS-SCHEMA]#§2, [AUDIT-eLIS-2026-004]#GAP-DI-005 |
| FG-MD-007 | [AUDIT-eLIS-2026-001-INS-BILLING]#§2.3, [AUDIT-eLIS-2026-001-INS-SCHEMA]#§1 |
| FG-SET-001 | [AUDIT-eLIS-2026-004]#GAP-DI-001 |
| FG-SET-003 | [AUDIT-eLIS-2026-004]#GAP-DI-004 |
| FG-ADM-001 | [AUDIT-eLIS-2026-004]#GAP-DI-006 |
| FG-MD-003 | [AUDIT-eLIS-2026-003]#§5.1 (FR-01 partial coverage) |

---

## 10. No-Code-Modification Attestation

This analysis was performed in **read-only mode**. The following directories were accessed:

| Directory | Access Mode | Operations |
|-----------|-------------|------------|
| `apps/api/src/` | READ-ONLY | Directory listing, file content reading |
| `apps/web/src/` | READ-ONLY | Directory listing, file content reading |
| `apps/api/prisma/` | READ-ONLY | Schema reading |
| `docs/` | READ + WRITE | Read existing docs, wrote this report |
| `Functiona spec/` | READ-ONLY | Read functional specification |

**No source code files were created, modified, or deleted.**

---

*End of Functional Gap Report — Generated for Task 6.1*
