# User Admin & Master Data Bugfix Design

## Overview

Four interrelated bugs prevent proper operation of User Administration and Master Data features. The root causes are:
1. **Double-envelope wrapping**: `UsersController` (and a few other controllers) manually wrap responses with `{ success, message, data }`, then `TransformInterceptor` wraps again globally, producing nested structures the frontend cannot parse.
2. **API URL misconfiguration**: `NEXT_PUBLIC_API_URL` defaults to empty string in `docker-compose.yml`, causing frontend requests to hit `localhost:3000` (Next.js) instead of `localhost:3001` (NestJS).
3. **Master Data 404s**: Direct consequence of the URL misconfiguration — API calls route to Next.js which has no `/api/v1/master/*` handler.
4. **`.map()` runtime error**: Direct consequence of double-wrapping — `queryResult.data?.data` resolves to the inner envelope object instead of an array.

The fix strategy is **minimum safe fix**: remove manual wrapping from affected controllers, set the correct `NEXT_PUBLIC_API_URL` default in docker-compose, and add a defensive unwrap layer in the frontend API client as a safety net.

## Glossary

- **Bug_Condition (C)**: The set of conditions that cause the bugs — either the API URL is misconfigured (empty) in development, or a controller manually wraps a response that `TransformInterceptor` will also wrap
- **Property (P)**: The desired behavior — API responses arrive as a single `{ success, message, data: T }` envelope, and API calls reach the NestJS backend
- **Preservation**: Existing behavior of patients, orders, lab workflow, dashboard, visits, settings, and production Nginx topology must remain unchanged
- **TransformInterceptor**: Global NestJS interceptor at `apps/api/src/common/interceptors/transform.interceptor.ts` that wraps all controller return values with `{ success: true, message: "Success", data: <returnValue> }`
- **UsersController**: Controller at `apps/api/src/users/users.controller.ts` that manually wraps responses before `TransformInterceptor` processes them
- **MasterDataController**: Controller at `apps/api/src/master-data/master-data.controller.ts` — does NOT manually wrap (correct pattern)
- **apiClient**: Frontend HTTP client at `apps/web/src/lib/api.ts` that prepends `NEXT_PUBLIC_API_URL` to all requests
- **[entity] page**: Dynamic Next.js route at `apps/web/src/app/dashboard/master-data/[entity]/page.tsx` that renders CRUD for any master data entity

## Bug Details

### Bug Condition

The bugs manifest when either: (a) the frontend is running with empty `NEXT_PUBLIC_API_URL` causing self-referencing API calls, or (b) a controller method returns a manually-wrapped envelope that `TransformInterceptor` wraps again.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { request: ApiRequest, controllerResponse: HttpResponseBody }
  OUTPUT: boolean
  
  // URL misconfiguration condition
  LET urlMisconfigured = (process.env.NEXT_PUBLIC_API_URL = "" OR undefined)
                         AND input.request.targetPort = 3000
                         AND input.request.endpoint STARTS_WITH "/api/v1/"
  
  // Double-envelope condition
  LET doubleWrapped = input.controllerResponse HAS { success: boolean, message: string, data: any }
                      AND TransformInterceptor IS ACTIVE
  
  RETURN urlMisconfigured OR doubleWrapped
END FUNCTION
```

```
FUNCTION isDoubleWrapped(response)
  INPUT: response of type HttpResponseBody (after TransformInterceptor)
  OUTPUT: boolean
  
  RETURN response.success IS boolean
    AND response.data IS Object
    AND response.data.success IS boolean
    AND response.data.message IS string
    AND response.data.data IS defined
END FUNCTION
```

```
FUNCTION isUrlMisconfigured(env)
  INPUT: env of type DockerComposeEnvironment
  OUTPUT: boolean
  
  RETURN env.NEXT_PUBLIC_API_URL = "" OR env.NEXT_PUBLIC_API_URL = undefined
END FUNCTION
```

### Examples

- **User list after create**: Frontend calls `GET /api/v1/users`, UsersController returns `{ success: true, message: "Users retrieved successfully", data: { data: [...], meta: {...} } }`, TransformInterceptor wraps to `{ success: true, message: "Success", data: { success: true, message: "Users retrieved successfully", data: { data: [...], meta: {...} } } }`. Frontend `apiClient.getUsers()` returns this triple-nested object. `useUsers()` consumer expects `response.data.data` to be an array but gets the inner envelope object.

- **Master Data 404**: With `NEXT_PUBLIC_API_URL=""`, `apiClient.get("/api/v1/master/units")` resolves to `fetch("http://localhost:3000/api/v1/master/units")`. Next.js has no API route at that path → returns HTML 404.

- **`.map()` crash**: `[entity]/page.tsx` calls `queryResult.data?.data` expecting `unknown[]`. Due to double-wrapping, this resolves to `{ success: true, message: "...", data: { data: [...], meta: {...} } }` — calling `.map()` on an object throws `TypeError: e.map is not a function`.

- **Production works correctly**: When Nginx proxies `/api/v1/*` to the API container, and `MasterDataController` doesn't manually wrap, responses are single-envelope and parse correctly.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All `MasterDataController` endpoints continue to return data via `TransformInterceptor` only (they already follow the correct pattern — no manual wrapping)
- Patient registration, search, and edit flows continue working with their current response parsing
- Order creation, payment, and lab workflow (sample collection → result entry → verification → approval) remain unaffected
- Dashboard summary and charts continue to fetch and display data correctly
- Visit management CRUD operations continue working
- Production Nginx reverse-proxy topology (`NEXT_PUBLIC_API_URL=""` behind Nginx is intentional for production) must continue working — the fix must only change the development default
- JWT authentication, role-based guards, and audit logging continue functioning
- Settings controller manual wrapping is a separate concern (reports/insurance-analytics) — fix only UsersController in this scope

**Scope:**
All inputs that do NOT involve: (a) UsersController endpoints, (b) docker-compose default `NEXT_PUBLIC_API_URL` for development, or (c) frontend response unwrapping logic should be completely unaffected by this fix.

## Hypothesized Root Cause

Based on code analysis, the confirmed root causes are:

1. **UsersController manual wrapping (CONFIRMED)**: Every method in `UsersController` (`create`, `findAll`, `findOne`, `update`, `remove`) returns `{ success: true, message: "...", data: ... }`. The global `TransformInterceptor` then wraps this again with `{ success: true, message: "Success", data: <controller_return> }`, producing a double-envelope. The `MasterDataController` does NOT have this problem — it returns raw data/service results and lets the interceptor handle wrapping.

2. **docker-compose.yml default value (CONFIRMED)**: Line `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-}` defaults to empty string. In development without a `.env` file at the root, this causes `apiClient` to use `""` as base URL, making all fetch calls relative to the Next.js server on port 3000.

3. **Frontend apiClient has no defensive unwrap (CONFIRMED)**: The `request<T>()` method in `ApiClient` simply casts `data as T` without checking for nested envelope shapes. When the response is double-wrapped, the type assertion passes but runtime access patterns break.

4. **Master Data child routes exist (CONFIRMED NOT A PAGE ISSUE)**: The dynamic `[entity]/page.tsx` correctly handles all 10 entity slugs. The 404 is purely a network routing issue (requests hit Next.js instead of NestJS), not a missing page file.

## Correctness Properties

Property 1: Bug Condition - Single-Envelope Response Shape

_For any_ API response from `UsersController` endpoints (`GET /api/v1/users`, `POST /api/v1/users`, `GET /api/v1/users/:id`, `PUT /api/v1/users/:id`, `DELETE /api/v1/users/:id`), the final HTTP response body SHALL have exactly one envelope layer: `{ success: true, message: string, data: T }` where `T` is the raw service result (not another envelope).

**Validates: Requirements 2.1, 2.5**

Property 2: Bug Condition - API URL Resolution in Development

_For any_ Docker Compose development environment using the default `docker-compose.yml` configuration without explicit `NEXT_PUBLIC_API_URL` override, the resolved API base URL SHALL be `http://localhost:3001`, ensuring API requests reach the NestJS backend.

**Validates: Requirements 2.2, 2.3**

Property 3: Bug Condition - Defensive Response Unwrapping

_For any_ API response received by the frontend `apiClient`, if the response body contains a nested envelope (double-wrapped shape where `response.data.success` is a boolean), the unwrap utility SHALL extract the inner data, returning the actual payload to consumers without throwing runtime errors.

**Validates: Requirements 2.1, 2.4**

Property 4: Preservation - Existing Features Unchanged

_For any_ API request from existing features (patients, orders, lab workflow, dashboard, visits, settings) that does NOT involve `UsersController` endpoints, the fixed code SHALL produce the same HTTP response shape and frontend parsing result as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 5: Preservation - Production Topology Unchanged

_For any_ deployment behind Nginx reverse proxy where `NEXT_PUBLIC_API_URL` is explicitly set (empty for same-origin behind proxy, or a specific domain), the fixed docker-compose SHALL NOT override user-provided values, preserving production deployment behavior.

**Validates: Requirements 3.3**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `apps/api/src/users/users.controller.ts`

**Change**: Remove manual envelope wrapping from all 5 methods. Return raw data/service results and let `TransformInterceptor` handle the single envelope.

**Specific Changes**:
1. **`create()`**: Change `return { success: true, message: '...', data: user }` → `return user`
2. **`findAll()`**: Change `return { success: true, message: '...', data: result }` → `return result`
3. **`findOne()`**: Change `return { success: true, message: '...', data: user }` → `return user`
4. **`update()`**: Change `return { success: true, message: '...', data: user }` → `return user`
5. **`remove()`**: Change `return { success: true, message: '...', data: null }` → `return null`

**Rationale**: `MasterDataController` already follows this pattern correctly and works. Aligning `UsersController` to the same pattern eliminates the double-wrap at the source.

---

**File 2**: `docker-compose.yml`

**Change**: Set the development default for `NEXT_PUBLIC_API_URL` to `http://localhost:3001`.

**Specific Changes**:
1. **`web.build.args`**: Change `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-}` → `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001}`
2. **`web.environment`**: Change `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-}` → `NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001}`

**Rationale**: In development, the frontend runs on port 3000 and the backend on port 3001 — they are separate origins. The default must reflect this. In production behind Nginx, the env var is explicitly set (empty for same-origin proxy, or domain-specific), so the `:-` fallback never activates.

---

**File 3**: `apps/web/src/lib/api.ts`

**Change**: Add a defensive unwrap utility that detects and handles double-wrapped responses as a safety net.

**Specific Changes**:
1. **Add helper function** `unwrapResponse<T>(data: unknown): T` that checks if the response has the double-wrap shape (`data.success` exists as boolean AND `data.data` exists) and extracts the inner payload.
2. **Modify `request<T>()`**: After `const data = await response.json()`, apply the unwrap utility before returning.

**Rationale**: This provides a backwards-compatible safety net. If any other controller still manually wraps (e.g., `SettingsController`, `ReportsController`, `InsuranceAnalyticsController` — out of scope for this fix), the frontend won't crash. This is a defensive measure, not the primary fix.

---

**File 4**: `apps/api/src/settings/settings.controller.ts` (OUT OF SCOPE — document only)

**Note**: This controller also manually wraps responses (`bulkUpdateSettings`, SMTP methods). However, the settings pages are not currently reported as broken. This should be addressed in a separate ticket to avoid scope creep.

---

**File 5**: `apps/api/src/laboratory/reports/reports.controller.ts` and `insurance-analytics.controller.ts` (OUT OF SCOPE — document only)

**Note**: These controllers also manually wrap. They serve the reports/analytics pages which are not part of this bug report. Separate ticket recommended.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Write integration tests that call `UsersController` endpoints and inspect the raw HTTP response shape. Run with the unfixed code to observe double-wrapping. Also test that `NEXT_PUBLIC_API_URL=""` causes requests to resolve to the wrong port.

**Test Cases**:
1. **Double-Wrap Detection**: Call `GET /api/v1/users` → assert response body has shape `{ success, data: { success, data: ... } }` (will PASS on unfixed code, demonstrating the bug)
2. **URL Resolution Test**: With `NEXT_PUBLIC_API_URL=""`, construct a fetch URL → assert it equals `"/api/v1/users"` (relative, same-origin — demonstrates the bug)
3. **Frontend Parse Failure**: Simulate the double-wrapped response → assert that `response.data.data` is NOT an array (demonstrates why `.map()` fails)
4. **Master Data Fetch with Empty URL**: Simulate `apiClient.get("/api/v1/master/units")` with empty base URL → assert request goes to port 3000 (demonstrates 404 cause)

**Expected Counterexamples**:
- Response from `GET /api/v1/users` contains nested `success` fields (double-envelope confirmed)
- Frontend `apiClient` with empty base URL produces same-origin requests that miss the backend

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL endpoint IN [GET /users, POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id] DO
  response := callEndpoint_fixed(endpoint)
  ASSERT response.data IS NOT { success: boolean, message: string, data: any }
  ASSERT response HAS SHAPE { success: true, message: "Success", data: T }
  ASSERT T = rawServiceResult(endpoint)
END FOR

FOR ALL env WHERE env.NEXT_PUBLIC_API_URL = undefined DO
  resolvedUrl := resolveApiUrl(env, docker-compose-defaults)
  ASSERT resolvedUrl = "http://localhost:3001"
END FOR

FOR ALL response WHERE isDoubleWrapped(response) DO
  unwrapped := unwrapResponse(response)
  ASSERT unwrapped = response.data.data  // extracts inner payload
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL endpoint IN [/patients/*, /orders/*, /lab/*, /dashboard/*, /visits/*, /master/*] DO
  ASSERT response_fixed(endpoint) = response_original(endpoint)
END FOR

FOR ALL env WHERE env.NEXT_PUBLIC_API_URL IS explicitly set (non-empty or production) DO
  ASSERT resolveApiUrl_fixed(env) = resolveApiUrl_original(env)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many response shape variations to verify the unwrap utility doesn't corrupt valid single-envelope responses
- It catches edge cases (null data, empty arrays, nested objects that happen to have a `success` field)
- It provides strong guarantees that non-affected endpoints remain unchanged

**Test Plan**: Observe behavior on UNFIXED code first for patients, orders, lab, dashboard endpoints (which already work correctly with single-envelope), then write property-based tests that assert these continue to work identically after the fix.

**Test Cases**:
1. **MasterDataController Preservation**: Verify `GET /api/v1/master/test-categories` response shape is unchanged (was already correct — single envelope)
2. **Patients Endpoint Preservation**: Verify `GET /api/v1/patients` response parsing continues to work
3. **Orders Endpoint Preservation**: Verify order creation and listing continue to work
4. **Dashboard Preservation**: Verify dashboard summary data continues to load
5. **Production Config Preservation**: Verify that setting `NEXT_PUBLIC_API_URL=""` explicitly still works for Nginx proxy topology

### Unit Tests

- Test `UsersController` methods return raw data (no manual envelope)
- Test `unwrapResponse()` utility correctly handles: single-wrap (pass-through), double-wrap (extract inner), null data, empty array data
- Test docker-compose env resolution with and without explicit override
- Test `apiClient.request()` applies unwrap without breaking valid responses

### Property-Based Tests

- Generate random response shapes and verify `unwrapResponse()` is idempotent on single-envelope responses
- Generate random paginated data (arrays of varying length, nested objects) and verify roundtrip through unwrap
- Generate random `NEXT_PUBLIC_API_URL` values (empty, localhost:3001, https://domain.com) and verify correct resolution
- Generate random controller return values and verify `TransformInterceptor` produces exactly one envelope layer

### Integration Tests

- Test full user CRUD flow: create user → refetch list → verify user appears in response array
- Test master-data entity pages with correct `NEXT_PUBLIC_API_URL` → verify data loads without 404
- Test that switching between master-data entities via the dynamic `[entity]` route works
- Test production-like config (empty `NEXT_PUBLIC_API_URL` behind Nginx mock) still routes correctly
