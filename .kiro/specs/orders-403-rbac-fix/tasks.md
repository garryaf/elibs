# Implementation Plan

## Overview

Migrate OrderController from RolesGuard to PermissionGuard to fix 403 Forbidden for SUPER_ADMIN and DB-permissioned roles. Uses the exploratory bugfix workflow: write tests first to confirm the bug, write preservation tests to capture existing behavior, then implement the fix and validate.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - SUPER_ADMIN and DB-Permissioned Roles Get 403 on Order Endpoints
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: SUPER_ADMIN role on POST /api/v1/orders, and any role with DB-granted `orders:create` permission on POST /api/v1/orders
  - Test that a request from SUPER_ADMIN to POST /api/v1/orders does NOT return 403 (asserts expected behavior from design)
  - Test that a request from a role with `orders:create` DB permission to POST /api/v1/orders does NOT return 403
  - isBugCondition: user.role NOT IN [KASIR, ADMIN, KLINIK_PARTNER] AND (user.role == SUPER_ADMIN OR hasDbPermission(user.role, 'orders:create'))
  - expectedBehavior: response.status != 403 (guard allows request through)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - proves SUPER_ADMIN gets 403 from RolesGuard)
  - Document counterexamples: SUPER_ADMIN POST /api/v1/orders → 403 Forbidden (should be allowed)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Previously-Allowed Roles Continue to Have Access
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: KASIR sends POST /api/v1/orders on unfixed code → 201 (or non-403 from guard)
  - Observe: ADMIN sends POST /api/v1/orders on unfixed code → 201 (or non-403 from guard)
  - Observe: KLINIK_PARTNER sends POST /api/v1/orders on unfixed code → 201 (or non-403 from guard)
  - Observe: Unauthenticated request to POST /api/v1/orders → 401 Unauthorized
  - Write property-based test: for all roles in [KASIR, ADMIN, KLINIK_PARTNER] × all order endpoints they currently access, the guard allows the request (response != 403)
  - Write property-based test: for unauthenticated requests, response is 401 regardless of endpoint
  - Verify tests pass on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix OrderController RBAC migration to PermissionGuard

  - [x] 3.1 Seed order permission records in database
    - Create permission seed entries for: `orders:create`, `orders:read`, `orders:cancel`, `orders:manage-insurance`, `orders:manage-bpjs`, `orders:manage-claims`, `orders:admin`
    - Seed in `apps/api/prisma/seed.ts` or create a new migration
    - Map permissions to roles matching the existing hardcoded access matrix:
      - KASIR: orders:create, orders:read, orders:cancel, orders:manage-insurance, orders:manage-bpjs
      - ADMIN: orders:create, orders:read, orders:cancel, orders:manage-insurance, orders:manage-bpjs, orders:manage-claims, orders:admin
      - KLINIK_PARTNER: orders:create, orders:read, orders:cancel, orders:manage-insurance, orders:manage-bpjs, orders:manage-claims
    - Ensure RolePermission records have `isGranted: true`
    - _Bug_Condition: isBugCondition(input) where user.role NOT IN hardcoded list but has DB permission_
    - _Expected_Behavior: SUPER_ADMIN bypasses all checks; DB-permissioned roles get access_
    - _Preservation: KASIR, ADMIN, KLINIK_PARTNER must retain same access via seeded permissions_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 3.2 Replace RolesGuard with PermissionGuard on OrderController
    - In `apps/api/src/laboratory/order/order.controller.ts`:
    - Remove imports for `RolesGuard`, `Roles`, `Role` (if no longer needed)
    - Add imports for `PermissionGuard` from `../../common/guards/permission.guard`
    - Add imports for `RequirePermission` from `../../common/decorators/permission.decorator`
    - Replace `@UseGuards(JwtAuthGuard, RolesGuard)` with `@UseGuards(JwtAuthGuard, PermissionGuard)` on each endpoint
    - Replace `@Roles(Role.KASIR, ...)` with `@RequirePermission('orders:<action>')` per endpoint:
      - POST /api/v1/orders → `@RequirePermission('orders:create')`
      - GET /api/v1/orders → `@RequirePermission('orders:read')`
      - GET /api/v1/orders/:id → `@RequirePermission('orders:read')`
      - POST /api/v1/orders/:id/cancel → `@RequirePermission('orders:cancel')`
      - GET /api/v1/orders/:id/insurances → `@RequirePermission('orders:read')`
      - POST /api/v1/orders/:id/insurances → `@RequirePermission('orders:manage-insurance')`
      - PUT /api/v1/orders/insurances/:id → `@RequirePermission('orders:manage-insurance')`
      - DELETE /api/v1/orders/insurances/:id → `@RequirePermission('orders:manage-insurance')`
      - GET /api/v1/orders/:id/bpjs → `@RequirePermission('orders:read')`
      - POST /api/v1/orders/:id/bpjs → `@RequirePermission('orders:manage-bpjs')`
      - PUT /api/v1/orders/:id/bpjs → `@RequirePermission('orders:manage-bpjs')`
      - POST /api/v1/orders/:id/bpjs/verify → `@RequirePermission('orders:manage-bpjs')`
      - GET /api/v1/orders/:id/claims → `@RequirePermission('orders:read')`
      - POST /api/v1/orders/:id/claims/submit → `@RequirePermission('orders:manage-claims')`
      - PUT /api/v1/orders/claims/:id/review → `@RequirePermission('orders:manage-claims')`
      - PUT /api/v1/orders/claims/:id/approve → `@RequirePermission('orders:manage-claims')`
      - PUT /api/v1/orders/claims/:id/partially-approve → `@RequirePermission('orders:manage-claims')`
      - PUT /api/v1/orders/claims/:id/reject → `@RequirePermission('orders:manage-claims')`
      - PUT /api/v1/orders/claims/:id/paid → `@RequirePermission('orders:manage-claims')`
      - GET /api/v1/orders/overdue → `@RequirePermission('orders:read')`
      - POST /api/v1/orders/check-overdue → `@RequirePermission('orders:admin')`
      - POST /api/v1/orders/:id/fallback-payment → `@RequirePermission('orders:manage-claims')`
    - _Bug_Condition: RolesGuard blocks SUPER_ADMIN and DB-permissioned roles_
    - _Expected_Behavior: PermissionGuard allows SUPER_ADMIN bypass and checks DB permissions_
    - _Preservation: JwtAuthGuard remains unchanged; DataScopeInterceptor unaffected_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - SUPER_ADMIN and DB-Permissioned Roles Can Access Order Endpoints
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (response != 403 for SUPER_ADMIN)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Previously-Allowed Roles Continue to Have Access
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm KASIR, ADMIN, KLINIK_PARTNER still pass the guard after migration
    - Confirm unauthenticated requests still get 401
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify bug condition test passes (SUPER_ADMIN can access order endpoints)
  - Verify preservation tests pass (previously-allowed roles unchanged)
  - Verify unauthenticated requests still return 401
  - Ensure all other existing tests unaffected
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["4"] }
  ]
}
```

## Notes

- Task 1 (bug condition test) and Task 2 (preservation tests) are independent and can be written in parallel
- Task 1 and 2 MUST be completed BEFORE Task 3 (implementation)
- The bug condition test is expected to FAIL on unfixed code — this is correct behavior confirming the bug
- The preservation tests are expected to PASS on unfixed code — this captures baseline behavior
- After implementation (3.1 + 3.2), re-running both test suites validates the fix is correct and non-regressive
- SUPER_ADMIN bypass is handled by PermissionGuard logic (no explicit permission seed needed for SUPER_ADMIN)
