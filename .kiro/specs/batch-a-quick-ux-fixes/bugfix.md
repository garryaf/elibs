# Bugfix Requirements Document

## Introduction

This spec covers Batch A "Quick UX Fixes" from the Remediation Task Mapping — three XS-effort NCR items that address silent error handling and missing debounce in the frontend. These bugs degrade user experience by providing no feedback on failures (NCR-05-04, NCR-03-08) and by causing excessive API calls on keystroke (NCR-05-09).

**Note on NCR-05-09:** Code inspection reveals the `SearchableDropdown` component already implements a 300ms debounce via `debouncedQuery` state. This NCR may have been resolved in a prior commit. The requirement is retained to confirm coverage and add a regression-prevention clause.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the visits list API call (`apiClient.getVisits`) fails (network error, 5xx, timeout) THEN the system silently sets the visits array to empty and shows the "no data" empty state, providing no indication that an error occurred

1.2 WHEN updating a patient via the edit form fails (network error, validation error, 5xx) THEN the system catches the error with an empty handler and provides no toast, banner, or other feedback to the user

1.3 WHEN a user types rapidly in the SearchableDropdown component without debounce THEN the system fires an API call on every keystroke, causing excessive network requests and potential UI jank

### Expected Behavior (Correct)

2.1 WHEN the visits list API call fails THEN the system SHALL display a visible error banner/alert on the visits page indicating that data could not be loaded, and SHALL offer a retry mechanism

2.2 WHEN updating a patient fails THEN the system SHALL display an error toast or inline error message indicating the update was unsuccessful, including the error reason when available

2.3 WHEN a user types in the SearchableDropdown component THEN the system SHALL debounce the search input by 300ms before triggering an API call, preventing excessive requests

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the visits list API call succeeds THEN the system SHALL CONTINUE TO render the visits table with correct data, pagination, and filtering as before

3.2 WHEN updating a patient succeeds THEN the system SHALL CONTINUE TO refresh the patient list and close/reset the edit form as before

3.3 WHEN the SearchableDropdown receives results after debounced fetch THEN the system SHALL CONTINUE TO display the dropdown options list with correct data and selection behavior

3.4 WHEN the visits page is loading THEN the system SHALL CONTINUE TO show the loading skeleton/spinner as before

3.5 WHEN no visits match the current filters THEN the system SHALL CONTINUE TO show the empty state (distinct from an error state)
