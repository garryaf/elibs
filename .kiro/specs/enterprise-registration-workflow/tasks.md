# Implementation Plan: Enterprise Registration Workflow

## Overview

Implement a unified, search-first registration workflow that combines patient lookup, inline patient registration, and visit creation into a single step-based page at `/dashboard/registration`. The implementation requires one backend change (enhanced patient search in `PatientService.findAll()`) and five new frontend components, plus a navigation update on the patients page. Property-based tests validate search correctness, validation logic, and workflow state machine invariants.

## Tasks

- [x] 1. Backend: Enhance Patient Search
  - [x] 1.1 Modify `PatientService.findAll()` to add phone and email to search OR clause and change NIK to prefix match
    - Open `apps/api/src/laboratory/patient/patient.service.ts`
    - Replace the current `where.OR` block in `findAll()` with the enhanced search logic from the design
    - Add `{ phone: { contains: query.search } }` to the OR conditions
    - Add `{ email: { contains: query.search, mode: 'insensitive' } }` to the OR conditions
    - Change NIK matching from `{ nik: { contains: query.search } }` to a conditional prefix match: only add `{ nik: { startsWith: query.search } }` when the search query consists entirely of digits (`/^\d+$/.test(query.search)`)
    - Keep existing MRN (case-insensitive contains) and name (case-insensitive contains) conditions unchanged
    - Ensure the `deletedAt: null` condition remains as the base WHERE clause
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9_

  - [x] 1.2 Write property tests for patient search correctness
    - **Property 1: Patient search correctness**
    - Create `apps/api/src/laboratory/patient/tests/patient-search.property.spec.ts`
    - Use fast-check to generate random patient arrays (with fields: name, mrn, nik, phone, email, deletedAt) and random search queries of 2+ characters
    - Implement a reference oracle function that filters patients based on the same rules (case-insensitive substring for name/mrn/email, substring for phone, digit-only prefix for NIK)
    - Verify: every patient returned by the service matches at least one field rule, and no non-matching patient appears in results
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

  - [x] 1.3 Write property test for short query guard
    - **Property 2: Short query guard**
    - Add to `apps/api/src/laboratory/patient/tests/patient-search.property.spec.ts`
    - Use fast-check to generate random strings of length 0 or 1
    - Verify: the search function returns an empty result array regardless of the patient dataset
    - **Validates: Requirements 1.7, 2.3**

  - [x] 1.4 Write property test for soft-delete exclusion invariant
    - **Property 3: Soft-delete exclusion invariant**
    - Add to `apps/api/src/laboratory/patient/tests/patient-search.property.spec.ts`
    - Use fast-check to generate patient arrays where some have `deletedAt` set to a non-null Date
    - Verify: for any search query, no soft-deleted patient appears in the results
    - **Validates: Requirements 1.9**

- [x] 2. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Frontend: Workflow Step Indicator and Main Page
  - [x] 3.1 Create `WorkflowStepIndicator` component
    - Create `apps/web/src/components/registration/WorkflowStepIndicator.tsx`
    - Accept props: `currentStep` ('search' | 'register' | 'visit-creation') and `completedSteps` (array of completed step identifiers)
    - Render a horizontal 3-step indicator with labels in Indonesian: "Cari Pasien" → "Daftar Pasien" → "Buat Kunjungan"
    - Visually distinguish the current step (highlighted), completed steps (checkmark), and upcoming steps (dimmed)
    - Use Tailwind CSS following the existing project style (rounded-xl, slate colors, `#6B8E6B` accent)
    - Ensure accessibility: use `aria-current="step"` on the active step
    - _Requirements: 7.1_

  - [x] 3.2 Create `RegistrationWorkflowPage` main orchestrator
    - Create `apps/web/src/app/dashboard/registration/page.tsx` as a "use client" page
    - Implement `WorkflowState` interface with fields: `currentStep`, `searchQuery`, `searchResults`, `searchExecuted`, `selectedPatient`, `createdVisit`, `isSubmitting`, `error`
    - Initialize state with `currentStep: 'search'`, `searchExecuted: false`, `selectedPatient: null`
    - Render `WorkflowStepIndicator` at the top
    - Conditionally render the active step component based on `currentStep`:
      - 'search' → PatientSearchStep
      - 'register' → PatientRegistrationStep
      - 'visit-creation' → VisitCreationStep
    - Implement state transition handlers: `handlePatientSelected`, `handleRegisterNew`, `handlePatientRegistered`, `handleVisitCreated`, `handleBack`
    - On "back" from visit-creation: reset `selectedPatient` to null, clear form state, return to 'search'
    - On success: show confirmation with visit number and options to register another or view detail
    - _Requirements: 2.1, 7.1, 7.2, 7.3_

- [x] 4. Frontend: Patient Search Step
  - [x] 4.1 Create `PatientSearchStep` component
    - Create `apps/web/src/components/registration/PatientSearchStep.tsx`
    - Accept props: `onPatientSelected` callback, `onRegisterNew` callback
    - Render a search input with placeholder "Cari pasien berdasarkan nama, NIK, MRN, telepon, atau email (min. 2 karakter)..."
    - Implement 300ms debounce before triggering search API call
    - Enforce minimum 2 characters before searching; show helpful message for shorter input
    - Call `apiClient.getPatients({ search, limit: 20 })` for the search
    - Display results as a card list (not dropdown), showing: name, MRN, NIK, date of birth, gender, phone
    - Limit display to 20 results per query
    - Each result is a selectable card — clicking calls `onPatientSelected(patient)`
    - When search returns 0 results and `searchExecuted` is true: show a "Daftar Pasien Baru" button that calls `onRegisterNew()`
    - Do NOT show the register button when results exist
    - Show loading spinner during API call
    - Handle network errors with a dismissible error notification in Indonesian
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 3.1, 5.1, 5.2, 5.3_

- [x] 5. Frontend: Patient Registration Step
  - [x] 5.1 Create `PatientRegistrationStep` component
    - Create `apps/web/src/components/registration/PatientRegistrationStep.tsx`
    - Accept props: `onPatientRegistered` callback (receives new patient data), `onBack` callback
    - Render inline patient registration form with required fields: NIK (16-digit, masked input), name (1–200 chars), date of birth (date picker, not future), gender (MALE/FEMALE selection)
    - Render optional fields: phone, email, address, geographic region selectors (reuse existing region selector pattern from PatientFormModal)
    - Implement client-side validation: NIK exactly 16 numeric digits, name 1–200 chars, DOB not in the future, gender is valid enum
    - On submit: call `apiClient.createPatient(payload)` with the form data
    - On success: call `onPatientRegistered(newPatient)` with the created patient data (id, mrn, name, dateOfBirth, gender)
    - On NIK duplicate error (ERR_VALIDATION, "NIK already registered"): show inline error on NIK field without clearing form
    - On other validation errors: show inline error messages next to relevant fields, preserve form data
    - Disable submit button and show loading indicator during API call
    - Provide a "Kembali" (back) button that calls `onBack()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.4, 5.5_

- [x] 6. Frontend: Visit Creation Step
  - [x] 6.1 Create `VisitCreationStep` component
    - Create `apps/web/src/components/registration/VisitCreationStep.tsx`
    - Accept props: `patient` (selected patient data), `onVisitCreated` callback, `onBack` callback
    - Display selected patient info as read-only header section: name, MRN, date of birth, gender
    - Render payment method selection (CASH, BPJS, INSURANCE) as required field — reuse the button-style selection pattern from `visits/new/page.tsx`
    - Conditionally render BPJS number input (13-digit validation) when BPJS is selected
    - Conditionally render insurance provider searchable dropdown when INSURANCE is selected
    - Render optional doctor and clinic searchable dropdowns (reuse `SearchableDropdown` component and fetch functions from visit page)
    - Implement form validation: payment method required, BPJS number 13 digits if BPJS, insurance provider required if INSURANCE
    - On submit: call `apiClient.createVisit(payload)` with patientId from prop, selected payment method, and optional fields
    - On success: call `onVisitCreated({ id, visitNumber })`
    - On validation errors: show inline errors next to fields without clearing input
    - On network/server errors: show dismissible error notification in Indonesian, preserve form state, provide retry
    - Disable submit button and show loading indicator during API call
    - Provide a "Kembali ke Pencarian" (back) button that calls `onBack()`
    - Implement unsaved data confirmation: if form has data and user clicks back, show confirmation dialog before discarding
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.2, 7.4, 7.5, 7.6_

- [x] 7. Checkpoint - Frontend workflow components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration: Navigation Update and Wiring
  - [x] 8.1 Update patients page "Daftarkan Pasien" button to navigate to unified workflow
    - Open `apps/web/src/app/dashboard/patients/page.tsx`
    - Import `useRouter` from `next/navigation` (already imported in the page)
    - Change the "Daftarkan Pasien" button's `onClick` handler from `handleOpenAdd` to navigate to `/dashboard/registration`
    - Use `router.push('/dashboard/registration')` instead of opening the modal
    - Keep the existing PatientFormModal for editing patients (edit flow unchanged)
    - _Requirements: 2.2_

- [x] 9. Frontend Property Tests
  - [x] 9.1 Write property test for BPJS number validation
    - **Property 5: BPJS number validation**
    - Create `apps/web/src/components/registration/__tests__/workflow-state.spec.ts`
    - Use fast-check to generate arbitrary strings
    - Implement the BPJS validation function (accepts if and only if string is exactly 13 numeric digits)
    - Verify: validation passes iff string matches `/^\d{13}$/`, and fails for all other strings
    - **Validates: Requirements 6.2, 6.5**

  - [x] 9.2 Write property test for visit number format
    - **Property 6: Visit number format and initial status**
    - Add to `apps/web/src/components/registration/__tests__/workflow-state.spec.ts`
    - Use fast-check to generate valid year (2020-2099), month (1-12), sequence (1-9999) values
    - Format into visit number string using the `VST-YYYYMM-XXXX` pattern
    - Verify: all generated visit numbers match the regex `/^VST-\d{6}-\d{4}$/`
    - **Validates: Requirements 6.7**

  - [x] 9.3 Write property test for workflow state machine transitions
    - **Property 7: Workflow state machine transitions**
    - Add to `apps/web/src/components/registration/__tests__/workflow-state.spec.ts`
    - Use fast-check to generate random sequences of workflow actions (search, selectPatient, registerPatient, createVisit, goBack)
    - Implement a pure state reducer function that applies transitions
    - Verify invariants after every transition:
      - Registration form is only accessible when `searchExecuted === true` AND `searchResults.length === 0`
      - Advancing to visit-creation only occurs when `selectedPatient !== null`
      - Navigating back from visit-creation results in `selectedPatient === null` and form fields reset
    - **Validates: Requirements 5.1, 7.2, 7.3**

- [x] 10. Final Checkpoint - All tasks complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the 7 correctness properties defined in the design document
- The backend change is minimal — only modifying the search OR clause in `PatientService.findAll()`
- No database schema changes are needed; all models and tables already exist
- The frontend reuses existing components and patterns: `SearchableDropdown`, `PatientSearch` logic, payment method UI from `visits/new/page.tsx`
- All error messages in the UI should be in Indonesian (Bahasa Indonesia) following existing patterns
- The `apiClient` already has methods for `getPatients`, `createPatient`, and `createVisit`
- fast-check is already available in the project dependencies

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "3.2"] },
    { "id": 2, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["8.1", "9.1", "9.2", "9.3"] }
  ]
}
```

---

## Post-Refactoring Note (Patient Registration Refactor)

> **Date:** July 2026
> **Related spec:** `.kiro/specs/patient-registration-refactor/`

The standalone visit creation page at `/dashboard/visits/new` has been **removed** and replaced with a server-side redirect (HTTP 308) to `/dashboard/registration`. All patient registration and visit creation paths now flow exclusively through the unified Enterprise Registration Workflow at `/dashboard/registration`.

**Key changes:**
- `/dashboard/visits/new` → permanent redirect to `/dashboard/registration`
- All "Registrasi Kunjungan" and "Daftarkan Pasien" buttons across the application now navigate to `/dashboard/registration`
- `PatientFormModal` on the patients page is restricted to **edit-only** mode — it can no longer create new patients
- The `PatientSearch` component (`apps/web/src/components/visits/PatientSearch.tsx`) has been removed as dead code
- The `PatientOption` type has been extracted to `apps/web/src/types/visit.ts`

**Important:** Patient creation is **not possible** outside the search-first workflow. This is by design to enforce deduplication and prevent duplicate patient records. All new patient registrations must go through the 3-step search-first wizard (Cari Pasien → Daftar Pasien → Buat Kunjungan) at `/dashboard/registration`.
