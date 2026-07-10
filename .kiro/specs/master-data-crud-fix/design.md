# Master Data CRUD Fix — Bugfix Design

## Overview

The Master Data page (`/dashboard/master-data`) is non-functional due to three frontend wiring issues: all 10 navigation cards point to `/dashboard/settings` instead of entity-specific sub-pages, no TanStack Query service hooks exist for data fetching/mutations, and any attempted data rendering crashes because the paginated response wrapper `{ data: [...], meta: {...} }` is not unwrapped before calling `.map()`. The backend CRUD endpoints at `/api/v1/master/*` are fully operational — the fix is purely frontend.

The approach is to:
1. Correct all card `href` values to point to `/dashboard/master-data/{slug}`
2. Create a reusable `master-data` TanStack Query service with hooks for all 10 entities
3. Build shared CRUD sub-page components that correctly extract `.data` from the API response before rendering

## Glossary

- **Bug_Condition (C)**: User navigates to any master data entity page — card links are broken, hooks don't exist, response is not unwrapped
- **Property (P)**: Cards navigate correctly, hooks fetch data from the correct endpoint, and `.data` is extracted before rendering
- **Preservation**: Existing non-master-data pages (patients, orders, lab, dashboard, settings) and existing `apiClient` methods continue working without modification
- **masterDataItems**: The array in `page.tsx` defining the 10 entity cards with `name`, `description`, `icon`, and `href`
- **PaginatedResponse**: The backend response format `{ data: T[], meta: { total, page, limit, totalPages? } }`
- **Entity slug**: The URL path segment identifying each entity (e.g., `satuan`, `jenis-sampel`, `dokter`)

## Bug Details

### Bug Condition

The bug manifests when a user clicks any Master Data card or when a sub-page attempts to render entity data. The `masterDataItems` array has all `href` values hardcoded to `/dashboard/settings`, no TanStack Query hooks exist for master data CRUD operations, and any rendering code that does reference the API response calls `.map()` on the wrapper object instead of on `response.data`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type MasterDataInteraction
  OUTPUT: boolean

  RETURN (input.action = "NAVIGATE" AND input.target IN masterDataEntities)
         OR (input.action = "FETCH" AND input.entity IN masterDataEntities AND hookDoesNotExist(input.entity))
         OR (input.action = "RENDER" AND input.response IS PaginatedWrapper AND mapCalledOnWrapper(input.response))
END FUNCTION
```

### Examples

- **Broken Navigation**: User clicks "Satuan" card → navigated to `/dashboard/settings` instead of `/dashboard/master-data/satuan`
- **Missing Hooks**: Sub-page calls `useMasterUnits()` → function does not exist, page cannot fetch data
- **Crash on Render**: Response `{ data: [{id:"1", name:"mg"}], meta: {total:1} }` is passed directly to `.map()` → `TypeError: e.map is not a function`
- **Missing Mutations**: User clicks "Tambah" (Add) button → no `useCreateUnit()` hook exists, form submission does nothing

### Entity Mapping

| # | Card Name | Slug | API Endpoint | Prisma Model |
|---|-----------|------|--------------|--------------|
| 1 | Kategori Pemeriksaan | `kategori-pemeriksaan` | `/api/v1/master/test-categories` | testCategory |
| 2 | Pemeriksaan Lab | `pemeriksaan-lab` | `/api/v1/master/tests` | testMaster |
| 3 | Panel | `panel` | `/api/v1/master/panels` | panel |
| 4 | Dokter | `dokter` | `/api/v1/master/doctors` | doctor |
| 5 | Klinik | `klinik` | `/api/v1/master/clinics` | clinic |
| 6 | Asuransi | `asuransi` | `/api/v1/master/insurances` | insurance |
| 7 | Alat | `alat` | `/api/v1/master/equipments` | equipment |
| 8 | Reagen | `reagen` | `/api/v1/master/reagents` | reagent |
| 9 | Satuan | `satuan` | `/api/v1/master/units` | measurementUnit |
| 10 | Jenis Sampel | `jenis-sampel` | `/api/v1/master/sample-types` | sampleTypeMaster |

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All non-master-data pages (patients, orders, lab workflow, dashboard, settings, users) must continue to function with existing navigation and data fetching
- Existing `apiClient` methods (`getDoctors`, `getClinics`, `getInsurances`, `getTestCategories`, `getTests`) must remain available and return data in the same `ApiResponse<PaginatedResponse<T>>` format
- The Master Data main page layout (grid of 10 cards with icons, names, descriptions) must render identically — only `href` values change
- Backend API endpoints at `/api/v1/master/*` must receive no modifications
- Existing services barrel export (`services/index.ts`) must continue to export patients, orders, lab, dashboard, users services

**Scope:**
All inputs that do NOT involve master data entity navigation, data fetching, or rendering should be completely unaffected by this fix. This includes:
- Mouse clicks on non-master-data navigation items
- All patient registration, order creation, and lab workflow flows
- Dashboard summary data fetching
- User management CRUD operations
- Settings page functionality

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

1. **Hardcoded href Values**: All 10 entries in the `masterDataItems` array in `apps/web/src/app/dashboard/master-data/page.tsx` have `href: "/dashboard/settings"` — likely a placeholder from initial scaffolding that was never updated.

2. **Missing Service Layer**: No `services/master-data.ts` file exists. The `services/index.ts` barrel only exports patients, orders, lab, dashboard, and users. Without TanStack Query hooks, sub-pages have no mechanism to fetch or mutate data.

3. **Missing Sub-Pages**: No Next.js App Router pages exist under `app/dashboard/master-data/[slug]/` — there are no route segments for individual entity CRUD views.

4. **Response Unwrapping Omission**: Any prototype code that does render data likely passes the raw API response to `.map()` without extracting the `.data` array property first. The backend returns `{ data: [...], meta: {...} }` (for reference master endpoints) or `ApiResponse<PaginatedResponse<T>>` (for endpoints using the `apiClient` wrapper), and the rendering layer must account for this.

## Correctness Properties

Property 1: Bug Condition - Master Data Navigation Routes to Correct Entity Page

_For any_ master data card click where the target entity is one of the 10 defined entities, the fixed `masterDataItems` array SHALL contain an `href` value equal to `/dashboard/master-data/{entity-slug}`, causing the browser to navigate to the entity-specific CRUD page.

**Validates: Requirements 2.1**

Property 2: Bug Condition - TanStack Query Hooks Fetch and Unwrap Data Correctly

_For any_ master data entity page that calls its corresponding `useQuery` hook, the hook SHALL call the correct `/api/v1/master/{endpoint}` URL and the consuming component SHALL extract the `.data` array from the paginated response before passing it to `.map()` for rendering, preventing runtime type errors.

**Validates: Requirements 2.2, 2.3**

Property 3: Bug Condition - Mutation Hooks Perform CRUD and Invalidate Cache

_For any_ create, update, or delete action on a master data entity, the corresponding `useMutation` hook SHALL call the appropriate backend endpoint (POST/PUT/DELETE) and invalidate the relevant query cache on success, causing the list to refresh.

**Validates: Requirements 2.4**

Property 4: Preservation - Non-Master-Data Functionality Unchanged

_For any_ interaction that does NOT involve master data entity navigation, fetching, or rendering (patients, orders, lab, dashboard, settings, users), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `apps/web/src/app/dashboard/master-data/page.tsx`

**Change**: Fix all 10 card `href` values

| Card | Current `href` | Fixed `href` |
|------|---------------|--------------|
| Kategori Pemeriksaan | `/dashboard/settings` | `/dashboard/master-data/kategori-pemeriksaan` |
| Pemeriksaan Lab | `/dashboard/settings` | `/dashboard/master-data/pemeriksaan-lab` |
| Panel | `/dashboard/settings` | `/dashboard/master-data/panel` |
| Dokter | `/dashboard/settings` | `/dashboard/master-data/dokter` |
| Klinik | `/dashboard/settings` | `/dashboard/master-data/klinik` |
| Asuransi | `/dashboard/settings` | `/dashboard/master-data/asuransi` |
| Alat | `/dashboard/settings` | `/dashboard/master-data/alat` |
| Reagen | `/dashboard/settings` | `/dashboard/master-data/reagen` |
| Satuan | `/dashboard/settings` | `/dashboard/master-data/satuan` |
| Jenis Sampel | `/dashboard/settings` | `/dashboard/master-data/jenis-sampel` |

---

**File (new)**: `apps/web/src/services/master-data.ts`

**Change**: Create TanStack Query service hooks for all 10 entities

**Pattern** (mirrors `services/patients.ts`):
```typescript
// Query keys per entity
export const masterDataKeys = {
  units: { all: ["master", "units"], lists: () => [..., "list"], list: (params) => [...] },
  sampleTypes: { ... },
  doctors: { ... },
  // ... all 10 entities
};

// useQuery hooks — call apiClient.get() with correct endpoint
export function useMasterUnits(params?) { ... }
export function useMasterSampleTypes(params?) { ... }
// ... all 10

// useMutation hooks — create, update, delete per entity
export function useCreateMasterUnit() { ... }
export function useUpdateMasterUnit() { ... }
export function useDeleteMasterUnit() { ... }
// ... all 10
```

---

**File (new)**: `apps/web/src/services/index.ts` (update barrel)

**Change**: Add `export * from "./master-data"` to the barrel export

---

**File (new)**: `apps/web/src/app/dashboard/master-data/[entity]/page.tsx`

**Change**: Create a dynamic route page that:
1. Reads the `entity` param from the URL
2. Maps slug → hook + config (columns, form fields)
3. Calls the appropriate `useQuery` hook
4. Extracts `.data` from the response (`response.data.data` for ApiResponse-wrapped or `response.data` for direct responses)
5. Renders a shared `<MasterDataTable>` with pagination
6. Provides a `<MasterDataFormModal>` for create/edit operations

---

**File (new)**: `apps/web/src/components/master-data/MasterDataTable.tsx`

**Change**: Reusable data table component that:
- Accepts `columns`, `data[]`, `meta` (pagination), `onEdit`, `onDelete` props
- Renders rows with action buttons
- Handles pagination via `meta.page`, `meta.totalPages`
- Includes search input

---

**File (new)**: `apps/web/src/components/master-data/MasterDataFormModal.tsx`

**Change**: Reusable form modal that:
- Accepts `fields[]` config (name, label, type, required)
- Renders controlled form inputs
- Calls `onSubmit` with form data
- Handles create (empty form) and edit (pre-filled form) modes

---

### Route Structure

```
apps/web/src/app/dashboard/master-data/
├── page.tsx                          ← Card grid (fix hrefs)
└── [entity]/
    └── page.tsx                      ← Dynamic CRUD page
```

### Response Unwrapping Strategy

The backend has two response patterns depending on which controller handles the request:

1. **MasterDataController** (test-categories, tests, panels): Returns `{ data: [...], meta: {...} }` directly (no outer `ApiResponse` wrapper when called via `apiClient.get()`)
2. **ReferenceMasterController** (doctors, clinics, insurances, equipments, reagents, sample-types, units): Returns `{ data: [...], meta: {...} }` directly

Since `apiClient.get<T>()` returns the parsed JSON body directly (no additional wrapping), the response at the hook consumer level is:
```typescript
const { data: response } = useQuery(...); // response = { data: [...], meta: {...} }
const items = response?.data ?? [];       // extract the array
const meta = response?.meta;              // extract pagination
```

This is the consistent unwrapping pattern for all 10 entities.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that verify card hrefs, hook existence, and response unwrapping. Run these on the UNFIXED code to observe failures.

**Test Cases**:
1. **Card Navigation Test**: Assert each of the 10 `masterDataItems[i].href` values matches `/dashboard/master-data/{slug}` — will fail on unfixed code (all show `/dashboard/settings`)
2. **Hook Import Test**: Attempt to import `useMasterUnits` from `@/services` — will fail on unfixed code (module doesn't export it)
3. **Response Unwrapping Test**: Mock API response `{ data: [{id:"1"}], meta: {total:1} }`, render component, assert no TypeError — will fail on unfixed code
4. **Route Existence Test**: Navigate to `/dashboard/master-data/satuan` — will fail on unfixed code (404)

**Expected Counterexamples**:
- All 10 href values return `/dashboard/settings`
- Import of `useMasterUnits` throws `Module not found`
- Calling `.map()` on response object throws `TypeError: response.map is not a function`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL entity IN masterDataEntities DO
  // Navigation check
  ASSERT masterDataItems[entity].href = "/dashboard/master-data/" + entity.slug

  // Hook existence check
  hook := import(useMaster[Entity] from "@/services")
  ASSERT hook IS Function

  // Data unwrapping check
  response := hook({ page: 1, limit: 20 })
  ASSERT Array.isArray(response.data.data)
  items := response.data.data
  ASSERT items.map(renderRow) does NOT throw
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalApp(input) = fixedApp(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many parameter combinations for existing hooks (patients, orders) to verify they still work
- It catches accidental namespace collisions in query keys
- It provides strong guarantees that the barrel export addition doesn't break existing imports

**Test Plan**: Observe behavior on UNFIXED code first for patient/order/lab operations, then write tests capturing that existing behavior continues after fix.

**Test Cases**:
1. **Existing Service Exports Preservation**: Verify all existing exports from `@/services` (usePatients, useOrders, useLabQueue, etc.) remain importable and functional after adding master-data exports
2. **API Client Compatibility**: Verify `apiClient.getDoctors()`, `apiClient.getClinics()`, `apiClient.getInsurances()` still return data in the same format
3. **Non-Master-Data Navigation**: Verify clicking sidebar links to patients, orders, lab, dashboard continues to navigate correctly
4. **Master Data Page Layout**: Verify the card grid renders the same 10 cards with same icons, names, and descriptions (only href changes)

### Unit Tests

- Test that each `masterDataItems` entry has the correct `href` matching its entity slug
- Test each TanStack Query hook calls the correct API endpoint
- Test that response unwrapping extracts `.data` array correctly from paginated responses
- Test that mutation hooks call POST/PUT/DELETE to correct endpoints
- Test that mutation hooks invalidate the correct query keys on success
- Test form modal renders correct fields for each entity type

### Property-Based Tests

- Generate random page/limit/search parameters and verify all 10 query hooks construct valid URLs
- Generate random entity data objects and verify create/update mutations serialize them correctly
- Generate random paginated responses and verify unwrapping always produces an array (never crashes)
- Generate random navigation targets and verify only master-data slugs route to master-data pages

### Integration Tests

- Test full flow: navigate to master data → click "Satuan" card → see list of units → click "Tambah" → fill form → submit → see new item in list
- Test edit flow: click edit on existing item → modal pre-fills → change name → submit → list updates
- Test delete flow: click delete → confirm → item disappears from list
- Test pagination: navigate pages, verify correct data loads
- Test search: type search term, verify filtered results
