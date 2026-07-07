# Implementation Plan: Laboratory Management Module

## Overview

Implement the Laboratory Management module for eLIS following a phased approach: Phase A (Master Data + Patient foundation), Phase B (Orders + Payment + Tariff), Phase C (Lab Workflow — sample, results, verification, approval), Phase D (Notifications + Dashboard), and Phase E (Frontend UI). Each phase builds on the previous, with property-based tests inline to catch errors early.

## Tasks

- [x] 1. Phase A: Database Schema & Master Data Module
  - [x] 1.1 Create Prisma schema migration for laboratory models
    - Extend `apps/api/prisma/schema.prisma` with all enums (Gender, OrderStatus, OrderDetailStatus, Flag, PaymentMethod, SampleCondition, NotificationStatus, NotificationType)
    - Add models: TestCategory, TestMaster, ReferenceValue, Panel, PanelTest, Tariff, Patient, MrnSequence, Order, OrderDetail, NotificationLog
    - Run `npx prisma migrate dev` to generate the migration
    - _Requirements: FR1.1, FR1.2, FR1.3, FR1.6, FR2.1, FR3.1_

  - [x] 1.2 Create the LaboratoryModule umbrella and MasterDataModule
    - Create `apps/api/src/laboratory/laboratory.module.ts` as the umbrella module
    - Create `apps/api/src/laboratory/master-data/master-data.module.ts`
    - Create `apps/api/src/laboratory/master-data/master-data.service.ts` with CRUD for TestCategory, TestMaster, Panel, PanelTest, ReferenceValue
    - Create `apps/api/src/laboratory/master-data/master-data.controller.ts` with endpoints at `/api/v1/master/test-categories`, `/api/v1/master/tests`, `/api/v1/master/panels`
    - Create DTOs in `apps/api/src/laboratory/master-data/dto/` (create-test-category.dto.ts, update-test-category.dto.ts, create-test.dto.ts, update-test.dto.ts, create-panel.dto.ts, update-panel.dto.ts)
    - Implement soft-delete on TestMaster, Panel, TestCategory
    - Implement unique code validation for TestMaster
    - Implement ERR_REFERENCE_CONFLICT guard when deleting a test with active OrderDetail references
    - Apply `@Roles(Role.ADMIN, Role.SUPER_ADMIN)` guards on write operations
    - Register LaboratoryModule in `apps/api/src/app.module.ts`
    - _Requirements: FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, FR1.7, FR1.8_

  - [x] 1.3 Implement Tariff CRUD endpoints
    - Create `apps/api/src/laboratory/master-data/tariff.controller.ts` with endpoints at `/api/v1/master/tariffs`
    - Create DTOs: create-tariff.dto.ts, update-tariff.dto.ts with discount validation (0–100)
    - Implement unique constraint validation on (testId, clinicId, insuranceId) combination
    - Apply role guards (ADMIN, SUPER_ADMIN)
    - _Requirements: FR2.1, FR2.2, FR2.3, FR2.5, FR2.6_

  - [x] 1.4 Write property test for discount range validation
    - **Property 8: Discount Range Validation**
    - Create `apps/api/src/laboratory/master-data/tests/tariff.property.spec.ts`
    - Use fast-check to generate arbitrary numbers and verify the validator accepts V iff 0 ≤ V ≤ 100
    - **Validates: Requirements FR2.6**

  - [x] 1.5 Implement PatientModule with MRN generation
    - Create `apps/api/src/laboratory/patient/patient.module.ts`
    - Create `apps/api/src/laboratory/patient/patient.service.ts` with registration, search, update
    - Create `apps/api/src/laboratory/patient/patient.controller.ts` with endpoints at `/api/v1/patients`
    - Create `apps/api/src/laboratory/patient/mrn-generator.service.ts` using PostgreSQL UPSERT on MrnSequence table with SERIALIZABLE transaction
    - Create DTOs: create-patient.dto.ts (NIK: 16-digit validation), update-patient.dto.ts (MRN immutable)
    - Implement NIK uniqueness check returning ERR_VALIDATION on duplicate
    - Implement pagination, search by name/NIK/MRN, sorting on GET endpoint
    - Apply role guards (KASIR, CS, ADMIN, KLINIK_PARTNER for create; all authenticated for read)
    - _Requirements: FR3.1, FR3.2, FR3.3, FR3.4, FR3.5, FR3.6, FR3.7_

  - [x] 1.6 Write property tests for Patient validation and MRN
    - **Property 6: NIK Validation**
    - **Property 7: MRN Format Invariant**
    - Create `apps/api/src/laboratory/patient/tests/patient.property.spec.ts`
    - Use fast-check to generate arbitrary strings and verify NIK validator accepts iff exactly 16 numeric digits
    - Use fast-check to verify generated MRN matches pattern `RM-YYYYMM-XXXX` and is unique
    - **Validates: Requirements FR3.2, FR3.4**

  - [x] 1.7 Implement AuditModule with Prisma middleware
    - Create `apps/api/src/laboratory/audit/audit.module.ts`
    - Create `apps/api/src/laboratory/audit/audit-log.middleware.ts` as a Prisma middleware intercepting Create/Update/Delete on Order, OrderDetail, Patient
    - Ensure passwordHash and other sensitive fields are excluded from oldValues/newValues
    - Create `apps/api/src/laboratory/audit/audit.service.ts` with query endpoint (filter by entityName, entityId, userId, action, date range)
    - Create `apps/api/src/laboratory/audit/audit.controller.ts` at `/api/v1/audit-logs`
    - Apply role guard (ADMIN, SUPER_ADMIN)
    - _Requirements: FR13.1, FR13.2, FR13.3, FR13.4, FR13.5_

  - [x] 1.8 Write property tests for Audit Log
    - **Property 16: Audit Log Sensitive Field Exclusion**
    - **Property 17: Audit Log Creation on Tracked Entities**
    - Create `apps/api/src/laboratory/audit/tests/audit.property.spec.ts`
    - Use fast-check to generate arbitrary entity mutations and verify no sensitive fields in logs
    - Verify exactly one audit record created per tracked entity mutation
    - **Validates: Requirements FR13.1, FR13.2**

- [x] 2. Checkpoint - Phase A complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase B: Order Creation, Payment & Tariff Resolution
  - [x] 3.1 Implement TariffResolverService
    - Create `apps/api/src/laboratory/order/tariff-resolver.service.ts`
    - Implement priority-based tariff lookup: specific (clinic+insurance) → clinic-only → insurance-only → default → TestMaster.price fallback
    - Implement `resolvePrice(testId, clinicId?, insuranceId?)` returning TariffResult
    - Implement `resolveOrderTotal(testIds[], clinicId?, insuranceId?)` returning OrderPricing with subtotal, totalDiscount, totalAmount
    - _Requirements: FR2.4, FR4.3_

  - [x] 3.2 Write property tests for Tariff Resolution
    - **Property 3: Tariff Resolution Priority**
    - **Property 4: Order Total Equals Sum of Parts**
    - Create `apps/api/src/laboratory/order/tests/tariff-resolver.property.spec.ts`
    - Use fast-check to generate tariff records at different specificity levels and verify most-specific always wins
    - Verify totalAmount === sum of all individual finalPrice values
    - **Validates: Requirements FR2.4, FR4.3**

  - [x] 3.3 Implement OrderModule with order creation
    - Create `apps/api/src/laboratory/order/order.module.ts`
    - Create `apps/api/src/laboratory/order/order.service.ts` with create, list, get operations
    - Create `apps/api/src/laboratory/order/order.controller.ts` with endpoints at `/api/v1/orders`
    - Create DTOs: create-order.dto.ts (testIds min 1 item), order-query.dto.ts (pagination, status filter, date range)
    - Auto-generate orderNumber on creation (format: LAB-YYYYMMDD-XXXX)
    - Set initial status PENDING_PAYMENT, create OrderDetail records per testId with status PENDING
    - Validate patientId exists and not soft-deleted, validate testIds exist and active
    - Integrate TariffResolverService for billing calculation
    - Apply role guards (KASIR, ADMIN, KLINIK_PARTNER for create; all authenticated for read)
    - _Requirements: FR4.1, FR4.2, FR4.3, FR4.4, FR4.5, FR4.6, FR4.7, FR4.8_

  - [x] 3.4 Write property test for Order Creation Invariants
    - **Property 5: Order Creation Invariants**
    - Create `apps/api/src/laboratory/order/tests/order.property.spec.ts`
    - Use fast-check to generate valid order creation requests (N≥1 test IDs) and verify: status is PENDING_PAYMENT, exactly N OrderDetail records created, each with status PENDING
    - **Validates: Requirements FR4.2, FR4.6**

  - [x] 3.5 Implement PaymentModule with barcode generation
    - Install `bwip-js` dependency: `npm install bwip-js` and `npm install -D @types/bwip-js`
    - Create `apps/api/src/laboratory/payment/payment.module.ts`
    - Create `apps/api/src/laboratory/payment/payment.service.ts` with processPayment, getInvoice
    - Create `apps/api/src/laboratory/payment/barcode.service.ts` using bwip-js for Code-128 barcode generation (300 DPI, base64 PNG)
    - Create `apps/api/src/laboratory/payment/payment.controller.ts` with endpoints: POST `/api/v1/orders/:id/pay`, GET `/api/v1/orders/:id/barcode`, GET `/api/v1/orders/:id/invoice`
    - Create DTOs: process-payment.dto.ts (paymentMethod, amountPaid, notes)
    - Validate order is in PENDING_PAYMENT status before processing payment (ERR_INVALID_STATE)
    - On successful payment: update order status to PAID, generate barcode, store barcodeImage
    - Apply role guards (KASIR, ADMIN for payment; all authenticated for barcode/invoice read)
    - _Requirements: FR5.1, FR5.2, FR5.3, FR5.4, FR5.5, FR5.6, FR5.7_

  - [x] 3.6 Implement Order Cancellation
    - Add cancel endpoint to order controller: POST `/api/v1/orders/:id/cancel`
    - Create DTO: cancel-order.dto.ts (reason required)
    - Validate order is in PENDING_PAYMENT status (ERR_INVALID_STATE)
    - Transition order to CANCELLED, record cancelledBy, cancelReason, cancelledAt
    - Apply role guards (KASIR, ADMIN, SUPER_ADMIN)
    - _Requirements: FR12.1, FR12.2, FR12.3, FR12.4, FR12.5_

- [x] 4. Checkpoint - Phase B complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Phase C: Lab Workflow (Sample, Results, Verification, Approval)
  - [x] 5.1 Implement OrderStateMachineService
    - Create `apps/api/src/laboratory/lab-workflow/order-state-machine.service.ts`
    - Implement `transition(orderId, toStatus, context)` with guard conditions per state pair
    - Implement `canTransition(currentStatus, toStatus)` returning boolean
    - Implement `getValidTransitions(currentStatus)` returning array of valid next states
    - Throw custom `InvalidStateTransitionException` (extends BadRequestException) with current status, target status, and valid transitions
    - Define transition map: PENDING_PAYMENT→PAID, PENDING_PAYMENT→CANCELLED, PAID→SAMPLE_COLLECTED, SAMPLE_COLLECTED→IN_ANALYSIS, IN_ANALYSIS→VERIFIED, VERIFIED→APPROVED, VERIFIED→IN_ANALYSIS, APPROVED→NOTIFIED
    - _Requirements: FR5.3, FR6.3, FR9.4, FR10.4, FR12.3_

  - [x] 5.2 Write property test for State Machine Transitions
    - **Property 2: State Machine Transition Validity**
    - Create `apps/api/src/laboratory/lab-workflow/tests/state-machine.property.spec.ts`
    - Use fast-check to generate arbitrary (S, T) status pairs and verify transition succeeds iff (S,T) is in the valid set
    - **Validates: Requirements FR5.3, FR6.3, FR9.4, FR10.4, FR12.3**

  - [x] 5.3 Implement LabWorkflowModule - Sample Collection
    - Create `apps/api/src/laboratory/lab-workflow/lab-workflow.module.ts`
    - Create `apps/api/src/laboratory/lab-workflow/lab-workflow.service.ts`
    - Create `apps/api/src/laboratory/lab-workflow/lab-workflow.controller.ts`
    - Implement POST `/api/v1/lab/:orderId/sample` for sample confirmation
    - Create DTO: confirm-sample.dto.ts (sampleCondition enum)
    - If sampleCondition is ACCEPTABLE → transition PAID → SAMPLE_COLLECTED via state machine
    - If sampleCondition is not ACCEPTABLE → keep PAID status, record rejectionReason
    - Validate order has valid barcode
    - Implement GET `/api/v1/lab/queue` for lab queue (orders with status PAID or SAMPLE_COLLECTED, paginated)
    - Apply role guards (SAMPLING, ADMIN for sample; SAMPLING, ANALIS, DOKTER, ADMIN for queue)
    - _Requirements: FR6.1, FR6.2, FR6.3, FR6.4, FR6.5, FR6.6, FR6.7_

  - [x] 5.4 Write property test for Non-Acceptable Sample
    - **Property 9: Non-Acceptable Sample Preserves Status**
    - Create `apps/api/src/laboratory/lab-workflow/tests/sample.property.spec.ts`
    - Use fast-check to generate non-ACCEPTABLE conditions and verify order stays PAID with rejectionReason recorded
    - **Validates: Requirements FR6.4**

  - [x] 5.5 Implement AutoFlaggingService
    - Create `apps/api/src/laboratory/lab-workflow/auto-flagging.service.ts`
    - Implement `calculateFlag(resultValue, testId, patientAge, patientGender)` with reference value resolution
    - Implement priority: CRITICAL checks first (value < criticalMin or > criticalMax), then LOW (< minRef), then HIGH (> maxRef), else NORMAL
    - Implement reference value resolution: query by testId, gender match, age range match; prefer gender-specific over ALL
    - Return null flag for qualitative tests (no reference range found)
    - _Requirements: FR7.2, FR7.3, FR7.4, FR7.5, FR7.6_

  - [x] 5.6 Write property test for Auto-Flagging
    - **Property 1: Auto-Flagging Determinism**
    - Create `apps/api/src/laboratory/lab-workflow/tests/auto-flagging.property.spec.ts`
    - Use fast-check to generate arbitrary (resultValue, minRef, maxRef, criticalMin, criticalMax) with constraint criticalMin ≤ minRef and criticalMax ≥ maxRef
    - Verify exactly one flag produced according to the algorithm priority
    - **Validates: Requirements FR7.2, FR7.3, FR7.4, FR7.5, FR7.6**

  - [x] 5.7 Implement Result Entry endpoint
    - Add PUT `/api/v1/lab/:orderId/results` to lab-workflow controller
    - Create DTO: enter-results.dto.ts (array of {orderDetailId, resultValue, comment?})
    - On each result entry: invoke AutoFlaggingService to compute flag, update OrderDetail with resultValue, flag, resultEnteredAt, resultEnteredBy
    - When ALL OrderDetails have resultValue → transition SAMPLE_COLLECTED → IN_ANALYSIS via state machine
    - Apply role guards (ANALIS, ADMIN)
    - _Requirements: FR7.1, FR7.2, FR7.7, FR7.8, FR7.9_

  - [x] 5.8 Write property tests for Result Entry transitions
    - **Property 10: Verification Requires Complete Results**
    - **Property 11: All Results Entered Triggers Transition**
    - Create `apps/api/src/laboratory/lab-workflow/tests/results.property.spec.ts`
    - Use fast-check to generate orders with partial results and verify verification is rejected
    - Verify entering the last result triggers IN_ANALYSIS transition
    - **Validates: Requirements FR7.7, FR9.2**

  - [x] 5.9 Implement Delta Check endpoint
    - Add GET `/api/v1/lab/:orderId/delta-check` to lab-workflow controller
    - Query previous results for same patient + same tests, limited to 5 most recent per test, ordered by date descending
    - Return resultValue, flag, resultDate, orderNumber per historical result
    - Return empty array if no previous results exist
    - Apply role guards (ANALIS, DOKTER, ADMIN)
    - _Requirements: FR8.1, FR8.2, FR8.3, FR8.4, FR8.5_

  - [x] 5.10 Write property test for Delta Check
    - **Property 14: Delta Check Bounded Results**
    - Create `apps/api/src/laboratory/lab-workflow/tests/delta-check.property.spec.ts`
    - Use fast-check to generate N historical results (N from 0 to 20) and verify at most 5 returned, ordered by date desc
    - **Validates: Requirements FR8.2**

  - [x] 5.11 Implement Verification endpoint
    - Add POST `/api/v1/lab/:orderId/verify` to lab-workflow controller
    - Create DTO: verify-results.dto.ts (verificationNotes optional)
    - Validate all OrderDetails have resultValue (reject if incomplete)
    - Transition IN_ANALYSIS → VERIFIED via state machine
    - Record verifiedAt, verifiedBy, verificationNotes on the order
    - Apply role guards (ANALIS, ADMIN)
    - _Requirements: FR9.1, FR9.2, FR9.3, FR9.4, FR9.5, FR9.6_

  - [x] 5.12 Implement Doctor Approval endpoint
    - Add POST `/api/v1/lab/:orderId/approve` to lab-workflow controller
    - Add GET `/api/v1/lab/approval-queue` listing orders in VERIFIED status
    - Create DTO: approve-order.dto.ts (decision: APPROVE|REJECT, interpretation?, rejectionReason?)
    - On APPROVE: transition VERIFIED → APPROVED, record approvedAt, approvedBy, interpretation
    - On REJECT: transition VERIFIED → IN_ANALYSIS, record rejectedReason
    - Implement auto-approval: if ALL tests in order have requiresDoctorApproval=false, auto-transition VERIFIED → APPROVED after verification
    - Apply role guards (DOKTER, SUPER_ADMIN)
    - _Requirements: FR10.1, FR10.2, FR10.3, FR10.4, FR10.5, FR10.6, FR10.7_

  - [x] 5.13 Write property test for Auto-Approval
    - **Property 12: Auto-Approval When No Doctor Required**
    - Create `apps/api/src/laboratory/lab-workflow/tests/approval.property.spec.ts`
    - Use fast-check to generate orders where all tests have requiresDoctorApproval=false and verify auto-transition from VERIFIED to APPROVED
    - **Validates: Requirements FR10.5**

- [x] 6. Checkpoint - Phase C complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase D: Notifications & Dashboard
  - [x] 7.1 Install BullMQ and configure queue module
    - Install dependencies: `npm install @nestjs/bullmq bullmq` in `apps/api/`
    - Add Redis connection configuration to `apps/api/src/config/env.validation.ts`
    - Add REDIS_HOST, REDIS_PORT to `.env.example`
    - Register BullModule in `apps/api/src/app.module.ts` with Redis connection
    - _Requirements: FR11.1_

  - [x] 7.2 Implement NotificationModule with BullMQ processors
    - Create `apps/api/src/laboratory/notification/notification.module.ts`
    - Create `apps/api/src/laboratory/notification/notification.service.ts` with enqueue logic
    - Create `apps/api/src/laboratory/notification/pdf-generator.service.ts` for PDF report generation (patient name, MRN, order date, results with flags, reference ranges, interpretation, approval timestamp)
    - Create `apps/api/src/laboratory/notification/email.service.ts` for email delivery
    - Create `apps/api/src/laboratory/notification/whatsapp.service.ts` for WhatsApp delivery
    - Create `apps/api/src/laboratory/notification/notification.processor.ts` as BullMQ worker
    - Configure 3 queues: `lab-pdf-generation` (concurrency 3, 3 retries), `lab-email-delivery` (concurrency 5, 3 retries), `lab-whatsapp-delivery` (concurrency 2, 3 retries)
    - Implement notification flow: on APPROVED → check consent → generate PDF → enqueue email/WhatsApp
    - On all notifications SENT → transition APPROVED → NOTIFIED
    - On no consent → skip, keep APPROVED status
    - Validate WhatsApp phone (prefix 62 or 08)
    - _Requirements: FR11.1, FR11.2, FR11.3, FR11.4, FR11.5, FR11.6, FR11.7_

  - [x] 7.3 Write property test for WhatsApp Phone Validation
    - **Property 13: WhatsApp Phone Validation**
    - Create `apps/api/src/laboratory/notification/tests/notification.property.spec.ts`
    - Use fast-check to generate arbitrary phone strings and verify valid iff starts with "62" or "08"
    - **Validates: Requirements FR11.3**

  - [x] 7.4 Implement DashboardModule
    - Create `apps/api/src/laboratory/dashboard/dashboard.module.ts`
    - Create `apps/api/src/laboratory/dashboard/dashboard.service.ts`
    - Create `apps/api/src/laboratory/dashboard/dashboard.controller.ts`
    - Implement GET `/api/v1/dashboard/lab-summary`: total orders today, orders by status, average TAT, pending approval count
    - Implement GET `/api/v1/dashboard/lab-volume`: order volume grouped by day for configurable date range (default 30 days)
    - TAT calculation: approvedAt minus sampleCollectedAt in minutes
    - Implement queue counts per status (PAID, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED) for operational monitoring
    - Apply role guards (OWNER, MANAGER, ADMIN, SUPER_ADMIN)
    - _Requirements: FR14.1, FR14.2, FR14.3, FR14.4, FR14.5_

  - [x] 7.5 Write property test for TAT Calculation
    - **Property 15: TAT Calculation Correctness**
    - Create `apps/api/src/laboratory/dashboard/tests/dashboard.property.spec.ts`
    - Use fast-check to generate arbitrary sampleCollectedAt and approvedAt timestamps and verify TAT equals difference in minutes
    - **Validates: Requirements FR14.2**

- [x] 8. Checkpoint - Phase D complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Phase E: Frontend Laboratory UI
  - [x] 9.1 Create laboratory page layout and navigation
    - Create `apps/web/src/app/(dashboard)/laboratory/layout.tsx` with sub-navigation for Queue, Results, Approval, Dashboard
    - Create shared lab components directory `apps/web/src/components/laboratory/`
    - Implement RBAC-based navigation rendering (show only screens available to current user role)
    - Follow Calm Medical Experience design system: Sage Green + Muted Olive palette, Bento Grid layout
    - _Requirements: FR15.5, FR15.6_

  - [x] 9.2 Implement Lab Queue screen
    - Create `apps/web/src/app/(dashboard)/laboratory/queue/page.tsx`
    - Display orders ready for processing in a table/card view
    - Add status filter tabs (PAID, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED)
    - Show barcode info and patient details on order selection
    - Add pagination and search functionality
    - Integrate with GET `/api/v1/lab/queue` API
    - _Requirements: FR15.1, FR15.4_

  - [x] 9.3 Implement Result Entry form
    - Create `apps/web/src/app/(dashboard)/laboratory/results/[orderId]/page.tsx`
    - Display test parameters with input fields for result values
    - Show auto-calculated flags with color coding (green=NORMAL, yellow=HIGH/LOW, red=CRITICAL)
    - Display delta check values alongside current results
    - Add verification action button for ANALIS role
    - Integrate with PUT `/api/v1/lab/:orderId/results` and GET `/api/v1/lab/:orderId/delta-check`
    - _Requirements: FR15.2_

  - [x] 9.4 Implement Doctor Approval screen
    - Create `apps/web/src/app/(dashboard)/laboratory/approval/page.tsx`
    - Display orders in VERIFIED status with test results and flags
    - Show interpretation text field for clinical notes
    - Add Approve and Reject action buttons with confirmation dialogs
    - Integrate with GET `/api/v1/lab/approval-queue` and POST `/api/v1/lab/:orderId/approve`
    - _Requirements: FR15.3_

  - [x] 9.5 Implement Laboratory Dashboard screen
    - Create `apps/web/src/app/(dashboard)/laboratory/dashboard/page.tsx`
    - Display summary metrics: total orders today, orders by status, average TAT, pending approvals
    - Add volume chart showing order trends over time (configurable date range)
    - Display real-time queue counts per status
    - Integrate with GET `/api/v1/dashboard/lab-summary` and GET `/api/v1/dashboard/lab-volume`
    - _Requirements: FR14.1, FR14.3, FR14.5_

- [x] 10. Final Checkpoint - All phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements (FR) for traceability
- Property tests validate the 17 correctness properties defined in the design document
- The existing auth infrastructure (JWT guards, roles decorator, Prisma module) is already in place
- BullMQ requires a Redis instance — add REDIS_HOST/REDIS_PORT to environment configuration
- `bwip-js` is needed for barcode generation in Phase B
- All APIs follow the existing response envelope pattern: `{ success, message, data }` or `{ success, errorCode, message, errors, traceId }`
- Soft deletes are used for TestMaster, Panel, TestCategory, Patient to preserve referential integrity
- The OrderStateMachineService is the single source of truth for all order status transitions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.7"] },
    { "id": 2, "tasks": ["1.3", "1.5", "1.8"] },
    { "id": 3, "tasks": ["1.4", "1.6"] },
    { "id": 4, "tasks": ["3.1"] },
    { "id": 5, "tasks": ["3.2", "3.3"] },
    { "id": 6, "tasks": ["3.4", "3.5", "3.6"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2", "5.3", "5.5"] },
    { "id": 9, "tasks": ["5.4", "5.6", "5.7", "5.9"] },
    { "id": 10, "tasks": ["5.8", "5.10", "5.11"] },
    { "id": 11, "tasks": ["5.12", "5.13"] },
    { "id": 12, "tasks": ["7.1"] },
    { "id": 13, "tasks": ["7.2", "7.4"] },
    { "id": 14, "tasks": ["7.3", "7.5"] },
    { "id": 15, "tasks": ["9.1"] },
    { "id": 16, "tasks": ["9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
