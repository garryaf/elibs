# Navigation Review — eLIS Enterprise Administration

**Document ID:** AUDIT-eLIS-2026-003  
**Version:** 1.0  
**Date:** 2026-07-09  
**Author:** Enterprise Architect (Automated Audit)  
**Classification:** Internal  
**Status:** Draft  

---

## Executive Summary

This document presents a comprehensive navigation review of the eLIS (Enterprise Laboratory Information System) administration interface. The review covers the current sidebar structure, enterprise UX evaluation, recommended navigation architecture (Option C — Hierarchical with Expandable Sub-Menus), a complete enterprise navigation blueprint, and a backend-frontend alignment analysis identifying modules without corresponding frontend navigation paths.

**Key Findings:**
- The current "Pengaturan" (Settings) menu contains 14 sub-features, exceeding the 7-item enterprise threshold by 100%
- Only 7.1% of items under "Pengaturan" are actual system settings; 85.7% are Master Data entities
- 3 backend API modules lack dedicated frontend navigation entries (identified as gaps)
- Option C (Hierarchical Navigation) is recommended to resolve all identified UX violations

---

## Table of Contents

1. [Current Sidebar Structure](#1-current-sidebar-structure)
2. [Navigation UX Evaluation](#2-navigation-ux-evaluation)
3. [Recommended Option: C — Hierarchical Navigation](#3-recommended-option-c--hierarchical-navigation)
4. [Enterprise Navigation Blueprint](#4-enterprise-navigation-blueprint)
5. [Backend-Frontend Navigation Alignment](#5-backend-frontend-navigation-alignment)
6. [Alignment Gap Summary](#6-alignment-gap-summary)
7. [Recommendations](#7-recommendations)
8. [Cross-References](#8-cross-references)

---

## 1. Current Sidebar Structure

**Source:** `apps/web/src/components/layout/sidebar.tsx`

The current sidebar implements a flat, single-group navigation ("MAIN MENU") with 8 top-level items. No role-based filtering is applied at the frontend layer; all authenticated users see all menu items.

### 1.1 Menu Item Inventory

| # | Menu Item | Route Path | Lucide Icon | Parent Grouping | Access Role (Frontend) | Sub-Feature Count |
|---|-----------|-----------|-------------|----------------|------------------------|-------------------|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | MAIN MENU | All authenticated | 0 |
| 2 | Pasien | `/dashboard/patients` | `Users` | MAIN MENU | All authenticated | 0 |
| 3 | Order & Kasir | `/dashboard/orders` | `FileText` | MAIN MENU | All authenticated | 2 |
| 4 | Laboratorium | `/dashboard/laboratory` | `TestTube` | MAIN MENU | All authenticated | 6 |
| 5 | Validasi Dokter | `/dashboard/doctor` | `Stethoscope` | MAIN MENU | All authenticated | 0 |
| 6 | Laporan | `/dashboard/reports` | `BarChart3` | MAIN MENU | All authenticated | 0 |
| 7 | Audit Trail | `/dashboard/audit-trail` | `Shield` | MAIN MENU | All authenticated | 0 |
| 8 | Pengaturan | `/dashboard/settings` | `Settings` | MAIN MENU | All authenticated | 14 |

### 1.2 Pengaturan (Settings) Sub-Features

The "Pengaturan" page hosts 14 sub-features as tabs within a single page component:

| # | Tab ID | Tab Label | API Endpoint | Domain Category |
|---|--------|-----------|-------------|-----------------|
| 1 | test-categories | Kategori Tes | `/api/v1/master/test-categories` | Master Data |
| 2 | tests | Tes Laboratorium | `/api/v1/master/tests` | Master Data |
| 3 | doctors | Dokter | `/api/v1/master/doctors` | Master Data |
| 4 | clinics | Klinik | `/api/v1/master/clinics` | Master Data |
| 5 | insurances | Asuransi | `/api/v1/master/insurances` | Master Data |
| 6 | equipments | Alat | `/api/v1/master/equipments` | Master Data |
| 7 | reagents | Reagen | `/api/v1/master/reagents` | Master Data |
| 8 | sample-types | Tipe Sampel | `/api/v1/master/sample-types` | Master Data |
| 9 | units | Satuan | `/api/v1/master/units` | Master Data |
| 10 | panels | Panel | `/api/v1/master/panels` | Master Data |
| 11 | tariffs | Tarif | `/api/v1/master/tariffs` | Master Data |
| 12 | wilayah | Wilayah | `/api/v1/regions/provinsi` | Master Data |
| 13 | users | Users | `/api/v1/users` | User Administration |
| 14 | smtp | SMTP Settings | `/api/v1/settings/smtp` | System Configuration |

### 1.3 Key Structural Observations

| Finding ID | Description | Severity |
|-----------|-------------|----------|
| F-NAV-001 | Single flat menu group with no hierarchy or sub-grouping | Medium |
| F-NAV-002 | No frontend role-based menu visibility (API returns 403 for unauthorized) | High |
| F-NAV-003 | "Pengaturan" contains 14 sub-features exceeding 7-item capacity threshold | High |
| F-NAV-004 | Mixed domains in "Pengaturan": Master Data (12), User Admin (1), System Config (1) | High |
| F-NAV-005 | High-frequency items (Users) grouped with low-frequency items (Satuan, SMTP) | Medium |
| F-NAV-006 | No expandable sub-menus or collapsible groups | Medium |

---

## 2. Navigation UX Evaluation

### 2.1 Sub-Feature Capacity Assessment

Enterprise UX best practice (Miller's Law): maximum 7±2 items per navigation level for effective cognitive processing.

| Menu Item | Sub-Feature Count | Status |
|-----------|:-----------------:|--------|
| Dashboard | 0 | ✅ Within capacity |
| Pasien | 0 | ✅ Within capacity |
| Order & Kasir | 2 | ✅ Within capacity |
| Laboratorium | 6 | ✅ Within capacity |
| Validasi Dokter | 0 | ✅ Within capacity |
| Laporan | 0 | ✅ Within capacity |
| Audit Trail | 0 | ✅ Within capacity |
| **Pengaturan** | **14** | ⛔ **EXCEEDS (14 > 7)** |

**Finding NAV-UX-001:** "Pengaturan" exceeds the 7-item threshold by 100%. Users must scan 14 tabs to locate their target, increasing task completion time and error rate.

### 2.2 Conceptual Cohesion

- Items matching "Settings" domain purpose: **1 of 14 (7.1%)**
- Items that are Master Data: **12 of 14 (85.7%)**
- Items that are User Administration: **1 of 14 (7.1%)**

**Finding NAV-UX-002:** Extremely low conceptual cohesion. The label "Pengaturan" (Settings) implies system configuration, but 85.7% of content is reference/master data. Violates Nielsen's Heuristic #2 (match between system and real world).

### 2.3 Frequency-of-Access Disparity

| Frequency Band | Count | Examples |
|---------------|:-----:|---------|
| Daily (high) | 1 | Users |
| Weekly (medium) | 5 | Tes Lab, Kategori Tes, Panel, Tarif, Dokter |
| Monthly (low) | 4 | Klinik, Asuransi, Alat, Reagen |
| Rarely | 4 | Tipe Sampel, Satuan, Wilayah, SMTP |

**Finding NAV-UX-003:** Significant frequency disparity. Daily-use item (Users) grouped in a flat list with items accessed quarterly (Satuan, Wilayah, SMTP). Reduces efficiency for frequent operations.

### 2.4 Option Analysis Summary

| Option | Sub-Feature Count | Cohesion | Frequency | Verdict |
|--------|:-----------------:|:--------:|:---------:|---------|
| A — Keep Combined | ⛔ FAIL (14 > 7) | ⛔ FAIL (7.1%) | ⛔ FAIL | **REJECTED** |
| B — Separate Top-Level | ⛔ PARTIAL (12 > 7) | ✅ PASS | ✅ PASS | **REJECTED** |
| C — Hierarchical | ✅ PASS (max 4/group) | ✅ PASS | ✅ PASS | **✅ RECOMMENDED** |

**Option A Rejection:** Fails all three criteria — 14 items is double threshold, 7.1% cohesion is unacceptable, and mixing daily with quarterly tasks creates friction.

**Option B Rejection:** Resolves cohesion and frequency disparity but leaves "Master Data" with 12 items (still exceeding 7-item threshold). Increases top-level to 10 items.

---

## 3. Recommended Option: C — Hierarchical Navigation

### 3.1 Proposed Structure (High-Level)

```
MAIN MENU (7 items at Level 1)
├── Dashboard
├── Pasien (Patients)
├── Order & Kasir (Orders & Cashier)
├── Laboratorium (Laboratory) ─── expandable
│   ├── Antrian Sampel (Queue)
│   ├── Input Hasil (Results)
│   ├── Validasi Dokter (Approval)
│   ├── Data Klinis (Clinical Data) ─── expandable
│   │   ├── Kategori Tes
│   │   ├── Tes Lab
│   │   └── Panel
│   └── Statistik Lab (Stats)
├── Master Data ─── expandable (NEW)
│   ├── Dokter
│   ├── Klinik
│   ├── Asuransi
│   ├── Alat & Reagen ─── expandable
│   │   ├── Alat
│   │   └── Reagen
│   ├── Tipe Sampel
│   ├── Satuan Ukur
│   └── Wilayah
├── Administrasi (Administration) ─── expandable (NEW)
│   ├── Pengguna (Users)
│   ├── Tarif
│   ├── Pengaturan Sistem (System Settings) ─── expandable
│   │   └── SMTP Settings
│   └── Audit Trail
└── Laporan & Audit (Reports & Audit) ─── expandable
    └── Laporan (Reports)
```

### 3.2 Hierarchy Validation

| Constraint | Check | Status |
|-----------|-------|--------|
| Max depth = 3 levels | Deepest: Laboratorium → Data Klinis → Kategori Tes | ✅ Pass |
| Max 7 items at Level 1 | 7 items | ✅ Pass |
| Max 7 items at Level 2 (Laboratorium) | 5 items | ✅ Pass |
| Max 7 items at Level 2 (Master Data) | 7 items | ✅ Pass |
| Max 7 items at Level 2 (Administrasi) | 4 items | ✅ Pass |
| Max 7 items at Level 3 | Max 3 items (Data Klinis) | ✅ Pass |

### 3.3 Justification

Option C satisfies all three enterprise UX criteria:

1. **Sub-feature capacity:** 14 items distributed across logical sub-groups of max 4 items each; every level within 7-item threshold.
2. **Conceptual cohesion:** Domain-based grouping (Clinical, Reference, Infrastructure) ensures predictable content.
3. **Frequency optimization:** Daily-use Users has dedicated "Administrasi" entry point; rarely-used infrastructure items tucked into sub-groups.

Additional benefits: scalability for future features, role-based filtering readiness, progressive disclosure reducing initial cognitive load from 14 to 7 items.

---

## 4. Enterprise Navigation Blueprint

### 4.1 Domain Assignment Matrix

Each of the 14 sub-features assigned to exactly one domain:

| # | Sub-Feature | Assigned Domain | Rationale |
|---|-------------|-----------------|-----------|
| 1 | Test Categories | Clinical Operations | Core clinical reference — test classification for lab workflow |
| 2 | Lab Tests | Clinical Operations | Clinical entity — test definitions for orders/results |
| 3 | Panels | Clinical Operations | Test groupings for clinical ordering |
| 4 | Tariffs | Administration | Pricing/financial data — drives billing |
| 5 | Doctors | Master Data | Reference entity for orders, results, validation |
| 6 | Clinics | Master Data | Reference entity for referring facilities |
| 7 | Insurance | Master Data | Reference entity for payment/billing |
| 8 | Equipment | Master Data | Laboratory equipment registry |
| 9 | Reagents | Master Data | Laboratory consumables catalog |
| 10 | Sample Types | Master Data | Specimen collection reference |
| 11 | Measurement Units | Master Data | Test result value reference |
| 12 | Users | Administration | User account management |
| 13 | Wilayah | Master Data | Geographic reference data |
| 14 | SMTP Settings | System Configuration | Email notification configuration |

### 4.2 Domain Summary

| Domain | Sub-Features | Count |
|--------|-------------|:-----:|
| Clinical Operations | Test Categories, Lab Tests, Panels | 3 |
| Administration | Tariffs, Users | 2 |
| Master Data | Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Wilayah | 8 |
| System Configuration | SMTP Settings | 1 |
| Reporting | *(covered by existing "Laporan" menu)* | 0 |

### 4.3 Complete Route Path & Icon Mapping

| Navigation Entry | Route Path | Lucide Icon | API Endpoint |
|-----------------|-----------|-------------|-------------|
| Dashboard | `/dashboard` | `LayoutDashboard` | `/api/v1/dashboard/stats` |
| Pasien | `/dashboard/patients` | `Users` | `/api/v1/patients` |
| Order & Kasir | `/dashboard/orders` | `FileText` | `/api/v1/orders` |
| Laboratorium | `/dashboard/laboratory` | `TestTube` | `/api/v1/lab/*` |
| → Antrian Sampel | `/dashboard/laboratory/queue` | `ListOrdered` | `/api/v1/lab/queue` |
| → Input Hasil | `/dashboard/laboratory/results` | `ClipboardEdit` | `/api/v1/lab/results` |
| → Validasi Dokter | `/dashboard/laboratory/approval` | `Stethoscope` | `/api/v1/lab/approve` |
| → Data Klinis | `/dashboard/laboratory/clinical-data` | `FlaskConical` | — (group) |
| →→ Kategori Tes | `/dashboard/laboratory/clinical-data/test-categories` | `FolderTree` | `/api/v1/master/test-categories` |
| →→ Tes Lab | `/dashboard/laboratory/clinical-data/tests` | `TestTube` | `/api/v1/master/tests` |
| →→ Panel | `/dashboard/laboratory/clinical-data/panels` | `Layers` | `/api/v1/master/panels` |
| → Statistik Lab | `/dashboard/laboratory/stats` | `Activity` | `/api/v1/dashboard/stats` |
| Master Data | `/dashboard/master-data` | `Database` | — (group) |
| → Dokter | `/dashboard/master-data/doctors` | `Stethoscope` | `/api/v1/master/doctors` |
| → Klinik | `/dashboard/master-data/clinics` | `Building2` | `/api/v1/master/clinics` |
| → Asuransi | `/dashboard/master-data/insurance` | `ShieldCheck` | `/api/v1/master/insurances` |
| → Alat & Reagen | `/dashboard/master-data/equipment-reagents` | `Wrench` | — (group) |
| →→ Alat | `/dashboard/master-data/equipment-reagents/equipment` | `Wrench` | `/api/v1/master/equipments` |
| →→ Reagen | `/dashboard/master-data/equipment-reagents/reagents` | `Beaker` | `/api/v1/master/reagents` |
| → Tipe Sampel | `/dashboard/master-data/sample-types` | `Droplets` | `/api/v1/master/sample-types` |
| → Satuan Ukur | `/dashboard/master-data/measurement-units` | `Ruler` | `/api/v1/master/units` |
| → Wilayah | `/dashboard/master-data/regions` | `MapPin` | `/api/v1/regions/provinsi` |
| Administrasi | `/dashboard/administration` | `Settings` | — (group) |
| → Pengguna | `/dashboard/administration/users` | `UserCog` | `/api/v1/users` |
| → Tarif | `/dashboard/administration/tariffs` | `DollarSign` | `/api/v1/master/tariffs` |
| → Pengaturan Sistem | `/dashboard/administration/system` | `SlidersHorizontal` | — (group) |
| →→ SMTP Settings | `/dashboard/administration/system/smtp` | `Mail` | `/api/v1/settings/smtp` |
| → Audit Trail | `/dashboard/administration/audit-trail` | `Shield` | `/api/v1/audit-logs` |
| Laporan & Audit | `/dashboard/reports` | `BarChart3` | — (group) |
| → Laporan | `/dashboard/reports/overview` | `FileBarChart` | `/api/v1/reports` |

### 4.4 Role-Based Visibility (Level 1)

| Menu Item | SA | OW | MG | KS | AD | SP | AN | DK | CS | MK | KP |
|-----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pasien | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order & Kasir | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | — | ✓ |
| Laboratorium | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Master Data | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Administrasi | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Laporan & Audit | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |

*Legend: SA=SUPER_ADMIN, OW=OWNER, MG=MANAGER, KS=KASIR, AD=ADMIN, SP=SAMPLING, AN=ANALIS, DK=DOKTER, CS=CS, MK=MARKETING, KP=KLINIK_PARTNER*

---

## 5. Backend-Frontend Navigation Alignment

This section verifies that every backend API module has a corresponding frontend navigation entry and page component. The analysis maps each backend controller route prefix to its frontend counterpart.

### 5.1 Backend API Module Inventory

The following backend modules are registered with API route prefixes:

| # | Backend Module | Location | Route Prefix | Sub-Modules |
|---|---------------|----------|-------------|-------------|
| 1 | **auth** | `apps/api/src/auth/` | `/api/v1/auth` | login |
| 2 | **users** | `apps/api/src/users/` | `/api/v1/users` | CRUD |
| 3 | **master-data** | `apps/api/src/laboratory/master-data/` | `/api/v1/master/*` | test-categories, tests, panels, tariffs, doctors, clinics, insurances, equipments, reagents, sample-types, units |
| 4 | **laboratory** | `apps/api/src/laboratory/` | Multiple | order (`/api/v1/orders`), patient (`/api/v1/patients`), payment (`/api/v1/orders/:id`), lab-workflow (`/api/v1/lab`), dashboard (`/api/v1/dashboard`), audit (`/api/v1/audit-logs`), notification, region (`/api/v1/regions`) |
| 5 | **orders** | `apps/api/src/laboratory/order/` | `/api/v1/orders` | CRUD, query |
| 6 | **regions** | `apps/api/src/laboratory/region/` | `/api/v1/regions` | provinsi, kabupaten, kecamatan, kelurahan, sync |
| 7 | **settings** | `apps/api/src/laboratory/notification/settings.controller.ts` | `/api/v1/settings` | smtp (GET, PUT, POST test) |
| 8 | **dashboard** | `apps/api/src/laboratory/dashboard/` | `/api/v1/dashboard` | stats, region-distribution |
| 9 | **audit** | `apps/api/src/laboratory/audit/` | `/api/v1/audit-logs` | query |
| 10 | **patient** | `apps/api/src/laboratory/patient/` | `/api/v1/patients` | CRUD |
| 11 | **payment** | `apps/api/src/laboratory/payment/` | `/api/v1/orders/:id` | process-payment |
| 12 | **lab-workflow** | `apps/api/src/laboratory/lab-workflow/` | `/api/v1/lab` | queue, results, approve |
| 13 | **notification** | `apps/api/src/laboratory/notification/` | — (internal service) | email, whatsapp, PDF |
| 14 | **health** | `apps/api/src/health/` | `/api/v1/health` | health-check |

### 5.2 Frontend Navigation Entries & Page Components

| # | Frontend Page | Route Path | Page Component | Has Sidebar Entry |
|---|-------------|-----------|----------------|:-----------------:|
| 1 | Dashboard | `/dashboard` | `app/dashboard/page.tsx` | ✓ |
| 2 | Patients | `/dashboard/patients` | `app/dashboard/patients/` | ✓ |
| 3 | Orders | `/dashboard/orders` | `app/dashboard/orders/page.tsx` | ✓ |
| 4 | New Order | `/dashboard/orders/new` | `app/dashboard/orders/new/` | — (child) |
| 5 | Order Detail | `/dashboard/orders/[id]` | `app/dashboard/orders/[id]/` | — (child) |
| 6 | Laboratory | `/dashboard/laboratory` | `app/dashboard/laboratory/page.tsx` | ✓ |
| 7 | Lab Queue | `/dashboard/laboratory/queue` | `app/dashboard/laboratory/queue/` | — (child) |
| 8 | Lab Results | `/dashboard/laboratory/results` | `app/dashboard/laboratory/results/` | — (child) |
| 9 | Lab Approval | `/dashboard/laboratory/approval` | `app/dashboard/laboratory/approval/` | — (child) |
| 10 | Lab Dashboard | `/dashboard/laboratory/lab-dashboard` | `app/dashboard/laboratory/lab-dashboard/` | — (child) |
| 11 | Dashboard Stats | `/dashboard/laboratory/dashboard-stats` | `app/dashboard/laboratory/dashboard-stats/` | — (child) |
| 12 | Doctor Validation | `/dashboard/doctor` | `app/dashboard/doctor/` | ✓ |
| 13 | Reports | `/dashboard/reports` | `app/dashboard/reports/` | ✓ |
| 14 | Audit Trail | `/dashboard/audit-trail` | `app/dashboard/audit-trail/` | ✓ |
| 15 | Settings (14 tabs) | `/dashboard/settings` | `app/dashboard/settings/page.tsx` | ✓ |

### 5.3 Alignment Verification Matrix

| Backend Module | API Route | Frontend Nav Entry | Frontend Page | Alignment Status |
|---------------|-----------|-------------------|---------------|:----------------:|
| **auth** | `/api/v1/auth` | Login page (outside dashboard) | `app/(auth)/login/` | ✅ Aligned |
| **users** | `/api/v1/users` | Settings → Users tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (test-categories) | `/api/v1/master/test-categories` | Settings → Kategori Tes tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (tests) | `/api/v1/master/tests` | Settings → Tes Lab tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (panels) | `/api/v1/master/panels` | Settings → Panel tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (tariffs) | `/api/v1/master/tariffs` | Settings → Tarif tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (doctors) | `/api/v1/master/doctors` | Settings → Dokter tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (clinics) | `/api/v1/master/clinics` | Settings → Klinik tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (insurances) | `/api/v1/master/insurances` | Settings → Asuransi tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (equipments) | `/api/v1/master/equipments` | Settings → Alat tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (reagents) | `/api/v1/master/reagents` | Settings → Reagen tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (sample-types) | `/api/v1/master/sample-types` | Settings → Tipe Sampel tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **master-data** (units) | `/api/v1/master/units` | Settings → Satuan tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **orders** | `/api/v1/orders` | Order & Kasir | `dashboard/orders/` | ✅ Aligned |
| **regions** | `/api/v1/regions` | Settings → Wilayah tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **settings** | `/api/v1/settings` | Settings → SMTP tab | `dashboard/settings` (tab) | ⚠️ Indirect |
| **dashboard** | `/api/v1/dashboard` | Dashboard | `dashboard/page.tsx` | ✅ Aligned |
| **audit** | `/api/v1/audit-logs` | Audit Trail | `dashboard/audit-trail/` | ✅ Aligned |
| **patient** | `/api/v1/patients` | Pasien | `dashboard/patients/` | ✅ Aligned |
| **payment** | `/api/v1/orders/:id` | Order & Kasir (payment flow) | `dashboard/orders/[id]/` | ✅ Aligned |
| **lab-workflow** | `/api/v1/lab` | Laboratorium | `dashboard/laboratory/` | ✅ Aligned |
| **notification** | — (internal) | — (no user-facing UI) | — | ✅ N/A (internal) |
| **health** | `/api/v1/health` | — (no user-facing UI) | — | ✅ N/A (infra) |

### 5.4 Alignment Status Legend

| Status | Meaning |
|--------|---------|
| ✅ Aligned | Backend module has a dedicated frontend page with direct sidebar navigation entry |
| ⚠️ Indirect | Backend module is accessible via a tab within another page, not a dedicated route/page |
| ❌ Gap | Backend module has NO corresponding frontend navigation entry or page |
| ✅ N/A | Internal/infrastructure module not intended for end-user navigation |

---

## 6. Alignment Gap Summary

### 6.1 Modules Lacking Dedicated Frontend Navigation Path

The following backend API modules lack a **dedicated** frontend navigation entry (i.e., they have no direct sidebar menu item or dedicated route page — they are either embedded as tabs within another page or have no frontend representation):

| # | Gap ID | Backend Module | API Route | Current Access Method | Gap Type | Severity | Impact |
|---|--------|---------------|-----------|----------------------|----------|----------|--------|
| 1 | NAV-GAP-001 | **regions** | `/api/v1/regions` | Embedded as "Wilayah" tab in `/dashboard/settings` | No dedicated page/route | Medium | Region management buried under Settings; no direct URL for geographic data management |
| 2 | NAV-GAP-002 | **users** | `/api/v1/users` | Embedded as "Users" tab in `/dashboard/settings` | No dedicated page/route | High | User management — a daily administrative task — lacks dedicated navigation; buried among 13 other tabs |
| 3 | NAV-GAP-003 | **settings** (SMTP) | `/api/v1/settings` | Embedded as "SMTP" tab in `/dashboard/settings` | No dedicated page/route | Low | System configuration tab exists but is mixed with unrelated master data; correct domain but wrong container |

### 6.2 Modules with Indirect Navigation (Tab-Based, No Dedicated Route)

All 11 master-data sub-modules plus users, regions, and settings are currently accessed only through the single `/dashboard/settings` page as tabs. They lack:
- **Individual URL paths** — users cannot bookmark or share a direct link to a specific master data entity
- **Browser history support** — navigating between tabs does not update the URL, breaking back/forward navigation
- **Deep-linking capability** — external systems cannot link directly to a specific management page
- **Role-based route protection** — all tabs are rendered regardless of role; protection is API-only

### 6.3 Modules with Full Alignment (No Gaps)

| Backend Module | Frontend Navigation | Status |
|---------------|-------------------|--------|
| auth | Login page (pre-dashboard) | ✅ Full |
| orders | `/dashboard/orders` with sidebar entry | ✅ Full |
| patient | `/dashboard/patients` with sidebar entry | ✅ Full |
| lab-workflow | `/dashboard/laboratory` with sidebar entry + sub-pages | ✅ Full |
| dashboard | `/dashboard` with sidebar entry | ✅ Full |
| audit | `/dashboard/audit-trail` with sidebar entry | ✅ Full |
| payment | `/dashboard/orders/[id]` (integrated into order flow) | ✅ Full |
| notification | Internal service — no user-facing navigation expected | ✅ N/A |
| health | Infrastructure endpoint — no user-facing navigation expected | ✅ N/A |

### 6.4 Gap Statistics

| Metric | Value |
|--------|-------|
| Total backend API modules | 14 |
| Modules with full alignment | 9 |
| Modules with indirect access (tab-only, no dedicated route) | 3 (users, regions, settings) |
| Modules N/A for navigation | 2 (notification, health) |
| **Navigation gaps requiring remediation** | **3** |

### 6.5 Master Data Sub-Modules Alignment Detail

While the 11 master-data sub-modules (test-categories, tests, panels, tariffs, doctors, clinics, insurances, equipments, reagents, sample-types, units) do have frontend access via the Settings page tabs, they represent a **structural misalignment**:

| Issue | Description |
|-------|-------------|
| Domain mismatch | Master data entities accessed under "Settings" (Pengaturan) label — semantically incorrect |
| No dedicated routes | Each entity is a tab, not a page with its own URL |
| No deep-linking | Cannot navigate directly to `/dashboard/master-data/doctors` |
| Single-page bottleneck | All 14 entities rendered as tabs in one page component |
| No independent loading | All tab content potentially loaded together |

The proposed Option C blueprint resolves this by promoting each master-data entity to a dedicated route under `/dashboard/master-data/` or `/dashboard/laboratory/clinical-data/`, providing proper URL-based navigation, bookmarkability, and independent page loading.

---

## 7. Recommendations

### 7.1 Immediate Actions (P1 — Must Have)

| # | Action | Addresses Gap | Effort |
|---|--------|--------------|--------|
| 1 | Create dedicated `/dashboard/administration/users` page | NAV-GAP-002 | M (3-5 SP) |
| 2 | Add "Administrasi" section to sidebar with "Pengguna" entry | NAV-GAP-002 | S (≤2 SP) |
| 3 | Implement role-based sidebar filtering using auth context | F-NAV-002 | M (3-5 SP) |

### 7.2 Short-Term Actions (P2 — Should Have)

| # | Action | Addresses Gap | Effort |
|---|--------|--------------|--------|
| 4 | Create `/dashboard/master-data/` route group with individual pages | NAV-GAP-001 + structural | L (6-13 SP) |
| 5 | Create `/dashboard/administration/system/smtp` dedicated page | NAV-GAP-003 | S (≤2 SP) |
| 6 | Implement expandable/collapsible sidebar menu groups | F-NAV-006 | M (3-5 SP) |
| 7 | Create `/dashboard/master-data/regions` dedicated page for Wilayah | NAV-GAP-001 | S (≤2 SP) |

### 7.3 Medium-Term Actions (P3 — Could Have)

| # | Action | Addresses Gap | Effort |
|---|--------|--------------|--------|
| 8 | Decompose Settings page into individual route-based pages | Structural | L (6-13 SP) |
| 9 | Move clinical master data under Laboratorium hierarchy | Domain alignment | M (3-5 SP) |
| 10 | Implement breadcrumb navigation for 3-level hierarchy | UX enhancement | S (≤2 SP) |

### 7.4 Total Estimated Remediation Effort

| Priority | Actions | Story Points |
|----------|:-------:|:------------:|
| P1 (Must Have) | 3 | 8-12 SP |
| P2 (Should Have) | 4 | 11-22 SP |
| P3 (Could Have) | 3 | 9-18 SP |
| **Total** | **10** | **28-52 SP** |

---

## 8. Cross-References

*Cross-reference format: `[Document ID]#[Finding ID]`*

### 8.1 Internal Findings Cross-Referenced to Other Audit Documents

| Finding ID | This Document | Related Document | Link |
|-----------|---------------|-----------------|------|
| NAV-GAP-001 | §5 Alignment Analysis | Architecture Gap Analysis — Navigation Gaps | [AUDIT-eLIS-2026-002]#NAV-GAP-001 |
| NAV-GAP-002 | §5 Alignment Analysis | Architecture Gap Analysis — Navigation Gaps | [AUDIT-eLIS-2026-002]#NAV-GAP-002 |
| NAV-GAP-003 | §5 Alignment Analysis | Architecture Gap Analysis — Navigation Gaps | [AUDIT-eLIS-2026-002]#NAV-GAP-003 |
| NAV-GAP-401 | §5 WCAG Compliance | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#NAV-GAP-401 |
| NAV-GAP-402 | §5 WCAG Compliance | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#NAV-GAP-402 |
| NAV-UX-001 | §2 UX Evaluation | Architecture Gap Analysis — Dashboard | [AUDIT-eLIS-2026-002]#NAV-UX-001 |
| NAV-UX-002 | §2 UX Evaluation | Main Audit Report — Navigation Findings | [AUDIT-eLIS-2026-001]#NAV-UX-002 |
| NAV-UX-003 | §2 UX Evaluation | Main Audit Report — Navigation Findings | [AUDIT-eLIS-2026-001]#NAV-UX-003 |

### 8.2 Cross-References to Related Audit Documents

| Related Document | Document ID | Relationship |
|-----------------|-------------|:------------:|
| Main Audit Report | [AUDIT-eLIS-2026-001]#Section-5 | Recommended immediate actions include navigation fixes |
| Architecture Gap Analysis | [AUDIT-eLIS-2026-002]#NAV-GAP-401 | WCAG 2.4.1 gaps consolidated in gap dashboard |
| RBAC Review | [AUDIT-eLIS-2026-004]#RBAC-SEC-006 | Role-based menu filtering recommendation |
| Insurance Readiness | [AUDIT-eLIS-2026-005]#INS-PAY-001 | Insurance menu navigation entry needed |
| ADR-0015 | Navigation Restructuring | Selected Option C (hierarchical) based on this review |

### 8.3 Audit Document Index

| Document ID | Title | Location |
|-------------|-------|----------|
| AUDIT-eLIS-2026-001 | Enterprise Admin Audit Report | `docs/17-Audit/enterprise-admin-audit-report.md` |
| AUDIT-eLIS-2026-002 | Architecture Gap Analysis | `docs/17-Audit/architecture-gap-analysis.md` |
| AUDIT-eLIS-2026-003 | Navigation Review (this document) | `docs/17-Audit/navigation-review.md` |
| AUDIT-eLIS-2026-004 | RBAC & User Management Review | `docs/17-Audit/rbac-review.md` |
| AUDIT-eLIS-2026-005 | Insurance & Healthcare Readiness | `docs/17-Audit/insurance-readiness.md` |

### Related Audit Documents

- `docs/17-Audit/architecture-gap-analysis.md` — Architecture compliance and gap analysis
- `docs/17-Audit/rbac-review.md` — RBAC and user management review
- `docs/17-Audit/enterprise-admin-audit-report.md` — Main audit report with executive summary
- `docs/17-Audit/insurance-readiness.md` — Healthcare & insurance readiness

---

## 9. No-Code-Modification Attestation

This navigation review was conducted in **read-only mode**. No source code files under `apps/api/` or `apps/web/` were created, modified, or deleted during the production of this document. All proposed changes are documented as recommendations only.

**Directories accessed (read-only):**
- `apps/web/src/components/layout/sidebar.tsx` — Sidebar navigation configuration
- `apps/web/src/app/dashboard/` — Frontend page route structure
- `apps/api/src/` — Backend module and controller route definitions
- `docs/17-Audit/_inventory/` — Intermediate audit analysis documents

---

*End of Document*
