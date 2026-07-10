# Implementation Plan: Patient Registration Refactor

## Overview

Consolidate all patient registration and visit creation entry points into the unified workflow at `/dashboard/registration`. This is a frontend-only refactoring: replace the standalone visit page with a server-side redirect, update navigation links, restrict PatientFormModal to edit-only mode, extract shared types, and remove dead code.

## Tasks

- [x] 1. Extract PatientOption type to shared location
  - [x] 1.1 Create `apps/web/src/types/visit.ts` with PatientOption interface
    - Create a new file `apps/web/src/types/visit.ts`
    - Export the `PatientOption` interface with fields: `id: string`, `name: string`, `mrn: string`, `nik: string`, `dateOfBirth: string`, `gender: "MALE" | "FEMALE"`
    - Match the exact shape currently defined in `apps/web/src/components/visits/PatientSearch.tsx`
    - _Requirements: 4.1, 4.4_

  - [x] 1.2 Update imports in registration page and components
    - Open `apps/web/src/app/dashboard/registration/page.tsx`: change `import type { PatientOption } from "@/components/visits/PatientSearch"` to `import type { PatientOption } from "@/types/visit"`
    - Open `apps/web/src/components/registration/PatientSearchStep.tsx`: change `import type { PatientOption } from "@/components/visits/PatientSearch"` to `import type { PatientOption } from "@/types/visit"`
    - Open `apps/web/src/components/registration/PatientRegistrationStep.tsx`: change `import type { PatientOption } from "@/components/visits/PatientSearch"` to `import type { PatientOption } from "@/types/visit"`
    - Open `apps/web/src/components/registration/VisitCreationStep.tsx`: change `import type { PatientOption } from "@/components/visits/PatientSearch"` to `import type { PatientOption } from "@/types/visit"`
    - _Requirements: 4.1, 4.4_

- [x] 2. Replace visits/new page with server-side redirect
  - [x] 2.1 Replace `apps/web/src/app/dashboard/visits/new/page.tsx` with redirect
    - Remove `"use client"` directive and all existing page content
    - Replace with a server component that imports `redirect` from `next/navigation`
    - Call `redirect("/dashboard/registration")` — this produces a 308 permanent redirect with no client-side flash
    - The entire file content becomes: `import { redirect } from "next/navigation"; export default function NewVisitPage() { redirect("/dashboard/registration"); }`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Update visits page navigation links to `/dashboard/registration`
    - Open `apps/web/src/app/dashboard/visits/page.tsx`
    - In the page header section, change the `<Link href="/dashboard/visits/new" ...>` to `href="/dashboard/registration"`
    - In the `EmptyState` component, change the `<Link href="/dashboard/visits/new" ...>` to `href="/dashboard/registration"`
    - Both buttons are labeled "Registrasi Kunjungan" and should point to the unified workflow
    - _Requirements: 1.4, 1.5, 3.4_

- [x] 3. Restrict PatientFormModal to edit-only mode
  - [x] 3.1 Add edit-only guard to PatientFormModal
    - Open `apps/web/src/components/patients/PatientFormModal.tsx`
    - Add a guard at the top of the component body: if `editData` is null or undefined, return `null` (don't render)
    - This prevents the modal from ever opening in create mode
    - Keep all existing edit functionality intact
    - _Requirements: 2.1, 2.4, 2.5_

  - [x] 3.2 Remove create branch from patients page handleSubmit
    - Open `apps/web/src/app/dashboard/patients/page.tsx`
    - In the `handleSubmit` function, remove the `else` branch that calls `apiClient.createPatient()`
    - Keep only the `if (editingPatient)` branch that calls `apiClient.updatePatient()`
    - Verify the "Daftarkan Pasien" button already uses `router.push('/dashboard/registration')` (it does)
    - _Requirements: 2.1, 2.3, 3.1_

- [x] 4. Checkpoint - Verify compilation and imports
  - Run `cd apps/web && npx tsc --noEmit` to confirm zero TypeScript errors
  - Ensure all existing tests pass
  - Ask the user if questions arise before proceeding to dead code removal

- [x] 5. Remove dead code
  - [x] 5.1 Delete PatientSearch component
    - Remove `apps/web/src/components/visits/PatientSearch.tsx`
    - This component is no longer imported by any active component after the type extraction (task 1) and the visits/new redirect (task 2)
    - `SearchableDropdown.tsx` is NOT removed — it's still actively used by `VisitCreationStep.tsx`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Verify no broken imports after deletion
    - Run `cd apps/web && npx tsc --noEmit` to confirm zero TypeScript compilation errors
    - Run `cd apps/web && npx next lint` to confirm no unused import warnings
    - If any errors appear, identify and fix the remaining imports
    - _Requirements: 4.4, 4.5, 4.6_

- [x] 6. Final verification and documentation
  - [x] 6.1 Run full test suite
    - Run `cd apps/web && npx jest --passWithNoTests` — existing frontend tests must pass
    - Run `cd apps/api && npx jest` — existing backend tests must pass unchanged
    - TypeScript: `cd apps/web && npx tsc --noEmit`
    - Lint: `cd apps/web && npx next lint`
    - _Requirements: 6.5, 7.6, 7.7_

  - [x] 6.2 Update documentation
    - Update `.kiro/specs/enterprise-registration-workflow/tasks.md` or add a note that the standalone visit page has been removed and all paths now go through `/dashboard/registration`
    - Check `docs/` folder for any references to `/dashboard/visits/new` and update them to `/dashboard/registration`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

## Notes

- This is a frontend-only refactoring. No backend APIs, services, or database schemas are modified.
- `SearchableDropdown` component is NOT removed — it's still actively used by `VisitCreationStep.tsx`.
- The patients page "Daftarkan Pasien" button already navigates to `/dashboard/registration` (verified in current code).
- Property-based testing is not applicable — the changes are routing configuration, static link targets, and conditional rendering guards (not input-varying logic). Verification relies on TypeScript compilation, lint checks, and the existing test suite.
- Each task references specific requirements for traceability.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2"] },
    { "id": 2, "tasks": ["5.1"] },
    { "id": 3, "tasks": ["5.2", "6.1", "6.2"] }
  ]
}
```
