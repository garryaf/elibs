# Requirements Document

## Introduction

This document defines the requirements for consolidating all patient registration and visit creation paths in eLIS into a single unified Enterprise Registration Workflow. The system currently has duplicate entry points: the unified workflow at `/dashboard/registration` (search-first, 3-step wizard) coexists with a standalone visit creation page at `/dashboard/visits/new` and a `PatientFormModal` on the patients page that allows direct patient creation without search-first enforcement. This refactoring eliminates all parallel paths, ensuring every patient registration and visit creation flows through the search-first workflow to prevent duplicate patient records.

## Glossary

- **Unified_Registration_Workflow**: The 3-step wizard page at `/dashboard/registration` that enforces Search → Register (if needed) → Create Visit flow.
- **Standalone_Visit_Page**: The legacy page at `/dashboard/visits/new` that allows creating visits with a patient search dropdown but does NOT enforce search-first patient registration.
- **PatientFormModal**: A modal component on the patients page currently capable of both creating new patients and editing existing patients.
- **Search_First_Enforcement**: The design principle requiring users to search for existing patients before any new patient registration form becomes accessible.
- **Dead_Code**: Frontend components, pages, or utilities that are no longer referenced after consolidation and should be removed.
- **Navigation_Audit**: A systematic review of all UI entry points (buttons, links, menus) to verify they direct to the unified workflow.

## Requirements

### Requirement 1: Redirect Standalone Visit Creation Page

**User Story:** As a system architect, I want the standalone visit creation page removed and redirected, so that all visit registrations flow through the unified search-first workflow.

#### Acceptance Criteria

1. WHEN a user navigates to `/dashboard/visits/new` (via direct URL, bookmark, or any link), THE system SHALL redirect the user to `/dashboard/registration` using a Next.js permanent redirect (HTTP 308 or client-side router replace).
2. WHEN the redirect occurs, THE system SHALL NOT display the old standalone visit creation form at any point during the navigation.
3. THE system SHALL remove or replace the content of `apps/web/src/app/dashboard/visits/new/page.tsx` with a redirect component, ensuring no residual standalone visit creation logic remains executable.
4. WHEN the "Registrasi Kunjungan" button on the visits list page (`/dashboard/visits`) is clicked, THE system SHALL navigate the user to `/dashboard/registration` instead of `/dashboard/visits/new`.
5. THE system SHALL verify that no other page, component, or navigation element contains a link or router push to `/dashboard/visits/new` after the refactoring is complete.

### Requirement 2: Disable Patient Creation via PatientFormModal

**User Story:** As a registration staff member, I want patient creation to only be possible through the unified workflow, so that all new patients go through the search-first deduplication process.

#### Acceptance Criteria

1. THE PatientFormModal component SHALL only support editing existing patient records and SHALL NOT provide a "create new patient" capability.
2. WHEN the PatientFormModal is opened without an existing patient context (editData is null), THE system SHALL NOT render the modal and SHALL instead navigate the user to `/dashboard/registration`.
3. THE patients page (`/dashboard/patients`) SHALL replace the "Daftarkan Pasien" button action: instead of opening a creation modal, it SHALL navigate to `/dashboard/registration`.
4. THE patients page SHALL retain the ability to edit existing patients via the PatientFormModal when the user clicks "Edit" on a patient row.
5. IF any code path attempts to invoke PatientFormModal in creation mode (without editData), THE system SHALL redirect to `/dashboard/registration` rather than displaying an empty form.

### Requirement 3: Navigation Audit and Consolidation

**User Story:** As a hospital administrator, I want to ensure there is exactly one entry point for patient registration, so that staff cannot accidentally bypass the deduplication workflow.

#### Acceptance Criteria

1. THE system SHALL have exactly one UI path for creating new patients: through the unified workflow at `/dashboard/registration`.
2. THE system SHALL have exactly one UI path for creating new visits: through the unified workflow at `/dashboard/registration` (visit creation step).
3. THE sidebar navigation item for "Pendaftaran" (Registration) SHALL link to `/dashboard/registration`.
4. WHEN any page contains a "Daftarkan Pasien" or "Registrasi Kunjungan" call-to-action, THE link/button SHALL navigate to `/dashboard/registration`.
5. THE system SHALL NOT expose any frontend route that allows creating a patient record without first executing a patient search.
6. THE system SHALL NOT expose any frontend route that allows creating a visit without selecting or registering a patient through the search-first workflow.

### Requirement 4: Dead Code Removal

**User Story:** As a developer, I want unused code removed after consolidation, so that the codebase remains maintainable and does not confuse future contributors.

#### Acceptance Criteria

1. WHEN the standalone visit creation page is replaced with a redirect, THE system SHALL identify and remove any component imports, utility functions, or type definitions that were exclusively used by the old page and are no longer referenced elsewhere.
2. THE system SHALL remove or archive the standalone `PatientSearch` dropdown component (`apps/web/src/components/visits/PatientSearch.tsx`) IF it is no longer imported by any active component after consolidation.
3. THE system SHALL remove the `SearchableDropdown` component (`apps/web/src/components/visits/SearchableDropdown.tsx`) only IF it is no longer imported by any active component (note: check if `VisitCreationStep` or other components still use it).
4. THE system SHALL NOT remove any component, utility, or type that is still actively imported by another module in the project.
5. THE system SHALL verify there are no TypeScript compilation errors after all removals by running `npx tsc --noEmit` successfully.
6. THE system SHALL verify there are no unused import warnings in the modified files by running the project's lint command.

### Requirement 5: Documentation Update

**User Story:** As a team member, I want documentation updated to reflect the single registration entry point, so that new developers understand the current architecture.

#### Acceptance Criteria

1. THE system documentation SHALL be updated to state that `/dashboard/registration` is the sole entry point for patient registration and visit creation.
2. THE enterprise registration workflow spec (`.kiro/specs/enterprise-registration-workflow/`) SHALL be updated to note the removal of the standalone visit page and the consolidation of all entry points.
3. IF a user-facing documentation file (README, wiki, or docs folder) references `/dashboard/visits/new` as a navigation path, THE documentation SHALL be updated to reference `/dashboard/registration`.
4. THE documentation SHALL include a note explaining that patient creation is not possible outside the search-first workflow to prevent duplicate records.

### Requirement 6: Backend API Preservation

**User Story:** As a backend engineer, I want the existing API endpoints to remain unchanged, so that the refactoring is frontend-only and does not introduce backend regression.

#### Acceptance Criteria

1. THE backend API endpoints `POST /api/v1/patients` and `POST /api/v1/visits` SHALL remain unchanged and fully functional.
2. THE backend patient search endpoint `GET /api/v1/patients?search=` SHALL continue to support search by MRN, NIK, name, phone, and email as currently implemented.
3. THE refactoring SHALL NOT modify any backend service, controller, DTO, or database migration.
4. THE refactoring SHALL NOT introduce any new API endpoints.
5. All existing backend tests SHALL continue to pass without modification.

### Requirement 7: Workflow Integrity Verification

**User Story:** As a QA engineer, I want verification that the unified workflow still functions correctly after removing parallel paths, so that no regression is introduced.

#### Acceptance Criteria

1. WHEN the unified workflow is accessed at `/dashboard/registration`, THE system SHALL display the 3-step wizard (Cari Pasien → Daftar Pasien → Buat Kunjungan) as currently implemented.
2. WHEN a patient is found via search, THE system SHALL proceed directly to the visit creation step without showing the registration form.
3. WHEN no patient is found via search, THE system SHALL display the "Daftar Pasien Baru" option to register a new patient inline.
4. WHEN a new patient is registered inline, THE system SHALL automatically proceed to the visit creation step with the new patient selected.
5. WHEN a visit is successfully created, THE system SHALL display the visit number confirmation and provide options to register another or view detail.
6. All existing frontend property-based tests in `apps/web/src/components/registration/__tests__/` SHALL continue to pass without modification.
7. All existing backend property-based tests SHALL continue to pass without modification.
