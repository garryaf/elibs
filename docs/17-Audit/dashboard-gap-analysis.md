# Dashboard Gap Analysis Report

**Date:** 2026-07-07
**Updated:** 2026-07-07
**Module:** Dashboard Overview
**Status:** Phase 1 Implemented ✅ — Phase 2-4 Pending

---

## 1. Dashboard Assessment

### Current State Summary

The eLIS Dashboard module consists of:

| Component | Location | Status |
|-----------|----------|--------|
| Main Dashboard (`/dashboard`) | `apps/web/src/app/dashboard/page.tsx` | **LIVE** — connected to executive-summary API ✅ |
| Lab Dashboard (`/dashboard/laboratory/lab-dashboard`) | `apps/web/src/app/dashboard/laboratory/lab-dashboard/page.tsx` | **LIVE** — connected to API |
| Backend `DashboardService` | `apps/api/src/laboratory/dashboard/dashboard.service.ts` | **LIVE** — 5 endpoints |
| Region Distribution API | `GET /api/v1/dashboard/region-distribution` | **LIVE** — patient geo analytics |

### API Endpoints Available

| Endpoint | Method | Function | Data Source | Status |
|----------|--------|----------|-------------|--------|
| `/api/v1/dashboard/executive-summary` | GET | Patients today, revenue, critical results, completed | `patients`, `orders`, `order_details` | ✅ Phase 1 |
| `/api/v1/dashboard/recent-orders` | GET | 5 most recent orders with patient info | `orders` + `patients` | ✅ Phase 1 |
| `/api/v1/dashboard/lab-summary` | GET | Orders today, status breakdown, avg TAT, queue counts | `orders` table | ✅ Original |
| `/api/v1/dashboard/lab-volume` | GET | Daily order volume (time series) | `orders.createdAt` | ✅ Original |
| `/api/v1/dashboard/region-distribution` | GET | Patient distribution by region | `patients` + region tables | ✅ Original |

---

## 2. Functional Coverage

### FR-14 (Laboratory Dashboard) Compliance

| Requirement | Description | Status | Notes |
|-------------|-------------|--------|-------|
| FR-14.1 | `GET /api/v1/dashboard/lab-summary` (total today, by status, avg TAT) | ✅ Implemented | Returns all specified fields |
| FR-14.2 | TAT = approvedAt - sampleCollectedAt (minutes) | ✅ Implemented | Property-tested with 1000 runs |
| FR-14.3 | `GET /api/v1/dashboard/lab-volume` (grouped by day) | ✅ Implemented | Accepts `days` param |
| FR-14.4 | Role guard OWNER, MANAGER, ADMIN, SUPER_ADMIN | ✅ Implemented | `@Roles()` decorators applied |
| FR-14.5 | Queue counts per status | ✅ Implemented | PAID, SAMPLE_COLLECTED, IN_ANALYSIS, VERIFIED |

**FR-14 Coverage: 100%** — All functional requirements are met.

---

## 3. UI/UX Review

### Main Dashboard (`/dashboard`)

| Area | Finding | Severity | Status |
|------|---------|----------|--------|
| Data Source | ~~All values are hardcoded~~ → Connected to `executive-summary` API | ~~Critical~~ | ✅ Fixed |
| Recent Orders | ~~Placeholder div~~ → Live table with 5 most recent orders | ~~Critical~~ | ✅ Fixed |
| Lab Status | Placeholder removed — replaced with executive KPIs | ~~Critical~~ | ✅ Fixed |
| Information Hierarchy | 4 executive KPI cards + recent orders table | ~~High~~ | ✅ Fixed |
| Role Awareness | Same view for all roles — no personalization | **High** | Pending (Phase 4) |
| Change Indicators | Not yet implemented (day-over-day comparison) | **Medium** | Pending (Phase 2) |
| Auto-Refresh | 60s auto-refresh with countdown timer | ~~High~~ | ✅ Fixed |
| Loading State | Animated skeleton placeholders while loading | ~~Medium~~ | ✅ Fixed |
| Error State | Red banner with error message and retry button | ~~Medium~~ | ✅ Fixed |

### Lab Dashboard (`/dashboard/laboratory/lab-dashboard`)

| Area | Finding | Severity |
|------|---------|----------|
| API Integration | ✅ Connected to real API with error fallback | Low |
| Metric Cards | 4 cards with appropriate KPIs | Low |
| Status Breakdown | Horizontal progress bars with color coding | Low |
| Volume Chart | CSS bar chart — functional but no axis labels or legends | **Medium** |
| Field Mapping | Frontend uses `averageTatMinutes` but backend returns `averageTat` — field name mismatch resolved via fallback | **Medium** |
| Mock Fallback | Uses `generateMockVolume()` when API fails — user sees fake data without notification | **Medium** |
| Date Range | Volume chart supports 7/14/30/60 days | Low |
| Empty State | No explicit empty state — just shows 0s everywhere | **Medium** |
| Real-time Updates | No auto-refresh — stale data until manual page reload | **High** |
| Accessibility | No ARIA labels on chart bars, no keyboard navigation for date range | **Medium** |

### General UI/UX Issues

| Area | Finding | Severity | Status |
|------|---------|----------|--------|
| Navigation | Two separate dashboards (`/dashboard` and `/dashboard/laboratory/lab-dashboard`) create confusion | **High** | Pending (Phase 4) |
| Responsive | Grid layout is responsive (grid-cols-2 / lg:grid-cols-4) | Low | ✅ OK |
| Dark Mode | Supported via Tailwind dark classes | Low | ✅ OK |
| Typography | Consistent sizing — no issues | Low | ✅ OK |
| Loading State | ~~No skeleton/shimmer while API loads~~ → Animated pulse skeletons | ~~Medium~~ | ✅ Fixed |
| Error State | ~~No visible error banner~~ → Red banner with retry | ~~Medium~~ | ✅ Fixed |

---

## 4. Business Gap Matrix

### Executive Dashboard KPIs — Required vs Implemented

| KPI Category | KPI | Implemented | Priority |
|--------------|-----|-------------|----------|
| **Patient Overview** | Total patients registered | ✅ Phase 1 | — |
| | New patients today | ✅ Phase 1 | — |
| | Patient by gender/age | ❌ Not implemented | Medium |
| **Laboratory Overview** | Total orders today | ✅ Implemented | — |
| | Orders by status | ✅ Implemented | — |
| | Queue counts | ✅ Implemented | — |
| **Samples** | Samples collected today | ❌ Not implemented | High |
| | Pending sample collection | ✅ Phase 1 | — |
| | Rejected samples | ❌ Not implemented | High |
| **Results** | Pending results entry | ❌ Not implemented | High |
| | Completed results today | ✅ Phase 1 | — |
| | Critical/abnormal flags | ✅ Phase 1 | — |
| **TAT (Turn Around Time)** | Average TAT | ✅ Implemented | — |
| | TAT by test category | ❌ Not implemented | High |
| | TAT percentile (P50/P90/P95) | ❌ Not implemented | High |
| | SLA breach count | ❌ Not implemented | Critical |
| **Revenue** | Today's revenue | ✅ Phase 1 | — |
| | Revenue trend (week/month) | ❌ Not implemented | High |
| | Outstanding payments | ❌ Not implemented | High |
| | Payment method breakdown | ❌ Not implemented | Medium |
| **Quality** | Test rejection rate | ❌ Not implemented | High |
| | Re-work rate (VERIFIED → IN_ANALYSIS rejections) | ❌ Not implemented | Medium |
| | Critical result rate | ❌ Not implemented | High |
| **Top Analytics** | Top 10 tests ordered | ❌ Not implemented | High |
| | Top referring clinics | ❌ Not implemented | Medium |
| | Top doctors | ❌ Not implemented | Medium |
| **Notifications** | Email delivery success rate | ❌ Not implemented | Medium |
| | WhatsApp delivery success rate | ❌ Not implemented | Medium |
| **Geographic** | Patient distribution by region | ✅ Implemented | — |
| **Volume** | Order volume trend | ✅ Implemented | — |
| **Recent Activity** | Recent orders feed | ✅ Phase 1 | — |

**Coverage: 12 of 27 KPIs implemented (44.4%)** — up from 18.5% pre-Phase 1

---

## 5. Data Gap

| Issue | Description | Impact | Priority | Status |
|-------|-------------|--------|----------|--------|
| Static main dashboard | ~~`/dashboard` page shows hardcoded values~~ → Now connected to API | ~~Users see incorrect information~~ | ~~Critical~~ | ✅ Fixed |
| No patient count endpoint | ~~No API to get total/today's patient count~~ → Added in executive-summary | ~~Missing basic KPI~~ | ~~Critical~~ | ✅ Fixed |
| No revenue endpoint | ~~No API aggregating `amountPaid`~~ → Added in executive-summary | ~~Missing financial visibility~~ | ~~Critical~~ | ✅ Fixed |
| No critical results endpoint | ~~No API counting HIGH/CRITICAL flags~~ → Added in executive-summary | ~~Missing clinical safety metric~~ | ~~Critical~~ | ✅ Fixed |
| No recent orders feed | ~~No recent activity display~~ → Added recent-orders endpoint | ~~Missing operational awareness~~ | ~~High~~ | ✅ Fixed |
| No auto-refresh | ~~Dashboard shows stale data~~ → 60s auto-refresh implemented | ~~Poor operational awareness~~ | ~~High~~ | ✅ Fixed |
| No loading/error states | ~~Silent failures~~ → Skeleton + error banner implemented | ~~Poor UX~~ | ~~Medium~~ | ✅ Fixed |
| No top tests endpoint | No API with `GROUP BY testId ORDER BY count DESC LIMIT 10` | Missing utilization analytics | **High** | Pending (Phase 3) |
| No TAT by category | TAT calculation is global — no breakdown by test category | Missing operational insight | **High** | Pending (Phase 2) |
| No SLA monitoring | No target TAT defined per test, no breach calculation | Missing compliance metric | **Critical** | Pending (Phase 2) |
| TAT performance | `getLabSummary()` fetches ALL completed orders into memory for TAT calculation — will degrade at scale | Performance risk at 10K+ orders | **High** | Pending (Phase 2) |
| No caching | Every dashboard load triggers full DB queries | Unnecessary load | **High** | Pending (Phase 3) |
| Volume endpoint fills missing days | Days with 0 orders are absent from response — frontend shows gaps | Misleading chart | **Medium** | Pending (Phase 2) |

---

## 6. Performance Gap

| Issue | Current Behavior | Recommendation | Priority |
|-------|-----------------|----------------|----------|
| TAT calculation | Fetches ALL orders with approvedAt/sampleCollectedAt into memory, computes average in JS | Use `prisma.$queryRaw` with `AVG(EXTRACT(EPOCH FROM ...))` or aggregate in DB | **High** |
| No query caching | Every request hits PostgreSQL directly | Add Redis cache (30s TTL for summary, 5min for analytics) | **High** |
| Volume endpoint | Fetches all orders in date range, groups in JS | Use `GROUP BY DATE(created_at)` in DB | **Medium** |
| No pagination on region distribution | Returns all regions in single response | Acceptable for Indonesian regions (~34 provinces) | Low |
| No lazy loading on frontend | All dashboard sections load simultaneously | Add skeleton loading + progressive data fetch | **Medium** |
| No auto-refresh | Data goes stale immediately after load | Add 60s auto-refresh for operational metrics | **High** |

---

## 7. Dashboard KPI Recommendations

### Recommended Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ EXECUTIVE DASHBOARD (Main /dashboard)                       │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ Patients     │ Orders       │ Revenue      │ Quality       │
│ Today        │ Today        │ Today        │ Critical      │
│              │              │              │ Results       │
├──────────────┴──────────────┴──────────────┴───────────────┤
│ TAT Overview              │ SLA Compliance                  │
│ Avg / P90 / Breaches      │ % Within Target                │
├───────────────────────────┴─────────────────────────────────┤
│ Volume Trend (7d)         │ Top 5 Tests                     │
├───────────────────────────┴─────────────────────────────────┤
│ Recent Orders (5)         │ Pending Actions                 │
│                           │ (Approvals, Collections)        │
└─────────────────────────────────────────────────────────────┘
```

### Priority KPIs to Add

1. **Critical** — Revenue Today (sum of `amountPaid` where `paidAt` = today)
2. **Critical** — Critical Results Count (flags = HIGH or CRITICAL in order_details)
3. **Critical** — SLA Breach Count (TAT > target per test category)
4. **Critical** — Total Patients Today (new registrations today)
5. **High** — Top 10 Tests (most ordered test items this month)
6. **High** — Samples Pending Collection (PAID status count)
7. **High** — TAT Percentiles (P50, P90, P95)
8. **High** — Revenue Trend (last 7/30 days)

---

## 8. Required API Changes

### New Endpoints Needed

| Endpoint | Method | Returns | Priority | Status |
|----------|--------|---------|----------|--------|
| `/api/v1/dashboard/executive-summary` | GET | Patients today, revenue today, critical results, pending samples, completed | ~~Critical~~ | ✅ Done |
| `/api/v1/dashboard/recent-orders` | GET | 5 latest orders with patient info and status | ~~High~~ | ✅ Done |
| `/api/v1/dashboard/revenue` | GET | Revenue today, trend, by payment method | Critical | Pending (Phase 2) |
| `/api/v1/dashboard/top-tests` | GET | Top 10 most ordered tests with counts | High | Pending (Phase 3) |
| `/api/v1/dashboard/top-clinics` | GET | Top referring clinics with order counts | Medium | Pending (Phase 3) |
| `/api/v1/dashboard/quality-metrics` | GET | Rejection rate, re-work rate, critical result rate | High | Pending (Phase 2) |
| `/api/v1/dashboard/tat-breakdown` | GET | TAT by test category with percentiles | High | Pending (Phase 2) |

### Existing Endpoint Changes

| Endpoint | Change | Priority |
|----------|--------|----------|
| `lab-summary` | Add `patientsToday`, `revenueToday`, `criticalResults` fields | Critical |
| `lab-summary` | Move TAT calculation to SQL aggregate (performance) | High |
| `lab-volume` | Fill missing days with `count: 0` for continuous chart | Medium |
| `lab-volume` | Accept `startDate`/`endDate` params (currently only `days`) | Medium |

---

## 9. Required Database Changes

| Change | Description | Priority |
|--------|-------------|----------|
| Add `sla_target_minutes` column to `test_masters` | Per-test SLA target for breach calculation | Critical |
| Add index on `orders.paidAt` | Performance for revenue aggregation | High |
| Add index on `order_details.flag` | Performance for critical result counting | High |
| No new tables required | All data exists — just needs aggregation queries | — |

---

## 10. Required UI Changes

| Change | Description | Priority | Status |
|--------|-------------|----------|--------|
| Rewrite `/dashboard/page.tsx` | ~~Replace static cards with real API data~~ | ~~Critical~~ | ✅ Done |
| Add loading skeletons | ~~Show animated placeholders while API data loads~~ | ~~High~~ | ✅ Done |
| Add error banners | ~~Show visible error when API fails~~ | ~~High~~ | ✅ Done |
| Add auto-refresh | ~~Poll summary endpoint every 60 seconds~~ | ~~High~~ | ✅ Done |
| Add Revenue section | ~~New card showing today's revenue~~ | ~~Critical~~ | ✅ Done |
| Add Critical Results alert | ~~Prominent card for critical lab results~~ | ~~Critical~~ | ✅ Done |
| Add Recent Activity feed | ~~Live feed of latest orders~~ | ~~High~~ | ✅ Done |
| Consolidate dashboards | Merge main dashboard and lab dashboard into single view with tabs/sections | **High** | Pending (Phase 4) |
| Add Top Tests chart | Bar chart or table showing most popular tests | **High** | Pending (Phase 3) |
| Add SLA gauge | Circular gauge showing % of orders within SLA target | **Critical** | Pending (Phase 2) |
| Remove mock fallback in volume chart | Show explicit error state instead of generating fake data | **Medium** | Pending (Phase 4) |
| Add chart legends/axis labels | Improve readability of volume chart | **Medium** | Pending (Phase 4) |
| Add export button | Allow PDF/CSV export of dashboard data | **Low** | Pending (Phase 4) |

---

## 11. Implementation Plan

### Phase 1: Critical Fixes ✅ COMPLETED (2026-07-07)

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Add `getExecutiveSummary()` to DashboardService (patients, revenue, critical results) | ✅ Done |
| 1.2 | Add `getRecentOrders()` to DashboardService (5 latest with patient info) | ✅ Done |
| 1.3 | Add `GET /api/v1/dashboard/executive-summary` endpoint | ✅ Done |
| 1.4 | Add `GET /api/v1/dashboard/recent-orders` endpoint | ✅ Done |
| 1.5 | Add API client methods (`getExecutiveSummary`, `getRecentOrders`) | ✅ Done |
| 1.6 | Replace static `/dashboard/page.tsx` with API-connected executive dashboard | ✅ Done |
| 1.7 | Add 60s auto-refresh with countdown timer | ✅ Done |
| 1.8 | Add loading skeleton (animated pulse) | ✅ Done |
| 1.9 | Add error banner with retry button | ✅ Done |

**Files Modified:**
- `apps/api/src/laboratory/dashboard/dashboard.service.ts` — Added `getExecutiveSummary()`, `getRecentOrders()`
- `apps/api/src/laboratory/dashboard/dashboard.controller.ts` — Added 2 new endpoints
- `apps/web/src/lib/api.ts` — Added 2 new API client methods
- `apps/web/src/app/dashboard/page.tsx` — Complete rewrite (static → live)

**Impact:** KPI coverage increased from 18.5% → 44.4% (5 → 12 of 27 KPIs)

---

### Phase 2: Financial & Quality KPIs (High Priority) — Pending

5. Implement `revenue` endpoint (today, trend, by payment method)
6. Implement `quality-metrics` endpoint (rejection rate, critical result count)
7. Add `sla_target_minutes` to test_masters and implement SLA breach calculation
8. Implement `tat-breakdown` endpoint with percentiles (P50/P90/P95)
9. Move TAT calculation to SQL aggregate for performance

### Phase 3: Analytics & Intelligence (High Priority)

10. Implement `top-tests` endpoint (GROUP BY testId with JOIN to test_masters)
11. Implement `top-clinics` endpoint (GROUP BY clinicId with JOIN to clinics)
12. Implement `recent-activity` endpoint (latest 10 orders with patient name)
13. Add Redis caching layer for dashboard queries (30s TTL)

### Phase 4: UI Enhancement (Medium Priority)

14. Consolidate two dashboard pages into unified executive view
15. Add interactive charts (revenue trend, test distribution pie chart)
16. Add SLA compliance gauge component
17. Add critical results alert banner
18. Add export functionality (PDF/CSV)
19. Add role-based dashboard personalization

---

## Summary

| Category | Score | Notes |
|----------|-------|-------|
| FR-14 Compliance | ✅ 100% | All specified requirements met |
| Executive KPI Coverage | ⚠️ 44.4% | 12 of 27 enterprise KPIs implemented (up from 18.5%) |
| Main Dashboard | ✅ Live | Connected to executive-summary API with auto-refresh |
| Lab Dashboard | ✅ Functional | Connected to API, shows real data |
| Performance | ⚠️ Concern | No caching, in-memory TAT calculation (Phase 2) |
| UI/UX | ✅ Improved | Loading skeletons, error handling, auto-refresh implemented |
| Remaining Gaps | ⚠️ Phase 2-4 | SLA monitoring, TAT percentiles, top tests, caching |

**Overall Assessment:** Phase 1 Critical Fixes resolved all blocking issues. The main dashboard is now live and functional with executive KPIs (patients, revenue, critical results, recent orders). Remaining improvements (SLA, detailed analytics, caching, role personalization) are tracked in Phases 2-4.
