# Backend Architecture Pattern Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-ARCH-BE |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This intermediate analysis document classifies the backend architecture pattern for `apps/api/src/` and records module completeness violations. It serves as input for task 3.6 (Architecture Compliance Score calculation) and the final architecture gap analysis report.

**Validates: Requirements 2.1, 2.2**

---

## 1. Architecture Pattern Classification

### 1.1 Top-Level Directory Analysis

| Directory | Type | Purpose |
|-----------|------|---------|
| `auth/` | Feature Module | Authentication & authorization domain |
| `common/` | Shared/Infrastructure | Cross-cutting concerns (guards, filters, interceptors, pipes, decorators, prisma) |
| `config/` | Infrastructure | Environment validation and CORS configuration |
| `health/` | Feature Module | Health check endpoint (operational) |
| `laboratory/` | Feature Module | Core laboratory business domain (contains 9 sub-modules) |
| `users/` | Feature Module | User management domain |

**Root files:** `app.module.ts`, `main.ts`

### 1.2 Classification Result

| Criterion | Assessment |
|-----------|-----------|
| **Top-level directories represent business domains** | ✅ Yes — `auth`, `users`, `laboratory`, `health` are business domains |
| **Each domain contains its own controller, service, module** | ✅ Yes — each feature module has these artifacts (with minor gaps noted below) |
| **Top-level directories represent technical layers (controllers/, services/, repositories/)** | ❌ No — no such layer-based directories exist |
| **Mix of feature and layer directories** | Partial — `common/` and `config/` are infrastructure concerns alongside feature directories |

### 1.3 Final Classification

| Field | Value |
|-------|-------|
| **Architecture Pattern** | **Feature-Based** |
| **Confidence** | High |
| **Rationale** | The primary organizational strategy is domain-oriented. Each top-level directory (`auth/`, `users/`, `laboratory/`, `health/`) represents a business domain containing its own controller, service, and module file. The `common/` directory serves as a cross-cutting shared layer (which is standard and expected in Feature-Based architectures — it does not make the pattern "Layer-Based"). The `config/` directory contains application-wide configuration utilities, which is also standard infrastructure. The `laboratory/` module further demonstrates Feature-Based design by decomposing into domain sub-modules (`audit`, `dashboard`, `lab-workflow`, `master-data`, `notification`, `order`, `patient`, `payment`, `region`), each self-contained with their own controller/service/module/DTOs/tests. |

**Note**: The presence of `common/` and `config/` directories does NOT constitute a Hybrid classification. In Feature-Based architectures, a dedicated shared/common directory for cross-cutting infrastructure (guards, pipes, filters, interceptors, database client) is the expected pattern per NestJS best practices. The defining characteristic is that **business logic is organized by domain**, which is clearly the case here.

---

## 2. Module Completeness Assessment

### 2.1 Required Artifacts per Feature Module

Per Requirements 2.2, each feature module must contain:
1. **Controller** (`.controller.ts`) — HTTP endpoint handler
2. **Service** (`.service.ts`) — Business logic
3. **Module** (`.module.ts`) — NestJS module registration
4. **DTOs directory** (`dto/`) — Data Transfer Objects for request validation
5. **Test files** (`.spec.ts` files or `tests/` directory)

### 2.2 Top-Level Module Assessment

#### auth/

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `auth.controller.ts` |
| Service | ✅ | `auth.service.ts` |
| Module | ✅ | `auth.module.ts` |
| DTOs directory | ❌ **MISSING** | — |
| Test files | ✅ | `auth.controller.spec.ts`, `auth.service.spec.ts`, `auth.service.property.spec.ts` |

#### users/

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `users.controller.ts` |
| Service | ✅ | `users.service.ts` |
| Module | ✅ | `users.module.ts` |
| DTOs directory | ✅ | `dto/create-user.dto.ts`, `dto/update-user.dto.ts` |
| Test files | ✅ | `users.service.spec.ts` |

#### health/

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `health.controller.ts` |
| Service | ❌ **MISSING** | — |
| Module | ✅ | `health.module.ts` |
| DTOs directory | ❌ **MISSING** | — |
| Test files | ❌ **MISSING** | — |

#### laboratory/ (parent module)

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | N/A | Parent module delegates to sub-modules |
| Service | N/A | Parent module delegates to sub-modules |
| Module | ✅ | `laboratory.module.ts` |
| DTOs directory | N/A | Handled by sub-modules |
| Test files | N/A | Handled by sub-modules |

### 2.3 Laboratory Sub-Module Assessment

#### laboratory/audit

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `audit.controller.ts` |
| Service | ✅ | `audit.service.ts` |
| Module | ✅ | `audit.module.ts` |
| DTOs directory | ❌ **MISSING** | — |
| Test files | ✅ | `tests/audit.property.spec.ts` |

#### laboratory/dashboard

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `dashboard.controller.ts` |
| Service | ✅ | `dashboard.service.ts` |
| Module | ✅ | `dashboard.module.ts` |
| DTOs directory | ✅ | `dto/region-distribution-query.dto.ts` |
| Test files | ✅ | `tests/dashboard-region.spec.ts`, `tests/dashboard.property.spec.ts`, `dashboard-region.property.spec.ts` |

#### laboratory/lab-workflow

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `lab-workflow.controller.ts` |
| Service | ✅ | `lab-workflow.service.ts`, `auto-flagging.service.ts`, `order-state-machine.service.ts` |
| Module | ✅ | `lab-workflow.module.ts` |
| DTOs directory | ✅ | `dto/approve-order.dto.ts`, `dto/confirm-sample.dto.ts`, `dto/enter-results.dto.ts`, `dto/verify-results.dto.ts` |
| Test files | ✅ | `tests/approval.property.spec.ts`, `tests/auto-flagging.property.spec.ts`, `tests/delta-check.property.spec.ts`, `tests/results.property.spec.ts`, `tests/sample.property.spec.ts`, `tests/state-machine.property.spec.ts` |

#### laboratory/master-data

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `master-data.controller.ts`, `reference-master.controller.ts`, `tariff.controller.ts` |
| Service | ✅ | `master-data.service.ts`, `reference-master.service.ts` |
| Module | ✅ | `master-data.module.ts` |
| DTOs directory | ✅ | `dto/` (9 DTO files) |
| Test files | ✅ | `tests/tariff.property.spec.ts` |

#### laboratory/notification

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `settings.controller.ts` |
| Service | ✅ | `notification.service.ts`, `email.service.ts`, `whatsapp.service.ts`, `pdf-generator.service.ts` |
| Module | ✅ | `notification.module.ts` |
| DTOs directory | ❌ **MISSING** | — |
| Test files | ✅ | `tests/notification.property.spec.ts` |

#### laboratory/order

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `order.controller.ts` |
| Service | ✅ | `order.service.ts`, `tariff-resolver.service.ts` |
| Module | ✅ | `order.module.ts` |
| DTOs directory | ✅ | `dto/create-order.dto.ts`, `dto/cancel-order.dto.ts`, `dto/order-query.dto.ts` |
| Test files | ✅ | `tests/order.property.spec.ts`, `tests/tariff-resolver.property.spec.ts` |

#### laboratory/patient

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `patient.controller.ts` |
| Service | ✅ | `patient.service.ts`, `mrn-generator.service.ts` |
| Module | ✅ | `patient.module.ts` |
| DTOs directory | ✅ | `dto/create-patient.dto.ts`, `dto/update-patient.dto.ts` |
| Test files | ✅ | `tests/patient.property.spec.ts`, `patient-region.property.spec.ts` |

#### laboratory/payment

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `payment.controller.ts` |
| Service | ✅ | `payment.service.ts`, `barcode.service.ts` |
| Module | ✅ | `payment.module.ts` |
| DTOs directory | ✅ | `dto/process-payment.dto.ts` |
| Test files | ❌ **MISSING** | — |

#### laboratory/region

| Artifact | Present | File(s) |
|----------|---------|---------|
| Controller | ✅ | `region.controller.ts` |
| Service | ✅ | `region.service.ts`, `region-sync.service.ts`, `region-validation.service.ts` |
| Module | ✅ | `region.module.ts` |
| DTOs directory | ✅ | `dto/region-query.dto.ts` |
| Test files | ✅ | `region-validation.service.spec.ts`, `region-validation.service.property.spec.ts`, `region.service.property.spec.ts` |

---

## 3. Module Completeness Violations

The following table records each missing artifact as a "Module Completeness Violation" per Requirement 2.2:

| # | Module Name | Missing Artifact Type | Expected File Path | Severity |
|---|-------------|----------------------|-------------------|----------|
| 1 | `auth` | DTOs directory | `apps/api/src/auth/dto/` | Medium |
| 2 | `health` | Service | `apps/api/src/health/health.service.ts` | Low |
| 3 | `health` | DTOs directory | `apps/api/src/health/dto/` | Low |
| 4 | `health` | Test files | `apps/api/src/health/health.controller.spec.ts` or `apps/api/src/health/tests/` | Medium |
| 5 | `laboratory/audit` | DTOs directory | `apps/api/src/laboratory/audit/dto/` | Medium |
| 6 | `laboratory/notification` | DTOs directory | `apps/api/src/laboratory/notification/dto/` | Medium |
| 7 | `laboratory/payment` | Test files | `apps/api/src/laboratory/payment/tests/` or `apps/api/src/laboratory/payment/payment.service.spec.ts` | Medium |

**Total violations: 7**

### 3.1 Severity Classification Rationale

| Severity | Rule | Applied To |
|----------|------|-----------|
| **Medium** | Missing DTOs — input validation is a security and correctness concern; endpoints without DTO validation may accept malformed data | auth, laboratory/audit, laboratory/notification |
| **Medium** | Missing test files — testability gap reduces confidence in correctness for modules handling financial or audit data | health (tests), laboratory/payment (tests) |
| **Low** | Health module is a simple operational endpoint that typically returns status without complex business logic — a dedicated service and DTOs may be unnecessary by design | health (service), health (DTOs) |

### 3.2 Contextual Notes

- **`health` module**: Health check endpoints are often intentionally minimal (controller-only pattern is common in NestJS for health checks using `@nestjs/terminus`). The missing service/DTOs/tests may be a deliberate design choice rather than an oversight.
- **`auth` module**: Login/register DTOs likely exist inline or are validated by other means (e.g., Passport strategies). However, a dedicated `dto/` directory with `login.dto.ts` and `register.dto.ts` would improve consistency.
- **`laboratory/notification`**: The `settings.controller.ts` likely accepts configuration payloads that should have DTO validation.
- **`laboratory/payment`**: Financial operations are high-risk and should have comprehensive test coverage.

---

## 4. Summary Statistics

### 4.1 Architecture Classification

| Metric | Value |
|--------|-------|
| Classification | **Feature-Based** |
| Total top-level feature modules | 4 (`auth`, `users`, `health`, `laboratory`) |
| Total laboratory sub-modules | 9 (`audit`, `dashboard`, `lab-workflow`, `master-data`, `notification`, `order`, `patient`, `payment`, `region`) |
| Total modules assessed | 13 (4 top-level + 9 sub-modules) |
| Modules fully compliant | 6 (`users`, `laboratory/dashboard`, `laboratory/lab-workflow`, `laboratory/master-data`, `laboratory/order`, `laboratory/patient`, `laboratory/region`) |
| Modules with violations | 5 (`auth`, `health`, `laboratory/audit`, `laboratory/notification`, `laboratory/payment`) |
| Module completeness rate | **61.5%** (8 of 13 modules are fully compliant or N/A for parent) |

### 4.2 Violation Breakdown

| Missing Artifact Type | Count | Affected Modules |
|----------------------|-------|------------------|
| DTOs directory | 4 | auth, health, laboratory/audit, laboratory/notification |
| Test files | 2 | health, laboratory/payment |
| Service | 1 | health |
| **Total** | **7** | |

### 4.3 Compliance Input for Task 3.6

This analysis provides the following input values for the Architecture Compliance Score calculation:

- **Folder structure compliance (25 pts)**: 4 of 4 top-level modules follow Feature-Based pattern → 100% → 25 points
- **Module isolation (25 pts)**: To be determined by task 3.6 based on cross-module imports and boundary violations
- **Shared component placement (20 pts)**: To be determined by task 3.2
- **Routing correctness (15 pts)**: To be determined by task 3.4
- **State management (15 pts)**: To be determined by task 3.5

---

## 5. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/src/` | READ-ONLY | Listed directory structures, confirmed file presence |
| `docs/17-Audit/_inventory/` | READ + WRITE | Read existing inventory, wrote this analysis |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Backend Architecture Pattern Analysis — Generated for Enterprise Admin Architecture Audit Task 3.1*
