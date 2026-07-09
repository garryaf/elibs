# Navigation Gap Report — Administration, Master Data & Settings Modules

**Document ID:** AUDIT-eLIS-2026-004  
**Version:** 1.0  
**Date:** 2026-07-09  
**Author:** Enterprise Architect (Automated Audit)  
**Classification:** Internal  
**Status:** Draft  

---

## Executive Summary

This report identifies navigation gaps within the **Administration, Master Data, and Settings** modules of eLIS. The analysis covers four gap categories defined by Requirement 4.3:

1. Menu items linking to non-existent or error-producing pages
2. Implemented features without corresponding menu items
3. Sidebar labels differing from rendered page titles
4. WCAG 2.1 AA accessibility concerns (2.4.1, 2.4.5, 4.1.2)

**Key Findings:**
- 2 menu items link to pages that immediately redirect (non-dedicated pages)
- 3 implemented backend features have no direct sidebar menu item
- 2 sidebar labels differ meaningfully from rendered page titles
- 6 WCAG 2.1 AA violations identified across 3 success criteria

**Total Navigation Gaps Identified: 13**

---

## Table of Contents

1. [Scope & Methodology](#1-scope--methodology)
2. [Gap Category 1: Menu Items Linking to Non-Existent Pages](#2-gap-category-1-menu-items-linking-to-non-existent-pages)
3. [Gap Category 2: Features Without Menu Items](#3-gap-category-2-features-without-menu-items)
4. [Gap Category 3: Sidebar Label vs Page Title Mismatches](#4-gap-category-3-sidebar-label-vs-page-title-mismatches)
5. [Gap Category 4: WCAG 2.1 AA Accessibility Concerns](#5-gap-category-4-wcag-21-aa-accessibility-concerns)
6. [Gap Summary Table](#6-gap-summary-table)
7. [Recommendations](#7-recommendations)
8. [Cross-References](#8-cross-references)

---

## 1. Scope & Methodology

### Scope

This report is limited to the **Administration, Master Data, and Settings** modules:
- Sidebar menu item "Pengaturan" (`/dashboard/settings`) and its 14 sub-features
- "Audit Trail" (`/dashboard/audit-trail`) — administrative function
- "Validasi Dokter" (`/dashboard/doctor`) — related to lab administration

### Methodology

| Step | Technique | Source |
|------|-----------|--------|
| 1 | Extracted sidebar menu configuration | `apps/web/src/components/layout/sidebar.tsx` |
| 2 | Mapped each menu item route to corresponding page component | `apps/web/src/app/dashboard/*/page.tsx` |
| 3 | Compared sidebar labels against rendered `<h1>` page titles | Page component source files |
| 4 | Verified backend API endpoints have frontend navigation paths | Controller files vs sidebar config |
| 5 | Inspected navigation markup for WCAG 2.1 AA compliance | Sidebar, header, and layout components |

### Input Documents

- `docs/17-Audit/_inventory/sidebar-structure-analysis.md` (AUDIT-eLIS-2025-NAV-001)
- `docs/17-Audit/_inventory/routing-structure-analysis.md` (AUDIT-eLIS-2026-001-ROUTE)
- `docs/17-Audit/_inventory/enterprise-navigation-blueprint.md` (AUDIT-eLIS-2025-NAV-002)
- `docs/17-Audit/navigation-review.md` (AUDIT-eLIS-2026-003)

---

## 2. Gap Category 1: Menu Items Linking to Non-Existent Pages

Menu items in the sidebar configuration that link to routes where the page either does not exist, produces an error, or immediately redirects to a different location.

| Gap ID | Sidebar Label | Route Path | Issue | Severity | Priority |
|--------|--------------|-----------|-------|----------|----------|
| NAV-GAP-101 | Validasi Dokter | `/dashboard/doctor` | Page exists but **immediately redirects** to `/dashboard/laboratory/approval` via `useEffect` + `router.replace()`. No content renders at this URL — user sees brief "Mengalihkan ke halaman approval..." text. The menu item essentially points to a redirect stub, not a functional page. | Medium | P3 |
| NAV-GAP-102 | Laboratorium | `/dashboard/laboratory` | Page exists but **immediately redirects** to `/dashboard/laboratory/queue` via server-side `redirect()`. No landing page content — direct navigation to this URL never renders a page. | Low | P4 |

### Analysis

- **NAV-GAP-101:** The sidebar item "Validasi Dokter" at Level 1 links to `/dashboard/doctor`, which is a client-side redirect page. Users clicking this sidebar item see a flash of "Mengalihkan ke halaman approval..." before being redirected to `/dashboard/laboratory/approval`. This creates a broken UX with unnecessary intermediate navigation state. The URL `/dashboard/doctor` is never a usable destination.

- **NAV-GAP-102:** "Laboratorium" is a parent menu item that redirects to its first child (`/queue`). This is an acceptable pattern for parent-group navigation (instant server redirect, no flash), so severity is Low. However, it means the menu item's route path is not independently usable.

### Impact on Administration/Master Data/Settings Scope

NAV-GAP-101 directly impacts the administration workflow. Doctor validation approval is a core administrative process, yet its navigation path involves an unnecessary redirect detour. The `/dashboard/doctor` page has no standalone utility.

---

## 3. Gap Category 2: Features Without Menu Items

Backend API features implemented for Administration, Master Data, or Settings that have **no corresponding sidebar menu item** — accessible only indirectly (embedded as tabs) or not at all from the UI.

| Gap ID | Feature | Backend API Endpoint | Current Access Method | Gap Description | Severity | Priority |
|--------|---------|---------------------|----------------------|-----------------|----------|----------|
| NAV-GAP-201 | User Management | `GET/POST/PUT/DELETE /api/v1/users` | Tab within `/dashboard/settings` (tab id: `users`) | No dedicated sidebar entry. Daily administrative task buried as tab #13 of 14 in the Settings page. No bookmarkable URL, no browser-history entry. | High | P1 |
| NAV-GAP-202 | Region Management (Wilayah) | `GET /api/v1/regions/provinsi`, `/kabupaten-kota`, `/kecamatan`, `/kelurahan-desa`, `POST /api/v1/regions/sync` | Tab within `/dashboard/settings` (tab id: `wilayah`) | No dedicated sidebar entry or page. Geographic reference data managed only via Settings tab. The sync endpoint has no UI trigger at all. | Medium | P2 |
| NAV-GAP-203 | SMTP Configuration | `GET/PUT /api/v1/settings/smtp`, `POST /api/v1/settings/smtp/test` | Tab within `/dashboard/settings` (tab id: `smtp`) | No dedicated sidebar entry. System configuration mixed with 13 unrelated Master Data tabs. | Low | P3 |

### Analysis

All 14 sub-features under the "Pengaturan" page share a common structural gap: they are accessed exclusively as tabs within a single page at `/dashboard/settings`. None of the 14 features has:
- A dedicated sidebar menu item
- An individual URL path (tab changes do not update the browser URL)
- Deep-linking capability
- Independent browser-history support

The 11 Master Data entities (Test Categories, Lab Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units) are **also** features without dedicated menu items, but they fall under the broader structural finding documented in `docs/17-Audit/navigation-review.md` Section 6.2. This report highlights the 3 most impactful gaps (Users, Wilayah, SMTP) where the missing menu item creates measurable workflow friction.

---

## 4. Gap Category 3: Sidebar Label vs Page Title Mismatches

Comparisons between the sidebar menu label (as defined in `menuItems` array) and the rendered page title (as shown in the `<h1>` element on the page).

| Gap ID | Sidebar Label | Page Route | Rendered Page Title (`<h1>`) | Mismatch Type | Severity | Priority |
|--------|--------------|-----------|------------------------------|---------------|----------|----------|
| NAV-GAP-301 | Pasien | `/dashboard/patients` | "Manajemen Pasien" | Semantic expansion — sidebar says "Pasien" (Patients) but page title says "Manajemen Pasien" (Patient Management). More than casing/whitespace difference. | Low | P4 |
| NAV-GAP-302 | Pengaturan | `/dashboard/settings` | "Pengaturan & Master Data" | Semantic expansion — sidebar says "Pengaturan" (Settings) but page title says "Pengaturan & Master Data". Page title includes additional domain scope absent from sidebar label. | Medium | P2 |
| NAV-GAP-303 | Validasi Dokter | `/dashboard/doctor` → redirects to `/dashboard/laboratory/approval` | "Doctor Approval" | Language mismatch — sidebar uses Indonesian ("Validasi Dokter") but the actual rendered page title at the redirect target uses English ("Doctor Approval"). Also a semantic reframing from "validation" to "approval". | Medium | P3 |

### Analysis

Per Requirement 4.3, only labels differing **by more than casing or whitespace** are flagged.

- **NAV-GAP-301:** Minor UX inconsistency. "Pasien" vs "Manajemen Pasien" — sidebar uses a noun, page uses a noun-phrase indicating management function. While technically more than casing/whitespace, the user can easily make the connection. Low impact.

- **NAV-GAP-302:** The sidebar label "Pengaturan" (Settings) creates a false expectation that this page contains only settings/configuration. The actual page title "Pengaturan & Master Data" honestly represents the mixed content, exposing the underlying domain cohesion problem. This mismatch actively misleads users about the page's scope.

- **NAV-GAP-303:** The sidebar shows "Validasi Dokter" (Indonesian), but after the redirect, the target page renders "Doctor Approval" (English). This creates a bilingual inconsistency within the same navigation flow. Additionally, "Validasi" (Validation) and "Approval" carry subtly different semantics in clinical workflows — validation implies technical correctness, while approval implies authorization.

---

## 5. Gap Category 4: WCAG 2.1 AA Accessibility Concerns

Automated accessibility assessment of navigation elements against WCAG 2.1 Level AA success criteria 2.4.1, 2.4.5, and 4.1.2.

### 5.1 WCAG 2.4.1 — Bypass Blocks (Skip Navigation)

**Requirement:** A mechanism shall be available to bypass blocks of content that are repeated on multiple pages.

| Gap ID | Element | Issue | Evidence | Severity | Priority |
|--------|---------|-------|----------|----------|----------|
| NAV-GAP-401 | Dashboard layout (`app/dashboard/layout.tsx`) | **No skip-to-content link** exists. The layout renders `<Header />` and `<Sidebar />` before `<main>`. Keyboard users must tab through all 8 sidebar items + header controls on every page load to reach page content. | `layout.tsx` contains no anchor link with `href="#main-content"` or equivalent. The `<main>` element has no `id` attribute for targeting. | High | P1 |
| NAV-GAP-402 | Sidebar component (`sidebar.tsx`) | **Sidebar is not enclosed in a `<nav>` landmark** element. The sidebar renders as `<aside>` with `<ul>` directly inside. Without `<nav>`, screen readers cannot identify this as the primary navigation region and cannot offer shortcut keys to jump to it. | `sidebar.tsx` uses `<aside className="...">` → `<div>` → `<ul>` with no `<nav>` wrapper and no `aria-label`. | High | P1 |

### 5.2 WCAG 2.4.5 — Multiple Ways

**Requirement:** More than one way shall be available to locate a page within a set of pages, except where the page is a step in a process.

| Gap ID | Element | Issue | Evidence | Severity | Priority |
|--------|---------|-------|----------|----------|----------|
| NAV-GAP-403 | Global navigation | **Only one navigation mechanism** exists (sidebar). There is no breadcrumb navigation, no site map, no functional site search, and no A-Z index. The search input in the header is a **non-functional placeholder** (no event handlers, no search logic implemented). | `header.tsx` renders an `<input>` with placeholder "Search patients, orders, or results..." but the input has no `onChange`, no form submission, and no search handler. | Medium | P2 |
| NAV-GAP-404 | Settings page sub-features | **No alternative navigation path** to 14 sub-features within Settings. Tab-based navigation within a single page provides no URL-based access, no search/filter for specific tabs, and no breadcrumb context. Users must know the tab exists and visually locate it in a list of 14 items. | `settings/page.tsx` uses client-side `useState` for tab switching. No URL hash, no query parameters, no alternative path to reach a specific tab. | Medium | P2 |

### 5.3 WCAG 4.1.2 — Name, Role, Value

**Requirement:** For all user interface components, the name and role can be programmatically determined; states, properties, and values can be programmatically set; and notification of changes is available to user agents, including assistive technologies.

| Gap ID | Element | Issue | Evidence | Severity | Priority |
|--------|---------|-------|----------|----------|----------|
| NAV-GAP-405 | Sidebar menu items | **Active state not programmatically communicated.** The active menu item is indicated only via CSS classes (`bg-white text-[#6B8E6B] shadow-sm ring-1 ...`). No `aria-current="page"` attribute is set on the active link. Screen readers cannot determine which page the user is currently on from the navigation. | `sidebar.tsx` applies `isActive &&` conditional styling but sets no ARIA attributes. The `<Link>` elements lack `aria-current`. | High | P2 |
| NAV-GAP-406 | Mobile menu toggle button | **Button has no accessible name.** The mobile hamburger menu button in the header has no `aria-label`, no `aria-expanded`, and no visible text. Assistive technologies announce it as an unlabelled button. | `header.tsx`: `<button className="...lg:hidden"><Menu className="h-5 w-5" /></button>` — no `aria-label` or screen-reader text. | Medium | P2 |

---

## 6. Gap Summary Table

### 6.1 All Gaps by Category

| Gap ID | Category | Description | Severity | Priority (MoSCoW) | Remediation Effort |
|--------|----------|-------------|----------|-------------------|--------------------|
| NAV-GAP-101 | Broken Link / Redirect | "Validasi Dokter" sidebar item redirects instead of rendering content | Medium | P3 | S (≤2 SP) |
| NAV-GAP-102 | Broken Link / Redirect | "Laboratorium" sidebar item redirects to /queue | Low | P4 | S (≤2 SP) |
| NAV-GAP-201 | Feature Without Menu | User Management has no dedicated sidebar entry | High | P1 | M (3-5 SP) |
| NAV-GAP-202 | Feature Without Menu | Region Management has no dedicated sidebar entry or page | Medium | P2 | S (≤2 SP) |
| NAV-GAP-203 | Feature Without Menu | SMTP Configuration has no dedicated sidebar entry | Low | P3 | S (≤2 SP) |
| NAV-GAP-301 | Label Mismatch | "Pasien" vs "Manajemen Pasien" | Low | P4 | S (≤2 SP) |
| NAV-GAP-302 | Label Mismatch | "Pengaturan" vs "Pengaturan & Master Data" | Medium | P2 | S (≤2 SP) |
| NAV-GAP-303 | Label Mismatch | "Validasi Dokter" (ID) vs "Doctor Approval" (EN) | Medium | P3 | S (≤2 SP) |
| NAV-GAP-401 | WCAG 2.4.1 | No skip-to-content link in dashboard layout | High | P1 | S (≤2 SP) |
| NAV-GAP-402 | WCAG 2.4.1 | Sidebar not wrapped in `<nav>` landmark | High | P1 | S (≤2 SP) |
| NAV-GAP-403 | WCAG 2.4.5 | Only one navigation method (non-functional search) | Medium | P2 | M (3-5 SP) |
| NAV-GAP-404 | WCAG 2.4.5 | No alternative path to Settings sub-features | Medium | P2 | M (3-5 SP) |
| NAV-GAP-405 | WCAG 4.1.2 | Active nav item lacks `aria-current="page"` | High | P2 | S (≤2 SP) |
| NAV-GAP-406 | WCAG 4.1.2 | Mobile menu button has no accessible name | Medium | P2 | S (≤2 SP) |

### 6.2 Summary Statistics

| Metric | Value |
|--------|-------|
| Total navigation gaps | 14 |
| Critical severity | 0 |
| High severity | 5 |
| Medium severity | 6 |
| Low severity | 3 |

| Priority | Count | Estimated Effort (SP) |
|----------|:-----:|:---------------------:|
| P1 (Must Have) | 3 | 5-9 SP |
| P2 (Should Have) | 6 | 9-17 SP |
| P3 (Could Have) | 3 | 3-6 SP |
| P4 (Won't Have This Phase) | 2 | 2-4 SP |
| **Total** | **14** | **19-36 SP** |

### 6.3 Gaps by WCAG Criterion

| WCAG Criterion | Gaps | Severity Range |
|---------------|:----:|----------------|
| 2.4.1 Bypass Blocks | 2 (NAV-GAP-401, NAV-GAP-402) | High |
| 2.4.5 Multiple Ways | 2 (NAV-GAP-403, NAV-GAP-404) | Medium |
| 4.1.2 Name Role Value | 2 (NAV-GAP-405, NAV-GAP-406) | High–Medium |

---

## 7. Recommendations

### 7.1 P1 — Must Have (Immediate)

| # | Recommendation | Addresses | Proposed Change |
|---|---------------|-----------|-----------------|
| 1 | Add skip-to-content link as first focusable element in `layout.tsx` | NAV-GAP-401 | Add `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` before `<Header />`. Add `id="main-content"` to `<main>`. |
| 2 | Wrap sidebar menu in `<nav aria-label="Main navigation">` element | NAV-GAP-402 | In `sidebar.tsx`, change `<aside>` structure to include `<nav aria-label="Navigasi utama">` wrapping the `<ul>` menu. |
| 3 | Create dedicated Users management page with sidebar entry | NAV-GAP-201 | Create `/dashboard/administration/users/page.tsx` with dedicated route. Add "Pengguna" item under new "Administrasi" sidebar group. |

### 7.2 P2 — Should Have (Short-Term)

| # | Recommendation | Addresses | Proposed Change |
|---|---------------|-----------|-----------------|
| 4 | Add `aria-current="page"` to active sidebar link | NAV-GAP-405 | In `sidebar.tsx`, add `aria-current={isActive ? "page" : undefined}` to each `<Link>`. |
| 5 | Add `aria-label="Buka menu navigasi"` to mobile menu button | NAV-GAP-406 | In `header.tsx`, add `aria-label` and `aria-expanded` to the hamburger `<button>`. |
| 6 | Implement functional site search or breadcrumb navigation | NAV-GAP-403 | Connect existing search input to a page-search handler OR add breadcrumb component in `layout.tsx`. |
| 7 | Enable URL-based tab navigation in Settings page | NAV-GAP-404 | Use URL search params (`?tab=users`) for Settings tabs, enabling direct linking. |
| 8 | Align sidebar label "Pengaturan" with page title | NAV-GAP-302 | Either rename sidebar label to "Pengaturan & Master Data" or (preferred) decompose the page per Option C blueprint. |
| 9 | Create dedicated Wilayah management page | NAV-GAP-202 | Create `/dashboard/master-data/regions/page.tsx` with sidebar entry under "Master Data" group. |

### 7.3 P3 — Could Have (Medium-Term)

| # | Recommendation | Addresses | Proposed Change |
|---|---------------|-----------|-----------------|
| 10 | Consolidate "Validasi Dokter" redirect into Laboratorium hierarchy | NAV-GAP-101, NAV-GAP-303 | Remove `/dashboard/doctor` redirect page. Update sidebar to point directly to `/dashboard/laboratory/approval`. Rename rendered title to "Validasi Dokter" for language consistency. |
| 11 | Create dedicated SMTP settings page | NAV-GAP-203 | Create `/dashboard/administration/system/smtp/page.tsx` per navigation blueprint. |

### 7.4 P4 — Won't Have This Phase

| # | Recommendation | Addresses | Rationale for Deferral |
|---|---------------|-----------|----------------------|
| 12 | Rename "Pasien" to "Manajemen Pasien" or vice versa | NAV-GAP-301 | Minimal user impact; cosmetic alignment only. |
| 13 | Add landing page content to `/dashboard/laboratory` | NAV-GAP-102 | Server redirect to `/queue` is a common pattern for parent groups. |

---

## 8. Cross-References

| Reference ID | Document | Relevance |
|-------------|----------|-----------|
| [AUDIT-eLIS-2026-003]#NAV-GAP-001 | `docs/17-Audit/navigation-review.md` | Alignment gaps identified in Section 6 |
| [AUDIT-eLIS-2026-003]#NAV-GAP-002 | `docs/17-Audit/navigation-review.md` | Users module navigation gap |
| [AUDIT-eLIS-2026-003]#NAV-GAP-003 | `docs/17-Audit/navigation-review.md` | Settings module navigation gap |
| [AUDIT-eLIS-2025-NAV-001]#F-NAV-002 | `docs/17-Audit/_inventory/sidebar-structure-analysis.md` | No frontend role-based visibility |
| [AUDIT-eLIS-2026-001-ROUTE]#ROUTE-DEAD-001 | `docs/17-Audit/_inventory/routing-structure-analysis.md` | Doctor page as redirect stub |
| [AUDIT-eLIS-2026-001-ROUTE]#ROUTE-DEAD-003 | `docs/17-Audit/_inventory/routing-structure-analysis.md` | Region API without frontend page |
| [AUDIT-eLIS-2025-NAV-002] | `docs/17-Audit/_inventory/enterprise-navigation-blueprint.md` | Proposed fix (Option C hierarchy) |

### Related Audit Documents

- `docs/17-Audit/architecture-gap-analysis.md` — Architecture Gap report (Task 6.2)
- `docs/17-Audit/navigation-review.md` — Full navigation review including alignment gaps
- `docs/17-Audit/enterprise-admin-audit-report.md` — Main audit report (Task 12.1)

---

## 9. No-Code-Modification Attestation

This Navigation Gap report was produced in **read-only mode**. No source code files under `apps/api/` or `apps/web/` were created, modified, or deleted. All proposed changes are documented as recommendations only.

**Files accessed (read-only):**
- `apps/web/src/components/layout/sidebar.tsx` — Sidebar menu configuration and markup
- `apps/web/src/components/layout/header.tsx` — Header navigation and search input
- `apps/web/src/app/dashboard/layout.tsx` — Dashboard layout landmarks
- `apps/web/src/app/dashboard/settings/page.tsx` — Settings page title and tab structure
- `apps/web/src/app/dashboard/patients/page.tsx` — Patient page title
- `apps/web/src/app/dashboard/orders/page.tsx` — Orders page title
- `apps/web/src/app/dashboard/audit-trail/page.tsx` — Audit trail page title
- `apps/web/src/app/dashboard/reports/page.tsx` — Reports page title
- `apps/web/src/app/dashboard/doctor/page.tsx` — Doctor redirect page
- `apps/web/src/app/dashboard/laboratory/page.tsx` — Laboratory redirect page
- `apps/web/src/app/dashboard/laboratory/approval/page.tsx` — Approval page title

---

*End of Navigation Gap Report — Task 6.3*
