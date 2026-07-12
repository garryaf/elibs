# NCR Middleware & Audit Fix — Bugfix Design

## Overview

This design addresses two NCRs:

1. **NCR-01-09**: The Next.js middleware at `apps/web/src/middleware.ts` contains a legacy fallback that accepts the `elis_authenticated` boolean cookie as a valid authentication signal. An attacker can bypass route protection by simply setting `elis_authenticated=true` in devtools without possessing a valid JWT. The fix removes this fallback entirely so authentication depends solely on a non-expired `elis_token` JWT.

2. **NCR-02-05**: The `UsersService` in `apps/api/src/users/users.service.ts` performs create, update, and soft-delete mutations without calling `AuditService.log()`. The fix injects `AuditService`, updates method signatures to accept `userId` and `ipAddress`, and emits audit log entries for each mutation.

## Glossary

- **Bug_Condition (C)**: For NCR-01-09 — a request to a `/dashboard/*` route where `elis_token` is absent/expired but `elis_authenticated=true` is present. For NCR-02-05 — any successful user CRUD mutation (create/update/softDelete).
- **Property (P)**: For NCR-01-09 — the request must be rejected and redirected to login. For NCR-02-05 — an audit log entry must be written with the correct fields.
- **Preservation**: Existing behavior that must remain unchanged — valid JWT access, login/redirect flow, read operations without audit, validation failures without audit, sensitive field stripping.
- **`middleware()`**: The Next.js edge middleware function in `apps/web/src/middleware.ts` that guards `/dashboard/*` routes.
- **`UsersService`**: The NestJS service in `apps/api/src/users/users.service.ts` handling user CRUD.
- **`AuditService.log()`**: The audit logging method in `apps/api/src/laboratory/audit/audit.service.ts` that writes entries to the `AuditLog` table.
- **`elis_token`**: HTTP cookie containing the actual JWT, decoded by middleware to check expiry.
- **`elis_authenticated`**: Legacy boolean cookie (`"true"/"false"`) that is no longer a valid auth signal.

## Bug Details

### Bug Condition

**NCR-01-09**: The middleware grants access to protected routes when `elis_authenticated=true` is present even without a valid `elis_token`. The legacy fallback path (`else if (authCookie?.value === "true")`) bypasses JWT validation entirely.

**NCR-02-05**: The `UsersService.create()`, `UsersService.update()`, and `UsersService.softDelete()` methods complete mutations without calling `AuditService.log()`, leaving zero audit trail.

**Formal Specification:**
```
FUNCTION isBugCondition_Middleware(input)
  INPUT: input of type { pathname: string, cookies: Map<string, string> }
  OUTPUT: boolean
  
  RETURN input.pathname STARTS_WITH "/dashboard"
         AND (input.cookies["elis_token"] IS ABSENT OR isTokenExpired(input.cookies["elis_token"]))
         AND input.cookies["elis_authenticated"] == "true"
         AND middlewareGrantsAccess(input) == true
END FUNCTION

FUNCTION isBugCondition_Audit(input)
  INPUT: input of type { operation: "create" | "update" | "softDelete", dto: object, userId: string }
  OUTPUT: boolean
  
  RETURN input.operation IN ["create", "update", "softDelete"]
         AND operationSucceeds(input)
         AND auditLogEntryCreated(input) == false
END FUNCTION
```

### Examples

- **Middleware bypass**: User sets `elis_authenticated=true` in devtools, no `elis_token` cookie → currently accesses `/dashboard/patients` → should be redirected to `/`
- **Middleware bypass (expired token)**: `elis_token` exists but is expired, `elis_authenticated=true` → currently accesses dashboard → should be redirected to `/`
- **Missing CREATE audit**: Admin creates a user via POST `/api/v1/users` → user is created → no `AuditLog` row exists for the action
- **Missing UPDATE audit**: Admin updates user email → user updated → no audit trail of old/new values
- **Missing DELETE audit**: Admin soft-deletes a user → `deletedAt` set → no audit entry recorded

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Requests with a valid, non-expired `elis_token` JWT continue to access `/dashboard/*` routes
- Unauthenticated users visiting `/` (login page) continue to see the login page
- Authenticated users visiting `/` continue to be redirected to `/dashboard`
- `UsersService.findAll()` and `UsersService.findById()` continue to return data without audit entries
- Failed mutations (duplicate email, role escalation, self-delete, last super admin) continue to throw exceptions without audit entries
- `stripSensitiveFields()` continues to remove `passwordHash`, `password`, `token`, `secret`, `accessToken`, `refreshToken` from logged values
- The `isTokenExpired()` helper function logic remains unchanged
- The middleware route matcher configuration remains unchanged

**Scope:**
All inputs that do NOT involve the legacy `elis_authenticated` fallback path or user CRUD mutations should be completely unaffected by this fix. This includes:
- API-side JWT validation (JwtAuthGuard, JwtStrategy — unchanged)
- Non-user audit logging (visits, patients, orders — unchanged)
- Frontend authentication flow (login/logout API calls — unchanged)
- Other middleware behavior (static assets, API routes — unchanged)

## Hypothesized Root Cause

Based on the code analysis, the root causes are clear and confirmed:

1. **NCR-01-09 — Legacy Fallback Code Path**: Lines 52–54 of `middleware.ts` contain an explicit `else if` branch that sets `isAuthenticated = true` when only the boolean cookie is present. This was intentionally left as "backward compat during transition" per the code comment, but was never removed after `elis_token` was deployed.

2. **NCR-02-05 — Missing AuditService Integration**: The `UsersModule` does not import `AuditModule`, and `UsersService` does not inject `AuditService`. The service methods lack `ipAddress` parameters and contain no `auditService.log()` calls. This is a straightforward omission — the pattern exists in `VisitService`, `PatientService`, and `AuthService` but was never applied to `UsersService`.

## Correctness Properties

Property 1: Bug Condition — Middleware Rejects Cookie-Only Authentication

_For any_ HTTP request to a `/dashboard/*` route where the `elis_token` cookie is absent or contains an expired/malformed JWT, the fixed middleware SHALL reject access and redirect to the login page, regardless of the `elis_authenticated` cookie value.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — User CRUD Operations Emit Audit Logs

_For any_ successful user mutation (create, update, or softDelete) executed through `UsersService`, the fixed service SHALL call `AuditService.log()` with the correct `userId`, `action` (CREATE/UPDATE/DELETE), `entityName` ("User"), `entityId`, `oldValues`, `newValues`, and `ipAddress`.

**Validates: Requirements 2.3, 2.4, 2.5**

Property 3: Preservation — Valid JWT Access Unchanged

_For any_ HTTP request to a `/dashboard/*` route where the `elis_token` cookie contains a valid, non-expired JWT, the fixed middleware SHALL continue to grant access exactly as before the fix.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 4: Preservation — Read Operations and Failed Mutations No Audit

_For any_ call to `UsersService.findAll()` or `UsersService.findById()`, or any mutation that throws an exception (validation failure), the fixed service SHALL NOT generate an audit log entry, preserving the existing behavior.

**Validates: Requirements 3.4, 3.5**

Property 5: Preservation — Sensitive Field Stripping

_For any_ audit log entry written by the fixed `UsersService`, the `oldValues` and `newValues` fields SHALL NOT contain any sensitive fields (passwordHash, password, token, secret, accessToken, refreshToken), as enforced by `stripSensitiveFields()`.

**Validates: Requirements 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/web/src/middleware.ts`

**Function**: `middleware()`

**Specific Changes**:
1. **Remove legacy fallback branch**: Delete the `else if (authCookie?.value === "true")` code path (lines 52–54). Authentication now depends solely on `elis_token` containing a non-expired JWT.
2. **Remove `elis_authenticated` cookie read** (optional cleanup): The `authCookie` variable is no longer needed for auth decisions. It can be removed or kept only for the purpose of clearing stale cookies on redirect (which the existing redirect logic already does).
3. **Update comments**: Remove the "backward compat during transition" comment and update the doc-block to reflect that the boolean cookie is no longer accepted.

---

**File**: `apps/api/src/users/users.module.ts`

**Specific Changes**:
1. **Import `AuditModule`**: Add `import { AuditModule } from '../laboratory/audit/audit.module'` and add `AuditModule` to the module's `imports` array.

---

**File**: `apps/api/src/users/users.service.ts`

**Function**: `create()`, `update()`, `softDelete()`

**Specific Changes**:
1. **Inject `AuditService`**: Add `AuditService` to the constructor.
2. **Extend `create()` signature**: Add `ipAddress?: string` parameter. After successful `prisma.user.create()`, call `auditService.log(requestingUser.id, 'CREATE', 'User', createdUser.id, null, createdUserData, ipAddress)`.
3. **Extend `update()` signature**: Add `ipAddress?: string` parameter. Before the update, capture old values via `findById()`. After successful `prisma.user.update()`, call `auditService.log(requestingUser.id, 'UPDATE', 'User', id, oldValues, updatedUserData, ipAddress)`.
4. **Extend `softDelete()` signature**: Add `ipAddress?: string` parameter. After successful soft-delete, call `auditService.log(requestingUserId, 'DELETE', 'User', id, oldValues, null, ipAddress)`.
5. **Ensure audit calls are after successful mutation**: Audit logging must only occur when the mutation succeeds, not when exceptions are thrown.

---

**File**: `apps/api/src/users/users.controller.ts`

**Specific Changes**:
1. **Extract `ipAddress` in mutation endpoints**: Add `@Req() req: express.Request` to `create()`, `update()`, and `remove()` handlers. Extract IP using `(req.headers['x-forwarded-for'] as string) || req.ip` (matching the pattern in `visit.controller.ts` and `auth.controller.ts`).
2. **Pass `ipAddress` to service methods**: Forward the extracted IP to `usersService.create()`, `usersService.update()`, and `usersService.softDelete()`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate both bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that:
- Simulate middleware requests with only `elis_authenticated=true` (no `elis_token`) and assert they incorrectly pass
- Call `UsersService.create()`, `.update()`, `.softDelete()` and assert `AuditService.log()` is never invoked

Run these tests on the UNFIXED code to observe failures confirming the bugs.

**Test Cases**:
1. **Middleware Cookie Bypass Test**: Send request to `/dashboard/patients` with only `elis_authenticated=true` → observe access is granted (bug confirmed)
2. **Middleware Expired Token + Cookie Test**: Send request with expired `elis_token` + `elis_authenticated=true` → observe access is granted (bug confirmed)
3. **User CREATE No Audit Test**: Call `create()` successfully → observe no `auditService.log()` call (bug confirmed)
4. **User UPDATE No Audit Test**: Call `update()` successfully → observe no `auditService.log()` call (bug confirmed)
5. **User DELETE No Audit Test**: Call `softDelete()` successfully → observe no `auditService.log()` call (bug confirmed)

**Expected Counterexamples**:
- Middleware grants access with cookie-only auth (no JWT validation in fallback path)
- `AuditService.log()` mock is never called after user mutations
- Possible causes confirmed: legacy code path not removed; AuditService not injected

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition_Middleware(request) DO
  result := middleware_fixed(request)
  ASSERT result IS redirect TO login page
END FOR

FOR ALL input WHERE isBugCondition_Audit(input) DO
  result := usersService_fixed[input.operation](input)
  ASSERT auditService.log WAS CALLED WITH (
    userId = input.userId,
    action = expectedAction(input.operation),
    entityName = "User",
    entityId = result.id,
    oldValues = expectedOldValues(input),
    newValues = expectedNewValues(input),
    ipAddress = input.ipAddress
  )
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition_Middleware(request) DO
  ASSERT middleware_original(request) = middleware_fixed(request)
END FOR

FOR ALL input WHERE input.operation IN ["findAll", "findById"] DO
  ASSERT auditService.log WAS NOT CALLED
END FOR

FOR ALL input WHERE mutation throws exception DO
  ASSERT auditService.log WAS NOT CALLED
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of valid/invalid tokens and cookie states
- It generates many user data combinations to verify audit content correctness
- It catches edge cases like empty updates, special characters in emails, various role combinations

**Test Plan**: Observe behavior on UNFIXED code first for valid JWT access and read operations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Valid JWT Preservation**: Verify requests with valid `elis_token` continue to pass through middleware unchanged
2. **Login Page Behavior Preservation**: Verify unauthenticated access to `/` and authenticated redirect to `/dashboard` work as before
3. **Read Operation No Audit**: Verify `findAll()` and `findById()` never trigger audit calls
4. **Failed Mutation No Audit**: Verify duplicate email, role escalation, self-delete, and last-admin checks still throw without audit

### Unit Tests

- Test middleware rejects requests with only `elis_authenticated=true`
- Test middleware rejects requests with expired `elis_token` + `elis_authenticated=true`
- Test middleware continues to allow valid `elis_token` requests
- Test `UsersService.create()` calls `AuditService.log()` with correct args
- Test `UsersService.update()` calls `AuditService.log()` with old/new values
- Test `UsersService.softDelete()` calls `AuditService.log()` with DELETE action
- Test failed mutations do not produce audit entries
- Test sensitive fields are stripped from audit log values

### Property-Based Tests

- Generate random JWT payloads (valid/expired/malformed) and cookie states, verify middleware correctly allows or rejects
- Generate random user DTOs with various field combinations, verify audit entries are produced with correct structure for all successful mutations
- Generate random user states and verify `stripSensitiveFields()` always removes sensitive fields from audit values
- Generate random failed-mutation scenarios and verify no audit entries are produced

### Integration Tests

- Test full flow: HTTP POST to `/api/v1/users` → user created → audit log row exists in DB
- Test full flow: HTTP PUT to `/api/v1/users/:id` → user updated → audit log row with old/new values exists
- Test full flow: HTTP DELETE to `/api/v1/users/:id` → user soft-deleted → audit log row exists
- Test full middleware flow with production-like cookie/header combinations
- Test that login/logout audit logging (existing) continues to work alongside new user audit logging
