# Implementation Plan

## Overview

Fix three XS-effort UX bugs where error states are silently swallowed: (1) NCR-05-04 — add error banner with retry to the visits page when `getVisits` fails, (2) NCR-03-08 — add dismissible error toast to the patients page when `updatePatient` fails, (3) NCR-05-09 — add regression test for already-implemented SearchableDropdown debounce. Follows the bugfix workflow: exploration test → preservation test → implement → verify.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Silent Error on Visits Fetch and Patient Update Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist (silent error handling)
  - **Scoped PBT Approach**: Scope properties to concrete failing cases — API rejection with network error, 5xx, and validation error
  - Create test file `apps/web/src/app/dashboard/visits/__tests__/visits-error-state.test.tsx`
  - Create test file `apps/web/src/app/dashboard/patients/__tests__/patient-update-error.test.tsx`
  - **Visits page tests:**
    - Mock `apiClient.getVisits` to reject with network error
    - Assert that an element with role `alert` or text "Gagal memuat data kunjungan" exists in the DOM
    - Assert that a retry button exists in the DOM
    - Assert that the empty state ("Tidak ada kunjungan ditemukan") is NOT shown when error is active
    - Use `fast-check` to generate random error types (network error, 4xx, 5xx, timeout message) and verify error banner appears for all
  - **Patient update tests:**
    - Mock `apiClient.updatePatient` to reject with error message "Validation failed"
    - Assert that an error toast/alert with the error message appears in the DOM
    - Use `fast-check` to generate random error messages and verify toast always shows the message
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — proves the bugs exist: no error banner on visits, no error toast on patient update)
  - Document counterexamples: `getVisits` rejection → no `alert` element rendered; `updatePatient` rejection → no toast rendered
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Successful API Calls and SearchableDropdown Debounce Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `apps/web/src/app/dashboard/visits/__tests__/visits-preservation.test.tsx`
  - Create test file `apps/web/src/app/dashboard/patients/__tests__/patient-update-preservation.test.tsx`
  - Create test file `apps/web/src/components/visits/__tests__/SearchableDropdown-debounce.test.tsx`
  - **Observe on UNFIXED code:**
    - `getVisits` success with visits array → table renders rows with correct visit data, pagination shows correct page counts
    - `getVisits` success with empty array → empty state "Tidak ada kunjungan ditemukan" is shown (NOT error state)
    - `updatePatient` success → `loadPatients()` is re-invoked, no error state is set
    - SearchableDropdown rapid typing "abc" → only 1 `fetchOptions` call within 300ms window using final query "abc"
  - **Visits success preservation (property-based):**
    - Use `fast-check` to generate random valid visit response shapes (varying array lengths, status values, payment methods)
    - Assert table renders the correct number of rows matching the response data
    - Assert pagination metadata (page X of Y, total count) matches the mock meta
    - Assert loading skeleton shows during pending state and disappears after resolve
  - **Patient update success preservation:**
    - Use `fast-check` to generate random valid patient form data
    - Assert `loadPatients` is called after successful `updatePatient`
    - Assert no error state/toast is rendered after success
  - **SearchableDropdown debounce preservation:**
    - Use `fast-check` to generate random keystroke sequences with random character counts (1–20 chars)
    - Simulate rapid typing with `jest.useFakeTimers`
    - Assert `fetchOptions` is called at most once per 300ms debounce window
    - Assert the final call uses the complete debounced query string
  - **Empty state vs error state distinction:**
    - Mock `getVisits` returning `{ data: [], meta: { total: 0, page: 1, limit: 20 } }`
    - Assert empty state component renders (text "Tidak ada kunjungan ditemukan")
    - Assert NO error banner/alert is shown
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for silent error handling on visits fetch and patient update

  - [x] 3.1 Implement visits page error state (NCR-05-04)
    - In `apps/web/src/app/dashboard/visits/page.tsx`, in `VisitsPageContent`:
    - Add state: `const [error, setError] = useState<string | null>(null)`
    - In `loadVisits` catch block: call `setError("Gagal memuat data kunjungan. Silakan coba lagi.")` instead of silently resetting
    - At the start of `loadVisits` (before `setLoading(true)`): call `setError(null)` to clear previous errors
    - Add `AlertCircle` to the lucide-react imports
    - Render error banner between toolbar and table: when `error` is set and `!loading`, show a `role="alert"` div with `AlertCircle` icon, error message text, and a "Coba Lagi" retry button that calls `loadVisits()`
    - Update the conditional rendering: `loading ? <LoadingSkeleton /> : error ? <ErrorBanner /> : visits.length === 0 ? <EmptyState /> : <Table />`
    - _Bug_Condition: isBugCondition(input) where input.operation = "loadVisits" AND input.apiResult.isError = true AND userVisibleFeedback = NONE_
    - _Expected_Behavior: Display error banner with message "Gagal memuat data kunjungan. Silakan coba lagi." and retry button_
    - _Preservation: Successful visits fetch renders table, pagination, and filters unchanged (Requirements 3.1, 3.4, 3.5)_
    - _Requirements: 1.1, 2.1, 3.1, 3.4, 3.5_

  - [x] 3.2 Implement patient update error toast (NCR-03-08)
    - In `apps/web/src/app/dashboard/patients/page.tsx`, in `PatientsPage`:
    - Add state: `const [updateError, setUpdateError] = useState<string | null>(null)`
    - In `handleSubmit` catch block: extract error message (`err instanceof Error ? err.message : "Gagal menyimpan data pasien."`) and call `setUpdateError(message)`
    - At the start of `handleSubmit`: call `setUpdateError(null)` to clear previous errors
    - Add auto-dismiss `useEffect`: when `updateError` is set, start an 8-second timeout that calls `setUpdateError(null)`, clean up on unmount
    - Render dismissible error toast: near the top of the page content area (after the page header), when `updateError` is set, show a `role="alert"` div with `AlertCircle` icon, error message, and an "✕" dismiss button that calls `setUpdateError(null)`
    - Add `AlertCircle` to lucide-react imports
    - _Bug_Condition: isBugCondition(input) where input.operation = "updatePatient" AND input.apiResult.isError = true AND userVisibleFeedback = NONE_
    - _Expected_Behavior: Display dismissible error toast with error reason, auto-dismiss after 8s_
    - _Preservation: Successful patient update refreshes list and completes modal flow unchanged (Requirements 3.2)_
    - _Requirements: 1.2, 2.2, 3.2_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Silent Error on Visits Fetch and Patient Update Failure
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (error banner for visits, error toast for patients)
    - Run `npm test -- --testPathPattern="visits-error-state|patient-update-error"` in `apps/web`
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed — error banner and toast now render)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Successful API Calls and SearchableDropdown Debounce Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run `npm test -- --testPathPattern="visits-preservation|patient-update-preservation|SearchableDropdown-debounce"` in `apps/web`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in successful paths, pagination, debounce)
    - Confirm all preservation tests still pass after fix

- [x] 4. Checkpoint — Ensure all tests pass
  - Run full test suite: `npm test` in `apps/web`
  - Verify all exploration tests (Property 1) pass after fix
  - Verify all preservation tests (Property 2) still pass after fix
  - Verify no TypeScript compilation errors: `npx tsc --noEmit` in `apps/web`
  - Ensure all tests pass, ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "3.4"] },
    { "id": 3, "tasks": ["4"] }
  ]
}
```

## Notes

- NCR-05-09 (SearchableDropdown debounce) requires NO code changes — only regression test coverage in task 2
- The visits error banner follows existing dashboard error pattern (AlertCircle icon + action button)
- The patient error toast follows the dismissible inline pattern with 8s auto-dismiss
- Jest + Testing Library + fast-check are already available in `apps/web` devDependencies
- Both pages use `apiClient` from `@/lib/api` — mocking at the module level is sufficient
- The `catch` block in visits currently sets `setVisits([])` silently; the fix adds `setError(...)` alongside
- The `catch` block in patients currently has only a comment; the fix extracts the error message and sets state
