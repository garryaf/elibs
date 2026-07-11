# Implementation Plan: Settings & Master Data Restructure

## Overview

This plan implements the minimum-safe-change restructure of the eLIS settings and master data pages. It fixes the Region Sync 403 bug, replaces General Settings and Laboratory Settings with config placeholders, adds 3 missing cards to the Master Data hub, extends the `[entity]` dynamic route with tarif and users configs, updates nav descriptions, and adds client-side role guards. Property-based tests validate RBAC and sync resilience.

## Tasks

- [x] 1. Fix Region Sync 403 and add integration tests
  - [x] 1.1 Remove duplicate JwtAuthGuard from RegionController sync method
    - Open `apps/api/src/laboratory/region/region.controller.ts`
    - Change `@UseGuards(JwtAuthGuard, RolesGuard)` on the `syncRegions` method to `@UseGuards(RolesGuard)` — the class-level `@UseGuards(JwtAuthGuard)` already handles authentication
    - Verify no other method in this controller duplicates the pattern
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Write integration tests for region sync authorization
    - Create `apps/api/src/laboratory/region/region.controller.spec.ts`
    - Test POST `/api/v1/regions/sync` with SUPER_ADMIN JWT → expect 200
    - Test POST `/api/v1/regions/sync` with ADMIN JWT → expect 200
    - Test POST `/api/v1/regions/sync` with KASIR JWT → expect 403
    - Test POST `/api/v1/regions/sync` with no token → expect 401
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.3 Write property test for sync endpoint RBAC (Property 1)
    - **Property 1: Sync endpoint rejects all unauthorized roles**
    - Create or extend `apps/api/src/laboratory/region/region.controller.property.spec.ts`
    - Use `fast-check` to generate random roles from Role enum excluding SUPER_ADMIN and ADMIN
    - For each generated role, verify sync endpoint returns 403
    - Minimum 100 iterations
    - **Validates: Requirements 1.4**

- [x] 2. Replace General Settings page with system-config placeholder
  - [x] 2.1 Rewrite General Settings page as placeholder
    - Replace contents of `apps/web/src/app/dashboard/settings/general/page.tsx`
    - Remove all master data tab UI, form modal, CRUD logic, and apiClient imports
    - Render a static page with heading "Konfigurasi Sistem", description "Pengaturan umum konfigurasi sistem aplikasi", and a placeholder message: "Opsi konfigurasi sistem akan tersedia pada rilis mendatang."
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.2 Update Settings layout nav description for "General"
    - In `apps/web/src/app/dashboard/settings/layout.tsx`, change the `description` for the "General" nav item from `"Pengaturan umum & master data"` to `"Konfigurasi sistem umum"`
    - _Requirements: 2.3, 2.4_

- [x] 3. Replace Laboratory Settings page with lab-config placeholder
  - [x] 3.1 Rewrite Laboratory Settings page as placeholder
    - Replace contents of `apps/web/src/app/dashboard/settings/laboratory/page.tsx`
    - Remove all lab master data tab UI, form modal, CRUD logic, and apiClient imports
    - Render a static page with heading "Konfigurasi Laboratorium", description "Pengaturan khusus laboratorium", a placeholder message: "Master data laboratorium telah dipindahkan ke halaman Master Data. Konfigurasi lab spesifik akan tersedia pada rilis mendatang.", and a link to `/dashboard/master-data` labeled "Buka Master Data"
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Verify build and existing tests pass
  - Ensure `tsc --noEmit` completes with zero errors for both `apps/api` and `apps/web`
  - Ensure all existing tests pass, ask the user if questions arise.

- [x] 5. Add missing cards to Master Data hub and extend entity configs
  - [x] 5.1 Add Tarif, Wilayah, and Users cards to Master Data hub page
    - In `apps/web/src/app/dashboard/master-data/page.tsx`, add 3 items to the `masterDataItems` array:
      - `{ name: "Tarif", href: "/dashboard/master-data/tarif", icon: CreditCard, description: "Kelola tarif pemeriksaan" }`
      - `{ name: "Wilayah", href: "/dashboard/master-data/regions", icon: MapPin, description: "Data wilayah Indonesia (provinsi, kabupaten/kota, dll)" }`
      - `{ name: "Users", href: "/dashboard/master-data/users", icon: Users, description: "Kelola pengguna dan peran akses" }`
    - Add `CreditCard`, `MapPin`, `Users` to lucide-react imports
    - Total card count must be 13
    - _Requirements: 4.1, 4.2_

  - [x] 5.2 Add tariff hooks to master-data service
    - In `apps/web/src/services/master-data.ts`, add `useMasterTariffs`, `useCreateMasterTariff`, `useUpdateMasterTariff`, `useDeleteMasterTariff` following the same pattern as other entities
    - Endpoint: `/api/v1/master/tariffs`
    - Query key: `["master-data", "tariffs", "list", {...}]`
    - Export them from the services barrel
    - _Requirements: 4.2, 4.6, 7.4_

  - [x] 5.3 Add tarif entity config to [entity]/page.tsx
    - In `apps/web/src/app/dashboard/master-data/[entity]/page.tsx`, add a `tarif` entry to `entityConfigs`
    - Import the new tariff hooks
    - Define columns: Tes (from `test.name` relation), Harga, Diskon
    - Define formFields: testId, clinicId, insuranceId, price, discount
    - _Requirements: 4.2, 7.1, 7.4_

  - [x] 5.4 Add users entity config to [entity]/page.tsx
    - In `apps/web/src/app/dashboard/master-data/[entity]/page.tsx`, add a `users` entry to `entityConfigs`
    - Import hooks from `@/services/users` (useUsers, useCreateUser, useUpdateUser, useDeleteUser)
    - Define columns: email, name, role, createdAt
    - Define formFields: email (required), name, password, role (required)
    - _Requirements: 4.5, 7.1, 7.4_

- [x] 6. Add client-side role guard for protected pages
  - [x] 6.1 Add role guard to Master Data hub page
    - In `apps/web/src/app/dashboard/master-data/page.tsx`, import `useAuth` and `useRouter`
    - Add a `useEffect` that checks if the user's role is NOT in `["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN"]` and redirects to `/dashboard`
    - Show nothing (return null or loading) until the role check completes
    - _Requirements: 5.1, 5.4_

  - [x] 6.2 Add role guard to General Settings page
    - In the new General Settings placeholder page, import `useAuth` and `useRouter`
    - Add a `useEffect` that checks if the user's role is NOT in `["SUPER_ADMIN", "ADMIN"]` and redirects to `/dashboard`
    - _Requirements: 5.2, 5.5_

- [x] 7. Checkpoint - Full verification
  - Ensure `tsc --noEmit` completes with zero errors for both apps
  - Ensure all existing tests pass
  - Verify the Master Data hub page has exactly 13 cards
  - Ask the user if questions arise.

- [x] 8. Write property-based tests for RBAC and sync resilience
  - [x] 8.1 Write property test for Master Data access by role (Property 3)
    - **Property 3: Master Data access controlled by role**
    - Create `apps/web/src/__tests__/rbac-master-data.property.spec.ts`
    - Use `fast-check` to generate random roles from the full Role enum
    - For each role, render the Sidebar component (or simulate the role check logic) and verify "Master Data" visibility matches the allowed set {SUPER_ADMIN, OWNER, MANAGER, ADMIN}
    - Minimum 100 iterations
    - **Validates: Requirements 5.1, 5.4**

  - [x] 8.2 Write property test for Settings access by role (Property 4)
    - **Property 4: Settings access controlled by role**
    - In the same or adjacent test file `apps/web/src/__tests__/rbac-settings.property.spec.ts`
    - Use `fast-check` to generate random roles from the full Role enum
    - For each role, verify "Pengaturan" visibility matches the allowed set {SUPER_ADMIN, ADMIN}
    - Minimum 100 iterations
    - **Validates: Requirements 5.2, 5.5**

  - [x] 8.3 Write property test for sync resilience (Property 2)
    - **Property 2: Sync continues on partial EMSIFA failure**
    - Create `apps/api/src/laboratory/region/region-sync.property.spec.ts`
    - Use `fast-check` to generate random binary vectors (4 booleans) representing which EMSIFA levels fail
    - For each failure pattern, mock the EMSIFA HTTP calls and verify sync returns 200 with correct error entries for failed levels and non-zero counts for successful levels
    - Minimum 100 iterations
    - **Validates: Requirements 1.6**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass (including new property tests), ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The design explicitly uses TypeScript (Next.js + NestJS), so all code uses TypeScript
- `fast-check` is already installed in both `apps/api` and `apps/web`
- No new API endpoints are created — only existing endpoints are reused
- No database schema changes are required

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "5.2"] },
    { "id": 2, "tasks": ["5.1", "5.3", "5.4"] },
    { "id": 3, "tasks": ["6.1", "6.2"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
