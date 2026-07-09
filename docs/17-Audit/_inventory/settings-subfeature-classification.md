# Settings Sub-Feature Classification

**Document ID:** AUDIT-eLIS-2025-CLS-001  
**Version:** 1.0  
**Date:** 2025-07-08  
**Author:** Enterprise Architect (Automated Audit)  
**Classification:** Internal  
**Status:** Draft  

---

## 1. Overview

This document classifies all 14 sub-features currently under the "Pengaturan" (Settings) page into enterprise data governance domains. The classification follows the rules defined in Requirement 10.1 and applies the enterprise data governance overrides from Requirement 10.3.

### Classification Categories

| Category | Definition | Examples |
|----------|-----------|----------|
| **Master Data** | Reference data referenced by 2+ other modules and changed < 1×/month | Doctors, Clinics, Equipment |
| **System Settings** | Key-value configuration parameters that alter system behavior without code changes | SMTP config, email templates |
| **User Administration** | User accounts, roles, permissions | Users, role assignment |
| **Operational Configuration** | Notification templates, workflow rules that change > 1×/month | Alert rules, workflow configs |

### Data Governance Override (Requirement 10.3)

Per enterprise data governance rules, the following entities are **always** classified as "Master Data" regardless of other criteria:

> Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Test Categories, Lab Tests, Panels

---

## 2. Sub-Feature Classification

### 2.1 Classification Decision Table

| # | Sub-Feature | Indonesian Label | Data Classification | Governance Rule Applied | Justification |
|---|------------|-----------------|--------------------|-----------------------|---------------|
| 1 | Test Categories | Kategori Tes | **Master Data** | Req 10.3 explicit list | Reference data: every lab test belongs to a category; referenced by Lab Tests, Order, Reporting modules |
| 2 | Lab Tests | Tes Laboratorium | **Master Data** | Req 10.3 explicit list | Core reference entity: referenced by Orders, Lab Workflow, Panels, Tariffs, Reporting modules |
| 3 | Panels | Panel | **Master Data** | Req 10.3 explicit list | Reference data: panel = group of lab tests; referenced by Orders, Lab Workflow, Tariffs modules |
| 4 | Tariffs | Tarif | **Master Data** | Req 10.1 criteria met | Pricing reference data: referenced by Orders, Payment, Insurance, and Reporting modules (4 modules); changed < 1×/month (pricing updates are infrequent, require approval) |
| 5 | Doctors | Dokter | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Orders, Lab Workflow (result validation), Patient referrals, Reporting modules |
| 6 | Clinics | Klinik | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Orders, Patient registration, Insurance claims, Reporting modules |
| 7 | Insurance | Asuransi | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Orders, Payment, Patient, Tariffs, Billing/Claims modules |
| 8 | Equipment | Alat | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Lab Workflow (sample processing), Quality Control, Maintenance modules |
| 9 | Reagents | Reagen | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Lab Workflow, Quality Control, Inventory modules |
| 10 | Sample Types | Tipe Sampel | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Lab Tests, Lab Workflow (sampling), Orders modules |
| 11 | Measurement Units | Satuan | **Master Data** | Req 10.3 explicit list | Reference data: referenced by Lab Tests (result unit), Reporting, Reference Values modules |
| 12 | Regions | Wilayah | **Master Data** | Req 10.1 criteria met | Geographic reference data: referenced by Patient registration (address validation), Clinics (location), and Reporting modules (3 modules); changed rarely (administrative boundaries) |
| 13 | Users | Users | **User Administration** | Req 10.3 explicit rule | User accounts and role management; directly manages authentication credentials and RBAC role assignment |
| 14 | SMTP Settings | SMTP Settings | **System Settings** | Req 10.3 explicit rule | Key-value configuration (host, port, user, password, TLS) that alters email delivery behavior without code changes |

---

### 2.2 Classification Summary by Domain

| Domain | Count | Sub-Features |
|--------|-------|-------------|
| **Master Data** | 12 | Test Categories, Lab Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Regions |
| **System Settings** | 1 | SMTP Settings |
| **User Administration** | 1 | Users |
| **Operational Configuration** | 0 | *(none currently implemented)* |
| **Total** | 14 | — |

---

## 3. Detailed Classification Analysis

### 3.1 Master Data Entities (12 items)

All Master Data entities share these characteristics:
- **Change frequency:** Rarely (< 1×/month) — established during system setup, updated only when lab catalog changes
- **Cross-module references:** Each is referenced by ≥ 2 other modules
- **Owner role:** ADMIN or SUPER_ADMIN (write), All authenticated (read)
- **Current backend location:** `apps/api/src/laboratory/master-data/`
- **Current API prefix:** `/api/v1/master/*` (except Regions: `/api/v1/regions/*`)

#### 3.1.1 Cross-Module Reference Map

| Master Data Entity | Referenced By (Modules) | Reference Count |
|-------------------|------------------------|-----------------|
| Test Categories | Lab Tests, Orders, Reporting, Dashboard | 4 |
| Lab Tests | Orders, Lab Workflow, Panels, Tariffs, Reporting, Dashboard | 6 |
| Panels | Orders, Lab Workflow, Tariffs, Reporting | 4 |
| Tariffs | Orders, Payment, Insurance, Reporting | 4 |
| Doctors | Orders, Lab Workflow, Patient, Reporting | 4 |
| Clinics | Orders, Patient, Insurance, Reporting | 4 |
| Insurance | Orders, Payment, Patient, Tariffs, Reporting | 5 |
| Equipment | Lab Workflow, Quality Control | 2 |
| Reagents | Lab Workflow, Quality Control | 2 |
| Sample Types | Lab Tests, Lab Workflow, Orders | 3 |
| Measurement Units | Lab Tests, Reporting, Reference Values | 3 |
| Regions | Patient, Clinics, Reporting | 3 |

#### 3.1.2 Master Data Sub-Classification

Within the Master Data domain, entities can be further grouped by functional area:

| Functional Group | Entities | Purpose |
|-----------------|----------|---------|
| **Clinical Master Data** | Test Categories, Lab Tests, Panels, Sample Types, Measurement Units | Define what the lab can test and how results are measured |
| **Stakeholder Master Data** | Doctors, Clinics, Insurance | External parties that interact with the lab |
| **Operational Master Data** | Equipment, Reagents | Physical resources used in lab operations |
| **Financial Master Data** | Tariffs | Pricing configuration for tests and panels |
| **Geographic Master Data** | Regions | Administrative geographic boundaries (Province, City, District, Village) |

### 3.2 System Settings (1 item)

| Property | Value |
|----------|-------|
| **Entity** | SMTP Settings |
| **Change frequency** | Rarely (only when email infrastructure changes) |
| **Storage pattern** | Key-value pairs in `SystemSetting` table |
| **Cross-module references** | 1 (Notification module only) |
| **Owner role** | ADMIN, SUPER_ADMIN |
| **Current backend location** | `apps/api/src/laboratory/notification/settings.controller.ts` |
| **Current API prefix** | `/api/v1/settings/smtp` |
| **Governance justification** | Fits "System Settings" definition: key-value config parameters (smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, smtp_secure) that alter system behavior (email delivery) without code changes |

### 3.3 User Administration (1 item)

| Property | Value |
|----------|-------|
| **Entity** | Users |
| **Change frequency** | Weekly (staff onboarding/offboarding) |
| **Cross-module references** | All modules (authentication context) |
| **Owner role** | ADMIN, SUPER_ADMIN (SUPER_ADMIN only for delete) |
| **Current backend location** | `apps/api/src/users/` |
| **Current API prefix** | `/api/v1/users` |
| **Governance justification** | Directly manages user accounts, credentials, and role assignments; fits "User Administration" definition |

### 3.4 Operational Configuration (0 items)

No sub-features currently classified as Operational Configuration. This category would include:
- Notification templates (not yet implemented)
- Workflow rules / SLA thresholds (not yet implemented)
- Alert configuration (not yet implemented)

These are identified as functional gaps in the gap analysis (see `functional-gap-report.md`).

---

## 4. Domain Cohesion Analysis

### 4.1 Current State Problems

| Problem | Evidence | Impact |
|---------|----------|--------|
| **Low cohesion** | 4 different domains (Master Data, System Settings, User Admin, Operational Config) crammed into 1 menu | Users must navigate through unrelated items to find what they need |
| **Mixed change frequencies** | Master Data changes rarely; Users changes weekly; SMTP changes rarely but for different reasons | No natural grouping by operational cadence |
| **Mixed audiences** | Master Data → Lab Admin; Users → System Admin; SMTP → IT Admin | Different people need different sub-features |
| **Mixed access patterns** | Master Data is read by all, written by ADMIN; Users is restricted to ADMIN/SUPER_ADMIN entirely | Security boundaries crossed within single page |

### 4.2 Domain Separation Recommendation

Based on this classification, the 14 sub-features should be separated into at least 3 distinct navigation contexts:

1. **Master Data** (12 items) — dedicated section with its own navigation entry
2. **User Administration** (1 item) — dedicated section or combined with a broader "Administration" group
3. **System Settings** (1 item) — dedicated section that can grow to include future Operational Configuration items

This separation aligns with:
- Enterprise data governance principles (different lifecycle management per domain)
- Principle of least privilege (different access patterns per domain)
- UX best practices (< 7 items per navigation group after separation via sub-grouping)

---

## 5. Data for Downstream Tasks

This classification serves as input for:
- **Task 10.2** — Produce classification matrix with Change Frequency, Owner Role, Proposed Location, Migration Impact
- **Task 11.1** — Target State Architecture (module boundary definitions)
- **Task 11.2** — ADR for Settings vs Master Data separation decision

### Key Outputs for Task 10.2

| Sub-Feature | Classification | Proposed Domain |
|-------------|---------------|-----------------|
| Test Categories | Master Data | `master-data` bounded context |
| Lab Tests | Master Data | `master-data` bounded context |
| Panels | Master Data | `master-data` bounded context |
| Tariffs | Master Data | `master-data` bounded context |
| Doctors | Master Data | `master-data` bounded context |
| Clinics | Master Data | `master-data` bounded context |
| Insurance | Master Data | `master-data` bounded context |
| Equipment | Master Data | `master-data` bounded context |
| Reagents | Master Data | `master-data` bounded context |
| Sample Types | Master Data | `master-data` bounded context |
| Measurement Units | Master Data | `master-data` bounded context |
| Regions | Master Data | `master-data` bounded context |
| Users | User Administration | `user-admin` bounded context |
| SMTP Settings | System Settings | `system-settings` bounded context |

---

*End of Document*
