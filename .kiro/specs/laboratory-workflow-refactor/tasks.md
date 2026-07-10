# Implementation Plan: Laboratory Workflow Refactor — Mandatory Visit Linkage

## Overview

This plan implements the mandatory Visit linkage on all laboratory orders. The approach is incremental: first build the centralized validation guard, then update the API layer and service, add the migration service for legacy data, update the frontend to a visit-first flow, and finally apply the schema migration. Property-based tests validate correctness properties throughout.

## Tasks

- [x] 1. Implement OrderValidationGuard and update CreateOrderDto
  - [x] 1.1 Create OrderValidationGuard service
    - Create `apps/api/src/laboratory/order/order-validation.guard.ts`
    - Implement `validate(visitId: string, patientId: string): Promise<void>` method
    - Validation sequence: (a) visitId presence + UUID format check, (b) Visit existence query, (c) Visit status is REGISTERED or IN_PROGRESS, (d) Visit.patientId matches patientId
    - Throw `BadRequestException` with ERR_VALIDATION for format/presence/patient-mismatch failures
    - Throw `NotFoundException` with ERR_NOT_FOUND for non-existent visits
    - Throw `BadRequestException` with ERR_INVALID_STATE for terminal visit statuses
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 1.2 Update CreateOrderDto to make visitId required
    - Modify `apps/api/src/laboratory/order/dto/create-order.dto.ts`
    - Remove `@IsOptional()` from `visitId` field
    - Keep `@IsUUID()` decorator, making it a required field
    - _Requirements: 1.2, 4.1, 4.2_

  - [x] 1.3 Update OrderService.create() to use OrderValidationGuard
    - Modify `apps/api/src/laboratory/order/order.service.ts`
    - Inject `OrderValidationGuard` into constructor
    - Replace existing `if (dto.visitId)` block with `await this.orderValidationGuard.validate(dto.visitId, dto.patientId)` as the FIRST step
    - Change order creation to use `visitId: dto.visitId` (non-null) instead of `visitId: dto.visitId ?? null`
    - _Requirements: 1.1, 1.5, 5.3, 9.7_

  - [x] 1.4 Register OrderValidationGuard in OrderModule
    - Modify `apps/api/src/laboratory/order/order.module.ts`
    - Add `OrderValidationGuard` to providers and exports
    - _Requirements: 9.1_

  - [x] 1.5 Write property tests for OrderValidationGuard
    - Create `apps/api/src/laboratory/order/tests/order-validation-guard.property.spec.ts`
    - **Property 2: Invalid or Missing visitId Always Rejected** — generate arbitrary non-UUID strings, null, undefined, empty; assert ERR_VALIDATION thrown and no DB write
    - **Property 3: Non-Existent Visit Always Rejected** — generate valid UUIDs not in DB; assert ERR_NOT_FOUND thrown
    - **Property 4: Terminal Visit Status Rejects Order Creation** — generate visits in CANCELLED/COMPLETED; assert ERR_INVALID_STATE thrown
    - **Property 5: Patient Mismatch Between Order and Visit Rejected** — generate mismatched patientId pairs; assert ERR_VALIDATION thrown
    - **Property 12: Validation Guard Ordering** — generate requests with multiple failures; assert first-in-sequence error returned
    - **Validates: Requirements 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 5.1, 5.2, 9.2, 9.3, 9.4, 9.5, 9.6**

- [x] 2. Checkpoint - Ensure OrderValidationGuard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Update API response and query layer for visit information
  - [x] 3.1 Update OrderService response to include Visit details
    - Modify `apps/api/src/laboratory/order/order.service.ts` `findAll()` and `findById()` methods
    - Include `visit: { select: { visitNumber: true, status: true } }` in Prisma includes
    - Ensure created order response also includes visit visitNumber and status
    - _Requirements: 4.4, 4.5, 6.5_

  - [x] 3.2 Add visitId filter to OrderQueryDto
    - Modify `apps/api/src/laboratory/order/dto/order-query.dto.ts`
    - Add `@IsOptional() @IsUUID() visitId?: string` field
    - Update `OrderService.findAll()` to filter by `visitId` when provided in query
    - _Requirements: 10.4_

  - [x] 3.3 Add GET /api/v1/visits/:id/orders endpoint
    - Modify `apps/api/src/laboratory/visit/visit.controller.ts` — add `@Get(':id/orders')` handler
    - Implement `VisitService.findOrdersByVisit(visitId, query)` method in `visit.service.ts`
    - Paginated response (default 20, max 100) with meta (total, page, limit, totalPages)
    - Return 404 if visit not found, empty data array if no orders
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [x] 3.4 Write property tests for visit-based order query
    - Create `apps/api/src/laboratory/order/tests/order-query.property.spec.ts`
    - **Property 11: API Response Includes Visit Information** — for any created order with non-null visitId, response SHALL include visitNumber and status
    - **Property 13: Visit-Based Order Query Filter Correctness** — for any visit with N orders, paginated query returns correct subset and meta
    - **Validates: Requirements 4.4, 4.5, 6.5, 10.1, 10.2, 10.4**

- [x] 4. Implement LabWorkflowService traceability chain enforcement
  - [x] 4.1 Add visitId presence checks to lab workflow operations
    - Modify `apps/api/src/laboratory/lab-workflow/lab-workflow.service.ts`
    - In `confirmSample()`: after order fetch, verify `order.visitId != null` — throw BadRequestException if null
    - In `enterResults()`: after order fetch, verify `order.visitId != null` — throw BadRequestException if null
    - In `verifyResults()`: after order fetch, verify `order.visitId != null` — throw BadRequestException if null
    - In `approveOrder()`: after order fetch, verify `order.visitId != null` — throw BadRequestException if null
    - Include visitId in error messages for traceability audit
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 4.2 Write unit tests for traceability chain enforcement
    - Create or update `apps/api/src/laboratory/lab-workflow/tests/traceability.spec.ts`
    - Test confirmSample rejects when order.visitId is null
    - Test enterResults rejects when order.visitId is null
    - Test verifyResults rejects when order.visitId is null
    - Test approveOrder rejects when order.visitId is null
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Checkpoint - Ensure API layer and traceability tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement MigrationService for legacy orders
  - [x] 6.1 Create MigrationService
    - Create `apps/api/src/laboratory/order/migration.service.ts`
    - Inject `PrismaService`, `VisitNumberGeneratorService`, `AuditService`
    - Implement `getMigrationReport(): Promise<MigrationReport>` — counts orders with NULL visitId, groups by (patientId, date)
    - Implement `runLegacyMigration(userId: string): Promise<MigrationReport>`:
      - Run within a single `prisma.$transaction()`
      - Group legacy orders by (patientId, truncate-to-date(createdAt))
      - For each group: create synthetic Visit (status COMPLETED, paymentMethod CASH, registrationDate from order createdAt)
      - Use VisitNumberGeneratorService.generate() with order's month as reference
      - Update all orders in group: SET visitId = syntheticVisit.id
      - After all groups: verify COUNT(orders WHERE visitId IS NULL) == 0, rollback if not
      - Log audit entry for each synthetic visit with action "MIGRATION" and linked order IDs
      - Log initial "MIGRATION_REPORT" audit entry before migration begins
    - Return `MigrationReport` with totalAffectedOrders, distinctPatientDateGroups, syntheticVisitsCreated, ordersMigrated, status
    - Handle zero-rows case: return NOT_NEEDED without creating visits
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 6.2 Create MigrationController or CLI command
    - Create `apps/api/src/laboratory/order/migration.controller.ts`
    - Add `POST /api/v1/admin/migrations/legacy-orders` endpoint (SUPER_ADMIN role only)
    - Add `GET /api/v1/admin/migrations/legacy-orders/report` endpoint for dry-run report
    - Register in OrderModule
    - _Requirements: 3.1_

  - [x] 6.3 Write property tests for MigrationService
    - Create `apps/api/src/laboratory/order/tests/migration-service.property.spec.ts`
    - **Property 7: Schema Migration Precondition Enforcement** — when NULL visitId count > 0 and schema migration attempted, abort without changes
    - **Property 8: Legacy Order Migration Grouping and Completeness** — one synthetic visit per (patientId, date) group; all orders migrated; zero NULLs remaining
    - **Property 9: Synthetic Visit Number Month Reference** — visit number format VST-YYYYMM-XXXX uses earliest order's createdAt month
    - **Property 10: Migration Audit Log Completeness** — N synthetic visits → N audit entries with correct order ID arrays
    - **Validates: Requirements 2.2, 2.5, 3.1, 3.2, 3.3, 3.4, 3.6**

- [x] 7. Checkpoint - Ensure migration service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create Prisma schema migration (nullable → non-nullable)
  - [x] 8.1 Create Prisma migration file for visitId NOT NULL constraint
    - Modify `apps/api/prisma/schema.prisma`: change `visitId String? @db.Uuid` to `visitId String @db.Uuid` on Order model
    - Change `visit Visit?` relation to `visit Visit` with `onDelete: Restrict`
    - Generate migration via `npx prisma migrate dev --create-only --name make_visit_id_required`
    - Add a pre-check comment in the generated SQL noting the prerequisite: legacy migration must complete first
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 9. Update frontend order creation flow
  - [x] 9.1 Create visit search/selection component
    - Create `apps/web/src/components/orders/visit-selector.tsx`
    - Implement search input (minimum 3 characters before search fires)
    - Call `GET /api/v1/visits?search=X&status=REGISTERED&status=IN_PROGRESS` for filtering
    - Display max 20 results showing visitNumber, patient name, MRN, registration date
    - On selection: emit selected visit with patient data
    - _Requirements: 7.1, 7.4_

  - [x] 9.2 Create inline visit creation dialog
    - Create `apps/web/src/components/orders/inline-visit-create.tsx`
    - Minimal form: patient selection + payment method (required fields only)
    - Call `POST /api/v1/visits` on submit
    - On success: auto-select the newly created visit in the parent selector
    - _Requirements: 7.6_

  - [x] 9.3 Refactor order creation page to visit-first multi-step flow
    - Modify or create `apps/web/src/app/dashboard/orders/create/page.tsx`
    - Step 1: Visit selection (mandatory) — uses visit-selector component + inline create option
    - Step 2: Test selection (enabled only after visit selected) — auto-populate patient from visit
    - Step 3: Review & Submit
    - Disable submit button when no visit is selected; show message instructing visit selection first
    - On visit change: clear selected tests and form state
    - Include visitId in POST /api/v1/orders request payload
    - On API error: display toast, preserve form state
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.7, 7.8_

  - [x] 9.4 Write property tests for visit search filter
    - Create `apps/api/src/laboratory/visit/tests/visit-search.property.spec.ts`
    - **Property 14: Visit Search Filter Correctness** — for any 3+ char search term, results contain only REGISTERED/IN_PROGRESS visits matching term in visitNumber, patient name, or MRN; max 20 results
    - **Validates: Requirements 7.4**

- [x] 10. Implement order creation property tests and integration wiring
  - [x] 10.1 Write property tests for order creation with valid visit
    - Create `apps/api/src/laboratory/order/tests/order-creation.property.spec.ts`
    - **Property 1: Order Creation Persists Non-Null Visit Reference** — for valid dto with existing visit in REGISTERED/IN_PROGRESS, created order has non-null visitId equal to dto.visitId
    - **Property 6: Visit Transitions to IN_PROGRESS on Order Creation (Idempotent)** — after order creation, visit status is IN_PROGRESS regardless of whether it was REGISTERED or already IN_PROGRESS
    - **Validates: Requirements 1.1, 1.5, 1.6**

  - [x] 10.2 Add deprecation warning log for missing visitId requests
    - In `OrderController` or a validation interceptor: if request reaches validation without visitId, log a WARNING with userId and timestamp before the 400 rejection
    - Update OpenAPI/Swagger annotations: mark visitId as required with description and UUID example
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The schema migration (task 8.1) MUST only be applied AFTER the data migration (task 6.1) has been successfully run in the target environment
- Frontend tasks (9.x) can be developed in parallel with backend tasks after the API contract is stable (tasks 1–3)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["1.5", "3.2"] },
    { "id": 3, "tasks": ["3.1", "3.3", "4.1"] },
    { "id": 4, "tasks": ["3.4", "4.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["8.1", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "9.4"] },
    { "id": 8, "tasks": ["10.1", "10.2"] }
  ]
}
```
