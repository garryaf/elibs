# Requirements Document

## Introduction

The Visit Management module introduces an enterprise encounter/visit layer into eLIS. Every patient visit to the laboratory creates a new Visit record that links an existing Patient to subsequent lab Orders. Visits do NOT create new patients — they reference patients already registered via MRN/NIK identity. The Visit acts as the clinical encounter context, capturing registration date, assigned physician, referring clinic, payment method, and insurance classification (BPJS or private insurance).

The validation flow becomes: **Patient → Visit → Order**, where visits serve as the intermediary between patient identity and laboratory orders, enabling per-encounter billing, physician assignment, and insurance tracking.

## Glossary

- **Visit_Management_System**: The NestJS module responsible for creating, managing, and querying patient visits/encounters
- **Visit**: A single patient encounter at the laboratory, identified by a unique Visit Number
- **Visit_Number**: An auto-generated unique identifier for each visit, format: `VST-YYYYMM-XXXX`
- **Visit_Status**: The workflow state of a visit (REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED)
- **Patient**: An existing registered patient identified by MRN and NIK (managed by Patient module)
- **Doctor**: The physician assigned to or referring the patient for the visit
- **Clinic**: The department or clinic that referred or is associated with the visit
- **Payment_Method**: The method of payment for the visit (CASH, BPJS, INSURANCE)
- **BPJS**: Badan Penyelenggara Jaminan Sosial — Indonesian national health insurance program (JKN/BPJS Kesehatan)
- **Visit_Sequence**: An atomic counter table used for generating sequential visit numbers per month

## Requirements

### Requirement 1: Visit Registration

**User Story:** As a registration staff (KASIR/CS), I want to create a visit for an existing patient, so that the patient's encounter is recorded and linked to subsequent lab orders.

#### Acceptance Criteria

1. WHEN a valid patient ID and payment method (CASH, BPJS, or INSURANCE) are provided, THE Visit_Management_System SHALL create a new Visit record with status REGISTERED containing the patient reference and any optional fields (doctor ID, clinic ID, insurance ID, BPJS number)
2. WHEN a visit is created, THE Visit_Management_System SHALL auto-generate a unique Visit_Number in the format `VST-YYYYMM-XXXX` where YYYY is the year, MM is the month, and XXXX is a zero-padded sequential number ranging from 0001 to 9999
3. WHEN a visit is created, THE Visit_Management_System SHALL record the registration date as the current timestamp
4. IF the provided patient ID does not reference an existing, non-deleted patient, THEN THE Visit_Management_System SHALL return an ERR_NOT_FOUND error and SHALL NOT create a Visit record
5. THE Visit_Management_System SHALL NOT create a new Patient record during visit registration
6. IF a visit is created with a doctor ID that does not reference an existing, active doctor, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the invalid doctor reference and SHALL NOT create a Visit record
7. IF a visit is created with a clinic ID that does not reference an existing, active clinic, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the invalid clinic reference and SHALL NOT create a Visit record
8. IF a visit is created with an insurance ID that does not reference an existing, active insurance, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the invalid insurance reference and SHALL NOT create a Visit record
9. IF the patient ID is missing or the payment method is missing from the request, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the missing required field(s)

### Requirement 2: Visit Number Generation

**User Story:** As a system administrator, I want visit numbers to be unique and sequential, so that visits can be reliably identified and traced.

#### Acceptance Criteria

1. THE Visit_Management_System SHALL generate Visit_Numbers using a SERIALIZABLE transaction to prevent duplicates under concurrent access
2. THE Visit_Management_System SHALL reset the sequential counter at the beginning of each calendar month, starting at 0001
3. THE Visit_Management_System SHALL ensure Visit_Numbers are immutable after creation
4. FOR ALL generated Visit_Numbers, parsing the format `VST-YYYYMM-XXXX` then formatting back SHALL produce the original Visit_Number (round-trip property)
5. IF the monthly sequence reaches 9999 and an additional visit is requested, THEN THE Visit_Management_System SHALL return an ERR_INTERNAL error indicating monthly capacity has been exceeded

### Requirement 3: Visit Status Workflow

**User Story:** As a laboratory staff member, I want visits to follow a defined workflow, so that the encounter lifecycle is tracked and enforced.

#### Acceptance Criteria

1. WHEN a visit is created, THE Visit_Management_System SHALL set the initial status to REGISTERED
2. WHEN an order is created under a visit that is in REGISTERED status, THE Visit_Management_System SHALL transition the visit status to IN_PROGRESS
3. WHEN an order is created under a visit that is already in IN_PROGRESS status, THE Visit_Management_System SHALL keep the visit status as IN_PROGRESS
4. WHEN an order under a visit transitions to a terminal state (NOTIFIED or CANCELLED), THE Visit_Management_System SHALL evaluate whether all orders under that visit have reached a terminal state, and if so, transition the visit status to COMPLETED
5. WHEN a cancellation request with a reason is submitted for a visit with no orders or only PENDING_PAYMENT orders, THE Visit_Management_System SHALL transition the visit status to CANCELLED and record the cancellation reason and timestamp
6. IF a cancellation request is submitted for a visit that has at least one order beyond PENDING_PAYMENT status, THEN THE Visit_Management_System SHALL return an ERR_INVALID_STATE error indicating which orders prevent cancellation
7. IF a status transition is requested that violates the allowed workflow, THEN THE Visit_Management_System SHALL return an ERR_INVALID_STATE error indicating the current status and the set of valid transitions
8. THE Visit_Management_System SHALL enforce the following transitions: REGISTERED → IN_PROGRESS, REGISTERED → CANCELLED, IN_PROGRESS → COMPLETED, IN_PROGRESS → CANCELLED (only if all orders are in PENDING_PAYMENT or no orders exist)

### Requirement 4: Payment Method and Insurance Classification

**User Story:** As a billing staff member, I want to record the payment method and insurance details per visit, so that billing can be processed correctly for each encounter.

#### Acceptance Criteria

1. WHEN a visit is created, THE Visit_Management_System SHALL accept a payment method value of exactly one of: CASH, BPJS, or INSURANCE
2. WHEN the payment method is BPJS, THE Visit_Management_System SHALL require a BPJS membership number consisting of exactly 13 numeric digits (0-9 only, no spaces or separators)
3. WHEN the payment method is INSURANCE, THE Visit_Management_System SHALL require an insurance ID that references an existing Insurance record where isActive is true and deletedAt is null
4. WHEN the payment method is CASH, THE Visit_Management_System SHALL NOT require a BPJS membership number or insurance ID, and SHALL ignore those fields if provided
5. IF the payment method is BPJS and the BPJS membership number is missing, empty, or does not match the 13-numeric-digit format, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the BPJS number is invalid
6. IF the payment method is INSURANCE and the insurance ID is missing, does not reference an existing record, references a deleted record, or references an inactive record, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the insurance reference is invalid
7. IF the payment method value is not one of CASH, BPJS, or INSURANCE, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating an unsupported payment method

### Requirement 5: Visit Query and Search

**User Story:** As a laboratory staff member, I want to search and filter visits, so that I can quickly find patient encounters.

#### Acceptance Criteria

1. WHEN a list request is made, THE Visit_Management_System SHALL return visits with pagination (page, limit, totalPages, total), defaulting to page 1 and limit 20, with a maximum limit of 100 records per page
2. WHEN a search term is provided, THE Visit_Management_System SHALL filter visits by case-insensitive partial match against patient name, patient MRN, or Visit_Number
3. WHEN a status filter is provided, THE Visit_Management_System SHALL return only visits matching the specified Visit_Status (REGISTERED, IN_PROGRESS, COMPLETED, or CANCELLED)
4. WHEN a date range filter is provided, THE Visit_Management_System SHALL return only visits with registration dates within the specified range, inclusive of both the start and end dates
5. WHEN a doctor filter is provided, THE Visit_Management_System SHALL return only visits assigned to the specified doctor
6. WHEN a clinic filter is provided, THE Visit_Management_System SHALL return only visits associated with the specified clinic
7. THE Visit_Management_System SHALL return visit records with the associated patient name, MRN, doctor name, and clinic name, sorted by registration date in descending order by default
8. IF an invalid status value is provided in the status filter, THEN THE Visit_Management_System SHALL return an ERR_VALIDATION error indicating the allowed status values
9. IF no visits match the provided search or filter criteria, THEN THE Visit_Management_System SHALL return an empty data array with total count of 0

### Requirement 6: Visit-Order Linkage

**User Story:** As a registration staff member, I want orders to be linked to visits, so that the encounter context is preserved for billing and reporting.

#### Acceptance Criteria

1. WHEN an order is created, THE Visit_Management_System SHALL require a visit ID that references an existing, non-deleted visit record in REGISTERED or IN_PROGRESS status
2. IF an order references a visit ID that does not exist or references a deleted visit, THEN THE Visit_Management_System SHALL return an ERR_NOT_FOUND error
3. IF an order references a visit that is in CANCELLED or COMPLETED status, THEN THE Visit_Management_System SHALL return an ERR_INVALID_STATE error indicating that orders cannot be added to visits in a terminal state
4. THE Visit_Management_System SHALL allow multiple orders per visit with no system-imposed upper limit
5. WHEN a visit is queried by ID, THE Visit_Management_System SHALL include the list of associated orders with each order's ID, order number, status, and creation timestamp

### Requirement 7: Visit Update

**User Story:** As a registration staff member, I want to update visit details, so that corrections can be made to physician, clinic, or payment information.

#### Acceptance Criteria

1. WHEN valid update data is provided for an existing visit in REGISTERED or IN_PROGRESS status, THE Visit_Management_System SHALL update the mutable fields (doctor, clinic, payment method, insurance, BPJS number)
2. THE Visit_Management_System SHALL NOT allow modification of Visit_Number, patient ID, or registration date regardless of visit status
3. IF the visit is in COMPLETED or CANCELLED status, THEN THE Visit_Management_System SHALL reject updates with an ERR_INVALID_STATE error indicating updates are not allowed for visits in terminal states
4. WHEN payment method is changed, THE Visit_Management_System SHALL re-validate insurance requirements based on the new payment method (applying the same rules as Requirement 4)
5. IF the visit ID does not reference an existing visit, THEN THE Visit_Management_System SHALL return an ERR_NOT_FOUND error

### Requirement 8: Role-Based Access Control

**User Story:** As a system administrator, I want visit operations to be restricted by role, so that only authorized staff can perform specific actions.

#### Acceptance Criteria

1. THE Visit_Management_System SHALL restrict visit creation to users with roles KASIR, CS, ADMIN, KLINIK_PARTNER, or SUPER_ADMIN
2. THE Visit_Management_System SHALL restrict visit updates to users with roles KASIR, CS, ADMIN, or SUPER_ADMIN
3. THE Visit_Management_System SHALL restrict visit cancellation to users with roles KASIR, ADMIN, or SUPER_ADMIN
4. THE Visit_Management_System SHALL allow visit queries (list, get by ID) for all authenticated users
5. THE Visit_Management_System SHALL require a valid, non-expired JWT token on every visit operation request before evaluating role permissions
6. IF an authenticated user attempts a visit operation for which their role is not authorized, THEN THE Visit_Management_System SHALL reject the request with a 403 Forbidden response and SHALL NOT modify any visit data
7. IF a request is received without a valid JWT token or with an expired JWT token, THEN THE Visit_Management_System SHALL reject the request with a 401 Unauthorized response and SHALL NOT process the operation

### Requirement 9: Database Schema

**User Story:** As a developer, I want a well-defined database schema for visits, so that data integrity is enforced at the database level.

#### Acceptance Criteria

1. THE Visit_Management_System SHALL store visits in a `visits` table with a UUID primary key column named `id`, auto-generated using the database default UUID function
2. THE Visit_Management_System SHALL enforce a unique constraint on the `visitNumber` column, where `visitNumber` is a non-nullable String with a maximum length of 50 characters
3. THE Visit_Management_System SHALL enforce a non-nullable foreign key constraint from the `patientId` column in the visits table to the `id` column of the patients table, preventing deletion of a patient record while associated visits exist
4. THE Visit_Management_System SHALL enforce a nullable foreign key constraint from the `doctorId` column in the visits table to the `id` column of the doctors table
5. THE Visit_Management_System SHALL enforce a nullable foreign key constraint from the `clinicId` column in the visits table to the `id` column of the clinics table
6. THE Visit_Management_System SHALL enforce a nullable foreign key constraint from the `insuranceId` column in the visits table to the `id` column of the insurances table
7. THE Visit_Management_System SHALL define a `status` column as a non-nullable enum with the values: REGISTERED, IN_PROGRESS, COMPLETED, and CANCELLED, defaulting to REGISTERED
8. THE Visit_Management_System SHALL include the following columns with specified types: `visitNumber` (String, non-nullable, max 50), `status` (enum, non-nullable), `registrationDate` (DateTime, non-nullable, defaults to now), `patientId` (UUID, non-nullable), `doctorId` (UUID, nullable), `clinicId` (UUID, nullable), `paymentMethod` (PaymentMethod enum, non-nullable), `insuranceId` (UUID, nullable), `bpjsNumber` (String, nullable, max 20), `createdAt` (DateTime, non-nullable, defaults to now), `updatedAt` (DateTime, non-nullable, auto-updated), and `cancelledAt` (DateTime, nullable)
9. THE Visit_Management_System SHALL add a nullable foreign key column named `visitId` (UUID) in the orders table referencing the `id` column of the visits table, preserving existing orders that have no associated visit
10. THE Visit_Management_System SHALL create a database index on the `status` column and a composite index on `patientId` and `registrationDate` in the visits table to support query filtering

### Requirement 10: API Endpoints

**User Story:** As a frontend developer, I want RESTful API endpoints for visit management, so that the UI can interact with visit data.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/v1/visits` with a valid request body, THE Visit_Management_System SHALL create a new visit and return status 201 with the created visit record in the response envelope
2. IF a POST request to `/api/v1/visits` contains invalid or missing required fields, THEN THE Visit_Management_System SHALL return status 400 with field-level validation errors in the error envelope
3. WHEN a GET request is made to `/api/v1/visits`, THE Visit_Management_System SHALL return a paginated list of visits with a default page size of 20, a maximum page size of 100, and pagination metadata including total count, current page, limit, and total pages
4. WHEN a GET request is made to `/api/v1/visits/:id` with a valid existing visit ID, THE Visit_Management_System SHALL return the visit details including associated orders
5. IF a GET, PUT, or POST cancel request references a visit ID that does not exist, THEN THE Visit_Management_System SHALL return status 404 with an error envelope indicating the visit was not found
6. WHEN a PUT request is made to `/api/v1/visits/:id` with a valid request body, THE Visit_Management_System SHALL update the visit and return the updated record in the response envelope
7. IF a cancel request is made for a visit that is not in a cancellable state, THEN THE Visit_Management_System SHALL return status 400 with an error envelope indicating the current state does not allow cancellation
8. WHEN a POST request is made to `/api/v1/visits/:id/cancel` with a reason of at least 1 character, THE Visit_Management_System SHALL cancel the visit, record the reason, and return the updated visit record
9. THE Visit_Management_System SHALL follow the standard response envelope: `{ success, message, data }` for success and `{ success, errorCode, message, errors, traceId }` for errors

### Requirement 11: Frontend Visit Registration

**User Story:** As a registration staff member, I want a visit registration form in the UI, so that I can efficiently register patient visits.

#### Acceptance Criteria

1. WHEN the visit registration page is accessed, THE Visit_Management_System SHALL display a patient search/selection component that searches by MRN, NIK, or name with a debounced input (minimum 300ms delay) and requires at least 2 characters before triggering a search
2. WHEN a patient is selected, THE Visit_Management_System SHALL display the patient summary (name, MRN, date of birth, gender) in the form as a read-only section
3. THE Visit_Management_System SHALL provide form fields for doctor selection (optional, searchable dropdown), clinic selection (optional, searchable dropdown), and payment method selection (required radio or dropdown)
4. WHEN BPJS is selected as payment method, THE Visit_Management_System SHALL display and require the BPJS membership number field with client-side validation for exactly 13 numeric digits
5. WHEN INSURANCE is selected as payment method, THE Visit_Management_System SHALL display and require the insurance provider selection from active insurances
6. WHEN the form is submitted successfully, THE Visit_Management_System SHALL display the generated Visit_Number as confirmation and provide an option to register another visit or navigate to the visit detail page
7. THE Visit_Management_System SHALL provide a visit list page with search, filter by status, filter by date range, and pagination with a default page size of 20
8. WHEN the form submission fails due to validation errors, THE Visit_Management_System SHALL display the error messages inline next to the relevant fields without losing the form state
9. THE Visit_Management_System SHALL disable the submit button and show a loading indicator while the registration API call is in progress to prevent duplicate submissions

### Requirement 12: Audit Trail

**User Story:** As a compliance officer, I want all visit operations to be audited, so that changes are traceable.

#### Acceptance Criteria

1. WHEN a visit is created, THE Visit_Management_System SHALL create an audit log entry with action CREATE, entityName "Visit", entityId set to the new visit's ID, and newValues containing the complete visit record
2. WHEN a visit is updated, THE Visit_Management_System SHALL create an audit log entry with action UPDATE, entityName "Visit", entityId set to the visit's ID, oldValues containing the pre-update field values, and newValues containing the post-update field values
3. WHEN a visit is cancelled, THE Visit_Management_System SHALL create an audit log entry with action CANCEL, entityName "Visit", entityId set to the visit's ID, and newValues containing at minimum the cancellation reason and cancellation timestamp
4. THE Visit_Management_System SHALL record the user ID (from JWT), timestamp (server-generated via default now()), and IP address (from request headers X-Forwarded-For or remote address) in each audit log entry
5. THE Visit_Management_System SHALL exclude sensitive fields (as defined in the existing SENSITIVE_FIELDS list) from audit log oldValues and newValues
