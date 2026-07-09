# Enterprise Navigation Blueprint

**Document ID:** AUDIT-eLIS-2025-NAV-002  
**Version:** 1.0  
**Date:** 2025-07-08  
**Author:** Enterprise Architect (Automated Audit)  
**Classification:** Internal  
**Status:** Draft  

---

## 1. Overview

This document defines the proposed enterprise navigation structure for the eLIS system, addressing the findings from the sidebar structure analysis (AUDIT-eLIS-2025-NAV-001). The blueprint reorganizes the current flat "Pengaturan" menu (14 sub-features) into domain-based navigation groups with role-based visibility, adhering to enterprise UX constraints.

### Design Constraints

| Constraint | Value | Source |
|-----------|-------|--------|
| Max navigation depth | 3 levels | Requirement 3.4 |
| Max items per level | 7 | Requirement 3.4 |
| Icon library | Lucide | Requirement 3.4 |
| Total system roles | 11 | Requirement 3.4 |
| Sub-features to assign | 14 | Requirement 3.5 |
| Target domains | 5 (Clinical Operations, Administration, Master Data, System Configuration, Reporting) | Requirement 3.5 |

### Recommendation Selected

**Option C — Hierarchical Navigation with Expandable Sub-Menus** (per evaluation in Task 5.2)

Rationale: The 14 sub-features under "Pengaturan" exceed the 7-item threshold, have low conceptual cohesion (mixing Master Data, User Admin, and System Config), and show high frequency-of-access disparity. A hierarchical approach with domain groupings resolves all three issues while keeping navigation depth ≤ 3.

---

## 2. Domain Assignment Matrix

Each of the 14 sub-features is assigned to **exactly one** domain:

| # | Sub-Feature | Indonesian Label | Assigned Domain | Rationale |
|---|-------------|-----------------|-----------------|-----------|
| 1 | Test Categories | Kategori Tes | Clinical Operations | Core clinical reference data — defines test classification used in lab workflow |
| 2 | Lab Tests | Tes Laboratorium | Clinical Operations | Core clinical entity — individual test definitions used in orders and results |
| 3 | Panels | Panel | Clinical Operations | Test groupings for clinical ordering — directly tied to clinical workflow |
| 4 | Tariffs | Tarif | Administration | Pricing/financial data managed by admin — drives billing and invoicing |
| 5 | Doctors | Dokter | Master Data | Reference entity referenced by orders, results, and validation |
| 6 | Clinics | Klinik | Master Data | Reference entity for referring facilities and partnerships |
| 7 | Insurance | Asuransi | Master Data | Reference entity for payment/billing; referenced across orders and patients |
| 8 | Equipment | Alat | Master Data | Laboratory equipment registry — referenced by lab workflow |
| 9 | Reagents | Reagen | Master Data | Laboratory consumables — referenced by equipment and tests |
| 10 | Sample Types | Tipe Sampel | Master Data | Reference data for specimen collection — referenced by tests and orders |
| 11 | Measurement Units | Satuan | Master Data | Reference data for test result values — referenced by tests |
| 12 | Users | Users | Administration | User account management — administrative function |
| 13 | Wilayah | Wilayah | Master Data | Geographic reference data — provinces, cities, districts |
| 14 | SMTP Settings | SMTP Settings | System Configuration | System-level configuration for email notifications |

### Domain Summary

| Domain | Sub-Features | Count |
|--------|-------------|-------|
| Clinical Operations | Test Categories, Lab Tests, Panels | 3 |
| Administration | Tariffs, Users | 2 |
| Master Data | Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Wilayah | 8 |
| System Configuration | SMTP Settings | 1 |
| Reporting | *(none from the 14 — existing "Laporan" menu covers this domain)* | 0 |

---

## 3. Proposed Menu Hierarchy

### Level 1 — Top-Level Navigation (7 items ✓)

```
├── Dashboard
├── Pasien (Patients)
├── Order & Kasir (Orders & Cashier)
├── Laboratorium (Laboratory)
├── Master Data
├── Administrasi (Administration)
└── Laporan & Audit (Reports & Audit)
```

### Full Hierarchy (Max 3 Levels, Max 7 Items Per Level)

```
Level 1                    Level 2                         Level 3
─────────────────────────────────────────────────────────────────────
Dashboard                  —                               —
Pasien                     —                               —
Order & Kasir              —                               —
Laboratorium               Antrian Sampel (Queue)          —
                           Input Hasil (Results)           —
                           Validasi Dokter (Approval)      —
                           Data Klinis (Clinical Data)     Kategori Tes
                                                           Tes Lab
                                                           Panel
                           Statistik Lab (Stats)           —
Master Data                Dokter                          —
                           Klinik                          —
                           Asuransi                        —
                           Alat & Reagen (Equip/Reagent)   Alat
                                                           Reagen
                           Tipe Sampel                     —
                           Satuan Ukur                     —
                           Wilayah                         —
Administrasi               Pengguna (Users)                —
                           Tarif                           —
                           Pengaturan Sistem (System)      SMTP Settings
                           Audit Trail                     —
Laporan & Audit            Laporan (Reports)               —
```

### Hierarchy Validation

| Constraint | Check | Status |
|-----------|-------|--------|
| Max depth = 3 levels | Deepest: Laboratorium → Data Klinis → Kategori Tes | ✅ Pass |
| Max 7 items at Level 1 | 7 items | ✅ Pass |
| Max 7 items at Level 2 (Laboratorium) | 5 items | ✅ Pass |
| Max 7 items at Level 2 (Master Data) | 7 items | ✅ Pass |
| Max 7 items at Level 2 (Administrasi) | 4 items | ✅ Pass |
| Max 7 items at Level 3 (Data Klinis) | 3 items | ✅ Pass |
| Max 7 items at Level 3 (Alat & Reagen) | 2 items | ✅ Pass |

---

## 4. Complete Navigation Entry Specification

### 4.1 Level 1 — Top-Level Menu Items

| # | Menu Item | Route Path | Lucide Icon | Domain |
|---|-----------|-----------|-------------|--------|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | — |
| 2 | Pasien | `/dashboard/patients` | `Users` | — |
| 3 | Order & Kasir | `/dashboard/orders` | `FileText` | — |
| 4 | Laboratorium | `/dashboard/laboratory` | `TestTube` | Clinical Operations |
| 5 | Master Data | `/dashboard/master-data` | `Database` | Master Data |
| 6 | Administrasi | `/dashboard/administration` | `Settings` | Administration |
| 7 | Laporan & Audit | `/dashboard/reports` | `BarChart3` | Reporting |

### 4.2 Laboratorium — Level 2 & 3

| # | Menu Item | Route Path | Lucide Icon | Level |
|---|-----------|-----------|-------------|-------|
| 4.1 | Antrian Sampel | `/dashboard/laboratory/queue` | `ListOrdered` | 2 |
| 4.2 | Input Hasil | `/dashboard/laboratory/results` | `ClipboardEdit` | 2 |
| 4.3 | Validasi Dokter | `/dashboard/laboratory/approval` | `Stethoscope` | 2 |
| 4.4 | Data Klinis | `/dashboard/laboratory/clinical-data` | `FlaskConical` | 2 |
| 4.4.1 | Kategori Tes | `/dashboard/laboratory/clinical-data/test-categories` | `FolderTree` | 3 |
| 4.4.2 | Tes Lab | `/dashboard/laboratory/clinical-data/tests` | `TestTube` | 3 |
| 4.4.3 | Panel | `/dashboard/laboratory/clinical-data/panels` | `Layers` | 3 |
| 4.5 | Statistik Lab | `/dashboard/laboratory/stats` | `Activity` | 2 |

### 4.3 Master Data — Level 2 & 3

| # | Menu Item | Route Path | Lucide Icon | Level |
|---|-----------|-----------|-------------|-------|
| 5.1 | Dokter | `/dashboard/master-data/doctors` | `Stethoscope` | 2 |
| 5.2 | Klinik | `/dashboard/master-data/clinics` | `Building2` | 2 |
| 5.3 | Asuransi | `/dashboard/master-data/insurance` | `ShieldCheck` | 2 |
| 5.4 | Alat & Reagen | `/dashboard/master-data/equipment-reagents` | `Wrench` | 2 |
| 5.4.1 | Alat | `/dashboard/master-data/equipment-reagents/equipment` | `Wrench` | 3 |
| 5.4.2 | Reagen | `/dashboard/master-data/equipment-reagents/reagents` | `Beaker` | 3 |
| 5.5 | Tipe Sampel | `/dashboard/master-data/sample-types` | `Droplets` | 2 |
| 5.6 | Satuan Ukur | `/dashboard/master-data/measurement-units` | `Ruler` | 2 |
| 5.7 | Wilayah | `/dashboard/master-data/regions` | `MapPin` | 2 |

### 4.4 Administrasi — Level 2 & 3

| # | Menu Item | Route Path | Lucide Icon | Level |
|---|-----------|-----------|-------------|-------|
| 6.1 | Pengguna | `/dashboard/administration/users` | `UserCog` | 2 |
| 6.2 | Tarif | `/dashboard/administration/tariffs` | `DollarSign` | 2 |
| 6.3 | Pengaturan Sistem | `/dashboard/administration/system` | `SlidersHorizontal` | 2 |
| 6.3.1 | SMTP Settings | `/dashboard/administration/system/smtp` | `Mail` | 3 |
| 6.4 | Audit Trail | `/dashboard/administration/audit-trail` | `Shield` | 2 |

### 4.5 Laporan & Audit — Level 2

| # | Menu Item | Route Path | Lucide Icon | Level |
|---|-----------|-----------|-------------|-------|
| 7.1 | Laporan | `/dashboard/reports/overview` | `FileBarChart` | 2 |

---

## 5. Role-Based Visibility Matrix

This matrix maps each navigation entry to the 11 system roles. A `✓` indicates the menu item is visible to that role. Visibility is determined by the role's functional need to access the underlying feature.

### Legend

| Abbreviation | Role |
|-------------|------|
| SA | SUPER_ADMIN |
| OW | OWNER |
| MG | MANAGER |
| KS | KASIR |
| AD | ADMIN |
| SP | SAMPLING |
| AN | ANALIS |
| DK | DOKTER |
| CS | CS |
| MK | MARKETING |
| KP | KLINIK_PARTNER |

### Level 1 Visibility

| Menu Item | SA | OW | MG | KS | AD | SP | AN | DK | CS | MK | KP |
|-----------|----|----|----|----|----|----|----|----|----|----|-----|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pasien | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Order & Kasir | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | — | ✓ |
| Laboratorium | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Master Data | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Administrasi | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Laporan & Audit | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |

### Laboratorium — Level 2 & 3 Visibility

| Menu Item | SA | OW | MG | KS | AD | SP | AN | DK | CS | MK | KP |
|-----------|----|----|----|----|----|----|----|----|----|----|-----|
| Antrian Sampel | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | — | — | — | — |
| Input Hasil | ✓ | — | — | — | ✓ | — | ✓ | — | — | — | — |
| Validasi Dokter | ✓ | — | — | — | ✓ | — | — | ✓ | — | — | — |
| Data Klinis | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| → Kategori Tes | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| → Tes Lab | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| → Panel | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Statistik Lab | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | — | — |

### Master Data — Level 2 & 3 Visibility

| Menu Item | SA | OW | MG | KS | AD | SP | AN | DK | CS | MK | KP |
|-----------|----|----|----|----|----|----|----|----|----|----|-----|
| Dokter | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Klinik | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Asuransi | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Alat & Reagen | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| → Alat | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| → Reagen | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| Tipe Sampel | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| Satuan Ukur | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| Wilayah | ✓ | — | — | — | ✓ | — | — | — | — | — | — |

### Administrasi — Level 2 & 3 Visibility

| Menu Item | SA | OW | MG | KS | AD | SP | AN | DK | CS | MK | KP |
|-----------|----|----|----|----|----|----|----|----|----|----|-----|
| Pengguna | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |
| Tarif | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| Pengaturan Sistem | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| → SMTP Settings | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| Audit Trail | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — |

### Laporan & Audit — Level 2 Visibility

| Menu Item | SA | OW | MG | KS | AD | SP | AN | DK | CS | MK | KP |
|-----------|----|----|----|----|----|----|----|----|----|----|-----|
| Laporan | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |

---

## 6. Role Access Summary

| Role | Visible Level-1 Items | Primary Use Cases |
|------|----------------------|-------------------|
| SUPER_ADMIN | All 7 | Full system access, all configuration |
| OWNER | All 7 | Business oversight, all operational and admin views |
| MANAGER | 6 (all except Administrasi system-level) | Operational management, reporting |
| KASIR | 3 (Dashboard, Pasien, Order & Kasir) | Payment processing, patient registration |
| ADMIN | All 7 | System administration, master data, user management |
| SAMPLING | 3 (Dashboard, Pasien, Laboratorium) | Sample collection and processing |
| ANALIS | 3 (Dashboard, Pasien, Laboratorium) | Lab analysis and result entry |
| DOKTER | 3 (Dashboard, Pasien, Laboratorium) | Result validation and approval |
| CS | 3 (Dashboard, Pasien, Order & Kasir) | Customer service, patient interaction |
| MARKETING | 2 (Dashboard, Pasien) | Patient outreach, limited view |
| KLINIK_PARTNER | 3 (Dashboard, Pasien, Order & Kasir) | External clinic partner ordering |

---

## 7. Route Path Mapping (Complete)

| Navigation Entry | Route Path | API Endpoint(s) |
|-----------------|-----------|-----------------|
| Dashboard | `/dashboard` | `/api/v1/dashboard/stats` |
| Pasien | `/dashboard/patients` | `/api/v1/patients` |
| Order & Kasir | `/dashboard/orders` | `/api/v1/orders` |
| Laboratorium | `/dashboard/laboratory` | `/api/v1/lab-workflow` |
| Antrian Sampel | `/dashboard/laboratory/queue` | `/api/v1/lab-workflow/queue` |
| Input Hasil | `/dashboard/laboratory/results` | `/api/v1/lab-workflow/results` |
| Validasi Dokter | `/dashboard/laboratory/approval` | `/api/v1/lab-workflow/approve` |
| Data Klinis | `/dashboard/laboratory/clinical-data` | — (parent group) |
| Kategori Tes | `/dashboard/laboratory/clinical-data/test-categories` | `/api/v1/master/test-categories` |
| Tes Lab | `/dashboard/laboratory/clinical-data/tests` | `/api/v1/master/tests` |
| Panel | `/dashboard/laboratory/clinical-data/panels` | `/api/v1/master/panels` |
| Statistik Lab | `/dashboard/laboratory/stats` | `/api/v1/dashboard/stats` |
| Master Data | `/dashboard/master-data` | — (parent group) |
| Dokter | `/dashboard/master-data/doctors` | `/api/v1/master/doctors` |
| Klinik | `/dashboard/master-data/clinics` | `/api/v1/master/clinics` |
| Asuransi | `/dashboard/master-data/insurance` | `/api/v1/master/insurances` |
| Alat & Reagen | `/dashboard/master-data/equipment-reagents` | — (parent group) |
| Alat | `/dashboard/master-data/equipment-reagents/equipment` | `/api/v1/master/equipments` |
| Reagen | `/dashboard/master-data/equipment-reagents/reagents` | `/api/v1/master/reagents` |
| Tipe Sampel | `/dashboard/master-data/sample-types` | `/api/v1/master/sample-types` |
| Satuan Ukur | `/dashboard/master-data/measurement-units` | `/api/v1/master/units` |
| Wilayah | `/dashboard/master-data/regions` | `/api/v1/regions/provinsi` |
| Administrasi | `/dashboard/administration` | — (parent group) |
| Pengguna | `/dashboard/administration/users` | `/api/v1/users` |
| Tarif | `/dashboard/administration/tariffs` | `/api/v1/master/tariffs` |
| Pengaturan Sistem | `/dashboard/administration/system` | — (parent group) |
| SMTP Settings | `/dashboard/administration/system/smtp` | `/api/v1/settings/smtp` |
| Audit Trail | `/dashboard/administration/audit-trail` | `/api/v1/audit-logs` |
| Laporan & Audit | `/dashboard/reports` | — (parent group) |
| Laporan | `/dashboard/reports/overview` | `/api/v1/reports` |

---

## 8. Icon Assignment Summary

All icons are from the **Lucide** icon library (lucide-react).

| Icon Name | Used For | Level | Rationale |
|-----------|---------|-------|-----------|
| `LayoutDashboard` | Dashboard | 1 | Standard dashboard icon |
| `Users` | Pasien | 1 | Patient/people list |
| `FileText` | Order & Kasir | 1 | Document/order representation |
| `TestTube` | Laboratorium, Tes Lab | 1, 3 | Laboratory/test association |
| `Database` | Master Data | 1 | Reference data store metaphor |
| `Settings` | Administrasi | 1 | Administrative configuration |
| `BarChart3` | Laporan & Audit | 1 | Analytics/reporting |
| `ListOrdered` | Antrian Sampel | 2 | Ordered queue |
| `ClipboardEdit` | Input Hasil | 2 | Data entry/results input |
| `Stethoscope` | Validasi Dokter, Dokter | 2, 2 | Medical/doctor association |
| `FlaskConical` | Data Klinis | 2 | Clinical/lab science |
| `Activity` | Statistik Lab | 2 | Activity/metrics |
| `FolderTree` | Kategori Tes | 3 | Category hierarchy |
| `Layers` | Panel | 3 | Grouped/layered items |
| `Building2` | Klinik | 2 | Building/facility |
| `ShieldCheck` | Asuransi | 2 | Protection/insurance |
| `Wrench` | Alat & Reagen, Alat | 2, 3 | Tools/equipment |
| `Beaker` | Reagen | 3 | Chemical/reagent |
| `Droplets` | Tipe Sampel | 2 | Specimen/sample |
| `Ruler` | Satuan Ukur | 2 | Measurement |
| `MapPin` | Wilayah | 2 | Geographic location |
| `UserCog` | Pengguna | 2 | User management/settings |
| `DollarSign` | Tarif | 2 | Pricing/financial |
| `SlidersHorizontal` | Pengaturan Sistem | 2 | System configuration |
| `Mail` | SMTP Settings | 3 | Email/notification |
| `Shield` | Audit Trail | 2 | Security/audit |
| `FileBarChart` | Laporan | 2 | Report document |

### Icon Uniqueness Check

All Level-1 icons are unique. At Level 2+, `Stethoscope` is reused (Validasi Dokter and Dokter) and `Wrench` is reused (Alat & Reagen group and Alat item) — acceptable as they appear in different menu branches and represent semantically related items.

---

## 9. Navigation Configuration Data Structure

The following JSON structure represents the proposed navigation for implementation reference:

```json
{
  "navigation": [
    {
      "id": "dashboard",
      "label": "Dashboard",
      "icon": "LayoutDashboard",
      "route": "/dashboard",
      "domain": null,
      "roles": ["*"],
      "children": []
    },
    {
      "id": "patients",
      "label": "Pasien",
      "icon": "Users",
      "route": "/dashboard/patients",
      "domain": null,
      "roles": ["*"],
      "children": []
    },
    {
      "id": "orders",
      "label": "Order & Kasir",
      "icon": "FileText",
      "route": "/dashboard/orders",
      "domain": null,
      "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "KASIR", "ADMIN", "CS", "KLINIK_PARTNER"],
      "children": []
    },
    {
      "id": "laboratory",
      "label": "Laboratorium",
      "icon": "TestTube",
      "route": "/dashboard/laboratory",
      "domain": "Clinical Operations",
      "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "SAMPLING", "ANALIS", "DOKTER"],
      "children": [
        {
          "id": "lab-queue",
          "label": "Antrian Sampel",
          "icon": "ListOrdered",
          "route": "/dashboard/laboratory/queue",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "SAMPLING", "ANALIS"]
        },
        {
          "id": "lab-results",
          "label": "Input Hasil",
          "icon": "ClipboardEdit",
          "route": "/dashboard/laboratory/results",
          "roles": ["SUPER_ADMIN", "ADMIN", "ANALIS"]
        },
        {
          "id": "lab-approval",
          "label": "Validasi Dokter",
          "icon": "Stethoscope",
          "route": "/dashboard/laboratory/approval",
          "roles": ["SUPER_ADMIN", "ADMIN", "DOKTER"]
        },
        {
          "id": "clinical-data",
          "label": "Data Klinis",
          "icon": "FlaskConical",
          "route": "/dashboard/laboratory/clinical-data",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"],
          "children": [
            {
              "id": "test-categories",
              "label": "Kategori Tes",
              "icon": "FolderTree",
              "route": "/dashboard/laboratory/clinical-data/test-categories",
              "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
            },
            {
              "id": "lab-tests",
              "label": "Tes Lab",
              "icon": "TestTube",
              "route": "/dashboard/laboratory/clinical-data/tests",
              "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
            },
            {
              "id": "panels",
              "label": "Panel",
              "icon": "Layers",
              "route": "/dashboard/laboratory/clinical-data/panels",
              "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
            }
          ]
        },
        {
          "id": "lab-stats",
          "label": "Statistik Lab",
          "icon": "Activity",
          "route": "/dashboard/laboratory/stats",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "SAMPLING", "ANALIS", "DOKTER"]
        }
      ]
    },
    {
      "id": "master-data",
      "label": "Master Data",
      "icon": "Database",
      "route": "/dashboard/master-data",
      "domain": "Master Data",
      "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"],
      "children": [
        {
          "id": "doctors",
          "label": "Dokter",
          "icon": "Stethoscope",
          "route": "/dashboard/master-data/doctors",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
        },
        {
          "id": "clinics",
          "label": "Klinik",
          "icon": "Building2",
          "route": "/dashboard/master-data/clinics",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
        },
        {
          "id": "insurance",
          "label": "Asuransi",
          "icon": "ShieldCheck",
          "route": "/dashboard/master-data/insurance",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
        },
        {
          "id": "equipment-reagents",
          "label": "Alat & Reagen",
          "icon": "Wrench",
          "route": "/dashboard/master-data/equipment-reagents",
          "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"],
          "children": [
            {
              "id": "equipment",
              "label": "Alat",
              "icon": "Wrench",
              "route": "/dashboard/master-data/equipment-reagents/equipment",
              "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"]
            },
            {
              "id": "reagents",
              "label": "Reagen",
              "icon": "Beaker",
              "route": "/dashboard/master-data/equipment-reagents/reagents",
              "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"]
            }
          ]
        },
        {
          "id": "sample-types",
          "label": "Tipe Sampel",
          "icon": "Droplets",
          "route": "/dashboard/master-data/sample-types",
          "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"]
        },
        {
          "id": "measurement-units",
          "label": "Satuan Ukur",
          "icon": "Ruler",
          "route": "/dashboard/master-data/measurement-units",
          "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"]
        },
        {
          "id": "regions",
          "label": "Wilayah",
          "icon": "MapPin",
          "route": "/dashboard/master-data/regions",
          "roles": ["SUPER_ADMIN", "ADMIN"]
        }
      ]
    },
    {
      "id": "administration",
      "label": "Administrasi",
      "icon": "Settings",
      "route": "/dashboard/administration",
      "domain": "Administration",
      "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"],
      "children": [
        {
          "id": "users",
          "label": "Pengguna",
          "icon": "UserCog",
          "route": "/dashboard/administration/users",
          "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"]
        },
        {
          "id": "tariffs",
          "label": "Tarif",
          "icon": "DollarSign",
          "route": "/dashboard/administration/tariffs",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
        },
        {
          "id": "system-settings",
          "label": "Pengaturan Sistem",
          "icon": "SlidersHorizontal",
          "route": "/dashboard/administration/system",
          "roles": ["SUPER_ADMIN", "ADMIN"],
          "children": [
            {
              "id": "smtp",
              "label": "SMTP Settings",
              "icon": "Mail",
              "route": "/dashboard/administration/system/smtp",
              "roles": ["SUPER_ADMIN", "ADMIN"]
            }
          ]
        },
        {
          "id": "audit-trail",
          "label": "Audit Trail",
          "icon": "Shield",
          "route": "/dashboard/administration/audit-trail",
          "roles": ["SUPER_ADMIN", "OWNER", "ADMIN"]
        }
      ]
    },
    {
      "id": "reports",
      "label": "Laporan & Audit",
      "icon": "BarChart3",
      "route": "/dashboard/reports",
      "domain": "Reporting",
      "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"],
      "children": [
        {
          "id": "reports-overview",
          "label": "Laporan",
          "icon": "FileBarChart",
          "route": "/dashboard/reports/overview",
          "roles": ["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]
        }
      ]
    }
  ]
}
```

---

## 10. Migration Impact from Current to Proposed

| Current State | Proposed State | Impact |
|--------------|---------------|--------|
| Flat "Pengaturan" (14 tabs) | Distributed across 3 domain groups | High — requires new page components |
| No role-based sidebar filtering | Role-aware visibility per entry | Medium — requires auth context in sidebar |
| Single "MAIN MENU" group | Hierarchical with expandable groups | Medium — sidebar component refactor |
| 8 Level-1 items | 7 Level-1 items | Low — net reduction |
| All items visible to all roles | Context-sensitive visibility | Medium — middleware/context integration |
| `/dashboard/settings` (single page) | Split into 3 route groups | High — route restructuring |
| `Audit Trail` at Level 1 | Moved under Administrasi | Low — simple route change |
| `Validasi Dokter` at Level 1 | Moved under Laboratorium → approval | Low — simple route change |

### Key Architectural Changes Required

1. **Sidebar component refactor** — Support multi-level expandable menus with role filtering
2. **Auth context in layout** — Expose current user's role to sidebar for visibility filtering
3. **Route restructuring** — Create new page directories for `/dashboard/master-data/`, `/dashboard/administration/`, and `/dashboard/laboratory/clinical-data/`
4. **Settings page decomposition** — Split single 14-tab page into individual route-based pages

---

## 11. Traceability

| Requirement | Coverage |
|------------|----------|
| 3.4 — Proposed menu hierarchy (max 3 levels, max 7 items per level), icon assignments, role-based visibility, route mapping | Sections 3, 4, 5, 7, 8 |
| 3.5 — Assign each 14 sub-features to exactly one domain | Section 2 |

---

## 12. Data for Downstream Tasks

This blueprint serves as input for:
- **Task 5.4** — Verify backend-frontend navigation alignment (route-to-API module mapping in Section 7)
- **Task 10.1** — Classify sub-features under Settings page (domain assignments in Section 2)
- **Final `navigation-review.md`** — This blueprint is incorporated into the final navigation review document

---

*End of Document*
