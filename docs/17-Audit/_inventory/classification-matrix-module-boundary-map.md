# Classification Matrix & Module Boundary Map

**Document ID:** AUDIT-eLIS-2025-CLS-002  
**Version:** 1.0  
**Date:** 2025-07-08  
**Author:** Enterprise Architect (Automated Audit)  
**Classification:** Internal  
**Status:** Draft  

---

## 1. Classification Matrix

The following matrix maps each sub-feature from the "Pengaturan" (Settings) page to its data governance classification, current implementation location, operational attributes, and proposed target location with migration impact assessment.

### 1.1 Full Classification Matrix

| # | Feature Name | Current Location | Data Classification | Change Frequency | Owner Role | Proposed Location | Migration Impact |
|---|-------------|-----------------|--------------------|-----------------:|------------|-------------------|:----------------:|
| 1 | Test Categories | `laboratory/master-data/master-data.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 2 | Lab Tests | `laboratory/master-data/master-data.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 3 | Panels | `laboratory/master-data/master-data.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 4 | Tariffs | `laboratory/master-data/tariff.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 5 | Doctors | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 6 | Clinics | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 7 | Insurance | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 8 | Equipment | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 9 | Reagents | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 10 | Sample Types | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 11 | Measurement Units | `laboratory/master-data/reference-master.controller.ts` | Master Data | Rarely | ADMIN, SUPER_ADMIN | `master-data/` bounded context (retain) | **Low** |
| 12 | Regions (Wilayah) | `laboratory/region/region.controller.ts` | Master Data | Rarely | ADMIN | `master-data/` bounded context (relocate) | **Medium** |
| 13 | Users | `users/users.controller.ts` | User Administration | Weekly | ADMIN, SUPER_ADMIN | `user-admin/` bounded context (retain) | **Low** |
| 14 | SMTP Settings | `laboratory/notification/settings.controller.ts` | System Settings | Rarely | ADMIN, SUPER_ADMIN | `system-settings/` bounded context (extract) | **Medium** |

### 1.2 Migration Impact Scoring Criteria

| Score | Definition | Conditions |
|-------|-----------|------------|
| **Low** | No schema change, UI-only relocation | Module already isolated in correct bounded context; only frontend navigation changes needed |
| **Medium** | Requires new API endpoints or module restructuring | Module needs to be extracted from current parent module, new module file created, imports updated |
| **High** | Requires data migration or breaking interface changes | Database schema changes, existing API contract modifications, or data migration scripts required |

### 1.3 Impact Analysis Summary

| Migration Impact | Count | Sub-Features |
|-----------------|:-----:|--------------|
| Low | 12 | Test Categories, Lab Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Users |
| Medium | 2 | Regions (needs relocation from `region/` to `master-data/`), SMTP Settings (needs extraction from `notification/`) |
| High | 0 | — |

---

## 2. Backend Module Isolation Evaluation

### 2.1 Evaluation Criteria

The current backend module structure at `apps/api/src/laboratory/master-data/` is evaluated against three isolation criteria:

1. **Single-Responsibility**: Each module serves exactly one bounded context
2. **Dependency Direction**: Master data modules have no import dependencies on workflow or settings modules
3. **Interface Segregation**: Shared entities are accessed through dedicated service interfaces, not direct cross-module imports

### 2.2 Module Structure Under Review

```
apps/api/src/
├── laboratory/
│   ├── laboratory.module.ts          ← Aggregator module
│   ├── master-data/                  ← Master Data bounded context
│   │   ├── master-data.module.ts
│   │   ├── master-data.controller.ts (Test Categories, Lab Tests, Panels)
│   │   ├── master-data.service.ts    (CRUD for categories, tests, panels, tariffs)
│   │   ├── reference-master.controller.ts (Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units)
│   │   ├── reference-master.service.ts (Generic CRUD for reference entities)
│   │   ├── tariff.controller.ts      (Tariff CRUD)
│   │   ├── dto/
│   │   └── tests/
│   ├── region/                       ← Should be Master Data, currently separate
│   │   ├── region.module.ts
│   │   ├── region.controller.ts
│   │   ├── region.service.ts
│   │   ├── region-sync.service.ts
│   │   ├── region-validation.service.ts
│   │   ├── dto/
│   │   └── interfaces/
│   ├── notification/                 ← Contains settings.controller.ts (cross-context)
│   │   ├── notification.module.ts
│   │   ├── settings.controller.ts    ← System Settings (SMTP) lives here
│   │   ├── email.service.ts
│   │   ├── notification.service.ts
│   │   ├── whatsapp.service.ts
│   │   └── ...
│   ├── audit/
│   ├── dashboard/
│   ├── lab-workflow/
│   ├── order/
│   ├── patient/
│   └── payment/
├── users/                            ← User Administration bounded context
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── auth/                             ← Authentication (depends on users)
├── common/                           ← Shared infrastructure
├── config/
└── health/
```

### 2.3 Isolation Criteria Results

#### 2.3.1 Single-Responsibility Principle

| Module | Bounded Context Served | Assessment | Violations |
|--------|----------------------|------------|------------|
| `master-data/` | Master Data | ✅ **PASS** | Serves one bounded context (reference data management). Contains 3 controllers split by concern: core data, reference entities, tariffs. |
| `region/` | Master Data (misplaced) | ⚠️ **PARTIAL** | Functionally serves Master Data domain (geographic reference data), but is architecturally separate from `master-data/` module. This creates an inconsistency where same-domain services live in different modules. |
| `notification/` | Notification **+ System Settings** | ❌ **FAIL** | Serves two bounded contexts: (1) Notification delivery (email, WhatsApp, PDF) and (2) System Settings configuration (SMTP). The `settings.controller.ts` handles a different domain concern than the rest of the module. |
| `users/` | User Administration | ✅ **PASS** | Serves exactly one bounded context (user account management). Clean separation. |

#### 2.3.2 Dependency Direction

| Module | Imports FROM | Imports INTO | Assessment |
|--------|-------------|-------------|------------|
| `master-data/` | `common/prisma`, `common/guards`, `common/decorators` | Exported to `laboratory.module.ts` (consumed by `order/` via Prisma shared tables) | ✅ **PASS** — No imports from workflow or settings modules |
| `region/` | `common/prisma`, `common/guards`, `common/decorators` | Exported to `laboratory.module.ts` | ✅ **PASS** — No imports from workflow or settings modules |
| `notification/` | `common/prisma`, `common/guards`, `common/decorators`, **`lab-workflow/`** (LabWorkflowModule) | Exported to `laboratory.module.ts` | ⚠️ **PARTIAL** — Notification imports from `lab-workflow/` which is appropriate for notification trigger context, BUT the `settings.controller.ts` within it has no dependency on lab-workflow, indicating it's a misplaced component |
| `users/` | `common/prisma`, `common/guards`, `common/decorators` | Consumed by `auth/` (AuthModule imports UsersModule) | ✅ **PASS** — Clean dependency direction |

#### 2.3.3 Interface Segregation

| Cross-Module Access Pattern | Mechanism | Assessment |
|---------------------------|-----------|------------|
| `order/` → `master-data` entities (TestMaster, Tariff) | Shared PrismaService (database-level access) | ⚠️ **VIOLATION** — Order module accesses master data entities directly through PrismaService instead of consuming a dedicated MasterData service interface |
| `lab-workflow/` → `master-data` entities (TestMaster, ReferenceValues) | Shared PrismaService (database-level access) | ⚠️ **VIOLATION** — Lab workflow reads master data entities directly from Prisma without going through a dedicated interface |
| `payment/` → `master-data` entities (Tariff, Insurance) | Shared PrismaService (database-level access) | ⚠️ **VIOLATION** — Payment accesses tariff/insurance data directly |
| `auth/` → `users/` | Module import (AuthModule imports UsersModule, uses UsersService) | ✅ **PASS** — Proper service interface contract |
| `notification/` → `lab-workflow/` | Module import (NotificationModule imports LabWorkflowModule) | ✅ **PASS** — Proper module dependency declaration |

### 2.4 Isolation Score Summary

| Criterion | Score | Details |
|-----------|:-----:|---------|
| Single-Responsibility | 2/4 (50%) | `notification/` violates SRP; `region/` is misplaced from its logical context |
| Dependency Direction | 3.5/4 (87%) | Minor issue with `notification/` importing `lab-workflow/` for `settings.controller.ts` which doesn't need it |
| Interface Segregation | 2/5 (40%) | 3 out of 5 cross-module access patterns use Prisma directly instead of service interfaces |

**Overall Module Isolation Assessment:** ⚠️ Partial Compliance (59%)

---

## 3. Module Boundary Map

### 3.1 Bounded Context Assignments

Each backend service is assigned to exactly one bounded context:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BOUNDED CONTEXT: Master Data                       │
│  Context Owner: ADMIN, SUPER_ADMIN                                   │
│  Change Frequency: Rarely (< 1×/month)                               │
│  API Prefix: /api/v1/master/*, /api/v1/regions/*                     │
│                                                                       │
│  Services:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ MasterDataService                                           │     │
│  │ - TestCategory CRUD (create, find, update, soft-delete)     │     │
│  │ - TestMaster CRUD (code uniqueness, reference validation)   │     │
│  │ - Panel CRUD (panel-test composition)                       │     │
│  │ - Tariff CRUD (test-clinic-insurance pricing)               │     │
│  └─────────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ ReferenceMasterService                                      │     │
│  │ - Generic CRUD for: Doctor, Clinic, Insurance, Equipment,   │     │
│  │   Reagent, SampleTypeMaster, MeasurementUnit                │     │
│  └─────────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ RegionService (currently in separate module)                 │     │
│  │ - Provinsi, KabupatenKota, Kecamatan, KelurahanDesa lookup  │     │
│  │ RegionSyncService (external API sync)                       │     │
│  │ RegionValidationService (address validation)                │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                 BOUNDED CONTEXT: System Settings                      │
│  Context Owner: ADMIN, SUPER_ADMIN                                   │
│  Change Frequency: Rarely (infrastructure changes only)              │
│  API Prefix: /api/v1/settings/*                                      │
│                                                                       │
│  Services:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ SettingsController (currently in notification module)        │     │
│  │ - SMTP configuration get/update                             │     │
│  │ - SMTP connection test                                      │     │
│  │ - SystemSetting key-value store operations                  │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               BOUNDED CONTEXT: User Administration                   │
│  Context Owner: ADMIN, SUPER_ADMIN (delete: SUPER_ADMIN only)        │
│  Change Frequency: Weekly (staff onboarding/offboarding)             │
│  API Prefix: /api/v1/users                                           │
│                                                                       │
│  Services:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ UsersService                                                │     │
│  │ - User CRUD (create, findAll, findById, update, softDelete) │     │
│  │ - findByEmail (consumed by auth context)                    │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Cross-Context Violations Identified

| # | Violation | Source Context | Target Context | Mechanism | Severity |
|---|----------|---------------|----------------|-----------|----------|
| V1 | `SettingsController` placed inside `notification/` module | System Settings | Notification (Operational) | Physical co-location in wrong module | **High** — SRP violation, couples settings lifecycle to notification module |
| V2 | `RegionModule` separate from `master-data/` | Master Data | N/A (orphaned in `laboratory/`) | Separate module for same domain concern | **Medium** — Logical inconsistency, same-domain services scattered |
| V3 | `OrderService` reads `TestMaster`, `Tariff` via direct Prisma access | Order (Clinical Operations) | Master Data | `this.prisma.testMaster.findMany()` | **Medium** — No interface contract, tight coupling to schema |
| V4 | `LabWorkflowService` reads `TestMaster`, `ReferenceValue` via direct Prisma | Lab Workflow (Clinical Operations) | Master Data | `this.prisma.testMaster`, `this.prisma.referenceValue` | **Medium** — No interface contract |
| V5 | `PaymentModule` reads `Tariff`, `Insurance` via direct Prisma | Payment (Financial) | Master Data | Direct Prisma queries | **Medium** — No interface contract |
| V6 | `AuthService` imports `UsersService` directly | Authentication | User Administration | Module import + service injection | **Low** — Acceptable pattern, proper interface used |
| V7 | `NotificationModule` imports `LabWorkflowModule` | Notification | Lab Workflow | Module import | **Low** — Acceptable for event subscription pattern |

### 3.3 Proposed Interface Contracts for Decoupling

For each identified cross-context violation (Medium or higher), a service interface contract is proposed:

#### Contract 1: MasterDataQueryInterface (resolves V3, V4, V5)

**Purpose:** Provide read-only access to master data entities for consuming contexts (Order, LabWorkflow, Payment)

```typescript
// Proposed: apps/api/src/laboratory/master-data/interfaces/master-data-query.interface.ts

export interface IMasterDataQueryService {
  // Test lookup (consumed by: Order, LabWorkflow)
  findTestById(testId: string): Promise<TestMasterView>;
  findTestsByIds(testIds: string[]): Promise<TestMasterView[]>;
  findActiveTests(filters?: TestQueryFilter): Promise<TestMasterView[]>;
  
  // Tariff resolution (consumed by: Order, Payment)
  resolveTariff(testId: string, clinicId?: string, insuranceId?: string): Promise<TariffView | null>;
  
  // Reference values (consumed by: LabWorkflow)
  findReferenceValues(testId: string): Promise<ReferenceValueView[]>;
  
  // Insurance lookup (consumed by: Payment, Order)
  findInsuranceById(insuranceId: string): Promise<InsuranceView>;
  findActiveInsurances(): Promise<InsuranceView[]>;
}

// Consumed data entities (read-only views):
interface TestMasterView {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: string;
  sampleType: string;
  price: number;
  requiresDoctorApproval: boolean;
  isActive: boolean;
}

interface TariffView {
  id: string;
  testId: string;
  clinicId: string | null;
  insuranceId: string | null;
  price: number;
  discount: number;
}

interface ReferenceValueView {
  id: string;
  testId: string;
  gender: string;
  ageMin: number | null;
  ageMax: number | null;
  normalMin: number | null;
  normalMax: number | null;
  unit: string;
}

interface InsuranceView {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}
```

**Access Pattern:** Read-only, synchronous queries. No writes permitted from consuming contexts.

#### Contract 2: SystemSettingsInterface (resolves V1)

**Purpose:** Provide a dedicated service interface for system settings, decoupled from notification module

```typescript
// Proposed: apps/api/src/settings/interfaces/system-settings.interface.ts

export interface ISystemSettingsService {
  // SMTP settings (consumed by: Notification module for email delivery config)
  getSmtpSettings(): Promise<SmtpSettingsView>;
  updateSmtpSettings(dto: UpdateSmtpSettingsDto): Promise<void>;
  testSmtpConnection(recipientEmail: string): Promise<TestResult>;
  
  // Generic key-value settings (extensible for future config)
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getSettingsByPrefix(prefix: string): Promise<Record<string, string>>;
}

interface SmtpSettingsView {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  senderName: string;
  senderEmail: string;
  hasPassword: boolean; // masked, never expose actual password
}
```

**Access Pattern:** Read/Write by ADMIN/SUPER_ADMIN only. Read-only by Notification module for delivery configuration.

#### Contract 3: UserLookupInterface (V6 — already properly implemented)

**Purpose:** Existing interface between Auth and Users. Documented for completeness.

```typescript
// Current: apps/api/src/users/users.service.ts (already exported)

export interface IUserLookupService {
  findByEmail(email: string): Promise<UserView | null>;
  findById(id: string): Promise<UserView | null>;
}
```

**Access Pattern:** Read-only lookup consumed by AuthService for authentication. Already uses proper module import pattern (✅ compliant).

#### Contract 4: RegionLookupInterface (resolves V2)

**Purpose:** If Region is relocated to master-data bounded context, expose lookup interface for consuming modules (Patient registration, Clinic location)

```typescript
// Proposed: apps/api/src/laboratory/master-data/interfaces/region-lookup.interface.ts

export interface IRegionLookupService {
  findAllProvinsi(page: number, limit: number, search?: string): Promise<PaginatedResult<ProvinsiView>>;
  findKabupatenByProvinsi(provinsiId: string, page: number, limit: number, search?: string): Promise<PaginatedResult<KabupatenView>>;
  findKecamatanByKabupaten(kabupatenId: string, page: number, limit: number, search?: string): Promise<PaginatedResult<KecamatanView>>;
  findKelurahanByKecamatan(kecamatanId: string, page: number, limit: number, search?: string): Promise<PaginatedResult<KelurahanView>>;
  validateAddress(provinsiId: string, kabupatenId: string, kecamatanId: string, kelurahanId: string): Promise<boolean>;
}
```

**Access Pattern:** Read-only geographic lookups. Sync operations (POST /regions/sync) remain admin-only within the master-data context.

---

## 4. Proposed Target Module Structure

Based on the boundary map analysis, the recommended target module structure for the three bounded contexts:

```
apps/api/src/
├── master-data/                          ← Promoted to top-level module
│   ├── master-data.module.ts
│   ├── controllers/
│   │   ├── test-category.controller.ts
│   │   ├── test.controller.ts
│   │   ├── panel.controller.ts
│   │   ├── tariff.controller.ts
│   │   ├── reference-master.controller.ts
│   │   └── region.controller.ts         ← Relocated from laboratory/region/
│   ├── services/
│   │   ├── master-data.service.ts
│   │   ├── reference-master.service.ts
│   │   ├── region.service.ts            ← Relocated
│   │   ├── region-sync.service.ts       ← Relocated
│   │   └── region-validation.service.ts ← Relocated
│   ├── interfaces/
│   │   ├── master-data-query.interface.ts
│   │   └── region-lookup.interface.ts
│   ├── dto/
│   └── tests/
│
├── settings/                             ← New top-level module
│   ├── settings.module.ts
│   ├── settings.controller.ts            ← Extracted from notification/
│   ├── settings.service.ts               ← New: encapsulates SystemSetting operations
│   ├── interfaces/
│   │   └── system-settings.interface.ts
│   └── dto/
│
├── users/                                ← Retain as-is (already compliant)
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│
├── laboratory/                           ← Reduced scope: operational workflows only
│   ├── laboratory.module.ts
│   ├── order/
│   ├── patient/
│   ├── payment/
│   ├── lab-workflow/
│   ├── notification/                     ← settings.controller.ts removed
│   ├── audit/
│   └── dashboard/
│
├── auth/                                 ← Unchanged
├── common/                               ← Unchanged
├── config/                               ← Unchanged
└── health/                               ← Unchanged
```

### 4.1 Migration Steps (Proposed Changes Only)

| Step | Action | Files Affected | Breaking Changes |
|------|--------|---------------|:----------------:|
| 1 | Extract `settings.controller.ts` from `notification/` into new `settings/` module | 3 files (new module, move controller, update notification.module) | No — API route `/api/v1/settings/*` unchanged |
| 2 | Create `settings.service.ts` to encapsulate SystemSetting Prisma operations | 2 files (new service, update controller to use service) | No — Internal refactor only |
| 3 | Relocate `region/` contents into `master-data/` or keep as sibling under same bounded context declaration | 4-6 files (move + update imports) | No — API route `/api/v1/regions/*` unchanged |
| 4 | Create `IMasterDataQueryService` interface and implement in `master-data.service.ts` | 2-3 files (interface + implementation + export) | No — Additive interface |
| 5 | Update `order/`, `lab-workflow/`, `payment/` to import `MasterDataModule` and inject `IMasterDataQueryService` instead of using Prisma directly for master data reads | 3-6 files per consuming module | No — Internal implementation change, API contracts unchanged |

---

## 5. Summary of Findings

### 5.1 Key Metrics

| Metric | Value |
|--------|-------|
| Total sub-features classified | 14 |
| Master Data items | 12 (86%) |
| System Settings items | 1 (7%) |
| User Administration items | 1 (7%) |
| Cross-context violations identified | 7 |
| High severity violations | 1 (SettingsController misplacement) |
| Medium severity violations | 4 (Region separation, direct Prisma cross-access ×3) |
| Low severity violations | 2 (acceptable patterns) |
| Module isolation compliance | 59% |
| Migration impact: Low | 12 features |
| Migration impact: Medium | 2 features |
| Migration impact: High | 0 features |

### 5.2 Priority Recommendations

1. **P1 (Must Have):** Extract `SettingsController` from `notification/` module into dedicated `settings/` bounded context — resolves SRP violation, eliminates coupling of settings lifecycle to notification delivery
2. **P2 (Should Have):** Create `IMasterDataQueryService` interface to decouple Order/LabWorkflow/Payment from direct Prisma access to master data tables — improves testability and enables future master-data caching
3. **P3 (Could Have):** Relocate `region/` module into `master-data/` bounded context — improves logical consistency but current separation is not causing runtime issues
4. **P3 (Could Have):** Promote `master-data/` to top-level module (out of `laboratory/` nesting) — signals architectural intent but doesn't change runtime behavior

### 5.3 Downstream Task Dependencies

This document provides input for:
- **Task 11.1** — Target State Architecture (uses proposed module structure from §4)
- **Task 11.2** — ADR for Settings vs Master Data separation (uses violation analysis from §3.2)
- **Task 11.3** — Migration Path (uses migration steps from §4.1)

---

*End of Document*
