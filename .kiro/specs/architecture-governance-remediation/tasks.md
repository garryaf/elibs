# Implementation Plan: Architecture & Governance Remediation

## Overview

This plan implements tasks T-042 through T-053 from the eLIS remediation backlog. The implementation is ordered to minimize dependencies: module extraction first (unblocks boundary enforcement), then security/observability, then RBAC/governance, then master data enhancements, then frontend decomposition, and finally analytics.

**Language:** TypeScript (NestJS + Next.js)
**Testing:** Jest + fast-check for property-based tests

## Tasks

- [x] 1. Extract Master Data module to top-level bounded context (T-043)
  - [x] 1.1 Create `apps/api/src/master-data/` directory structure mirroring current `laboratory/master-data/`
    - Move all files: controllers, services, DTOs, module definition
    - Update all internal import paths to new location
    - _Requirements: 2.1, 2.3_
  - [x] 1.2 Update `MasterDataModule` declaration and register as top-level in `AppModule`
    - Remove `MasterDataModule` from `LaboratoryModule` imports
    - Add `MasterDataModule` to `AppModule` imports
    - Ensure explicit exports of `MasterDataService` and `TariffResolverService` (new)
    - _Requirements: 2.4_
  - [x] 1.3 Update `LaboratoryModule` to import `MasterDataModule` for any remaining internal dependencies
    - Verify all cross-module references compile correctly
    - _Requirements: 2.2, 2.3_
  - [x] 1.4 Write integration test verifying `/api/v1/master/*` endpoints still respond correctly
    - Test GET test-categories, GET tests, GET panels, GET tariffs
    - _Requirements: 2.2_

- [x] 2. Extract Settings module to top-level bounded context (T-044)
  - [x] 2.1 Create `apps/api/src/settings/` directory with `SettingsModule`, `SettingsController`, `SettingsService`
    - Move `settings.controller.ts` from `laboratory/notification/`
    - Create `SettingsService` with generic key-value CRUD interface (`getSetting`, `setSetting`, `getSettingsByPrefix`, `bulkUpdate`)
    - Remove dependency on `EmailService` from settings controller (inject only for test-smtp endpoint, or move test-smtp to notification)
    - _Requirements: 3.1, 3.3, 3.4_
  - [x] 2.2 Register `SettingsModule` in `AppModule` and remove settings controller from `NotificationModule`
    - Update `NotificationModule` to no longer export settings controller
    - _Requirements: 3.1, 3.2_
  - [x] 2.3 Write property test for Settings key-value round-trip
    - **Property 8: Settings Key-Value Round-Trip**
    - **Validates: Requirements 3.3**

- [x] 3. ESLint boundary enforcement (T-042)
  - [x] 3.1 Install `eslint-plugin-boundaries` and configure in `apps/api/eslint.config.mjs`
    - Define module zones: `common`, `auth`, `users`, `master-data`, `settings`, `laboratory`, `health`, `approval`
    - Define allowed dependency rules per the architecture dependency graph
    - Configure in flat config format compatible with existing setup
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - [x] 3.2 Write ESLint test fixtures verifying boundary violations are caught
    - Create test files with invalid cross-module imports
    - Run ESLint programmatically and assert errors
    - _Requirements: 1.2_

- [x] 4. Checkpoint - Module architecture stable
  - Ensure all tests pass, ask the user if questions arise.
  - Run `npx tsc --noEmit` to verify no broken imports
  - Run existing tests to confirm no regressions

- [x] 5. PII Encryption at data layer (T-045)
  - [x] 5.1 Create Prisma Client Extension for PII encryption at `apps/api/src/common/prisma/pii-encryption.extension.ts`
    - Implement `$allOperations` hook for Patient model
    - On create/update: encrypt `nik` field if not already encrypted (use `CryptoService.isEncrypted()` check)
    - On find results: decrypt `nik` field transparently
    - On where clauses containing `nik`: encrypt the filter value before query execution
    - Add `ENCRYPTION_KEY` env variable support to `CryptoService` (fallback to JWT_SECRET derivation)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 5.2 Register the PII extension in `PrismaService` initialization
    - Extend existing `PrismaService` to use the client extension
    - _Requirements: 4.1_
  - [x] 5.3 Create data migration script to encrypt existing plaintext NIK values
    - Script reads all patients, encrypts NIK values that aren't already encrypted, writes back
    - Include dry-run mode and progress reporting
    - _Requirements: 4.1_
  - [x] 5.4 Write property tests for PII encryption
    - **Property 1: PII Encryption Round-Trip**
    - **Property 2: PII Encryption Idempotence**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 6. Structured logging with Trace ID (T-046)
  - [x] 6.1 Install `nestjs-pino` and `pino-pretty` (dev), configure `LoggerModule` at `apps/api/src/common/logging/`
    - Create `LoggingModule` importing `LoggerModule.forRoot()` with JSON transport
    - Configure log format: `timestamp`, `level`, `traceId`, `context`, `message`, `meta`
    - Replace default NestJS logger with Pino in `main.ts`
    - _Requirements: 5.4_
  - [x] 6.2 Create `TraceIdMiddleware` at `apps/api/src/common/logging/trace-id.middleware.ts`
    - Generate UUID v4 if no `X-Request-ID` header present
    - Pass through existing `X-Request-ID` header value
    - Set `X-Request-ID` response header
    - Store traceId in async local storage (or pino request context) for downstream log calls
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 6.3 Register `TraceIdMiddleware` globally in `AppModule` and configure Pino to include traceId
    - Use `pino-http` request serializer to include traceId from request context
    - Ensure error logs include stack trace in `meta` field
    - _Requirements: 5.3, 5.5_
  - [x] 6.4 Write property test for log entry format completeness
    - **Property 3: Log Entry Format Completeness**
    - **Validates: Requirements 5.3, 5.4**

- [x] 7. Checkpoint - Security and observability complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify PII encryption works with existing patient CRUD endpoints
  - Verify JSON logs are emitted with trace IDs

- [x] 8. Approval workflow system (T-047)
  - [x] 8.1 Add Prisma schema for `ApprovalRequest`, `ApprovalStep`, `ApprovalType` enum, `ApprovalStatus` enum
    - Create migration with all fields as specified in design
    - _Requirements: 6.4_
  - [x] 8.2 Create `apps/api/src/approval/` module with `ApprovalService` and `ApprovalController`
    - `POST /api/v1/approvals` - create approval request
    - `POST /api/v1/approvals/:id/approve` - approve current level
    - `POST /api/v1/approvals/:id/reject` - reject with reason
    - `GET /api/v1/approvals` - list pending approvals (filterable by type, status)
    - `GET /api/v1/approvals/:id` - get approval detail with steps
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 8.3 Implement sequential approval logic in `ApprovalService`
    - Validate approver is authorized for current level
    - On approve: increment `currentLevel`, if `currentLevel > maxLevel` then set status APPROVED
    - On reject at any level: set status REJECTED immediately
    - Record each action as an `ApprovalStep`
    - _Requirements: 6.5_
  - [x] 8.4 Write property tests for approval workflow
    - **Property 4: Approval Creation Correctness**
    - **Property 5: Approval State Transition - Approve**
    - **Property 6: Approval State Transition - Reject**
    - **Property 7: Sequential Approval Enforcement**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [x] 9. Department and Position entities (T-048)
  - [x] 9.1 Add `Department`, `Position` models to Prisma schema and add `departmentId`/`positionId` to User model
    - Create migration (nullable FKs on User for backward compatibility)
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 9.2 Create CRUD endpoints for Department and Position in `apps/api/src/users/` or a new `organization/` module
    - `GET/POST/PUT/DELETE /api/v1/departments`
    - `GET/POST/PUT/DELETE /api/v1/positions`
    - Update User update DTO to accept `departmentId` and `positionId`
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 9.3 Implement data scoping guard/interceptor for department-based filtering
    - Create `DataScopingInterceptor` that adds `departmentId` filter to queries when user has department assigned
    - Skip scoping for users with cross-department permission (e.g., `data.cross-department` permission)
    - _Requirements: 7.4_
  - [x] 9.4 Write property test for department data scoping
    - **Property 9: Department Data Scoping**
    - **Validates: Requirements 7.4**

- [x] 10. Role hierarchy with permission inheritance (T-049)
  - [x] 10.1 Add `RoleHierarchy` model to Prisma schema and create migration
    - Seed default hierarchy: SUPER_ADMIN → OWNER → MANAGER → ADMIN → operational roles
    - _Requirements: 8.1, 8.3_
  - [x] 10.2 Enhance `RbacService.hasPermission()` to resolve inherited permissions via hierarchy
    - Implement `getInheritedRoles(role)` method that walks hierarchy collecting descendant roles
    - Modify permission check to query `role: { in: inheritedRoles }`
    - _Requirements: 8.2_
  - [x] 10.3 Add cycle detection in hierarchy configuration endpoints
    - Before inserting/updating `RoleHierarchy`, validate no cycle would be created
    - Return 422 validation error if cycle detected
    - _Requirements: 8.4_
  - [x] 10.4 Write property tests for role hierarchy
    - **Property 10: Role Hierarchy DAG Invariant**
    - **Property 11: Permission Inheritance Resolution**
    - **Property 12: Circular Hierarchy Rejection**
    - **Validates: Requirements 8.1, 8.2, 8.4**

- [x] 11. Checkpoint - RBAC and governance complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify approval workflow with manual API test
  - Verify role hierarchy permission inheritance works

- [x] 12. Tariff effective date management (T-051)
  - [x] 12.1 Add `effectiveFrom` and `effectiveTo` fields to Tariff model in Prisma schema
    - Create migration: `effectiveFrom` defaults to existing `createdAt`, `effectiveTo` nullable
    - Update unique constraint to include `effectiveFrom`
    - _Requirements: 10.1_
  - [x] 12.2 Implement `TariffResolverService` at `apps/api/src/master-data/tariff-resolver.service.ts`
    - `getActiveTariff(testId, clinicId?, insuranceId?, asOfDate?)` - returns active tariff for date
    - `closeOverlappingTariff(...)` - sets effectiveTo on previous tariff when new one is created
    - _Requirements: 10.2, 10.3, 10.4_
  - [x] 12.3 Update `TariffController` create endpoint to call `closeOverlappingTariff` before creating new tariff
    - Update DTOs to include `effectiveFrom` and optional `effectiveTo`
    - _Requirements: 10.4_
  - [x] 12.4 Write property tests for tariff temporal resolution
    - **Property 13: Tariff Temporal Resolution**
    - **Property 14: Tariff Overlap Auto-Close**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 13. Bulk import and export for master data (T-052)
  - [x] 13.1 Install `csv-parse`, `csv-stringify`, and `exceljs` packages
    - Add multer file upload configuration for CSV/Excel MIME types
    - _Requirements: 11.5_
  - [x] 13.2 Create `BulkImportService` at `apps/api/src/master-data/bulk-import/bulk-import.service.ts`
    - Implement streaming CSV parser using `csv-parse` with pipe API
    - Implement Excel parser using `exceljs` streaming reader
    - Implement row validation against entity schema (using class-validator DTOs)
    - Return `BulkImportResult` with success/error counts and detailed error report
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  - [x] 13.3 Create `BulkExportService` at `apps/api/src/master-data/bulk-import/bulk-export.service.ts`
    - Export all active records for entity type as CSV using `csv-stringify`
    - Support tests, tariffs, panels, doctors, clinics entity types
    - _Requirements: 11.4_
  - [x] 13.4 Create bulk import/export controller endpoints
    - `POST /api/v1/master/import/:entityType` - file upload with validation
    - `GET /api/v1/master/export/:entityType?format=csv` - download CSV/Excel
    - Apply `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` guard
    - _Requirements: 11.1, 11.4_
  - [x]* 13.5 Write property tests for bulk import/export
    - **Property 15: Bulk Import Valid Data Persistence**
    - **Property 16: Bulk Import Error Reporting**
    - **Property 17: Bulk Export Completeness**
    - **Validates: Requirements 11.2, 11.3, 11.4**

- [x] 14. Checkpoint - Master data enhancements complete
  - Ensure all tests pass, ask the user if questions arise.
  - Verify tariff effective dates work with existing order flow
  - Verify bulk import with sample CSV file

- [x] 15. Insurance analytics reporting (T-053)
  - [x] 15.1 Create `InsuranceAnalyticsService` at `apps/api/src/laboratory/reports/insurance-analytics.service.ts`
    - `getInsurerBreakdown(query)` - group claims by insurer with metrics (total, approved, rejected, pending, avg processing time)
    - `getRejectionAnalysis(query)` - group rejections by reason and insurer
    - `getClaimAging(query)` - bucket claims by age (0-30, 31-60, 61-90, >90 days)
    - All methods accept `startDate`, `endDate`, optional `insurerId` filters
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 15.2 Create `InsuranceAnalyticsController` with endpoints
    - `GET /api/v1/reports/insurance/breakdown` - insurer breakdown
    - `GET /api/v1/reports/insurance/rejections` - rejection analysis
    - `GET /api/v1/reports/insurance/aging` - claim aging
    - Register in `ReportsModule`
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 15.3 Write property tests for insurance analytics
    - **Property 18: Insurance Breakdown Correctness**
    - **Property 19: Rejection Analysis Grouping**
    - **Property 20: Claim Aging Bucket Assignment**
    - **Property 21: Insurance Analytics Date Filtering**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [x] 16. Settings page decomposition (T-050)
  - [x] 16.1 Create settings layout with sidebar navigation at `apps/web/src/app/dashboard/settings/layout.tsx`
    - Implement a settings sidebar with links to each section
    - Style consistently with existing dashboard layout
    - _Requirements: 9.1_
  - [x] 16.2 Decompose monolithic `settings/page.tsx` into individual route pages
    - Create `settings/general/page.tsx` - company/general settings
    - Create `settings/smtp/page.tsx` - SMTP configuration
    - Create `settings/notifications/page.tsx` - notification preferences
    - Create `settings/laboratory/page.tsx` - lab-specific settings
    - Create `settings/whatsapp/page.tsx` - WhatsApp integration
    - Create `settings/users/page.tsx` - user default settings
    - Create `settings/appearance/page.tsx` - theme/appearance
    - Extract relevant sections from original 1177-line page into each sub-page
    - _Requirements: 9.2, 9.3, 9.4_
  - [x] 16.3 Update `settings/page.tsx` to redirect to default section or show overview
    - Redirect to `/dashboard/settings/general` by default
    - _Requirements: 9.1_
  - [x]* 16.4 Write E2E test verifying settings sections load correctly
    - Navigate to each section route and verify content renders
    - _Requirements: 9.3, 9.4_

- [x] 17. Final checkpoint - All tasks complete
  - Ensure all tests pass, ask the user if questions arise.
  - Run full test suite: `npm run test`
  - Run ESLint with boundary rules: `npx eslint .`
  - Verify TypeScript compilation: `npx tsc --noEmit`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.4", "2.3", "3.1", "3.2"] },
    { "id": 2, "tasks": ["5.1", "5.2", "5.3", "6.1", "6.2", "6.3", "16.1", "16.2", "16.3"] },
    { "id": 3, "tasks": ["5.4", "6.4", "16.4"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "9.1", "9.2", "9.3", "10.1", "10.2", "10.3", "12.1", "12.2", "12.3"] },
    { "id": 5, "tasks": ["8.4", "9.4", "10.4", "12.4", "13.1", "13.2", "13.3", "13.4"] },
    { "id": 6, "tasks": ["13.5", "15.1", "15.2"] },
    { "id": 7, "tasks": ["15.3"] }
  ]
}
```

**Parallel Tracks:**
- **Track A (Backend Architecture):** Tasks 1 → 2 → 3 → 4 (wave 0-1)
- **Track B (Security):** Tasks 5, 6 → 7 (wave 2-3)
- **Track C (RBAC/Governance):** Tasks 8, 9, 10 → 11 (wave 4-5)
- **Track D (Master Data):** Tasks 12, 13 → 14 (wave 4-6)
- **Track E (Frontend):** Task 16 (wave 2, independent of backend tracks)
- **Track F (Analytics):** Task 15 (wave 6-7, depends on RBAC checkpoint)

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (21 properties total)
- Unit tests validate specific examples and edge cases
- Module extraction tasks (1-3) must be done first as they unblock boundary enforcement
- The PII data migration script (5.3) should be run in a maintenance window after deployment
- Frontend decomposition (16) is independent of backend tasks and can be parallelized
