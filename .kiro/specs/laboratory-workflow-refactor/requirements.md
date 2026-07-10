# Requirements Document

## Introduction

This specification defines the refactoring of the eLIS laboratory workflow to enforce a mandatory Visit linkage for all orders. The current system allows orders to be created without a Visit reference (`Order.visitId` is nullable). The target state requires every laboratory transaction to follow the chain: **Patient → Visit → Order → Sample → Result → Verification → Approval**, where Visit is the mandatory intermediary between patient identity and laboratory orders.

This is a breaking change that impacts the API contract, database schema, frontend order creation flow, and existing data. The refactoring must include a migration strategy for legacy orders that have no associated visit, validation enforcement at every code path, and backward-compatible API versioning or deprecation notices.

## Glossary

- **Order_Service**: The NestJS service responsible for creating, managing, and querying laboratory orders
- **Visit_Management_System**: The NestJS module responsible for creating, managing, and querying patient visits/encounters
- **Order**: A laboratory test request containing one or more test items, linked to a patient and a visit
- **Visit**: A single patient encounter at the laboratory, identified by a unique Visit Number, serving as the mandatory clinical context for all orders
- **Visit_ID**: The UUID foreign key on the Order record referencing the associated Visit
- **Legacy_Order**: An existing order in the database created before this refactoring where visitId is NULL
- **Migration_Service**: The service responsible for handling data migration of legacy orders to conform to the new mandatory Visit requirement
- **Order_Validation_Guard**: The validation layer that enforces mandatory Visit linkage before order creation
- **Frontend_Order_Form**: The Next.js web form component used for creating laboratory orders
- **Traceability_Chain**: The complete reference chain from any lab artifact (Sample, Result, Verification, Approval) back to the originating Visit through the Order relationship

## Requirements

### Requirement 1: Mandatory Visit Reference on Order Creation

**User Story:** As a laboratory manager, I want every new order to require a valid Visit reference, so that all laboratory transactions are traceable to a patient encounter.

#### Acceptance Criteria

1. WHEN an order creation request is received with a valid visitId referencing an existing Visit in REGISTERED or IN_PROGRESS status, THE Order_Service SHALL create the order, persist the visitId as a non-nullable association, and return the generated order ID
2. IF an order creation request is received without a visitId or with a null visitId, THEN THE Order_Service SHALL reject the request with an ERR_VALIDATION error indicating that visitId is a required field
3. IF an order creation request contains a visitId that does not reference an existing Visit record, THEN THE Order_Service SHALL reject the request with an ERR_NOT_FOUND error indicating the visit was not found
4. IF an order creation request contains a visitId referencing a Visit in CANCELLED or COMPLETED status, THEN THE Order_Service SHALL reject the request with an ERR_INVALID_STATE error indicating that orders cannot be added to visits in terminal states
5. WHEN an order is created with a valid visitId, THE Order_Service SHALL persist the visitId as a non-nullable foreign key on the Order record such that the Order can always be traced back to its Visit
6. WHEN an order is successfully created under a Visit in REGISTERED status, THE Order_Service SHALL transition the Visit status to IN_PROGRESS; WHEN the Visit is already in IN_PROGRESS status, THE Order_Service SHALL leave the Visit status unchanged

### Requirement 2: Database Schema Migration for Mandatory Visit

**User Story:** As a system administrator, I want the database schema to enforce non-nullable visitId on orders, so that data integrity is guaranteed at the database level.

#### Acceptance Criteria

1. THE Migration_Service SHALL alter the `visitId` column on the `orders` table from nullable (`String?`) to non-nullable (`String`) with a UUID type constraint
2. WHEN the migration is initiated, THE Migration_Service SHALL first verify that zero rows exist in the `orders` table where `visitId` is NULL, and SHALL proceed with the schema alteration only if that count equals zero
3. THE Migration_Service SHALL add a NOT NULL constraint and a foreign key constraint on the `visitId` column in the `orders` table referencing the `visits` table `id` column with RESTRICT delete behavior, preventing deletion of a visit that has associated orders
4. THE Migration_Service SHALL generate the schema migration as a Prisma migration file without auto-applying it, so that the generated SQL can be reviewed before execution
5. IF the migration is executed while one or more NULL `visitId` values exist in the `orders` table, THEN THE Migration_Service SHALL abort the migration without applying any schema changes and SHALL return an error indicating the exact count of orders with NULL `visitId`
6. IF the migration fails after partial execution due to a database error, THEN THE Migration_Service SHALL roll back all schema changes within the migration transaction, leaving the `orders` table in its original nullable state

### Requirement 3: Legacy Order Data Migration

**User Story:** As a system administrator, I want existing orders without a Visit to be migrated safely, so that historical data conforms to the new mandatory Visit requirement without data loss.

#### Acceptance Criteria

1. THE Migration_Service SHALL identify all existing Order records where visitId is NULL and produce a count report containing the total number of affected orders and the number of distinct patient-date groups, written to the audit log with action "MIGRATION_REPORT" before any migration action begins
2. THE Migration_Service SHALL create a synthetic Visit record for each group of legacy orders sharing the same patientId and the same calendar date (based on the Order createdAt field truncated to date), with status COMPLETED and paymentMethod CASH, linking the Visit to that patient and using the order's createdAt date as the registrationDate
3. WHEN a synthetic Visit is created for legacy orders, THE Migration_Service SHALL generate a valid Visit_Number following the format `VST-YYYYMM-XXXX` using the order's createdAt month as the reference month, incrementing the VisitSequence table to avoid collisions with previously generated visit numbers
4. THE Migration_Service SHALL update each legacy Order record to reference the newly created synthetic Visit, and after migration completes, verify that zero Order records remain with a NULL visitId; if any remain, the migration SHALL be reported as failed
5. THE Migration_Service SHALL execute the entire legacy data migration within a single database transaction, rolling back all changes if any record fails to insert, update, or validate during the migration process
6. THE Migration_Service SHALL produce an audit log entry for each synthetic Visit created, with action "MIGRATION", entityName "Visit", and details containing the array of migrated Order IDs linked to that Visit
7. IF the migration is executed when no Order records with NULL visitId exist, THEN THE Migration_Service SHALL complete without creating any Visit records and SHALL report zero records migrated in the count report

### Requirement 4: API Contract Update

**User Story:** As a frontend developer, I want the API contract to clearly communicate that visitId is mandatory, so that client applications can be updated accordingly.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/v1/orders`, THE Order_Service SHALL validate that the request body includes a `visitId` field containing a valid UUID value
2. IF a POST request to `/api/v1/orders` omits the `visitId` field or provides a value that is not a valid UUID, THEN THE Order_Service SHALL return HTTP 400 with an error envelope containing a field-level validation error for `visitId` indicating the constraint that was violated
3. IF a POST request to `/api/v1/orders` provides a `visitId` that does not reference an existing visit or references a visit not in an acceptable state for order creation, THEN THE Order_Service SHALL reject the request with an error response indicating the visit is invalid
4. WHEN an order is successfully created, THE Order_Service SHALL include the associated visit's `visitNumber` and `status` fields in the response payload alongside the order details
5. WHEN orders are queried via GET `/api/v1/orders`, THE Order_Service SHALL include the associated visit's `visitNumber` and `status` in each order record returned, or null visit fields for orders that have no linked visit

### Requirement 5: Visit-to-Order Patient Consistency Validation

**User Story:** As a laboratory staff member, I want the system to prevent creating an order under a visit that belongs to a different patient, so that clinical data integrity is maintained.

#### Acceptance Criteria

1. WHEN an order creation request is received with a visitId, THE Order_Service SHALL retrieve the referenced Visit record and verify that the `patientId` in the order matches the `patientId` stored on that Visit record
2. IF the order's patientId does not match the Visit's patientId, THEN THE Order_Service SHALL reject the request with an ERR_VALIDATION error indicating patient mismatch between order and visit, and SHALL NOT create the order or any associated records
3. WHEN an order creation request includes a visitId, THE Order_Service SHALL perform the patient consistency check immediately after confirming the Visit exists and before executing any subsequent order creation logic (pricing resolution, test validation, order record persistence)

### Requirement 6: Traceability Chain Enforcement

**User Story:** As a quality assurance officer, I want every lab result, verification, and approval to trace back to a Visit through the Order, so that the complete audit trail is maintained.

#### Acceptance Criteria

1. WHEN a sample collection operation is performed, THE Order_Service SHALL verify that the referenced Order has a non-null visitId before recording the sample, establishing the traceability chain Visit → Order → Sample
2. WHEN a result entry operation is performed, THE Order_Service SHALL verify that the referenced OrderDetail's parent Order has a non-null visitId before persisting the result, establishing the chain Visit → Order → OrderDetail → Result
3. WHEN a verification operation is performed, THE Order_Service SHALL verify that the referenced Order has a non-null visitId before recording the verification, establishing the chain Visit → Order → Verification
4. WHEN an approval operation is performed, THE Order_Service SHALL verify that the referenced Order has a non-null visitId before recording the approval, establishing the chain Visit → Order → Approval
5. WHEN querying a result, verification, or approval record, THE Order_Service SHALL include the associated Visit's visitNumber and status in the response payload through the Order relationship, without requiring additional API calls

### Requirement 7: Frontend Order Creation Flow Update

**User Story:** As a registration staff member, I want the order creation form to require Visit selection before proceeding, so that I cannot accidentally create an order without a visit context.

#### Acceptance Criteria

1. WHEN the order creation page is accessed, THE Frontend_Order_Form SHALL display a Visit selection step as the first mandatory step before showing test selection
2. WHEN a Visit is selected, THE Frontend_Order_Form SHALL auto-populate the patient's full name, MRN, and date of birth from the Visit's associated patient record, and disable patient selection (patient is determined by the Visit)
3. IF no Visit is selected, THEN THE Frontend_Order_Form SHALL disable the order submission button and display a message indicating that a Visit must be selected first
4. THE Frontend_Order_Form SHALL provide a search/filter interface for Visits that accepts a minimum of 3 characters before executing a search, allows search by Visit Number, patient name, or patient MRN, displays a maximum of 20 results at a time, and filters results to show only Visits in REGISTERED or IN_PROGRESS status
5. WHEN the Visit selection is changed, THE Frontend_Order_Form SHALL clear any previously selected tests and reset the order form fields (selected tests, quantities, and notes) to prevent stale data from a different visit context
6. THE Frontend_Order_Form SHALL provide a quick-create option to register a new Visit inline (without navigating away) requiring at minimum the patient selection and payment method, and WHEN inline Visit creation succeeds, THE Frontend_Order_Form SHALL automatically select the newly created Visit in the Visit selection step
7. WHEN the form is submitted, THE Frontend_Order_Form SHALL include the selected visitId in the API request payload
8. IF the order submission API request returns a validation or state error (such as visit no longer in an acceptable status), THEN THE Frontend_Order_Form SHALL display the error message returned by the API and keep the form populated so the user can correct the issue without re-entering data

### Requirement 8: Backward Compatibility and Deprecation

**User Story:** As an API consumer, I want clear deprecation notices when the API contract changes, so that I can plan my integration updates.

#### Acceptance Criteria

1. WHEN a POST /api/v1/orders request is received without a visitId field after the mandatory visitId change is deployed, THE Order_Service SHALL reject the request with HTTP 400 status and return an error response containing an error message indicating that visitId is now required and instructing the caller to create a Visit first via the visits endpoint
2. WHEN a POST /api/v1/orders request is received without a visitId field, THE Order_Service SHALL log a warning-level message that includes the requesting user ID and request timestamp
3. THE Order_Service SHALL mark visitId as a required field in the OpenAPI/Swagger schema for the create-order endpoint, including a field description and a UUID example value
4. WHILE the mandatory visitId change is active, THE Order_Service SHALL continue to serve existing GET /api/v1/orders and GET /api/v1/orders/:id endpoints without requiring visitId as a query parameter, including visitId in the response body for each order where the value is present and returning null for the visitId field on orders created before the migration

### Requirement 9: Validation Guard for All Order Creation Paths

**User Story:** As a system architect, I want a centralized validation guard that prevents any code path from bypassing the mandatory Visit requirement, so that the invariant is enforced consistently.

#### Acceptance Criteria

1. WHEN an order creation operation is invoked (via API endpoint, internal service call, or batch operation), THE Order_Validation_Guard SHALL validate the visitId field before any persistence operation executes
2. IF a visitId is null, empty, or not a valid UUID format, THEN THE Order_Validation_Guard SHALL reject the request with an ERR_VALIDATION error indicating that visitId is required, and SHALL NOT persist the Order
3. IF the visitId references a Visit that does not exist, THEN THE Order_Validation_Guard SHALL reject the request with an ERR_NOT_FOUND error indicating the Visit was not found, and SHALL NOT persist the Order
4. IF the referenced Visit exists but its status is not REGISTERED or IN_PROGRESS, THEN THE Order_Validation_Guard SHALL reject the request with an ERR_INVALID_STATE error indicating the Visit status is not acceptable for order creation, and SHALL NOT persist the Order
5. IF the referenced Visit's patientId does not match the Order's patientId, THEN THE Order_Validation_Guard SHALL reject the request with an ERR_VALIDATION error indicating a patient mismatch, and SHALL NOT persist the Order
6. THE Order_Validation_Guard SHALL execute validations in the following sequence: (a) visitId presence and format, (b) Visit existence, (c) Visit status is REGISTERED or IN_PROGRESS, (d) Visit patientId matches Order patientId
7. THE Order_Validation_Guard SHALL be invoked as the first validation step in every order creation code path within OrderService, prior to patient validation, test validation, or pricing resolution

### Requirement 10: Visit-Based Order Querying

**User Story:** As a laboratory staff member, I want to query all orders under a specific visit, so that I can view the complete encounter context.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/v1/visits/:id`, THE Visit_Management_System SHALL include all associated orders with each order containing: id, order number, current status, creation date, and total amount
2. WHEN a GET request is made to `/api/v1/visits/:id/orders`, THE Visit_Management_System SHALL return a paginated list of orders belonging to the specified visit, with default page size of 20 and maximum page size of 100, including pagination metadata (total, page, limit, totalPages)
3. IF a GET request is made to `/api/v1/visits/:id` or `/api/v1/visits/:id/orders` with a visit ID that does not exist, THEN THE Visit_Management_System SHALL return an error response indicating the visit was not found
4. WHEN orders are queried via the existing order list endpoint with a `visitId` query parameter, THE Order_Service SHALL return only orders associated with the specified visit, applying the same pagination and filtering rules as the standard order list
5. IF a GET request is made to `/api/v1/visits/:id/orders` for a visit that has no associated orders, THEN THE Visit_Management_System SHALL return an empty data array with pagination metadata showing a total of 0
