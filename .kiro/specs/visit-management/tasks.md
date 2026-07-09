# Implementation Plan: Visit Management Module

## Overview

Implement the Visit Management module for eLIS following a phased approach: Phase A (Database Schema & Visit Module Foundation), Phase B (Visit Service — CRUD, Status Machine, Payment Validation), Phase C (Visit Number Generation & Audit Integration), Phase D (Query/Search & Property Tests), and Phase E (Frontend Visit UI). Each phase builds on the previous, with property-based tests inline to catch errors early.

## Tasks

- [x] 1. Phase A: Database Schema & Module Foundation
  - [x] 1.1 Create Prisma schema migration for Visit models
    - Add `VisitStatus` enum to `apps/api/prisma/schema.prisma` with values: REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED
    - Add `BPJS` variant to existing `PaymentMethod` enum (alongside CASH, TRANSFER, INSURANCE)
    - Add `Visit` model with all columns as defined in design: id (UUID PK), visitNumber (String unique @db.VarChar(50)), status (VisitStatus default REGISTERED), registrationDate (DateTime default now()), patientId (UUID non-nullable FK), doctorId (UUID nullable FK), clinicId (UUID nullable FK), paymentMethod (PaymentMethod non-nullable), insuranceId (UUID nullable FK), bpjsNumber (String? @db.VarChar(20)), cancelledAt (DateTime?), cancelReason (String?), createdAt, updatedAt
    - Add `VisitSequence` model: id (String PK, format "YYYYMM"), lastValue (Int default 0), mapped to `visit_sequences` table
    - Add `visitId` nullable UUID FK column to existing `Order` model referencing `visits.id`
    - Add `visits` relation to Patient, Doctor, Clinic, Insurance models
    - Add `@@index([status])` and `@@index([patientId, registrationDate])` on Visit model
    - Run `npx prisma migrate dev --name add_visit_management` to generate the migration
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

  - [x] 1.2 Create VisitModule structure and DTOs
    - Create `apps/api/src/laboratory/visit/visit.module.ts` importing AuditModule, referencing PrismaModule
    - Create `apps/api/src/laboratory/visit/visit.controller.ts` with route prefix `api/v1/visits`
    - Create `apps/api/src/laboratory/visit/visit.service.ts` skeleton with constructor injecting PrismaService, VisitNumberGeneratorService, AuditService
    - Create `apps/api/src/laboratory/visit/visit-number-generator.service.ts` skeleton
    - Create DTOs in `apps/api/src/laboratory/visit/dto/`:
      - `create-visit.dto.ts`: patientId (UUID required), paymentMethod (enum required), doctorId (UUID optional), clinicId (UUID optional), insuranceId (UUID optional), bpjsNumber (string optional, @Matches(/^\d{13}$/))
      - `update-visit.dto.ts`: paymentMethod (optional), doctorId (optional), clinicId (optional), insuranceId (optional), bpjsNumber (optional)
      - `cancel-visit.dto.ts`: reason (string, @MinLength(1))
      - `visit-query.dto.ts`: page (optional int min 1), limit (optional int min 1 max 100), search (optional string), status (optional VisitStatus enum), startDate (optional date string), endDate (optional date string), doctorId (optional UUID), clinicId (optional UUID)
    - Register VisitModule in `apps/api/src/laboratory/laboratory.module.ts`
    - _Requirements: 1.1, 1.9, 10.1, 10.2, 10.3, 10.9_

- [x] 2. Checkpoint - Phase A complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase B: Visit Service — Core CRUD & Business Logic
  - [x] 3.1 Implement VisitNumberGeneratorService
    - Implement `generate()` method in `apps/api/src/laboratory/visit/visit-number-generator.service.ts`
    - Use SERIALIZABLE transaction isolation (same pattern as `mrn-generator.service.ts`)
    - UPSERT on `visit_sequences` table with atomic increment
    - Format: `VST-YYYYMM-XXXX` where XXXX is zero-padded sequential number
    - Throw `InternalServerErrorException` with ERR_INTERNAL if sequence reaches 9999
    - Implement retry logic on P0001 serialization failure (one retry)
    - Implement static `parse(visitNumber)` method returning `{ year, month, sequence }` or null
    - Implement static `format(year, month, sequence)` method returning formatted string
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Write property test for Visit Number Round-Trip
    - **Property 1: Visit Number Round-Trip**
    - Create `apps/api/src/laboratory/visit/tests/visit-number.property.spec.ts`
    - Use fast-check to generate arbitrary year (2020–2099), month (1–12), sequence (1–9999)
    - Format into visit number string, parse back, and verify round-trip produces original
    - **Validates: Requirements 2.4**

  - [x] 3.3 Implement Visit creation logic in VisitService
    - Implement `create(dto, userId, ipAddress)` in `apps/api/src/laboratory/visit/visit.service.ts`
    - Validate patient exists and is not soft-deleted (query patients table where id = patientId AND deletedAt IS NULL)
    - Validate doctor exists and is active if doctorId is provided
    - Validate clinic exists and is active if clinicId is provided
    - Validate insurance exists, is active, and not deleted if insuranceId is provided
    - Implement `validatePaymentFields(dto)`: BPJS requires bpjsNumber matching /^\d{13}$/; INSURANCE requires valid insuranceId; CASH ignores both fields
    - Call VisitNumberGeneratorService.generate() to get unique visit number
    - Create Visit record with status REGISTERED via Prisma
    - Call AuditService.log(userId, 'CREATE', 'Visit', visit.id, null, visitData, ipAddress)
    - Return created visit with patient, doctor, clinic, insurance relations included
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.1_

  - [x] 3.4 Write property tests for Visit Creation
    - **Property 2: Visit Creation Produces REGISTERED Status**
    - **Property 3: BPJS Number Validation**
    - **Property 4: CASH Payment Ignores Insurance Fields**
    - Create `apps/api/src/laboratory/visit/tests/visit-creation.property.spec.ts`
    - Property 2: Generate valid CreateVisitDto with existing patient, verify status is REGISTERED and visitNumber matches format
    - Property 3: Generate arbitrary strings for bpjsNumber with paymentMethod BPJS, verify success iff /^\d{13}$/ matches
    - Property 4: Generate CASH payment DTOs with random bpjsNumber/insuranceId values, verify creation always succeeds
    - **Validates: Requirements 1.1, 1.5, 3.1, 4.2, 4.4, 4.5**

  - [x] 3.5 Implement Visit update logic in VisitService
    - Implement `update(id, dto, userId, ipAddress)` in visit.service.ts
    - Validate visit exists (NotFoundException if not found)
    - Validate visit is in REGISTERED or IN_PROGRESS status (reject with ERR_INVALID_STATE for COMPLETED/CANCELLED)
    - Ensure visitNumber, patientId, registrationDate remain unchanged regardless of DTO content
    - Re-validate payment fields if paymentMethod changes (apply same rules as creation: BPJS→require bpjsNumber, INSURANCE→require insuranceId)
    - Re-validate doctor/clinic/insurance references if provided
    - Call AuditService.log(userId, 'UPDATE', 'Visit', visit.id, oldValues, newValues, ipAddress)
    - Return updated visit with relations
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.2_

  - [x] 3.6 Write property tests for Visit Update
    - **Property 8: Immutable Fields on Update**
    - **Property 9: Updates Only Allowed on Non-Terminal Visits**
    - Create `apps/api/src/laboratory/visit/tests/visit-update.property.spec.ts`
    - Property 8: Generate arbitrary update DTOs (even with visitNumber/patientId/registrationDate), verify those fields remain unchanged
    - Property 9: Generate updates on COMPLETED/CANCELLED visits → rejected; on REGISTERED/IN_PROGRESS → accepted
    - **Validates: Requirements 2.3, 7.1, 7.2, 7.3**

  - [x] 3.7 Implement Visit cancellation logic in VisitService
    - Implement `cancel(id, dto, userId, ipAddress)` in visit.service.ts
    - Validate visit exists
    - Validate visit is in REGISTERED or IN_PROGRESS status
    - If visit has orders: validate ALL orders are in PENDING_PAYMENT status (otherwise reject with ERR_INVALID_STATE listing blocking order IDs)
    - Transition status to CANCELLED, record cancelledAt (now), cancelReason (from dto)
    - Call AuditService.log(userId, 'CANCEL', 'Visit', visit.id, null, { cancelReason, cancelledAt }, ipAddress)
    - Return updated visit
    - _Requirements: 3.5, 3.6, 3.7, 3.8, 12.3_

  - [x] 3.8 Implement Visit status transition helpers
    - Implement `transitionToInProgress(visitId)` — called by Order module when an order is created under this visit
    - If visit is REGISTERED → update to IN_PROGRESS
    - If visit is already IN_PROGRESS → no-op (idempotent)
    - Implement `evaluateCompletion(visitId)` — called by Order module when an order reaches a terminal state
    - Query all orders under the visit; if ALL are in NOTIFIED or CANCELLED → transition to COMPLETED
    - Implement private `validateStatusTransition(current, target)` using explicit transition map from design
    - _Requirements: 3.2, 3.3, 3.4, 3.7, 3.8_

  - [x] 3.9 Write property tests for Visit Status
    - **Property 5: Status Transition Enforcement**
    - **Property 6: Order Addition Transitions to IN_PROGRESS (Idempotent)**
    - **Property 7: Cancellation Precondition**
    - Create `apps/api/src/laboratory/visit/tests/visit-status.property.spec.ts`
    - Property 5: Generate all (current, target) pairs from VisitStatus, verify transition succeeds iff in allowed set
    - Property 6: Generate visits in REGISTERED or IN_PROGRESS, simulate order add, verify result is IN_PROGRESS
    - Property 7: Generate visits with varying order statuses, verify cancellation succeeds iff no orders OR all PENDING_PAYMENT
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6, 3.7, 3.8**

- [x] 4. Checkpoint - Phase B complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Phase C: Controller, Query/Search & Order Linkage
  - [x] 5.1 Implement VisitController endpoints
    - Implement `POST /api/v1/visits` with guards `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.KASIR, Role.CS, Role.ADMIN, Role.KLINIK_PARTNER, Role.SUPER_ADMIN)`
    - Implement `GET /api/v1/visits` with guard `@UseGuards(JwtAuthGuard)` (all authenticated users)
    - Implement `GET /api/v1/visits/:id` with guard `@UseGuards(JwtAuthGuard)` — returns visit with associated orders
    - Implement `PUT /api/v1/visits/:id` with guards for roles KASIR, CS, ADMIN, SUPER_ADMIN
    - Implement `POST /api/v1/visits/:id/cancel` with guards for roles KASIR, ADMIN, SUPER_ADMIN
    - Use `@CurrentUser()` decorator for user context and `@Req()` for IP extraction (X-Forwarded-For or remoteAddress)
    - All responses follow standard envelope: `{ success: true, message, data }` or error envelope
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [x] 5.2 Implement Visit query and search logic in VisitService
    - Implement `findAll(query)` with pagination: default page=1, limit=20, max limit=100
    - Implement search filter: case-insensitive partial match on patient.name, patient.mrn, OR visitNumber using Prisma `contains` with `mode: 'insensitive'`
    - Implement status filter: match exact VisitStatus enum value
    - Implement date range filter: registrationDate >= startDate AND <= endDate (inclusive)
    - Implement doctor filter: match doctorId
    - Implement clinic filter: match clinicId
    - Return visits with included relations (patient name+MRN, doctor name, clinic name)
    - Default sort: registrationDate descending
    - Return pagination metadata: `{ data, total, page, limit, totalPages }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x] 5.3 Implement Visit findById with orders
    - Implement `findById(id)` returning visit details with associated orders
    - Include orders with: id, orderNumber, status, createdAt
    - Throw NotFoundException if visit ID does not exist
    - _Requirements: 6.5, 10.4_

  - [x] 5.4 Implement Visit-Order linkage validation
    - Add validation in existing Order creation flow (or expose a method for the Order module to call)
    - When an order is created with a visitId: validate visit exists, is not deleted, and is in REGISTERED or IN_PROGRESS status
    - Reject with ERR_NOT_FOUND if visit doesn't exist
    - Reject with ERR_INVALID_STATE if visit is CANCELLED or COMPLETED
    - After order creation: call `visitService.transitionToInProgress(visitId)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.5 Write property tests for Query and Search
    - **Property 10: Query Filter Correctness**
    - **Property 11: Pagination Invariants**
    - **Property 13: Search Results Relevance**
    - Create `apps/api/src/laboratory/visit/tests/visit-query.property.spec.ts`
    - Property 10: Generate datasets with random filters, verify all returned visits satisfy every applied predicate
    - Property 11: Generate N visits and (page, limit) params, verify data.length <= limit, total == N, totalPages == ceil(N/limit)
    - Property 13: Generate search terms, verify all results have patient name, MRN, or visitNumber containing the term
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [x] 5.6 Write property test for Audit Log Completeness
    - **Property 12: Audit Log Completeness**
    - Create `apps/api/src/laboratory/visit/tests/visit-audit.property.spec.ts`
    - For each mutating operation (create, update, cancel), verify: audit log entry exists with correct action, entityName "Visit", visit ID, non-null userId, and no SENSITIVE_FIELDS keys in oldValues/newValues
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [x] 6. Checkpoint - Phase C complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase D: Frontend Visit UI
  - [x] 7.1 Create Visit Registration page
    - Implement patient search/selection component with debounced input (300ms, min 2 chars)
    - Display patient summary (name, MRN, DOB, gender) as read-only section after selection
    - Add form fields: doctor selection (searchable dropdown), clinic selection (searchable dropdown), payment method (required)
    - Conditionally show BPJS number field (13-digit validation) when BPJS selected
    - Conditionally show insurance provider dropdown when INSURANCE selected
    - Show generated Visit_Number as confirmation on success
    - Disable submit button + loading indicator during API call to prevent duplicates
    - Display inline validation errors on failure without losing form state
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8, 11.9_

  - [x] 7.2 Create Visit List page with search and filters
    - Implement visit list table with pagination (default page size 20)
    - Add search input filtering by patient name, MRN, or visit number
    - Add status filter (tabs or dropdown for REGISTERED, IN_PROGRESS, COMPLETED, CANCELLED)
    - Add date range filter for registration date
    - Sort by registration date descending by default
    - Integrate with GET `/api/v1/visits` API
    - _Requirements: 11.7_

- [x] 8. Final Checkpoint - All phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate the 13 correctness properties defined in the design document
- The existing auth infrastructure (JWT guards, roles decorator, Prisma module) is already in place
- VisitNumberGeneratorService follows the same SERIALIZABLE transaction + UPSERT pattern as MrnGeneratorService
- AuditService.log() is called explicitly in service methods (same pattern as existing modules)
- The PaymentMethod enum needs the `BPJS` variant added — existing `TRANSFER` variant remains for backward compatibility with orders
- Visit-Order linkage is additive: existing orders without a visitId continue to function
- All APIs follow the existing response envelope: `{ success, message, data }` or `{ success, errorCode, message, errors, traceId }`
- Frontend tasks are high-level since the exact component library usage follows established Next.js + shadcn/ui patterns

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5", "3.7", "3.8"] },
    { "id": 5, "tasks": ["3.6", "3.9"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 7, "tasks": ["5.4", "5.5", "5.6"] },
    { "id": 8, "tasks": ["7.1", "7.2"] }
  ]
}
```
