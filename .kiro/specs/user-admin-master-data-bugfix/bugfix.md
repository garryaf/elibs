# Bugfix Requirements Document

## Introduction

Four interrelated bugs prevent proper operation of User Administration and Master Data features in the eLIS frontend. The bugs share a common root cause pattern: API response shape mismatch caused by a double-envelope problem (controller wraps response manually, then `TransformInterceptor` wraps again globally), compounded by an API URL misconfiguration in the main `docker-compose.yml` that causes the frontend to call itself instead of the backend. These issues manifest as: (1) newly created users not appearing in the list, (2) Master Data child routes returning HTTP 404 when `NEXT_PUBLIC_API_URL` is empty and requests hit the frontend's own Next.js server, (3) `e.map is not a function` runtime errors when the double-wrapped response object is iterated directly, and (4) API requests resolving to the wrong port due to missing/empty `NEXT_PUBLIC_API_URL` environment variable in the default Docker Compose configuration.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user creates a new user via the admin form at `/dashboard/administration/users` and the API successfully returns the created user THEN the system receives a double-wrapped response `{ success, message, data: { success, message, data: { data: [...], meta: {...} } } }` from the `GET /api/v1/users` refetch, causing the unwrapping logic `envelope?.data` to resolve to the inner envelope object rather than the user array

1.2 WHEN the frontend is running with the default `docker-compose.yml` configuration where `NEXT_PUBLIC_API_URL` defaults to empty string THEN the system sends API requests to relative paths (same-origin port 3000), which hit the Next.js server instead of the NestJS backend on port 3001, returning HTML 404 pages instead of JSON responses

1.3 WHEN the frontend navigates to any Master Data child route (e.g., `/dashboard/master-data/kategori-pemeriksaan`) and the `NEXT_PUBLIC_API_URL` is empty THEN the system returns HTTP 404 because the API request goes to `http://localhost:3000/api/v1/master/*` (Next.js) instead of `http://localhost:3001/api/v1/master/*` (NestJS backend)

1.4 WHEN the frontend receives the double-wrapped API response and attempts to render a list by calling `.map()` on the response data THEN the system throws `Uncaught TypeError: e.map is not a function` because `.map()` is called on the envelope object `{ success: true, message: "...", data: { data: [...], meta: {...} } }` instead of on the actual array

1.5 WHEN the `UsersController.findAll()` returns `{ success: true, message: "...", data: { data: [...], meta: {...} } }` and the global `TransformInterceptor` wraps it again THEN the final HTTP response body becomes `{ success: true, message: "Success", data: { success: true, message: "...", data: { data: [...], meta: {...} } } }` — a triple-nested structure that breaks frontend extraction logic

### Expected Behavior (Correct)

2.1 WHEN a user creates a new user via the admin form and the system refetches the user list THEN the system SHALL correctly extract the user array from the API response regardless of envelope depth and display the newly created user in the table immediately

2.2 WHEN the frontend is configured via any Docker Compose file (dev, prod, or default) THEN the system SHALL have `NEXT_PUBLIC_API_URL` properly set to point to the backend API (e.g., `http://localhost:3001` for local development), ensuring API requests reach the NestJS backend

2.3 WHEN the frontend navigates to any Master Data child route (`kategori-pemeriksaan`, `pemeriksaan-lab`, `panel`, `dokter`, `klinik`, `asuransi`, `alat`, `reagen`, `satuan`, `jenis-sampel`) THEN the system SHALL render the entity CRUD page by successfully fetching data from the backend API without returning HTTP 404

2.4 WHEN the frontend receives an API response THEN the system SHALL defensively unwrap the response envelope to extract the data array, handling both single-wrap `{ success, message, data: { data: [...], meta } }` and double-wrap `{ success, message, data: { success, message, data: { data: [...], meta } } }` structures without throwing runtime errors

2.5 WHEN the `UsersController` (and other controllers that manually wrap responses) return data THEN the system SHALL either remove the manual envelope wrapping from the controller (letting `TransformInterceptor` handle it) OR the frontend SHALL handle the resulting response shape correctly, eliminating the double-wrap inconsistency

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend API endpoints at `/api/v1/users`, `/api/v1/master/*`, `/api/v1/patients`, `/api/v1/orders` receive valid authenticated requests THEN the system SHALL CONTINUE TO return correct data with proper authentication and role-based access control

3.2 WHEN existing features (patients, orders, lab workflow, dashboard, visits) make API calls THEN the system SHALL CONTINUE TO function correctly with their current response parsing logic

3.3 WHEN the frontend is deployed behind Nginx in production with `NEXT_PUBLIC_API_URL` set to the production API domain THEN the system SHALL CONTINUE TO work correctly with the reverse proxy configuration

3.4 WHEN the user administration page displays the user list with search, role filter, edit, and delete functionality THEN the system SHALL CONTINUE TO provide all existing CRUD operations without regression

3.5 WHEN the Master Data main page at `/dashboard/master-data` renders the grid of 10 entity cards THEN the system SHALL CONTINUE TO display the same visual layout, card names, descriptions, and icons

---

## Bug Condition (Formal)

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ApiRequest
  OUTPUT: boolean
  
  // Returns true when the request will fail due to the bugs
  RETURN (
    X.apiBaseUrl = "" AND X.targetEndpoint STARTS_WITH "/api/v1/"
  ) OR (
    X.responseShape = "double-wrapped" AND X.frontendExpects = "single-wrapped"
  )
END FUNCTION
```

```pascal
FUNCTION isUrlMisconfigured(env)
  INPUT: env of type DockerComposeEnvironment
  OUTPUT: boolean
  
  // Returns true when NEXT_PUBLIC_API_URL is empty/missing in dev context
  RETURN env.NEXT_PUBLIC_API_URL = "" OR env.NEXT_PUBLIC_API_URL = undefined
END FUNCTION
```

```pascal
FUNCTION isDoubleWrapped(response)
  INPUT: response of type HttpResponseBody
  OUTPUT: boolean
  
  // Returns true when controller manually wraps AND TransformInterceptor also wraps
  RETURN response.data IS Object 
    AND response.data.success IS boolean
    AND response.data.data IS Object
END FUNCTION
```

```pascal
// Property: Fix Checking - API URL Resolution
FOR ALL X WHERE isUrlMisconfigured(X.env) DO
  config ← resolveApiUrl'(X.env)
  ASSERT config.NEXT_PUBLIC_API_URL = "http://localhost:3001"
END FOR
```

```pascal
// Property: Fix Checking - Response Unwrapping
FOR ALL X WHERE isDoubleWrapped(X.response) DO
  extracted ← unwrapResponse'(X.response)
  ASSERT Array.isArray(extracted.data) AND extracted.meta IS Object
END FOR
```

```pascal
// Property: Fix Checking - User List After Create
FOR ALL X WHERE X.action = "createUser" AND X.success = true DO
  list ← refetchUsers'()
  ASSERT X.createdUser IN list.data
END FOR
```

```pascal
// Property: Fix Checking - Master Data Route Resolution
FOR ALL X WHERE X.route IN masterDataChildRoutes DO
  result ← navigateAndFetch'(X.route)
  ASSERT result.httpStatus ≠ 404 AND Array.isArray(result.items)
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
