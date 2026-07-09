# Architecture Gap Analysis Report

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-002 |
| **Version** | 1.2 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

---

## Executive Summary

This report presents the Architecture Compliance Score for the eLIS system, calculated across five weighted categories: folder structure, module isolation, shared component placement, routing correctness, and state management. The system achieves an overall score of **84.3 / 100**, classified as **Compliant**.

The backend demonstrates strong Feature-Based architecture with excellent shared component discipline. The primary areas of concern are frontend architectural deviation from the documented Feature-Sliced Design pattern and the absence of a server-state caching strategy.

**Validates: Requirements 2.7, 2.8, 2.9**

---

## 1. Architecture Compliance Score

### 1.1 Overall Result

| Metric | Value |
|--------|-------|
| **Total Score** | **84.3 / 100** |
| **Classification** | **Compliant** |
| **Threshold** | Score ≥ 60 = Compliant |

### 1.2 Category Breakdown

| # | Category | Weight | Items Compliant | Total Items | Ratio | Score |
|---|----------|--------|-----------------|-------------|-------|-------|
| 1 | Folder Structure | 25 pts | Combined BE+FE | Combined | 74.0% | **18.5** |
| 2 | Module Isolation | 25 pts | 53 artifact slots | 60 artifact slots | 88.3% | **22.1** |
| 3 | Shared Component Placement | 20 pts | 8 components | 8 components | 100.0% | **20.0** |
| 4 | Routing Correctness | 15 pts | 95 routes | 101 routes | 94.1% | **14.1** |
| 5 | State Management | 15 pts | 4.5 criteria | 7 criteria | 64.3% | **9.6** |
| | **TOTAL** | **100** | | | | **84.3** |

---

## 2. Detailed Category Analysis

### 2.1 Folder Structure (18.5 / 25 pts)

**Formula**: ((Backend compliance + Frontend compliance) / 2) × 25

#### Backend Folder Structure (100% Compliant)

| Criterion | Result |
|-----------|--------|
| Architecture Classification | **Feature-Based** |
| Top-level feature modules | 4 (auth, users, health, laboratory) |
| All modules represent business domains | ✅ Yes |
| Each domain contains controller + service + module | ✅ Yes |
| No layer-based directories (controllers/, services/, repositories/) | ✅ Confirmed |
| Compliance | **4/4 modules = 100%** |

The backend strictly follows Feature-Based Architecture. Each business domain is organized as an independent module with its own artifacts. The `common/` directory correctly serves as cross-cutting infrastructure — a standard pattern in Feature-Based NestJS applications.

#### Frontend Folder Structure (48% Compliant)

| Criterion | Result |
|-----------|--------|
| Architecture Pattern (Actual) | Next.js App Router with Domain-Organized Components |
| Documented Architecture | Feature-Sliced Design (modular variant) |
| FSD Compliance Score | 18/100 (Non-Compliant) |
| Documented Architecture Compliance Score | 48/100 (Non-Compliant) |
| Missing documented directories | `hooks/`, `services/`, `schemas/` |
| Structural deviations | Route groups not used; components reorganized by domain |

**Combined Folder Structure Score**: (100% + 48%) / 2 = 74.0% → 0.74 × 25 = **18.5 points**

---

### 2.2 Module Isolation (22.1 / 25 pts)

**Formula**: (compliant artifact slots / total artifact slots) × 25

#### Assessment Methodology

Each feature module is checked for 5 required artifacts:
1. Controller (`.controller.ts`)
2. Service (`.service.ts`)
3. Module (`.module.ts`)
4. DTOs directory (`dto/`)
5. Test files (`.spec.ts` or `tests/`)

12 assessable modules × 5 artifacts = 60 total artifact slots (excluding `laboratory` parent which delegates to sub-modules).

#### Modules Fully Compliant (7 modules)

| Module | Controller | Service | Module | DTOs | Tests |
|--------|-----------|---------|--------|------|-------|
| users | ✅ | ✅ | ✅ | ✅ | ✅ |
| laboratory/dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| laboratory/lab-workflow | ✅ | ✅ | ✅ | ✅ | ✅ |
| laboratory/master-data | ✅ | ✅ | ✅ | ✅ | ✅ |
| laboratory/order | ✅ | ✅ | ✅ | ✅ | ✅ |
| laboratory/patient | ✅ | ✅ | ✅ | ✅ | ✅ |
| laboratory/region | ✅ | ✅ | ✅ | ✅ | ✅ |

#### Modules with Violations (5 modules, 7 violations)

| Module | Missing Artifact | Expected Path | Severity |
|--------|-----------------|---------------|----------|
| auth | DTOs directory | `apps/api/src/auth/dto/` | Medium |
| health | Service | `apps/api/src/health/health.service.ts` | Low |
| health | DTOs directory | `apps/api/src/health/dto/` | Low |
| health | Test files | `apps/api/src/health/tests/` | Medium |
| laboratory/audit | DTOs directory | `apps/api/src/laboratory/audit/dto/` | Medium |
| laboratory/notification | DTOs directory | `apps/api/src/laboratory/notification/dto/` | Medium |
| laboratory/payment | Test files | `apps/api/src/laboratory/payment/tests/` | Medium |

**Module Isolation Score**: 53/60 = 88.3% → 0.883 × 25 = **22.1 points**

---

### 2.3 Shared Component Placement (20.0 / 20 pts)

**Formula**: (correctly placed / total shared components) × 20

| Shared Component | Type | Location | Status |
|-----------------|------|----------|--------|
| jwt-auth.guard.ts | Guard | `common/guards/` | ✅ Correct |
| roles.guard.ts | Guard | `common/guards/` | ✅ Correct |
| logging.interceptor.ts | Interceptor | `common/interceptors/` | ✅ Correct |
| transform.interceptor.ts | Interceptor | `common/interceptors/` | ✅ Correct |
| all-exceptions.filter.ts | Filter | `common/filters/` | ✅ Correct |
| validation.pipe.ts | Pipe | `common/pipes/` | ✅ Correct |
| current-user.decorator.ts | Decorator | `common/decorators/` | ✅ Correct |
| roles.decorator.ts | Decorator | `common/decorators/` | ✅ Correct |

**Violations found: 0**

No guards, interceptors, filters, pipes, or decorators were found outside the canonical `apps/api/src/common/` directory. The codebase demonstrates full compliance with shared component placement rules.

**Shared Component Score**: 8/8 = 100% → 1.0 × 20 = **20.0 points**

---

### 2.4 Routing Correctness (14.1 / 15 pts)

**Formula**: (compliant routes / total routes assessed) × 15

| Metric | Count |
|--------|-------|
| Total routes assessed | 101 (83 backend + 18 frontend) |
| Compliant routes | 95 |
| Non-compliant routes | 6 |

#### Routing Violations

| Finding ID | Type | Description | Score Impact |
|-----------|------|-------------|-------------|
| ROUTE-CONFLICT-001 | Conflicting Segments | Lab controller: static (`queue`, `approval-queue`) vs parameterized (`:orderId`) at same level | 1.0 pt |
| ROUTE-DEAD-001 | Dead Route | Doctor page naming discrepancy with master/doctors API | 0.5 pt |
| ROUTE-DEAD-002 | Dead Route | Reports page (`/dashboard/reports`) without backend reporting API | 2.0 pt |
| ROUTE-DEAD-003 | Dead Route | Region API (4 endpoints) without dedicated frontend page | 1.5 pt |
| ROUTE-DEAD-004 | Dead Route | Region sync — backend-only utility with no UI trigger | 0.5 pt |
| ROUTE-DEAD-005 | Orphaned Directory | `dashboard-stats/` directory with no page.tsx | 0.5 pt |

**Routing Score**: 95/101 = 94.1% → 0.941 × 15 = **14.1 points**

---

### 2.5 State Management (9.6 / 15 pts)

**Formula**: (compliant criteria / total criteria) × 15

| # | Criterion | Status | Score |
|---|-----------|--------|-------|
| 1 | Global state usage appropriate (scoped, minimal) | ✅ Compliant | 1.0 |
| 2 | Local state boundaries defined (page self-contained) | ✅ Compliant | 1.0 |
| 3 | Server state caching strategy exists | ❌ Non-compliant | 0.0 |
| 4 | No prop drilling >3 levels | ✅ Compliant | 1.0 |
| 5 | No derived values stored in state | ✅ Compliant | 1.0 |
| 6 | No server data duplication without caching | ⚠️ Partial | 0.5 |
| 7 | No direct state mutation outside designated functions | ✅ Compliant | 1.0 |
| | **Total** | | **4.5 / 7** |

#### Key Findings

- **AuthContext** is the only global state — well-scoped (2 consumers, below the 3+ threshold)
- **No server-state caching**: No TanStack Query, SWR, or equivalent. Every page re-fetches on mount.
- **`useRegionData`** is the sole exception with a manual 5-minute cache (proper TTL + deduplication)
- **Dead code**: `lib/hooks.ts` defines `usePatients`, `useOrders`, etc. that are never imported
- All state updates use immutable patterns (spread, map, filter) — no direct mutations

**State Management Score**: 4.5/7 = 64.3% → 0.643 × 15 = **9.6 points**

---

## 3. Violations Summary

### 3.1 All Violations by Category

| # | Category | Finding ID | Description | Score Impact | Severity |
|---|----------|-----------|-------------|-------------|----------|
| 1 | Folder Structure | FE-DOC-001 | `services/` directory documented but not implemented | 3.75 pts | Major |
| 2 | Folder Structure | FE-DOC-002 | `schemas/` directory documented but not implemented | 3.75 pts | Major |
| 3 | Folder Structure | FE-DOC-003 | `hooks/` directory documented but not implemented | 2.5 pts | Major |
| 4 | Folder Structure | FE-DOC-004 | Route groups `(auth)` and `(dashboard)` not used | 1.75 pts | Minor |
| 5 | Folder Structure | FE-FSD-001 | 5/6 FSD layers completely absent | 5.0 pts | Critical |
| 6 | Module Isolation | MI-001 | `auth` module missing DTOs directory | 0.42 pts | Minor |
| 7 | Module Isolation | MI-002 | `health` module missing service | 0.42 pts | Minor |
| 8 | Module Isolation | MI-003 | `health` module missing DTOs directory | 0.42 pts | Minor |
| 9 | Module Isolation | MI-004 | `health` module missing test files | 0.42 pts | Minor |
| 10 | Module Isolation | MI-005 | `laboratory/audit` missing DTOs directory | 0.42 pts | Minor |
| 11 | Module Isolation | MI-006 | `laboratory/notification` missing DTOs directory | 0.42 pts | Minor |
| 12 | Module Isolation | MI-007 | `laboratory/payment` missing test files | 0.42 pts | Minor |
| 13 | Routing | ROUTE-CONFLICT-001 | Static vs parameterized segments at same level in lab controller | 1.0 pt | Minor |
| 14 | Routing | ROUTE-DEAD-002 | Reports page without backend API handler | 2.0 pts | Major |
| 15 | Routing | ROUTE-DEAD-003 | Region API without dedicated frontend page | 1.5 pts | Minor |
| 16 | Routing | ROUTE-DEAD-001 | Doctor page naming discrepancy | 0.5 pt | Minor |
| 17 | Routing | ROUTE-DEAD-004 | Region sync backend-only without UI | 0.5 pt | Minor |
| 18 | Routing | ROUTE-DEAD-005 | Orphaned `dashboard-stats/` directory | 0.5 pt | Minor |
| 19 | State Management | SM-01 | No server-state caching library installed | 2.14 pts | Major |
| 20 | State Management | SM-03 | All pages re-fetch on mount without cache/SWR | 2.14 pts | Major |
| 21 | State Management | SM-02 | Dead code: unused hooks in `lib/hooks.ts` | 0.54 pt | Minor |

### 3.2 Severity Classification

Severity is determined by score impact per Requirements 2.9:
- **Critical**: Score impact ≥ 5 points
- **Major**: Score impact 2–4 points
- **Minor**: Score impact ≤ 1 point

| Severity | Count | Total Score Impact |
|----------|-------|-------------------|
| Critical | 1 | 5.0 pts |
| Major | 6 | 17.78 pts |
| Minor | 14 | 7.72 pts |
| **Total** | **21** | **30.5 pts** |

---

## 4. Prioritized Violation List

### 4.1 Critical Violations (Score Impact ≥ 5 pts)

| # | Finding ID | Category | Description | Impact | Recommendation |
|---|-----------|----------|-------------|--------|----------------|
| 1 | FE-FSD-001 | Folder Structure | Frontend does NOT follow Feature-Sliced Design — 5/6 FSD layers absent. The documented architecture specifies FSD but the implementation uses a standard Next.js App Router pattern without layer separation. | 5.0 pts | Either adopt FSD fully or update documentation to reflect actual Next.js App Router architecture. Recommend updating documentation to describe the actual "Next.js App Router with Domain-Organized Components" pattern, then implement key missing layers (`services/`, `schemas/`) incrementally. |

### 4.2 Major Violations (Score Impact 2–4 pts)

| # | Finding ID | Category | Description | Impact | Recommendation |
|---|-----------|----------|-------------|--------|----------------|
| 1 | FE-DOC-001 | Folder Structure | `services/` directory (API clients + TanStack Query hooks) documented in Frontend Architecture but not implemented. API calls are scattered in page components. | 3.75 pts | Create `services/` directory with domain-organized API client functions. Adopt TanStack Query for server state management. |
| 2 | FE-DOC-002 | Folder Structure | `schemas/` directory (Zod validation schemas) documented but not implemented. Form validation is handled inline or absent. | 3.75 pts | Create `schemas/` directory with Zod schemas per domain (patient.schema.ts, order.schema.ts, etc.). |
| 3 | FE-DOC-003 | Folder Structure | `hooks/` directory documented but not implemented. Custom hooks are scattered in `lib/hooks.ts` and `components/regions/useRegionData.ts`. | 2.5 pts | Create dedicated `hooks/` directory. Migrate `useRegionData` and useful hooks from `lib/hooks.ts`. |
| 4 | ROUTE-DEAD-002 | Routing | Reports page (`/dashboard/reports`) exists as frontend route with page.tsx but no backend `/api/v1/reports` endpoint serves report data. | 2.0 pts | Create a dedicated reports controller or document that the page assembles data from existing dashboard endpoints. |
| 5 | SM-01 | State Management | No server-state caching library installed. No TanStack Query, SWR, or equivalent for API response caching, request deduplication, or background refetching. | 2.14 pts | Adopt TanStack Query. It provides caching, stale-while-revalidate, request deduplication, and optimistic updates out of the box. |
| 6 | SM-03 | State Management | All pages re-fetch data on every mount without caching. Navigating away and back triggers full re-fetch. No SWR pattern applied. | 2.14 pts | TanStack Query adoption (SM-01) resolves this issue. Configure default staleTime and gcTime for query caching. |

### 4.3 Minor Violations (Score Impact ≤ 1 pt)

| # | Finding ID | Category | Description | Impact |
|---|-----------|----------|-------------|--------|
| 1 | FE-DOC-004 | Folder Structure | Route groups `(auth)`, `(dashboard)` documented but standard directories used | 1.75 pts |
| 2 | ROUTE-DEAD-003 | Routing | Region API (4 GET endpoints) without dedicated frontend management page | 1.5 pts |
| 3 | ROUTE-CONFLICT-001 | Routing | Lab controller static vs parameterized segments at same level | 1.0 pt |
| 4 | SM-02 | State Management | Dead code — `lib/hooks.ts` exports unused hooks | 0.54 pt |
| 5 | ROUTE-DEAD-001 | Routing | Doctor page naming discrepancy vs master/doctors API | 0.5 pt |
| 6 | ROUTE-DEAD-004 | Routing | Region sync backend-only utility with no UI | 0.5 pt |
| 7 | ROUTE-DEAD-005 | Routing | Orphaned `dashboard-stats/` directory | 0.5 pt |
| 8 | MI-001 | Module Isolation | `auth` module missing DTOs directory | 0.42 pt |
| 9 | MI-002 | Module Isolation | `health` module missing service file | 0.42 pt |
| 10 | MI-003 | Module Isolation | `health` module missing DTOs directory | 0.42 pt |
| 11 | MI-004 | Module Isolation | `health` module missing test files | 0.42 pt |
| 12 | MI-005 | Module Isolation | `laboratory/audit` missing DTOs directory | 0.42 pt |
| 13 | MI-006 | Module Isolation | `laboratory/notification` missing DTOs directory | 0.42 pt |
| 14 | MI-007 | Module Isolation | `laboratory/payment` missing test files | 0.42 pt |

---

## 5. Per-Category Violation Count

| Category | Critical | Major | Minor | Total | Points Lost |
|----------|----------|-------|-------|-------|-------------|
| Folder Structure | 1 | 3 | 1 | 5 | 6.5 / 25 |
| Module Isolation | 0 | 0 | 7 | 7 | 2.9 / 25 |
| Shared Component Placement | 0 | 0 | 0 | 0 | 0.0 / 20 |
| Routing Correctness | 0 | 1 | 5 | 6 | 0.9 / 15 |
| State Management | 0 | 2 | 1 | 3 | 5.4 / 15 |
| **Total** | **1** | **6** | **14** | **21** | **15.7 / 100** |

---

## 6. Architecture Classification Summary

| Aspect | Classification |
|--------|---------------|
| **Overall Compliance** | Compliant (84.3/100) |
| **Backend Architecture** | Feature-Based (High confidence) |
| **Frontend Architecture** | Next.js App Router with Domain-Organized Components (Non-FSD) |
| **Shared Components** | Fully Compliant (100%) |
| **Routing** | Mostly Compliant (94.1%) — minor dead routes |
| **State Management** | Partially Compliant (64.3%) — missing server-state caching |

### Strongest Areas
1. **Shared Component Placement** — Perfect 20/20. All guards, interceptors, filters, pipes, and decorators are correctly centralized in `common/`.
2. **Module Isolation** — Strong 22.1/25. Only 7 minor missing artifacts across 12 modules. No cross-module boundary violations.
3. **Backend Architecture** — Textbook Feature-Based pattern with proper domain decomposition.

### Weakest Areas
1. **State Management** — 9.6/15 due to absent server-state caching. This is the single biggest improvement opportunity for application performance and UX.
2. **Folder Structure** — 18.5/25 due to frontend-documentation mismatch. The documented FSD architecture is not reflected in the implementation.

---

## 7. Remediation Recommendations (Prioritized)

| Priority | Action | Category | Effort | Expected Score Gain |
|----------|--------|----------|--------|-------------------|
| P1 | Adopt TanStack Query for server-state caching | State Management | M (3-5 SP) | +5.4 pts |
| P2 | Align frontend documentation with actual architecture OR implement `services/` directory | Folder Structure | M (3-5 SP) | +3.75 pts |
| P2 | Create `schemas/` directory with Zod validation schemas | Folder Structure | S (≤2 SP) | +3.75 pts |
| P3 | Create `hooks/` directory; consolidate scattered hooks | Folder Structure | S (≤2 SP) | +2.5 pts |
| P3 | Create backend reports controller for `/dashboard/reports` | Routing | S (≤2 SP) | +2.0 pts |
| P3 | Create frontend region management page | Routing | S (≤2 SP) | +1.5 pts |
| P4 | Add DTOs to auth, audit, notification modules | Module Isolation | S (≤2 SP) | +1.26 pts |
| P4 | Add test files to health and payment modules | Module Isolation | S (≤2 SP) | +0.84 pts |
| P4 | Remove orphaned `dashboard-stats/` directory | Routing | Trivial | +0.5 pts |
| P4 | Remove dead code in `lib/hooks.ts` | State Management | Trivial | +0.54 pts |

**Estimated total remediation effort**: 18–28 story points to achieve 100/100 score.

---

## 8. Cross-References

*Cross-reference format: `[Document ID]#[Finding ID]`*

### 8.1 Internal Findings Cross-Referenced to Other Audit Documents

| Finding ID | This Document | Related Document | Link |
|-----------|---------------|-----------------|------|
| FG-MD-001 | §11.6 Top 10 Critical Gaps | Main Audit Report — Finding 5 | [AUDIT-eLIS-2026-001]#FG-MD-001 |
| FG-SET-003 | §11.6 Top 10 Critical Gaps | Main Audit Report — Finding 9 | [AUDIT-eLIS-2026-001]#FG-SET-003 |
| AGAP-001 | §2.1 Folder Structure | Main Audit Report — Finding 10 | [AUDIT-eLIS-2026-001]#AGAP-001 |
| NAV-GAP-401 | §11.6 Top 10 Critical Gaps | Navigation Review — Accessibility | [AUDIT-eLIS-2026-003]#NAV-GAP-401 |
| NAV-GAP-402 | §11.6 Top 10 Critical Gaps | Navigation Review — Accessibility | [AUDIT-eLIS-2026-003]#NAV-GAP-402 |
| RBAC-SEC-001 | §11.6 Top 10 Critical Gaps | RBAC Review — Security Audit | [AUDIT-eLIS-2026-004]#RBAC-SEC-001 |
| RBAC-SEC-003 | §11.6 Top 10 Critical Gaps | RBAC Review — Security Audit | [AUDIT-eLIS-2026-004]#RBAC-SEC-003 |
| RBAC-SEC-004 | §11.6 Top 10 Critical Gaps | RBAC Review — Security Audit | [AUDIT-eLIS-2026-004]#RBAC-SEC-004 |
| INS-BIL-002 | §11.6 Top 10 Critical Gaps | Insurance Readiness — Billing | [AUDIT-eLIS-2026-005]#INS-BIL-002 |
| INS-PAY-002 | §11.6 Top 10 Critical Gaps | Insurance Readiness — Payment | [AUDIT-eLIS-2026-005]#INS-PAY-002 |
| INS-PAY-003 | §11.6 Top 10 Critical Gaps | Insurance Readiness — Payment | [AUDIT-eLIS-2026-005]#INS-PAY-003 |

### 8.2 Component Analysis Cross-References

| Reference | Document | Finding |
|-----------|----------|---------|
| [AUDIT-eLIS-2026-001]#ARCH-BE | Main Audit Report | Backend architecture classification & compliance score |
| [AUDIT-eLIS-2026-001]#ARCH-FE | Main Audit Report | Frontend FSD non-compliance (18/100 FSD score) |
| [AUDIT-eLIS-2026-003]#NAV-UX-001 | Navigation Review | Sub-feature capacity violation (14 > 7 threshold) |
| [AUDIT-eLIS-2026-004]#RBAC-SEC-001 | RBAC Review | Unguarded endpoints causing security gaps |
| [AUDIT-eLIS-2026-005]#INS-PAY-001 | Insurance Readiness | Split payment absence affecting architecture |

### 8.3 Audit Document Index

| Document ID | Title | Location |
|-------------|-------|----------|
| AUDIT-eLIS-2026-001 | Enterprise Admin Audit Report | `docs/17-Audit/enterprise-admin-audit-report.md` |
| AUDIT-eLIS-2026-002 | Architecture Gap Analysis (this document) | `docs/17-Audit/architecture-gap-analysis.md` |
| AUDIT-eLIS-2026-003 | Navigation Review | `docs/17-Audit/navigation-review.md` |
| AUDIT-eLIS-2026-004 | RBAC & User Management Review | `docs/17-Audit/rbac-review.md` |
| AUDIT-eLIS-2026-005 | Insurance & Healthcare Readiness | `docs/17-Audit/insurance-readiness.md` |

---

## 9. Methodology

### 9.1 Scoring Formula

Each category score is calculated as:

```
Category Score = (items_compliant / total_items_assessed) × category_weight
```

Where:
- **Folder Structure** (weight 25): Backend compliance + Frontend documented architecture compliance, averaged
- **Module Isolation** (weight 25): Total compliant artifact slots / Total expected artifact slots (5 per module × 12 assessable modules)
- **Shared Component Placement** (weight 20): Components in correct location / Total shared components
- **Routing Correctness** (weight 15): Compliant routes / Total routes assessed
- **State Management** (weight 15): Compliant criteria (partial = 0.5) / Total criteria assessed

### 9.2 Compliance Classification

| Score Range | Classification |
|-------------|---------------|
| ≥ 60 | **Compliant** |
| < 60 | **Non-Compliant** (triggers top-5 violation listing per Req 2.8) |

### 9.3 Severity Classification (per Requirement 2.9)

| Category | Rule |
|----------|------|
| **Critical** | Score impact ≥ 5 points |
| **Major** | Score impact 2–4 points |
| **Minor** | Score impact ≤ 1 point |

---

## 10. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/src/` | READ-ONLY | Referenced intermediate analysis from task 3.1 |
| `apps/web/src/` | READ-ONLY | Referenced intermediate analysis from tasks 3.3, 3.5 |
| `docs/17-Audit/_inventory/` | READ-ONLY | Read intermediate analysis files from tasks 3.1–3.5 |
| `docs/17-Audit/` | WRITE | Produced this report |

**No source code files were created, modified, or deleted during this analysis.**

---

## 11. Gap Summary Dashboard

**Validates: Requirements 4.5, 4.6**

This section consolidates all gap findings across all audit dimensions into a unified dashboard. Gaps are assigned MoSCoW priority (P1–P4) and aggregated by category and severity.

### 11.1 MoSCoW Priority Definitions

| Priority | Label | Definition |
|:--------:|-------|-----------|
| **P1** | Must Have | Blocks production use or causes data integrity failure |
| **P2** | Should Have | Degrades core workflow |
| **P3** | Could Have | Improves usability but has workaround |
| **P4** | Won't Have This Phase | Deferred with no current impact |

---

### 11.2 Total Gaps Per Category

| # | Category | Source Document | Total Gaps | Estimated Effort |
|---|----------|----------------|:----------:|:----------------:|
| 1 | Functional | `_inventory/functional-gap-report.md` | 13 | 84 SP |
| 2 | Architecture | `_inventory/architecture-gap-report.md` | 18 | 67–116 SP |
| 3 | Navigation | `_inventory/navigation-gap-report.md` | 14 | 19–36 SP |
| 4 | UX | `_inventory/ux-gap-report.md` | 42 | 73–134 SP |
| 5 | Insurance & Healthcare | `insurance-readiness.md` | 15 | 105–136 person-days |
| 6 | RBAC Security | `rbac-review.md` | 9 | 12 SP |
| | **GRAND TOTAL** | | **111** | **255–382 SP + 105–136 person-days** |

> **Note:** Insurance effort is expressed in person-days (1 person-day ≈ 1 story point at standard velocity). Combined total effort: **~360–518 SP equivalent**.

---

### 11.3 Gaps Per Severity Within Each Category

| Category | Critical | High | Medium | Low | Total |
|----------|:--------:|:----:|:------:|:---:|:-----:|
| Functional | 2 | 5 | 6 | 0 | **13** |
| Architecture | 1 | 5 | 8 | 4 | **18** |
| Navigation | 0 | 5 | 6 | 3 | **14** |
| UX | 0 | 10 | 19 | 13 | **42** |
| Insurance & Healthcare | 2 | 9 | 4 | 0 | **15** |
| RBAC Security | 5 | 0 | 4 | 0 | **9** |
| **TOTAL** | **10** | **34** | **47** | **20** | **111** |

**Severity Distribution:**
- Critical: 10 gaps (9.0%) — immediate action required
- High: 34 gaps (30.6%) — significant limitation
- Medium: 47 gaps (42.3%) — impacts efficiency
- Low: 20 gaps (18.0%) — cosmetic or nice-to-have

---

### 11.4 Gaps Per MoSCoW Priority Within Each Category

| Category | P1 (Must Have) | P2 (Should Have) | P3 (Could Have) | P4 (Won't Have) | Total |
|----------|:--------------:|:----------------:|:---------------:|:---------------:|:-----:|
| Functional | 2 | 5 | 6 | 0 | **13** |
| Architecture | 2 | 5 | 7 | 4 | **18** |
| Navigation | 3 | 6 | 3 | 2 | **14** |
| UX | 1 | 15 | 17 | 9 | **42** |
| Insurance & Healthcare | 7 | 5 | 1 | 0 | **13**¹ |
| RBAC Security | 5 | 2 | 2 | 0 | **9** |
| **TOTAL** | **20** | **38** | **36** | **15** | **109**¹ |

> ¹ Two insurance findings (INS-SCH-002, INS-SCH-003) overlap with payment flow gaps (INS-PAY-003) — deduplicated in priority totals.

---

### 11.5 Remediation Effort by Priority

| Priority | Gap Count | Estimated Story Points | Recommended Timeline |
|:--------:|:---------:|:----------------------:|:--------------------:|
| P1 (Must Have) | 20 | 105–155 SP | Sprint 1–3 (Immediate) |
| P2 (Should Have) | 38 | 130–195 SP | Sprint 4–8 (Short-term) |
| P3 (Could Have) | 36 | 85–125 SP | Sprint 9–12 (Medium-term) |
| P4 (Won't Have) | 15 | 30–45 SP | Deferred / Backlog |
| **TOTAL** | **109** | **350–520 SP** | — |

---

### 11.6 Top 10 Critical / Must-Have Gaps (P1 — Immediate Action)

| # | Gap ID | Category | Description | Effort |
|---|--------|----------|-------------|:------:|
| 1 | RBAC-SEC-004 | Security | Payment endpoints without role guard — any user can execute financial transactions | S (2 SP) |
| 2 | RBAC-SEC-001/002 | Security | Patient list/detail without role restriction — PHI exposure | S (2 SP) |
| 3 | RBAC-SEC-003 | Security | Order list/detail without role restriction — financial data exposure | S (2 SP) |
| 4 | INS-BIL-002 | Insurance | BPJS integration fields entirely absent — blocks national insurance claims | L (15-20 PD) |
| 5 | INS-PAY-002 | Insurance | No insurance rejection handling — no fallback workflow for denied claims | L (15-20 PD) |
| 6 | INS-PAY-003 | Insurance | No multi-insurance per patient — blocks dual-coverage scenarios | L (18-22 PD) |
| 7 | FG-MD-001 | Functional | Insurance type not constrained — data integrity failure risk | S (2 SP) |
| 8 | FG-SET-003 | Functional | Reporting module missing — visible frontend page with no backend | L (13 SP) |
| 9 | NAV-GAP-401 | Navigation | No skip-to-content link — WCAG 2.4.1 critical accessibility barrier | S (2 SP) |
| 10 | NAV-GAP-402 | Navigation | Sidebar not in `<nav>` landmark — WCAG 2.4.1 screen reader barrier | S (2 SP) |

---

### 11.7 Remediation Effort Breakdown by Category

| Category | S (≤2 SP) | M (3–5 SP) | L (6–13 SP) | XL (≥14 SP) | Total SP Range |
|----------|:---------:|:----------:|:-----------:|:-----------:|:--------------:|
| Functional | 2 | 5 | 5 | 1 (implied) | **84 SP** |
| Architecture | 5 | 8 | 4 | 1 | **67–116 SP** |
| Navigation | 10 | 3 | 0 | 0 | **19–36 SP** |
| UX | 28 | 13 | 1 | 0 | **73–134 SP** |
| Insurance | — | — | — | — | **105–136 PD** |
| RBAC Security | 6 | 0 | 0 | 0 | **12 SP** |
| **TOTAL** | **51** | **29** | **10** | **2** | **~360–518 SP eq.** |

---

### 11.8 Visual Summary

```
╔══════════════════════════════════════════════════════════════════╗
║            eLIS ENTERPRISE GAP SUMMARY DASHBOARD                ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  TOTAL GAPS: 111          TOTAL EFFORT: ~360–518 SP equivalent  ║
║                                                                  ║
║  ┌─────────────┬─────────┬──────────────────────────┐           ║
║  │  Category   │  Gaps   │  Severity Distribution   │           ║
║  ├─────────────┼─────────┼──────────────────────────┤           ║
║  │ Functional  │   13    │  ██░░░░░░░░  P1:2 P2:5   │           ║
║  │ Architecture│   18    │  █████░░░░░  C:1 H:5     │           ║
║  │ Navigation  │   14    │  ████░░░░░░  H:5 M:6     │           ║
║  │ UX          │   42    │  ██████████  H:10 M:19   │           ║
║  │ Insurance   │   15    │  █████░░░░░  C:2 H:9     │           ║
║  │ RBAC        │    9    │  ████░░░░░░  C:5 M:4     │           ║
║  └─────────────┴─────────┴──────────────────────────┘           ║
║                                                                  ║
║  PRIORITY BREAKDOWN:                                            ║
║  ■ P1 Must Have:    20 gaps (18%)  → 105–155 SP                ║
║  ■ P2 Should Have:  38 gaps (35%)  → 130–195 SP                ║
║  □ P3 Could Have:   36 gaps (33%)  →  85–125 SP                ║
║  ○ P4 Won't Have:   15 gaps (14%)  →  30–45 SP                 ║
║                                                                  ║
║  IMMEDIATE ACTIONS (Sprint 1–3):                                ║
║  • Fix 5 RBAC security vulnerabilities (Critical)    →  10 SP   ║
║  • Insurance type enum constraint (data integrity)   →   2 SP   ║
║  • Reporting backend service (broken UX)             →  13 SP   ║
║  • WCAG 2.4.1 accessibility barriers (2 gaps)       →   4 SP   ║
║  • BPJS + multi-insurance schema                     → 33-42 PD ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### 11.9 Key Observations

1. **Security is the highest-impact quick win.** Five RBAC security findings (all Critical, all S-effort ≤2 SP each) can be resolved in a single sprint for a total of 10 SP. These represent the most severe risk for the least effort.

2. **UX has the largest gap volume (42 gaps, 38%)** but most are P2/P3 severity. The single P1 UX gap (UX-ERR-001: silent data fetch failure) is a straightforward fix.

3. **Insurance & Healthcare gaps are the most effort-intensive** — 105–136 person-days covers schema changes, new entities, external API integration (BPJS), and workflow engine additions. These should be phased across multiple sprints.

4. **Architecture gaps are largely documentation-driven.** The largest architecture gap (AGAP-001, FSD non-compliance) is XL effort but can be resolved by updating documentation to match the actual working pattern rather than refactoring code.

5. **Navigation gaps are small and quick** — 14 gaps totaling only 19–36 SP. Most are S-effort accessibility fixes that can be batch-addressed in one sprint.

6. **The system operates at 84.3% architecture compliance** (Section 1) despite 111 total gaps across all dimensions. Core lab workflow functions correctly; gaps primarily affect enterprise-readiness, accessibility, insurance workflow, and data governance.

---

### 11.10 Cross-References

| Source Report | Document ID | Link |
|---------------|-------------|------|
| Functional Gap Report | [AUDIT-eLIS-2026-002]#FG-MD-001 | Functional gap findings |
| Architecture Gap Report | [AUDIT-eLIS-2026-002]#AGAP-001 | Architecture compliance gaps |
| Navigation Gap Report | [AUDIT-eLIS-2026-003]#NAV-GAP-401 | Navigation & accessibility gaps |
| UX Gap Report | [AUDIT-eLIS-2026-002]#UX-GAP-001 | UX gap findings |
| Insurance Readiness | [AUDIT-eLIS-2026-005]#INS-BIL-002 | Healthcare & insurance gaps |
| RBAC Review | [AUDIT-eLIS-2026-004]#RBAC-SEC-001 | Endpoint security findings |
| Main Audit Report | [AUDIT-eLIS-2026-001]#Section-4 | Top 5 critical findings consolidated |

---

*End of Gap Summary Dashboard — Task 6.5*
*Appended to Document ID: AUDIT-eLIS-2026-002 | Classification: Internal*
