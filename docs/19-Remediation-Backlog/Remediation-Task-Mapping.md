# eLIS — Remediation Task Mapping

| Field | Value |
|-------|-------|
| **Version** | 1.1 |
| **Date** | 2026-07-10 |
| **Author** | Enterprise Architect |
| **Total Tasks** | 64 |
| **Completed** | 25 |
| **Remaining** | 39 |
| **Total Effort** | ~360–518 SP equivalent |
| **Last Updated** | 2026-07-10 |

---

## Source Documents Index

| # | Document ID | File Path | Content |
|---|-------------|-----------|---------|
| S1 | AUDIT-eLIS-2026-002 | `docs/17-Audit/architecture-gap-analysis.md` | Architecture Compliance Score + Gap Dashboard |
| S2 | AUDIT-eLIS-2026-001 | `docs/17-Audit/AUDIT-REPORT-eLIS-v1.0.md` | Main Audit Report (overall score, 100 issues) |
| S3 | — | `docs/17-Audit/comprehensive-test-gap-analysis.md` | Test Gap + Bug Findings |
| S4 | AUDIT-eLIS-2026-005 | `docs/17-Audit/insurance-readiness.md` | Insurance & Healthcare Readiness |
| S5 | AUDIT-eLIS-2026-003 | `docs/17-Audit/navigation-review.md` | Navigation Review + WCAG |
| S6 | AUDIT-eLIS-2026-004 | `docs/17-Audit/rbac-review.md` | RBAC & User Management Review |
| S7 | — | `docs/17-Audit/enterprise-admin-audit-report.md` | Consolidated Executive Summary |
| S8 | — | `docs/17-Audit/_inventory/access-matrix-schema-proposal.md` | RBAC Schema + 60 Permissions |
| S9 | — | `docs/17-Audit/_inventory/target-state-architecture.md` | Target State Architecture |
| S10 | — | `docs/17-Audit/_inventory/migration-path-implementation-readiness.md` | Migration Path + Rollback |
| S11 | — | `docs/17-Audit/_inventory/functional-gap-report.md` | 13 Functional Gaps |
| S12 | — | `docs/17-Audit/_inventory/architecture-gap-report.md` | 18 Architecture Gaps + ADR Matrix |
| S13 | — | `docs/17-Audit/_inventory/navigation-gap-report.md` | 14 Navigation Gaps + WCAG |
| S14 | — | `docs/17-Audit/_inventory/ux-gap-report.md` | 42 UX Gaps |
| S15 | — | `docs/17-Audit/_inventory/billing-workflow-insurance-rules.md` | Billing Workflow Verification |
| S16 | — | `docs/17-Audit/_inventory/settings-subfeature-classification.md` | Sub-feature Classification |
| S17 | — | `docs/17-Audit/_inventory/classification-matrix-module-boundary-map.md` | Module Boundary Map |
| S18 | ADR-0013 | `docs/15-ADR/ADR-0013-Settings-vs-Master-Data-Separation.md` | Settings vs Master Data |
| S19 | ADR-0014 | `docs/15-ADR/ADR-0014-Enterprise-RBAC-Model-Selection.md` | RBAC Model Selection |
| S20 | ADR-0015 | `docs/15-ADR/ADR-0015-Navigation-Restructuring-Approach.md` | Navigation Restructuring |
| S21 | ADR-0016 | `docs/15-ADR/ADR-0016-Insurance-Integration-Architecture.md` | Insurance Integration |
| S22 | — | `docs/17-Audit/deployment-audit.md` | Deployment Audit |

---

## Sprint Plan Overview

| Sprint | Priority | Tasks | Effort | Timeline | Status |
|--------|----------|:-----:|--------|----------|--------|
| Sprint 1 | 🔴 Critical (Security + Data Integrity) | T-001 → T-008 | ~16 SP | Week 1 | ✅ Complete |
| Sprint 2 | 🔴 Critical (Insurance Foundation) | T-009 → T-014 | ~78-109 PD | Week 2-4 | ✅ Complete |
| Sprint 3 | 🟠 High (Infrastructure + Auth) | T-015 → T-021 | ~40 SP | Week 5-6 | ✅ Complete |
| Sprint 4 | 🟠 High (Frontend + Navigation) | T-022 → T-038 | ~72 SP + 27-35 PD | Week 7-8 | ⚡ 4/17 Done |
| Sprint 5-6 | 🟡 Medium (Architecture + Governance) | T-039 → T-056 | ~123 SP + 5-7 PD | Week 9-12 | ⏳ Not Started |
| Backlog | 🟢 Low (Cleanup + Polish) | T-057 → T-064 | ~22 SP | Deferred | ⏳ Not Started |

---

## 🔴 CRITICAL — Sprint 1: Security & Data Integrity ✅ COMPLETE

| Task # | Task | Gap ID | Source | Effort | Area | Status |
|--------|------|--------|--------|--------|------|--------|
| T-001 | Add `@Roles` guard ke Patient GET endpoints | RBAC-SEC-001/002 | S6 §5.2 | 2 SP | Security | ✅ Done |
| T-002 | Add `@Roles` guard ke Order GET endpoints | RBAC-SEC-003 | S6 §5.2 | 2 SP | Security | ✅ Done |
| T-003 | Add `@Roles` guard ke Payment endpoints (pay, barcode, invoice) | RBAC-SEC-004 | S6 §5.2 | 2 SP | Security | ✅ Done |
| T-004 | Add `@Roles` guard ke Master Data GET endpoints (10 endpoints) | RBAC-SEC-005 | S6 §5.2 | 2 SP | Security | ✅ Done |
| T-005 | Add JwtAuthGuard ke Region GET endpoints (atau rate limit) | RBAC-SEC-006 | S6 §5.3 | 2 SP | Security | ✅ Done |
| T-006 | Buat `InsuranceType` enum (BPJS/SWASTA/CORPORATE) + migration | FG-MD-001 | S11 §4, S4 §1 | 2 SP | Database | ✅ Done |
| T-007 | Tambah skip-to-content link di dashboard layout | NAV-GAP-401 | S13 §5.1 | 2 SP | Accessibility | ✅ Done |
| T-008 | Wrap sidebar dalam `<nav aria-label>` landmark | NAV-GAP-402 | S13 §5.1 | 2 SP | Accessibility | ✅ Done |

**Sprint 1 Total: 16 SP — ✅ ALL COMPLETE (2026-07-09)**

---

## 🔴 CRITICAL — Sprint 2: Insurance Schema Foundation ✅ COMPLETE

| Task # | Task | Gap ID | Source | Effort | Area | Status |
|--------|------|--------|--------|--------|------|--------|
| T-009 | Buat `PatientInsurance` junction table (M2M, priority 1-5) | INS-SCH-002, INS-PAY-003 | S4 §1.2, S21 | 8 PD | Database | ✅ Done |
| T-010 | Buat `OrderInsurance` junction table (primary/secondary coverage) | INS-SCH-003 | S4 §1.3, S21 | 8 PD | Database | ✅ Done |
| T-011 | Tambah BPJS fields (`BpjsOrderDetail`: SEP, verification, facility, class) | INS-BIL-002 | S4 §2.3, S15 §2.3 | 15-20 PD | Insurance | ✅ Done |
| T-012 | Implement claim reference + tracking (ClaimStatus lifecycle) | INS-BIL-001, INS-BIL-005 | S4 §4.3, S15 §3.3 | 10-12 PD | Insurance | ✅ Done |
| T-013 | Implement split payment (`PaymentComponent` entity) | INS-PAY-001 | S4 §3.1, S21 | 12-15 PD | Payment | ✅ Done |
| T-014 | Implement insurance rejection + 72hr cash fallback workflow | INS-PAY-002 | S4 §3.2, S21 | 15-20 PD | Payment | ✅ Done |

**Sprint 2 Total: 68-83 PD — ✅ ALL COMPLETE (2026-07-10)**

### Sprint 2 Deliverables:
- `PatientInsurance` junction: M2M patient-insurance with priority 1-5, member number, BPJS class
- `OrderInsurance` junction: primary/secondary coverage, claim reference (CLM-YYYYMMDD-XXXX), ClaimStatus lifecycle
- `BpjsOrderDetail`: SEP number, verification status, referring facility, class level, ICD-10 code
- `ClaimService`: full state machine (PENDING→SUBMITTED→UNDER_REVIEW→APPROVED/REJECTED→PAID)
- `PaymentComponent`: split payment support, sum validation, multi-method composition
- `InsuranceRejectionService`: 72hr fallback workflow, PAYMENT_OVERDUE status, fallback payment endpoint

---

## 🟠 HIGH — Sprint 3: Infrastructure & Auth ✅ COMPLETE

| Task # | Task | Gap ID | Source | Effort | Area | Status |
|--------|------|--------|--------|--------|------|--------|
| T-015 | Integrate Redis (cache module + connection) | AGAP-010 | S12 §AGAP-010 | 5 SP | Infrastructure | ✅ Done |
| T-016 | Implement BullMQ notification queues (email + WA workers) | AGAP-011 | S12 §AGAP-011 | 10 SP | Notifications | ✅ Done |
| T-017 | Implement Refresh Token strategy (Access + Refresh + HttpOnly) | AGAP-015 | S12 §AGAP-015 | 5 SP | Auth | ✅ Done |
| T-018 | Add rate limiting pada auth endpoints (@nestjs/throttler) | AGAP-013 | S12 §AGAP-013, S2 §17 | 2 SP | Security | ✅ Done |
| T-019 | Buat Reporting backend module (6 endpoints) | FG-SET-003 | S11 §4 | 13 SP | Backend | ✅ Done |
| T-020 | PaymentMethod enum extension (+EDC, INSURANCE_CASH_FALLBACK, CORPORATE_DEFERRED) | INS-PAY-005/006 | S4 §5.3 | 3 SP | Database | ✅ Done |
| T-021 | Install TanStack Query + buat QueryClientProvider | SM-01 | S1 §2.5 | 2 SP | Frontend | ✅ Done |

**Sprint 3 Total: 40 SP — ✅ ALL COMPLETE (2026-07-10)**

### Sprint 3 Deliverables:
- Redis CacheModule (global, redis store, 30s default TTL)
- CacheInterceptor on Dashboard and Reports endpoints
- BullMQ notification queues (lab-pdf-generation, lab-email-delivery, lab-whatsapp-delivery)
- Generic `queueNotification()` method for ad-hoc notifications
- Refresh Token endpoint (`POST /api/v1/auth/refresh`)
- Rate limiting on auth endpoints (5 login/min, 10 refresh/min)
- Reports module with 6 endpoints (revenue, status, payment method, top tests, claims, TAT)
- PaymentMethod enum extended (EDC, INSURANCE_CASH_FALLBACK, CORPORATE_DEFERRED)
- TanStack Query + QueryClientProvider

---

## 🟠 HIGH — Sprint 4: Frontend & Navigation ⚡ IN PROGRESS (4/17)

| Task # | Task | Gap ID | Source | Effort | Area | Status |
|--------|------|--------|--------|--------|------|--------|
| T-022 | Buat `services/` directory + domain API clients (patients, orders, lab) | AGAP-002, SM-03 | S1 §2.3, S12 §AGAP-002 | 5 SP | Frontend | ⏳ |
| T-023 | Buat `schemas/` directory dengan Zod validation (patient, order, user) | AGAP-003 | S12 §AGAP-003 | 3 SP | Frontend | ⏳ |
| T-024 | Buat halaman dedicated `/dashboard/administration/users` | NAV-GAP-002 | S5 §7.1, S13 §3 | 5 SP | Navigation | ✅ Done |
| T-025 | Implement role-based sidebar visibility (filter per role) | F-NAV-002 | S5 §7.1 | 5 SP | Frontend | ✅ Done |
| T-026 | Buat expandable/collapsible sidebar menu groups | F-NAV-006 | S5 §7.2 | 5 SP | Navigation | ✅ Done |
| T-027 | Buat `/dashboard/master-data/` route group + individual pages | NAV-GAP-001 | S5 §7.2, S20 | 8 SP | Navigation | ⏳ |
| T-028 | Buat `/dashboard/master-data/regions` dedicated page | NAV-GAP-001 | S5 §7.2 | 2 SP | Navigation | ⏳ |
| T-029 | Buat `/dashboard/administration/system/smtp` dedicated page | NAV-GAP-003 | S5 §7.2 | 2 SP | Navigation | ⏳ |
| T-030 | Pre-Authorization flag pada TestMaster | INS-BIL-004 | S4 §4.1, S15 §3.1 | 5-7 PD | Insurance | ⏳ |
| T-031 | Insurance-specific receipt formats (ReceiptService + templates) | INS-PAY-004 | S4 §3.4 | 8-10 PD | Insurance | ⏳ |
| T-032 | Corporate Batch Invoicing (BatchInvoice entity) | INS-BIL-003 | S4 §2.4, S21 | 14-18 PD | Insurance | ⏳ |
| T-033 | Reference Value management UI di Lab Tests detail | FG-MD-003 | S11 §4 | 5 SP | Frontend | ⏳ |
| T-034 | Notification delivery management UI (logs, retry, queue) | FG-SET-001 | S11 §4 | 5 SP | Frontend | ⏳ |
| T-035 | E2E Test Suite dengan Playwright | S2 §Post-Audit | S2 §Post-Audit | 13 SP | Testing | ⏳ |
| T-036 | PDF Report export functional | S2 §Post-Audit | S2 §Post-Audit | 8 SP | Reports | ⏳ |
| T-037 | Seed Master Data: Doctors, Clinics, Insurance, Panels | S3 §8 | S3 §8 | 3 SP | Data | ✅ Done |
| T-038 | Update Frontend Architecture documentation | AGAP-001 | S12 §AGAP-001 | 3 SP | Documentation | ⏳ |

**Sprint 4: 4/17 complete. Critical user-facing items done (User Management, Sidebar, Seed Data).**

---

## 🟡 MEDIUM — Sprint 5-6: Architecture & Governance

| Task # | Task | Gap ID | Source | Effort | Area | File(s) to Change |
|--------|------|--------|--------|--------|------|-------------------|
| T-039 | Buat RBAC Permission + RolePermission tables (Phase 1) | S8, S19 | S8 §2, S10 §2 | 8 SP | RBAC | `schema.prisma`, new `rbac/` module |
| T-040 | Implement PermissionGuard (database-driven) | S8, S19 | S8 §5.2 | 8 SP | RBAC | `common/guards/permission.guard.ts` |
| T-041 | Module boundary formalization (interface contracts) | AGAP-008 | S12 §AGAP-008, S17 | 10 SP | Architecture | Interfaces across modules |
| T-042 | ESLint boundary rules (eslint-plugin-boundaries) | AGAP-009 | S12 §AGAP-009 | 5 SP | Architecture | `.eslintrc`, `eslint.config.mjs` |
| T-043 | Extract `master-data/` ke top-level bounded context | S18 | S9 §1.3, S17 §4 | 13 SP | Architecture | Move files, update imports |
| T-044 | Extract `settings/` ke top-level bounded context | S18 | S9 §1.3, S17 §4 | 8 SP | Architecture | Move `settings.controller.ts` |
| T-045 | AES-256 encryption untuk PII fields (Patient NIK) | AGAP-014 | S12 §AGAP-014 | 5 SP | Security | New crypto service, Prisma middleware |
| T-046 | Prometheus metrics endpoint + structured logging | AGAP-012 | S12 §AGAP-012 | 5 SP | Observability | `health/` or new `metrics/` |
| T-047 | Approval workflows (financial + master data critical) | S10 §4 | S10 §4, S19 | 13 SP | Governance | New approval entities + service |
| T-048 | Department & Position entities + data scoping | S19 Phase 3 | S8 §2.2, S9 §3.3 | 8 SP | RBAC | `schema.prisma`, scoping middleware |
| T-049 | Role hierarchy implementation (inheritance chain) | FG-ADM-002 | S6 §2, S19 | 5 SP | RBAC | `permission.guard.ts` |
| T-050 | Decompose Settings page into individual route-based pages | S5 §7.3 | S5 §7.3, S20 | 8 SP | Navigation | Split `settings/page.tsx` |
| T-051 | Tariff effective date management (effectiveFrom/effectiveTo) | FG-MD-004 | S11 §4 | 5 SP | Master Data | `schema.prisma`, `tariff-resolver.service.ts` |
| T-052 | Master Data bulk import/export (CSV/Excel) | FG-MD-005 | S11 §4 | 8 SP | Master Data | New import/export endpoints |
| T-053 | Insurance-specific reporting (filter by type, revenue by payer) | INS-BIL-006 | S4 §4.4, S15 §3.4 | 5-7 PD | Insurance | `order-query.dto.ts`, `dashboard.service.ts` |
| T-054 | Buat `hooks/` directory + consolidate hooks | AGAP-004 | S12 §AGAP-004 | 2 SP | Frontend | Move files |
| T-055 | Breadcrumb navigation untuk 3-level hierarchy | S5 §7.3 | S5 §7.3 | 2 SP | UX | New breadcrumb component |
| T-056 | Swagger/OpenAPI documentation | S2 §Post-Audit | S2 §25-#25 | 5 SP | Documentation | Decorators across controllers |

**Sprint 5-6 Total: 123 SP + 5-7 PD**

---

## 🟢 LOW — Backlog (Deferred)

| Task # | Task | Gap ID | Source | Effort | Area | File(s) to Change |
|--------|------|--------|--------|--------|------|-------------------|
| T-057 | Remove dead code (`lib/hooks.ts` unused exports) | AGAP-018 | S1 §3.2 | 1 SP | Cleanup | `apps/web/src/lib/hooks.ts` |
| T-058 | Remove orphaned `dashboard-stats/` directory | ROUTE-DEAD-005 | S1 §routing | 1 SP | Cleanup | Delete directory |
| T-059 | Fix color tokens (replace hardcoded #6B8E6B → CSS variables) | UX-CLR-007 | S14 §1.1 | 5 SP | UI | `settings/page.tsx`, components |
| T-060 | Configure Plus Jakarta Sans font | UX-TYP-001 | S14 §1.2, S2 §13 | 2 SP | UI | `layout.tsx`, `globals.css` |
| T-061 | Replace spinners with skeleton loading pattern | UX-SHP-003 | S14 §1.3 | 5 SP | UX | All page loading states |
| T-062 | Replace inline buttons with `<Button>` component | UX-CMP-001 | S14 §2 | 5 SP | UI | `settings/page.tsx` |
| T-063 | Fix null reference di Settings page (optional chaining) | BUG-006 | S3 §3 | 1 SP | Frontend | `settings/page.tsx` |
| T-064 | Adopt route groups atau update documentation | AGAP-006 | S12 §AGAP-006 | 2 SP | Frontend | `app/` directory or docs |

**Backlog Total: 22 SP**

---

## Summary

| Priority | Tasks | Completed | Remaining | Effort (SP) | Effort (PD) | Timeline |
|----------|:-----:|:---------:|:---------:|:-----------:|:-----------:|----------|
| 🔴 Critical | 14 | **14** | 0 | 16 SP | 68-83 PD | ✅ Done |
| 🟠 High | 24 | **11** | 13 | 112 SP | 27-35 PD | ⚡ In Progress |
| 🟡 Medium | 18 | 0 | 18 | 123 SP | 5-7 PD | ⏳ Not Started |
| 🟢 Low | 8 | 0 | 8 | 22 SP | — | Backlog |
| **TOTAL** | **64** | **25** | **39** | **273 SP** | **100-125 PD** | **~12 weeks** |

### Additional fixes applied (not in original task list):
- ✅ Auth controller response format fix (`{success, message, data}` envelope)
- ✅ `admin@elis.com` role corrected to SUPER_ADMIN
- ✅ Docker Nginx + SSL setup (Let's Encrypt)
- ✅ Docker-compose JWT_SECRET environment fix

---

## Cross-Reference: Task → Source Document

| Task Range | Primary Sources | Secondary Sources |
|-----------|----------------|-------------------|
| T-001 → T-005 | S6 (RBAC Review) | S1 (Gap Dashboard) |
| T-006 | S11 (Functional Gap), S4 (Insurance) | S1 (Gap Dashboard) |
| T-007 → T-008 | S13 (Navigation Gap), S5 (Navigation Review) | S14 (UX Gap) |
| T-009 → T-014 | S4 (Insurance Readiness), S21 (ADR-0016) | S15 (Billing Workflow) |
| T-015 → T-018 | S12 (Architecture Gap Report) | S2 (Main Audit) |
| T-019 | S11 (Functional Gap) | S2 (Main Audit) |
| T-020 | S4 (Insurance) | S15 (Billing) |
| T-021 → T-023 | S1 (Architecture Gap Analysis), S12 | S9 (Target State) |
| T-024 → T-029 | S5 (Navigation Review), S20 (ADR-0015) | S13 (Nav Gap Report) |
| T-030 → T-032 | S4 (Insurance), S21 (ADR-0016) | S15 (Billing) |
| T-033 → T-038 | S11, S2, S3 | Various |
| T-039 → T-049 | S8 (Access Matrix), S19 (ADR-0014), S10 (Migration) | S17 (Module Boundary) |
| T-050 → T-056 | S5, S11, S12, S2 | Various |
| T-057 → T-064 | S1, S14, S3, S12 | S2 (Main Audit) |

---

*Generated: 2026-07-09 | Updated: 2026-07-10 | File: `docs/19-Remediation-Backlog/Remediation-Task-Mapping.md`*
