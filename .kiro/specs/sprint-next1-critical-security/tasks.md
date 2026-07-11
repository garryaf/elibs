# Implementation Plan: Sprint Next-1 Critical Security & Data Integrity

## Overview

This plan implements 9 P1/CRITICAL items spanning security (privilege escalation, data-scope isolation, self-delete prevention), data integrity (soft-delete guards, discount persistence, clinical notes), and UX (visit detail page, order pagination). Tasks are grouped by domain and ordered to ensure schema changes land first, followed by backend security, backend data integrity, frontend, and finally test fixes.

## Tasks

- [x] 1. Prisma schema migration and model changes
  - [x] 1.1 Add `clinicId` to User model and `discountAmount`/`discountReason`/`notes` to Order model
    - Add `clinicId String? @db.Uuid` field to User model with relation to Clinic
    - Add `users User[]` reverse relation to Clinic model
    - Add `discountAmount Decimal? @db.Decimal(12, 2)` to Order model
    - Add `discountReason String?` to Order model
    - Add `notes String?` to Order model
    - Run `prisma migrate dev --name add_user_clinicid_order_discount_notes`
    - Add partial index on `users.clinicId` WHERE clinicId IS NOT NULL
    - _Requirements: 2.1, 5.1, 5.2, 7.1_

- [x] 2. Security: Privilege escalation guard
  - [x] 2.1 Add `validateRoleEscalation` to UsersService and integrate into `create()` and `update()`
    - Add private method `validateRoleEscalation(requestingUserRole: Role, targetRole: Role)` that throws ForbiddenException when non-SUPER_ADMIN tries to assign SUPER_ADMIN
    - Modify `create()` signature to accept `requestingUser: { id: string; role: Role }` parameter
    - Call `validateRoleEscalation` at the start of `create()` before any DB mutation
    - Modify `update()` signature to accept `requestingUser: { id: string; role: Role }` parameter
    - Call `validateRoleEscalation` in `update()` only when `dto.role` is defined
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Update UsersController to pass requesting user context to service methods
    - Add `@CurrentUser() user: any` parameter to `create()` endpoint
    - Pass `{ id: user.sub, role: user.role }` to `this.usersService.create(dto, ...)`
    - Add `@CurrentUser() user: any` parameter to `update()` endpoint
    - Pass `{ id: user.sub, role: user.role }` to `this.usersService.update(id, dto, ...)`
    - Change `@Delete(':id')` decorator from `@Roles(Role.SUPER_ADMIN)` to `@Roles(Role.ADMIN, Role.SUPER_ADMIN)`
    - Add `@CurrentUser() user: any` parameter to `remove()` endpoint
    - Pass `user.sub` to `this.usersService.softDelete(id, user.sub)`
    - _Requirements: 3.5, 4.1_

  - [x] 2.3 Write property test for privilege escalation guard
    - **Property 4: Privilege escalation guard**
    - Generate arbitrary `(requestingRole, targetRole)` pairs using fc.constantFrom(Role enum values)
    - Assert: operation succeeds iff `targetRole !== SUPER_ADMIN || requestingRole === SUPER_ADMIN`
    - File: `apps/api/src/users/__tests__/privilege-escalation.property.spec.ts`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 3. Security: Self-delete and last admin protection
  - [x] 3.1 Add self-delete and last-admin guards to `UsersService.softDelete()`
    - Modify `softDelete()` signature to accept `requestingUserId: string` parameter
    - Add self-delete check: throw ForbiddenException if `id === requestingUserId`
    - Find target user and check if role is SUPER_ADMIN
    - If target is SUPER_ADMIN, count other active SUPER_ADMIN users (where `deletedAt` is null AND `id !== target`)
    - If count is 0, throw ConflictException("Cannot delete last super admin")
    - Otherwise proceed with existing soft-delete logic
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Write property tests for self-delete and last-admin protection
    - **Property 5: Self-delete prevention**
    - Generate arbitrary user IDs; assert: when requestingUserId === targetId, operation always throws 403
    - **Property 6: Last SUPER_ADMIN protection**
    - Generate arbitrary system states with varying SUPER_ADMIN counts; assert: delete succeeds iff other active SUPER_ADMINs exist
    - File: `apps/api/src/users/__tests__/self-delete-last-admin.property.spec.ts`
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 4. Checkpoint - Ensure security tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Security: DataScope interceptor for KLINIK_PARTNER isolation
  - [x] 5.1 Create DataScopeInterceptor
    - Create file `apps/api/src/common/interceptors/data-scope.interceptor.ts`
    - Implement NestInterceptor that checks `user.role === Role.KLINIK_PARTNER`
    - If KLINIK_PARTNER and `user.clinicId` is null, throw ForbiddenException("No clinic assigned to this user")
    - If KLINIK_PARTNER and clinicId exists, attach `request.dataScope = { clinicId: user.clinicId }`
    - For non-KLINIK_PARTNER roles, pass through without modification
    - _Requirements: 2.2, 2.3, 2.5, 2.6_

  - [x] 5.2 Apply DataScopeInterceptor to VisitController and OrderController
    - Add `@UseInterceptors(DataScopeInterceptor)` to VisitController
    - Modify `VisitService.findAll()` to read `request.dataScope?.clinicId` and add WHERE filter
    - Modify `VisitService.findById()` to check resource clinicId matches scope
    - Add `@UseInterceptors(DataScopeInterceptor)` to OrderController
    - Modify `OrderService.findAll()` to read `request.dataScope?.clinicId` and add WHERE filter
    - Modify `OrderService.findById()` to check resource clinicId matches scope and throw 403 if mismatched
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 5.3 Write property test for data-scope isolation
    - **Property 3: Data-scope isolation for KLINIK_PARTNER**
    - Generate datasets with multiple clinicIds; for KLINIK_PARTNER requests, assert all returned records match user's clinicId
    - Assert non-KLINIK_PARTNER requests return unfiltered results
    - File: `apps/api/src/common/interceptors/__tests__/data-scope.property.spec.ts`
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 6. Data integrity: Patient soft-delete endpoint
  - [x] 6.1 Add `softDelete()` method to PatientService and DELETE endpoint to PatientController
    - Add `AuditService` injection to PatientService constructor
    - Implement `softDelete(id, userId, ipAddress?)` method with:
      - Verify patient exists and not already deleted
      - Check for active visits (REGISTERED or IN_PROGRESS) → 409
      - Check for active orders (not COMPLETED, not CANCELLED, not NOTIFIED) → 409
      - Set `deletedAt = new Date()`
      - Log audit event
    - Add `@Delete(':id')` endpoint to PatientController with `@Roles(Role.ADMIN, Role.SUPER_ADMIN)`
    - Extract `@CurrentUser()` and `@Req()` for userId and ipAddress
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 6.2 Write property tests for patient soft-delete
    - **Property 1: Patient soft-delete is blocked by active dependencies**
    - Generate patients with varying visit/order states; assert: soft-delete rejected when active dependencies exist
    - **Property 2: Soft-deleted patients are excluded from queries**
    - Generate patient sets with some having non-null deletedAt; assert: findAll never returns soft-deleted patients
    - File: `apps/api/src/laboratory/patient/__tests__/patient-soft-delete.property.spec.ts`
    - **Validates: Requirements 1.3, 1.4**

- [x] 7. Data integrity: Discount persistence in payment
  - [x] 7.1 Add discount fields to ProcessPaymentDto and update PaymentService.processPayment()
    - Add `@IsOptional() @IsNumber() @Min(0) discountAmount?: number` to ProcessPaymentDto
    - Add `@IsOptional() @IsString() @MaxLength(500) discountReason?: string` to ProcessPaymentDto
    - Add `AuditService` injection to PaymentService constructor
    - In `processPayment()`: validate discount bounds (> 0 and <= totalAmount)
    - Calculate `finalPayable = totalAmount - discountAmount`
    - Persist `discountAmount`, `discountReason` to Order update
    - Set `amountPaid` to `finalPayable` instead of `dto.amountPaid` when discount is applied
    - Audit log discount application
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

  - [x] 7.2 Write property test for discount bounds and arithmetic
    - **Property 7: Discount bounds and arithmetic**
    - Generate arbitrary `(totalAmount, discountAmount)` pairs using fc.double
    - Assert: if 0 < discount <= total, amountPaid === total - discount; otherwise operation throws 400
    - File: `apps/api/src/laboratory/payment/__tests__/discount-bounds.property.spec.ts`
    - **Validates: Requirements 5.3, 5.4, 5.6**

- [x] 8. Data integrity: Clinical notes in order creation
  - [x] 8.1 Add `notes` field to CreateOrderDto and persist in OrderService.create()
    - Add `@IsOptional() @IsString() @MaxLength(2000) notes?: string` to CreateOrderDto
    - In `OrderService.create()`, add `notes: dto.notes ?? null` to the Prisma create data object
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 8.2 Write property test for clinical notes round-trip persistence
    - **Property 8: Clinical notes round-trip persistence**
    - Generate arbitrary strings (including empty, null, undefined, unicode, max length); assert: create then findById returns same value
    - File: `apps/api/src/laboratory/order/__tests__/order-notes.property.spec.ts`
    - **Validates: Requirements 7.4, 7.5**

- [x] 9. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend: Order list pagination
  - [x] 10.1 Refactor Order List Page to use server-side pagination
    - Replace `limit: 100` in `loadOrders` with `page` state + `limit: 20`
    - Add pagination state: `page`, `totalPages`, `total`
    - Parse meta from API response (same pattern as visits page)
    - Add pagination controls below table (prev/next buttons, page numbers, total indicator)
    - Disable prev on page 1, disable next on last page
    - Match visits page pagination UI pattern exactly (same button styles, page number display)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Frontend: Visit detail page
  - [x] 11.1 Create Visit Detail Page at `/dashboard/visits/[id]/page.tsx`
    - Create file `apps/web/src/app/dashboard/visits/[id]/page.tsx`
    - Fetch visit data via `GET /api/v1/visits/:id` using TanStack Query or apiClient
    - Render header section: visit number, status badge, registration date
    - Render patient card: name, MRN, date of birth, contact info
    - Render payment section: payment method, insurance info (if applicable)
    - Render orders list: linked orders with order number, status, test names
    - Render status timeline: REGISTERED → IN_PROGRESS → COMPLETED/CANCELLED progression
    - Render "Batalkan Kunjungan" button (visible only when status is REGISTERED or IN_PROGRESS)
    - Hide cancel button when status is COMPLETED or CANCELLED
    - Follow existing dashboard page patterns (dark mode support, responsive layout, shared components)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 12. Frontend: Send notes in order creation form
  - [x] 12.1 Include `notes` field in the order creation API call
    - In `apps/web/src/app/dashboard/orders/new/page.tsx`, modify `handleSubmit()` to include `notes` in the `createOrder` payload
    - The textarea already exists in the ConfirmStep component; just wire the value to the API call
    - _Requirements: 7.3_

- [x] 13. Fix failing tests
  - [x] 13.1 Update 13 failing test assertions to match current codebase
    - Identify failing tests by running full test suite
    - Update response envelope expectations where API response structure changed
    - Add new fields (`clinicId`, `discountAmount`, `discountReason`, `notes`) to test fixtures
    - Update UsersService test expectations for new `create(dto, requestingUser)` and `update(id, dto, requestingUser)` signatures
    - Update `softDelete(id, requestingUserId)` test expectations
    - Ensure all 240+ tests pass with zero failures
    - If any failure reveals an actual bug, fix production code and document in test comments
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Schema migration (task 1) must be completed before any backend tasks
- Frontend tasks (10, 11, 12) are independent of each other and can be parallelized
- Task 13 (fix failing tests) should run last as earlier tasks may introduce new test breakages

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "5.1", "6.1", "7.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "5.2", "7.2", "8.2", "12.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "5.3", "6.2", "10.1", "11.1"] },
    { "id": 4, "tasks": ["13.1"] }
  ]
}
```
