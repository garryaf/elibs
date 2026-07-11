# Batch A Quick UX Fixes — Bugfix Design

## Overview

This design addresses three XS-effort UX bugs where error states are silently swallowed, leaving users without feedback when operations fail. The fix adds visible error banners/toasts following existing project patterns (dashboard error banner with retry, inline dismissible error toast). A third item (NCR-05-09) is already implemented but retained as a regression-prevention clause.

## Glossary

- **Bug_Condition (C)**: API call failure in either the visits list fetch or patient update operation, resulting in no user-visible feedback
- **Property (P)**: When an API call fails, the user SHALL see an error message (banner or toast) indicating failure, with contextual actions (retry or dismiss)
- **Preservation**: Successful API calls, loading states, empty states, pagination, filtering, and SearchableDropdown debounce behavior must remain unchanged
- **`loadVisits`**: The async function in `apps/web/src/app/dashboard/visits/page.tsx` that fetches paginated visit data from the API
- **`handleSubmit`**: The async function in `apps/web/src/app/dashboard/patients/page.tsx` that persists patient edits via `apiClient.updatePatient`
- **`SearchableDropdown`**: The component in `apps/web/src/components/visits/SearchableDropdown.tsx` that provides a searchable dropdown with debounced query

## Bug Details

### Bug Condition

The bugs manifest when API calls fail (network error, 5xx, timeout, validation error) in two distinct flows. The system catches the error but performs no user-visible side effect — no banner, toast, alert, or console warning.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { operation: "loadVisits" | "updatePatient", apiResult: Response }
  OUTPUT: boolean
  
  RETURN input.apiResult.isError = true
         AND userVisibleFeedback(input.operation) = NONE
END FUNCTION
```

### Examples

- **Visits page network error**: User opens `/dashboard/visits`, the backend is unreachable → page shows "Tidak ada kunjungan ditemukan" (empty state) with no indication that a fetch failed. User believes there are simply no visits.
- **Visits page 500**: API returns 500 on `getVisits` → identical empty state shown. No retry option.
- **Patient update validation error**: User edits patient phone number with invalid format, `updatePatient` returns 422 → modal stays open, no feedback, user doesn't know the save failed.
- **Patient update network timeout**: User clicks save, network times out → nothing happens, user may re-submit or abandon without understanding the failure.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `loadVisits` succeeds, the visits table renders with correct data, pagination, filtering, and date range controls exactly as before
- When `handleSubmit` (patient update) succeeds, the patient list refreshes and the modal flow completes as before
- The `SearchableDropdown` 300ms debounce via `debouncedQuery` state continues to function identically
- Loading skeletons/spinners display during pending requests as before
- Empty state ("Tidak ada kunjungan ditemukan") displays when the API returns zero results (distinct from error state)
- Status filter buttons, search debounce, and CSV export on patients page remain unaffected

**Scope:**
All inputs where API calls succeed should be completely unaffected by this fix. This includes:
- Successful GET `/api/v1/visits` responses
- Successful PATCH `/api/v1/patients/:id` responses
- All SearchableDropdown interactions (already debounced)
- Mouse clicks, keyboard navigation, and filter state changes

## Hypothesized Root Cause

Based on code inspection, the root causes are confirmed:

1. **Visits page — missing error state**: In `VisitsPageContent.loadVisits()`, the `catch` block sets `setVisits([])`, `setTotal(0)`, `setTotalPages(1)` but never sets an `error` state variable. There is no `error` state declared, no error UI rendered, and no retry mechanism.

2. **Patients page — empty catch block**: In `PatientsPage.handleSubmit()`, the `catch` block contains only a comment: `// Error silently handled — could add toast later`. No state is set, no UI feedback is produced.

3. **SearchableDropdown — already fixed**: The component implements debounce correctly via `debouncedQuery` state with a 300ms `setTimeout`. The `loadOptions` effect depends on `debouncedQuery` (not `query`), so API calls are already debounced. No code change required — only regression test coverage.

## Correctness Properties

Property 1: Bug Condition — Visits Fetch Error Displays Banner

_For any_ API call to `loadVisits` that throws an error (network failure, HTTP 4xx/5xx, timeout), the visits page SHALL display a visible error banner containing an error message and a retry button, AND SHALL NOT display the "no data" empty state.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Patient Update Error Displays Toast

_For any_ API call to `updatePatient` that throws an error (network failure, HTTP 4xx/5xx, validation error), the patients page SHALL display a visible error toast/banner containing the error reason (when available) or a generic failure message.

**Validates: Requirements 2.2**

Property 3: Preservation — Successful Visits Fetch Unchanged

_For any_ API call to `loadVisits` that succeeds, the visits page SHALL render the visits table with correct data, pagination metadata, and filtering — producing the same result as the original unfixed code.

**Validates: Requirements 3.1, 3.4, 3.5**

Property 4: Preservation — Successful Patient Update Unchanged

_For any_ API call to `updatePatient` that succeeds, the patients page SHALL refresh the patient list and complete the modal flow — producing the same result as the original unfixed code.

**Validates: Requirements 3.2**

Property 5: Preservation — SearchableDropdown Debounce Regression

_For any_ sequence of rapid keystrokes in the SearchableDropdown, the component SHALL fire at most one API call per 300ms debounce window, preserving existing debounce behavior.

**Validates: Requirements 2.3, 3.3**

## Fix Implementation

### Changes Required

**File**: `apps/web/src/app/dashboard/visits/page.tsx`

**Function**: `VisitsPageContent`

**Specific Changes**:
1. **Add error state**: Declare `const [error, setError] = useState<string | null>(null)` in the component
2. **Set error on failure**: In the `catch` block of `loadVisits`, call `setError("Gagal memuat data kunjungan. Silakan coba lagi.")` instead of silently resetting
3. **Clear error on success**: At the start of `loadVisits` or on successful fetch, call `setError(null)`
4. **Render error banner**: Add an error banner (using existing dashboard pattern with `AlertCircle` + retry button) between the toolbar and the table area. When error is set AND visits is empty, show the error banner instead of `EmptyState`
5. **Add retry handler**: Wire the retry button to call `loadVisits()` directly

---

**File**: `apps/web/src/app/dashboard/patients/page.tsx`

**Function**: `handleSubmit`

**Specific Changes**:
1. **Add error state**: Declare `const [updateError, setUpdateError] = useState<string | null>(null)` in the component
2. **Set error on failure**: In the `catch` block of `handleSubmit`, extract error message from the caught error and call `setUpdateError(message)`
3. **Clear error on next submit**: At the start of `handleSubmit`, call `setUpdateError(null)`
4. **Render error toast**: Display a dismissible inline error message (using existing orders page pattern) near the patient form or at the top of the page content
5. **Auto-dismiss**: Optionally auto-dismiss after 8 seconds using a `useEffect` with timeout

---

**File**: `apps/web/src/components/visits/SearchableDropdown.tsx`

**No code changes required.** Debounce is already correctly implemented. Only regression test coverage will be added.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component tests that mock API failures and assert the DOM contains error feedback elements. Run these tests on the UNFIXED code to observe failures and confirm the silent-error behavior.

**Test Cases**:
1. **Visits Fetch Error Test**: Mock `apiClient.getVisits` to reject → assert no element with role `alert` or text "Gagal" exists (will fail on unfixed code — confirms no error banner)
2. **Visits Fetch Error Retry Test**: Mock `apiClient.getVisits` to reject → assert no retry button exists (will fail on unfixed code)
3. **Patient Update Error Test**: Mock `apiClient.updatePatient` to reject → assert no toast/alert appears (will fail on unfixed code)
4. **Patient Update Error Message Test**: Mock `apiClient.updatePatient` to reject with message "Validation failed" → assert that message is not displayed (will fail on unfixed code)

**Expected Counterexamples**:
- No DOM element indicates an error occurred after API failure
- Possible causes: empty catch block, no error state variable, no error UI component rendered

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.operation = "loadVisits" THEN
    result := renderVisitsPage(mockFailedGetVisits)
    ASSERT result.DOM.contains(errorBanner)
    ASSERT result.DOM.contains(retryButton)
    ASSERT NOT result.DOM.contains(emptyState)
  ELSE IF input.operation = "updatePatient" THEN
    result := submitPatientForm(mockFailedUpdate)
    ASSERT result.DOM.contains(errorToast)
    ASSERT result.errorToast.text.includes(errorMessage)
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  IF input.operation = "loadVisits" THEN
    ASSERT renderVisitsPage_fixed(mockSuccessGetVisits) = renderVisitsPage_original(mockSuccessGetVisits)
    ASSERT visitsTable.rows = expectedVisits
    ASSERT pagination.totalPages = expectedPages
  ELSE IF input.operation = "updatePatient" THEN
    ASSERT handleSubmit_fixed(validData) = handleSubmit_original(validData)
    ASSERT patientList.refreshed = true
  ELSE IF input.operation = "searchDropdown" THEN
    ASSERT apiCallCount(rapidKeystrokes, 300ms) <= 1
  END IF
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various success response shapes, various patient data payloads)
- It catches edge cases that manual unit tests might miss (empty arrays, partial responses, edge pagination values)
- It provides strong guarantees that behavior is unchanged for all non-error inputs

**Test Plan**: Observe behavior on UNFIXED code first for successful API calls, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Visits Success Preservation**: Verify that successful `getVisits` responses render the same table rows, pagination, and status badges after fix
2. **Patient Update Success Preservation**: Verify that successful `updatePatient` calls trigger `loadPatients()` refresh and no error state is set
3. **SearchableDropdown Debounce Preservation**: Verify that typing "abc" rapidly results in at most 1 API call within 300ms, and the final call uses the complete query "abc"
4. **Empty State vs Error State Distinction**: Verify that a successful response with zero results still shows the empty state (not error banner)

### Unit Tests

- Test visits page renders error banner with correct message when `getVisits` rejects
- Test visits page retry button clears error and re-invokes `loadVisits`
- Test visits page does NOT show empty state when error is active
- Test patient page renders error toast when `updatePatient` rejects
- Test patient page error toast includes error message from API response
- Test patient page error toast can be dismissed
- Test SearchableDropdown fires exactly one fetch per debounce window

### Property-Based Tests

- Generate random API error types (network, 4xx, 5xx, timeout) and verify error banner/toast always appears for visits/patient pages
- Generate random successful visit response shapes and verify table rendering is identical pre/post fix
- Generate random keystroke sequences with random timing and verify SearchableDropdown never exceeds 1 API call per 300ms window

### Integration Tests

- Test full visits page flow: load → error → retry → success → table renders
- Test full patient edit flow: open modal → fill form → submit fails → error shown → retry → success
- Test that error states clear properly when navigating away and back
- Test that multiple rapid failures don't stack error banners
