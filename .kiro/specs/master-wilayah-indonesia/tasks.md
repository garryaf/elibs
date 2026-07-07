# Implementation Plan: Master Wilayah Indonesia

## Overview

Implement a normalized Indonesian region data layer (Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa) backed by the EMSIFA API, integrate cascading region selectors into the patient registration form, and add dashboard analytics for patient distribution by region. Implementation uses TypeScript across NestJS backend and Next.js frontend with Prisma ORM and fast-check for property-based testing.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Add region models to Prisma schema and create migration
    - Add `Provinsi`, `KabupatenKota`, `Kecamatan`, `KelurahanDesa` models to `apps/api/prisma/schema.prisma` using EMSIFA string codes as `@id`
    - Add FK columns (`provinsiId`, `kabupatenKotaId`, `kecamatanId`, `kelurahanDesaId`) to the `Patient` model as nullable fields
    - Add relations from `Patient` to each region model
    - Add `@@index` on parent ID columns for each child region table
    - Run `npx prisma migrate dev` to generate the migration SQL
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.5_

  - [x] 1.2 Write property test for referential integrity enforcement
    - **Property 1: Referential Integrity Enforcement**
    - Test that inserting a child region record with a nonexistent parent ID is rejected by the database
    - **Validates: Requirements 1.5**

- [x] 2. Backend RegionModule — service and controller
  - [x] 2.1 Create RegionModule with service and controller
    - Create `src/laboratory/region/region.module.ts`, `region.service.ts`, `region.controller.ts`
    - Implement `RegionService` with methods: `findAllProvinsi`, `findKabupatenKotaByProvinsi`, `findKecamatanByKabupatenKota`, `findKelurahanDesaByKecamatan`
    - Support pagination (`page`, `limit` with default 50) and case-insensitive `search` filter
    - Implement `RegionController` with GET endpoints: `/api/v1/regions/provinsi`, `/api/v1/regions/kabupaten-kota`, `/api/v1/regions/kecamatan`, `/api/v1/regions/kelurahan-desa`
    - Return standard envelope format `{ success, message, data, meta }`
    - Create `dto/region-query.dto.ts` with class-validator decorators
    - Register `RegionModule` in `LaboratoryModule`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 2.2 Write property test for active-filtered parent-scoped query
    - **Property 4: Active-Filtered Parent-Scoped Query**
    - Verify that for any parent ID, only active records belonging to that parent are returned
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 2.3 Write property test for case-insensitive partial name search
    - **Property 5: Case-Insensitive Partial Name Search**
    - Verify that any substring of a region name (in any casing) matches that record via search
    - **Validates: Requirements 3.5**

  - [x] 2.4 Write property test for pagination completeness and no overlap
    - **Property 6: Pagination Completeness and No Overlap**
    - Verify that the union of all pages equals the full result set with no duplicates
    - **Validates: Requirements 3.6**

- [x] 3. Backend RegionSyncService — EMSIFA API integration
  - [x] 3.1 Implement RegionSyncService and CLI command
    - Create `src/laboratory/region/region-sync.service.ts` with `syncAll()` method
    - Fetch from EMSIFA API endpoints: `/provinces.json`, `/regencies/{id}.json`, `/districts/{id}.json`, `/villages/{id}.json`
    - Implement upsert logic per level using Prisma `upsert` (update name, preserve `isActive`)
    - Implement error isolation: log failures per parent and continue processing remaining records
    - Create `src/laboratory/region/region-sync.command.ts` as a NestJS CLI command
    - Add POST `/api/v1/regions/sync` endpoint (admin-only, guarded by `RolesGuard`)
    - Create `interfaces/emsifa-response.interface.ts` for type safety
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Write property test for EMSIFA ID preservation through sync
    - **Property 2: EMSIFA ID Preservation Through Sync**
    - Verify that after sync, each stored record's PK equals the original EMSIFA code
    - **Validates: Requirements 1.6, 2.1**

  - [x] 3.3 Write property test for upsert preserves isActive flag
    - **Property 3: Upsert Preserves isActive Flag**
    - Verify that upserting an existing record updates `name` but does not change `isActive`
    - **Validates: Requirements 2.6**

  - [x] 3.4 Write property test for sync idempotency
    - **Property 11: Sync Idempotency**
    - Verify that running sync multiple times produces the same record count and state as running once
    - **Validates: Requirements 8.2**

- [x] 4. Checkpoint — Backend region API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Region hierarchy validation service
  - [x] 5.1 Implement RegionValidationService
    - Create `src/laboratory/region/region-validation.service.ts`
    - Implement `validateHierarchy(provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId)` method
    - Query through Prisma nested relations to verify parent-child chain consistency
    - Reject partial selections (some levels filled but not all four) per requirement 6.1
    - Allow all-empty region submission per requirement 6.2
    - Integrate validation into patient creation/update flow in `PatientService`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Write property test for region hierarchy validation
    - **Property 9: Region Hierarchy Validation**
    - Verify that valid chains are accepted, invalid chains are rejected, and partial selections are rejected
    - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 6. Patient model integration with region FK
  - [x] 6.1 Update PatientService to store and resolve region IDs
    - Modify patient creation/update DTOs to accept optional region IDs (`provinsiId`, `kabupatenKotaId`, `kecamatanId`, `kelurahanDesaId`)
    - Call `RegionValidationService.validateHierarchy()` when region IDs are provided
    - Include resolved region names in patient response using Prisma `include` on region relations
    - Retain existing string fields (`province`, `city`, `district`, `village`) without modification
    - _Requirements: 5.3, 5.4_

  - [x] 6.2 Write property test for patient region storage round-trip
    - **Property 8: Patient Region Storage Round-Trip**
    - Verify that stored region IDs are returned correctly with matching region names
    - **Validates: Requirements 5.3, 5.4**

- [x] 7. Region seed script
  - [x] 7.1 Create Prisma seed script for region data
    - Create `apps/api/prisma/seeds/region-seed.ts`
    - Fetch all four levels from EMSIFA API and upsert into database
    - Log progress with record counts per level
    - Exit with non-zero code and descriptive error if EMSIFA API is unavailable
    - Register in `package.json` prisma seed configuration
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 8. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend CascadingRegionSelector component
  - [x] 9.1 Create CascadingRegionSelector compound component
    - Create `apps/web/src/components/regions/CascadingRegionSelector.tsx`
    - Create `apps/web/src/components/regions/RegionSelect.tsx` (single searchable select with loading/error states)
    - Create `apps/web/src/components/regions/useRegionData.ts` hook for data fetching with 5-minute client-side cache
    - Implement cascading behavior: selecting a parent loads children, changing a parent resets all child selections
    - Add search input with server-side autocomplete on each selector
    - Show loading indicator while fetching region data
    - Show error message with retry button on network failure
    - Render in 2-column grid on desktop (≥768px), single-column stack on mobile
    - Support touch interaction with scrollable dropdown on mobile
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.9, 9.1, 9.2, 9.3_

  - [x] 9.2 Write property test for cascading reset on parent change
    - **Property 7: Cascading Reset on Parent Change**
    - Verify that changing a parent selection resets all child-level selections to empty
    - **Validates: Requirements 4.5**

- [x] 10. Integrate CascadingRegionSelector into PatientFormModal
  - [x] 10.1 Update PatientFormModal with region selectors
    - Add `CascadingRegionSelector` to the patient registration form
    - Retain "Alamat Lengkap" free-text field for street-level details
    - Implement form validation: if any region level is selected, all four must be selected
    - Allow submission with no region selected (all empty is valid)
    - Display validation error when region selection is incomplete
    - Wire region IDs into patient create/update API payload
    - _Requirements: 4.1, 4.8, 6.1, 6.2_

- [x] 11. Dashboard region analytics endpoint
  - [x] 11.1 Add region distribution endpoint to DashboardService
    - Add endpoint `GET /api/v1/dashboard/region-distribution` to existing `DashboardController`
    - Accept optional filters: `provinsiId`, `kabupatenKotaId`, `kecamatanId`
    - Group patient counts by the next region level below the filter
    - Exclude soft-deleted patients (`deletedAt IS NULL`)
    - Return standard envelope format with region name and count
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.2 Write property test for dashboard counting invariant
    - **Property 10: Dashboard Counting Invariant**
    - Verify that grouped counts sum to total patients matching the filter, and each count matches actual patient count for that region
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 12. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementations follow existing NestJS/Next.js patterns
- Region tables use EMSIFA string codes as primary keys (not UUIDs) for prefix-based query optimization
- Patient model retains existing string fields for backward compatibility; new FK fields are nullable

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "9.1", "11.1"] },
    { "id": 6, "tasks": ["9.2", "10.1", "11.2"] }
  ]
}
```
