# Requirements Document

## Introduction

This document specifies requirements for the Master Wilayah Indonesia module and the enhanced Patient Registration ("Daftarkan Pasien Baru") feature in eLIS. The module provides a normalized, locally-stored database of Indonesian administrative regions (Provinsi, Kabupaten/Kota, Kecamatan, Kelurahan/Desa) sourced from the EMSIFA Indonesia Region API. The Patient Registration form is redesigned to use cascading region selectors backed by the master data, replacing free-text address fields with foreign-key references for data consistency and analytics.

## Glossary

- **Region_Service**: The backend NestJS module responsible for managing master region data, including synchronization from the external API and serving region lookup endpoints.
- **Region_Sync_Job**: The process that fetches region data from the EMSIFA Indonesia Region API and persists it into local PostgreSQL tables.
- **Cascading_Selector**: A frontend UI component that presents a chain of dependent dropdowns where selection in a parent level filters available options in the child level.
- **Patient_Registration_Form**: The frontend form component ("Daftarkan Pasien Baru") used to create or update patient records.
- **Dashboard_Analytics**: The dashboard module providing patient distribution statistics grouped by administrative region.
- **EMSIFA_API**: The public EMSIFA Indonesia Region API (https://emsifa.github.io/api-wilayah-indonesia) used as the initial data source for region synchronization.
- **Provinsi**: First-level administrative division of Indonesia (Province).
- **Kabupaten_Kota**: Second-level administrative division (Regency/City), child of Provinsi.
- **Kecamatan**: Third-level administrative division (District), child of Kabupaten_Kota.
- **Kelurahan_Desa**: Fourth-level administrative division (Village/Sub-district), child of Kecamatan.
- **eLIS_Backend**: The NestJS API application serving as the backend for eLIS.
- **eLIS_Frontend**: The Next.js web application serving as the frontend for eLIS.

## Requirements

### Requirement 1: Region Master Data Schema

**User Story:** As a system administrator, I want region data stored in normalized relational tables, so that address data is consistent and queryable across the system.

#### Acceptance Criteria

1. THE Region_Service SHALL store Provinsi records with fields: id (auto-generated code), name, and isActive flag.
2. THE Region_Service SHALL store Kabupaten_Kota records with fields: id, provinsiId (foreign key to Provinsi), name, and isActive flag.
3. THE Region_Service SHALL store Kecamatan records with fields: id, kabupatenKotaId (foreign key to Kabupaten_Kota), name, and isActive flag.
4. THE Region_Service SHALL store Kelurahan_Desa records with fields: id, kecamatanId (foreign key to Kecamatan), name, postalCode, and isActive flag.
5. THE Region_Service SHALL enforce referential integrity between all four region levels via foreign key constraints.
6. THE Region_Service SHALL use the EMSIFA region codes as the primary identifier for each region record.

### Requirement 2: Region Data Synchronization

**User Story:** As a system administrator, I want to synchronize region data from the EMSIFA API into local storage, so that the system has a complete and up-to-date list of Indonesian regions.

#### Acceptance Criteria

1. WHEN the Region_Sync_Job is triggered, THE Region_Service SHALL fetch all Provinsi data from the EMSIFA_API and upsert records into the local Provinsi table.
2. WHEN Provinsi data has been synchronized, THE Region_Service SHALL fetch all Kabupaten_Kota data for each Provinsi and upsert records into the local Kabupaten_Kota table.
3. WHEN Kabupaten_Kota data has been synchronized, THE Region_Service SHALL fetch all Kecamatan data for each Kabupaten_Kota and upsert records into the local Kecamatan table.
4. WHEN Kecamatan data has been synchronized, THE Region_Service SHALL fetch all Kelurahan_Desa data for each Kecamatan and upsert records into the local Kelurahan_Desa table.
5. IF the EMSIFA_API is unreachable during synchronization, THEN THE Region_Service SHALL log the error with the failed region level and continue processing remaining levels.
6. IF a region record already exists in the local database, THEN THE Region_Service SHALL update the name field without overwriting the isActive flag.
7. THE Region_Sync_Job SHALL be executable via a CLI command or an authenticated admin API endpoint.

### Requirement 3: Region Lookup API

**User Story:** As a frontend developer, I want API endpoints to query regions by parent, so that I can build cascading selectors in the patient registration form.

#### Acceptance Criteria

1. THE eLIS_Backend SHALL expose a GET endpoint to list all active Provinsi records.
2. WHEN a provinsiId is provided, THE eLIS_Backend SHALL return all active Kabupaten_Kota records belonging to that Provinsi.
3. WHEN a kabupatenKotaId is provided, THE eLIS_Backend SHALL return all active Kecamatan records belonging to that Kabupaten_Kota.
4. WHEN a kecamatanId is provided, THE eLIS_Backend SHALL return all active Kelurahan_Desa records belonging to that Kecamatan.
5. WHEN a search query parameter is provided, THE eLIS_Backend SHALL filter region records by name using case-insensitive partial matching.
6. THE eLIS_Backend SHALL support pagination parameters (page, limit) on all region list endpoints with a default limit of 50.
7. THE eLIS_Backend SHALL return region responses in the standard envelope format: `{ success, message, data, meta }`.

### Requirement 4: Patient Registration with Cascading Region Selectors

**User Story:** As a registration staff, I want to select patient address via cascading dropdowns, so that I can register patients with accurate and standardized region data.

#### Acceptance Criteria

1. THE Patient_Registration_Form SHALL display a cascading selector chain: Provinsi → Kabupaten_Kota → Kecamatan → Kelurahan_Desa.
2. WHEN a Provinsi is selected, THE Patient_Registration_Form SHALL load and display the Kabupaten_Kota options filtered by the selected Provinsi.
3. WHEN a Kabupaten_Kota is selected, THE Patient_Registration_Form SHALL load and display the Kecamatan options filtered by the selected Kabupaten_Kota.
4. WHEN a Kecamatan is selected, THE Patient_Registration_Form SHALL load and display the Kelurahan_Desa options filtered by the selected Kecamatan.
5. WHEN a parent-level selection changes, THE Patient_Registration_Form SHALL reset all child-level selections to empty.
6. THE Patient_Registration_Form SHALL provide a searchable input with autocomplete on each region selector supporting server-side search.
7. WHILE region data is loading, THE Patient_Registration_Form SHALL display a loading indicator within the respective selector.
8. THE Patient_Registration_Form SHALL retain the "Alamat Lengkap" free-text field for street-level address details.
9. IF network connectivity is lost while loading region data, THEN THE Patient_Registration_Form SHALL display an error message and provide a retry option.

### Requirement 5: Patient Data Model Migration

**User Story:** As a system architect, I want patient records to reference normalized region tables, so that region data is consistent and supports analytics queries.

#### Acceptance Criteria

1. THE eLIS_Backend SHALL add foreign key fields (provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId) to the Patient model referencing the corresponding region tables.
2. THE eLIS_Backend SHALL retain the existing string fields (province, city, district, village) as nullable for backward compatibility during migration.
3. WHEN a new patient is registered with region selector values, THE eLIS_Backend SHALL store the selected region IDs in the foreign key fields.
4. WHEN a patient record is retrieved, THE eLIS_Backend SHALL include the resolved region names in the response alongside the foreign key IDs.
5. THE eLIS_Backend SHALL create a database migration that adds the new foreign key columns without dropping existing string columns.

### Requirement 6: Patient Registration Form Validation

**User Story:** As a registration staff, I want the system to validate region selections, so that I cannot submit incomplete or invalid address data.

#### Acceptance Criteria

1. IF a Provinsi is selected without selecting Kabupaten_Kota, Kecamatan, and Kelurahan_Desa, THEN THE Patient_Registration_Form SHALL display a validation error indicating all region levels are required.
2. IF no region is selected at all, THEN THE Patient_Registration_Form SHALL allow form submission with empty region fields (region selection is optional).
3. WHEN a patient is submitted with region IDs, THE eLIS_Backend SHALL validate that each region ID exists and that the parent-child relationships are consistent.
4. IF the region ID hierarchy is inconsistent (e.g., Kecamatan does not belong to the selected Kabupaten_Kota), THEN THE eLIS_Backend SHALL reject the submission with a descriptive validation error.

### Requirement 7: Dashboard Region Analytics

**User Story:** As a manager, I want to view patient distribution by region, so that I can analyze service coverage across geographic areas.

#### Acceptance Criteria

1. THE Dashboard_Analytics SHALL provide an endpoint that returns patient counts grouped by Provinsi.
2. WHEN a provinsiId filter is provided, THE Dashboard_Analytics SHALL return patient counts grouped by Kabupaten_Kota within that Provinsi.
3. WHEN a kabupatenKotaId filter is provided, THE Dashboard_Analytics SHALL return patient counts grouped by Kecamatan within that Kabupaten_Kota.
4. WHEN a kecamatanId filter is provided, THE Dashboard_Analytics SHALL return patient counts grouped by Kelurahan_Desa within that Kecamatan.
5. THE Dashboard_Analytics SHALL only count patients where deletedAt is null.

### Requirement 8: Region Data Seeding

**User Story:** As a developer, I want a seeding mechanism for region data, so that I can set up development and staging environments with complete region data.

#### Acceptance Criteria

1. THE Region_Service SHALL provide a Prisma seed script that populates all four region levels from the EMSIFA_API.
2. WHEN the seed script is executed on a database with existing region data, THE Region_Service SHALL perform upsert operations to avoid duplicate records.
3. THE Region_Service SHALL log progress during seeding including the count of records processed per region level.
4. IF the EMSIFA_API is unavailable during seeding, THEN THE Region_Service SHALL exit with a non-zero status code and a descriptive error message.

### Requirement 9: Frontend Responsive Design

**User Story:** As a registration staff, I want the region selectors to work on various screen sizes, so that I can register patients from both desktop and mobile devices.

#### Acceptance Criteria

1. THE Patient_Registration_Form SHALL render region selectors in a 2-column grid on desktop viewports (width 768px and above).
2. THE Patient_Registration_Form SHALL render region selectors in a single-column stack on mobile viewports (width below 768px).
3. THE Cascading_Selector SHALL support touch interaction including scrollable dropdown lists on mobile devices.
