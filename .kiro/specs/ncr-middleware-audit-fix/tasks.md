# Implementation Plan

## Overview

Fix two NCRs: NCR-01-09 (middleware legacy cookie bypass) and NCR-02-05 (missing user CRUD audit logs). Uses exploratory bug condition methodology — write tests first to confirm bugs, then implement fixes, then verify tests pass.

## Tasks

- [x] 1. Write bug condition exploration test — Middleware Cookie Bypass & Missing Audit Logs
  - **Property 1: Bug Condition** - Middleware Accepts Legacy Cookie & User CRUD Produces No Audit Trail
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist on unfixed code
  - **Scoped PBT Approach**: Scope the middleware property to concrete cases: request to `/dashboard/patients` with `elis_authenticated=true` but no `elis_token`. Scope the audit property to concrete CRUD calls.
  - **Test file**: `apps/api/src/users/__tests__/users-bug-condition.spec.ts` and `apps/web/src/__tests__/middleware-bug-condition.spec.ts`
  - **Middleware Bug Condition (from isBugCondition_Middleware)**:
    - Test that a request to `/dashboard/patients` with only `elis_authenticated=true` cookie (no `elis_token`) is REJECTED and redirected to login
    - Test that a request with expired `elis_token` AND `elis_authenticated=true` is REJECTED and redirected to login
    - The assertion encodes expected behavior from requirement 2.1, 2.2: middleware SHALL reject and redirect
  - **Audit Bug Condition (from isBugCondition_Audit)**:
    - Mock `AuditService.log()` and inject into `UsersService`
    - Call `UsersService.create()` with valid dto — assert `auditService.log()` IS called with action "CREATE", entityName "User", correct entityId, oldValues null, newValues with created user data, ipAddress
    - Call `UsersService.update()` with valid dto — assert `auditService.log()` IS called with action "UPDATE", entityName "User", oldValues with previous state, newValues with updated state, ipAddress
    - Call `UsersService.softDelete()` — assert `auditService.log()` IS called with action "DELETE", entityName "User", oldValues with user state, newValues null, ipAddress
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (middleware tests fail because cookie-only auth grants access instead of rejecting; audit tests fail because `auditService.log()` is never called)
  - Document counterexamples found to confirm root cause:
    - Middleware: legacy `else if (authCookie?.value === "true")` branch grants access without JWT
    - Audit: `AuditService` is not injected, `.log()` is never invoked
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Valid JWT Access, Read Ops No-Audit, Failed Mutations No-Audit, Sensitive Field Stripping
  - **IMPORTANT**: Follow observation-first methodology
  - **Test file**: `apps/api/src/users/__tests__/users-preservation.spec.ts` and `apps/web/src/__tests__/middleware-preservation.spec.ts`
  - **Middleware Preservation (from Preservation Requirements)**:
    - Observe: request to `/dashboard/patients` with valid non-expired `elis_token` → middleware calls `NextResponse.next()` (access granted)
    - Observe: unauthenticated request to `/` → middleware calls `NextResponse.next()` (login page shown)
    - Observe: authenticated request to `/` with valid `elis_token` → middleware redirects to `/dashboard`
    - Write property-based test: for all valid, non-expired JWT cookie states, middleware continues to grant access to `/dashboard/*` routes
    - Write property-based test: for all cookie states, login page behavior (unauthenticated = show, authenticated = redirect to dashboard) is preserved
  - **Audit Preservation (from Preservation Requirements)**:
    - Observe: `UsersService.findAll()` and `UsersService.findById()` on unfixed code → no audit entries generated
    - Observe: failed mutations (duplicate email → ConflictException, role escalation → ForbiddenException, self-delete → ForbiddenException, last super admin → ConflictException) → exception thrown, no audit entries
    - Write property-based test: for all read operations (findAll with various page/limit/search/role params), `auditService.log()` is NEVER called
    - Write property-based test: for all mutation inputs that trigger validation failures, `auditService.log()` is NEVER called
  - **Sensitive Field Stripping Preservation**:
    - Observe: `stripSensitiveFields()` removes passwordHash, password, token, secret, accessToken, refreshToken from any object
    - Write property-based test: for all objects containing sensitive field keys, `stripSensitiveFields()` always removes them from output
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for NCR-01-09 Middleware Cookie Bypass & NCR-02-05 Missing User Audit Logs

  - [x] 3.1 Remove legacy `elis_authenticated` cookie fallback from middleware
    - In `apps/web/src/middleware.ts`, delete the `else if (authCookie?.value === "true")` branch (lines 52–54)
    - Authentication now depends solely on `elis_token` containing a non-expired JWT
    - Remove or repurpose the `authCookie` variable (keep only for stale cookie cleanup on redirect)
    - Update the doc-block comment to reflect that the boolean cookie is no longer accepted as an auth signal
    - _Bug_Condition: isBugCondition_Middleware(input) where elis_token is absent/expired AND elis_authenticated=true AND pathname starts with /dashboard_
    - _Expected_Behavior: middleware SHALL reject access and redirect to login page_
    - _Preservation: Valid elis_token access unchanged, login page behavior unchanged, route matcher unchanged_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 3.2 Import AuditModule into UsersModule
    - In `apps/api/src/users/users.module.ts`, add `import { AuditModule } from '../laboratory/audit/audit.module'`
    - Add `AuditModule` to the `imports` array of the `@Module` decorator
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 3.3 Inject AuditService and add audit logging to UsersService
    - In `apps/api/src/users/users.service.ts`:
      - Import `AuditService` from `'../laboratory/audit/audit.service'`
      - Add `private auditService: AuditService` to the constructor
      - Extend `create()` signature: add `ipAddress?: string` parameter. After successful `prisma.user.create()`, call `auditService.log(requestingUser.id, 'CREATE', 'User', createdUser.id, null, createdUserData, ipAddress)`
      - Extend `update()` signature: add `ipAddress?: string` parameter. Before update, capture old values via `findById()`. After successful `prisma.user.update()`, call `auditService.log(requestingUser.id, 'UPDATE', 'User', id, oldValues, updatedUserData, ipAddress)`
      - Extend `softDelete()` signature: add `requestingUserRole: Role` (if needed) and `ipAddress?: string` parameter. After successful soft-delete, call `auditService.log(requestingUserId, 'DELETE', 'User', id, oldValues, null, ipAddress)`
    - Audit calls MUST be placed AFTER successful mutation only — if mutation throws, no audit entry is generated
    - _Bug_Condition: isBugCondition_Audit(input) where operation succeeds AND auditLogEntryCreated == false_
    - _Expected_Behavior: auditService.log() called with userId, action, entityName "User", entityId, oldValues, newValues, ipAddress_
    - _Preservation: Read operations (findAll, findById) unchanged — no audit; failed mutations unchanged — no audit; stripSensitiveFields() applied to values_
    - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 3.4, 3.5, 3.6_

  - [x] 3.4 Extract ipAddress in UsersController and pass to service methods
    - In `apps/api/src/users/users.controller.ts`:
      - Import `Req` from `@nestjs/common` and `Request` from `express`
      - In `create()`: add `@Req() req: Request`, extract IP via `(req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip`, pass to `usersService.create(dto, { id: user.sub, role: user.role }, ipAddress)`
      - In `update()`: add `@Req() req: Request`, extract IP, pass to `usersService.update(id, dto, { id: user.sub, role: user.role }, ipAddress)`
      - In `remove()`: add `@Req() req: Request`, extract IP, pass to `usersService.softDelete(id, user.sub, ipAddress)`
    - Follow the same pattern used in `visit.controller.ts` and `auth.controller.ts`
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Middleware Rejects Cookie-Only Auth & User CRUD Produces Audit Logs
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (redirect on cookie-only, audit entries on CRUD)
    - When this test passes, it confirms:
      - Middleware rejects requests with only `elis_authenticated=true` (no valid `elis_token`)
      - `AuditService.log()` is called with correct args after create/update/softDelete
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms both bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Valid JWT Access, Read Ops No-Audit, Failed Mutations No-Audit
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix:
      - Valid JWT still grants access to dashboard routes
      - Login/redirect flow unchanged
      - Read operations still do not produce audit entries
      - Failed mutations still do not produce audit entries
      - Sensitive fields still stripped from audit values

- [x] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite: `npx jest --run` (or project-specific command)
  - Ensure all bug condition tests pass (confirming fix works)
  - Ensure all preservation tests pass (confirming no regressions)
  - Ensure no other existing tests are broken by the changes
  - Ask the user if questions arise


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4"] },
    { "id": 3, "tasks": ["3.5"] },
    { "id": 4, "tasks": ["3.6"] },
    { "id": 5, "tasks": ["4"] }
  ]
}
```

## Notes

- Bug condition tests (task 1) are expected to FAIL on unfixed code — this confirms the bugs exist
- Preservation tests (task 2) are expected to PASS on unfixed code — this establishes baseline
- After implementation (tasks 3.1–3.4), re-run both test suites to verify fix and no regressions
- Follow the existing audit pattern from `VisitService`/`PatientService` for consistency
- The middleware fix is a code removal (delete fallback branch), the audit fix is code addition (inject and call AuditService)
