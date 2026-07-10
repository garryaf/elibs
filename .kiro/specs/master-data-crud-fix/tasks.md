# Implementation Plan

## Overview

Fix the Master Data CRUD page by: (1) correcting all 10 card navigation hrefs, (2) creating TanStack Query service hooks for all 10 entities, (3) building shared CRUD components that correctly unwrap paginated API responses, and (4) creating a dynamic route page for entity management. Follows the bugfix workflow: exploration test → preservation test → implement → verify.

## Tasks

- [-] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Master Data Navigation & Data Rendering Broken
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all three bug aspects (navigation, hooks, response unwrapping)
  - **Scoped PBT Approach**: Scope property to the 10 master data entities and their concrete failing cases
  - Test file: `apps/web/src/__tests__/master-data-bug-condition.test.ts`
  - Test 1 - Navigation: Assert each `masterDataItems[i].href` equals `/dashboard/master-data/{slug}` for all 10 entities (from Bug Condition: isBugCondition returns true when target is any of the 10 entities)
  - Test 2 - Hook Existence: Assert `useMasterUnits`, `useMasterSampleTypes`, etc. are importable from `@/services` (from Bug Condition: hookDoesNotExist returns true)
  - Test 3 - Response Unwrapping: Given a mock paginated response `{ data: [...], meta: {...} }`, assert rendering extracts `.data` array before `.map()` (from Bug Condition: mapCalledOnWrapper returns true)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (proves bugs exist: all hrefs show `/dashboard/settings`, hooks don't exist, response wrapper crashes `.map()`)
  - Document counterexamples: "All 10 hrefs are `/dashboard/settings`", "Module `@/services` does not export master data hooks", "TypeError: response.map is not a function"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Services and Navigation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `apps/web/src/__tests__/master-data-preservation.test.ts`
  - Observe: existing exports from `@/services` (usePatients, useOrders, useLabQueue, useDashboardSummary, useUsers) are importable on unfixed code
  - Observe: `apiClient.getDoctors()`, `apiClient.getClinics()`, `apiClient.getInsurances()` return `ApiResponse<PaginatedResponse<T>>` format on unfixed code
  - Observe: Master Data page renders 10 cards with correct names, icons, descriptions on unfixed code
  - Write property-based test: for all existing service modules (patients, orders, lab, dashboard, users), re-exports remain available after adding master-data barrel export
  - Write property-based test: for all `apiClient` methods used by other features, response format is unchanged
  - Write property-based test: for all 10 cards, visual properties (name, description, icon) remain identical — only href changes
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. Fix card navigation hrefs in master-data page

  - [ ] 3.1 Update all 10 masterDataItems href values
    - File: `apps/web/src/app/dashboard/master-data/page.tsx`
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/kategori-pemeriksaan"` for Kategori Pemeriksaan
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/pemeriksaan-lab"` for Pemeriksaan Lab
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/panel"` for Panel
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/dokter"` for Dokter
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/klinik"` for Klinik
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/asuransi"` for Asuransi
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/alat"` for Alat
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/reagen"` for Reagen
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/satuan"` for Satuan
    - Change `href: "/dashboard/settings"` → `href: "/dashboard/master-data/jenis-sampel"` for Jenis Sampel
    - _Bug_Condition: isBugCondition(X) where X.targetPage IN {all 10 entity slugs} AND current href = "/dashboard/settings"_
    - _Expected_Behavior: navigateMasterDataCard'(X).href = "/dashboard/master-data/" + X.targetPage_
    - _Preservation: Card grid layout, icons, names, descriptions remain unchanged (only href values change)_
    - _Requirements: 2.1, 3.3_

- [ ] 4. Create TanStack Query service hooks for master data (Satuan & Jenis Sampel first)

  - [ ] 4.1 Create `apps/web/src/services/master-data.ts` with hooks for Satuan (measurement-units)
    - Define `masterDataKeys.units` query key factory
    - Implement `useMasterUnits(params?)` — calls `apiClient.get('/api/v1/master/units')` with pagination params
    - Implement `useCreateMasterUnit()` — POST to `/api/v1/master/units`, invalidates units query cache
    - Implement `useUpdateMasterUnit()` — PUT to `/api/v1/master/units/:id`, invalidates units query cache
    - Implement `useDeleteMasterUnit()` — DELETE to `/api/v1/master/units/:id`, invalidates units query cache
    - _Bug_Condition: hookDoesNotExist("measurementUnit") = true_
    - _Expected_Behavior: useMasterUnits returns { data: { data: T[], meta }, isLoading, error }_
    - _Requirements: 2.3, 2.4_

  - [ ] 4.2 Add hooks for Jenis Sampel (sample-types)
    - Define `masterDataKeys.sampleTypes` query key factory
    - Implement `useMasterSampleTypes(params?)` — calls `apiClient.get('/api/v1/master/sample-types')`
    - Implement `useCreateMasterSampleType()`, `useUpdateMasterSampleType()`, `useDeleteMasterSampleType()`
    - _Requirements: 2.3, 2.4_

  - [ ] 4.3 Add hooks for remaining 8 entities
    - Dokter: `useMasterDoctors`, `useCreateMasterDoctor`, `useUpdateMasterDoctor`, `useDeleteMasterDoctor` → `/api/v1/master/doctors`
    - Klinik: `useMasterClinics`, `useCreateMasterClinic`, `useUpdateMasterClinic`, `useDeleteMasterClinic` → `/api/v1/master/clinics`
    - Asuransi: `useMasterInsurances`, `useCreateMasterInsurance`, `useUpdateMasterInsurance`, `useDeleteMasterInsurance` → `/api/v1/master/insurances`
    - Alat: `useMasterEquipments`, `useCreateMasterEquipment`, `useUpdateMasterEquipment`, `useDeleteMasterEquipment` → `/api/v1/master/equipments`
    - Reagen: `useMasterReagents`, `useCreateMasterReagent`, `useUpdateMasterReagent`, `useDeleteMasterReagent` → `/api/v1/master/reagents`
    - Kategori Pemeriksaan: `useMasterTestCategories`, `useCreateMasterTestCategory`, `useUpdateMasterTestCategory`, `useDeleteMasterTestCategory` → `/api/v1/master/test-categories`
    - Pemeriksaan Lab: `useMasterTests`, `useCreateMasterTest`, `useUpdateMasterTest`, `useDeleteMasterTest` → `/api/v1/master/tests`
    - Panel: `useMasterPanels`, `useCreateMasterPanel`, `useUpdateMasterPanel`, `useDeleteMasterPanel` → `/api/v1/master/panels`
    - _Requirements: 2.3, 2.4_

  - [ ] 4.4 Update `apps/web/src/services/index.ts` barrel export
    - Add `export * from "./master-data"` to the barrel file
    - Ensure existing exports (patients, orders, lab, dashboard, users) remain unchanged
    - _Preservation: Existing service exports must remain importable from "@/services"_
    - _Requirements: 2.3, 3.2_

- [ ] 5. Create shared CRUD components with response unwrapping

  - [ ] 5.1 Create `apps/web/src/components/master-data/MasterDataTable.tsx`
    - Accept props: `columns`, `data[]`, `meta` (pagination), `onEdit`, `onDelete`, `onSearch`, `isLoading`
    - Render table rows with action buttons (Edit, Delete)
    - Handle pagination via `meta.page`, `meta.totalPages`
    - Include search input with debounce
    - _Requirements: 2.2_

  - [ ] 5.2 Create `apps/web/src/components/master-data/MasterDataFormModal.tsx`
    - Accept props: `fields[]` config (name, label, type, required), `initialData?`, `onSubmit`, `isOpen`, `onClose`
    - Render controlled form inputs based on fields config
    - Handle create mode (empty form) and edit mode (pre-filled with initialData)
    - Call `onSubmit` with form data object
    - _Requirements: 2.4_

- [ ] 6. Create dynamic route page with response unwrapping (Satuan & Jenis Sampel first)

  - [ ] 6.1 Create `apps/web/src/app/dashboard/master-data/[entity]/page.tsx`
    - Read `entity` param from URL using `useParams()`
    - Create entity config map: slug → { useQuery hook, useMutation hooks, columns, form fields, display name }
    - Implement for Satuan (`satuan`) and Jenis Sampel (`jenis-sampel`) first
    - **CRITICAL**: Extract `.data` from response: `const items = response?.data ?? []` (unwrap paginated wrapper)
    - Extract pagination: `const meta = response?.meta`
    - Pass `items` (array) to `<MasterDataTable>` — NOT the raw response object
    - Integrate `<MasterDataFormModal>` for create/edit with mutation hooks
    - Handle invalid entity slug (show 404 or redirect)
    - _Bug_Condition: mapCalledOnWrapper(response) = true when .map() is called on { data: [...], meta: {...} } directly_
    - _Expected_Behavior: Array.isArray(renderInput) AND no_runtime_error(renderInput.map(...))_
    - _Preservation: Non-master-data pages unaffected_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 6.2 Add entity configs for remaining 8 entities
    - Add column definitions and form field configs for: kategori-pemeriksaan, pemeriksaan-lab, panel, dokter, klinik, asuransi, alat, reagen
    - Each config maps slug to: display name, query hook, mutation hooks, table columns, form fields
    - _Requirements: 2.1, 2.3_

- [ ] 7. Verify bug condition exploration test now passes

  - [ ] 7.1 Re-run bug condition exploration test
    - **Property 1: Expected Behavior** - Master Data Navigation & Data Rendering Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (correct hrefs, hooks exist, response unwrapped)
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms all three bugs are fixed)
    - All 10 hrefs now point to `/dashboard/master-data/{slug}`
    - All query/mutation hooks are importable from `@/services`
    - Response `.data` array is correctly extracted before `.map()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 7.2 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Services and Navigation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Existing service exports remain available
    - `apiClient` methods return same format
    - Master Data card visual properties unchanged
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Run full test suite: `npx vitest --run` in `apps/web`
  - Ensure bug condition exploration test passes (task 1 test validates fix)
  - Ensure preservation property tests pass (task 2 tests validate no regressions)
  - Ensure TypeScript compiles without errors: `npx tsc --noEmit` in `apps/web`
  - Verify no lint errors in new/modified files
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["6.1", "6.2"] },
    { "id": 5, "tasks": ["7.1", "7.2"] },
    { "id": 6, "tasks": ["8"] }
  ]
}
```

## Notes

- Priority: Satuan and Jenis Sampel implemented first to validate the pattern before remaining 8 entities
- No backend changes needed — all backend CRUD endpoints at `/api/v1/master/*` are fully functional
- Response unwrapping: all 10 entities return `{ data: [...], meta: {...} }` directly from `apiClient.get<T>()`
- The dynamic route `[entity]/page.tsx` handles all 10 entities via a config map (slug → hooks + columns + fields)
- Existing `apiClient` methods (getDoctors, getClinics, getInsurances) remain for backward compatibility with other features
