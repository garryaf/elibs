# Implementation Plan: NCR Visits & Patient Remediation

## Overview

This plan implements three deferred NCR findings: NCR-05-08 (RBAC UI gate for Visits page), NCR-05-12 (contextual row actions on Visits table), and NCR-03-10 (patient lab history display). Implementation follows established patterns from the existing codebase — sidebar role filtering, `useAuth()` page-level guards, and the `ActionMenu` dropdown component.

**Language:** TypeScript (NestJS + Next.js)
**Testing:** Jest + fast-check for property-based tests

## Tasks

- [ ] 1. NCR-05-08 — RBAC UI Gate for Visits Page
  - [-] 1.1 Add "Kunjungan" menu item to sidebar with role-based visibility
    - Add to `UTAMA` menu group in `apps/web/src/components/layout/sidebar.tsx` after "Pasien"
    - Use `Calendar` icon from lucide-react
    - Set roles array: `["SUPER_ADMIN", "OWNER", "MANAGER", "ADMIN", "KASIR", "CS", "KLINIK_PARTNER"]`
    - Href: `/dashboard/visits`
    - Existing `isItemVisible()` filter handles role filtering — no logic changes needed
    - _Requirements: 1.3_
  - [-] 1.2 Add page-level RBAC gate to visits page
    - Modify `apps/web/src/app/dashboard/visits/page.tsx`
    - Import `useAuth` from `@/lib/auth-context` and `useRouter` from `next/navigation`
    - Add `AUTHORIZED_VISIT_ROLES` constant: `["KASIR", "CS", "ADMIN", "KLINIK_PARTNER", "SUPER_ADMIN", "OWNER", "MANAGER"]`
    - When `isLoading` is true, render a loading indicator (spinner or skeleton)
    - When user role is NOT in `AUTHORIZED_VISIT_ROLES`, call `router.replace("/dashboard")` and return null
    - When user role IS in `AUTHORIZED_VISIT_ROLES`, render page content normally
    - Session expiry handled by existing auth context (redirects to login)
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - [~] 1.3 Write property-based test for RBAC visits page visibility
    - Create `apps/web/src/__tests__/rbac-visits.property.spec.ts`
    - Follow pattern from existing `rbac-settings.property.spec.ts`
    - Property: For any role in the system's role enum, visits page access is granted IFF role is in `AUTHORIZED_VISIT_ROLES`
    - Use fast-check `fc.constantFrom(...)` with all Role enum values
    - Assert: authorized roles see content, unauthorized roles get redirected
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. NCR-05-12 — Contextual Row Actions on Visits Table
  - [-] 2.1 Create VisitRowActions component
    - Create `apps/web/src/components/visits/VisitRowActions.tsx`
    - Follow `ActionMenu` pattern from `PatientTable.tsx` (dropdown triggered by MoreVertical icon)
    - Define `EDIT_VISIT_ROLES`: `["KASIR", "CS", "ADMIN", "SUPER_ADMIN"]`
    - Define `CANCEL_VISIT_ROLES`: `["KASIR", "ADMIN", "SUPER_ADMIN"]`
    - Props: `visit`, `userRole`, `onViewDetail`, `onEdit`, `onCancelSuccess`
    - Compute `canEdit`: role ∈ EDIT_VISIT_ROLES AND status ∈ [REGISTERED, IN_PROGRESS]
    - Compute `canCancel`: role ∈ CANCEL_VISIT_ROLES AND status === REGISTERED
    - Always show "Lihat Detail" action (Eye icon)
    - Conditionally show "Edit Kunjungan" (Pencil icon) when `canEdit`
    - Conditionally show "Batalkan Kunjungan" (XCircle icon, destructive style) when `canCancel`
    - For COMPLETED and CANCELLED statuses, only "Lihat Detail" is shown regardless of role
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [-] 2.2 Create CancelVisitDialog component
    - Create `apps/web/src/components/visits/CancelVisitDialog.tsx`
    - Modal dialog with reason text input (required, minimum 10 characters)
    - Display visit number and patient name for confirmation context
    - Submit button calls `POST /api/v1/visits/:id/cancel` with `{ reason }` body
    - Show loading state during API call (disable submit button)
    - On success: close dialog, trigger `onCancelSuccess` callback
    - On failure: display error message from API response within the dialog
    - _Requirements: 2.6, 2.7, 2.9_
  - [~] 2.3 Integrate VisitRowActions into visits page table
    - Modify `apps/web/src/app/dashboard/visits/page.tsx`
    - Replace existing simple "Detail" link in the action column with `<VisitRowActions />`
    - Pass `user.role` from `useAuth()` as `userRole` prop
    - Wire `onViewDetail` handler to navigate to visit detail page
    - Wire `onEdit` handler to navigate to visit edit page
    - Wire `onCancelSuccess` to call `loadVisits()` for data refresh
    - _Requirements: 2.8_
  - [~] 2.4 Write property-based test for visit row action visibility
    - Create `apps/web/src/__tests__/visit-row-actions.property.spec.ts`
    - Use fast-check to generate arbitrary (status, role) pairs from all enum values
    - Property: For any (status, role) combination, the set of visible actions matches the visibility matrix exactly
    - Verify: COMPLETED/CANCELLED always yield only "Lihat Detail"
    - Verify: Edit appears IFF (status ∈ [REGISTERED, IN_PROGRESS] AND role ∈ EDIT_VISIT_ROLES)
    - Verify: Cancel appears IFF (status === REGISTERED AND role ∈ CANCEL_VISIT_ROLES)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. NCR-03-10 — Patient Lab History Display
  - [-] 3.1 Create LabHistoryQueryDto and add lab-history endpoint to PatientController
    - Create `apps/api/src/laboratory/patient/dto/lab-history-query.dto.ts`
    - Fields: `page` (optional, default 1, min 1), `limit` (optional, default 10, min 1, max 50)
    - Use `@IsOptional()`, `@Type(() => Number)`, `@Min()`, `@Max()` decorators
    - Add `GET :id/lab-history` route to `PatientController`
    - Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(...)` with all `Lab_History_Roles`
    - Use `@Param('id', ParseUUIDPipe)` for path param validation
    - _Requirements: 3.7, 3.8, 3.9_
  - [~] 3.2 Implement getLabHistory service method
    - Add `getLabHistory(patientId: string, query: LabHistoryQueryDto)` to `apps/api/src/laboratory/patient/patient.service.ts`
    - Verify patient exists via `prisma.patient.findUnique()` — throw `NotFoundException` if not found
    - Query `prisma.order.findMany()` with `where: { patientId }` and includes:
      - `visit: { select: { visitNumber: true } }`
      - `orderDetails: { include: { test: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }`
    - Order by `createdAt: 'desc'`
    - Paginate with `skip: (page - 1) * limit` and `take: limit`
    - Get total count with `prisma.order.count({ where: { patientId } })`
    - Map response: flatten `test.name` into `testName` on each orderDetail
    - Return envelope: `{ success: true, message, data: { items, meta: { page, limit, total, totalPages } } }`
    - _Requirements: 3.7, 3.9_
  - [~] 3.3 Create PatientLabHistory frontend component
    - Create `apps/web/src/components/patients/PatientLabHistory.tsx`
    - Props: `patientId: string`
    - State: `data`, `loading`, `error`, `page`
    - Fetch from `GET /api/v1/patients/:id/lab-history?page=X&limit=10`
    - Loading state: render skeleton/spinner
    - Error state: display error message with "Coba Lagi" (retry) button
    - Empty state: display "Belum ada riwayat laboratorium" message
    - Data state: render order cards showing order number, date, status badge, payment method
    - Each order card shows expandable test results (test name, result value, flag with color coding)
    - Pagination controls at bottom using meta data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [~] 3.4 Integrate PatientLabHistory into patient detail modal
    - Modify `apps/web/src/app/dashboard/patients/page.tsx` (patient detail modal section)
    - Add "Riwayat Laboratorium" section below existing demographics
    - Only render section if user role is in `Lab_History_Roles`
    - Pass selected patient's ID to `<PatientLabHistory patientId={...} />`
    - _Requirements: 3.1_
  - [~] 3.5 Write property-based test for lab history pagination
    - Create `apps/api/src/laboratory/patient/__tests__/lab-history.property.spec.ts`
    - Use fast-check to generate arbitrary `page` (1-100) and `limit` (1-50) values
    - Property 1: For any valid (page, limit) and dataset size, `items.length ≤ limit`
    - Property 2: For any total and limit, `meta.totalPages === Math.ceil(total / limit)`
    - Property 3: Items are ordered by `createdAt` descending (each item's date ≥ next item's date)
    - Mock Prisma to return generated datasets
    - _Requirements: 3.9_

- [ ] 4. Checkpoint — Verification and Documentation
  - [~] 4.1 Run TypeScript compilation check
    - Run `npx tsc --noEmit` in `apps/api/`
    - Run `npx tsc --noEmit` in `apps/web/`
    - Fix any type errors introduced by new code
    - Ensure no broken imports from new components
  - [~] 4.2 Run existing test suite
    - Run `npm run test` in `apps/api/` — verify no regressions
    - Run the new property-based tests and ensure they pass
    - Fix any failing tests
  - [~] 4.3 Update Remediation-Task-Mapping.md
    - Update NCR-05-08 entry status from `🆕 OPEN` to `✅ RESOLVED`
    - Update NCR-05-12 entry status from `🆕 OPEN` to `✅ RESOLVED`
    - Update NCR-03-10 entry status from `🆕 OPEN` to `✅ RESOLVED`
    - Add resolution notes referencing this spec: `.kiro/specs/ncr-visits-patient-remediation/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2"] },
    { "id": 1, "tasks": ["1.3", "2.3", "2.4", "3.3", "3.5"] },
    { "id": 2, "tasks": ["3.4"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] }
  ]
}
```

**Parallel Tracks:**
- **Track A (RBAC Gate):** Tasks 1.1, 1.2 → 1.3
- **Track B (Row Actions):** Tasks 2.1, 2.2 → 2.3, 2.4
- **Track C (Lab History Backend):** Tasks 3.1, 3.2 → 3.5
- **Track D (Lab History Frontend):** Task 3.3 → 3.4 (depends on 3.1/3.2 for API contract)
- **Checkpoint:** Task 4 (after all tracks complete)

## Notes

- All implementations reuse established patterns — no new libraries or architectural changes needed
- The cancel visit endpoint (`POST /api/v1/visits/:id/cancel`) already exists in the backend — only frontend integration is needed
- Property-based tests use fast-check and follow patterns from existing `rbac-settings.property.spec.ts`
- Sidebar role filtering uses existing `isItemVisible()` function — only data changes needed
- Session expiry handling is already managed by the auth context globally
