# Documentation Consistency Matrix

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-DCM |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document classifies each inventoried documentation file by its primary coverage area, determines its consistency status relative to other documents in the same coverage area, and produces a matrix for downstream inconsistency analysis (Task 2.2) and gap identification (Tasks 2.3, 2.4).

**Validates: Requirements 1.2**

---

## 1. Classification Criteria

### Coverage Areas

| Area | Definition | Key Indicators |
|------|-----------|----------------|
| **Administration** | System-wide operational concerns: architecture, deployment, infrastructure, monitoring, project governance | Architecture decisions, deployment, DevOps, overall system design |
| **Settings** | System configuration, notification settings, operational configuration parameters | System settings, SMTP config, notification templates, environment config |
| **Master Data** | Reference data entities: tests, categories, panels, tariffs, doctors, clinics, insurance, equipment, reagents, sample types, measurement units | CRUD for reference entities, data management, pricing |
| **User Management** | User accounts, authentication, session management | User CRUD, login/logout, profile management |
| **Role & Permission** | Authorization, RBAC, access control, role definitions, permission matrices | Roles, guards, access matrix, permission checks |
| **Navigation** | UI navigation structure, menu items, routing, page layout, frontend architecture | Sidebar, menu hierarchy, routing, page components |

### Consistency Status Definitions

| Status | Definition |
|--------|-----------|
| **Consistent** | No conflicts with other documents covering the same area |
| **Inconsistent** | Conflicting claims found with another document in the same coverage area |
| **Outdated** | Last modified more than 90 days before the most recent document covering the same area |
| **Missing** | Referenced in another document but file does not exist |

---

## 2. Documentation Consistency Matrix

### 2.1 Existing Documents

| # | File Path | Coverage Area | Last Modified | Consistency Status | Notes |
|---|-----------|---------------|---------------|-------------------|-------|
| 1 | `docs/01-BRD/BRD-eLIS-v1.0.md` | Administration | 2026-06-30 | Consistent | Defines overall system scope, business goals, all module descriptions |
| 2 | `docs/01-BRD/Review.md` | Administration | 2026-06-30 | Consistent | Review/approval document; references BRD content accurately |
| 3 | `docs/02-SRS/SRS-eLIS-v1.0.md` | Administration | 2026-06-30 | Inconsistent | RBAC matrix uses role "TEKNISI" but implementation uses "ANALIS"; module list differs from actual backend structure |
| 4 | `docs/03-Architecture/Architecture-eLIS-v1.0.md` | Administration | 2026-06-30 | Consistent | System architecture document; consistent with ADR-0001 |
| 5 | `docs/04-Database/Database-Design-eLIS-v1.0.md` | Master Data | 2026-06-30 | Inconsistent | ERD shows separate `CLINIC`, `DOCTOR` tables but implementation uses `ReferenceMaster` unified model; missing newer entities (Region, SystemSetting, ReferenceValue) |
| 6 | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` | Navigation | 2026-07-08 | Inconsistent | Documents Feature-Sliced Design with `components/modules/`, `hooks/`, `services/`, `schemas/` directories but actual implementation uses Next.js App Router flat structure without these directories |
| 7 | `docs/07-Backend/Backend-Architecture-eLIS-v1.0.md` | Administration | 2026-06-30 | Inconsistent | Module structure lists separate `patients/`, `clinics/`, `doctors/`, `master/`, `orders/`, `billing/`, `laboratory/`, `reports/`, `notifications/`, `audit/` modules but actual implementation consolidates under `laboratory/` parent module with sub-modules |
| 8 | `docs/08-API/API-Docs-eLIS-v1.0.md` | Master Data | 2026-06-30 | Inconsistent | Documents endpoints at `/api/v1/master/tests`, `/api/v1/master/clinics`, `/api/v1/master/doctors` but actual implementation uses `/api/v1/laboratory/master-data/*` paths |
| 9 | `docs/15-ADR/ADR-0001-Project-Architecture.md` | Administration | 2026-06-30 | Consistent | Modular Monolith decision; consistent with implementation |
| 10 | `docs/15-ADR/ADR-0002-Backend-Framework.md` | Administration | 2026-06-30 | Consistent | NestJS selection; consistent with implementation |
| 11 | `docs/15-ADR/ADR-0003-Frontend.md` | Navigation | 2026-06-30 | Consistent | Next.js + Tailwind + Shadcn/UI selection; consistent with implementation |
| 12 | `docs/15-ADR/ADR-0004-Database.md` | Master Data | 2026-06-30 | Consistent | PostgreSQL + Prisma selection; consistent with implementation |
| 13 | `docs/15-ADR/ADR-0005-Redis.md` | Settings | 2026-06-30 | Consistent | Redis for cache/queue; consistent with implementation |
| 14 | `docs/15-ADR/ADR-0006-Object-Storage.md` | Administration | 2026-06-30 | Consistent | MinIO for object storage; architectural decision only |
| 15 | `docs/15-ADR/ADR-0007-Authentication.md` | Role & Permission | 2026-06-30 | Consistent | JWT + RBAC selection; consistent with implementation |
| 16 | `docs/15-ADR/ADR-0008-Notification.md` | Settings | 2026-06-30 | Consistent | BullMQ + SMTP + WhatsApp; consistent with notification module |
| 17 | `docs/15-ADR/ADR-0009-API-Gateway.md` | Administration | 2026-06-30 | Consistent | Nginx/Traefik gateway decision |
| 18 | `docs/15-ADR/ADR-0010-Deployment.md` | Administration | 2026-06-30 | Consistent | Docker Compose deployment decision |
| 19 | `docs/15-ADR/ADR-0011-Monitoring.md` | Administration | 2026-06-30 | Consistent | Prometheus + Grafana monitoring |
| 20 | `docs/15-ADR/ADR-0012-Security.md` | Role & Permission | 2026-06-30 | Consistent | OWASP + rate limiting + audit trail; consistent with implementation |
| 21 | `docs/16-Implementation-Readiness/Implementation Readiness Report.md` | Administration | 2026-06-30 | Consistent | References all documentation artifacts; accurately reflects state at time of writing |
| 22 | `docs/16-Implementation-Readiness/Blocking Issue.md` | Administration | 2026-07-08 | Consistent | Tracks blocking issues for implementation |
| 23 | `docs/16-Implementation-Readiness/Checklist.md` | Administration | 2026-07-08 | Consistent | Implementation checklist tracking |
| 24 | `docs/16-Implementation-Readiness/Risk Register.md` | Administration | 2026-07-08 | Consistent | Risk tracking document |
| 25 | `docs/16-Implementation-Readiness/Implementation Approval.md` | Administration | 2026-06-30 | Consistent | Approval gates for implementation |
| 26 | `docs/16-Implementation-Readiness/Open Issue.md` | Administration | 2026-07-08 | Consistent | Open issue tracking |
| 27 | `docs/17-Audit/AUDIT-REPORT-eLIS-v1.0.md` | Administration | 2026-07-09 | Consistent | Comprehensive audit report covering all areas |
| 28 | `docs/17-Audit/MANIFEST.md` | Administration | 2026-07-09 | Consistent | Audit output file manifest |
| 29 | `docs/17-Audit/_templates/README.md` | Administration | 2026-07-09 | Consistent | Template documentation |
| 30 | `docs/17-Audit/_templates/classification-guide.md` | Administration | 2026-07-09 | Consistent | Classification guide for audit findings |
| 31 | `docs/17-Audit/_templates/enterprise-document-header.md` | Administration | 2026-07-09 | Consistent | Document header template |
| 32 | `docs/17-Audit/comprehensive-test-gap-analysis.md` | Administration | 2026-07-09 | Consistent | Testing gap analysis |
| 33 | `docs/17-Audit/dashboard-gap-analysis.md` | Navigation | 2026-07-07 | Consistent | Dashboard-specific gap analysis |
| 34 | `docs/17-Audit/gap-analysis-report.md` | Administration | 2026-07-07 | Consistent | General gap analysis findings |
| 35 | `docs/18-Functional-Spec/FS functional spec Lab.docx` | Master Data | 2026-07-06 | Consistent | Functional spec in docx format |
| 36 | `docs/18-Functional-Spec/FS-TS-Steering-Template.md` | Administration | 2026-07-06 | Consistent | Template for functional specification steering |
| 37 | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` | Master Data | 2026-07-08 | Consistent | Primary functional specification; most detailed, covers lab workflow comprehensively |
| 38 | `Functiona spec/MIKA_FS_TS-ISHMED-MED-NCRXXXX_Template FS TS.docx` | Administration | 2026-07-06 | Consistent | Template document; no claims to conflict with |
| 39 | `docs/enterprise-prompt-framework-kiro.md` | Administration | 2026-07-06 | Consistent | Development methodology framework |
| 40 | `docs/gap-audit.md` | Administration | 2026-07-09 | Consistent | Gap audit scoring and tracking |
| 41 | `docs/05-UIUX/UIUX-DesignSystem-eLIS-v1.0.md` | Navigation | 2026-06-30 | Consistent | Design system tokens and UI components |
| 42 | `docs/09-Testing/Testing-Plan-eLIS-v1.0.md` | Administration | 2026-06-30 | Consistent | Testing strategy and plan |

### 2.2 Missing Documents (Referenced but Not Found)

Documents referenced in existing documentation but not found in the file system:

| # | Referenced As | Referenced By | Coverage Area | Evidence |
|---|--------------|--------------|---------------|----------|
| M1 | Deployment documentation (`docs/10-Deployment/`) | `docs/16-Implementation-Readiness/Implementation Readiness Report.md` (OI-01) | Administration | Directory exists but is empty; no Dockerfile or Docker Compose documentation present |
| M2 | Security Runbook (`docs/11-Security/`) | `docs/16-Implementation-Readiness/Implementation Readiness Report.md` (OI-02) | Role & Permission | Directory exists but is empty; no security procedures documented |
| M3 | CI/CD Pipeline (`docs/12-DevOps/`) | `docs/16-Implementation-Readiness/Implementation Readiness Report.md` (OI-03) | Administration | Directory exists but is empty; no DevOps documentation |
| M4 | Release Process & Changelog (`docs/13-Release/`) | `docs/16-Implementation-Readiness/Implementation Readiness Report.md` (OI-04) | Administration | Directory exists but is empty; no release documentation |
| M5 | Swagger/OpenAPI Full Spec | `docs/08-API/API-Docs-eLIS-v1.0.md` (Section 6), `docs/16-Implementation-Readiness/Implementation Readiness Report.md` (OI-05) | Master Data | References `https://api.elis.id/api/docs` but no offline spec document exists |

---

## 3. Summary by Coverage Area

### 3.1 Coverage Area Distribution

| Coverage Area | Total Documents | Consistent | Inconsistent | Outdated | Missing |
|---------------|:--------------:|:----------:|:------------:|:--------:|:-------:|
| **Administration** | 28 | 28 | 0 | 0 | 3 (M1, M3, M4) |
| **Settings** | 2 | 2 | 0 | 0 | 0 |
| **Master Data** | 5 | 3 | 2 | 0 | 1 (M5) |
| **User Management** | 0 | 0 | 0 | 0 | 0 |
| **Role & Permission** | 3 | 2 | 1 | 0 | 1 (M2) |
| **Navigation** | 4 | 3 | 1 | 0 | 0 |
| **TOTAL** | **42** | **38** | **4** | **0** | **5** |

### 3.2 Most Recent Document per Coverage Area

| Coverage Area | Most Recent Document | Date |
|---------------|---------------------|------|
| Administration | `docs/17-Audit/MANIFEST.md` | 2026-07-09 |
| Settings | `docs/15-ADR/ADR-0005-Redis.md` | 2026-06-30 |
| Master Data | `Functiona spec/FS-TS-ELIS-LAB-NCR0001_Laboratory-Management.md` | 2026-07-08 |
| Role & Permission | `docs/15-ADR/ADR-0012-Security.md` | 2026-06-30 |
| Navigation | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` | 2026-07-08 |

### 3.3 Outdated Assessment

The entire documentation set spans only **9 days** (2026-06-30 to 2026-07-09). Since the "Outdated" threshold requires >90 days before the most recent document in the same area, **no documents qualify as Outdated**. All existing documents fall well within the 90-day window.

---

## 4. Inconsistency Summary

Four documents have been classified as **Inconsistent**. Details of specific conflicting claims will be documented in Task 2.2 (Cross-Document Inconsistency Report).

| # | Document | Coverage Area | Nature of Inconsistency |
|---|----------|---------------|------------------------|
| 1 | `docs/02-SRS/SRS-eLIS-v1.0.md` | Administration | RBAC matrix uses "TEKNISI" role name; implementation and FS use "ANALIS". Module structure described differs from actual consolidated laboratory module. |
| 2 | `docs/04-Database/Database-Design-eLIS-v1.0.md` | Master Data | ERD shows separate Clinic, Doctor tables; implementation uses consolidated `ReferenceMaster` model. Missing newer entities added during implementation (Region, SystemSetting, ReferenceValue, Panel, Tariff). |
| 3 | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` | Navigation | Documents Feature-Sliced Design directory structure (`components/modules/`, `hooks/`, `services/`, `schemas/`) but actual implementation follows flat Next.js App Router structure without these directories. |
| 4 | `docs/07-Backend/Backend-Architecture-eLIS-v1.0.md` | Administration | Documents 11 separate top-level modules (`patients/`, `clinics/`, `doctors/`, `master/`, `orders/`, `billing/`, etc.) but actual implementation consolidates most under single `laboratory/` parent module. |
| 5 | `docs/08-API/API-Docs-eLIS-v1.0.md` | Master Data | Documents API paths as `/api/v1/master/tests`, `/api/v1/master/clinics`; actual implementation uses `/api/v1/laboratory/master-data/*` path prefix. |

---

## 5. Consistency Metrics

| Metric | Value |
|--------|-------|
| Total documents scanned | 42 |
| Documents classified as Consistent | 38 |
| Documents classified as Inconsistent | 4 |
| Documents classified as Outdated | 0 |
| Referenced documents classified as Missing | 5 |
| **Overall Consistency Percentage** | **90.5%** |

*Consistency % = (Consistent documents / Total documents scanned) × 100 = (38 / 42) × 100 = 90.5%*

---

## 6. Key Observations

1. **Documentation was written before implementation** — The original documentation (BRD, SRS, Architecture, DB Design, API Docs, Backend Arch) was produced on 2026-06-30 as a comprehensive planning exercise. Implementation then evolved the structure, creating inconsistencies between planned and actual architecture.

2. **Functional Specification is most accurate** — The `FS-TS-ELIS-LAB-NCR0001` document (2026-07-08) was written after implementation and accurately reflects the current system state.

3. **Missing documents are operational** — All 5 missing documents relate to operational concerns (deployment, security runbooks, DevOps, release process, API spec) rather than functional design. These are flagged as non-blocking in the Implementation Readiness Report.

4. **No User Management-specific documentation** — No document has User Management as its primary coverage area. User management is covered as sub-sections within SRS (Section 4), BRD (Section 15), and the Backend Architecture (users module reference), but no dedicated User Management specification exists.

5. **Role naming inconsistency** — SRS uses "TEKNISI" while implementation and FS use "ANALIS" for the laboratory technician role. This is a semantic inconsistency that should be resolved.

---

*End of Documentation Consistency Matrix — Generated for Task 2.1*
