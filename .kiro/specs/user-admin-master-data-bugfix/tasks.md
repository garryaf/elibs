# Implementation Plan

## Overview

Fix the User Admin & Master Data double-envelope and URL misconfiguration bugs by: (1) removing manual envelope wrapping from `UsersController` (5 methods), (2) setting `NEXT_PUBLIC_API_URL` default to `http://localhost:3001` in `docker-compose.yml`, and (3) adding a defensive `unwrapResponse<T>()` utility in the frontend API client. Follows the bugfix workflow: exploration test → preservation test → implement → verify.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Double-Envelope & URL Misconfiguration
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the double-envelope and URL misconfiguration bugs exist
  - **Scoped PBT Approach**: Scope the property to concrete failing cases:
    - Call `UsersController.findAll()` and assert the HTTP response has exactly ONE envelope layer `{ success: true, message: string, data: T }` where `T` is the raw paginated result (not another envelope)
    - Call `UsersController.create()`, `findOne()`, `update()`, `remove()` and assert same single-envelope shape
    - Construct API URL with empty `NEXT_PUBLIC_API_URL` and assert it resolves to `http://localhost:3001` (not empty/relative)
  - Test file: `apps/api/src/users/__tests__/users-bug-condition.spec.ts` (controller tests) and `apps/web/src/__tests__/api-url-bug-condition.test.ts` (URL tests)
  - Test 1 — Double-Wrap Detection: Call `GET /api/v1/users` via supertest → assert `response.body.data` does NOT have `success` or `message` fields (i.e., no inner envelope)
  - Test 2 — All 5 Methods: For each of `POST /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`, assert response has single envelope only
  - Test 3 — URL Resolution: With `NEXT_PUBLIC_API_URL=""`, assert resolved base URL equals `http://localhost:3001`
  - Test 4 — Frontend Unwrap: Given a double-wrapped response mock, assert `unwrapResponse()` extracts the inner payload without `.map()` crash
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - `GET /api/v1/users` returns `{ success: true, message: "Success", data: { success: true, message: "Users retrieved", data: { data: [...], meta } } }` — double-wrapped
    - `NEXT_PUBLIC_API_URL=""` resolves to empty string (same-origin) instead of `http://localhost:3001`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Features & Single-Envelope Endpoints Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Test file: `apps/api/src/users/__tests__/users-preservation.spec.ts` and `apps/web/src/__tests__/api-preservation.test.ts`
  - **Step 1 — Observe** behavior on UNFIXED code for non-buggy inputs:
    - Observe: `MasterDataController` endpoints (`GET /api/v1/master/test-categories`) return single-envelope `{ success: true, message: "Success", data: T }` correctly
    - Observe: Patient endpoints (`GET /api/v1/patients`) return single-envelope correctly
    - Observe: Docker Compose with explicit `NEXT_PUBLIC_API_URL=https://api.production.com` resolves to that explicit value
    - Observe: Existing features (orders, lab workflow, dashboard) API calls succeed with current parsing
  - **Step 2 — Write property-based tests** capturing observed behavior patterns:
    - Property: For all single-envelope responses `{ success: boolean, message: string, data: T }` where `T` does NOT have a nested `success` boolean field, `unwrapResponse(response)` SHALL return the response data unchanged (idempotent)
    - Property: For all randomly generated paginated arrays and nested objects as `data`, the unwrap utility SHALL preserve the shape exactly
    - Property: For all explicitly-set `NEXT_PUBLIC_API_URL` values (non-empty string), the resolved URL SHALL equal the provided value (no override)
    - Property: For all `MasterDataController` endpoint responses, the response shape after fix SHALL be identical to before fix
  - **Step 3 — Verify** tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for double-envelope wrapping, URL misconfiguration, and missing defensive unwrap

  - [x] 3.1 Remove manual envelope wrapping from `UsersController`
    - File: `apps/api/src/users/users.controller.ts`
    - Change `create()`: return raw `user` object instead of `{ success: true, message: '...', data: user }`
    - Change `findAll()`: return raw `result` (paginated `{ data, meta }`) instead of `{ success: true, message: '...', data: result }`
    - Change `findOne()`: return raw `user` object instead of `{ success: true, message: '...', data: user }`
    - Change `update()`: return raw `user` object instead of `{ success: true, message: '...', data: user }`
    - Change `remove()`: return `null` instead of `{ success: true, message: '...', data: null }`
    - Verify `TransformInterceptor` will now produce exactly one `{ success: true, message: "Success", data: T }` envelope
    - _Bug_Condition: isBugCondition(input) where controllerResponse HAS { success, message, data } AND TransformInterceptor IS ACTIVE_
    - _Expected_Behavior: response SHALL have exactly ONE envelope layer — `{ success: true, message: "Success", data: rawServiceResult }`_
    - _Preservation: MasterDataController, PatientsController, OrdersController already follow this pattern — no changes needed_
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.5_

  - [x] 3.2 Fix `NEXT_PUBLIC_API_URL` default in `docker-compose.yml`
    - File: `docker-compose.yml`
    - Change `web.build.args`: `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-}` → `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001}`
    - Change `web.environment`: `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-}` → `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001}`
    - Verify: explicit env var overrides still work (production `NEXT_PUBLIC_API_URL=""` behind Nginx is preserved when explicitly set)
    - _Bug_Condition: isUrlMisconfigured(env) where env.NEXT_PUBLIC_API_URL = "" OR undefined in dev_
    - _Expected_Behavior: resolvedUrl = "http://localhost:3001" when no explicit override provided_
    - _Preservation: Production deployments with explicit NEXT_PUBLIC_API_URL set are unaffected — `:-` fallback only activates when var is unset_
    - _Requirements: 1.2, 1.3, 2.2, 2.3_

  - [x] 3.3 Add defensive `unwrapResponse<T>()` utility in frontend API client
    - File: `apps/web/src/lib/api.ts`
    - Add helper: `unwrapResponse<T>(data: unknown): T` that checks if `data` has shape `{ success: boolean, message: string, data: any }` (double-wrap indicator) and returns the inner `data` field; otherwise returns `data` as-is
    - Apply in `request<T>()` method: after `const data = await response.json()`, run through `unwrapResponse` before returning
    - Edge cases: handle `null` data, empty arrays, objects that coincidentally have a `success` field but are legitimate data (use strict check: `success` is boolean AND `message` is string AND `data` key exists)
    - _Bug_Condition: isDoubleWrapped(response) where response.data.success IS boolean AND response.data.message IS string AND response.data.data IS defined_
    - _Expected_Behavior: unwrapResponse extracts inner payload for double-wrapped; passes through unchanged for single-wrapped_
    - _Preservation: Single-envelope responses (patients, orders, master-data, lab) pass through unmodified_
    - _Requirements: 1.4, 2.4, 3.1, 3.2_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Single-Envelope Response Shape & Correct URL
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (single envelope, correct URL resolution)
    - When this test passes, it confirms:
      - `UsersController` endpoints return single-envelope responses
      - `NEXT_PUBLIC_API_URL` defaults resolve to `http://localhost:3001`
      - No double-wrapping occurs for any of the 5 controller methods
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Features Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm: MasterDataController responses unchanged, patient/order endpoints unchanged, production config unchanged
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run backend tests: `npx jest --run` in `apps/api`
  - Run frontend tests: `npx vitest --run` in `apps/web`
  - Verify TypeScript compilation: `npx tsc --noEmit` in both `apps/api` and `apps/web`
  - Validate docker-compose config: `docker compose config`
  - Ensure all property-based tests (bug condition + preservation) pass
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["3.4", "3.5"] },
    { "id": 3, "tasks": ["4"] }
  ]
}
```

## Notes

- Task 1 and 2 (exploration + preservation tests) run in parallel BEFORE any fix implementation
- Tasks 3.1, 3.2, and 3.3 are independent fixes that can be implemented in parallel
- Task 3.4 and 3.5 depend on both the implementation (3.1–3.3) and the prior test tasks (1, 2)
- The `unwrapResponse` utility (3.3) is a safety net — the primary fix is removing manual wrapping in `UsersController` (3.1)
- Out of scope: `SettingsController`, `ReportsController`, `InsuranceAnalyticsController` also manually wrap — separate tickets recommended
- Production topology preserved: `NEXT_PUBLIC_API_URL` can still be explicitly set to empty string behind Nginx (the `:-` fallback only activates when the variable is completely unset)
