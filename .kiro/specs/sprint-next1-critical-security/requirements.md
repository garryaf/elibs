# Requirements Document

## Introduction

This spec addresses 9 P1/CRITICAL items identified during per-menu audits of the eLIS (Electronic Laboratory Information System) application. These items span security vulnerabilities (privilege escalation, data-scope leaks, self-delete), data integrity gaps (soft-delete, discount persistence, clinical notes), and UX blockers (missing pages, missing pagination). All items are blockers for production readiness and must be resolved in Sprint Next-1.

The system is built with NestJS + Prisma + PostgreSQL (backend), Next.js 14 App Router + TanStack Query + Tailwind CSS (frontend), JWT authentication with 10 role-based access levels, and Jest + fast-check for testing.

## Glossary

- **Patient_Controller**: The NestJS controller at `api/v1/patients` handling patient CRUD operations
- **Patient_Service**: The NestJS service managing Patient entity business logic and Prisma queries
- **Patient_Model**: The Prisma model for Patient, which includes a `deletedAt DateTime?` field for soft-delete
- **Users_Service**: The NestJS service managing User entity CRUD, including `create()`, `update()`, and `softDelete()` methods
- **Users_Controller**: The NestJS controller at `api/v1/users` handling user management endpoints
- **Order_Controller**: The NestJS controller at `api/v1/orders` handling laboratory order endpoints
- **Order_Service**: The NestJS service managing Order entity business logic
- **Order_Model**: The Prisma model for Order, currently lacking `discountAmount`, `discountReason`, and `notes` fields
- **Visit_Controller**: The NestJS controller at `api/v1/visits` handling visit endpoints
- **Visit_Service**: The NestJS service managing Visit entity business logic
- **DataScope_Interceptor**: A NestJS interceptor (to be created) that auto-injects `clinicId` filter for KLINIK_PARTNER role users
- **User_Model**: The Prisma model for User, currently lacking a `clinicId` field
- **CreateOrderDto**: The DTO class for order creation, currently accepting `visitId`, `patientId`, `clinicId`, `doctorId`, `insuranceId`, and `testIds`
- **ProcessPaymentDto**: The DTO class for payment processing
- **OrderQueryDto**: The DTO class for order list queries, supporting `page`, `limit`, `status`, date range, and sorting
- **SUPER_ADMIN**: The highest privilege role; can manage all system resources without restriction
- **ADMIN**: Administrative role with elevated privileges but cannot assign SUPER_ADMIN role
- **KLINIK_PARTNER**: A clinic-scoped role that should only see data belonging to their assigned clinic
- **Audit_Trail**: The system logging mechanism for tracking who performed what action and when
- **Soft_Delete**: Setting `deletedAt` timestamp instead of physically removing a database record
- **Visit_Detail_Page**: The frontend page at `/dashboard/visits/[id]` for displaying visit information (currently missing)
- **Order_List_Page**: The frontend page displaying paginated laboratory orders

## Requirements

### Requirement 1: Patient Soft-Delete Endpoint

**User Story:** As an administrator, I want to deactivate a patient record via the system, so that the deactivation is persisted to the database and the patient no longer appears in active patient lists.

#### Acceptance Criteria

1. WHEN an ADMIN or SUPER_ADMIN user sends a DELETE request to `api/v1/patients/:id`, THE Patient_Controller SHALL set the `deletedAt` field of the Patient_Model to the current timestamp and return HTTP 200 with the updated patient record
2. WHEN a user with a role other than ADMIN or SUPER_ADMIN sends a DELETE request to `api/v1/patients/:id`, THE Patient_Controller SHALL return HTTP 403 Forbidden without modifying the patient record
3. IF the target patient has active visits (status REGISTERED or IN_PROGRESS) or active orders (status not COMPLETED and not CANCELLED), THEN THE Patient_Service SHALL return HTTP 409 Conflict with a message indicating the patient cannot be deactivated while active visits or orders exist
4. WHEN a patient record has a non-null `deletedAt` value, THE Patient_Service SHALL exclude that patient from all `findAll` query results
5. WHEN the frontend "Nonaktifkan" button is clicked, THE frontend SHALL send a DELETE request to `api/v1/patients/:id` and update the UI only upon successful API response

### Requirement 2: Data-Scope RBAC Interceptor

**User Story:** As a system administrator, I want KLINIK_PARTNER users to only see visits and orders belonging to their assigned clinic, so that patient data privacy is maintained across clinics.

#### Acceptance Criteria

1. THE User_Model SHALL include a `clinicId` field (UUID, nullable) that associates a KLINIK_PARTNER user with a specific clinic
2. WHEN a KLINIK_PARTNER user sends a GET request to the Visit findAll endpoint, THE DataScope_Interceptor SHALL automatically inject a `clinicId` filter matching the requesting user's assigned `clinicId`, restricting results to visits belonging to that clinic only
3. WHEN a KLINIK_PARTNER user sends a GET request to the Order findAll endpoint, THE DataScope_Interceptor SHALL automatically inject a `clinicId` filter matching the requesting user's assigned `clinicId`, restricting results to orders belonging to that clinic only
4. WHEN a KLINIK_PARTNER user sends a GET request to a Visit or Order findById endpoint, THE DataScope_Interceptor SHALL verify that the requested resource belongs to the user's assigned `clinicId` and return HTTP 403 Forbidden if the resource belongs to a different clinic
5. WHEN a user with any role other than KLINIK_PARTNER sends a GET request to Visit or Order endpoints, THE DataScope_Interceptor SHALL NOT apply any clinicId filter, allowing full data access
6. IF a KLINIK_PARTNER user has a null `clinicId` value, THEN THE DataScope_Interceptor SHALL return HTTP 403 Forbidden with a message indicating that no clinic is assigned to the user

### Requirement 3: Privilege Escalation Guard

**User Story:** As a security architect, I want to prevent ADMIN users from creating or promoting users to SUPER_ADMIN role, so that only existing SUPER_ADMIN users can grant the highest privilege level.

#### Acceptance Criteria

1. WHEN an ADMIN user sends a POST request to create a user with `role` set to SUPER_ADMIN, THE Users_Service SHALL return HTTP 403 Forbidden with the message "Only SUPER_ADMIN can assign SUPER_ADMIN role"
2. WHEN an ADMIN user sends a PUT request to update a user's `role` to SUPER_ADMIN, THE Users_Service SHALL return HTTP 403 Forbidden with the message "Only SUPER_ADMIN can assign SUPER_ADMIN role"
3. WHEN a SUPER_ADMIN user sends a POST request to create a user with `role` set to SUPER_ADMIN, THE Users_Service SHALL proceed with user creation normally
4. WHEN a SUPER_ADMIN user sends a PUT request to update a user's `role` to SUPER_ADMIN, THE Users_Service SHALL proceed with the role update normally
5. THE Users_Service SHALL validate role escalation by comparing the requesting user's role (extracted from JWT) against the target role in the request body, performing this check before any database mutation

### Requirement 4: Self-Delete and Last Admin Protection

**User Story:** As a system administrator, I want safeguards preventing users from deleting themselves or removing the last SUPER_ADMIN, so that the system cannot be locked out of administrative access.

#### Acceptance Criteria

1. WHEN a user sends a DELETE request to `api/v1/users/:id` where `:id` matches the requesting user's own ID, THE Users_Service SHALL return HTTP 403 Forbidden with the message "Cannot delete own account"
2. WHEN a user sends a DELETE request to `api/v1/users/:id` targeting the last active (non-deleted) SUPER_ADMIN user in the system, THE Users_Service SHALL return HTTP 409 Conflict with the message "Cannot delete last super admin"
3. WHEN a user sends a DELETE request targeting a SUPER_ADMIN user and at least one other active SUPER_ADMIN exists, THE Users_Service SHALL proceed with the soft-delete normally
4. THE Users_Service SHALL determine "last SUPER_ADMIN" by counting active users (where `deletedAt` is null) with role SUPER_ADMIN, excluding the target user from the count

### Requirement 5: Persist Order-Level Discount

**User Story:** As a cashier, I want to apply and persist a manual discount at the order level, so that discounts are recorded in the database with an audit trail and cannot be manipulated without accountability.

#### Acceptance Criteria

1. THE Order_Model SHALL include a `discountAmount` field (Decimal, nullable, default null) representing the monetary discount applied to the entire order
2. THE Order_Model SHALL include a `discountReason` field (String, nullable, default null) describing the justification for the discount
3. WHEN a payment is processed with a `discountAmount` value, THE Order_Service SHALL validate that `discountAmount` is greater than zero and less than or equal to the order's `totalAmount`
4. IF a `discountAmount` exceeds the order's `totalAmount`, THEN THE Order_Service SHALL return HTTP 400 Bad Request with the message "Discount amount cannot exceed total order amount"
5. WHEN a discount is successfully applied to an order, THE Order_Service SHALL create an Audit_Trail entry recording the user ID who applied the discount, the discount amount, the discount reason, and the timestamp
6. WHEN a payment is processed with a `discountAmount`, THE Order_Service SHALL subtract the `discountAmount` from the `totalAmount` to calculate the final payable amount

### Requirement 6: Order List Pagination

**User Story:** As a cashier, I want the order list to display paginated results with navigation controls, so that I can browse all orders without a hardcoded limit hiding data beyond 100 records.

#### Acceptance Criteria

1. WHEN the Order_List_Page loads, THE frontend SHALL request orders with `page=1` and `limit=20` as default parameters instead of the current hardcoded `limit=100`
2. WHEN the Order_List_Page displays results, THE frontend SHALL show pagination controls including previous page button, next page button, current page indicator, and total record count
3. WHEN a user clicks the next page button, THE frontend SHALL request the next page of orders from the API and update the displayed list
4. WHEN the user is on the first page, THE frontend SHALL disable the previous page button
5. WHEN the user is on the last page (determined by total count and page size), THE frontend SHALL disable the next page button
6. THE Order_List_Page pagination pattern SHALL match the existing visit list pagination implementation (shared component reuse where possible)

### Requirement 7: Clinical Notes in Order

**User Story:** As a clinical staff member, I want clinical notes entered during order creation to be saved to the database, so that important clinical context is preserved and accessible for laboratory processing.

#### Acceptance Criteria

1. THE Order_Model SHALL include a `notes` field (String, nullable, default null) for storing clinical notes associated with an order
2. THE CreateOrderDto SHALL accept an optional `notes` field validated as a string
3. WHEN the frontend order creation form is submitted, THE frontend SHALL include the `notes` field value from the "Catatan Klinis" textarea in the API request payload
4. WHEN the Order_Service creates an order with a `notes` value, THE Order_Service SHALL persist the `notes` value to the Order record in the database
5. WHEN the Order_Service creates an order without a `notes` value, THE Order_Service SHALL set `notes` to null in the Order record

### Requirement 8: Visit Detail Page

**User Story:** As a front-desk or clinical staff member, I want to view the full details of a visit, so that I can see patient information, payment details, associated orders, and visit status history without encountering a 404 error.

#### Acceptance Criteria

1. WHEN a user navigates to `/dashboard/visits/[id]`, THE Visit_Detail_Page SHALL render a page displaying the visit's header information including visit number, status badge, and registration date
2. WHEN the Visit_Detail_Page loads, THE Visit_Detail_Page SHALL display a patient information card showing the patient's name, medical record number, date of birth, and contact information
3. WHEN the Visit_Detail_Page loads, THE Visit_Detail_Page SHALL display the payment method and insurance information associated with the visit
4. WHEN the Visit_Detail_Page loads, THE Visit_Detail_Page SHALL display a list of orders linked to the visit, showing order number, status, and test names for each order
5. WHEN the Visit_Detail_Page loads, THE Visit_Detail_Page SHALL display a status timeline showing the visit's progression through statuses (REGISTERED, IN_PROGRESS, COMPLETED, or CANCELLED)
6. WHILE the visit status is REGISTERED or IN_PROGRESS, THE Visit_Detail_Page SHALL display a "Batalkan Kunjungan" (Cancel Visit) button that triggers the visit cancellation flow
7. WHILE the visit status is COMPLETED or CANCELLED, THE Visit_Detail_Page SHALL NOT display the "Batalkan Kunjungan" button

### Requirement 9: Fix Failing Tests

**User Story:** As a developer, I want all 240 unit and property tests to pass, so that the CI pipeline is reliable and new regressions are detectable.

#### Acceptance Criteria

1. WHEN the full test suite is executed, THE test runner SHALL report 240 tests passing with zero failures
2. THE test fixes SHALL update test assertions to match current codebase behavior (adapting expectations to reflect recent refactors such as envelope changes and new fields) rather than reverting production code
3. WHEN a test failure is caused by a changed API response envelope structure, THE test fix SHALL update the expected response shape to match the current envelope format
4. WHEN a test failure is caused by newly added required or optional fields in a model, THE test fix SHALL include the new fields in test fixtures and assertions
5. IF a test failure reveals an actual production bug (not just an outdated assertion), THEN THE fix SHALL address the production code issue and document the bug in the test's comments
