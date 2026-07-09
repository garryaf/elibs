# Access Matrix, Database Schema Proposal & API Endpoint Specifications

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-RBAC-MATRIX |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document produces:
1. **Access Matrix** — mapping all 11 roles against every resource group with CRUD + custom action permissions
2. **Database Schema Proposal** — for Permission, RolePermission, Department, Position, and UserDepartment entities
3. **API Endpoint Specifications** — for permission CRUD and role-permission assignment operations

**Validates: Requirement 5.4**

**Upstream Dependencies:**
- `rbac-implementation-current.md` — current 83 endpoints with role assignments
- `enterprise-access-control-evaluation.md` — Option B (Full RBAC) recommendation

---

## 1. Access Matrix

### 1.1 Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Explicitly granted (via @Roles decorator) |
| 🔓 | Granted via authenticated access (JwtAuthGuard only, no @Roles) |
| 🌐 | Public endpoint (no guard) |
| ❌ | Denied |
| 🔶 | Recommended addition in Full RBAC model |

### 1.2 Resource Groups

Resources are organized into 11 logical groups based on module boundaries:

| # | Resource Group | Endpoints | Module Path |
|---|---------------|-----------|-------------|
| 1 | Users | 5 | `users/` |
| 2 | Patients | 4 | `laboratory/patient/` |
| 3 | Orders | 4 | `laboratory/order/` |
| 4 | Lab Tests (Master Data) | 12 | `laboratory/master-data/` (test-categories, tests, panels) |
| 5 | Reference Master Data | 28 | `laboratory/master-data/` (doctors, clinics, insurances, equipment, reagents, sample-types, units) |
| 6 | Tariffs | 4 | `laboratory/master-data/tariff` |
| 7 | Lab Workflow | 7 | `laboratory/lab-workflow/` |
| 8 | Dashboard | 5 | `laboratory/dashboard/` |
| 9 | Audit | 1 | `laboratory/audit/` |
| 10 | Settings | 3 | `laboratory/notification/settings` |
| 11 | Regions | 5 | `laboratory/region/` |


### 1.3 Access Matrix — Users Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Create (POST /users) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read List (GET /users) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read Detail (GET /users/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /users/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /users/:id) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.4 Access Matrix — Patients Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Create (POST /patients) | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | ✅ | 🔓 | ✅ |
| Read List (GET /patients) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Read Detail (GET /patients/:id) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Update (PUT /patients/:id) | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | ✅ | 🔓 | ❌ |


### 1.5 Access Matrix — Orders Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Create (POST /orders) | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | ✅ |
| Read List (GET /orders) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Read Detail (GET /orders/:id) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Cancel (POST /orders/:id/cancel) | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pay (POST /orders/:id/pay) | 🔓 | 🔓 | 🔓 | ✅ | ✅ | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Get Barcode (GET /orders/:id/barcode) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Get Invoice (GET /orders/:id/invoice) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |

### 1.6 Access Matrix — Lab Tests (Master Data: Test Categories, Tests, Panels)

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Read (GET /master/test-categories) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/test-categories) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/test-categories/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/test-categories/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/tests) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/tests) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/tests/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/tests/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/panels) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/panels) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/panels/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/panels/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |


### 1.7 Access Matrix — Reference Master Data (Doctors, Clinics, Insurances, Equipment, Reagents, Sample Types, Units)

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Read (GET /master/doctors) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/doctors) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/doctors/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/doctors/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/clinics) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/clinics) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/clinics/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/clinics/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/insurances) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/insurances) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/insurances/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/insurances/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/equipments) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/equipments) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/equipments/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/equipments/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/reagents) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/reagents) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/reagents/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/reagents/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/sample-types) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/sample-types) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/sample-types/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/sample-types/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Read (GET /master/units) | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 | 🔓 |
| Create (POST /master/units) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/units/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/units/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |


### 1.8 Access Matrix — Tariffs Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Read (GET /master/tariffs) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create (POST /master/tariffs) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update (PUT /master/tariffs/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Delete (DELETE /master/tariffs/:id) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Note**: Tariff read access is currently restricted to ADMIN/SUPER_ADMIN only. This creates operational friction — KASIR cannot view pricing during order entry. Recommended: grant `tariff:read` to KASIR in Full RBAC model.

### 1.9 Access Matrix — Lab Workflow Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Confirm Sample (POST /lab/:orderId/sample) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View Queue (GET /lab/queue) | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Approval Queue (GET /lab/approval-queue) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Enter Results (PUT /lab/:orderId/results) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Delta Check (GET /lab/:orderId/delta-check) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Verify Results (POST /lab/:orderId/verify) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Results (POST /lab/:orderId/approve) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |


### 1.10 Access Matrix — Dashboard Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Executive Summary (GET /dashboard/executive-summary) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Recent Orders (GET /dashboard/recent-orders) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Lab Summary (GET /dashboard/lab-summary) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lab Volume (GET /dashboard/lab-volume) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Region Distribution (GET /dashboard/region-distribution) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.11 Access Matrix — Audit Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Read Audit Logs (GET /audit-logs) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.12 Access Matrix — Settings Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Read SMTP (GET /settings/smtp) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Update SMTP (PUT /settings/smtp) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Test SMTP (POST /settings/smtp/test) | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.13 Access Matrix — Regions Resource Group

| Action | SUPER_ADMIN | OWNER | MANAGER | KASIR | ADMIN | SAMPLING | ANALIS | DOKTER | CS | MARKETING | KLINIK_PARTNER |
|--------|:-----------:|:-----:|:-------:|:-----:|:-----:|:--------:|:------:|:------:|:--:|:---------:|:--------------:|
| Read Provinsi (GET /regions/provinsi) | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Read Kabupaten (GET /regions/kabupaten-kota) | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Read Kecamatan (GET /regions/kecamatan) | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Read Kelurahan (GET /regions/kelurahan-desa) | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Sync Regions (POST /regions/sync) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |


### 1.14 Access Matrix Summary — Permission Count per Role

| Role | Explicit (✅) | Auth-Only (🔓) | Public (🌐) | Denied (❌) | Total Accessible |
|------|:------------:|:--------------:|:-----------:|:-----------:|:----------------:|
| SUPER_ADMIN | 56 | 13 | 6 | 8 | 75 |
| ADMIN | 55 | 13 | 6 | 9 | 74 |
| OWNER | 5 | 13 | 6 | 59 | 24 |
| MANAGER | 5 | 13 | 6 | 59 | 24 |
| KASIR | 9 | 13 | 6 | 55 | 28 |
| CS | 4 | 13 | 6 | 60 | 23 |
| ANALIS | 5 | 13 | 6 | 59 | 24 |
| DOKTER | 4 | 13 | 6 | 60 | 23 |
| SAMPLING | 2 | 13 | 6 | 62 | 21 |
| KLINIK_PARTNER | 2 | 13 | 6 | 62 | 21 |
| MARKETING | 0 | 13 | 6 | 64 | 19 |

### 1.15 Proposed Permission String Mapping (for Full RBAC)

In the Full RBAC model, each action maps to a permission string following the `resource:action` pattern:

| Resource Group | Permission Strings |
|---------------|-------------------|
| Users | `users:create`, `users:read`, `users:update`, `users:delete` |
| Patients | `patients:create`, `patients:read`, `patients:update` |
| Orders | `orders:create`, `orders:read`, `orders:cancel`, `orders:pay` |
| Lab Tests | `test-categories:create`, `test-categories:read`, `test-categories:update`, `test-categories:delete`, `tests:create`, `tests:read`, `tests:update`, `tests:delete`, `panels:create`, `panels:read`, `panels:update`, `panels:delete` |
| Reference Master Data | `doctors:create`, `doctors:read`, `doctors:update`, `doctors:delete`, `clinics:create`, `clinics:read`, `clinics:update`, `clinics:delete`, `insurances:create`, `insurances:read`, `insurances:update`, `insurances:delete`, `equipments:create`, `equipments:read`, `equipments:update`, `equipments:delete`, `reagents:create`, `reagents:read`, `reagents:update`, `reagents:delete`, `sample-types:create`, `sample-types:read`, `sample-types:update`, `sample-types:delete`, `units:create`, `units:read`, `units:update`, `units:delete` |
| Tariffs | `tariffs:create`, `tariffs:read`, `tariffs:update`, `tariffs:delete` |
| Lab Workflow | `lab:sample-confirm`, `lab:queue-view`, `lab:approval-queue-view`, `lab:results-enter`, `lab:delta-check-view`, `lab:results-verify`, `lab:results-approve` |
| Dashboard | `dashboard:executive-summary`, `dashboard:recent-orders`, `dashboard:lab-summary`, `dashboard:lab-volume`, `dashboard:region-distribution` |
| Audit | `audit:read` |
| Settings | `settings:read`, `settings:update`, `settings:test-smtp` |
| Regions | `regions:read`, `regions:sync` |

**Total unique permissions: 60**


---

## 2. Database Schema Proposal

### 2.1 Entity Relationship Diagram (Textual)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│     User     │────<│   UserRole       │>────│     Role*    │
│              │     │   (junction)     │     │              │
│ id           │     │ userId           │     │ id           │
│ email        │     │ roleId           │     │ name         │
│ name         │     │ assignedAt       │     │ description  │
│ passwordHash │     │ assignedBy       │     │ parentRoleId │
│ deletedAt    │     └──────────────────┘     │ level        │
│              │                               └──────┬───────┘
│              │                                      │
│              │     ┌──────────────────┐     ┌──────┴───────┐
│              │────<│ UserDepartment   │     │RolePermission│
│              │     │ (junction)       │     │ (junction)   │
│              │     │ userId           │     │ roleId       │
│              │     │ departmentId     │     │ permissionId │
│              │     │ isPrimary        │     │ grantedAt    │
│              │     │ assignedAt       │     │ grantedBy    │
└──────────────┘     └──────────┬───────┘     └──────┬───────┘
                                │                     │
                     ┌──────────┴───────┐     ┌──────┴───────┐
                     │   Department     │     │  Permission  │
                     │                  │     │              │
                     │ id               │     │ id           │
                     │ code             │     │ name         │
                     │ name             │     │ description  │
                     │ parentId (self)  │     │ module       │
                     │ isActive         │     │ action       │
                     └──────────┬───────┘     │ resource     │
                                │             │ isActive     │
                     ┌──────────┴───────┐     └──────────────┘
                     │    Position      │
                     │                  │
                     │ id               │
                     │ name             │
                     │ level            │
                     │ departmentId     │
                     │ isActive         │
                     └──────────────────┘
```

*Note: Role entity replaces the current Role enum with a database table to support dynamic role management and hierarchy.*


### 2.2 Prisma Schema Proposal

```prisma
// ============================================================
// RBAC ENTITIES — Full RBAC Model (Option B)
// ============================================================

/// Permission represents a single action on a single resource.
/// Granularity: resource:action (e.g., "orders:create", "lab:results-approve")
model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique          // e.g., "orders:create"
  description String?                   // Human-readable description
  module      String                    // Module grouping: "users", "laboratory", "settings"
  resource    String                    // Resource: "orders", "patients", "tariffs"
  action      String                    // Action: "create", "read", "update", "delete", "approve"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  rolePermissions RolePermission[]

  @@unique([resource, action])
  @@index([module])
  @@map("permissions")
}

/// RolePermission is the junction table linking roles to permissions.
/// Enables dynamic (runtime-configurable) permission assignment.
model RolePermission {
  id           String   @id @default(uuid()) @db.Uuid
  roleId       String   @db.Uuid
  permissionId String   @db.Uuid
  grantedAt    DateTime @default(now())
  grantedBy    String?  @db.Uuid        // User ID who assigned this permission

  role       RoleEntity @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
  @@map("role_permissions")
}

/// RoleEntity replaces the Role enum with a database table.
/// Supports hierarchy via parentRoleId (child inherits parent permissions).
model RoleEntity {
  id           String   @id @default(uuid()) @db.Uuid
  name         String   @unique          // e.g., "SUPER_ADMIN", "ADMIN", "KASIR"
  displayName  String                    // e.g., "Super Administrator", "Kasir"
  description  String?
  parentRoleId String?  @db.Uuid        // Role hierarchy: child inherits parent permissions
  level        Int      @default(0)      // Hierarchy level: 0 = top, higher = lower privilege
  isActive     Boolean  @default(true)
  isSystem     Boolean  @default(false)  // System roles cannot be deleted
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  parentRole      RoleEntity?      @relation("RoleHierarchy", fields: [parentRoleId], references: [id])
  childRoles      RoleEntity[]     @relation("RoleHierarchy")
  rolePermissions RolePermission[]
  userRoles       UserRole[]

  @@index([parentRoleId])
  @@map("roles")
}
```


```prisma
/// UserRole enables multi-role assignment per user.
/// Replaces the single User.role enum field.
model UserRole {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  roleId     String   @db.Uuid
  isPrimary  Boolean  @default(false)    // Primary role for display purposes
  assignedAt DateTime @default(now())
  assignedBy String?  @db.Uuid           // User ID who assigned this role

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  role RoleEntity @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([userId, roleId])
  @@index([userId])
  @@index([roleId])
  @@map("user_roles")
}

/// Department represents an organizational unit (branch, lab location, partner clinic).
/// Supports hierarchy via parentId for multi-level org structures.
model Department {
  id        String    @id @default(uuid()) @db.Uuid
  code      String    @unique             // Short code: "LAB-JKT-01", "CLINIC-BDG-01"
  name      String                        // "Laboratorium Jakarta Pusat"
  parentId  String?   @db.Uuid           // Hierarchical: parent department
  address   String?
  phone     String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  parent          Department?      @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children        Department[]     @relation("DepartmentHierarchy")
  positions       Position[]
  userDepartments UserDepartment[]

  @@index([parentId])
  @@map("departments")
}

/// Position represents a job position within a department.
/// Maps organizational chart positions to the access control model.
model Position {
  id           String   @id @default(uuid()) @db.Uuid
  name         String                     // "Kepala Laboratorium", "Analis Senior", "Kasir"
  level        Int      @default(0)       // Seniority level: 0 = staff, 1 = senior, 2 = lead, 3 = head
  departmentId String   @db.Uuid
  description  String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([name, departmentId])
  @@index([departmentId])
  @@map("positions")
}

/// UserDepartment assigns a user to a department with an optional position.
/// Enables department-based data scoping (user sees only their department's data).
model UserDepartment {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  departmentId String   @db.Uuid
  positionId   String?  @db.Uuid         // Optional: position within the department
  isPrimary    Boolean  @default(false)   // Primary department for data scoping
  assignedAt   DateTime @default(now())
  assignedBy   String?  @db.Uuid

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)

  @@unique([userId, departmentId])
  @@index([userId])
  @@index([departmentId])
  @@map("user_departments")
}
```


### 2.3 Entity Specifications

#### Permission Entity

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| name | String | UNIQUE, NOT NULL | Permission key: `resource:action` format |
| description | String | NULLABLE | Human-readable description |
| module | String | NOT NULL, INDEXED | Module grouping for admin UI filtering |
| resource | String | NOT NULL | Resource name (maps to API resource group) |
| action | String | NOT NULL | Action verb: create, read, update, delete, or custom |
| isActive | Boolean | DEFAULT true | Soft-disable without deletion |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification timestamp |

**Unique Constraints:** `name`, `(resource, action)`

**Initial Seed Count:** 60 permissions (from Section 1.15)

#### RolePermission Entity

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| roleId | UUID | FK → RoleEntity.id, NOT NULL | Referenced role |
| permissionId | UUID | FK → Permission.id, NOT NULL | Referenced permission |
| grantedAt | DateTime | DEFAULT now() | When permission was assigned |
| grantedBy | UUID | NULLABLE, FK → User.id | Who assigned it (audit trail) |

**Unique Constraint:** `(roleId, permissionId)` — prevents duplicate assignment

**Initial Seed Count:** ~198 entries (mapping current role-endpoint assignments)

#### Department Entity

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| code | String | UNIQUE, NOT NULL | Short organizational code |
| name | String | NOT NULL | Full department name |
| parentId | UUID | NULLABLE, FK → Department.id | Self-referencing hierarchy |
| address | String | NULLABLE | Physical location |
| phone | String | NULLABLE | Contact number |
| isActive | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |
| deletedAt | DateTime | NULLABLE | Soft delete timestamp |

**Self-Referencing Relation:** `parentId → Department.id` enables tree structure for multi-branch labs

#### Position Entity

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| name | String | NOT NULL | Position title |
| level | Int | DEFAULT 0 | Seniority: 0=staff, 1=senior, 2=lead, 3=head |
| departmentId | UUID | FK → Department.id, NOT NULL | Owning department |
| description | String | NULLABLE | Position description |
| isActive | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Unique Constraint:** `(name, departmentId)` — same position name can exist in different departments

#### UserDepartment Entity

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| userId | UUID | FK → User.id, NOT NULL | Referenced user |
| departmentId | UUID | FK → Department.id, NOT NULL | Referenced department |
| positionId | UUID | NULLABLE, FK → Position.id | Position within the department |
| isPrimary | Boolean | DEFAULT false | Primary department for data scoping |
| assignedAt | DateTime | DEFAULT now() | Assignment timestamp |
| assignedBy | UUID | NULLABLE, FK → User.id | Who assigned (audit trail) |

**Unique Constraint:** `(userId, departmentId)` — user can be in a department only once


### 2.4 Relationship to Existing User Model

The proposed schema extends the existing `User` model without breaking changes:

```prisma
// MODIFIED User model (proposed changes shown as comments)
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  name         String?
  passwordHash String
  role         Role      // RETAINED for backward compatibility during migration
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  // NEW RELATIONS (added in Phase 2-3)
  userRoles       UserRole[]        // Multi-role assignment
  userDepartments UserDepartment[]  // Department membership

  @@map("users")
}
```

**Migration Strategy:**
1. **Phase 1**: Add Permission, RolePermission, RoleEntity tables. Keep `User.role` field unchanged.
2. **Phase 2**: Add UserRole junction table. Seed from existing `User.role` values. Retain `User.role` as deprecated field.
3. **Phase 3**: Add Department, Position, UserDepartment tables. Begin department assignment.
4. **Phase 4** (future): Drop `User.role` field after full migration to UserRole.

### 2.5 Role Hierarchy Definition

Proposed role hierarchy for the Full RBAC model:

```
Level 0: SUPER_ADMIN (inherits all)
  └── Level 1: OWNER (business oversight)
       └── Level 2: MANAGER (operational management)
            ├── Level 3: ADMIN (administrative operations)
            │    ├── Level 4: KASIR (cashier operations)
            │    ├── Level 4: CS (customer service)
            │    └── Level 4: SAMPLING (sample collection)
            ├── Level 3: DOKTER (clinical oversight)
            │    └── Level 4: ANALIS (lab analysis)
            └── Level 3: MARKETING (marketing operations)

Standalone (no parent):
  - KLINIK_PARTNER (external partner, isolated permissions)
```

**Inheritance Rule:** A role inherits ALL permissions from its parent role chain. For example:
- MANAGER inherits OWNER permissions + has own permissions
- ADMIN inherits MANAGER + OWNER permissions + has own permissions
- SUPER_ADMIN inherits everything

**Exception:** KLINIK_PARTNER is standalone — external partners should NOT inherit internal role permissions.


---

## 3. API Endpoint Specifications

### 3.1 Permission Management Endpoints

#### 3.1.1 List Permissions

```
GET /api/v1/permissions
```

| Aspect | Detail |
|--------|--------|
| **Description** | Retrieve all permissions with optional filtering |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `permissions:read` |
| **Allowed Roles** | SUPER_ADMIN, ADMIN |
| **Query Parameters** | `module` (string, optional), `resource` (string, optional), `isActive` (boolean, optional), `page` (int, default 1), `limit` (int, default 50) |
| **Response 200** | `{ data: Permission[], meta: { total, page, limit, totalPages } }` |
| **Response 401** | Unauthorized — missing or invalid token |
| **Response 403** | Forbidden — insufficient permissions |

**Response Body Example:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "orders:create",
      "description": "Create new laboratory orders",
      "module": "laboratory",
      "resource": "orders",
      "action": "create",
      "isActive": true,
      "createdAt": "2026-07-09T00:00:00Z",
      "updatedAt": "2026-07-09T00:00:00Z"
    }
  ],
  "meta": { "total": 60, "page": 1, "limit": 50, "totalPages": 2 }
}
```

#### 3.1.2 Get Permission by ID

```
GET /api/v1/permissions/:id
```

| Aspect | Detail |
|--------|--------|
| **Description** | Retrieve a single permission by its UUID |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `permissions:read` |
| **Allowed Roles** | SUPER_ADMIN, ADMIN |
| **Path Parameters** | `id` (UUID, required) |
| **Response 200** | `{ data: Permission }` |
| **Response 404** | Permission not found |


#### 3.1.3 Create Permission

```
POST /api/v1/permissions
```

| Aspect | Detail |
|--------|--------|
| **Description** | Create a new permission (for custom/additional permissions beyond seed) |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `permissions:create` |
| **Allowed Roles** | SUPER_ADMIN |
| **Content-Type** | application/json |
| **Response 201** | `{ data: Permission }` |
| **Response 400** | Validation error (missing required fields, duplicate name) |
| **Response 409** | Conflict — permission with same name or resource:action already exists |

**Request Body:**
```json
{
  "name": "reports:export",
  "description": "Export laboratory reports to PDF",
  "module": "laboratory",
  "resource": "reports",
  "action": "export"
}
```

**Validation Rules:**
- `name`: required, unique, format `resource:action`, max 100 chars
- `module`: required, must be one of: `users`, `laboratory`, `settings`, `audit`, `regions`, `dashboard`
- `resource`: required, max 50 chars
- `action`: required, max 50 chars

#### 3.1.4 Update Permission

```
PUT /api/v1/permissions/:id
```

| Aspect | Detail |
|--------|--------|
| **Description** | Update an existing permission's metadata |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `permissions:update` |
| **Allowed Roles** | SUPER_ADMIN |
| **Path Parameters** | `id` (UUID, required) |
| **Response 200** | `{ data: Permission }` |
| **Response 404** | Permission not found |
| **Response 409** | Conflict — name collision with another permission |

**Request Body:**
```json
{
  "description": "Updated description",
  "isActive": false
}
```

**Updatable Fields:** `description`, `isActive`
**Immutable Fields:** `name`, `module`, `resource`, `action` (changing these would break role-permission mappings)

#### 3.1.5 Delete Permission

```
DELETE /api/v1/permissions/:id
```

| Aspect | Detail |
|--------|--------|
| **Description** | Soft-delete a permission (sets isActive=false, removes from role assignments) |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `permissions:delete` |
| **Allowed Roles** | SUPER_ADMIN |
| **Path Parameters** | `id` (UUID, required) |
| **Response 200** | `{ data: { id, deleted: true } }` |
| **Response 404** | Permission not found |
| **Response 409** | Conflict — cannot delete a system-seed permission that is currently assigned to roles |

**Behavior:**
- Sets `isActive = false`
- Removes all `RolePermission` entries referencing this permission
- Audit log entry created with old/new state


### 3.2 Role-Permission Assignment Endpoints

#### 3.2.1 List Role Permissions

```
GET /api/v1/roles/:roleId/permissions
```

| Aspect | Detail |
|--------|--------|
| **Description** | List all permissions assigned to a specific role (includes inherited from parent) |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:read` |
| **Allowed Roles** | SUPER_ADMIN, ADMIN |
| **Path Parameters** | `roleId` (UUID, required) |
| **Query Parameters** | `includeInherited` (boolean, default true), `module` (string, optional) |
| **Response 200** | See below |
| **Response 404** | Role not found |

**Response Body:**
```json
{
  "data": {
    "role": {
      "id": "uuid",
      "name": "ADMIN",
      "displayName": "Administrator",
      "level": 3
    },
    "permissions": {
      "direct": [
        { "id": "uuid", "name": "users:create", "module": "users", "grantedAt": "..." }
      ],
      "inherited": [
        { "id": "uuid", "name": "dashboard:executive-summary", "module": "dashboard", "inheritedFrom": "MANAGER" }
      ]
    },
    "totalDirect": 55,
    "totalInherited": 5,
    "totalEffective": 60
  }
}
```

#### 3.2.2 Assign Permission to Role

```
POST /api/v1/roles/:roleId/permissions
```

| Aspect | Detail |
|--------|--------|
| **Description** | Assign one or more permissions to a role |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:assign-permission` |
| **Allowed Roles** | SUPER_ADMIN |
| **Path Parameters** | `roleId` (UUID, required) |
| **Response 201** | `{ data: { assigned: number, skipped: number, details: [...] } }` |
| **Response 400** | Validation error — invalid permission IDs |
| **Response 404** | Role not found |

**Request Body:**
```json
{
  "permissionIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Behavior:**
- Assigns each permission to the role via RolePermission junction
- If a permission is already assigned, it is skipped (idempotent)
- Sets `grantedBy` to the current user's ID
- Creates audit log entry for each new assignment
- Invalidates permission cache for all users with this role

#### 3.2.3 Revoke Permission from Role

```
DELETE /api/v1/roles/:roleId/permissions
```

| Aspect | Detail |
|--------|--------|
| **Description** | Remove one or more permissions from a role |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:revoke-permission` |
| **Allowed Roles** | SUPER_ADMIN |
| **Path Parameters** | `roleId` (UUID, required) |
| **Response 200** | `{ data: { revoked: number, notFound: number } }` |
| **Response 400** | Validation error |
| **Response 404** | Role not found |

**Request Body:**
```json
{
  "permissionIds": ["uuid-1", "uuid-2"]
}
```

**Behavior:**
- Removes RolePermission entries for the specified permission-role combinations
- If a permission wasn't assigned, it is counted as `notFound` (no error)
- Creates audit log entry for each revocation
- Invalidates permission cache for all users with this role


#### 3.2.4 Get Effective Permissions for Current User

```
GET /api/v1/auth/permissions
```

| Aspect | Detail |
|--------|--------|
| **Description** | Returns the effective (resolved) permissions for the currently authenticated user |
| **Guard** | JwtAuthGuard |
| **Required Permission** | None (any authenticated user can check their own permissions) |
| **Response 200** | See below |

**Response Body:**
```json
{
  "data": {
    "userId": "uuid",
    "roles": ["ADMIN", "SAMPLING"],
    "permissions": [
      "users:create", "users:read", "users:update",
      "patients:create", "patients:read",
      "orders:create", "orders:read",
      "lab:sample-confirm", "lab:queue-view"
    ],
    "departments": [
      { "id": "uuid", "code": "LAB-JKT-01", "name": "Lab Jakarta Pusat", "isPrimary": true }
    ],
    "resolvedAt": "2026-07-09T10:30:00Z"
  }
}
```

**Usage:** Frontend uses this endpoint on login/token-refresh to build the client-side permission map for UI visibility control (show/hide menus, buttons, actions).

#### 3.2.5 Bulk Assign Permissions (Role Template)

```
POST /api/v1/roles/:roleId/permissions/bulk
```

| Aspect | Detail |
|--------|--------|
| **Description** | Replace all permissions for a role with a new set (bulk assignment) |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:bulk-assign` |
| **Allowed Roles** | SUPER_ADMIN |
| **Path Parameters** | `roleId` (UUID, required) |
| **Response 200** | `{ data: { totalAssigned: number, previousCount: number } }` |
| **Response 400** | Validation error |
| **Response 404** | Role not found |

**Request Body:**
```json
{
  "permissionIds": ["uuid-1", "uuid-2", "..."],
  "replaceExisting": true
}
```

**Behavior:**
- If `replaceExisting = true`: removes all current RolePermission entries for the role, then assigns the new set
- If `replaceExisting = false`: merges (adds new, keeps existing, does not remove)
- Creates audit log with before/after state
- Invalidates permission cache


### 3.3 Role Management Endpoints

#### 3.3.1 List Roles

```
GET /api/v1/roles
```

| Aspect | Detail |
|--------|--------|
| **Description** | List all roles with their hierarchy info and permission count |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:read` |
| **Allowed Roles** | SUPER_ADMIN, ADMIN |
| **Query Parameters** | `isActive` (boolean, optional), `includePermissionCount` (boolean, default true) |
| **Response 200** | `{ data: RoleWithMeta[] }` |

**Response Body:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "ADMIN",
      "displayName": "Administrator",
      "description": "Administrative operations",
      "parentRoleId": "uuid-of-manager",
      "parentRoleName": "MANAGER",
      "level": 3,
      "isSystem": true,
      "isActive": true,
      "directPermissionCount": 55,
      "effectivePermissionCount": 60,
      "userCount": 3
    }
  ]
}
```

#### 3.3.2 Create Role

```
POST /api/v1/roles
```

| Aspect | Detail |
|--------|--------|
| **Description** | Create a new custom role |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:create` |
| **Allowed Roles** | SUPER_ADMIN |
| **Response 201** | `{ data: RoleEntity }` |
| **Response 409** | Conflict — role name already exists |

**Request Body:**
```json
{
  "name": "LAB_SUPERVISOR",
  "displayName": "Lab Supervisor",
  "description": "Supervises lab analysts and can override result verification",
  "parentRoleId": "uuid-of-admin",
  "level": 3
}
```

#### 3.3.3 Update Role

```
PUT /api/v1/roles/:id
```

| Aspect | Detail |
|--------|--------|
| **Description** | Update role metadata (not permissions — use assignment endpoints) |
| **Guard** | JwtAuthGuard + PermissionGuard |
| **Required Permission** | `roles:update` |
| **Allowed Roles** | SUPER_ADMIN |
| **Response 200** | `{ data: RoleEntity }` |
| **Response 403** | Cannot modify system roles (isSystem=true) name or level |
| **Response 404** | Role not found |

**Updatable Fields:** `displayName`, `description`, `parentRoleId`, `level`, `isActive`
**Immutable for System Roles:** `name`

### 3.4 API Endpoint Summary Table

| # | Method | Path | Permission | Description |
|---|--------|------|-----------|-------------|
| 1 | GET | `/api/v1/permissions` | `permissions:read` | List all permissions |
| 2 | GET | `/api/v1/permissions/:id` | `permissions:read` | Get permission by ID |
| 3 | POST | `/api/v1/permissions` | `permissions:create` | Create permission |
| 4 | PUT | `/api/v1/permissions/:id` | `permissions:update` | Update permission |
| 5 | DELETE | `/api/v1/permissions/:id` | `permissions:delete` | Delete permission |
| 6 | GET | `/api/v1/roles` | `roles:read` | List all roles |
| 7 | POST | `/api/v1/roles` | `roles:create` | Create role |
| 8 | PUT | `/api/v1/roles/:id` | `roles:update` | Update role |
| 9 | GET | `/api/v1/roles/:roleId/permissions` | `roles:read` | List role permissions |
| 10 | POST | `/api/v1/roles/:roleId/permissions` | `roles:assign-permission` | Assign permissions |
| 11 | DELETE | `/api/v1/roles/:roleId/permissions` | `roles:revoke-permission` | Revoke permissions |
| 12 | POST | `/api/v1/roles/:roleId/permissions/bulk` | `roles:bulk-assign` | Bulk assign |
| 13 | GET | `/api/v1/auth/permissions` | (any authenticated) | Get current user permissions |


---

## 4. Permission Seed Data

### 4.1 Initial Role-Permission Seed (replicating current behavior)

The following table shows the initial seed data that replicates the current `@Roles` decorator behavior as RolePermission entries:

| Role | Seeded Permissions (permission names) |
|------|--------------------------------------|
| SUPER_ADMIN | ALL 60 permissions (full access) |
| ADMIN | All except `users:delete` (55 explicit + inherited read permissions) |
| OWNER | `dashboard:executive-summary`, `dashboard:recent-orders`, `dashboard:lab-summary`, `dashboard:lab-volume`, `dashboard:region-distribution` |
| MANAGER | `dashboard:executive-summary`, `dashboard:recent-orders`, `dashboard:lab-summary`, `dashboard:lab-volume`, `dashboard:region-distribution` |
| KASIR | `orders:create`, `orders:cancel`, `orders:pay`, `patients:create`, `patients:update`, `dashboard:executive-summary`, `dashboard:recent-orders` + all `*:read` permissions |
| CS | `patients:create`, `patients:update`, `dashboard:executive-summary`, `dashboard:recent-orders` + all `*:read` permissions |
| SAMPLING | `lab:sample-confirm`, `lab:queue-view` + all `*:read` permissions |
| ANALIS | `lab:queue-view`, `lab:results-enter`, `lab:delta-check-view`, `lab:results-verify` + all `*:read` permissions |
| DOKTER | `lab:queue-view`, `lab:approval-queue-view`, `lab:delta-check-view`, `lab:results-approve` + all `*:read` permissions |
| MARKETING | all `*:read` permissions only (no write access to any resource) |
| KLINIK_PARTNER | `orders:create`, `patients:create` + all `*:read` permissions |

### 4.2 Recommended Permission Additions (beyond current state)

These permissions address gaps identified in the enterprise access control evaluation:

| Permission | Recommended For | Rationale |
|-----------|----------------|-----------|
| `tariffs:read` | KASIR, CS, KLINIK_PARTNER | Currently denied — causes operational friction during order entry |
| `dashboard:lab-summary` | ANALIS, DOKTER | Lab staff should see lab performance metrics |
| `patients:read-own-department` | All (with data scoping) | Department-scoped read (Phase 3) |
| `orders:read-own-department` | All (with data scoping) | Department-scoped read (Phase 3) |
| `lab:delegate-approval` | DOKTER | Approval delegation when pathologist is absent |
| `users:read-department` | MANAGER, ADMIN | View users within own department only |

---

## 5. Implementation Considerations

### 5.1 Permission Resolution Algorithm

```
function resolveEffectivePermissions(userId):
  1. Get all roles for user from UserRole table
  2. For each role, traverse parentRoleId chain upward collecting all ancestor roles
  3. Collect all permissions from RolePermission for all roles in the chain (union)
  4. Filter by isActive = true on both Permission and RoleEntity
  5. Return deduplicated set of permission names
```

**Caching Strategy:**
- Cache resolved permissions in Redis with key `permissions:user:{userId}`
- TTL: 5 minutes (configurable)
- Invalidate on: role-permission change, user-role change, role hierarchy change

### 5.2 PermissionGuard Implementation (Proposed)

```typescript
// Proposed guard (documentation only — not implemented)
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY, [context.getHandler(), context.getClass()]
    );
    if (!requiredPermission) {
      return false; // Default-deny: no permission decorator = access denied
    }
    const { user } = context.switchToHttp().getRequest();
    const userPermissions = await this.permissionService.getEffectivePermissions(user.id);
    return userPermissions.includes(requiredPermission);
  }
}
```

**Key difference from current RolesGuard:** Default-deny when no decorator is present (fixes Gap #7 from current limitations).

### 5.3 Migration Safety

| Concern | Mitigation |
|---------|-----------|
| Zero-downtime migration | Deploy schema changes first (additive), then deploy code changes |
| Permission seed accuracy | Automated test comparing old `@Roles` behavior vs new `@RequirePermission` for all 83 endpoints |
| Cache invalidation race | Use event-driven invalidation + TTL fallback |
| Frontend synchronization | `GET /auth/permissions` called on login; frontend caches locally |

---

## 6. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `docs/17-Audit/_inventory/rbac-implementation-current.md` | READ-ONLY | Used as primary input for endpoint-role mapping |
| `docs/17-Audit/_inventory/enterprise-access-control-evaluation.md` | READ-ONLY | Used for Option B recommendation and gap references |
| `apps/api/prisma/schema.prisma` | READ-ONLY | Referenced current User model and schema patterns |
| `docs/17-Audit/_inventory/` | READ + WRITE | Wrote this documentation |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Access Matrix, Database Schema Proposal & API Endpoint Specifications — Generated for Enterprise Admin Architecture Audit Task 7.3*
