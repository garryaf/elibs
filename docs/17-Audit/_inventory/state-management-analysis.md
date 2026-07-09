# State Management Analysis

**Scope:** `apps/web/src/`
**Date:** 2026-07-09
**Task:** 3.5 — Analyze state management patterns
**Requirements:** 2.6

---

## 1. State Management Libraries & Tools

| Category | Library/Tool | Detected |
|----------|--------------|----------|
| Dedicated State Library | Zustand, Redux, Jotai, Recoil | ❌ None |
| Server State (caching) | TanStack Query, SWR | ❌ None |
| React Context | createContext/useContext | ✅ AuthContext only |
| React Hooks | useState, useEffect, useCallback, useMemo | ✅ Primary pattern |
| useReducer | — | ❌ Not used |

**Summary:** The application uses only React built-in primitives (useState, useEffect, useContext) for all state management. No third-party state management or server-state caching library is installed.

---

## 2. Global State

### 2.1 AuthContext (Only Global State)

| Property | Value |
|----------|-------|
| File | `lib/auth-context.tsx` |
| Pattern | React Context + Provider |
| Scope | Entire application (wrapped at `app/layout.tsx`) |
| State Shape | `{ user, token, isLoading, login, logout }` |
| Consumers | `app/page.tsx` (login), `components/layout/header.tsx` (user display & logout) |
| Consumer Count | 2 components (login page + header) |

**Assessment:** AuthContext is the only global state in the entire application. It is used by only 2 components, which is below the "3+ unrelated components" threshold for concern. This is a well-scoped, minimal global context.

### 2.2 Absence of Other Global State

There are no other React Context providers, no Zustand stores, no Redux stores, and no Jotai atoms in the codebase. Each page manages its own data independently through direct `apiClient` calls.

---

## 3. Local State Boundaries

### 3.1 Page-Level State (Correct Pattern — Each Page Self-Contained)

| Page | State Variables | Pattern |
|------|----------------|---------|
| `dashboard/page.tsx` | summary, orders, loading, error, lastUpdated, countdown | Direct API fetch on mount + auto-refresh interval |
| `dashboard/patients/page.tsx` | patients, loading, search, statusFilter, isModalOpen, editingPatient, viewingPatient | Direct API fetch + local UI state |
| `dashboard/orders/page.tsx` | orders, search, statusFilter | Direct API fetch + local filtering |
| `dashboard/orders/new/page.tsx` | Multi-step wizard (step, patient, tests, categories) | Local wizard state |
| `dashboard/laboratory/queue/page.tsx` | orders, totalItems, isLoading, page, activeTab, search, expandedOrderId | Direct API fetch + local pagination |
| `dashboard/settings/page.tsx` | activeTab, data, loading, search, formModal state | Direct API fetch per tab |
| `dashboard/audit-trail/page.tsx` | logs, page, totalPages, total, filters, loading | Direct API fetch + server-side pagination |

**Assessment:** Each page encapsulates its own data-fetching and UI state. There is no cross-page state sharing, which is both a strength (isolation) and a weakness (no cross-page caching).

### 3.2 Component-Level State

| Component | State | Purpose |
|-----------|-------|---------|
| `OrderTable` | currentPage | Local pagination within table |
| `PatientTable` | currentPage | Local pagination within table |
| `RegionSelect` | isOpen | Dropdown open/close |
| `CascadingRegionSelector` | (none — delegates to hooks) | Renders 4 `useRegionData` hooks |
| `PatientFormModal` | form, errors, isSubmitting | Form state |
| `SmtpSettingsPanel` | config, loading, saving, testing, testEmail, message | Settings form state |

---

## 4. Server State Caching Strategy

### 4.1 Custom `useRegionData` Hook — Manual Cache

| Property | Value |
|----------|-------|
| File | `components/regions/useRegionData.ts` |
| Cache Type | In-memory `Map<string, CacheEntry>` (module-level singleton) |
| TTL | 5 minutes (`CACHE_TTL_MS = 5 * 60 * 1000`) |
| Cache Key | `${endpoint}:${parentId}:${search}` |
| Invalidation | Manual `retry()` clears specific cache key |
| Request Deduplication | AbortController cancels previous in-flight request |
| Debouncing | 300ms search debounce |

**Assessment:** This is the only component with any caching strategy. It's a well-implemented local cache for the specific use case of cascading region selectors. However, it uses a module-level `Map` which persists across re-renders but is lost on page navigation in SPA (acceptable for this use case).

### 4.2 Custom `useApi` Hook — No Cache

| Property | Value |
|----------|-------|
| File | `lib/hooks.ts` |
| Cache | ❌ None |
| Deduplication | ❌ None |
| Stale-While-Revalidate | ❌ None |
| Usage | **Not used by any page** — defined but orphaned |

**Assessment:** The `useApi` generic hook and all specific hooks (`usePatients`, `useOrders`, `useTests`, etc.) are defined in `lib/hooks.ts` but never imported by any page component. Pages directly call `apiClient` with their own useState/useEffect patterns. This represents **dead code** and a missed opportunity for consistent data-fetching patterns.

### 4.3 Direct `apiClient` Usage (No Cache)

All page components fetch data directly via `apiClient` without caching:
- Every page re-fetches all data on mount
- No stale-while-revalidate pattern
- No background refetching
- No cross-page data sharing (navigating away → navigating back triggers fresh fetch)
- Only exception: Dashboard auto-refreshes every 60 seconds

---

## 5. Anti-Pattern Detection

### 5.1 Prop Drilling Analysis

| Chain | Depth | Assessment |
|-------|-------|------------|
| PatientsPage → PatientTable → (row rendering) | 2 levels | ✅ Acceptable |
| PatientsPage → PatientTable → ActionMenu | 3 levels (page → table → action menu with callbacks) | ⚠️ Borderline — callbacks pass through table to ActionMenu |
| PatientFormModal → CascadingRegionSelector → RegionSelect | 3 levels | ⚠️ Borderline — but this is props composition, not drilling |
| OrdersPage → OrderTable → (row rendering) | 2 levels | ✅ Acceptable |
| LabQueuePage → OrderRow | 2 levels | ✅ Acceptable |

**Verdict:** No prop drilling exceeding 3 levels detected. The deepest callback passing chain is PatientTable (page → table → ActionMenu) at exactly 3 levels, which is at the threshold but still manageable.

### 5.2 Storing Derived Values in State

| Location | Pattern | Assessment |
|----------|---------|------------|
| `patients/page.tsx` | `filteredPatients` via `useMemo` | ✅ Correct — computed via useMemo, not stored in state |
| `orders/page.tsx` | `filtered` via `useMemo` | ✅ Correct — computed via useMemo |
| `settings/page.tsx` | `filteredData` via `useMemo` | ✅ Correct — computed via useMemo |
| `orders/page.tsx` | `stats` computed inline (not memoized) | ⚠️ Minor — recomputes on every render, but harmless for small datasets |
| `patients/page.tsx` | `stats` computed inline (not memoized) | ⚠️ Minor — same as above |

**Verdict:** No anti-pattern of storing derived values in `useState` detected. All derived computations use `useMemo` or inline computation correctly.

### 5.3 Duplicating Server Data Without Caching Layer

| Pattern | Detected | Severity |
|---------|----------|----------|
| Pages store server data in local `useState` without caching | ✅ Yes — all pages | Medium |
| Same data fetched independently by multiple components | ⚠️ Potential — if two pages need same data (e.g., test categories) | Low (currently pages are isolated) |
| `useApi` hooks defined but unused | ✅ Dead code | Low |

**Details:**
- Every page fetches its data into local `useState`. If the user navigates to `/patients`, sees data, then navigates away and back, the data is re-fetched from scratch.
- The `useRegionData` hook is the sole exception with a 5-minute in-memory cache.
- There is no shared caching layer (no TanStack Query, no SWR, no centralized store) to prevent redundant API calls or provide optimistic updates.

**Verdict:** This is the **primary architectural concern**. While not technically an anti-pattern in a small app, for an enterprise LIS system with many concurrent users, this leads to:
1. Redundant network requests on every navigation
2. No optimistic UI updates
3. Inconsistent data between components (two tabs could show different snapshots)
4. No request deduplication if user rapidly navigates

### 5.4 Direct State Mutation Outside State Management Functions

| Pattern | Detected |
|---------|----------|
| Direct array `.push()` / `.splice()` on state | ❌ Not found |
| Direct object property assignment on state | ❌ Not found |
| All state updates use `setState` or functional updates | ✅ Correct |

**Verdict:** No direct mutation anti-patterns detected. All state updates use proper immutable patterns with `setState`, spread operators, and `Array.map`/`Array.filter`.

---

## 6. Summary Findings

### Strengths
1. **Clean state boundaries** — each page is self-contained with no leaky abstractions
2. **Proper immutable updates** — no direct state mutations anywhere
3. **Correct derived state** — `useMemo` used appropriately for filtering/computation
4. **Minimal global state** — only AuthContext, which is appropriate
5. **Region caching** — `useRegionData` demonstrates proper caching pattern with TTL and request deduplication

### Weaknesses / Issues

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| SM-01 | No server-state caching library (TanStack Query/SWR absent) | Medium | Missing infrastructure |
| SM-02 | Dead code: `lib/hooks.ts` exports unused hooks (`usePatients`, `useOrders`, etc.) | Low | Code hygiene |
| SM-03 | Every page re-fetches all data on mount without caching or stale-while-revalidate | Medium | Performance |
| SM-04 | No request deduplication across components (except `useRegionData`) | Low | Performance |
| SM-05 | No optimistic update pattern for CRUD operations | Low | UX |
| SM-06 | Dashboard auto-refresh uses polling (60s) instead of WebSocket/SSE | Low | Architecture |
| SM-07 | Auth token stored in localStorage without refresh token rotation | Low | Security |

### Architecture Compliance Score Input (for Task 3.6)

| Criteria | Status | Notes |
|----------|--------|-------|
| Global state usage appropriate | ✅ Compliant | Only AuthContext, minimal scope |
| Local state boundaries defined | ✅ Compliant | Each page self-contained |
| Server state caching strategy | ❌ Non-compliant | No caching layer except regions |
| Prop drilling ≤3 levels | ✅ Compliant | Max 3 levels (borderline) |
| No derived values stored in state | ✅ Compliant | useMemo used correctly |
| No server data duplication without cache | ⚠️ Partial | Pages duplicate server data in local state without caching |
| No direct mutation outside state functions | ✅ Compliant | All mutations are immutable |

**Overall State Management Assessment:** 4/7 criteria fully compliant, 1 partially compliant, 2 non-compliant.

---

## 7. Recommendations

| Priority | Recommendation | Effort |
|----------|---------------|--------|
| P2 | Adopt TanStack Query for server state management — replaces manual fetch patterns with built-in caching, deduplication, background refetching, and optimistic updates | M (3-5 story points) |
| P3 | Remove or refactor `lib/hooks.ts` — either use the existing hooks in pages or delete dead code | S (≤2 story points) |
| P3 | Apply `useRegionData`'s caching pattern to other frequently-accessed data (test categories, doctors) | S (≤2 story points) |
| P4 | Consider WebSocket/SSE for real-time dashboard updates instead of 60s polling | M (3-5 story points) |
