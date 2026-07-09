# RBAC & User Management Review

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-004 |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

---

## Executive Summary

This document presents a comprehensive review of the Role-Based Access Control (RBAC) implementation in the eLIS (Enterprise Laboratory Information System) backend API. The review covers:

1. **Current RBAC Implementation** — complete documentation of roles, guards, and endpoint protection
2. **Enterprise Capability Evaluation** — assessment against 6 enterprise access control capabilities
3. **Access Matrix** — full role-to-endpoint mapping for all 83 API endpoints
4. **Approval Matrix Assessment** — evaluation of 4 critical business workflows
5. **Endpoint Security Audit** — identification of unguarded or insufficiently guarded endpoints

**Key Findings:**
- **17 endpoints** have insufficient role protection (4 public + 13 auth-only without role guard)
- **0 of 6** enterprise access control capabilities are implemented
- **3 of 4** critical workflows lack proper approval chains
- **Recommendation: Option B (Full RBAC)** with estimated 47 story points across 3 phases

**Critical Security Findings: 5** (see Section 5 for details)

---

## Table of Contents

1. [Current RBAC Implementation](#1-current-rbac-implementation)
2. [Enterprise Capability Evaluation](#2-enterprise-capability-evaluation)
3. [Access Matrix](#3-access-matrix)
4. [Approval Matrix Assessment](#4-approval-matrix-assessment)
5. [Endpoint Security Audit](#5-endpoint-security-audit)
6. [Recommendations](#6-recommendations)
7. [Cross-References](#7-cross-references)
8. [Access Mode Attestation](#8-access-mode-attestation)

---

## 1. Current RBAC Implementation

### 1.1 Role Definitions

The system defines **11 roles** in the Prisma `Role` enum (`apps/api/prisma/schema.prisma`):

| # | Role Value | Description | Endpoints Accessible (Effective) |
|---|-----------|-------------|:--------------------------------:|
| 1 | `SUPER_ADMIN` | Full system access; all management operations | 75 |
| 2 | `OWNER` | Business owner; dashboard analytics | 24 |
| 3 | `MANAGER` | Operational management; dashboards and reporting | 24 |
| 4 | `KASIR` | Cashier; payments, order creation, patient registration | 28 |
| 5 | `ADMIN` | Administrative; users, master data, settings, lab oversight | 74 |
| 6 | `SAMPLING` | Sample collection staff; sample receipt, lab queue | 21 |
| 7 | `ANALIS` | Lab analyst; enters/verifies results, delta checks | 24 |
| 8 | `DOKTER` | Doctor/pathologist; approves results, approval queue | 23 |
| 9 | `CS` | Customer service; patient registration, dashboard | 23 |
| 10 | `MARKETING` | Marketing staff; **no endpoints currently assigned** | 19 |
| 11 | `KLINIK_PARTNER` | Partner clinic; order creation, patient registration | 21 |

**Key Limitation:** Each user has exactly **one** role (single `role` field on User model). No multi-role assignment.

### 1.2 Guard Architecture

The RBAC system uses a two-layer guard approach:

```
Request → JwtAuthGuard (authentication) → RolesGuard (authorization) → Handler
```

| Component | Source | Function |
|-----------|--------|----------|
| `JwtAuthGuard` | `apps/api/src/common/guards/jwt-auth.guard.ts` | Validates JWT token; populates `request.user` |
| `RolesGuard` | `apps/api/src/common/guards/roles.guard.ts` | Checks `@Roles` metadata; flat role matching |
| `@Roles` decorator | `apps/api/src/common/decorators/roles.decorator.ts` | Sets required roles metadata |
| `@CurrentUser` | `apps/api/src/common/decorators/current-user.decorator.ts` | Extracts authenticated user |

**Critical behavior of RolesGuard:** If no `@Roles` decorator is present on an endpoint that has `@UseGuards(RolesGuard)`, the guard **passes all authenticated users** (returns `true`). This is a permissive-by-default design.

### 1.3 Endpoint Protection Summary

| Classification | Count | Percentage | Description |
|---------------|:-----:|:----------:|-------------|
| Fully protected (JwtAuthGuard + RolesGuard + @Roles) | 56 | 67.5% | Authenticated AND role-restricted |
| Authenticated only (JwtAuthGuard, no @Roles) | 13 | 15.7% | Any logged-in user can access |
| Intentionally public | 6 | 7.2% | Auth login, health check, region reference data |
| **Total** | **83** | **100%** | |

### 1.4 Guard Application Patterns

| Pattern | Controllers | Effect |
|---------|------------|--------|
| Class-level guards + class-level roles | TariffController, AuditController, SettingsController, DashboardController | All endpoints share same guards and roles |
| Class-level guards + method-level roles | UsersController | Guards applied once; each method specifies roles |
| Method-level guards + method-level roles | MasterDataController, OrderController, PatientController, LabWorkflowController | Each method independently declares guards and roles |
| No guards | AuthController, HealthController, RegionController (GET endpoints) | Public/unauthenticated access |

---

## 2. Enterprise Capability Evaluation

### 2.1 Capability Gap Assessment

| # | Enterprise Capability | Status | Impact |
|---|----------------------|:------:|--------|
| 1 | Granular Permission Management | ❌ MISSING | Cannot grant partial access (e.g., read tariffs without edit) |
| 2 | Role Hierarchy | ❌ MISSING | SUPER_ADMIN must be listed on every endpoint; no inheritance |
| 3 | Role Composition | ❌ MISSING | Single role per user; dual-function staff need multiple accounts |
| 4 | Department-Based Access | ❌ MISSING | No data scoping by organizational unit |
| 5 | Position-Based Access | ❌ MISSING | No seniority differentiation within same role |
| 6 | Approval Workflows | ❌ MISSING | Single-step guard check; no multi-level authorization (except lab workflow) |

**Result: 0 of 6 enterprise capabilities are implemented.**

### 2.2 Recommendation: Option B — Full RBAC

After evaluating three options:
- **Option A (Enhanced Role-Based):** Code-defined permissions; addresses 2/6 gaps; fast but limited
- **Option B (Full RBAC):** Database-driven permissions with separate Permission, RolePermission, UserRole entities; addresses 6/6 gaps
- **Option C (ABAC Hybrid):** Attribute-based policies; most flexible but disproportionate complexity

**Selected: Option B (Full RBAC)** based on:
1. Addresses all 6 capability gaps with proportional complexity
2. NIST RBAC (SP 800-162) alignment required for healthcare LIS
3. Runtime-configurable permissions (no redeployment for access changes)
4. Enables multi-branch data isolation required for BPJS compliance
5. Provides database-stored audit trail for regulatory compliance

### 2.3 Migration Path Summary

| Phase | Scope | Duration | Story Points |
|-------|-------|:--------:|:------------:|
| Phase 1: Foundation | Permission + RolePermission tables; PermissionGuard | 2 weeks | 13 SP |
| Phase 2: Multi-Role & Hierarchy | UserRole junction; role hierarchy; deprecate User.role | 2 weeks | 13 SP |
| Phase 3: Department & Position | Department, Position, UserDepartment entities; data scoping | 4 weeks | 21 SP |
| **Total** | | **8 weeks** | **47 SP** |

---

## 3. Access Matrix

### 3.1 Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Explicitly granted (via @Roles decorator) |
| 🔓 | Granted via authenticated access (JwtAuthGuard only, no @Roles) |
| 🌐 | Public endpoint (no guard) |
| ❌ | Denied |

### 3.2 Users Resource Group (5 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| POST /users | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /users | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /users/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /users/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /users/:id | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Legend: SA=SUPER_ADMIN, OW=OWNER, MG=MANAGER, KS=KASIR, AD=ADMIN, SM=SAMPLING, AN=ANALIS, DK=DOKTER, CS=CS, MK=MARKETING, KP=KLINIK_PARTNER*

### 3.3 Patients Resource Group (4 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| POST /patients | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | ✅ | 🔓 | ✅ |
| GET /patients | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| GET /patients/:id | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| PUT /patients/:id | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | ✅ | 🔓 | ❌ |

### 3.4 Orders & Payment Resource Group (7 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| POST /orders | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | ✅ |
| GET /orders | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| GET /orders/:id | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| POST /orders/:id/cancel | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /orders/:id/pay | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| GET /orders/:id/barcode | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| GET /orders/:id/invoice | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |

### 3.5 Master Data — Lab Tests (12 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| GET /master/test-categories | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| POST /master/test-categories | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /master/test-categories/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /master/test-categories/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /master/tests | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| POST /master/tests | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /master/tests/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /master/tests/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /master/panels | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| POST /master/panels | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /master/panels/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /master/panels/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.6 Master Data — Reference Entities (28 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| GET /master/{entity} (×7) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| POST /master/{entity} (×7) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /master/{entity}/:id (×7) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /master/{entity}/:id (×7) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Entities: doctors, clinics, insurances, equipments, reagents, sample-types, units*

### 3.7 Tariffs Resource Group (4 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| GET /master/tariffs | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /master/tariffs | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /master/tariffs/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DELETE /master/tariffs/:id | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Note**: Tariff read is restricted to ADMIN/SUPER_ADMIN, preventing KASIR from viewing prices during order entry. Recommended: grant `tariff:read` to KASIR in Full RBAC model.

### 3.8 Lab Workflow Resource Group (7 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| POST /lab/:orderId/sample | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /lab/queue | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /lab/approval-queue | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| PUT /lab/:orderId/results | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| GET /lab/:orderId/delta-check | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /lab/:orderId/verify | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| POST /lab/:orderId/approve | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### 3.9 Dashboard Resource Group (5 endpoints)

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| GET /dashboard/executive-summary | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| GET /dashboard/recent-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| GET /dashboard/lab-summary | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /dashboard/lab-volume | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /dashboard/region-distribution | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.10 Audit, Settings & Regions Resource Groups

| Action | SA | OW | MG | KS | AD | SM | AN | DK | CS | MK | KP |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| GET /audit-logs | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /settings/smtp | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PUT /settings/smtp | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| POST /settings/smtp/test | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GET /regions/* (×4) | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| POST /regions/sync | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.11 Access Matrix Summary

| Role | Explicit (✅) | Auth-Only (🔓) | Public (🌐) | Total Accessible |
|------|:------------:|:--------------:|:-----------:|:----------------:|
| SUPER_ADMIN | 56 | 13 | 6 | 75 |
| ADMIN | 55 | 13 | 6 | 74 |
| KASIR | 9 | 13 | 6 | 28 |
| OWNER | 5 | 13 | 6 | 24 |
| MANAGER | 5 | 13 | 6 | 24 |
| ANALIS | 5 | 13 | 6 | 24 |
| CS | 4 | 13 | 6 | 23 |
| DOKTER | 4 | 13 | 6 | 23 |
| SAMPLING | 2 | 13 | 6 | 21 |
| KLINIK_PARTNER | 2 | 13 | 6 | 21 |
| MARKETING | 0 | 13 | 6 | 19 |

---

## 4. Approval Matrix Assessment

### 4.1 Workflow Summary

| # | Workflow | Current Mechanism | Multi-Step Required? | Risk |
|---|----------|-------------------|:--------------------:|:----:|
| 1 | Lab Result Verification (ANALIS→DOKTER) | Two-step state machine | **No** — already implemented | Low |
| 2 | Financial Authorization (KASIR→MANAGER) | Single-role guard; no approval | **Yes** | High |
| 3 | Master Data Changes (ADMIN→SUPER_ADMIN) | Single-role guard; immediate effect | **Recommended** | Medium |
| 4 | User Account Management (ADMIN→OWNER) | Single-role guard; privilege escalation possible | **Yes** | Medium-High |

### 4.2 Lab Result Verification — Already Implemented ✅

The lab workflow properly implements separation of duties:
- ANALIS enters results → ANALIS verifies → DOKTER approves
- State machine (`OrderStateMachineService`) enforces valid transitions
- `verifiedBy` and `approvedBy` fields provide audit trail
- Auto-approval for routine tests (when `requiresDoctorApproval = false`)

**Minor gap:** ADMIN can both verify AND approve (present in both role lists), potentially bypassing separation-of-duties for lab workflows.

### 4.3 Financial Authorization — Critical Gap ⚠️

**Current state:** KASIR can process any payment or cancel any order without manager approval, regardless of amount.

**Recommended approval tiers:**
- **Tier 1 (Immediate):** Payments ≤ threshold; cancel PENDING orders
- **Tier 2 (MANAGER approval):** Payments > threshold; cancel PAID orders; price overrides
- **Tier 3 (OWNER/SUPER_ADMIN approval):** Bulk cancellations; void completed transactions

### 4.4 Master Data Changes — Recommended for Critical Entities

**High-impact entities requiring approval:** Tariffs (financial), Lab Tests (clinical), Insurance (claims)

**Recommended:** SUPER_ADMIN approval for Tariff price changes, Lab Test reference range modifications, and Insurance entity modifications.

### 4.5 User Account Management — Privilege Escalation Risk

**Current vulnerability:** An ADMIN can create users with SUPER_ADMIN role or elevate existing users to SUPER_ADMIN without any oversight.

**Recommended:**
- **Tier 1 (Immediate):** Create operational roles (KASIR, SAMPLING, ANALIS, CS, MARKETING, KLINIK_PARTNER)
- **Tier 2 (SUPER_ADMIN approval):** Create/elevate to DOKTER, MANAGER, ADMIN
- **Tier 3 (OWNER approval):** Create/elevate to SUPER_ADMIN, OWNER

### 4.6 Approval Matrix Implementation Effort

| Component | Story Points |
|-----------|:------------:|
| ApprovalRequest/ApprovalStep entities + migration | 5 |
| Approval service (create, decide, expire) | 5 |
| Financial threshold configuration | 2 |
| User role elevation guard | 3 |
| Master data critical entity detection | 2 |
| Notification integration | 5 |
| API endpoints for approval management | 5 |
| Frontend approval queue UI | 8 |
| **Total** | **35 SP** |

---

## 5. Endpoint Security Audit

**Validates: Requirements 5.6, 5.7**

This section documents all API endpoints that lack full role guard protection (`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles`). Per Requirement 5.7, any endpoint without explicit role guard protection is classified as a **Critical** security finding.

### 5.1 Security Findings Summary

| Severity | Count | Category |
|----------|:-----:|----------|
| **Critical** | 5 | Endpoints without role guard (privilege escalation / data exposure risk) |
| **Medium** | 4 | Public endpoints exposing reference data without authentication |
| **Total Findings** | **9** | |

### 5.2 Critical Security Findings

#### Finding RBAC-SEC-001: Patient List — No Role Restriction

| Field | Value |
|-------|-------|
| **Finding ID** | RBAC-SEC-001 |
| **Severity** | Critical |
| **Endpoint** | `GET /api/v1/patients` |
| **HTTP Method** | GET |
| **Module** | `laboratory/patient/` (PatientController) |
| **Current Guard** | `@UseGuards(JwtAuthGuard)` only — no `@Roles` decorator |
| **Issue** | Any authenticated user (including MARKETING, which has no business function) can view the complete patient list containing PII (names, dates of birth, addresses, insurance numbers) |
| **Data Sensitivity** | **High** — contains Protected Health Information (PHI) |
| **Recommended Minimum Role** | KASIR, CS, ADMIN, SAMPLING, ANALIS, DOKTER, KLINIK_PARTNER, SUPER_ADMIN |
| **Excluded Roles** | MARKETING, OWNER, MANAGER (no operational need for patient-level data) |

#### Finding RBAC-SEC-002: Patient Detail — No Role Restriction

| Field | Value |
|-------|-------|
| **Finding ID** | RBAC-SEC-002 |
| **Severity** | Critical |
| **Endpoint** | `GET /api/v1/patients/:id` |
| **HTTP Method** | GET |
| **Module** | `laboratory/patient/` (PatientController) |
| **Current Guard** | `@UseGuards(JwtAuthGuard)` only — no `@Roles` decorator |
| **Issue** | Any authenticated user can view individual patient records with full PII including medical history identifiers |
| **Data Sensitivity** | **High** — contains Protected Health Information (PHI) |
| **Recommended Minimum Role** | KASIR, CS, ADMIN, SAMPLING, ANALIS, DOKTER, KLINIK_PARTNER, SUPER_ADMIN |
| **Excluded Roles** | MARKETING, OWNER, MANAGER |

#### Finding RBAC-SEC-003: Order List & Detail — No Role Restriction

| Field | Value |
|-------|-------|
| **Finding ID** | RBAC-SEC-003 |
| **Severity** | Critical |
| **Endpoints** | `GET /api/v1/orders`, `GET /api/v1/orders/:id` |
| **HTTP Method** | GET |
| **Module** | `laboratory/order/` (OrderController) |
| **Current Guard** | `@UseGuards(JwtAuthGuard)` only — no `@Roles` decorator |
| **Issue** | Any authenticated user can view all orders including financial data (amounts, payment status, insurance references). Exposes business-sensitive financial information. |
| **Data Sensitivity** | **High** — contains financial data and patient references |
| **Recommended Minimum Role** | KASIR, CS, ADMIN, SAMPLING, ANALIS, DOKTER, KLINIK_PARTNER, SUPER_ADMIN |
| **Excluded Roles** | MARKETING (no operational need for order data) |

#### Finding RBAC-SEC-004: Payment & Invoice Endpoints — No Role Restriction

| Field | Value |
|-------|-------|
| **Finding ID** | RBAC-SEC-004 |
| **Severity** | Critical |
| **Endpoints** | `POST /api/v1/orders/:id/pay`, `GET /api/v1/orders/:id/barcode`, `GET /api/v1/orders/:id/invoice` |
| **HTTP Methods** | POST, GET |
| **Module** | `laboratory/payment/` (PaymentController) |
| **Current Guard** | `@UseGuards(JwtAuthGuard)` only — no `@Roles` decorator |
| **Issue** | Any authenticated user can process payments (financial transaction!) and access invoices/barcodes. The `POST /orders/:id/pay` endpoint is especially critical as it creates financial transactions. |
| **Data Sensitivity** | **Critical** — financial transaction execution |
| **Recommended Minimum Role (pay)** | KASIR, ADMIN, SUPER_ADMIN |
| **Recommended Minimum Role (barcode/invoice)** | KASIR, CS, ADMIN, SAMPLING, SUPER_ADMIN |
| **Excluded Roles** | MARKETING, OWNER, MANAGER, ANALIS, DOKTER, KLINIK_PARTNER (no cashier function) |

#### Finding RBAC-SEC-005: Master Data Read Endpoints — No Role Restriction

| Field | Value |
|-------|-------|
| **Finding ID** | RBAC-SEC-005 |
| **Severity** | Critical |
| **Endpoints** | 10 GET endpoints across master data (test-categories, tests, panels, doctors, clinics, insurances, equipments, reagents, sample-types, units) |
| **HTTP Method** | GET |
| **Module** | `laboratory/master-data/` (MasterDataController, ReferenceMasterController) |
| **Current Guard** | `@UseGuards(JwtAuthGuard)` only — no `@Roles` decorator |
| **Issue** | Any authenticated user can view all master data. While individually low-risk, collectively this exposes business-sensitive information (insurance contracts, tariff structures via related panels, equipment inventory) to roles with no operational need. |
| **Data Sensitivity** | **Medium** — business-sensitive reference data |
| **Recommended Minimum Role** | All operational roles (exclude only MARKETING if no business need) |
| **Mitigating Factor** | Master data is typically read by most operational workflows; broad read access may be intentional |

### 5.3 Medium Severity Findings — Public Endpoints

#### Finding RBAC-SEC-006: Region Endpoints — Public Without Authentication

| Field | Value |
|-------|-------|
| **Finding ID** | RBAC-SEC-006 |
| **Severity** | Medium |
| **Endpoints** | `GET /api/v1/regions/provinsi`, `GET /api/v1/regions/kabupaten-kota`, `GET /api/v1/regions/kecamatan`, `GET /api/v1/regions/kelurahan-desa` |
| **HTTP Method** | GET |
| **Module** | `laboratory/region/` (RegionController) |
| **Current Guard** | None — completely public |
| **Issue** | Exposes Indonesian administrative region hierarchy data to unauthenticated users. While this is publicly available reference data, it increases the API attack surface and allows enumeration without credentials. |
| **Data Sensitivity** | **Low** — publicly available government reference data |
| **Recommended Minimum Role** | Any authenticated user (add `@UseGuards(JwtAuthGuard)` minimum) |
| **Mitigating Factor** | Region data is used in patient registration forms; public access may be intentional for unauthenticated form pre-population |
| **Alternative** | If public access is required, rate-limit these endpoints to prevent abuse |

### 5.4 Intentionally Public Endpoints (No Finding)

The following endpoints are correctly public by design:

| # | Endpoint | Justification |
|---|----------|---------------|
| 1 | `POST /api/v1/auth/login` | Authentication entry point — must be public |
| 2 | `GET /api/v1/health` | Infrastructure health check for monitoring tools |

### 5.5 Complete Unguarded Endpoint Inventory

| # | Endpoint | HTTP | Module | Guard Status | Severity | Recommended Action |
|---|----------|:----:|--------|:------------:|:--------:|-------------------|
| 1 | `/api/v1/patients` | GET | patient | JwtAuth only | Critical | Add @Roles restriction |
| 2 | `/api/v1/patients/:id` | GET | patient | JwtAuth only | Critical | Add @Roles restriction |
| 3 | `/api/v1/orders` | GET | order | JwtAuth only | Critical | Add @Roles restriction |
| 4 | `/api/v1/orders/:id` | GET | order | JwtAuth only | Critical | Add @Roles restriction |
| 5 | `/api/v1/orders/:id/pay` | POST | payment | JwtAuth only | Critical | Add @Roles (KASIR, ADMIN) |
| 6 | `/api/v1/orders/:id/barcode` | GET | payment | JwtAuth only | Critical | Add @Roles restriction |
| 7 | `/api/v1/orders/:id/invoice` | GET | payment | JwtAuth only | Critical | Add @Roles restriction |
| 8 | `/api/v1/master/test-categories` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 9 | `/api/v1/master/tests` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 10 | `/api/v1/master/panels` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 11 | `/api/v1/master/doctors` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 12 | `/api/v1/master/clinics` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 13 | `/api/v1/master/insurances` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 14 | `/api/v1/master/equipments` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 15 | `/api/v1/master/reagents` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 16 | `/api/v1/master/sample-types` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 17 | `/api/v1/master/units` | GET | master-data | JwtAuth only | Critical | Add @Roles (all operational) |
| 18 | `/api/v1/regions/provinsi` | GET | region | None | Medium | Add JwtAuthGuard minimum |
| 19 | `/api/v1/regions/kabupaten-kota` | GET | region | None | Medium | Add JwtAuthGuard minimum |
| 20 | `/api/v1/regions/kecamatan` | GET | region | None | Medium | Add JwtAuthGuard minimum |
| 21 | `/api/v1/regions/kelurahan-desa` | GET | region | None | Medium | Add JwtAuthGuard minimum |

### 5.6 Risk Assessment Matrix

| Finding | Likelihood | Impact | Overall Risk | Remediation Effort |
|---------|:----------:|:------:|:------------:|:------------------:|
| RBAC-SEC-001 (Patient List) | High | High (PHI exposure) | **Critical** | S (≤2 SP) |
| RBAC-SEC-002 (Patient Detail) | High | High (PHI exposure) | **Critical** | S (≤2 SP) |
| RBAC-SEC-003 (Order List/Detail) | High | High (financial data) | **Critical** | S (≤2 SP) |
| RBAC-SEC-004 (Payment/Invoice) | Medium | Critical (financial txn) | **Critical** | S (≤2 SP) |
| RBAC-SEC-005 (Master Data Read) | Medium | Medium (business data) | **Critical** | S (≤2 SP) |
| RBAC-SEC-006 (Regions Public) | Low | Low (public data) | **Medium** | S (≤2 SP) |

**Total remediation effort for security findings: 12 SP (6 findings × 2 SP each)**

### 5.7 Proposed Changes (Documentation Only)

Per Requirement 9.5, all recommendations are documented as "Proposed Changes" — no source code is modified.

#### Proposed Change 1: PatientController — Add @Roles to GET endpoints

| Field | Value |
|-------|-------|
| **File Path** | `apps/api/src/laboratory/patient/patient.controller.ts` |
| **Current Code (reference)** | `@UseGuards(JwtAuthGuard)` on GET /patients and GET /patients/:id without @Roles |
| **Proposed Change** | Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER, Role.SUPER_ADMIN)` |
| **Risk Assessment** | Low — restricts read access to operational roles only; MARKETING, OWNER, MANAGER lose patient access |

#### Proposed Change 2: OrderController — Add @Roles to GET endpoints

| Field | Value |
|-------|-------|
| **File Path** | `apps/api/src/laboratory/order/order.controller.ts` |
| **Current Code (reference)** | `@UseGuards(JwtAuthGuard)` on GET /orders and GET /orders/:id without @Roles |
| **Proposed Change** | Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER, Role.SUPER_ADMIN)` |
| **Risk Assessment** | Low — operational roles retain access; management roles lose direct order access |

#### Proposed Change 3: PaymentController — Add @Roles with restricted access

| Field | Value |
|-------|-------|
| **File Path** | `apps/api/src/laboratory/payment/payment.controller.ts` |
| **Current Code (reference)** | `@UseGuards(JwtAuthGuard)` on POST /pay, GET /barcode, GET /invoice without @Roles |
| **Proposed Change** | `POST /pay`: Add `@Roles(Role.KASIR, Role.ADMIN, Role.SUPER_ADMIN)`. `GET /barcode, /invoice`: Add `@Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SAMPLING, Role.SUPER_ADMIN)` |
| **Risk Assessment** | Medium — payment execution restricted to cashier roles; requires testing to ensure order workflow not broken |

#### Proposed Change 4: MasterDataController — Add @Roles to GET endpoints

| Field | Value |
|-------|-------|
| **File Path** | `apps/api/src/laboratory/master-data/master-data.controller.ts`, `reference-master.controller.ts` |
| **Current Code (reference)** | `@UseGuards(JwtAuthGuard)` on all GET master data endpoints without @Roles |
| **Proposed Change** | Add `@Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.SAMPLING, Role.ANALIS, Role.DOKTER, Role.KLINIK_PARTNER, Role.OWNER, Role.MANAGER, Role.SUPER_ADMIN)` (all roles except MARKETING) |
| **Risk Assessment** | Low — effectively same as current behavior (all operational roles need master data); only excludes MARKETING |

#### Proposed Change 5: RegionController — Add JwtAuthGuard to GET endpoints

| Field | Value |
|-------|-------|
| **File Path** | `apps/api/src/laboratory/region/region.controller.ts` |
| **Current Code (reference)** | No guards on GET /regions/* endpoints |
| **Proposed Change** | Add `@UseGuards(JwtAuthGuard)` to GET endpoints. If public access is required for patient registration forms, implement rate limiting instead. |
| **Risk Assessment** | Medium — may break unauthenticated patient registration flow if frontend uses region data before login |

---

## 6. Recommendations

### 6.1 Immediate Actions (Sprint 1)

| Priority | Action | Finding | Effort |
|:--------:|--------|---------|:------:|
| P1 | Add `@Roles` to patient GET endpoints | RBAC-SEC-001, 002 | 2 SP |
| P1 | Add `@Roles` to payment POST endpoint | RBAC-SEC-004 | 2 SP |
| P1 | Add `@Roles` to order GET endpoints | RBAC-SEC-003 | 2 SP |
| P1 | Add `@Roles` to barcode/invoice endpoints | RBAC-SEC-004 | 1 SP |
| P2 | Add `@Roles` to master data GET endpoints | RBAC-SEC-005 | 2 SP |
| P3 | Add JwtAuthGuard to region endpoints (or rate limit) | RBAC-SEC-006 | 2 SP |

**Total immediate remediation: 11 SP**

### 6.2 Short-Term Actions (Sprint 2-3)

| Priority | Action | Effort |
|:--------:|--------|:------:|
| P1 | Implement user role elevation guard (prevent ADMIN→SUPER_ADMIN escalation) | 3 SP |
| P1 | Add financial transaction threshold checking | 5 SP |
| P2 | Add `verifiedBy !== approvedBy` business rule in lab workflow | 2 SP |
| P2 | Begin Full RBAC Phase 1 (Permission tables) | 13 SP |

### 6.3 Medium-Term Actions (Sprint 4-8)

| Priority | Action | Effort |
|:--------:|--------|:------:|
| P2 | Full RBAC Phase 2: Multi-role + hierarchy | 13 SP |
| P2 | Approval matrix implementation | 35 SP |
| P3 | Full RBAC Phase 3: Department + Position | 21 SP |

### 6.4 Database Schema Proposal Summary

The Full RBAC implementation requires **6 new entities**:

| Entity | Purpose | Relations |
|--------|---------|-----------|
| `Permission` | Action-level permissions (`resource:action`) | → RolePermission |
| `RolePermission` | Junction: Role → Permission | → RoleEntity, Permission |
| `RoleEntity` | Database-stored roles (replaces enum) | → RolePermission, UserRole, self-referencing hierarchy |
| `UserRole` | Multi-role per user | → User, RoleEntity |
| `Department` | Organizational unit | → Position, UserDepartment, self-referencing hierarchy |
| `Position` | Job position within department | → Department |
| `UserDepartment` | User-to-department assignment | → User, Department |

**Total unique permissions to seed: 60** (mapped from current 83 endpoints)

---

## 7. Cross-References

*Cross-reference format: `[Document ID]#[Finding ID]`*

### 7.1 Internal Findings Cross-Referenced to Other Audit Documents

| Finding ID | This Document | Related Document | Link |
|-----------|---------------|-----------------|------|
| RBAC-SEC-001 | §5 Endpoint Security Audit | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#RBAC-SEC-001 |
| RBAC-SEC-002 | §5 Endpoint Security Audit | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#RBAC-SEC-002 |
| RBAC-SEC-003 | §5 Endpoint Security Audit | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#RBAC-SEC-003 |
| RBAC-SEC-004 | §5 Endpoint Security Audit | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#RBAC-SEC-004 |
| RBAC-SEC-005 | §5 Endpoint Security Audit | Main Audit Report — Finding 5 | [AUDIT-eLIS-2026-001]#RBAC-SEC-005 |
| RBAC-CAP-001 | §2 Capability Gaps | Architecture Gap Analysis — Dashboard | [AUDIT-eLIS-2026-002]#RBAC-CAP-001 |

### 7.2 Cross-References to Related Audit Documents

| Source | Related Document | Document ID | Relationship |
|--------|-----------------|-------------|:------------:|
| RBAC-SEC-001–005 | Architecture Gap Analysis | [AUDIT-eLIS-2026-002]#GAP-ARCH-SEC-001 | causes |
| §2 Capability Gaps | Architecture Gap Analysis | [AUDIT-eLIS-2026-002]#GAP-FUNC-RBAC | related-to |
| §4 Approval Matrix | Insurance Readiness | [AUDIT-eLIS-2026-005]#INS-BIL-001 | related-to |
| §6 Recommendations | Main Audit Report | [AUDIT-eLIS-2026-001]#REC-RBAC-001 | resolves |
| RBAC-SEC-004 | Insurance Readiness | [AUDIT-eLIS-2026-005]#INS-PAY-001 | causes |
| RBAC-SEC-006 | Navigation Review | [AUDIT-eLIS-2026-003]#NAV-GAP-001 | related-to |

### 7.3 Audit Document Index

| Document ID | Title | Location |
|-------------|-------|----------|
| AUDIT-eLIS-2026-001 | Enterprise Admin Audit Report | `docs/17-Audit/enterprise-admin-audit-report.md` |
| AUDIT-eLIS-2026-002 | Architecture Gap Analysis | `docs/17-Audit/architecture-gap-analysis.md` |
| AUDIT-eLIS-2026-003 | Navigation Review | `docs/17-Audit/navigation-review.md` |
| AUDIT-eLIS-2026-004 | RBAC & User Management Review (this document) | `docs/17-Audit/rbac-review.md` |
| AUDIT-eLIS-2026-005 | Insurance & Healthcare Readiness | `docs/17-Audit/insurance-readiness.md` |

---

## 8. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|:-----------:|---------------------|
| `apps/api/prisma/schema.prisma` | READ-ONLY | Read Role enum, User model |
| `apps/api/src/common/guards/` | READ-ONLY | Read JwtAuthGuard, RolesGuard implementations |
| `apps/api/src/common/decorators/` | READ-ONLY | Read @Roles, @CurrentUser decorators |
| `apps/api/src/auth/` | READ-ONLY | Read AuthController guard analysis |
| `apps/api/src/users/` | READ-ONLY | Read UsersController guard analysis |
| `apps/api/src/health/` | READ-ONLY | Read HealthController guard analysis |
| `apps/api/src/laboratory/master-data/` | READ-ONLY | Read all master data controllers |
| `apps/api/src/laboratory/order/` | READ-ONLY | Read OrderController guards |
| `apps/api/src/laboratory/patient/` | READ-ONLY | Read PatientController guards |
| `apps/api/src/laboratory/payment/` | READ-ONLY | Read PaymentController guards |
| `apps/api/src/laboratory/region/` | READ-ONLY | Read RegionController guards |
| `apps/api/src/laboratory/lab-workflow/` | READ-ONLY | Read LabWorkflowController guards |
| `apps/api/src/laboratory/dashboard/` | READ-ONLY | Read DashboardController guards |
| `apps/api/src/laboratory/audit/` | READ-ONLY | Read AuditController guards |
| `apps/api/src/laboratory/notification/` | READ-ONLY | Read SettingsController guards |
| `docs/17-Audit/_inventory/` | READ-ONLY | Used as input for this analysis |
| `docs/17-Audit/` | READ + WRITE | Wrote this documentation |

**No source code files were created, modified, or deleted during this audit.**

---

*End of RBAC & User Management Review — AUDIT-eLIS-2026-004 v1.0*
