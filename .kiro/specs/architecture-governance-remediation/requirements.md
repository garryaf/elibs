# Requirements Document

## Introduction

This document specifies the remediation requirements for eLIS Sprint 5-6 (Architecture & Governance), covering tasks T-042 through T-053. The scope spans six functional areas: module architecture enforcement, security and observability hardening, RBAC and governance workflows, frontend architecture decomposition, master data temporal management with bulk operations, and insurance-specific analytics reporting.

These requirements address findings from the enterprise architecture audit (AUDIT-eLIS-2026-002), functional gap report, and insurance readiness assessment.

## Glossary

- **API_Server**: The NestJS v11 backend application (`apps/api/`)
- **Web_App**: The Next.js 15 frontend application (`apps/web/`)
- **Boundary_Linter**: ESLint configuration using `eslint-plugin-boundaries` to enforce module import restrictions
- **Master_Data_Module**: The NestJS module managing test categories, tests, panels, tariffs, reference values, and related entities
- **Settings_Module**: A dedicated NestJS module managing system configuration (SMTP, WhatsApp, general settings)
- **PII_Middleware**: Prisma middleware that transparently encrypts/decrypts personally identifiable information at the data layer
- **CryptoService**: Existing AES-256-GCM encryption service at `common/crypto/crypto.service.ts`
- **Structured_Logger**: A JSON-formatted logging transport with trace ID correlation for request tracing
- **Trace_ID**: A unique identifier (UUID v4) assigned to each incoming HTTP request for end-to-end correlation
- **Approval_Request**: A generic entity representing a multi-step approval workflow for financial or master-data operations
- **Department**: An organizational entity representing a hospital/lab department (e.g., Hematology, Chemistry)
- **Position**: An organizational entity representing a staff role within a department (e.g., Head Analyst, Senior Technician)
- **Role_Hierarchy**: A tree structure where parent roles inherit all permissions of their child roles
- **Tariff_Resolver**: A service that determines the active tariff for a test based on effective date ranges
- **Bulk_Import_Service**: A service that parses CSV/Excel files and performs batch upsert operations on master data
- **Insurance_Analytics**: Reporting endpoints providing per-insurer breakdown, claim aging, and rejection analysis

## Requirements

### Requirement 1: ESLint Module Boundary Enforcement

**User Story:** As a developer, I want automated import boundary rules enforced via ESLint, so that module coupling violations are caught at development time.

#### Acceptance Criteria

1. WHEN the API_Server ESLint configuration is loaded, THE Boundary_Linter SHALL define module boundary zones for `auth`, `users`, `laboratory`, `common`, `health`, `master-data`, and `settings`
2. WHEN a source file imports from a module outside its allowed dependencies, THE Boundary_Linter SHALL report an ESLint error identifying the violation
3. THE Boundary_Linter SHALL allow `common/` modules to be imported by all other modules
4. WHEN a module imports from another non-common module, THE Boundary_Linter SHALL only permit imports that match the defined dependency graph (e.g., `laboratory` may import `master-data`, but `auth` may not import `laboratory`)
5. THE Boundary_Linter SHALL use the flat config format (`eslint.config.mjs`) compatible with the existing ESLint setup

### Requirement 2: Master Data Module Extraction

**User Story:** As an architect, I want the master-data module promoted to a top-level bounded context, so that it is independently maintainable and has clear interface boundaries.

#### Acceptance Criteria

1. WHEN the API_Server application starts, THE Master_Data_Module SHALL be registered as a top-level module at `apps/api/src/master-data/` rather than nested under `laboratory/`
2. THE Master_Data_Module SHALL expose the same API endpoints (`/api/v1/master/*`) without breaking existing clients
3. WHEN the Master_Data_Module is extracted, THE API_Server SHALL update all internal imports to reference the new module path
4. THE Master_Data_Module SHALL declare its own NestJS module with explicit exports for services consumed by other modules

### Requirement 3: Settings Module Extraction

**User Story:** As an architect, I want the settings controller extracted into a dedicated settings module, so that settings management is decoupled from the notification module (SRP compliance).

#### Acceptance Criteria

1. WHEN the API_Server application starts, THE Settings_Module SHALL be registered as a top-level module at `apps/api/src/settings/`
2. THE Settings_Module SHALL expose the existing SMTP settings endpoints (`/api/v1/settings/smtp`) without breaking existing clients
3. WHEN additional system settings are added, THE Settings_Module SHALL provide a generic key-value settings CRUD interface
4. THE Settings_Module SHALL not depend on the notification module for its core functionality

### Requirement 4: PII Encryption at Data Layer

**User Story:** As a security officer, I want patient NIK values encrypted at rest using AES-256-GCM, so that personally identifiable information is protected even if the database is compromised.

#### Acceptance Criteria

1. WHEN a Patient record is created or updated with a NIK value, THE PII_Middleware SHALL encrypt the NIK using the CryptoService before persisting to the database
2. WHEN a Patient record is read from the database, THE PII_Middleware SHALL decrypt the NIK field transparently before returning it to the application layer
3. IF the NIK value is already encrypted (matches the `iv:authTag:ciphertext` format), THEN THE PII_Middleware SHALL skip re-encryption during write operations
4. WHEN a Patient search query filters by NIK, THE PII_Middleware SHALL encrypt the search value before executing the query against the database
5. THE PII_Middleware SHALL use a dedicated `ENCRYPTION_KEY` environment variable (falling back to `JWT_SECRET` derivation if not configured)

### Requirement 5: Structured Logging with Trace ID

**User Story:** As a DevOps engineer, I want all API logs emitted in structured JSON format with trace ID correlation, so that I can trace requests end-to-end in log aggregation tools.

#### Acceptance Criteria

1. WHEN an HTTP request arrives at the API_Server, THE Structured_Logger SHALL assign a unique Trace_ID (UUID v4) if no `X-Request-ID` header is present
2. WHEN an HTTP request includes an `X-Request-ID` header, THE Structured_Logger SHALL use that value as the Trace_ID
3. THE Structured_Logger SHALL include the Trace_ID in every log entry emitted during that request lifecycle
4. THE Structured_Logger SHALL format all log entries as JSON objects containing: `timestamp`, `level`, `traceId`, `context`, `message`, and optional `meta` fields
5. WHEN an error occurs during request processing, THE Structured_Logger SHALL include the error stack trace in the `meta` field of the log entry

### Requirement 6: Configurable Approval Workflows

**User Story:** As a lab manager, I want a generic approval workflow system for financial and master-data operations, so that critical changes require explicit authorization from designated approvers.

#### Acceptance Criteria

1. WHEN a user initiates an action requiring approval (e.g., tariff change, high-value order override), THE API_Server SHALL create an Approval_Request entity with status PENDING
2. WHEN an authorized approver approves the request, THE API_Server SHALL transition the Approval_Request status to APPROVED and execute the pending action
3. WHEN an authorized approver rejects the request, THE API_Server SHALL transition the Approval_Request status to REJECTED and record the rejection reason
4. THE Approval_Request entity SHALL store: `requestType`, `requesterId`, `approverId`, `status`, `payload` (JSON), `reason`, `createdAt`, `resolvedAt`
5. WHEN multiple approval levels are configured for a request type, THE API_Server SHALL enforce sequential approval where each level must be approved before progressing to the next

### Requirement 7: Department and Position Entities

**User Story:** As an administrator, I want to assign users to departments and positions, so that data access can be scoped by organizational structure.

#### Acceptance Criteria

1. THE API_Server SHALL provide a Department entity with fields: `id`, `code`, `name`, `description`, `isActive`, `createdAt`, `updatedAt`
2. THE API_Server SHALL provide a Position entity with fields: `id`, `code`, `name`, `departmentId`, `level` (seniority), `isActive`, `createdAt`, `updatedAt`
3. WHEN a User is assigned to a Department and Position, THE API_Server SHALL store `departmentId` and `positionId` on the User model
4. WHEN data scoping is enabled, THE API_Server SHALL restrict query results to data belonging to the user's department unless the user has a cross-department permission

### Requirement 8: Role Hierarchy with Permission Inheritance

**User Story:** As an administrator, I want roles to inherit permissions from child roles in a hierarchy, so that senior roles automatically gain access granted to junior roles.

#### Acceptance Criteria

1. THE API_Server SHALL support a `parentRole` relationship on roles, forming a directed acyclic hierarchy (e.g., MANAGER inherits ADMIN permissions, OWNER inherits MANAGER permissions)
2. WHEN the PermissionGuard checks permissions for a user, THE API_Server SHALL evaluate the user's direct permissions AND all permissions inherited from descendant roles in the hierarchy
3. THE API_Server SHALL define a default hierarchy: SUPER_ADMIN → OWNER → MANAGER → ADMIN → operational roles (KASIR, SAMPLING, ANALIS, etc.)
4. IF a circular dependency is detected in the role hierarchy configuration, THEN THE API_Server SHALL reject the configuration change and return a validation error

### Requirement 9: Settings Page Decomposition

**User Story:** As a frontend developer, I want the monolithic settings page decomposed into route-based sub-pages, so that each settings section loads independently and the codebase is maintainable.

#### Acceptance Criteria

1. WHEN a user navigates to `/dashboard/settings`, THE Web_App SHALL display a settings navigation with links to individual sections
2. THE Web_App SHALL implement each settings section as a separate route under `/dashboard/settings/[section]` (e.g., `/dashboard/settings/smtp`, `/dashboard/settings/general`, `/dashboard/settings/notifications`)
3. WHEN a user navigates to a specific settings section, THE Web_App SHALL load only that section's component and data
4. THE Web_App SHALL preserve all existing functionality from the original monolithic settings page across the decomposed sections

### Requirement 10: Tariff Effective Date Management

**User Story:** As a finance officer, I want tariffs to have effective date ranges, so that historical pricing is preserved and future tariff changes can be scheduled in advance.

#### Acceptance Criteria

1. THE Tariff model SHALL include `effectiveFrom` (required DateTime) and `effectiveTo` (nullable DateTime) fields
2. WHEN the Tariff_Resolver determines the active tariff for a test, THE Tariff_Resolver SHALL return the tariff where `effectiveFrom <= currentDate` and (`effectiveTo IS NULL` OR `effectiveTo >= currentDate`)
3. IF multiple tariffs match the date range for the same test-clinic-insurance combination, THEN THE Tariff_Resolver SHALL return the tariff with the most recent `effectiveFrom` date
4. WHEN a new tariff is created with overlapping dates for the same test-clinic-insurance combination, THE API_Server SHALL automatically close the previous tariff by setting its `effectiveTo` to the day before the new tariff's `effectiveFrom`

### Requirement 11: Master Data Bulk Import and Export

**User Story:** As a lab administrator, I want to import and export master data in bulk via CSV/Excel files, so that large-scale data migrations and updates are efficient.

#### Acceptance Criteria

1. WHEN a user uploads a CSV or Excel file to the bulk import endpoint, THE Bulk_Import_Service SHALL parse the file and validate each row against the entity schema
2. WHEN validation passes for all rows, THE Bulk_Import_Service SHALL perform an upsert operation (insert new records, update existing by unique key)
3. IF one or more rows fail validation, THEN THE Bulk_Import_Service SHALL return a detailed error report identifying the row number, field, and validation failure for each invalid row
4. WHEN a user requests a bulk export, THE API_Server SHALL generate a CSV file containing all active records for the requested entity type (tests, tariffs, panels, doctors, clinics)
5. THE Bulk_Import_Service SHALL support streaming file parsing to handle files up to 10,000 rows without excessive memory consumption

### Requirement 12: Insurance Analytics Reporting

**User Story:** As a finance manager, I want insurance-specific reporting endpoints, so that I can analyze claim performance per insurer, identify rejection patterns, and track claim aging.

#### Acceptance Criteria

1. WHEN a user requests the insurer breakdown report, THE API_Server SHALL return claim counts and covered amounts grouped by insurance provider
2. WHEN a user requests the rejection analysis report, THE API_Server SHALL return rejection counts grouped by rejection reason and insurer, with total rejected amounts
3. WHEN a user requests the claim aging report, THE API_Server SHALL return claims grouped by age buckets (0-30 days, 31-60 days, 61-90 days, >90 days) with amounts for each bucket
4. THE API_Server SHALL accept date range filters (`startDate`, `endDate`) and optional `insurerId` filter for all insurance analytics endpoints
5. WHEN a user requests the insurer breakdown report, THE API_Server SHALL include per-insurer metrics: total claims, approved count, rejected count, pending count, average processing time in days
