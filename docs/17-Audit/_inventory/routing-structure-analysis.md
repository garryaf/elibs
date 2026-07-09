# Routing Structure Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-ROUTE |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document analyzes backend and frontend routing structure to identify duplicate routes, conflicting route groups (overlapping parameterized/static segments), and dead routes (no corresponding page component or handler). This analysis feeds into Task 3.6 (Architecture Compliance Score calculation — routing correctness category, 15pts).

**Validates: Requirement 2.5**

---

## 1. Backend Route Inventory

### 1.1 Complete Backend Route Map

All routes extracted from NestJS `@Controller` decorators and HTTP method decorators.

| # | HTTP Method | Route Path | Controller | Source File |
|---|-------------|-----------|------------|-------------|
| 1 | POST | `/api/v1/auth/login` | AuthController | `auth/auth.controller.ts` |
| 2 | POST | `/api/v1/users` | UsersController | `users/users.controller.ts` |
| 3 | GET | `/api/v1/users` | UsersController | `users/users.controller.ts` |
| 4 | GET | `/api/v1/users/:id` | UsersController | `users/users.controller.ts` |
| 5 | PUT | `/api/v1/users/:id` | UsersController | `users/users.controller.ts` |
| 6 | DELETE | `/api/v1/users/:id` | UsersController | `users/users.controller.ts` |
| 7 | GET | `/api/v1/health` | HealthController | `health/health.controller.ts` |
| 8 | GET | `/api/v1/master/test-categories` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 9 | POST | `/api/v1/master/test-categories` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 10 | PUT | `/api/v1/master/test-categories/:id` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 11 | DELETE | `/api/v1/master/test-categories/:id` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 12 | GET | `/api/v1/master/tests` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 13 | POST | `/api/v1/master/tests` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 14 | PUT | `/api/v1/master/tests/:id` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 15 | DELETE | `/api/v1/master/tests/:id` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 16 | GET | `/api/v1/master/panels` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 17 | POST | `/api/v1/master/panels` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 18 | PUT | `/api/v1/master/panels/:id` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 19 | DELETE | `/api/v1/master/panels/:id` | MasterDataController | `laboratory/master-data/master-data.controller.ts` |
| 20 | GET | `/api/v1/master/doctors` | DoctorController | `laboratory/master-data/reference-master.controller.ts` |
| 21 | POST | `/api/v1/master/doctors` | DoctorController | `laboratory/master-data/reference-master.controller.ts` |
| 22 | PUT | `/api/v1/master/doctors/:id` | DoctorController | `laboratory/master-data/reference-master.controller.ts` |
| 23 | DELETE | `/api/v1/master/doctors/:id` | DoctorController | `laboratory/master-data/reference-master.controller.ts` |
| 24 | GET | `/api/v1/master/clinics` | ClinicController | `laboratory/master-data/reference-master.controller.ts` |
| 25 | POST | `/api/v1/master/clinics` | ClinicController | `laboratory/master-data/reference-master.controller.ts` |
| 26 | PUT | `/api/v1/master/clinics/:id` | ClinicController | `laboratory/master-data/reference-master.controller.ts` |
| 27 | DELETE | `/api/v1/master/clinics/:id` | ClinicController | `laboratory/master-data/reference-master.controller.ts` |
| 28 | GET | `/api/v1/master/insurances` | InsuranceController | `laboratory/master-data/reference-master.controller.ts` |
| 29 | POST | `/api/v1/master/insurances` | InsuranceController | `laboratory/master-data/reference-master.controller.ts` |
| 30 | PUT | `/api/v1/master/insurances/:id` | InsuranceController | `laboratory/master-data/reference-master.controller.ts` |
| 31 | DELETE | `/api/v1/master/insurances/:id` | InsuranceController | `laboratory/master-data/reference-master.controller.ts` |
| 32 | GET | `/api/v1/master/equipments` | EquipmentController | `laboratory/master-data/reference-master.controller.ts` |
| 33 | POST | `/api/v1/master/equipments` | EquipmentController | `laboratory/master-data/reference-master.controller.ts` |
| 34 | PUT | `/api/v1/master/equipments/:id` | EquipmentController | `laboratory/master-data/reference-master.controller.ts` |
| 35 | DELETE | `/api/v1/master/equipments/:id` | EquipmentController | `laboratory/master-data/reference-master.controller.ts` |
| 36 | GET | `/api/v1/master/reagents` | ReagentController | `laboratory/master-data/reference-master.controller.ts` |
| 37 | POST | `/api/v1/master/reagents` | ReagentController | `laboratory/master-data/reference-master.controller.ts` |
| 38 | PUT | `/api/v1/master/reagents/:id` | ReagentController | `laboratory/master-data/reference-master.controller.ts` |
| 39 | DELETE | `/api/v1/master/reagents/:id` | ReagentController | `laboratory/master-data/reference-master.controller.ts` |
| 40 | GET | `/api/v1/master/sample-types` | SampleTypeController | `laboratory/master-data/reference-master.controller.ts` |
| 41 | POST | `/api/v1/master/sample-types` | SampleTypeController | `laboratory/master-data/reference-master.controller.ts` |
| 42 | PUT | `/api/v1/master/sample-types/:id` | SampleTypeController | `laboratory/master-data/reference-master.controller.ts` |
| 43 | DELETE | `/api/v1/master/sample-types/:id` | SampleTypeController | `laboratory/master-data/reference-master.controller.ts` |
| 44 | GET | `/api/v1/master/units` | MeasurementUnitController | `laboratory/master-data/reference-master.controller.ts` |
| 45 | POST | `/api/v1/master/units` | MeasurementUnitController | `laboratory/master-data/reference-master.controller.ts` |
| 46 | PUT | `/api/v1/master/units/:id` | MeasurementUnitController | `laboratory/master-data/reference-master.controller.ts` |
| 47 | DELETE | `/api/v1/master/units/:id` | MeasurementUnitController | `laboratory/master-data/reference-master.controller.ts` |
| 48 | GET | `/api/v1/master/tariffs` | TariffController | `laboratory/master-data/tariff.controller.ts` |
| 49 | POST | `/api/v1/master/tariffs` | TariffController | `laboratory/master-data/tariff.controller.ts` |
| 50 | PUT | `/api/v1/master/tariffs/:id` | TariffController | `laboratory/master-data/tariff.controller.ts` |
| 51 | DELETE | `/api/v1/master/tariffs/:id` | TariffController | `laboratory/master-data/tariff.controller.ts` |
| 52 | POST | `/api/v1/orders` | OrderController | `laboratory/order/order.controller.ts` |
| 53 | GET | `/api/v1/orders` | OrderController | `laboratory/order/order.controller.ts` |
| 54 | GET | `/api/v1/orders/:id` | OrderController | `laboratory/order/order.controller.ts` |
| 55 | POST | `/api/v1/orders/:id/cancel` | OrderController | `laboratory/order/order.controller.ts` |
| 56 | POST | `/api/v1/orders/:id/pay` | PaymentController | `laboratory/payment/payment.controller.ts` |
| 57 | GET | `/api/v1/orders/:id/barcode` | PaymentController | `laboratory/payment/payment.controller.ts` |
| 58 | GET | `/api/v1/orders/:id/invoice` | PaymentController | `laboratory/payment/payment.controller.ts` |
| 59 | POST | `/api/v1/patients` | PatientController | `laboratory/patient/patient.controller.ts` |
| 60 | GET | `/api/v1/patients` | PatientController | `laboratory/patient/patient.controller.ts` |
| 61 | GET | `/api/v1/patients/:id` | PatientController | `laboratory/patient/patient.controller.ts` |
| 62 | PUT | `/api/v1/patients/:id` | PatientController | `laboratory/patient/patient.controller.ts` |
| 63 | GET | `/api/v1/regions/provinsi` | RegionController | `laboratory/region/region.controller.ts` |
| 64 | GET | `/api/v1/regions/kabupaten-kota` | RegionController | `laboratory/region/region.controller.ts` |
| 65 | GET | `/api/v1/regions/kecamatan` | RegionController | `laboratory/region/region.controller.ts` |
| 66 | GET | `/api/v1/regions/kelurahan-desa` | RegionController | `laboratory/region/region.controller.ts` |
| 67 | POST | `/api/v1/regions/sync` | RegionController | `laboratory/region/region.controller.ts` |
| 68 | POST | `/api/v1/lab/:orderId/sample` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 69 | GET | `/api/v1/lab/queue` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 70 | GET | `/api/v1/lab/approval-queue` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 71 | PUT | `/api/v1/lab/:orderId/results` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 72 | GET | `/api/v1/lab/:orderId/delta-check` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 73 | POST | `/api/v1/lab/:orderId/verify` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 74 | POST | `/api/v1/lab/:orderId/approve` | LabWorkflowController | `laboratory/lab-workflow/lab-workflow.controller.ts` |
| 75 | GET | `/api/v1/dashboard/executive-summary` | DashboardController | `laboratory/dashboard/dashboard.controller.ts` |
| 76 | GET | `/api/v1/dashboard/recent-orders` | DashboardController | `laboratory/dashboard/dashboard.controller.ts` |
| 77 | GET | `/api/v1/dashboard/lab-summary` | DashboardController | `laboratory/dashboard/dashboard.controller.ts` |
| 78 | GET | `/api/v1/dashboard/lab-volume` | DashboardController | `laboratory/dashboard/dashboard.controller.ts` |
| 79 | GET | `/api/v1/dashboard/region-distribution` | DashboardController | `laboratory/dashboard/dashboard.controller.ts` |
| 80 | GET | `/api/v1/audit-logs` | AuditController | `laboratory/audit/audit.controller.ts` |
| 81 | GET | `/api/v1/settings/smtp` | SettingsController | `laboratory/notification/settings.controller.ts` |
| 82 | PUT | `/api/v1/settings/smtp` | SettingsController | `laboratory/notification/settings.controller.ts` |
| 83 | POST | `/api/v1/settings/smtp/test` | SettingsController | `laboratory/notification/settings.controller.ts` |

**Total backend routes: 83**

---

## 2. Frontend Route Inventory

All routes derived from Next.js App Router file-based routing (`apps/web/src/app/`).

| # | Route Path | Page File | Has Layout |
|---|-----------|-----------|------------|
| 1 | `/` | `app/page.tsx` | `app/layout.tsx` |
| 2 | `/dashboard` | `app/dashboard/page.tsx` | `app/dashboard/layout.tsx` |
| 3 | `/dashboard/audit-trail` | `app/dashboard/audit-trail/page.tsx` | — |
| 4 | `/dashboard/doctor` | `app/dashboard/doctor/page.tsx` | — |
| 5 | `/dashboard/laboratory` | `app/dashboard/laboratory/page.tsx` | `app/dashboard/laboratory/layout.tsx` |
| 6 | `/dashboard/laboratory/[id]` | `app/dashboard/laboratory/[id]/page.tsx` | — |
| 7 | `/dashboard/laboratory/approval` | `app/dashboard/laboratory/approval/page.tsx` | — |
| 8 | `/dashboard/laboratory/lab-dashboard` | `app/dashboard/laboratory/lab-dashboard/page.tsx` | — |
| 9 | `/dashboard/laboratory/queue` | `app/dashboard/laboratory/queue/page.tsx` | — |
| 10 | `/dashboard/laboratory/results` | `app/dashboard/laboratory/results/page.tsx` | — |
| 11 | `/dashboard/laboratory/results/[orderId]` | `app/dashboard/laboratory/results/[orderId]/page.tsx` | — |
| 12 | `/dashboard/orders` | `app/dashboard/orders/page.tsx` | — |
| 13 | `/dashboard/orders/new` | `app/dashboard/orders/new/page.tsx` | — |
| 14 | `/dashboard/orders/[id]` | `app/dashboard/orders/[id]/page.tsx` | — |
| 15 | `/dashboard/orders/[id]/report` | `app/dashboard/orders/[id]/report/page.tsx` | — |
| 16 | `/dashboard/patients` | `app/dashboard/patients/page.tsx` | — |
| 17 | `/dashboard/reports` | `app/dashboard/reports/page.tsx` | — |
| 18 | `/dashboard/settings` | `app/dashboard/settings/page.tsx` | — |

**Total frontend routes: 18**

---

## 3. Duplicate Route Analysis

### 3.1 Backend Duplicate Routes

A duplicate route occurs when two or more route definitions resolve to the exact same HTTP method + path combination.

**Result: No duplicate backend routes found.**

All 83 backend routes are unique combinations of HTTP method and path. Each controller registers distinct path segments under its prefix, and no two controllers share the same base path.

### 3.2 Frontend Duplicate Routes

**Result: No duplicate frontend routes found.**

Next.js App Router enforces uniqueness through file-system structure — only one `page.tsx` can exist at a given path level. No duplicate page files were detected.

---

## 4. Conflicting Route Groups Analysis

Conflicting route groups occur when parameterized segments (`:id`, `[id]`) and static segments exist at the same path level, potentially causing ambiguous route resolution.

### 4.1 Backend Conflicting Segments

| # | Path Level | Static Segment | Parameterized Segment | Risk | Controller(s) |
|---|-----------|---------------|----------------------|------|---------------|
| 1 | `/api/v1/lab/*` | `queue`, `approval-queue` | `:orderId` | **Medium** | LabWorkflowController |
| 2 | `/api/v1/orders/:id/*` | `cancel`, `pay`, `barcode`, `invoice` | — | None (no conflict) | OrderController, PaymentController |

**Finding ROUTE-CONFLICT-001: Lab Workflow Controller — Static vs Parameterized at Same Level**

- **Path**: `/api/v1/lab/queue` (static) vs `/api/v1/lab/:orderId/sample` (parameterized)
- **Nature**: The LabWorkflowController defines both static routes (`/queue`, `/approval-queue`) and parameterized routes (`/:orderId/sample`, `/:orderId/results`, `/:orderId/verify`, `/:orderId/approve`, `/:orderId/delta-check`) at the same first-segment level under `/api/v1/lab/`.
- **Risk Level**: Medium — NestJS resolves static routes before parameterized routes by registration order, which prevents ambiguity at runtime. However, if `queue` or `approval-queue` were valid UUIDs, the behavior could be unpredictable.
- **Mitigation**: NestJS's default route resolution prioritizes static segments, so this works correctly in practice. Recommended to document this ordering dependency.
- **Score Impact**: 1 point (Minor — functions correctly but violates best-practice of separating static and dynamic route groups)

### 4.2 Frontend Conflicting Segments

| # | Path Level | Static Segment(s) | Parameterized Segment | Risk |
|---|-----------|-------------------|----------------------|------|
| 1 | `/dashboard/laboratory/*` | `approval`, `lab-dashboard`, `queue`, `results` | `[id]` | **Low** |
| 2 | `/dashboard/orders/*` | `new` | `[id]` | **Low** |

**Finding ROUTE-CONFLICT-002: Laboratory Routes — Static vs Dynamic at Same Level**

- **Path**: `/dashboard/laboratory/approval` (static) vs `/dashboard/laboratory/[id]` (dynamic)
- **Nature**: Next.js App Router coexists static and dynamic segments at the same level.
- **Risk Level**: Low — Next.js App Router correctly prioritizes static routes over dynamic `[param]` segments. `approval`, `lab-dashboard`, `queue`, and `results` will always be matched before the `[id]` catch-all.
- **Score Impact**: 0 points (Next.js handles this correctly by design)

**Finding ROUTE-CONFLICT-003: Orders Routes — Static vs Dynamic at Same Level**

- **Path**: `/dashboard/orders/new` (static) vs `/dashboard/orders/[id]` (dynamic)
- **Risk Level**: Low — Next.js prioritizes `/new` over `[id]`. Standard Next.js pattern.
- **Score Impact**: 0 points (framework handles correctly)

---

## 5. Dead Route Analysis

Dead routes are defined as:
- **Frontend dead routes**: Page components with no corresponding backend API handler
- **Backend dead routes**: API endpoints with no corresponding frontend page or consumer
- **Orphaned directories**: Route directories without a `page.tsx` component

### 5.1 Frontend Pages Without Corresponding Backend Handler

| # | Frontend Route | Expected Backend Handler | Status | Finding |
|---|---------------|------------------------|--------|---------|
| 1 | `/dashboard/doctor` | No dedicated doctor-list API endpoint | **Dead** | ROUTE-DEAD-001 |
| 2 | `/dashboard/reports` | No reports API endpoint | **Dead** | ROUTE-DEAD-002 |
| 3 | `/dashboard/laboratory/lab-dashboard` | No dedicated lab-dashboard API (uses `/dashboard/*` endpoints) | **Partial** | — (uses existing dashboard API) |

**Finding ROUTE-DEAD-001: Doctor Page Without Dedicated Backend Endpoint**

- **Frontend**: `/dashboard/doctor` → `app/dashboard/doctor/page.tsx`
- **Backend**: No `/api/v1/doctors` or `/api/v1/master/doctors`-listing endpoint is specifically tied to a "doctors page". However, `GET /api/v1/master/doctors` exists as a master data CRUD endpoint.
- **Assessment**: The doctor page likely consumes the master data doctors API (`/api/v1/master/doctors`). This is a **naming discrepancy** rather than a true dead route — the frontend route is `/dashboard/doctor` (singular) while the API is `/api/v1/master/doctors` (plural, under master-data).
- **Severity**: Low
- **Score Impact**: 0.5 points

**Finding ROUTE-DEAD-002: Reports Page Without Backend API**

- **Frontend**: `/dashboard/reports` → `app/dashboard/reports/page.tsx`
- **Backend**: No `/api/v1/reports` endpoint exists. No dedicated reporting controller found.
- **Assessment**: This is a **true dead route** — the frontend page exists but has no backend handler to supply report data. The page may be a placeholder or may assemble data from multiple existing endpoints (dashboard, orders, etc.).
- **Severity**: Medium
- **Score Impact**: 2 points

### 5.2 Backend Endpoints Without Corresponding Frontend Page

| # | Backend Route | Expected Frontend Page | Status | Finding |
|---|-------------|----------------------|--------|---------|
| 1 | `GET /api/v1/regions/*` (4 endpoints) | No `/dashboard/regions` page | **Dead** | ROUTE-DEAD-003 |
| 2 | `GET /api/v1/health` | No UI page expected (infrastructure endpoint) | N/A | — |
| 3 | `POST /api/v1/regions/sync` | No UI trigger (admin-only operation) | **Partial** | ROUTE-DEAD-004 |

**Finding ROUTE-DEAD-003: Region API Endpoints Without Dedicated Frontend Page**

- **Backend**: `GET /api/v1/regions/provinsi`, `/kabupaten-kota`, `/kecamatan`, `/kelurahan-desa`
- **Frontend**: No dedicated `/dashboard/regions` or `/dashboard/wilayah` page exists.
- **Assessment**: Region data is consumed by the `CascadingRegionSelector` component within the Patient form, but there is no standalone region management page. The "Wilayah" feature referenced in the Settings page sub-features has no dedicated route.
- **Severity**: Medium — Region master data can only be managed via the sync endpoint, with no UI for browsing/editing.
- **Score Impact**: 1.5 points

**Finding ROUTE-DEAD-004: Region Sync — Backend-Only Operation**

- **Backend**: `POST /api/v1/regions/sync`
- **Frontend**: No UI button or page triggers this endpoint visually.
- **Assessment**: This is an admin utility endpoint that may be invoked via API tools (Postman, CLI) rather than the UI. Low severity as it's intentionally backend-only.
- **Severity**: Low
- **Score Impact**: 0.5 points

### 5.3 Orphaned Directories (No page.tsx)

| # | Directory Path | Expected | Status | Finding |
|---|---------------|----------|--------|---------|
| 1 | `app/dashboard/laboratory/dashboard-stats/` | `page.tsx` | **Empty directory** | ROUTE-DEAD-005 |

**Finding ROUTE-DEAD-005: Orphaned dashboard-stats Directory**

- **Path**: `apps/web/src/app/dashboard/laboratory/dashboard-stats/`
- **Assessment**: This directory exists but contains no `page.tsx` file. It is an orphaned directory that does not render any route. Likely a remnant from development or planned feature that was relocated to `lab-dashboard/`.
- **Severity**: Low (cosmetic — no functional impact, but adds confusion to directory structure)
- **Score Impact**: 0.5 points

---

## 6. Cross-Controller Route Overlap Analysis

### 6.1 OrderController + PaymentController Path Overlap

Both controllers serve routes under `/api/v1/orders/:id/`:

| Controller | Routes Under `/api/v1/orders/:id/` |
|-----------|-----------------------------------|
| OrderController | `POST /api/v1/orders/:id/cancel` |
| PaymentController | `POST /api/v1/orders/:id/pay`, `GET /api/v1/orders/:id/barcode`, `GET /api/v1/orders/:id/invoice` |

**Assessment**: PaymentController uses the base path `api/v1/orders/:id` and adds sub-routes (`pay`, `barcode`, `invoice`). This creates a **shared path prefix across two controllers**. While not technically conflicting (different sub-paths), it violates the single-responsibility principle for route ownership.

- **Risk**: Low — routes do not conflict, but maintenance complexity increases. A change to the Order route prefix would require updates in both controllers.
- **Severity**: Low (architectural smell, not a bug)
- **Score Impact**: 0.5 points

---

## 7. Summary Metrics

### 7.1 Findings Summary

| Finding ID | Category | Description | Severity | Score Impact |
|-----------|----------|-------------|----------|-------------|
| ROUTE-CONFLICT-001 | Conflicting Segments | Lab controller: static vs parameterized at same level | Medium | 1.0 pt |
| ROUTE-CONFLICT-002 | Conflicting Segments | Laboratory frontend: static vs dynamic (handled by Next.js) | Low | 0.0 pt |
| ROUTE-CONFLICT-003 | Conflicting Segments | Orders frontend: static vs dynamic (handled by Next.js) | Low | 0.0 pt |
| ROUTE-DEAD-001 | Dead Route | Doctor page naming discrepancy with master/doctors API | Low | 0.5 pt |
| ROUTE-DEAD-002 | Dead Route | Reports page without backend reporting API | Medium | 2.0 pt |
| ROUTE-DEAD-003 | Dead Route | Region API without dedicated frontend page | Medium | 1.5 pt |
| ROUTE-DEAD-004 | Dead Route | Region sync — backend-only utility endpoint | Low | 0.5 pt |
| ROUTE-DEAD-005 | Dead Route | Orphaned dashboard-stats directory (no page.tsx) | Low | 0.5 pt |

### 7.2 Routing Correctness Score (for Task 3.6)

| Metric | Count |
|--------|-------|
| Total route definitions assessed | 101 (83 backend + 18 frontend) |
| Duplicate routes found | 0 |
| Conflicting route groups (functional issues) | 1 (ROUTE-CONFLICT-001) |
| Dead routes (frontend without backend handler) | 2 (ROUTE-DEAD-002, plus partial ROUTE-DEAD-001) |
| Dead routes (backend without frontend page) | 1 (ROUTE-DEAD-003) |
| Orphaned directories | 1 (ROUTE-DEAD-005) |
| Cross-controller overlaps | 1 (OrderController/PaymentController) |
| **Total violations** | **6** |
| **Items compliant** | **95** |

**Routing Correctness Ratio**: 95 / 101 = **0.941** (94.1% compliant)

**Category Score** (weight 15 pts): 0.941 × 15 = **14.1 / 15 points**

### 7.3 Recommendations

| Priority | Recommendation |
|----------|---------------|
| P3 | Create a dedicated `/api/v1/reports` controller or document that `/dashboard/reports` assembles data from existing endpoints |
| P3 | Create `/dashboard/wilayah` (or `/dashboard/regions`) page for standalone region data management |
| P4 | Remove empty `dashboard-stats/` directory to reduce confusion |
| P4 | Document the LabWorkflowController route ordering dependency (static before parameterized) |
| P4 | Consider extracting PaymentController routes to a separate prefix (e.g., `/api/v1/payments/:orderId/`) to improve route ownership clarity |

---

## 8. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/src/` | READ-ONLY | Read controller files for route definitions |
| `apps/web/src/app/` | READ-ONLY | Listed directory structure for page.tsx files |
| `docs/17-Audit/_inventory/` | READ + WRITE | Wrote this analysis document |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Routing Structure Analysis — Generated for Enterprise Admin Architecture Audit Task 3.4*
