# Orders 403 RBAC Fix - Bugfix Design

## Overview

The `POST /api/v1/orders` endpoint (and all other order controller endpoints) returns 403 Forbidden for SUPER_ADMIN and any role not explicitly hardcoded in the `@Roles()` decorator. The fix migrates the `OrderController` from `RolesGuard` + `@Roles()` to `PermissionGuard` + `@RequirePermission()`, which already exists in the codebase and provides SUPER_ADMIN bypass logic plus database-backed permission checking. A seed/migration ensures backward compatibility by granting the relevant permissions to roles that previously had hardcoded access.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a user whose role is not in the hardcoded `@Roles()` list (e.g., SUPER_ADMIN) attempts to access an order endpoint, they receive 403 despite having legitimate access rights
- **Property (P)**: The desired behavior — access is granted based on database-backed permissions with SUPER_ADMIN automatic bypass
- **Preservation**: Existing access for KASIR, ADMIN, KLINIK_PARTNER must continue to work after migration, and unauthenticated requests must still return 401
- **RolesGuard**: The guard in `apps/api/src/common/guards/roles.guard.ts` that performs simple enum matching against hardcoded role lists
- **PermissionGuard**: The guard in `apps/api/src/common/guards/permission.guard.ts` that checks database-backed permissions and includes SUPER_ADMIN bypass
- **RequirePermission**: The decorator in `apps/api/src/common/decorators/permission.decorator.ts` that annotates endpoints with a permission code string
- **RolePermission**: The Prisma model mapping roles to permissions with an `isGranted` flag

## Bug Details

### Bug Condition

The bug manifests when a user with role SUPER_ADMIN (or any role not in the hardcoded allowlist) sends a request to any order controller endpoint. The `RolesGuard` performs a simple `requiredRoles.some((role) => user?.role === role)` check. Since SUPER_ADMIN is not listed in `@Roles(Role.KASIR, Role.ADMIN, Role.KLINIK_PARTNER)`, the guard returns `false` and NestJS returns 403.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { user: { role: Role }, endpoint: string, method: string }
  OUTPUT: boolean

  LET hardcodedRoles = getHardcodedRolesForEndpoint(input.endpoint, input.method)
  LET hasDbPermission = checkDatabasePermission(input.user.role, input.endpoint)

  RETURN input.user.role NOT IN hardcodedRoles
         AND (input.user.role == 'SUPER_ADMIN' OR hasDbPermission == true)
         AND endpoint is an order controller endpoint
END FUNCTION
```

### Examples

- **SUPER_ADMIN creates order**: User with role SUPER_ADMIN sends `POST /api/v1/orders` → Expected: 201 Created, Actual: 403 Forbidden
- **SUPER_ADMIN lists orders**: User with role SUPER_ADMIN sends `GET /api/v1/orders` → Expected: 200 OK, Actual: 200 OK (SUPER_ADMIN is listed for GET, but NOT for POST)
- **OWNER creates order**: If OWNER role is granted `orders:create` permission in database → Expected: 201 Created, Actual: 403 Forbidden (OWNER not in hardcoded list for POST)
- **Unpermissioned role**: User with role CS sends `POST /api/v1/orders` without database permission → Expected: 403, Actual: 403 (correct by accident, but for wrong reason)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Users with role KASIR must continue to create orders (permission seeded in database)
- Users with role ADMIN must continue to create orders (permission seeded in database)
- Users with role KLINIK_PARTNER must continue to create orders (permission seeded in database)
- Unauthenticated requests must still return 401 Unauthorized (JwtAuthGuard is unchanged)
- All other endpoints using PermissionGuard independently must continue to work as before
- DataScopeInterceptor behavior must remain unchanged

**Scope:**
All inputs where the user's role was previously in the hardcoded `@Roles()` list should be completely unaffected by this fix. This includes:
- KASIR, ADMIN, KLINIK_PARTNER accessing POST `/api/v1/orders`
- All roles listed in GET endpoints that are already in their respective `@Roles()` lists
- Any non-order endpoints

## Hypothesized Root Cause

Based on the bug description, the root cause is:

1. **Wrong Authorization Mechanism**: The `OrderController` uses `RolesGuard` which performs simple enum matching, instead of `PermissionGuard` which queries the database and honors SUPER_ADMIN bypass. This is a design-level issue — the controller was written before the permission system was available.

2. **Missing SUPER_ADMIN Bypass in RolesGuard**: The `RolesGuard` has no special handling for SUPER_ADMIN. It treats all roles equally — if a role isn't in the list, access is denied.

3. **No Database Permission Check**: The `RolesGuard` doesn't query `RolePermission` table at all. Roles can only access endpoints if explicitly enumerated in the decorator at compile time.

4. **Incomplete Migration**: Other parts of the system already use `PermissionGuard`, but the order controller was never migrated.

## Correctness Properties

Property 1: Bug Condition - SUPER_ADMIN and Database-Permissioned Roles Can Access Order Endpoints

_For any_ request where the user has role SUPER_ADMIN, OR the user's role has the corresponding order permission granted in the database, the fixed controller SHALL allow the request to proceed (return non-403 response from the guard).

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Previously-Allowed Roles Continue to Have Access

_For any_ request where the user has role KASIR, ADMIN, or KLINIK_PARTNER (the previously hardcoded roles), the fixed controller SHALL produce the same access result as the original controller, preserving backward compatibility by ensuring these roles have the relevant permissions seeded in the database.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/api/src/laboratory/order/order.controller.ts`

**Changes**:
1. **Replace imports**: Remove `RolesGuard` and `Roles` imports, add `PermissionGuard` and `RequirePermission` imports
2. **Replace guard on each endpoint**: Change `@UseGuards(JwtAuthGuard, RolesGuard)` to `@UseGuards(JwtAuthGuard, PermissionGuard)`
3. **Replace decorators on each endpoint**: Change `@Roles(Role.KASIR, ...)` to `@RequirePermission('orders:create')` (or appropriate permission code per endpoint action)

**Permission Codes by Endpoint Action**:
- `POST /api/v1/orders` → `orders:create`
- `GET /api/v1/orders` → `orders:read`
- `GET /api/v1/orders/:id` → `orders:read`
- `POST /api/v1/orders/:id/cancel` → `orders:cancel`
- `GET /api/v1/orders/:id/insurances` → `orders:read`
- `POST /api/v1/orders/:id/insurances` → `orders:manage-insurance`
- `PUT /api/v1/orders/insurances/:id` → `orders:manage-insurance`
- `DELETE /api/v1/orders/insurances/:id` → `orders:manage-insurance`
- `GET /api/v1/orders/:id/bpjs` → `orders:read`
- `POST /api/v1/orders/:id/bpjs` → `orders:manage-bpjs`
- `PUT /api/v1/orders/:id/bpjs` → `orders:manage-bpjs`
- `POST /api/v1/orders/:id/bpjs/verify` → `orders:manage-bpjs`
- `GET /api/v1/orders/:id/claims` → `orders:read`
- `POST /api/v1/orders/:id/claims/submit` → `orders:manage-claims`
- `PUT /api/v1/orders/claims/:id/review` → `orders:manage-claims`
- `PUT /api/v1/orders/claims/:id/approve` → `orders:manage-claims`
- `PUT /api/v1/orders/claims/:id/partially-approve` → `orders:manage-claims`
- `PUT /api/v1/orders/claims/:id/reject` → `orders:manage-claims`
- `PUT /api/v1/orders/claims/:id/paid` → `orders:manage-claims`
- `GET /api/v1/orders/overdue` → `orders:read`
- `POST /api/v1/orders/check-overdue` → `orders:admin`
- `POST /api/v1/orders/:id/fallback-payment` → `orders:manage-claims`

**File**: `apps/api/prisma/seed.ts` (or a new migration)

**Changes**:
4. **Seed permissions**: Ensure permission records exist for `orders:create`, `orders:read`, `orders:cancel`, `orders:manage-insurance`, `orders:manage-bpjs`, `orders:manage-claims`, `orders:admin`
5. **Seed role-permission mappings**: Grant permissions to the roles that previously had hardcoded access, matching the same access matrix as the existing `@Roles()` decorators

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that SUPER_ADMIN gets 403 on the unfixed code.

**Test Plan**: Write integration tests that send requests to order endpoints with various roles and assert on status codes. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **SUPER_ADMIN Create Order**: Send POST `/api/v1/orders` as SUPER_ADMIN → expect 403 on unfixed (will fail on unfixed code)
2. **SUPER_ADMIN List Orders**: Send GET `/api/v1/orders` as SUPER_ADMIN → expect 200 on unfixed (already allowed in GET)
3. **OWNER Create Order with DB Permission**: If OWNER has `orders:create` in DB, send POST → expect 403 on unfixed code (will fail)
4. **CS Create Order without Permission**: Send POST `/api/v1/orders` as CS → expect 403 (correct behavior for wrong reason)

**Expected Counterexamples**:
- SUPER_ADMIN receives 403 Forbidden on POST `/api/v1/orders`
- Root cause confirmed: RolesGuard does simple enum match without SUPER_ADMIN bypass

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := sendRequest_fixed(input.method, input.endpoint, input.user)
  ASSERT result.status != 403  // Guard allows through
  ASSERT permissionGuardAllows(input.user.role, input.endpoint)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT sendRequest_original(input) == sendRequest_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of roles and endpoints automatically
- It catches edge cases where permission seeds might be missing
- It provides strong guarantees that previously-allowed access patterns are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for KASIR/ADMIN/KLINIK_PARTNER, then write property-based tests capturing that these roles continue to pass the guard.

**Test Cases**:
1. **KASIR Access Preservation**: Verify KASIR continues to access all endpoints it currently can
2. **ADMIN Access Preservation**: Verify ADMIN continues to access all endpoints it currently can
3. **KLINIK_PARTNER Access Preservation**: Verify KLINIK_PARTNER continues to access all endpoints it currently can
4. **Unauthenticated Rejection Preservation**: Verify unauthenticated requests still get 401

### Unit Tests

- Test `PermissionGuard.canActivate()` with SUPER_ADMIN user → returns true
- Test `PermissionGuard.canActivate()` with role that has DB permission → returns true
- Test `PermissionGuard.canActivate()` with role that lacks DB permission → returns false
- Test `PermissionGuard.canActivate()` with no `@RequirePermission` decorator → returns true (backward compat)
- Test that `OrderController` endpoints use `PermissionGuard` instead of `RolesGuard`

### Property-Based Tests

- Generate random roles and verify SUPER_ADMIN always gets access regardless of endpoint
- Generate random role + permission combinations and verify guard decision matches database state
- Generate previously-allowed role + endpoint combinations and verify access is maintained after migration

### Integration Tests

- Test full order creation flow with SUPER_ADMIN user (end-to-end)
- Test full order creation flow with KASIR user (preservation)
- Test full order creation flow with unpermissioned role (rejection still works)
- Test that permission seed correctly maps old hardcoded roles to new permission codes
