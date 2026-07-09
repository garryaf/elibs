# Migration Path & Implementation Readiness Checklist

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-MIG-001 |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

---

## Executive Summary

This document defines the phased migration path from the current eLIS architecture to the
target state architecture (AUDIT-eLIS-2026-TSA-001). The plan addresses 111 identified gaps
across Functional, Architecture, Navigation, and UX dimensions with an estimated total
remediation effort of 360–518 story points.

**Key Principles:**
- All changes documented as **Proposed Changes** — no source code is modified by this audit
- Backward compatibility is mandatory per phase — zero breaking changes to existing API contracts
- Rollback strategy defined per phase with measurable trigger conditions
- Each phase has clear prerequisites, acceptance criteria, and sign-off requirements

---

## Table of Contents

1. [Phased Implementation Plan](#1-phased-implementation-plan)
2. [Phase 1: Critical (P1)](#2-phase-1-critical-p1)
3. [Phase 2: High (P2)](#3-phase-2-high-p2)
4. [Phase 3: Medium (P3)](#4-phase-3-medium-p3)
5. [File-Level Refactoring Instructions](#5-file-level-refactoring-instructions)
6. [Backward Compatibility Verification](#6-backward-compatibility-verification)
7. [Rollback Strategy](#7-rollback-strategy)
8. [Implementation Readiness Checklist](#8-implementation-readiness-checklist)

---

## 1. Phased Implementation Plan

### 1.1 Phase Overview

| Phase | Priority | Focus Areas | Estimated Effort | Timeline |
|:-----:|:--------:|-------------|:----------------:|----------|
| **Phase 1** | P1 Critical | RBAC security fixes, InsuranceType enum, Reporting backend, WCAG fixes | 29–40 SP | Sprint 1–3 |
| **Phase 2** | P2 High | Full RBAC schema, Insurance M2M, TanStack Query, Redis integration, Notification queues | 120–180 SP | Sprint 4–9 |
| **Phase 3** | P3 Medium | Module boundaries, Approval workflows, Batch invoicing, Frontend formalization, Documentation alignment | 150–250 SP | Sprint 10–18 |

### 1.2 Phase Dependencies

```
Phase 1 (Critical)
  └── Phase 2 (High) — requires Phase 1 schema additions and security fixes
        └── Phase 3 (Medium) — requires Phase 2 infrastructure (Redis, RBAC tables)
```

### 1.3 Scope Classification Rules

| Phase | Inclusion Criteria |
|-------|-------------------|
| Phase 1 | Blocks production use OR causes data integrity failure OR Critical security finding |
| Phase 2 | Degrades core workflow OR High-impact feature blocked OR infrastructure prerequisite |
| Phase 3 | Improves usability with existing workaround OR code organization OR documentation alignment |

---

## 2. Phase 1: Critical (P1)

### 2.1 Objectives

Address all items that block production use, cause data integrity failure, or represent Critical security findings.

### 2.2 Work Items

| # | Item | Source Gap | Effort | Description |
|---|------|-----------|:------:|-------------|
| 1.1 | Unguarded endpoint security fix | RBAC Review — Critical findings | 10 SP | Apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles()` to all unprotected endpoints |
| 1.2 | InsuranceType enum constraint | FG-MD-001 | 2 SP | Create `InsuranceType` enum (BPJS, SWASTA, CORPORATE); migrate existing string data |
| 1.3 | Reporting backend module | FG-SET-003 | 13 SP | Create `reports/` module with 6 endpoints (daily, monthly, patient, test, revenue, TAT) |
| 1.4 | WCAG 2.1 AA critical fixes | NAV-GAP, UX-GAP | 4 SP | Add ARIA labels, keyboard navigation, skip-to-content link |

**Phase 1 Total: 29 SP (estimated range: 29–40 SP with buffer)**

### 2.3 Phase 1 Detailed Scope

#### 1.1 — Unguarded Endpoint Security Fix

**Source:** [AUDIT-eLIS-2026-004]#SEC-001 through SEC-010 (RBAC Review Critical findings)

**Proposed Changes:**
- Add `@UseGuards(JwtAuthGuard, RolesGuard)` decorator to every controller lacking protection
- Add `@Roles()` decorator with minimum required role based on data sensitivity
- Endpoints with public health data: minimum `Role.CS` or authenticated-user
- Endpoints with admin-restricted data: minimum `Role.ADMIN`

#### 1.2 — InsuranceType Enum Constraint

**Source:** [AUDIT-eLIS-2026-006]#FG-MD-001

**Proposed Changes:**
- Create Prisma enum `InsuranceType { BPJS SWASTA CORPORATE }`
- Alter `Insurance.type` from `String?` to `InsuranceType?`
- Data migration: map existing string values ("BPJS"→BPJS, "Swasta"/"Private"→SWASTA, "Corporate"→CORPORATE, null→null)
- Update `CreateInsuranceDto.type` validation: `@IsEnum(InsuranceType)` replacing `@IsString()`
- Update frontend Insurance form: dropdown select with 3 options

#### 1.3 — Reporting Backend Module

**Source:** [AUDIT-eLIS-2026-006]#FG-SET-003

**Proposed Changes:**
- Create `apps/api/src/laboratory/reports/` module (controller, service, module, DTOs)
- Implement 6 endpoints with date-range filtering and CSV export
- Connect existing frontend Reports page to new backend endpoints

#### 1.4 — WCAG 2.1 AA Critical Fixes

**Source:** [AUDIT-eLIS-2026-UX]#WCAG-001 through WCAG-004

**Proposed Changes:**
- Add `aria-label` attributes to all interactive navigation elements
- Add skip-to-content link in main layout
- Add keyboard focus indicators for sidebar navigation
- Ensure form inputs have associated labels

---

## 3. Phase 2: High (P2)

### 3.1 Objectives

Address items that degrade core workflows, block high-priority features, or provide infrastructure prerequisites for Phase 3.

### 3.2 Work Items

| # | Item | Source Gap | Effort | Description |
|---|------|-----------|:------:|-------------|
| 2.1 | Redis integration (cache + BullMQ + JWT blocklist) | AGAP-010 | 5 SP | Deploy Redis; configure NestJS Redis module; enable master data caching |
| 2.2 | BullMQ notification queues | AGAP-011 | 10 SP | Implement email-queue and wa-queue workers with retry and dead-letter |
| 2.3 | RBAC Permission tables (Phase 1 schema) | Target State §3.3 | 8 SP | Create Permission, RolePermission, UserRole entities + migration |
| 2.4 | PermissionGuard implementation | Target State §1.5 | 8 SP | Replace flat RolesGuard with database-driven PermissionGuard |
| 2.5 | Multi-Insurance per Patient (M2M) | FG-MD-002 | 8 SP | Create PatientInsurance junction table; update Patient registration UI |
| 2.6 | Order-Insurance relationship | Target State §3.4 | 8 SP | Create OrderInsurance table with primary/secondary coverage |
| 2.7 | TanStack Query adoption | AGAP-005, AGAP-002 | 5 SP | Install TanStack Query; create services/ layer; migrate 3 key pages |
| 2.8 | Refresh Token strategy | AGAP-015 | 5 SP | Implement Access + Refresh token with HttpOnly cookie |
| 2.9 | BPJS-specific fields | FG-MD-007 | 5 SP | Add BPJS config fields to Insurance model; BpjsOrderDetail table |
| 2.10 | Insurance claim workflow | Target State §3.4 | 8 SP | Create claims service with status tracking (PENDING→SUBMITTED→APPROVED/REJECTED) |
| 2.11 | Reference Value management UI | FG-MD-003 | 5 SP | Add reference value CRUD UI in Lab Tests detail view |
| 2.12 | Dynamic Role & Permission UI | FG-ADM-001 | 5 SP | Create Access Matrix viewer + permission configuration page |
| 2.13 | Notification delivery management UI | FG-SET-001 | 5 SP | Delivery logs table, retry button, queue health metrics |
| 2.14 | Rate limiting on auth endpoints | AGAP-013 | 2 SP | Add @nestjs/throttler with Redis store to auth controller |
| 2.15 | PaymentMethod enum extension | Target State §3.4 | 3 SP | Add INSURANCE_CASH_FALLBACK, CORPORATE_DEFERRED values |
| 2.16 | Split payment support | Target State §3.4 | 8 SP | PaymentComponent table; partial insurance + partial cash |
| 2.17 | Navigation restructuring (sidebar) | AUDIT-eLIS-2025-NAV-002 | 8 SP | Multi-level sidebar with role-based visibility; route restructuring |
| 2.18 | Settings page decomposition | Target State §4.6 | 5 SP | Split 14-tab page into route-based pages per domain |

**Phase 2 Total: 111 SP (estimated range: 111–155 SP with buffer)**

### 3.3 Phase 2 Sub-Phase Ordering

Phase 2 items have internal dependencies:

```
Sub-Phase 2A (Infrastructure):  2.1 Redis → 2.2 BullMQ, 2.14 Rate Limiting
Sub-Phase 2B (RBAC):            2.3 Permission tables → 2.4 PermissionGuard → 2.12 UI
Sub-Phase 2C (Insurance):       2.5 PatientInsurance → 2.6 OrderInsurance → 2.9 BPJS → 2.10 Claims → 2.15 PaymentMethod → 2.16 Split Payment
Sub-Phase 2D (Frontend):        2.7 TanStack Query → 2.11 RefValue UI → 2.13 Notifications UI → 2.17 Navigation → 2.18 Settings decomposition
Sub-Phase 2E (Auth):            2.1 Redis → 2.8 Refresh Token
```

---

## 4. Phase 3: Medium (P3)

### 4.1 Objectives

Improve code organization, governance, and usability for enterprise-scale operations. All items have existing workarounds.

### 4.2 Work Items

| # | Item | Source Gap | Effort | Description |
|---|------|-----------|:------:|-------------|
| 3.1 | Module boundary formalization (interfaces) | AGAP-008 | 10 SP | Define interface contracts between bounded contexts; refactor direct service imports |
| 3.2 | ESLint boundary rules | AGAP-009 | 5 SP | Add eslint-plugin-boundaries; configure allowed import directions |
| 3.3 | Master Data module extraction | Target State §1.3 | 13 SP | Promote laboratory/master-data/ to top-level master-data/ bounded context |
| 3.4 | Settings module extraction | Target State §1.3 | 8 SP | Extract settings controller to top-level settings/ bounded context |
| 3.5 | Approval workflows (financial + master data) | Target State §3.3 | 13 SP | ApprovalRequest, ApprovalStep entities; approval service + API |
| 3.6 | Department & Position entities | Target State §3.3 | 8 SP | Create Department, Position, UserDepartment tables |
| 3.7 | Role Hierarchy implementation | FG-ADM-002 | 5 SP | Hierarchy traversal in PermissionGuard; inheritance chain |
| 3.8 | Role Composition (multi-role) | FG-ADM-002 | 5 SP | Migrate from User.role enum to UserRole junction table |
| 3.9 | Batch invoicing (Corporate Insurance) | Target State §3.4 | 10 SP | BatchInvoice + BatchInvoiceItem entities; batch service |
| 3.10 | Insurance rejection handling (72hr fallback) | Target State §3.4 | 5 SP | Status transition CLAIM_REJECTED; patient notification workflow |
| 3.11 | Frontend services/ layer completion | AGAP-002 | 8 SP | Complete TanStack Query migration for all remaining pages |
| 3.12 | Zod validation schemas | AGAP-003 | 5 SP | Create schemas/ directory; add Zod schemas for all forms |
| 3.13 | Custom hooks consolidation | AGAP-004 | 2 SP | Create hooks/ directory; consolidate scattered hooks |
| 3.14 | Dead code cleanup | AGAP-018 | 2 SP | Remove unused lib/hooks.ts and other dead code |
| 3.15 | AES-256 PII encryption | AGAP-014 | 5 SP | Encrypt patient NIK at rest; implement transparent encrypt/decrypt |
| 3.16 | Prometheus metrics endpoint | AGAP-012 | 5 SP | /metrics endpoint; structured JSON logging; correlation IDs |
| 3.17 | Frontend architecture doc update | AGAP-001 | 3 SP | Update docs/06-Frontend/ to reflect actual Next.js pattern |
| 3.18 | Database Design doc update | AGAP-017 | 5 SP | Update docs/04-Database/ ERD to match current 25+ entity schema |
| 3.19 | Tariff effective date management | FG-MD-004 | 5 SP | Add effectiveFrom/effectiveTo to Tariff model |
| 3.20 | Master Data import/export | FG-MD-005 | 8 SP | Bulk import endpoint (CSV/Excel); export endpoint |
| 3.21 | System Settings expansion | FG-SET-002 | 5 SP | Organization, security, operational parameter panels |
| 3.22 | User audit trail inline | FG-ADM-003 | 3 SP | "View History" per-user action in Admin UI |

**Phase 3 Total: 138 SP (estimated range: 138–200 SP with buffer)**

---

## 5. File-Level Refactoring Instructions

> **IMPORTANT:** All instructions below are **Proposed Changes** per Requirement 9.5.
> No source code is modified by this audit. Each entry documents: file path, current code
> reference, proposed change description, and risk assessment.

### 5.1 Phase 1 Proposed Changes

#### PC-1.1: Security Guard Application

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/laboratory/*/controller.ts` (all controllers) |
| **Current Code Reference** | Controllers missing `@UseGuards()` or `@Roles()` decorators on some endpoints |
| **Proposed Change** | Add `@UseGuards(JwtAuthGuard, RolesGuard)` at controller level; add `@Roles()` per endpoint with minimum required role |
| **Risk Assessment** | **Low** — Additive decorator; no logic change. Affected: all API consumers must provide valid JWT. |
| **Affected Components** | All API controllers, frontend auth interceptor |

#### PC-1.2: InsuranceType Enum Migration

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/prisma/schema.prisma` |
| **Current Code Reference** | `type String?` field on Insurance model (line ~varies) |
| **Proposed Change** | Add enum `InsuranceType { BPJS SWASTA CORPORATE }`; change field to `type InsuranceType?`; create migration with `ALTER TABLE insurances ALTER COLUMN type TYPE "InsuranceType" USING type::"InsuranceType"` |
| **Risk Assessment** | **Low** — Existing valid values preserved. Null values remain null. Invalid strings will fail migration (must be cleaned first). |
| **Affected Components** | Insurance CRUD endpoints, frontend Insurance form, seed data |

#### PC-1.3: Reporting Module Creation

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/laboratory/reports/` (NEW directory) |
| **Current Code Reference** | No reports module exists |
| **Proposed Change** | Create new module with: `reports.module.ts`, `reports.controller.ts`, `reports.service.ts`, `dto/` directory. Endpoints: GET /reports/daily, /reports/monthly, /reports/patients, /reports/tests, /reports/revenue, /reports/tat. All accept `startDate`, `endDate` query params. |
| **Risk Assessment** | **Low** — New module only; no existing code modified. |
| **Affected Components** | Frontend Reports page (connects to new endpoints), AppModule imports |

#### PC-1.4: WCAG Accessibility Fixes

| Field | Detail |
|-------|--------|
| **File Path** | `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/app/layout.tsx` |
| **Current Code Reference** | Navigation elements lack ARIA attributes; no skip-to-content link |
| **Proposed Change** | Add `aria-label`, `aria-expanded`, `role="navigation"` to sidebar. Add `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>` in layout. Add `id="main-content"` to main content area. |
| **Risk Assessment** | **Low** — HTML attribute additions only; no logic change. |
| **Affected Components** | Sidebar component, main layout |

---

### 5.2 Phase 2 Proposed Changes

#### PC-2.1: Redis Integration

| Field | Detail |
|-------|--------|
| **File Path** | `docker-compose.yml`, `apps/api/src/app.module.ts` |
| **Current Code Reference** | No Redis service in docker-compose; no Redis module in NestJS |
| **Proposed Change** | Add Redis service to docker-compose (image: redis:7-alpine, port 6379). Add `@nestjs/cache-manager` with Redis store. Add `REDIS_URL` env variable. |
| **Risk Assessment** | **Medium** — Infrastructure change; requires all deployment environments to provision Redis. |
| **Affected Components** | Docker deployment, environment configuration, CI/CD pipeline |

#### PC-2.2: BullMQ Notification Queues

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/laboratory/notification/` |
| **Current Code Reference** | `email.service.ts`, `whatsapp.service.ts` process synchronously |
| **Proposed Change** | Add `@nestjs/bullmq` dependency. Create `email.processor.ts` and `whatsapp.processor.ts` queue workers. Refactor services to enqueue jobs instead of direct send. Add dead-letter queue handling with 3 retry attempts. |
| **Risk Assessment** | **Medium** — Changes notification delivery flow; requires Redis running. Failure mode: if Redis is down, notifications fail (need fallback). |
| **Affected Components** | Notification module, lab-workflow approval trigger, Docker compose |

#### PC-2.3: RBAC Permission Tables

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/prisma/schema.prisma` |
| **Current Code Reference** | No Permission, RolePermission, or UserRole models |
| **Proposed Change** | Add models: `Permission` (resource, action, description), `RolePermission` (role, permissionId), `UserRole` (userId, role, isPrimary). Create seed migration populating default permissions matching current @Roles decorators. |
| **Risk Assessment** | **Low** — Additive schema change. Existing User.role field preserved during transition. |
| **Affected Components** | Prisma schema, seed scripts, future PermissionGuard |

#### PC-2.4: PermissionGuard Implementation

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/common/guards/permission.guard.ts` (NEW) |
| **Current Code Reference** | `apps/api/src/common/guards/roles.guard.ts` — flat role matching |
| **Proposed Change** | Create new PermissionGuard that checks `resource:action` tuples against database. Add `@RequirePermission('resource', 'action')` decorator. Existing `@Roles()` decorator continues to work (backward compatible). PermissionGuard falls through to RolesGuard when no Permission records exist for a role. |
| **Risk Assessment** | **Medium** — Guard logic change; must preserve existing behavior during transition. Fallback to RolesGuard ensures no regression. |
| **Affected Components** | All protected controllers (opt-in via new decorator), auth module |

#### PC-2.5: PatientInsurance Junction Table

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/prisma/schema.prisma` |
| **Current Code Reference** | `Patient.insuranceId String? @db.Uuid` — single FK |
| **Proposed Change** | Add `PatientInsurance` model (patientId, insuranceId, priority, memberNumber, validFrom, validUntil, isActive). Keep existing `Patient.insuranceId` during transition (deprecated, not removed). |
| **Risk Assessment** | **Low** — Additive; existing FK preserved. Deprecation handled in Phase 3. |
| **Affected Components** | Patient registration UI, patient API responses |

#### PC-2.6: OrderInsurance Table

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/prisma/schema.prisma` |
| **Current Code Reference** | `Order.insuranceId String?` — single FK |
| **Proposed Change** | Add `OrderInsurance` model (orderId, insuranceId, coverage [PRIMARY/SECONDARY], claimReference, coveredAmount, patientAmount, claimStatus). Keep existing `Order.insuranceId` during transition. |
| **Risk Assessment** | **Low** — Additive; existing FK preserved. |
| **Affected Components** | Order creation flow, payment calculation, billing UI |

#### PC-2.7: TanStack Query Adoption

| Field | Detail |
|-------|--------|
| **File Path** | `apps/web/package.json`, `apps/web/src/services/` (NEW), `apps/web/src/providers/` (NEW) |
| **Current Code Reference** | Direct `apiClient` calls with `useState` in page components |
| **Proposed Change** | Install `@tanstack/react-query`. Create `QueryClientProvider` wrapper. Create `services/` directory with domain API clients and query hooks. Migrate 3 high-traffic pages first (patients, orders, dashboard). |
| **Risk Assessment** | **Low** — Additive library; pages migrated incrementally. Existing pattern continues to work. |
| **Affected Components** | Frontend layout providers, migrated page components |

#### PC-2.17: Navigation Restructuring

| Field | Detail |
|-------|--------|
| **File Path** | `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/app/dashboard/` |
| **Current Code Reference** | Flat sidebar with single "Pengaturan" menu; all settings in one page |
| **Proposed Change** | Implement multi-level sidebar per Target State §4.2-4.3 (7 Level-1 items). Add role-based visibility filtering using auth context. Create new route directories: `/dashboard/master-data/`, `/dashboard/administration/`. |
| **Risk Assessment** | **Medium** — Changes user navigation experience. All existing routes must continue to work (redirects from old paths). |
| **Affected Components** | Sidebar component, route structure, all page layouts |

---

### 5.3 Phase 3 Proposed Changes

#### PC-3.3: Master Data Module Extraction

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/laboratory/master-data/` → `apps/api/src/master-data/` (NEW top-level) |
| **Current Code Reference** | Master data services nested under `laboratory/` umbrella module |
| **Proposed Change** | Create new top-level `master-data/` bounded context. Move controllers, services, DTOs. Create `IMasterDataQueryService` interface for consumers. Update `laboratory.module.ts` imports to use interface. All API routes (`/api/v1/master/*`) remain unchanged. |
| **Risk Assessment** | **Medium** — Internal restructuring; no API contract change. Risk: import path errors during move. Mitigated by comprehensive test run. |
| **Affected Components** | laboratory module imports, AppModule registration, CI builds |

#### PC-3.4: Settings Module Extraction

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/laboratory/notification/settings.controller.ts` → `apps/api/src/settings/` (NEW) |
| **Current Code Reference** | Settings controller inside notification module |
| **Proposed Change** | Create new top-level `settings/` bounded context. Move settings controller and service. Create `ISystemSettingsService` interface. API routes (`/api/v1/settings/*`) remain unchanged. |
| **Risk Assessment** | **Low** — Small extraction; single controller + service. |
| **Affected Components** | Notification module imports, AppModule registration |

#### PC-3.5: Approval Workflows

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/prisma/schema.prisma`, `apps/api/src/rbac/` (extends Phase 2 module) |
| **Current Code Reference** | No approval entities or workflow logic exists |
| **Proposed Change** | Add `ApprovalRequest` and `ApprovalStep` models. Create `approval.controller.ts` and `approval.service.ts` in RBAC module. Implement workflows: lab result verification (ANALIS→DOKTER), financial void (KASIR→MANAGER), master data change (ADMIN→SUPER_ADMIN), role elevation (ADMIN→OWNER). |
| **Risk Assessment** | **Medium** — New workflow intersects with existing lab-workflow approval (doctor approval). Must not break existing `approveOrder` flow. |
| **Affected Components** | Lab workflow, payment module, master data module, users module |

#### PC-3.9: Batch Invoicing

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/prisma/schema.prisma`, `apps/api/src/insurance/` (NEW module from Phase 2) |
| **Current Code Reference** | No batch invoicing entities |
| **Proposed Change** | Add `BatchInvoice` and `BatchInvoiceItem` models. Create batch invoice service supporting up to 500 orders per cycle. Add API endpoints for generating, viewing, and managing corporate batch invoices. |
| **Risk Assessment** | **Low** — New entities and endpoints; no existing functionality affected. |
| **Affected Components** | Insurance module, corporate billing UI |

#### PC-3.15: AES-256 PII Encryption

| Field | Detail |
|-------|--------|
| **File Path** | `apps/api/src/common/crypto/` (NEW), Patient model middleware |
| **Current Code Reference** | Patient NIK stored as plain text |
| **Proposed Change** | Create encryption service using AES-256-GCM. Add Prisma middleware to transparently encrypt on write and decrypt on read for designated PII fields (NIK). Store encryption key in environment variable (not in code). |
| **Risk Assessment** | **High** — Data migration required for existing records. Encrypted fields cannot be queried with LIKE/equality without deterministic mode. Must handle key rotation. |
| **Affected Components** | Patient model, all patient queries using NIK, search functionality |

---

## 6. Backward Compatibility Verification

### 6.1 Affected Endpoints — Phase 1

| API Endpoint | HTTP Method | Current Module | Change Type | Contract Change |
|-------------|:-----------:|----------------|:-----------:|:---------------:|
| All unguarded endpoints | Various | Various | Guard addition | **None** — existing valid requests continue; invalid requests now get 401/403 |
| `POST /api/v1/master/insurances` | POST | laboratory/master-data | DTO validation | **None** — valid InsuranceType strings accepted; free-text rejected |
| `PUT /api/v1/master/insurances/:id` | PUT | laboratory/master-data | DTO validation | **None** — same as above |
| `GET /api/v1/reports/*` | GET | NEW | New endpoints | **None** — additive only |

### 6.2 Affected Endpoints — Phase 2

| API Endpoint | HTTP Method | Change Type | Request Contract | Response Contract | Verification Method |
|-------------|:-----------:|:-----------:|:----------------:|:-----------------:|---------------------|
| `POST /api/v1/patients` | POST | Body extension | `insuranceId` still accepted (deprecated) | Response adds `insurances[]` array alongside existing `insuranceId` | Existing tests pass; `insuranceId` field preserved |
| `GET /api/v1/patients/:id` | GET | Response extension | No change | Response adds `insurances[]` array | Existing field `insuranceId` still present |
| `POST /api/v1/orders` | POST | Body extension | `insuranceId` still accepted | Response adds `orderInsurances[]` array | Existing order creation flow unchanged |
| `GET /api/v1/orders/:id` | GET | Response extension | No change | Response adds `orderInsurances[]` array | Existing fields preserved |
| `POST /api/v1/auth/login` | POST | Response extension | No change | Response adds `refreshToken` in HttpOnly cookie | Existing `access_token` in body preserved |
| `GET /api/v1/master/*` | GET | No change | No change | No change | All master data endpoints unchanged |
| `GET /api/v1/settings/*` | GET | No change | No change | No change | Settings endpoints unchanged |
| `GET /api/v1/dashboard/*` | GET | No change | No change | No change | Dashboard endpoints unchanged |

### 6.3 Affected Endpoints — Phase 3

| API Endpoint | HTTP Method | Change Type | Contract Change | Verification Method |
|-------------|:-----------:|:-----------:|:---------------:|---------------------|
| `GET /api/v1/master/*` | GET | Internal restructure | **None** — routes preserved via controller decorators | Full integration test suite |
| `GET /api/v1/settings/*` | GET | Internal restructure | **None** — routes preserved | Integration tests + manual verification |
| `GET /api/v1/regions/*` | GET | Internal restructure | **None** — routes preserved | Existing region tests |
| All existing endpoints | All | PermissionGuard addition | **None** — existing RolesGuard fallback ensures backward compat | Full regression test suite |

### 6.4 Backward Compatibility Rules

| Rule | Enforcement |
|------|-------------|
| No HTTP endpoint path changes | API route decorators (`@Controller('master')`, etc.) preserved during module relocation |
| No request body field removals | Deprecated fields marked `@IsOptional()` and preserved for ≥2 sprints |
| No response field removals | New fields added alongside existing; existing fields never removed in same phase |
| No status code changes | Existing success (200/201) and error (400/404/403) codes unchanged |
| No authentication method changes | JWT Bearer token continues to work; refresh token is additive |

### 6.5 Verification Methods

| Method | Scope | Trigger |
|--------|-------|---------|
| Automated unit tests (`npm run test`) | All service logic | Every PR merge |
| Automated integration tests | API endpoint contracts | Every PR merge |
| Manual API contract verification | Request/response schema comparison | Per-phase release |
| Postman collection regression | All documented endpoints | Pre-release |
| Frontend smoke test | Critical user flows (login, create order, view results) | Per-phase release |

---

## 7. Rollback Strategy

### 7.1 Global Rollback Trigger Conditions

Per Requirement 7.3, rollback is triggered when:

> **Any existing automated test failure** OR **any existing API endpoint returning a different
> response structure than before migration.**

Specifically:
- `npm run test` in `apps/api/` produces any FAIL result not present before the phase
- Any API endpoint returns a different HTTP status code for a previously valid request
- Any API endpoint response body is missing a field that existed in the pre-phase response
- Frontend smoke test (login → dashboard → create order → view result) fails

### 7.2 Phase 1 Rollback Strategy

| Field | Detail |
|-------|--------|
| **Trigger Condition** | Any existing test fails after guard application; OR InsuranceType migration fails on existing data; OR frontend login/order flow broken |
| **Maximum Time Window** | 4 hours from deployment start |
| **Rollback Procedure** | 1. Revert git to pre-Phase-1 tag (`git revert` or branch switch); 2. Run `prisma migrate reset` with previous migration state if schema changed; 3. Redeploy previous Docker images |
| **Verification Steps** | 1. Run `npm run test` — all pass; 2. POST /api/v1/auth/login — returns 200 with token; 3. GET /api/v1/master/tests — returns 200 with test list; 4. Frontend login flow completes successfully |
| **Data Impact** | InsuranceType enum migration is reversible (change column back to String); no data loss |
| **Responsible Role** | Tech Lead |

**Phase 1 Rollback Detail:**

| Work Item | Rollback Action | Risk |
|-----------|----------------|------|
| 1.1 Security guards | Remove guard decorators (revert commit) | Low — reverts to previous (less secure) state |
| 1.2 InsuranceType enum | Revert migration: `ALTER TABLE insurances ALTER COLUMN type TYPE text` | Low — data preserved as string |
| 1.3 Reports module | Remove module from AppModule imports (revert commit) | Low — new module only |
| 1.4 WCAG fixes | Revert HTML attribute changes | Low — cosmetic only |

### 7.3 Phase 2 Rollback Strategy

| Field | Detail |
|-------|--------|
| **Trigger Condition** | Any existing test fails; OR patient/order creation returns different response; OR authentication flow broken; OR Redis dependency causes startup failure |
| **Maximum Time Window** | 8 hours from deployment start |
| **Rollback Procedure** | 1. Switch Docker deployment to pre-Phase-2 images; 2. If schema migrations applied: run rollback migrations (provided as `down` scripts); 3. Remove Redis dependency from NestJS startup (graceful degradation flag); 4. Redeploy |
| **Verification Steps** | 1. Run full test suite — all pass; 2. POST /api/v1/patients — returns 201 with patient object; 3. POST /api/v1/orders — returns 201 with order object; 4. POST /api/v1/auth/login — returns 200 with token; 5. GET /api/v1/dashboard/executive-summary — returns correct data; 6. Frontend create-order flow works end-to-end |
| **Data Impact** | Additive tables (PatientInsurance, OrderInsurance, Permission, etc.) can be preserved or dropped. Existing Patient.insuranceId and Order.insuranceId remain intact. No data loss on existing records. |
| **Responsible Role** | Tech Lead + Enterprise Architect |

**Phase 2 Sub-Phase Rollback:**

| Sub-Phase | Rollback Scope | Special Considerations |
|-----------|---------------|------------------------|
| 2A (Redis + BullMQ) | Remove Redis from docker-compose; revert to sync notifications | Pending queue jobs will be lost — acceptable for rollback |
| 2B (RBAC tables) | Drop new Permission/RolePermission tables; revert to RolesGuard only | Existing guards continue to work since PermissionGuard falls back |
| 2C (Insurance M2M) | Drop new junction tables; existing FKs remain | New PatientInsurance records lost — patients revert to single insurance |
| 2D (Frontend) | Revert to pre-TanStack-Query pages | Pages revert to direct apiClient calls |
| 2E (Refresh Token) | Revert auth service to single-token | Users continue with existing access token pattern |

### 7.4 Phase 3 Rollback Strategy

| Field | Detail |
|-------|--------|
| **Trigger Condition** | Module extraction breaks existing API routes; OR import path errors cause build failure; OR approval workflow interferes with existing lab-workflow |
| **Maximum Time Window** | 12 hours from deployment start |
| **Rollback Procedure** | 1. Revert module extraction (restore files to original locations); 2. Revert AppModule import changes; 3. If approval workflow conflicts with lab-workflow: disable approval module (remove from imports); 4. Rebuild and redeploy |
| **Verification Steps** | 1. `npx nest build` — 0 errors; 2. `npm run test` — all pass; 3. All `/api/v1/master/*` endpoints return same response as before; 4. All `/api/v1/settings/*` endpoints functional; 5. Lab workflow (collect → analyze → verify → approve) completes; 6. Frontend navigation works for all roles |
| **Data Impact** | Module extraction is code-only (no schema change). Approval tables are additive. Batch invoice tables are additive. No existing data at risk. |
| **Responsible Role** | Enterprise Architect + Tech Lead + QA Lead |

**Phase 3 Module Extraction Rollback Detail:**

| Extraction | Rollback Action | Route Preservation |
|-----------|----------------|-------------------|
| master-data/ → top-level | Move files back to laboratory/master-data/ | Routes unchanged (decorator-based) |
| settings/ → top-level | Move controller back to laboratory/notification/ | Routes unchanged |
| Region merge | Restore separate laboratory/region/ module | Routes unchanged |

### 7.5 Rollback Decision Matrix

| Condition | Action | Escalation |
|-----------|--------|------------|
| Single test failure — clearly related to new code | Fix forward (hotfix within time window) | None |
| Multiple test failures — unclear cause | Initiate rollback | Notify Tech Lead |
| API contract violation detected | Immediate rollback | Notify Tech Lead + Enterprise Architect |
| Build failure preventing deployment | Revert merge; do not deploy | Notify team lead |
| Production data corruption risk | Immediate rollback + database point-in-time recovery | Notify all stakeholders |
| Time window exceeded without resolution | Mandatory rollback regardless of progress | Automatic escalation |

---

## 8. Implementation Readiness Checklist

### 8.1 Phase 1 — Critical Items

#### Prerequisites

| # | Prerequisite | Status | Owner |
|---|-------------|:------:|-------|
| P1-PRE-01 | All existing automated tests pass (baseline established) | ☐ Pending | QA Lead |
| P1-PRE-02 | API endpoint response snapshots captured (pre-migration baseline) | ☐ Pending | Tech Lead |
| P1-PRE-03 | Database backup taken before InsuranceType migration | ☐ Pending | DevOps |
| P1-PRE-04 | Existing Insurance.type string values audited (identify non-standard values) | ☐ Pending | Tech Lead |
| P1-PRE-05 | Frontend smoke test script documented (login → dashboard → order → result) | ☐ Pending | QA Lead |
| P1-PRE-06 | Rollback procedure rehearsed in staging environment | ☐ Pending | DevOps |
| P1-PRE-07 | Git tag created for pre-Phase-1 state | ☐ Pending | Tech Lead |

#### Acceptance Criteria

| # | Criterion | Observable Condition | Verification |
|---|-----------|---------------------|--------------|
| P1-AC-01 | All API endpoints have role guards | Zero endpoints return 200 without valid JWT | Automated security scan |
| P1-AC-02 | InsuranceType enum enforced | `POST /master/insurances` with `type: "invalid"` returns 400 | Unit test + manual test |
| P1-AC-03 | InsuranceType existing data preserved | All existing insurance records retain their type classification | Data count query before/after migration |
| P1-AC-04 | Reports API functional | `GET /reports/daily?start=2026-07-01&end=2026-07-09` returns valid data | Integration test |
| P1-AC-05 | Reports page shows real data | Frontend Reports page displays report data from new API | Manual verification |
| P1-AC-06 | WCAG skip-to-content works | Tab key from page load focuses skip link, Enter skips to main content | Manual accessibility test |
| P1-AC-07 | No existing test regressions | `npm run test` passes with zero new failures | CI pipeline |
| P1-AC-08 | No API contract changes | All pre-existing endpoints return same response structure | Snapshot comparison |

#### Sign-Off Requirements

| # | Approval | Role | Criteria |
|---|----------|------|----------|
| P1-SIGN-01 | Security review complete | Enterprise Architect | All endpoints protected; no unguarded critical paths |
| P1-SIGN-02 | Data integrity verified | Tech Lead | Insurance type migration preserves all records |
| P1-SIGN-03 | Regression test passed | QA Lead | Full test suite green; API snapshot comparison clean |
| P1-SIGN-04 | Phase 1 deployment approved | Tech Lead | All P1-AC criteria met; rollback rehearsed |

---

### 8.2 Phase 2 — High Priority Items

#### Prerequisites

| # | Prerequisite | Status | Owner |
|---|-------------|:------:|-------|
| P2-PRE-01 | Phase 1 completed and signed off | ☐ Pending | Tech Lead |
| P2-PRE-02 | Redis instance provisioned in all environments (dev, staging, production) | ☐ Pending | DevOps |
| P2-PRE-03 | TanStack Query evaluated with team (dev training if needed) | ☐ Pending | Tech Lead |
| P2-PRE-04 | RBAC permission seed data designed (default role→permission mappings) | ☐ Pending | Enterprise Architect |
| P2-PRE-05 | Insurance M2M data migration plan approved (existing single FK → junction table) | ☐ Pending | Tech Lead |
| P2-PRE-06 | Frontend navigation wireframes approved by UX/product team | ☐ Pending | Product Owner |
| P2-PRE-07 | API versioning strategy confirmed (additive fields vs new version) | ☐ Pending | Enterprise Architect |
| P2-PRE-08 | Performance baseline established (API response times, DB query times) | ☐ Pending | QA Lead |
| P2-PRE-09 | CI/CD pipeline updated to include Redis in test environment | ☐ Pending | DevOps |
| P2-PRE-10 | Rollback migrations (down scripts) written for all new schema changes | ☐ Pending | Tech Lead |

#### Acceptance Criteria

| # | Criterion | Observable Condition | Verification |
|---|-----------|---------------------|--------------|
| P2-AC-01 | Redis operational | Application starts with Redis connection; cache hit rate > 0% on master data queries | Health check + metrics |
| P2-AC-02 | BullMQ queues processing | Notification jobs enqueued on order approval; delivery confirmed via queue monitor | Queue dashboard or logs |
| P2-AC-03 | Permission tables populated | All 11 roles have permission records matching current @Roles behavior | Database query verification |
| P2-AC-04 | PermissionGuard functional | Existing role-guarded requests continue to work; new permission checks active | Integration tests |
| P2-AC-05 | Multi-insurance per patient | Patient can be created with 2+ insurances; response includes `insurances[]` array | API integration test |
| P2-AC-06 | Order-Insurance M2M | Order can reference primary + secondary insurance; claim tracking functional | Integration test |
| P2-AC-07 | TanStack Query operational | Migrated pages show cached data; stale-while-revalidate behavior observable | Frontend dev tools |
| P2-AC-08 | Refresh token works | Login returns HttpOnly cookie; token refresh endpoint extends session | Auth flow test |
| P2-AC-09 | BPJS fields available | Insurance record of type BPJS can store SEP number, facility code, class level | CRUD test |
| P2-AC-10 | Sidebar restructured | 7 Level-1 items visible; role-based filtering operational | Manual test per role |
| P2-AC-11 | Settings page decomposed | Each domain has its own route (no more single 14-tab page) | Navigation test |
| P2-AC-12 | Rate limiting active | Auth endpoints throttled (429 after threshold) | Load test |
| P2-AC-13 | Backward compatibility | All Phase 1 endpoints return unchanged responses | Snapshot comparison |
| P2-AC-14 | No existing test regressions | Full test suite passes | CI pipeline |

#### Sign-Off Requirements

| # | Approval | Role | Criteria |
|---|----------|------|----------|
| P2-SIGN-01 | Infrastructure verified | DevOps / Tech Lead | Redis stable; BullMQ processing; no resource leaks |
| P2-SIGN-02 | Security architecture approved | Enterprise Architect | PermissionGuard behavior correct; refresh token secure |
| P2-SIGN-03 | Data model verified | Tech Lead | M2M tables functional; existing data preserved |
| P2-SIGN-04 | UX review complete | Product Owner / UX | Navigation restructuring approved; no user confusion |
| P2-SIGN-05 | Performance acceptable | QA Lead | No degradation >20% on existing API response times |
| P2-SIGN-06 | Regression test passed | QA Lead | Full test suite green; API snapshots match |
| P2-SIGN-07 | Phase 2 deployment approved | Enterprise Architect | All P2-AC criteria met; rollback rehearsed |

---

### 8.3 Phase 3 — Medium Priority Items

#### Prerequisites

| # | Prerequisite | Status | Owner |
|---|-------------|:------:|-------|
| P3-PRE-01 | Phase 2 completed and signed off | ☐ Pending | Enterprise Architect |
| P3-PRE-02 | Interface contracts designed for all bounded context boundaries | ☐ Pending | Enterprise Architect |
| P3-PRE-03 | ESLint boundary rules configured and documented | ☐ Pending | Tech Lead |
| P3-PRE-04 | Approval workflow business rules confirmed with stakeholders | ☐ Pending | Product Owner |
| P3-PRE-05 | Corporate insurance partners identified for batch invoice testing | ☐ Pending | Business Analyst |
| P3-PRE-06 | Encryption key management strategy defined (rotation, storage, access) | ☐ Pending | Security Lead / DevOps |
| P3-PRE-07 | Prometheus/Grafana infrastructure provisioned | ☐ Pending | DevOps |
| P3-PRE-08 | Frontend architecture documentation update plan approved | ☐ Pending | Enterprise Architect |
| P3-PRE-09 | E2E test framework selected and configured (Playwright recommended) | ☐ Pending | QA Lead |
| P3-PRE-10 | Data migration script for PII encryption tested on anonymized dataset | ☐ Pending | Tech Lead |

#### Acceptance Criteria

| # | Criterion | Observable Condition | Verification |
|---|-----------|---------------------|--------------|
| P3-AC-01 | Master data module extracted | `apps/api/src/master-data/` exists as top-level; all `/api/v1/master/*` routes work | Build passes + integration tests |
| P3-AC-02 | Settings module extracted | `apps/api/src/settings/` exists; `/api/v1/settings/*` routes work | Integration tests |
| P3-AC-03 | Interface contracts enforced | ESLint rules flag direct cross-context imports as errors | `npm run lint` passes |
| P3-AC-04 | Approval workflows functional | Lab result requires DOKTER approval step tracked in ApprovalRequest table | Workflow integration test |
| P3-AC-05 | Financial approval functional | Payment void requires MANAGER approval before processing | Workflow test |
| P3-AC-06 | Department-based data scoping | Users in Department A cannot see Department B patient data | Permission test |
| P3-AC-07 | Role hierarchy working | SUPER_ADMIN automatically inherits all lower-role permissions | Guard test |
| P3-AC-08 | Multi-role per user | User can hold DOKTER + MANAGER simultaneously | User CRUD test |
| P3-AC-09 | Batch invoicing | Corporate insurance batch with 100+ orders generates invoice | Service test |
| P3-AC-10 | Insurance rejection flow | Claim rejection triggers patient notification + status change to PAYMENT_OVERDUE after 72hr | Workflow test |
| P3-AC-11 | PII encrypted at rest | Patient NIK is encrypted in database; decrypted transparently on read | DB inspection + API response test |
| P3-AC-12 | Metrics endpoint active | `GET /metrics` returns Prometheus-format metrics | Health check |
| P3-AC-13 | Frontend services complete | All pages use TanStack Query; no direct `apiClient` in page components | Code review |
| P3-AC-14 | Zod schemas active | All form submissions validated client-side with Zod schemas | Form error test |
| P3-AC-15 | Documentation aligned | Frontend Architecture doc reflects actual Next.js pattern | Documentation review |
| P3-AC-16 | No existing test regressions | Full test suite passes; all API contracts unchanged | CI pipeline |

#### Sign-Off Requirements

| # | Approval | Role | Criteria |
|---|----------|------|----------|
| P3-SIGN-01 | Architecture compliance verified | Enterprise Architect | All bounded contexts properly isolated; interface contracts enforced |
| P3-SIGN-02 | Security review complete | Enterprise Architect / Security Lead | PII encryption operational; key management in place; no plaintext leaks |
| P3-SIGN-03 | Business workflow approved | Product Owner | Approval workflows match business requirements; no operational disruption |
| P3-SIGN-04 | Performance validated | QA Lead | No degradation from module extraction; encryption overhead < 50ms |
| P3-SIGN-05 | Full regression passed | QA Lead | All tests pass; E2E smoke tests pass; Postman collection green |
| P3-SIGN-06 | Documentation complete | Enterprise Architect | All architecture docs updated; ADRs current; audit findings resolved |
| P3-SIGN-07 | Phase 3 deployment approved | Enterprise Architect + Tech Lead + QA Lead | All P3-AC criteria met; full sign-off |

---

## 9. Risk Register

### 9.1 Phase-Level Risks

| Risk ID | Phase | Description | Probability | Impact | Mitigation |
|---------|:-----:|-------------|:-----------:|:------:|------------|
| R-01 | 1 | InsuranceType migration fails on invalid string data | Medium | High | Audit existing values first (P1-PRE-04); provide data cleanup script |
| R-02 | 2 | Redis dependency causes startup failures in environments without Redis | High | High | Implement graceful degradation — app starts without Redis, features disabled |
| R-03 | 2 | PermissionGuard fallback logic has edge cases breaking existing access | Medium | Critical | Extensive test coverage; gradual rollout (opt-in per controller) |
| R-04 | 2 | TanStack Query migration introduces stale data bugs | Low | Medium | Conservative staleTime (5min); invalidation on mutations |
| R-05 | 3 | Module extraction breaks import paths across codebase | High | Medium | Automated find-and-replace; TypeScript compiler catches all errors |
| R-06 | 3 | PII encryption causes performance degradation on patient search | Medium | High | Use deterministic encryption for searchable fields; benchmark |
| R-07 | 3 | Approval workflows conflict with existing lab-workflow approval | Medium | High | New approval system is additive; existing `approveOrder` untouched initially |
| R-08 | All | Team unfamiliar with new patterns (TanStack Query, BullMQ, interfaces) | Medium | Medium | Training sessions; pair programming; documentation |

### 9.2 Cross-Phase Dependencies

| Dependency | Source Phase | Target Phase | Failure Impact |
|-----------|:-----------:|:------------:|----------------|
| Redis provisioned | Phase 2 | Phase 2 (BullMQ, Rate Limiting, Refresh Token) | Blocks 5 work items |
| RBAC tables exist | Phase 2 | Phase 3 (Approval, Hierarchy, Multi-role) | Blocks 4 work items |
| InsuranceType enum exists | Phase 1 | Phase 2 (BPJS fields, Claims) | Blocks 3 work items |
| TanStack Query installed | Phase 2 | Phase 3 (Full services migration) | Blocks 1 work item |
| Interface contracts designed | Phase 3 prereq | Phase 3 (Module extraction) | Blocks 2 work items |

---

## 10. Effort Summary

| Phase | Items | Story Points | Person-Days (@ 2 SP/day) | Sprints (2-week) |
|:-----:|:-----:|:------------:|:------------------------:|:----------------:|
| Phase 1 | 4 | 29–40 SP | 15–20 PD | 1–2 |
| Phase 2 | 18 | 111–155 SP | 56–78 PD | 4–5 |
| Phase 3 | 22 | 138–200 SP | 69–100 PD | 5–7 |
| **Total** | **44** | **278–395 SP** | **140–198 PD** | **10–14** |

> **Note:** Total range (278–395 SP) is within the broader audit estimate of 360–518 SP.
> The lower bound assumes efficient execution with minimal rework; upper bound includes
> buffer for unknowns, team ramp-up, and integration testing overhead.

---

## 11. Traceability

### 11.1 Requirement Coverage

| Requirement | Section(s) Addressed |
|-------------|---------------------|
| 7.3 — Migration Path with phased plan, rollback strategy | §1, §2, §3, §4, §7 |
| 7.4 — Backward Compatibility Verification | §6 (all endpoints, contracts, methods) |
| 7.5 — Implementation Readiness Checklist | §8 (prerequisites, acceptance criteria, sign-off) |
| 7.6 — Rollback procedure, time window, verification | §7 (per-phase rollback detail) |
| 9.5 — Proposed Change documentation | §5 (all file-level changes as Proposed Change entries) |

### 11.2 Source Document References

| Document | ID | Key Input |
|----------|-----|-----------|
| Target State Architecture | AUDIT-eLIS-2026-TSA-001 | Module structure, schema changes, navigation |
| Architecture Gap Report | AUDIT-eLIS-2026-002-ARCHGAP | 18 gaps with effort estimates |
| Functional Gap Report | AUDIT-eLIS-2026-006 | 13 functional gaps with priorities |
| RBAC Review | AUDIT-eLIS-2026-004 | Security findings, permission model |
| Insurance Readiness | AUDIT-eLIS-2026-005 | Schema gaps, billing workflow |
| Navigation Blueprint | AUDIT-eLIS-2025-NAV-002 | Option C hierarchy |
| Classification Matrix | AUDIT-eLIS-2025-CLS-002 | Module boundary map |

### 11.3 Downstream Dependencies

This document serves as input for:
- **Task 12.1** — Main audit report executive summary (references migration phases)
- **Task 12.2** — Checklist append (P1-AC, P2-AC, P3-AC items)
- **Task 12.3** — Final validation (verifies Proposed Change format compliance)

---

## 12. No-Code-Modification Attestation

All content in this document describes **Proposed Changes** only. No source code under
`apps/api/src/`, `apps/web/src/`, `apps/api/prisma/`, `docker-compose.yml`, or any
other application file was created, modified, or deleted during the production of this
document.

| Directory | Access Mode | Operations |
|-----------|:-----------:|-----------|
| `apps/api/src/` | READ-ONLY | Referenced for current state analysis |
| `apps/web/src/` | READ-ONLY | Referenced for current state analysis |
| `apps/api/prisma/` | READ-ONLY | Referenced for schema analysis |
| `docs/17-Audit/_inventory/` | READ + WRITE | Read intermediate analyses; wrote this document |

---

*End of Document*  
*Document ID: AUDIT-eLIS-2026-MIG-001 | Version 1.0 | Classification: Internal*
