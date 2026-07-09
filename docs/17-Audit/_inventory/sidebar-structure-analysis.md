# Sidebar Structure Analysis

**Document ID:** AUDIT-eLIS-2025-NAV-001  
**Version:** 1.0  
**Date:** 2025-07-08  
**Author:** Enterprise Architect (Automated Audit)  
**Classification:** Internal  
**Status:** Draft  

---

## 1. Overview

This document inventories the current sidebar navigation configuration extracted from `apps/web/src/components/layout/sidebar.tsx`. The sidebar provides the primary navigation interface for all authenticated users of the eLIS dashboard.

### Source File
- **Component:** `apps/web/src/components/layout/sidebar.tsx`
- **Framework:** Next.js (App Router) with React
- **Icon Library:** Lucide React
- **Menu Group Label:** "MAIN MENU" (single flat group)

---

## 2. Sidebar Menu Structure

| # | Menu Item Name | Route Path | Lucide Icon Name | Parent Grouping | Access Role Requirements (Frontend) | Sub-Feature Count |
|---|---------------|-----------|-----------------|----------------|-------------------------------------|-------------------|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | MAIN MENU | All authenticated users (no role filter) | 0 |
| 2 | Pasien | `/dashboard/patients` | `Users` | MAIN MENU | All authenticated users (no role filter) | 0 |
| 3 | Order & Kasir | `/dashboard/orders` | `FileText` | MAIN MENU | All authenticated users (no role filter) | 2 (new, [id] detail) |
| 4 | Laboratorium | `/dashboard/laboratory` | `TestTube` | MAIN MENU | All authenticated users (no role filter) | 6 (queue, results, approval, lab-dashboard, dashboard-stats, [id] detail) |
| 5 | Validasi Dokter | `/dashboard/doctor` | `Stethoscope` | MAIN MENU | All authenticated users (no role filter) | 0 |
| 6 | Laporan | `/dashboard/reports` | `BarChart3` | MAIN MENU | All authenticated users (no role filter) | 0 |
| 7 | Audit Trail | `/dashboard/audit-trail` | `Shield` | MAIN MENU | All authenticated users (no role filter) | 0 |
| 8 | Pengaturan | `/dashboard/settings` | `Settings` | MAIN MENU | All authenticated users (no role filter) | 14 (tab-based sub-features) |

---

## 3. Pengaturan (Settings) Sub-Features Detail

The "Pengaturan" menu item contains **14 sub-features** implemented as tabs within a single page (`apps/web/src/app/dashboard/settings/page.tsx`):

| # | Tab ID | Tab Label | Lucide Icon | API Endpoint | Domain Category |
|---|--------|-----------|-------------|-------------|-----------------|
| 1 | test-categories | Kategori Tes | `FlaskConical` | `/api/v1/master/test-categories` | Master Data |
| 2 | tests | Tes Laboratorium | `TestTube` | `/api/v1/master/tests` | Master Data |
| 3 | doctors | Dokter | `Stethoscope` | `/api/v1/master/doctors` | Master Data |
| 4 | clinics | Klinik | `Building2` | `/api/v1/master/clinics` | Master Data |
| 5 | insurances | Asuransi | `ShieldCheck` | `/api/v1/master/insurances` | Master Data |
| 6 | equipments | Alat | `Wrench` | `/api/v1/master/equipments` | Master Data |
| 7 | reagents | Reagen | `Beaker` | `/api/v1/master/reagents` | Master Data |
| 8 | sample-types | Tipe Sampel | `Droplets` | `/api/v1/master/sample-types` | Master Data |
| 9 | units | Satuan | `Ruler` | `/api/v1/master/units` | Master Data |
| 10 | panels | Panel | `FlaskConical` | `/api/v1/master/panels` | Master Data |
| 11 | tariffs | Tarif | `ShieldCheck` | `/api/v1/master/tariffs` | Master Data |
| 12 | wilayah | Wilayah | `MapPin` | `/api/v1/regions/provinsi` | Master Data |
| 13 | users | Users | `Users` | `/api/v1/users` | User Administration |
| 14 | smtp | SMTP Settings | *(special component)* | `/api/v1/settings/smtp` | System Configuration |

---

## 4. Laboratorium Sub-Pages Detail

The "Laboratorium" menu item has the following sub-pages under `/dashboard/laboratory/`:

| # | Sub-Page | Route Path | Purpose |
|---|----------|-----------|---------|
| 1 | Main page | `/dashboard/laboratory` | Laboratory overview / list |
| 2 | Queue | `/dashboard/laboratory/queue` | Sample processing queue |
| 3 | Results | `/dashboard/laboratory/results` | Lab results entry |
| 4 | Approval | `/dashboard/laboratory/approval` | Doctor approval queue |
| 5 | Lab Dashboard | `/dashboard/laboratory/lab-dashboard` | Laboratory statistics |
| 6 | Dashboard Stats | `/dashboard/laboratory/dashboard-stats` | Dashboard statistics view |
| 7 | Detail | `/dashboard/laboratory/[id]` | Individual order detail |

---

## 5. Backend Role-Based Access (API Layer)

The frontend **does not implement role-based menu filtering**. All sidebar items are visible to all authenticated users. Role enforcement is handled exclusively at the backend API layer.

### Backend Roles per Module (Summary)

| API Module | Backend Access Roles (Write Operations) | Backend Access Roles (Read Operations) |
|-----------|----------------------------------------|---------------------------------------|
| Dashboard (`/api/v1/dashboard/`) | — | OWNER, MANAGER, ADMIN, SUPER_ADMIN, KASIR, CS |
| Patients (`/api/v1/patients/`) | KASIR, CS, ADMIN, KLINIK_PARTNER | All authenticated |
| Orders (`/api/v1/orders/`) | KASIR, ADMIN | All authenticated |
| Lab Workflow (`/api/v1/lab-workflow/`) | SAMPLING, ANALIS, DOKTER, ADMIN, SUPER_ADMIN | SAMPLING, ANALIS, DOKTER, ADMIN, SUPER_ADMIN |
| Master Data (`/api/v1/master/`) | ADMIN, SUPER_ADMIN | All authenticated |
| Users (`/api/v1/users/`) | ADMIN, SUPER_ADMIN (delete: SUPER_ADMIN only) | ADMIN, SUPER_ADMIN |
| Audit Logs (`/api/v1/audit-logs/`) | — | ADMIN, SUPER_ADMIN |
| Regions (`/api/v1/regions/`) | ADMIN (sync only) | All authenticated |
| Settings SMTP (`/api/v1/settings/`) | ADMIN, SUPER_ADMIN | ADMIN, SUPER_ADMIN |

---

## 6. Frontend Authentication Mechanism

| Layer | Mechanism | Detail |
|-------|-----------|--------|
| Middleware | `middleware.ts` | Checks `elis_authenticated` cookie; redirects unauthenticated users to login |
| Route Guard | Cookie-based flag | Lightweight client-side redirect; no role-based routing |
| Role Filtering | **Not implemented** | Sidebar shows all 8 menu items to all authenticated users regardless of role |

---

## 7. Navigation Architecture Observations

### Key Findings

| # | Finding | Impact |
|---|---------|--------|
| F-NAV-001 | Single flat menu group "MAIN MENU" with no hierarchy or sub-grouping | All items shown at same level |
| F-NAV-002 | No frontend role-based menu visibility | Users see menu items they cannot access (API returns 403) |
| F-NAV-003 | "Pengaturan" contains 14 sub-features in one page exceeding 7-item capacity threshold | Navigation overload per enterprise UX criteria |
| F-NAV-004 | Mixed domains in "Pengaturan": Master Data (12 items), User Admin (1 item), System Config (1 item) | Low conceptual cohesion |
| F-NAV-005 | High-frequency items (Users) grouped with low-frequency items (Measurement Units, SMTP) | Frequency-of-access disparity |
| F-NAV-006 | No expandable sub-menus or collapsible groups | Flat navigation structure limits scalability |

---

## 8. Icon Usage Summary

| Lucide Icon | Usage Count | Used In |
|-------------|-------------|---------|
| `LayoutDashboard` | 1 | Dashboard |
| `Users` | 2 | Pasien (sidebar), Users tab (settings) |
| `FileText` | 1 | Order & Kasir |
| `TestTube` | 2 | Laboratorium (sidebar), Tes Laboratorium tab (settings) |
| `Stethoscope` | 2 | Validasi Dokter (sidebar), Dokter tab (settings) |
| `BarChart3` | 1 | Laporan |
| `Shield` | 1 | Audit Trail |
| `Settings` | 1 | Pengaturan |
| `FlaskConical` | 2 | Kategori Tes tab, Panel tab |
| `Building2` | 1 | Klinik tab |
| `ShieldCheck` | 2 | Asuransi tab, Tarif tab |
| `Wrench` | 1 | Alat tab |
| `Beaker` | 1 | Reagen tab |
| `Droplets` | 1 | Tipe Sampel tab |
| `Ruler` | 1 | Satuan tab |
| `MapPin` | 1 | Wilayah tab |

---

## 9. Data for Downstream Tasks

This inventory serves as input for:
- **Task 5.2** — Evaluate navigation against enterprise UX criteria (sub-feature counts, cohesion, frequency disparity)
- **Task 5.3** — Produce Enterprise Navigation Blueprint (current structure as baseline for proposed hierarchy)
- **Task 5.4** — Verify backend-frontend navigation alignment (route-to-API module mapping)

---

*End of Document*
