# Requirements Document

## Introduction

This feature addresses three interconnected issues in the eLIS application:

1. **Region Sync 403 Fix**: The `POST /api/v1/regions/sync` endpoint returns 403 Forbidden for SUPER_ADMIN users. The root cause must be identified in the RBAC/guard chain and fixed so authorized users (SUPER_ADMIN, ADMIN) can trigger the sync while unauthorized users remain blocked.

2. **General Settings Restructure**: The `/dashboard/settings/general` page currently contains Master Data tabs (Dokter, Klinik, Asuransi, Tarif, Wilayah, Users) that do not belong in system configuration. These must be moved to `/dashboard/master-data` so General Settings only contains actual system configuration items.

3. **Laboratory Settings Restructure**: The `/dashboard/settings/laboratory` page contains Lab Master Data tabs (Kategori Tes, Tes Laboratorium, Panel, Alat, Reagen, Tipe Sampel, Satuan) that are reference data, not configuration. These must also be consolidated under `/dashboard/master-data`.

The guiding principle is **minimum safe changes**: reuse existing components/hooks/services, do not duplicate code, do not change database schema, and do not break existing CRUD operations.

## Glossary

- **Region_Sync_Endpoint**: The `POST /api/v1/regions/sync` API endpoint that fetches region data from EMSIFA and upserts it into the database
- **EMSIFA_API**: The external API at `https://emsifa.github.io/api-wilayah-indonesia/api` providing Indonesian region data (provinsi, kabupaten/kota, kecamatan, kelurahan/desa)
- **RolesGuard**: A NestJS guard that checks if the authenticated user's role matches the roles specified by the `@Roles()` decorator
- **JwtAuthGuard**: A NestJS guard that validates the JWT Bearer token from the Authorization header and populates `request.user`
- **Master_Data_Hub**: The `/dashboard/master-data` page that serves as the centralized location for all reference/master data management
- **General_Settings_Page**: The `/dashboard/settings/general` page that should only contain system configuration (not master data)
- **Laboratory_Settings_Page**: The `/dashboard/settings/laboratory` page that currently contains lab master data tabs
- **Settings_Layout**: The settings sub-navigation layout at `/dashboard/settings/layout.tsx`
- **Sidebar_Navigation**: The main application sidebar component that controls top-level menu visibility by role
- **SUPER_ADMIN**: The highest privilege role in the system that bypasses permission checks
- **ADMIN**: An administrative role with elevated privileges for system management
- **React_Query_Cache**: The client-side data cache managed by React Query hooks for API data fetching

## Requirements

### Requirement 1: Fix Region Sync Authorization

**User Story:** As a SUPER_ADMIN user, I want to trigger region data synchronization from EMSIFA, so that the system has up-to-date Indonesian region data for patient address registration.

#### Acceptance Criteria

1. WHEN a SUPER_ADMIN user sends a POST request to the Region_Sync_Endpoint, THE Region_Sync_Endpoint SHALL return HTTP 200 with a response body containing a `success` field set to true and a `data` field containing the sync summary
2. WHEN an ADMIN user sends a POST request to the Region_Sync_Endpoint, THE Region_Sync_Endpoint SHALL return HTTP 200 with a response body containing a `success` field set to true and a `data` field containing the sync summary
3. WHEN an unauthenticated request is sent to the Region_Sync_Endpoint, THE Region_Sync_Endpoint SHALL return HTTP 401 Unauthorized without invoking the sync process
4. WHEN a user with a role other than SUPER_ADMIN or ADMIN sends a POST request to the Region_Sync_Endpoint, THE Region_Sync_Endpoint SHALL return HTTP 403 Forbidden without invoking the sync process
5. WHEN the Region_Sync_Endpoint is invoked successfully, THE Region_Sync_Endpoint SHALL complete the full sync cycle (provinsi, kabupaten/kota, kecamatan, kelurahan/desa) and return a sync summary containing: the count of synced records for each level (provinsi, kabupatenKota, kecamatan, kelurahanDesa) and an errors array listing any per-level failures
6. IF the EMSIFA_API is unreachable or returns an error for a specific region level during sync, THEN THE Region_Sync_Endpoint SHALL continue processing remaining levels and return HTTP 200 with the sync summary including the failure details in the errors array

### Requirement 2: Remove Master Data Tabs from General Settings

**User Story:** As an administrator, I want General Settings to only contain system configuration options, so that I can clearly distinguish between system configuration and reference data management.

#### Acceptance Criteria

1. WHEN a user navigates to the General_Settings_Page, THE General_Settings_Page SHALL NOT display tabs or navigation elements for Dokter, Klinik, Asuransi, Tarif, Wilayah, or Users
2. WHEN a user navigates to the General_Settings_Page, THE General_Settings_Page SHALL display a placeholder message indicating that system configuration options will be available in a future release, with no interactive data management controls (no create, edit, or delete actions)
3. THE General_Settings_Page SHALL retain its entry labeled "General" at the first position in the Settings_Layout sidebar navigation
4. WHEN a user navigates to the General_Settings_Page, THE General_Settings_Page SHALL display a page heading and description that reference system configuration only, without mentioning master data

### Requirement 3: Remove Lab Master Data Tabs from Laboratory Settings

**User Story:** As an administrator, I want Laboratory Settings to only contain lab-specific configuration, so that lab reference data is managed from the centralized Master Data hub.

#### Acceptance Criteria

1. WHEN a user navigates to the Laboratory_Settings_Page, THE Laboratory_Settings_Page SHALL NOT display tabs for Kategori Tes, Tes Laboratorium, Panel, Alat, Reagen, Tipe Sampel, or Satuan
2. WHEN a user navigates to the Laboratory_Settings_Page, THE Laboratory_Settings_Page SHALL display a placeholder message indicating that laboratory master data has been moved to the Master_Data_Hub, and that future lab-specific configuration options will appear on this page
3. THE Laboratory_Settings_Page SHALL retain its navigation entry labeled "Laboratory" in the Settings_Layout at the same position relative to other navigation items
4. IF a user navigates directly to a URL path that previously corresponded to a removed lab master data tab, THEN THE Laboratory_Settings_Page SHALL display the placeholder content without rendering an error state

### Requirement 4: Consolidate All Master Data under Master Data Hub

**User Story:** As an administrator, I want all master data (both general and laboratory) accessible from `/dashboard/master-data`, so that I have a single location for managing all reference data.

#### Acceptance Criteria

1. WHEN a user navigates to the Master_Data_Hub, THE Master_Data_Hub SHALL display exactly 13 navigation cards, one for each master data entity: Dokter, Klinik, Asuransi, Tarif, Wilayah, Users, Kategori Tes, Tes Laboratorium, Panel, Alat, Reagen, Tipe Sampel, and Satuan — each card showing the entity name, a brief description, and an icon
2. WHEN a user clicks on any master data entity card in the Master_Data_Hub, THE Master_Data_Hub SHALL navigate to the corresponding entity management page under the `/dashboard/master-data/` path, providing list view with Create, Read (view details), Update (edit), and Delete operations for that entity
3. WHEN a user accesses the Wilayah entity page under the Master_Data_Hub, THE Master_Data_Hub SHALL display the province-level region list retrieved from the existing regions API and a "Sinkronisasi Data" button that triggers a POST request to the Region_Sync_Endpoint
4. IF the Region_Sync_Endpoint call initiated from the Wilayah page returns an error response, THEN THE Master_Data_Hub SHALL display an error message indicating the sync failed and preserve the current region list without modification
5. WHEN a user accesses the Users entity page under the Master_Data_Hub, THE Master_Data_Hub SHALL provide user management (list, create, edit, delete) with a role selection field presenting the system-defined roles (SUPER_ADMIN, ADMIN, OWNER, MANAGER, and any other roles defined in the system)
6. THE Master_Data_Hub SHALL reuse existing API endpoints without modification (e.g., `/api/v1/master/doctors`, `/api/v1/master/clinics`, `/api/v1/users`, `/api/v1/regions/provinsi`)

### Requirement 5: Preserve Navigation and Access Control

**User Story:** As a system user, I want the sidebar navigation to correctly reflect the new structure, so that I can access master data and settings without confusion or broken links.

#### Acceptance Criteria

1. THE Sidebar_Navigation SHALL display the "Master Data" menu item for users with roles SUPER_ADMIN, OWNER, MANAGER, or ADMIN, and SHALL NOT display it for users with any other role
2. THE Sidebar_Navigation SHALL display the "Pengaturan" menu item for users with roles SUPER_ADMIN or ADMIN, and SHALL NOT display it for users with any other role
3. THE Sidebar_Navigation SHALL NOT display more than one menu item linking to the Master_Data_Hub, and SHALL NOT display individual master data entity links as separate top-level or group-level sidebar entries
4. WHEN a user without the required role (SUPER_ADMIN, OWNER, MANAGER, or ADMIN) attempts to access the Master_Data_Hub directly via URL, THE Master_Data_Hub SHALL redirect the user to the `/dashboard` page within 2 seconds without displaying master data content
5. WHEN a user without the required role (SUPER_ADMIN or ADMIN) attempts to access the General_Settings_Page directly via URL, THE General_Settings_Page SHALL redirect the user to the `/dashboard` page within 2 seconds without displaying settings content

### Requirement 6: Preserve Existing Functionality

**User Story:** As a system user, I want all existing CRUD operations and data-fetching behavior to continue working after the restructure, so that no regression occurs.

#### Acceptance Criteria

1. THE Master_Data_Hub entity pages SHALL support Create, Read, Update, and Delete operations for each of the 10 master data entities (Kategori Tes, Tes Laboratorium, Panel, Alat, Reagen, Tipe Sampel, Satuan, Dokter, Klinik, Asuransi) and for Users, using existing API endpoints without modification
2. WHEN a Create, Update, or Delete mutation succeeds on any Master_Data_Hub entity page, THE Master_Data_Hub entity page SHALL invalidate the corresponding React_Query_Cache list query key so that the displayed entity list refetches and reflects the mutation result without requiring a manual page reload
3. IF a Create or Update mutation returns a validation error from the API, THEN THE Master_Data_Hub entity page SHALL display the error indication to the user and SHALL preserve the user's form input so that data is not lost
4. THE Master_Data_Hub entity pages SHALL preserve existing client-side form validation such that required fields are enforced before submission, matching the validation behavior of the pre-restructure implementation
5. IF the TypeScript build is executed after the restructure, THEN THE build process SHALL complete without type errors
6. IF existing automated tests are executed after the restructure, THEN THE test suite SHALL pass with zero new test failures compared to the pre-restructure baseline

### Requirement 7: No Code Duplication

**User Story:** As a developer, I want the restructure to reuse existing components and services rather than duplicating them, so that the codebase remains maintainable.

#### Acceptance Criteria

1. THE Master_Data_Hub entity pages SHALL render master data CRUD UI by importing existing component modules (table rendering, form modals, CRUD logic) from their current file locations rather than creating separate copies of those components in new files
2. THE application SHALL NOT contain route paths under `/dashboard/settings/general` or `/dashboard/settings/laboratory` that render master data management UI after the restructure — old master data tabs SHALL be removed from those pages, not left as dead code alongside the new Master_Data_Hub pages
3. THE API layer SHALL NOT introduce new endpoints for functionality already served by existing endpoints — the total count of API route registrations related to master data entities SHALL remain unchanged after the restructure
4. IF a master data entity page is added to the Master_Data_Hub, THEN THE page component file SHALL import its data-fetching hooks and UI components from existing shared modules rather than re-implementing equivalent logic in a new file
