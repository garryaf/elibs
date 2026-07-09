# Requirements Document

## Introduction

This document defines the requirements for the Enterprise Registration Workflow feature in eLIS. The workflow replaces the standalone "Daftarkan Pasien" button with a unified search-first flow that prevents duplicate patient creation. The user searches for an existing patient first; if found, they proceed directly to visit creation. If not found, they register a new patient inline, and then proceed to visit creation. This ensures patient uniqueness and streamlines the registration-to-visit flow into a single entry point.

## Glossary

- **Patient_Search_Service**: The backend service responsible for querying patients by MRN, NIK, name, phone, or email.
- **Patient_Registration_Service**: The backend service responsible for creating a new patient record and generating a unique MRN.
- **Visit_Creation_Service**: The backend service responsible for creating a visit record linked to an existing patient.
- **Registration_Workflow_UI**: The frontend unified workflow interface that guides the user through patient search, optional patient registration, and visit creation.
- **MRN**: Medical Record Number — a system-generated unique identifier for each patient.
- **NIK**: Nomor Induk Kependudukan — a 16-digit Indonesian national identity number, unique per patient.
- **Visit**: A patient encounter at the laboratory, linked to a payment method.
- **Payment_Method**: The method of payment for a visit (CASH, BPJS, or INSURANCE).

## Requirements

### Requirement 1: Enhanced Patient Search

**User Story:** As a registration staff member, I want to search for patients by MRN, NIK, name, phone, or email, so that I can quickly find existing patients before creating a visit.

#### Acceptance Criteria

1. WHEN a search query of 2 or more characters and no longer than 100 characters is submitted, THE Patient_Search_Service SHALL return patients matching the query against MRN, NIK, name, phone, or email fields, returning at most 50 matching records sorted by relevance with each record including at minimum: patient ID, MRN, NIK, name, date of birth, gender, phone, and email.
2. WHEN the search query is evaluated against the MRN field, THE Patient_Search_Service SHALL perform a case-insensitive partial match (substring match at any position within the MRN value).
3. WHEN the search query is evaluated against the NIK field, THE Patient_Search_Service SHALL perform an exact-prefix match, requiring the query to consist of digits only and to match the leading characters of the 16-digit NIK.
4. WHEN the search query is evaluated against the name field, THE Patient_Search_Service SHALL perform a case-insensitive partial match (substring match at any position within the name value).
5. WHEN the search query is evaluated against the phone field, THE Patient_Search_Service SHALL perform a partial match (substring match at any position within the stored phone value, without format normalization).
6. WHEN the search query is evaluated against the email field, THE Patient_Search_Service SHALL perform a case-insensitive partial match (substring match at any position within the email value).
7. WHEN the search query is fewer than 2 characters, THE Patient_Search_Service SHALL return an empty result set without executing a database query.
8. IF no patients match the search query across any of the searchable fields, THEN THE Patient_Search_Service SHALL return an empty result set with a total count of 0.
9. THE Patient_Search_Service SHALL only return patients that have not been soft-deleted (deletedAt is null).

### Requirement 2: Unified Workflow Entry Point

**User Story:** As a registration staff member, I want a single entry point that combines patient lookup and visit creation, so that I do not need to navigate between separate pages.

#### Acceptance Criteria

1. WHEN the unified workflow page is loaded, THE Registration_Workflow_UI SHALL present the patient search step as the active step and SHALL NOT allow access to the patient registration or visit creation steps until a search has been executed.
2. THE Registration_Workflow_UI SHALL replace the standalone "Daftarkan Pasien" button on the patients page with a navigation action to the unified workflow page.
3. WHEN the user initiates the workflow, THE Registration_Workflow_UI SHALL display a single search input that accepts MRN, NIK, name, phone, or email, requiring a minimum of 2 characters before triggering a search request.
4. WHEN the user stops typing in the search input for 300 milliseconds (debounce), THE Registration_Workflow_UI SHALL trigger the patient search request to the backend.
5. WHEN search results are returned, THE Registration_Workflow_UI SHALL display each matching patient with at minimum: name, MRN, NIK, and date of birth, limited to a maximum of 20 results per query.

### Requirement 3: Existing Patient Selection and Visit Creation

**User Story:** As a registration staff member, I want to select a found patient and immediately create a visit, so that I can complete registration quickly for returning patients.

#### Acceptance Criteria

1. WHEN a patient is found in search results, THE Registration_Workflow_UI SHALL display each matching patient as a selectable item showing at minimum the patient name and MRN.
2. WHEN the user selects an existing patient, THE Registration_Workflow_UI SHALL proceed to the visit creation form with the selected patient's name, MRN, date of birth, and gender displayed as read-only fields, and SHALL require the user to provide a payment method (CASH, BPJS, or INSURANCE) before submission.
3. WHEN the user submits the visit creation form with valid data, THE Visit_Creation_Service SHALL create a visit record with status REGISTERED, linked to the selected patient ID, and SHALL return the generated visit number in format `VST-YYYYMM-XXXX`.
4. WHEN a visit is created successfully, THE Registration_Workflow_UI SHALL display a confirmation showing the generated visit number and SHALL provide an option to register another visit or navigate to the visit detail.
5. IF the visit creation request fails due to validation errors, THEN THE Registration_Workflow_UI SHALL display error messages inline next to the relevant form fields without clearing the user's existing input.
6. WHILE the visit creation API call is in progress, THE Registration_Workflow_UI SHALL disable the submit button and display a loading indicator to prevent duplicate submissions.
7. IF the visit creation request fails due to a server or network error, THEN THE Registration_Workflow_UI SHALL display an error message indicating the failure and SHALL preserve the form state so the user can retry without re-entering data.

### Requirement 4: Inline Patient Registration

**User Story:** As a registration staff member, I want to register a new patient inline when no existing patient is found, so that I can complete the entire workflow without leaving the page.

#### Acceptance Criteria

1. WHEN no matching patient is found in the search results, THE Registration_Workflow_UI SHALL display an option to register a new patient.
2. WHEN the user chooses to register a new patient, THE Registration_Workflow_UI SHALL display an inline patient registration form containing the following required fields: NIK (16-digit format), patient name (1 to 200 characters), date of birth, and gender; and the following optional fields: phone, email, address, and geographic region selectors.
3. WHEN the user submits the patient registration form with all required fields populated and passing validation (NIK is exactly 16 numeric digits, name is between 1 and 200 characters, date of birth is a valid date not in the future, gender is a valid enum value), THE Patient_Registration_Service SHALL create a new patient record and generate a unique MRN.
4. WHEN patient registration completes successfully, THE Registration_Workflow_UI SHALL automatically proceed to the visit creation form with the newly registered patient's name, MRN, date of birth, and gender displayed as read-only pre-filled fields.
5. IF the submitted NIK already exists in the system, THEN THE Patient_Registration_Service SHALL reject the registration with error code ERR_VALIDATION and the Registration_Workflow_UI SHALL display an error message indicating the NIK is already registered, without clearing the form fields.
6. IF the patient registration form submission fails due to validation errors other than duplicate NIK, THEN THE Registration_Workflow_UI SHALL display the validation error messages inline next to the relevant fields and SHALL preserve all entered form data.
7. WHILE a patient registration submission is in progress, THE Registration_Workflow_UI SHALL disable the submit button and display a loading indicator to prevent duplicate submissions.

### Requirement 5: Duplicate Patient Prevention

**User Story:** As a hospital administrator, I want the system to enforce a search-first workflow, so that duplicate patient records are not created.

#### Acceptance Criteria

1. THE Registration_Workflow_UI SHALL require the user to enter a search query of at least 2 characters and execute a patient search before the patient registration form becomes accessible.
2. WHEN a patient search has been executed and returned zero results, THE Registration_Workflow_UI SHALL display the patient registration form.
3. WHEN a patient search has been executed and returned one or more matching results, THE Registration_Workflow_UI SHALL display the list of matching patients and SHALL NOT display the patient registration form.
4. THE Patient_Registration_Service SHALL validate that the submitted NIK (exactly 16 digits) is unique among active (non-deleted) patient records before creating a new patient record.
5. IF a patient with the same NIK already exists among active records, THEN THE Patient_Registration_Service SHALL return an error with code "ERR_VALIDATION" and message indicating the NIK is already registered.

### Requirement 6: Visit Creation Validation

**User Story:** As a registration staff member, I want the system to validate visit data before creation, so that incomplete or invalid visits are not recorded.

#### Acceptance Criteria

1. THE Visit_Creation_Service SHALL require a patient ID in UUID format that references an existing, non-deleted patient record, and a payment method (CASH, BPJS, or INSURANCE) to create a visit.
2. WHEN the payment method is BPJS, THE Visit_Creation_Service SHALL require a BPJS number consisting of exactly 13 numeric digits.
3. WHEN the payment method is INSURANCE, THE Visit_Creation_Service SHALL require an insurance provider ID that references an existing, active, non-deleted insurance record.
4. IF the referenced patient ID does not exist or the patient record is soft-deleted, THEN THE Visit_Creation_Service SHALL return an error indicating the patient was not found.
5. IF the payment method is BPJS and the BPJS number is missing or not exactly 13 numeric digits, THEN THE Visit_Creation_Service SHALL return a validation error indicating the BPJS number requirement.
6. IF the payment method is INSURANCE and the insurance provider ID is missing or references a non-existent or inactive record, THEN THE Visit_Creation_Service SHALL return a validation error indicating the insurance provider requirement.
7. WHEN a visit is created successfully, THE Visit_Creation_Service SHALL generate a unique visit number in the format VST-YYYYMM-XXXX (where YYYY is the 4-digit year, MM is the 2-digit month, and XXXX is a zero-padded sequential number from 0001 to 9999) and set the initial status to REGISTERED.

### Requirement 7: Workflow Navigation and State Management

**User Story:** As a registration staff member, I want clear navigation between workflow steps, so that I can track my progress and go back if needed.

#### Acceptance Criteria

1. THE Registration_Workflow_UI SHALL display a step indicator showing the current position in the workflow (Search → Register/Select → Visit Creation), with the current step visually distinguished from completed and upcoming steps.
2. WHEN the user is on the visit creation step, THE Registration_Workflow_UI SHALL allow the user to navigate back to the search step, and upon doing so SHALL clear the previously selected patient and reset the visit creation form fields to their default values.
3. WHEN the user completes the search step by selecting or registering a patient, THE Registration_Workflow_UI SHALL advance to the visit creation step and SHALL NOT allow forward navigation until the current step's required selection is made.
4. WHILE a form submission is in progress, THE Registration_Workflow_UI SHALL disable the submit button and display a loading indicator within 200ms of submission start, and SHALL re-enable the submit button once a response is received or after a maximum of 30 seconds (whichever occurs first).
5. IF a network error occurs during any workflow step (connection failure, request timeout after 30 seconds, or server error response with HTTP status 500-599), THEN THE Registration_Workflow_UI SHALL display a dismissible error notification in Indonesian (Bahasa Indonesia) describing the failure, preserve the current form state, and provide a retry action to re-attempt the failed operation.
6. IF the user attempts to navigate away from the visit creation step while form fields contain unsaved data, THEN THE Registration_Workflow_UI SHALL display a confirmation prompt before discarding the data and navigating.
