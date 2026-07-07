# Requirements Document

## Introduction

This document specifies the functional requirements for the Laboratory Management module of the Enterprise Laboratory Information System (eLIS). The module covers the complete laboratory workflow: master data management for lab tests, patient registration, order creation, billing/payment, sample collection with barcode tracking, result entry with auto-flagging, technician verification, doctor approval, and automated notification delivery. Requirements are derived from the Functional Specification (FS-ELIS-LAB-NCR0001), BRD, SRS, Database Design, and API Documentation.

## Glossary

- **eLIS**: Enterprise Laboratory Information System — the overall platform being developed
- **Order**: A lab test request containing one or more test items associated with a single patient
- **Order_Detail**: An individual test item within an Order, linked to a specific Test_Master entry
- **Test_Master**: Master data entity defining a laboratory test (code, name, reference values, price)
- **Test_Category**: Grouping entity for organizing Test_Master items (e.g., Hematology, Chemistry)
- **Panel**: A predefined group of tests bundled together for convenience (e.g., Complete Blood Count panel)
- **Reference_Value**: The normal range (min/max) for a test result, scoped by age and gender
- **Auto_Flagging**: Automated comparison of a result value against Reference_Value to produce flags (NORMAL, LOW, HIGH, CRITICAL)
- **Delta_Check**: Display of a patient's previous results for the same test for clinical comparison
- **Barcode_Generator**: The component responsible for generating unique Code-128 or QR barcodes per order
- **Order_Lifecycle**: The state machine governing order status transitions: PENDING_PAYMENT → PAID → SAMPLE_COLLECTED → IN_ANALYSIS → VERIFIED → APPROVED → NOTIFIED (branch: PENDING_PAYMENT → CANCELLED)
- **Verification**: Technician/Analyst review confirming result accuracy (status changes to VERIFIED)
- **Approval**: Doctor review confirming clinical validity (status changes to APPROVED)
- **Notification_Service**: Asynchronous service (BullMQ) that sends results via Email and WhatsApp
- **MRN**: Medical Record Number — auto-generated patient identifier (format: RM-YYYYMM-XXXX)
- **Tariff**: Price configuration for a test, which may vary by referring clinic or insurance
- **RBAC**: Role-Based Access Control enforced via NestJS Guards on every endpoint
- **Audit_Logger**: Prisma middleware that records immutable Create/Update/Delete events to audit_logs

## Requirements

### Requirement 1: Lab Test Master Data Management

**User Story:** As an Admin, I want to manage laboratory test master data (tests, categories, panels, and reference values), so that the system has accurate configuration for test ordering and result validation.

#### Acceptance Criteria

1. THE Master_Data_API SHALL expose CRUD endpoints for Test_Master entities at `/api/v1/master/tests` with fields: code (unique), name, category, unit, method, sample type, price, minRef, maxRef, criticalMin, criticalMax, requiresDoctorApproval flag, and active status
2. THE Master_Data_API SHALL expose CRUD endpoints for Test_Category entities at `/api/v1/master/test-categories` with fields: id, name, description, and active status
3. THE Master_Data_API SHALL expose CRUD endpoints for Panel entities at `/api/v1/master/panels` with fields: id, name, description, included test IDs, and panel price
4. WHEN a Test_Master is created or updated, THE Master_Data_API SHALL validate that the code field is unique across all non-deleted Test_Master records
5. WHEN a Test_Master record is deleted, THE Master_Data_API SHALL perform a soft-delete by setting the deletedAt timestamp rather than removing the record
6. THE Master_Data_API SHALL support Reference_Value configuration per Test_Master scoped by age range (minAge, maxAge) and gender (MALE, FEMALE, ALL)
7. WHEN a Test_Master has active Order_Detail records referencing it, THE Master_Data_API SHALL reject hard deletion and return error code ERR_REFERENCE_CONFLICT
8. THE Master_Data_API SHALL restrict write operations (Create, Update, Delete) on master data to users with role ADMIN or SUPER_ADMIN

### Requirement 2: Tariff and Pricing Configuration

**User Story:** As an Admin, I want to configure multiple tariff rates per test based on referring clinic and insurance, so that billing accurately reflects contractual pricing agreements.

#### Acceptance Criteria

1. THE Tariff_API SHALL expose CRUD endpoints at `/api/v1/master/tariffs` supporting per-test pricing that varies by clinic and insurance provider
2. WHEN a tariff record is created, THE Tariff_API SHALL validate that the combination of testId, clinicId, and insuranceId is unique
3. THE Tariff_API SHALL support a default tariff (clinicId=null, insuranceId=null) that applies when no specific tariff match exists
4. WHEN a tariff lookup is performed, THE Billing_Engine SHALL resolve price by checking specific clinic+insurance match first, then clinic-only match, then insurance-only match, then default tariff
5. THE Tariff_API SHALL restrict write operations to users with role ADMIN or SUPER_ADMIN
6. WHEN a discount percentage is configured for a tariff, THE Tariff_API SHALL validate that the value is between 0 and 100 inclusive

### Requirement 3: Patient Registration

**User Story:** As a Kasir or CS staff, I want to register patients with validated identity information, so that the laboratory maintains accurate and unique patient records.

#### Acceptance Criteria

1. THE Patient_API SHALL expose a POST endpoint at `/api/v1/patients` accepting fields: nik, name, dateOfBirth, gender, phone, address, and email
2. WHEN a patient is registered, THE Patient_API SHALL validate that the NIK contains exactly 16 numeric digits
3. WHEN a patient is registered with a NIK that already exists in the system, THE Patient_API SHALL return HTTP 400 with error code ERR_VALIDATION and message indicating NIK duplication
4. WHEN a patient is successfully registered, THE Patient_API SHALL auto-generate a unique MRN in format RM-YYYYMM-XXXX where XXXX is a zero-padded sequential number within that month
5. THE Patient_API SHALL ensure that MRN values are immutable after creation and cannot be modified through any API endpoint
6. THE Patient_API SHALL allow patient registration by users with roles KASIR, CS, ADMIN, or KLINIK_PARTNER
7. THE Patient_API SHALL expose GET endpoints at `/api/v1/patients` supporting pagination, search by name/NIK/MRN, and sorting

### Requirement 4: Lab Order Creation

**User Story:** As a Kasir, I want to create laboratory orders with one or more tests for a registered patient, so that the lab can track and process the requested examinations.

#### Acceptance Criteria

1. THE Order_API SHALL expose a POST endpoint at `/api/v1/orders` accepting fields: patientId, clinicId (optional), doctorId (optional), insuranceId (optional), and an array of testIds (minimum 1 item)
2. WHEN an order is created, THE Order_API SHALL auto-generate a unique orderNumber and set the initial status to PENDING_PAYMENT
3. WHEN an order is created, THE Billing_Engine SHALL automatically calculate the totalAmount by summing resolved tariffs for each test and applying applicable discounts
4. THE Order_API SHALL validate that the referenced patientId exists and is not soft-deleted
5. THE Order_API SHALL validate that all referenced testIds exist, are active, and are not soft-deleted
6. WHEN an order is created, THE Order_API SHALL create one Order_Detail record per testId with initial status PENDING
7. THE Order_API SHALL allow order creation by users with roles KASIR, ADMIN, or KLINIK_PARTNER
8. THE Order_API SHALL expose GET endpoints at `/api/v1/orders` supporting pagination, filtering by status and date range, and sorting

### Requirement 5: Payment and Billing

**User Story:** As a Kasir, I want to process payments for lab orders, so that paid orders can proceed to sample collection and analysis.

#### Acceptance Criteria

1. THE Payment_API SHALL expose a POST endpoint at `/api/v1/orders/:id/pay` accepting fields: paymentMethod (CASH, TRANSFER, INSURANCE), amountPaid, and optional notes
2. WHEN payment is processed successfully, THE Order_Lifecycle SHALL transition the order status from PENDING_PAYMENT to PAID
3. IF a payment request is made for an order not in PENDING_PAYMENT status, THEN THE Payment_API SHALL return HTTP 400 with error code ERR_INVALID_STATE
4. WHEN payment succeeds, THE Barcode_Generator SHALL generate a unique Code-128 barcode linked to the Order ID for sample tracking
5. THE Payment_API SHALL expose a GET endpoint at `/api/v1/orders/:id/barcode` returning the barcode image in base64 format
6. THE Payment_API SHALL expose a GET endpoint at `/api/v1/orders/:id/invoice` returning invoice details including patient info, test list, pricing breakdown, and payment confirmation
7. THE Payment_API SHALL restrict payment processing to users with role KASIR or ADMIN

### Requirement 6: Sample Collection and Tracking

**User Story:** As a Sampling staff, I want to confirm sample receipt by scanning barcodes, so that the system accurately tracks sample status through the laboratory workflow.

#### Acceptance Criteria

1. THE Sample_API SHALL expose a POST endpoint at `/api/v1/lab/:orderId/sample` accepting fields: collectedBy, collectedAt, sampleCondition (ACCEPTABLE, LIPEMIC, HEMOLYTIC, CLOTTED, INSUFFICIENT)
2. WHEN a sample is confirmed as collected with condition ACCEPTABLE, THE Order_Lifecycle SHALL transition the order status from PAID to SAMPLE_COLLECTED
3. IF a sample collection request is made for an order not in PAID status, THEN THE Sample_API SHALL return HTTP 400 with error code ERR_INVALID_STATE
4. IF the sampleCondition is not ACCEPTABLE, THEN THE Sample_API SHALL mark the order for re-collection and retain status PAID with a rejectionReason recorded
5. THE Sample_API SHALL validate that the orderId corresponds to an existing order with a valid barcode
6. THE Sample_API SHALL restrict sample confirmation to users with roles SAMPLING or ADMIN
7. THE Lab_Queue_API SHALL expose a GET endpoint at `/api/v1/lab/queue` listing orders with status PAID or SAMPLE_COLLECTED, supporting pagination and filtering

### Requirement 7: Laboratory Result Entry

**User Story:** As an Analis, I want to enter test results with automatic validation against reference values, so that abnormal values are flagged immediately for clinical attention.

#### Acceptance Criteria

1. THE Result_API SHALL expose a PUT endpoint at `/api/v1/lab/:orderId/results` accepting an array of result entries, each containing: orderDetailId, resultValue, and optional comment
2. WHEN a result is entered, THE Auto_Flagging SHALL compare the resultValue against the Reference_Value (minRef, maxRef) for the corresponding Test_Master, considering the patient age and gender
3. WHEN the resultValue is below minRef, THE Auto_Flagging SHALL assign flag LOW to the Order_Detail
4. WHEN the resultValue is above maxRef, THE Auto_Flagging SHALL assign flag HIGH to the Order_Detail
5. WHEN the resultValue is below criticalMin or above criticalMax, THE Auto_Flagging SHALL assign flag CRITICAL to the Order_Detail
6. WHEN the resultValue is within the normal range (minRef to maxRef inclusive), THE Auto_Flagging SHALL assign flag NORMAL to the Order_Detail
7. WHEN all Order_Detail results for an order are entered, THE Order_Lifecycle SHALL transition the order status from SAMPLE_COLLECTED to IN_ANALYSIS
8. THE Result_API SHALL validate that resultValue matches the expected data type for the test (numeric for quantitative tests, string for qualitative tests)
9. THE Result_API SHALL restrict result entry to users with roles ANALIS or ADMIN

### Requirement 8: Delta Check (Historical Comparison)

**User Story:** As an Analis, I want to view a patient's previous results for the same test, so that I can identify trends or anomalies requiring further investigation.

#### Acceptance Criteria

1. THE Delta_Check_API SHALL expose a GET endpoint at `/api/v1/lab/:orderId/delta-check` returning previous results for the same patient and same tests within the current order
2. THE Delta_Check_API SHALL return up to the 5 most recent historical results per test, ordered by date descending
3. WHEN historical results are retrieved, THE Delta_Check_API SHALL include for each: resultValue, flag, resultDate, and orderNumber
4. IF no previous results exist for a given test and patient, THEN THE Delta_Check_API SHALL return an empty array for that test
5. THE Delta_Check_API SHALL restrict access to users with roles ANALIS, DOKTER, or ADMIN

### Requirement 9: Technician Verification

**User Story:** As an Analis (Technician), I want to verify entered lab results after review, so that only quality-checked results proceed to doctor approval.

#### Acceptance Criteria

1. THE Verify_API SHALL expose a POST endpoint at `/api/v1/lab/:orderId/verify` accepting fields: verifiedBy and optional verificationNotes
2. WHEN verification is requested, THE Verify_API SHALL validate that all Order_Detail items in the order have a resultValue entered
3. WHEN all results are verified, THE Order_Lifecycle SHALL transition the order status from IN_ANALYSIS to VERIFIED
4. IF verification is requested for an order not in IN_ANALYSIS status, THEN THE Verify_API SHALL return HTTP 400 with error code ERR_INVALID_STATE
5. THE Verify_API SHALL restrict verification to users with roles ANALIS or ADMIN
6. WHEN verification is completed, THE Audit_Logger SHALL record the verification event with userId, orderId, and timestamp

### Requirement 10: Doctor Approval

**User Story:** As a Dokter (Doctor), I want to review and approve verified lab results, so that results are clinically validated before release to patients.

#### Acceptance Criteria

1. THE Approval_API SHALL expose a POST endpoint at `/api/v1/lab/:orderId/approve` accepting fields: decision (APPROVE or REJECT), interpretation (optional clinical notes), and rejectionReason (required when decision is REJECT)
2. WHEN the decision is APPROVE, THE Order_Lifecycle SHALL transition the order status from VERIFIED to APPROVED
3. WHEN the decision is REJECT, THE Order_Lifecycle SHALL transition the order status back to IN_ANALYSIS with the rejectionReason recorded, allowing the Analis to revise results
4. IF approval is requested for an order not in VERIFIED status, THEN THE Approval_API SHALL return HTTP 400 with error code ERR_INVALID_STATE
5. WHERE a Test_Master has requiresDoctorApproval set to false, THE Order_Lifecycle SHALL allow the order to skip doctor approval and transition directly from VERIFIED to APPROVED after technician verification
6. THE Approval_API SHALL restrict approval operations to users with role DOKTER or SUPER_ADMIN
7. THE Approval_API SHALL expose a GET endpoint at `/api/v1/lab/approval-queue` listing orders in VERIFIED status awaiting doctor review

### Requirement 11: Result Notification and Distribution

**User Story:** As the system, I want to automatically generate PDF reports and send results via Email and WhatsApp after approval, so that patients receive their lab results promptly without manual intervention.

#### Acceptance Criteria

1. WHEN an order reaches APPROVED status, THE Notification_Service SHALL enqueue a PDF generation job in the BullMQ email_queue
2. WHEN the PDF is generated, THE Notification_Service SHALL send the result via Email to the patient email address if the patient has provided an email and consented to digital notifications
3. WHEN the PDF is generated, THE Notification_Service SHALL send the result via WhatsApp to the patient phone number if the number is valid (prefix 62 or 08) and the patient has consented to digital notifications
4. WHEN notifications are sent successfully, THE Order_Lifecycle SHALL transition the order status from APPROVED to NOTIFIED
5. IF the patient has not consented to digital notifications, THEN THE Notification_Service SHALL skip notification delivery and keep the order in APPROVED status
6. IF notification delivery fails, THEN THE Notification_Service SHALL retry up to 3 times with exponential backoff before marking the notification as FAILED
7. THE Notification_Service SHALL generate PDF reports containing: patient name, MRN, order date, test results with flags, reference ranges, doctor interpretation, and approval timestamp

### Requirement 12: Order Cancellation

**User Story:** As a Kasir or Admin, I want to cancel unpaid orders, so that incorrect or abandoned orders do not clutter the system.

#### Acceptance Criteria

1. THE Order_API SHALL expose a POST endpoint at `/api/v1/orders/:id/cancel` accepting fields: reason (required)
2. WHEN cancellation is requested, THE Order_Lifecycle SHALL transition the order status from PENDING_PAYMENT to CANCELLED
3. IF cancellation is requested for an order not in PENDING_PAYMENT status, THEN THE Order_API SHALL return HTTP 400 with error code ERR_INVALID_STATE and message indicating that only unpaid orders can be cancelled
4. THE Order_API SHALL restrict cancellation to users with roles KASIR, ADMIN, or SUPER_ADMIN
5. WHEN an order is cancelled, THE Audit_Logger SHALL record the cancellation event with userId, orderId, reason, and timestamp

### Requirement 13: Audit Trail for Laboratory Operations

**User Story:** As an Admin or compliance auditor, I want all laboratory data mutations to be recorded in an immutable audit log, so that there is complete traceability for regulatory compliance.

#### Acceptance Criteria

1. WHEN any Create, Update, or Delete operation is performed on Order, Order_Detail, or Patient entities, THE Audit_Logger SHALL insert a record into audit_logs with fields: userId, action, entityName, entityId, oldValues, newValues, timestamp, and ipAddress
2. THE Audit_Logger SHALL store oldValues and newValues as JSONB, excluding sensitive fields (passwordHash) from the logged values
3. THE audit_logs table SHALL be immutable — no UPDATE or DELETE operations are permitted on audit_log records
4. THE Audit_API SHALL expose a GET endpoint at `/api/v1/audit-logs` supporting filtering by entityName, entityId, userId, action, and date range
5. THE Audit_API SHALL restrict access to audit logs to users with roles ADMIN or SUPER_ADMIN

### Requirement 14: Laboratory Dashboard and Queue Management

**User Story:** As a Manager or Owner, I want to view laboratory operational metrics on a dashboard, so that I can monitor performance and identify bottlenecks.

#### Acceptance Criteria

1. THE Dashboard_API SHALL expose a GET endpoint at `/api/v1/dashboard/lab-summary` returning: total orders today, orders by status, average TAT (Turnaround Time), and pending approval count
2. THE Dashboard_API SHALL calculate TAT as the duration from SAMPLE_COLLECTED timestamp to APPROVED timestamp for completed orders
3. THE Dashboard_API SHALL expose a GET endpoint at `/api/v1/dashboard/lab-volume` returning order volume grouped by day for a configurable date range (default: last 30 days)
4. THE Dashboard_API SHALL restrict access to users with roles OWNER, MANAGER, ADMIN, or SUPER_ADMIN
5. THE Lab_Queue_API SHALL provide real-time queue counts per status (PAID, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED) for operational monitoring

### Requirement 15: Frontend Laboratory UI

**User Story:** As lab staff (Sampling, Analis, Dokter), I want dedicated user interfaces for my workflow steps, so that I can efficiently perform my tasks without navigating unnecessary screens.

#### Acceptance Criteria

1. THE Laboratory_UI SHALL display a Queue screen showing orders ready for processing, filterable by status (PAID, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED)
2. THE Laboratory_UI SHALL provide a Result Entry form displaying test parameters, input fields for values, auto-calculated flags (color-coded: green for NORMAL, yellow for HIGH/LOW, red for CRITICAL), and delta check values
3. THE Laboratory_UI SHALL provide a Doctor Approval screen showing orders in VERIFIED status with a list of test results, flags, and action buttons for Approve and Reject
4. THE Laboratory_UI SHALL display barcode information and patient details when an order is selected from the queue
5. THE Laboratory_UI SHALL enforce RBAC by rendering only screens and actions available to the logged-in user role
6. THE Laboratory_UI SHALL follow the "Calm Medical Experience" design system using Sage Green and Muted Olive color palette with Bento Grid layout
