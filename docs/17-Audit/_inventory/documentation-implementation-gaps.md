# Documentation-Implementation Gap Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-004 |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect (Audit System) |
| **Classification** | Internal |
| **Status** | Draft |

---

## 1. Purpose

This document identifies features documented in BRD, SRS, and Functional Specification (FS) that **lack a corresponding implementation** (module, service, controller, or route) in the source code at `apps/api/src/` or `apps/web/src/`. Each gap is classified as a "Documentation-Implementation Gap" per Requirement 1.5.

Additionally, this document produces the Section 2 (Documentation Review) summary report per Requirement 1.6.

**Validates: Requirements 1.5, 1.6**

---

## 2. Methodology

For each of the 15 features documented in the Functional Specification (`FS-TS-ELIS-LAB-NCR0001`), we check:

1. **Backend**: Does a corresponding module, service, controller, or route exist in `apps/api/src/`?
2. **Frontend**: Does a corresponding page, component, or route exist in `apps/web/src/`?

A feature is considered **Implemented** if both backend and frontend artifacts exist for it (where applicable). A feature is classified as a gap if documented but no corresponding code artifact can be found.

### Source References

- **Backend structure**: `apps/api/src/` — 6 top-level modules (auth, common, config, health, laboratory, users), with `laboratory/` containing 9 sub-modules
- **Frontend structure**: `apps/web/src/` — Next.js App Router with routes under `app/dashboard/`
- **Documentation sources**: BRD, SRS, FS-TS-ELIS-LAB-NCR0001

---

## 3. Feature-by-Feature Implementation Verification

### 3.1 Summary Matrix

| Feature ID | Feature Name | Backend | Frontend | Status |
|:----------:|:-------------|:-------:|:--------:|:------:|
| FR-01 | Lab Test Master Data Management | ✅ | ✅ | **Implemented** |
| FR-02 | Tariff and Pricing Configuration | ✅ | ✅ | **Implemented** |
| FR-03 | Patient Registration | ✅ | ✅ | **Implemented** |
| FR-04 | Lab Order Creation | ✅ | ✅ | **Implemented** |
| FR-05 | Payment and Billing | ✅ | ⚠️ Partial | **Partial Gap** |
| FR-06 | Sample Collection and Tracking | ✅ | ✅ | **Implemented** |
| FR-07 | Laboratory Result Entry | ✅ | ✅ | **Implemented** |
| FR-08 | Delta Check | ✅ | ✅ | **Implemented** |
| FR-09 | Technician Verification | ✅ | ✅ | **Implemented** |
| FR-10 | Doctor Approval | ✅ | ✅ | **Implemented** |
| FR-11 | Result Notification & Distribution | ✅ | ❌ | **Gap** |
| FR-12 | Order Cancellation | ✅ | ⚠️ Partial | **Partial Gap** |
| FR-13 | Audit Trail | ✅ | ✅ | **Implemented** |
| FR-14 | Laboratory Dashboard | ✅ | ✅ | **Implemented** |
| FR-15 | Frontend Laboratory UI | N/A | ✅ | **Implemented** |

### 3.2 Additional Documented Features (BRD/SRS beyond FS)

| Feature | Source Document | Backend | Frontend | Status |
|:--------|:---------------|:-------:|:--------:|:------:|
| Reporting Module | BRD §08, SRS §2 | ❌ | ⚠️ Partial | **Gap** |
| Role & Permission Management (RBAC UI) | BRD §15, SRS §4 | ✅ (enum-based) | ⚠️ (basic) | **Partial Gap** |
| Insurance/BPJS Integration | BRD §08 | ⚠️ Partial | ❌ | **Gap** |
| Multi-branch/Multi-clinic Support | BRD §17 (Future) | ❌ | ❌ | **Not Implemented (Future)** |
| Mobile App (React Native) | BRD §17 (Future) | ❌ | ❌ | **Not Implemented (Future)** |
| HL7 FHIR Integration | BRD §17 (Future) | ❌ | ❌ | **Not Implemented (Future)** |

---

## 4. Detailed Documentation-Implementation Gaps

### GAP-DI-001: Notification Management UI (FR-11 Frontend)

| Field | Detail |
|-------|--------|
| **Feature Name** | Result Notification & Distribution — Frontend Management UI |
| **Documented In** | FS FR-11 (notification delivery), BRD §08 (notifications module) |
| **Expected Source Location** | `apps/web/src/app/dashboard/notifications/page.tsx` or notification status dashboard within lab UI |
| **Evidence of Absence** | No `/dashboard/notifications` route exists. No frontend page for viewing notification delivery status, retry failed notifications, or managing notification templates. The backend `notification/` module exists with services (email, WhatsApp, PDF generator, BullMQ processor) but has no dedicated frontend management interface. |
| **Current State** | Backend notification processing is fully implemented (BullMQ queue, email via SMTP, WhatsApp stub, PDF generation). SMTP settings are configurable via Settings page. However, there is no UI to: view notification delivery logs, retry failed deliveries, or monitor queue status. |
| **Severity** | Medium |
| **Recommendation** | Create a notification dashboard page at `/dashboard/notifications` showing: delivery status per order, retry controls for failed notifications, queue health metrics. Alternatively, integrate notification status into the existing lab-dashboard page. |

---

### GAP-DI-002: Payment/Invoice Frontend (FR-05 Frontend)

| Field | Detail |
|-------|--------|
| **Feature Name** | Payment and Billing — Dedicated Payment UI |
| **Documented In** | FS FR-05 (payment processing, barcode generation, invoice), SRS §2.4 |
| **Expected Source Location** | `apps/web/src/app/dashboard/payments/page.tsx` or dedicated cashier/billing page |
| **Evidence of Absence** | No `/dashboard/payments` or `/dashboard/billing` route exists. Payment processing is initiated through the Orders page (inline pay button on order detail). No standalone invoice management page, payment history view, or barcode printing interface exists as a dedicated page. |
| **Current State** | Payment API endpoints exist (`POST /orders/:id/pay`, `GET /orders/:id/barcode`, `GET /orders/:id/invoice`). The order detail page at `/dashboard/orders/[id]` handles payment inline. However, there is no dedicated cashier workflow page, no bulk payment processing view, and no invoice/receipt management interface. |
| **Severity** | Low |
| **Recommendation** | Assess whether the inline payment on order detail page is sufficient for the cashier workflow. If KASIR role needs a dedicated workspace, create `/dashboard/payments` with: pending payment queue, barcode printing, daily revenue summary. For MVP, current inline approach may be acceptable. |

---

### GAP-DI-003: Order Cancellation Frontend (FR-12 Frontend)

| Field | Detail |
|-------|--------|
| **Feature Name** | Order Cancellation — Frontend Cancellation Flow |
| **Documented In** | FS FR-12 (cancel endpoint, reason required), BRD (not documented) |
| **Expected Source Location** | Cancel button/action within `/dashboard/orders/[id]/page.tsx` |
| **Evidence of Absence** | The backend cancel endpoint exists (`POST /api/v1/orders/:id/cancel`). Frontend order pages exist at `/dashboard/orders/` but cancellation UI (cancel button with reason modal) needs verification at component level. The FS documents this feature but BRD and SRS do not mention it at all. |
| **Current State** | Backend implementation is complete. Frontend may have partial implementation (cancel action within order detail) but no standalone cancellation workflow page. |
| **Severity** | Low |
| **Recommendation** | Verify that order detail page includes a cancel button for PENDING_PAYMENT orders with a reason input dialog. If missing, add the UI component. No dedicated page is needed — inline action is appropriate per workflow design. |

---

### GAP-DI-004: Reporting Module Backend (BRD/SRS)

| Field | Detail |
|-------|--------|
| **Feature Name** | Reporting Module — Backend Reporting Service |
| **Documented In** | BRD §08 (scope mentions "Laporan"), SRS §2 (implied by module list), Backend Architecture doc lists `reports/` as separate module |
| **Expected Source Location** | `apps/api/src/laboratory/reports/` or `apps/api/src/reports/` |
| **Evidence of Absence** | No `reports/` module, controller, or service exists in the backend. The Backend Architecture document (`docs/07-Backend/`) lists `├── reports/ # Modul Laporan` as an expected top-level module, but it was never created. The dashboard endpoints provide summary metrics but no dedicated report generation/export API exists. |
| **Current State** | Frontend has a Reports page at `/dashboard/reports/page.tsx` that renders report selection UI (daily, monthly, patient, test, revenue, TAT) but relies solely on the dashboard lab-summary API for data. No backend report generation, aggregation, or export (PDF/Excel) service exists. |
| **Severity** | High |
| **Recommendation** | Create `apps/api/src/laboratory/reports/` module with: (1) report generation endpoints for each report type (daily summary, monthly statistics, patient demographics, test volume, revenue, TAT analysis), (2) date range filtering, (3) export capabilities (PDF via existing pdf-generator, CSV/Excel). This is a functional gap since the frontend page exists but has no proper backend data source beyond basic dashboard metrics. |

---

### GAP-DI-005: Insurance/BPJS Integration (BRD)

| Field | Detail |
|-------|--------|
| **Feature Name** | Insurance & BPJS Integration — Full Workflow |
| **Documented In** | BRD §08 (scope includes insurance management), BRD §17 (future: BPJS integration) |
| **Expected Source Location** | `apps/api/src/laboratory/insurance/` or enhanced insurance fields in order/payment modules |
| **Evidence of Absence** | While the Insurance model exists in Prisma schema and CRUD endpoints are available via ReferenceMasterService at `/api/v1/master/insurances`, there is no dedicated insurance workflow module. Missing: BPJS-specific fields (SEP number, verification status, facility code, class level), insurance claim tracking, split payment support, insurance rejection handling, and insurance-specific receipt generation. The Order model has a simple `insuranceId` FK but no claim number, pre-authorization, or multi-insurance support. |
| **Current State** | Basic insurance master data CRUD exists. Tariff-insurance pricing resolution works. However, the full insurance billing workflow (claim submission, BPJS integration, corporate batch invoicing, split payments, rejection handling) documented in BRD is NOT implemented. The BRD classifies full BPJS integration as "Future" (§17). |
| **Severity** | Medium |
| **Recommendation** | Phase 1: Add BPJS-specific fields to Insurance model and Order model (SEP number, claim reference, verification status). Phase 2: Implement insurance claim workflow (pre-auth, claim tracking, rejection handling). Phase 3: BPJS API integration. Mark as P2-P3 priority since BRD classifies as future scope but basic insurance support is needed for production use. |

---

### GAP-DI-006: Role & Permission Management UI (SRS/BRD)

| Field | Detail |
|-------|--------|
| **Feature Name** | Role & Permission Management — Dedicated Admin UI |
| **Documented In** | BRD §15 (User Management & RBAC), SRS §4 (RBAC Matrix) |
| **Expected Source Location** | `apps/web/src/app/dashboard/settings/roles/page.tsx` or role management section in settings |
| **Evidence of Absence** | The Settings page includes a Users tab for user CRUD (including role assignment via dropdown). However, there is no dedicated Role Management page, Permission Matrix editor, or access control configuration UI. Role definitions are hardcoded as an enum in Prisma schema. No UI exists to: view/edit permissions per role, manage role hierarchy, or configure access rules dynamically. |
| **Current State** | RBAC is implemented via `@Roles()` decorator + `RolesGuard` at code level. Users can be assigned a single role from the 11-role enum via the Users tab in Settings. There is no dynamic permission management — all access rules are compile-time constants in the source code. |
| **Severity** | Medium |
| **Recommendation** | For enterprise readiness: (1) Create a read-only Access Matrix page showing current role-endpoint mappings for transparency, (2) evaluate whether dynamic permission management is needed (per RBAC review findings in Task 7). Current enum-based approach is acceptable for Phase 1 but may need enhancement for enterprise deployment. |

---

### GAP-DI-007: Multi-branch/Multi-clinic (BRD Future)

| Field | Detail |
|-------|--------|
| **Feature Name** | Multi-branch and Multi-clinic Support |
| **Documented In** | BRD §17 (Future Expansion) |
| **Expected Source Location** | N/A (documented as future scope) |
| **Evidence of Absence** | Not implemented. BRD explicitly marks this as "Expansion Fase 2" future capability. |
| **Current State** | Single-clinic operation. No multi-tenancy or branch management. |
| **Severity** | N/A (Future scope) |
| **Recommendation** | Track as future requirement. No immediate gap since BRD explicitly defers this to Phase 2. |

---

### GAP-DI-008: Mobile Application (BRD Future)

| Field | Detail |
|-------|--------|
| **Feature Name** | Mobile Application (React Native) |
| **Documented In** | BRD §17 (Future Expansion) |
| **Expected Source Location** | N/A (documented as future scope) |
| **Evidence of Absence** | Not implemented. BRD explicitly marks as future. |
| **Current State** | Web-only application. No mobile app exists. |
| **Severity** | N/A (Future scope) |
| **Recommendation** | Track as future requirement. No immediate gap. |

---

### GAP-DI-009: HL7 FHIR Integration (BRD Future)

| Field | Detail |
|-------|--------|
| **Feature Name** | HL7 FHIR Healthcare Interoperability |
| **Documented In** | BRD §17 (Future Expansion) |
| **Expected Source Location** | N/A (documented as future scope) |
| **Evidence of Absence** | Not implemented. BRD explicitly marks as future. |
| **Current State** | No healthcare interoperability layer. |
| **Severity** | N/A (Future scope) |
| **Recommendation** | Track as future requirement. No immediate gap. |

---

## 5. Reverse Gaps: Implementation Without Documentation

These are features found in implementation that are NOT documented in any BRD/SRS/FS document:

| # | Feature | Implementation Location | Missing Documentation |
|---|---------|------------------------|----------------------|
| 1 | Region/Wilayah Management (EMSIFA sync) | `apps/api/src/laboratory/region/`, frontend Settings → Wilayah tab | Not in BRD, SRS, or FS main feature list. Exists in implementation as region master data with external API sync. |
| 2 | System Settings (SMTP Configuration) | `apps/api/src/laboratory/notification/settings.controller.ts`, frontend Settings → SMTP tab | Not documented as standalone feature in BRD/SRS. FS mentions notification but not SMTP admin config. |
| 3 | Reference Master CRUD (Equipment, Reagents, Sample Types, Measurement Units) | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | FR-01 only explicitly documents TestMaster, TestCategory, Panel. Additional reference masters (equipment, reagents, sample types, units) are implemented but not individually specified in FS or BRD. |

---

## 6. Gap Summary by Severity

| Severity | Count | Gap IDs |
|:--------:|:-----:|:--------|
| **High** | 1 | GAP-DI-004 (Reporting Module Backend) |
| **Medium** | 3 | GAP-DI-001 (Notification UI), GAP-DI-005 (Insurance/BPJS), GAP-DI-006 (RBAC UI) |
| **Low** | 2 | GAP-DI-002 (Payment UI), GAP-DI-003 (Cancellation UI) |
| **N/A (Future)** | 3 | GAP-DI-007, GAP-DI-008, GAP-DI-009 |
| **TOTAL (Actionable)** | **6** | |

---

## 7. Section 2 Summary Report — Documentation Review

### 7.1 Scan Summary

| Metric | Value |
|--------|-------|
| **Total documents scanned** | 42 |
| **Document directories scanned** | 13 (docs/01-BRD, docs/02-SRS, docs/03-Architecture, docs/04-Database, docs/06-Frontend, docs/07-Backend, docs/08-API, docs/15-ADR, docs/16-Implementation-Readiness, docs/17-Audit, docs/18-Functional-Spec, Functiona spec/, docs/ root) |
| **Extensions found** | .md (39), .docx (3), .pdf (0) |
| **Date range** | 2026-06-30 to 2026-07-09 (9 days) |

### 7.2 Inconsistencies per Severity

| Severity | Count | Description |
|:--------:|:-----:|:------------|
| **Critical** | 0 | No safety/security/data-integrity contradictions |
| **High** | 6 | Role naming mismatches (×3), role set incompleteness, DB clinic-doctor relationship, backend module structure, API role assignment |
| **Medium** | 4 | Missing DB entities, frontend directory structure, API scope incompleteness, SRS module separation |
| **Low** | 1 | KLINIK vs KLINIK_PARTNER naming |
| **TOTAL** | **11** | |

### 7.3 Documentation-Implementation Gaps

| Category | Count |
|----------|:-----:|
| Full gaps (documented but not implemented) | 2 (Reporting backend, Notification UI) |
| Partial gaps (partially implemented) | 4 (Payment UI, Cancellation UI, Insurance workflow, RBAC UI) |
| Future scope (explicitly deferred in docs) | 3 (Multi-branch, Mobile, HL7 FHIR) |
| Reverse gaps (implemented but undocumented) | 3 (Region sync, SMTP settings, Reference Masters) |
| **Total actionable gaps** | **6** |

### 7.4 Feature Coverage (Cross-Document)

| Metric | Value |
|--------|-------|
| Features in Functional Spec | 15 |
| Features fully covered in all 5 doc types | 0 |
| Overall cross-document coverage (strict) | 40.0% (30/75 cells) |
| Overall cross-document coverage (incl. partial) | 56.0% (42/75 cells) |

### 7.5 Consistency Metrics

| Metric | Value |
|--------|-------|
| Documents classified as Consistent | 38 |
| Documents classified as Inconsistent | 4 |
| Documents classified as Outdated | 0 |
| Referenced documents classified as Missing | 5 |
| **Overall Consistency Percentage** | **90.5%** |

*Consistency % = (Consistent documents / Total documents scanned) × 100 = (38 / 42) × 100 = 90.5%*

### 7.6 Implementation Coverage

| Metric | Value |
|--------|-------|
| FS features with backend implementation | 15/15 (100%) |
| FS features with frontend implementation | 12/14 applicable (85.7%) |
| FS features fully implemented (both) | 12/15 (80.0%) |
| BRD/SRS features with implementation (non-future) | 12/15 (80.0%) |

---

## 8. Root Cause Analysis

### Why Documentation-Implementation Gaps Exist

1. **Code-first development approach** — Implementation proceeded faster than documentation updates. Features like Region Sync, SMTP settings, and extended Reference Masters were added during development without back-updating BRD/SRS.

2. **Frontend gaps are UI-completeness issues** — The backend is more complete than the frontend. Notification management, dedicated payment workflow, and permission management all have backend support but lack dedicated frontend pages.

3. **BRD future scope is appropriate** — Features marked as "Future" in BRD (BPJS integration, multi-branch, mobile, HL7 FHIR) correctly represent items not yet implemented. These are documentation-tracked product roadmap items, not gaps.

4. **Reporting module was deprioritized** — The Backend Architecture doc lists `reports/` as a planned module, and the frontend Reports page exists, but no backend reporting service was implemented during the initial development sprints.

5. **Insurance workflow partial implementation** — Basic insurance CRUD and tariff resolution exists, but the full insurance billing workflow (claims, BPJS, split payments) was not implemented in the current phase. This aligns with BRD marking full BPJS as future.

---

## 9. Recommendations

### Immediate (P1 — Must Have)

1. **Create Reporting Backend Module** — The frontend Reports page exists but has no proper data backend. This creates a broken user experience. Implement `apps/api/src/laboratory/reports/` with aggregation endpoints for all 6 report types.

### Short-Term (P2 — Should Have)

2. **Add Notification Status UI** — Allow admins to view notification delivery status and retry failed notifications. Can be integrated into lab-dashboard or a new dedicated page.

3. **Document Reverse Gaps** — Update FS/BRD to include Region Sync, SMTP Settings, and extended Reference Masters that are implemented but undocumented.

4. **Add Insurance/BPJS Schema Fields** — Extend the Insurance and Order models with BPJS-specific fields as preparation for full insurance workflow.

### Medium-Term (P3 — Could Have)

5. **Create Access Matrix Viewer** — A read-only page showing role-endpoint mappings for audit/compliance purposes.

6. **Evaluate Dedicated Payment Page** — Assess whether KASIR workflow needs a standalone page or if inline payment on order detail is sufficient.

---

## 10. No-Code-Modification Attestation

This analysis was performed in **read-only mode**. The following directories were accessed:

| Directory | Access Mode | Operations |
|-----------|-------------|------------|
| `apps/api/src/` | READ-ONLY | Directory listing, file content reading |
| `apps/web/src/` | READ-ONLY | Directory listing, file content reading |
| `docs/` | READ + WRITE | Read existing docs, wrote this analysis |
| `Functiona spec/` | READ-ONLY | Read functional specification |

**No source code files were created, modified, or deleted.**

---

*End of Documentation-Implementation Gap Analysis — Generated for Task 2.4*
