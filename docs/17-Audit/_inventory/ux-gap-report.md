# UX Gap Report — Administration, Master Data & Settings Modules

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-010 |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

---

## Executive Summary

This report identifies UX gaps within the Administration, Master Data, and Settings modules (consolidated in `apps/web/src/app/dashboard/settings/page.tsx`) by comparing the current implementation against the documented design system (`docs/05-UIUX/UIUX-DesignSystem-eLIS-v1.0.md`), responsive layout breakpoints, loading/error state patterns, and WCAG 2.1 AA compliance.

**Key Findings:**
- **14** design system violations (color, typography, spacing, shape)
- **5** component inconsistency issues
- **6** responsive layout gaps across breakpoints
- **4** missing or incomplete loading indicator issues
- **5** unhandled error state gaps
- **8** WCAG 2.1 AA violations detectable by static analysis

**Total UX Gaps: 42**

**Validates: Requirements 4.4**

---

## 1. Design System Violations

The documented design system (`UIUX-DesignSystem-eLIS-v1.0.md`) specifies design tokens that are not consistently followed in the Settings page implementation.

### 1.1 Color Palette Violations

| Gap ID | Token | Documented Value | Actual Implementation | Severity | Priority | Effort |
|--------|-------|------------------|----------------------|----------|----------|--------|
| UX-CLR-001 | Primary Color | `Sage Green (#9CB4A1)` | Hardcoded `#6B8E6B` throughout all buttons, badges, focus rings, and active states | Medium | P3 | M (3-5 SP) |
| UX-CLR-002 | Secondary Color | `Muted Olive (#7A8A73)` | Not used; hover state uses `#5A7D5A` (unlisted token) | Low | P4 | S (≤2 SP) |
| UX-CLR-003 | Background - Main | `Warm Off White (#F9F8F6)` | Uses Tailwind `slate-50`/`bg-white` (cold grey tones) instead of warm off-white | Medium | P3 | M (3-5 SP) |
| UX-CLR-004 | Background - Form/Modal | `Cream (#FDFCF0)` | Modal uses `bg-white dark:bg-slate-900` — no cream tone applied | Low | P3 | S (≤2 SP) |
| UX-CLR-005 | Text - Heading | `Deep Forest Green (#2C3D2F)` | Uses `text-slate-900 dark:text-white` — generic slate, not forest green | Medium | P3 | S (≤2 SP) |
| UX-CLR-006 | Text - Body | `Charcoal (#333333)` | Uses `text-slate-700 dark:text-slate-300` — close but not matching exact token | Low | P4 | S (≤2 SP) |
| UX-CLR-007 | CSS Variables vs Hardcoded | Design tokens defined as oklch() in globals.css | Settings page bypasses CSS custom properties, using hardcoded hex `#6B8E6B` everywhere instead of `bg-primary` / `text-primary` | High | P2 | M (3-5 SP) |

**Root Cause**: The Settings page was built with inline Tailwind utility classes using hardcoded hex values rather than referencing the design token CSS custom properties defined in `globals.css`. The CSS variables use oklch color space and map to Shadcn/UI semantic tokens (`--primary`, `--secondary`, etc.), but these are not leveraged by the Settings page.

**Evidence**: 
- `apps/web/src/app/dashboard/settings/page.tsx` line references to `bg-[#6B8E6B]`, `text-[#6B8E6B]`, `border-[#6B8E6B]` appear 30+ times
- `apps/web/src/app/globals.css` defines `--primary: oklch(0.55 0.08 145)` which maps to the system's green theme

### 1.2 Typography Violations

| Gap ID | Token | Documented Value | Actual Implementation | Severity | Priority | Effort |
|--------|-------|------------------|----------------------|----------|----------|--------|
| UX-TYP-001 | Primary Font | `Plus Jakarta Sans` | No font explicitly loaded; falls back to system `font-sans` (Geist or system default) | High | P2 | S (≤2 SP) |
| UX-TYP-002 | H1 Size | 32px Bold, Deep Forest Green | Page header `h1` uses `text-2xl` (24px) `font-bold` `text-slate-900` — undersized and wrong color | Medium | P3 | S (≤2 SP) |
| UX-TYP-003 | Body Size | 14px Regular, Charcoal | Uses `text-sm` (14px) — correct size but wrong color token reference | Low | P4 | S (≤2 SP) |

**Root Cause**: The layout.tsx file references `font-sans` class but does not import or configure `Plus Jakarta Sans` via `next/font`. The CSS variable `--font-sans` is set but maps to whatever system font is available, not the specified typeface.

**Evidence**: 
- `apps/web/src/app/layout.tsx` — no `next/font` import for Plus Jakarta Sans
- `apps/web/src/app/globals.css` — `--font-sans: var(--font-sans)` circular reference; no explicit font-family declaration

### 1.3 Layout & Shape Violations

| Gap ID | Token | Documented Value | Actual Implementation | Severity | Priority | Effort |
|--------|-------|------------------|----------------------|----------|----------|--------|
| UX-SHP-001 | Card Border Radius | `Rounded 2XL (16px)` for cards and modals | Main card container uses `rounded-xl` (12px); modal uses `rounded-xl` (12px) | Low | P4 | S (≤2 SP) |
| UX-SHP-002 | Container Border Radius | `Rounded 3XL (24px)` for main containers | Outer container uses `rounded-xl` (12px), not 24px | Low | P4 | S (≤2 SP) |
| UX-SHP-003 | Animation - Loading | `Skeleton Loading (pulsing skeleton)` specified; spinners discouraged | Uses `Loader2` spinner icon everywhere; no skeleton loading pattern exists | Medium | P2 | M (3-5 SP) |
| UX-SHP-004 | Shadow Style | `Soft Shadow (high blur, low opacity)` for Soft Card effect | Uses `shadow-sm` (minimal shadow) — does not achieve floating card effect | Low | P4 | S (≤2 SP) |

---

## 2. Component Inconsistencies

The Settings page builds its own custom components inline rather than using the Shadcn/UI components from `apps/web/src/components/ui/`.

| Gap ID | Component Type | Issue Description | Location | Severity | Priority | Effort |
|--------|---------------|-------------------|----------|----------|----------|--------|
| UX-CMP-001 | Button | Settings page uses custom inline `<button>` elements with hardcoded classes (`rounded-xl bg-[#6B8E6B] px-4 py-2.5 text-sm font-semibold text-white`) instead of the `<Button>` component from `components/ui/button.tsx` | Settings page: all CRUD buttons, Tambah, Simpan, etc. | High | P2 | M (3-5 SP) |
| UX-CMP-002 | Input | Settings page defines inline input styles (`rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm`) instead of using `<Input>` component from `components/ui/input.tsx` which uses `rounded-lg h-8 border-input` | Settings page: all form fields, search input | High | P2 | M (3-5 SP) |
| UX-CMP-003 | Card | The table container and page wrapper use custom `rounded-xl border border-slate-200 bg-white shadow-sm` instead of `<Card>` component which provides consistent ring, spacing, and semantic data attributes | Settings page: main content wrapper | Medium | P3 | S (≤2 SP) |
| UX-CMP-004 | Modal | FormModal is a fully custom implementation (`fixed inset-0 z-50`) instead of using a shared dialog/modal component. This creates inconsistency with any future modals in other modules | Settings page: FormModal component | Medium | P3 | M (3-5 SP) |
| UX-CMP-005 | Toggle/Switch | Boolean fields use a custom checkbox toggle (`peer sr-only` + styled div) rather than a shared Switch component. Implementation is duplicated in FormModal and SmtpSettingsPanel | Settings page: isActive fields, TLS toggle | Low | P3 | S (≤2 SP) |

**Root Cause**: The Settings page appears to have been written as a self-contained component without importing from the UI component library. This creates visual drift — the Shadcn/UI button uses `rounded-lg`, height `h-8`, and theme-aware CSS variables, while the Settings page uses `rounded-xl`, height unset (relies on padding `py-2.5`), and hardcoded hex colors.

---

## 3. Responsive Layout Gaps

The Settings page must function at breakpoints: 640px (sm), 768px (md), 1024px (lg), and 1280px (xl).

### 3.1 Analysis by Breakpoint

| Gap ID | Breakpoint | Component | Issue | Severity | Priority | Effort |
|--------|-----------|-----------|-------|----------|----------|--------|
| UX-RES-001 | 640px (mobile) | Tab Navigation | Tab labels are hidden below `sm` (`hidden sm:inline`) showing only icons. With 14 tabs + SMTP, the icon-only row requires horizontal scroll with `overflow-x-auto` but provides no visual scroll indicator | Medium | P3 | S (≤2 SP) |
| UX-RES-002 | 640px (mobile) | Data Table | Table uses `overflow-x-auto` but columns use `whitespace-nowrap`, causing mandatory horizontal scroll with no indication of scrollable content. Tables with 6+ columns (e.g., Reagents with 6 columns + Actions) become unusable on small screens | High | P2 | L (6-13 SP) |
| UX-RES-003 | 640px (mobile) | FormModal | Modal uses `max-w-lg mx-4` which is appropriate, but the `max-h-[90vh] overflow-y-auto` doesn't account for mobile browser chrome (address bar). Forms with 8 fields (e.g., Reagents) may have submit button hidden below viewport | Medium | P3 | S (≤2 SP) |
| UX-RES-004 | 768px (tablet) | Toolbar | Toolbar uses `flex-col gap-3 sm:flex-row` — at exactly 768px (md), the search input and buttons are inline but the search has `max-w-sm` which may leave action buttons cramped with the Wilayah tab's extra sync button | Low | P4 | S (≤2 SP) |
| UX-RES-005 | 1024px (lg) | Sidebar Overlap | Dashboard layout applies `lg:pl-64` for sidebar offset. At exactly 1024px, the Settings page content area is ~700px wide. With 14 tabs in a flex row, some tabs are clipped and require scroll — no responsive collapse to dropdown or secondary navigation | Medium | P3 | M (3-5 SP) |
| UX-RES-006 | 1280px (xl) | Content Width | Page uses `max-w-7xl` (1280px) constraint from dashboard layout. At 1280px viewport width minus 256px sidebar = 1024px content. No xl-specific optimizations exist — content layout is identical at 1024px and 1280px | Low | P4 | S (≤2 SP) |

### 3.2 Missing Responsive Patterns

- **No responsive table alternative**: Design system section 4.8 specifies "Data Table Modern" but no card-based mobile alternative is implemented. Standard enterprise pattern is to switch from table to card list below 768px.
- **No pagination**: Design system specifies "Pagination modern (bukan angka kecil, tapi rounded buttons)" — the Settings page has no pagination at all, loading all data with `?limit=100` or unlimited.
- **No collapsible tab navigation**: 14 tabs in a horizontal scroll is not enterprise-standard for mobile. Recommended pattern: overflow menu or category grouping.

---

## 4. Loading Indicator Gaps

Design system mandates: loading indicators within 200ms of user action initiation. Design system also specifies `Skeleton Loading (pulsing skeleton)` over spinners.

| Gap ID | Operation | Current Behavior | Issue | Severity | Priority | Effort |
|--------|-----------|-----------------|-------|----------|----------|--------|
| UX-LOAD-001 | Initial Data Fetch | Displays `Loader2` spinner with "Memuat data..." text after 0ms | Uses spinner instead of skeleton loading. No visible structure/layout during loading (the entire content area is replaced by a centered spinner), causing layout shift when data arrives | Medium | P2 | M (3-5 SP) |
| UX-LOAD-002 | Tab Switch | Sets `loading=true` immediately, shows spinner | Spinner replaces full content on every tab switch. No data caching between tabs — switching back to a previously loaded tab refetches and shows spinner again | Medium | P2 | M (3-5 SP) |
| UX-LOAD-003 | Delete Operation | No loading indicator shown | `handleDelete` shows `window.confirm()` then calls API and refreshes — no intermediate loading state between confirmation and completion. User gets no feedback that deletion is in progress | High | P2 | S (≤2 SP) |
| UX-LOAD-004 | Create/Edit Submit | FormModal shows `Loader2` + "Menyimpan..." on submit button | ✅ Compliant — loading indicator appears immediately within the button. However, full-page data refresh after success shows spinner again (double loading perception) | Low | P4 | S (≤2 SP) |

**Positive Finding**: The SMTP Settings panel and FormModal both properly show loading states during async operations (saving, testing).

---

## 5. Unhandled Error States

Server error responses (4xx/5xx) must display a user-visible error message.

| Gap ID | Operation | Error Handling | Issue | Severity | Priority | Effort |
|--------|-----------|---------------|-------|----------|----------|--------|
| UX-ERR-001 | Data Fetch Failure | `catch { setData([]) }` — silently sets empty data | No error message shown to user. A network failure or 401/500 response is indistinguishable from "no data exists". User sees empty state "Tidak ada data" with no retry option or error indication | High | P1 | M (3-5 SP) |
| UX-ERR-002 | Delete Failure | `catch (err) { alert(apiErr.message \|\| "Gagal menghapus data") }` | Uses native `window.alert()` — not a design system component. Acceptable as feedback but violates UX consistency (no styled error component) | Medium | P3 | S (≤2 SP) |
| UX-ERR-003 | Region Sync Failure | `catch (err) { alert(apiErr.message \|\| "Gagal sync...") }` | Same native alert pattern. No retry option provided within the UI flow | Medium | P3 | S (≤2 SP) |
| UX-ERR-004 | SMTP Fetch Failure | `catch(() => {})` — completely swallowed | Initial SMTP settings load silently swallows errors. If the API returns 403 or 500, user sees empty form fields with no indication of failure | High | P2 | S (≤2 SP) |
| UX-ERR-005 | Categories Fetch Failure | `catch { setCategories([]) }` — silently clears | When the "Tes Laboratorium" tab needs categories for the form select, a failure results in an empty dropdown with no error feedback | Medium | P3 | S (≤2 SP) |

**Positive Finding**: The FormModal properly displays styled inline error messages from API responses (`rounded-lg border border-red-200 bg-red-50`), and the SMTP panel displays styled success/error messages.

---

## 6. WCAG 2.1 AA Violations (Static Analysis)

Violations detectable by automated tooling (equivalent to axe-core rules).

| Gap ID | WCAG Criterion | Element | Issue | Severity | Priority | Effort |
|--------|---------------|---------|-------|----------|----------|--------|
| UX-A11Y-001 | 1.1.1 Non-text Content | Tab icons (Lucide) | Tab buttons at mobile (`hidden sm:inline` hides label) show only icons without `aria-label`. Screen readers receive no meaningful label for navigation tabs when labels are hidden | High | P2 | S (≤2 SP) |
| UX-A11Y-002 | 1.3.1 Info and Relationships | Data table | `<table>` lacks `<caption>` or `aria-label` to describe the table's content. Column headers lack `scope="col"`. No programmatic relationship between headers and data cells for assistive technology | Medium | P2 | S (≤2 SP) |
| UX-A11Y-003 | 1.4.3 Contrast Minimum | Active tab text `text-[#6B8E6B]` on `bg-[#6B8E6B]/5` | The active tab uses green text on a very light green background. `#6B8E6B` on white/near-white needs verification — estimated contrast ratio ~3.8:1, below 4.5:1 minimum for normal text | Medium | P2 | S (≤2 SP) |
| UX-A11Y-004 | 2.1.1 Keyboard | Custom toggle/switch | Boolean toggle inputs use `<input type="checkbox" className="peer sr-only">` with a styled `<div>`. The visual toggle div is not itself focusable — focus is on the hidden input. No visible focus ring on the toggle track (only `peer-focus:ring-2` which may be clipped by parent overflow) | Medium | P3 | S (≤2 SP) |
| UX-A11Y-005 | 2.4.6 Headings and Labels | FormModal | Form fields use `<label>` but the labels lack explicit `htmlFor`/`id` association with their corresponding inputs. The `<label>` wraps or precedes the input but there's no `id` attribute on inputs to create programmatic association | High | P2 | S (≤2 SP) |
| UX-A11Y-006 | 4.1.2 Name, Role, Value | Modal backdrop | The modal backdrop `<div onClick={onClose}>` has a click handler but no role, aria-label, or keyboard handler. It's not announced as a dismissal mechanism and cannot be activated by keyboard | Medium | P3 | S (≤2 SP) |
| UX-A11Y-007 | 2.4.3 Focus Order | Modal open/close | Modal doesn't implement focus trap. When opened, focus isn't explicitly moved to the modal. When closed, focus isn't returned to the triggering button. Tab key can escape the modal to interact with background content | High | P2 | M (3-5 SP) |
| UX-A11Y-008 | 4.1.3 Status Messages | Success/Error feedback | Delete success has no status message at all (data silently refreshes). SMTP save success uses an inline div without `role="alert"` or `aria-live` — screen readers may not announce the status change | Medium | P3 | S (≤2 SP) |

---

## 7. Gap Summary

### 7.1 Totals by Category

| Category | Gap Count |
|----------|-----------|
| Design System - Color | 7 |
| Design System - Typography | 3 |
| Design System - Layout/Shape | 4 |
| Component Inconsistencies | 5 |
| Responsive Layout | 6 |
| Loading Indicators | 4 |
| Error States | 5 |
| WCAG 2.1 AA | 8 |
| **TOTAL** | **42** |

### 7.2 Totals by Severity

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 10 |
| Medium | 19 |
| Low | 13 |

### 7.3 Totals by Priority (MoSCoW)

| Priority | Count | Description |
|----------|-------|-------------|
| P1 (Must Have) | 1 | Blocks production: silent error swallowing on data fetch |
| P2 (Should Have) | 15 | Degrades core workflow: hardcoded tokens, missing a11y, missing feedback |
| P3 (Could Have) | 17 | Usability improvements with workarounds |
| P4 (Won't Have) | 9 | Cosmetic or deferred items |

### 7.4 Estimated Remediation Effort

| Effort Size | Count | Story Points (per item) | Total SP Range |
|-------------|-------|------------------------|----------------|
| S (≤2 SP) | 28 | 1-2 | 28-56 |
| M (3-5 SP) | 13 | 3-5 | 39-65 |
| L (6-13 SP) | 1 | 6-13 | 6-13 |
| XL (≥14 SP) | 0 | — | 0 |
| **TOTAL** | **42** | | **73-134 SP** |

**Estimated midpoint**: ~100 story points total remediation effort for all UX gaps.

---

## 8. Prioritized Remediation Recommendations

### Phase 1 — Critical & High Priority (P1-P2)

| # | Gap ID | Action | Effort |
|---|--------|--------|--------|
| 1 | UX-ERR-001 | Add error state UI to data fetch — show error message with retry button instead of empty state on failure | M |
| 2 | UX-CLR-007 | Refactor Settings page to use CSS custom property tokens (`bg-primary`, `text-primary-foreground`) instead of hardcoded hex values | M |
| 3 | UX-CMP-001 | Replace inline `<button>` elements with `<Button>` from `components/ui/button.tsx` | M |
| 4 | UX-CMP-002 | Replace inline `<input>` elements with `<Input>` from `components/ui/input.tsx` | M |
| 5 | UX-TYP-001 | Configure `Plus Jakarta Sans` via `next/font/google` in layout.tsx | S |
| 6 | UX-A11Y-007 | Implement focus trap in FormModal (use `@radix-ui/react-dialog` or equivalent) | M |
| 7 | UX-A11Y-001 | Add `aria-label` to tab buttons reflecting the tab label text | S |
| 8 | UX-A11Y-005 | Add `id` attributes to form inputs and `htmlFor` to labels | S |
| 9 | UX-A11Y-003 | Adjust active tab color contrast to meet 4.5:1 ratio | S |
| 10 | UX-A11Y-002 | Add `aria-label` to data table elements and `scope="col"` to headers | S |
| 11 | UX-LOAD-003 | Add loading state during delete operation (disable row, show spinner) | S |
| 12 | UX-ERR-004 | Show error state when SMTP config fetch fails | S |
| 13 | UX-RES-002 | Implement responsive table pattern (card view below 768px or constrained column visibility) | L |
| 14 | UX-LOAD-001 | Replace spinner with skeleton loading matching table structure | M |
| 15 | UX-LOAD-002 | Implement tab data caching to avoid re-fetching on tab switch | M |
| 16 | UX-SHP-003 | Replace `Loader2` spinner with skeleton loading pattern per design system | M |

### Phase 2 — Medium Priority (P3)

- Align background colors to Warm Off-White and Cream tokens
- Upgrade border radius from `rounded-xl` to `rounded-2xl` for cards
- Use `<Card>` component from UI library
- Implement shared Modal/Dialog component
- Add responsive tab navigation collapse
- Add scroll indicators for mobile table overflow
- Add `role="alert"` to status messages
- Implement shared Switch component for boolean toggles

### Phase 3 — Low Priority (P4)

- Fine-tune secondary color token usage
- Match exact body text color to Charcoal #333333
- Add xl-specific layout optimizations
- Add soft shadow to card components
- Improve modal viewport awareness for mobile browsers

---

## 9. No-Code-Modification Attestation

This UX Gap report was produced by **read-only analysis** of the following source files:

| File | Access Mode |
|------|-------------|
| `apps/web/src/app/dashboard/settings/page.tsx` | READ-ONLY |
| `apps/web/src/app/dashboard/layout.tsx` | READ-ONLY |
| `apps/web/src/app/layout.tsx` | READ-ONLY |
| `apps/web/src/app/globals.css` | READ-ONLY |
| `apps/web/src/components/ui/button.tsx` | READ-ONLY |
| `apps/web/src/components/ui/card.tsx` | READ-ONLY |
| `apps/web/src/components/ui/input.tsx` | READ-ONLY |
| `apps/web/src/lib/api.ts` | READ-ONLY |
| `docs/05-UIUX/UIUX-DesignSystem-eLIS-v1.0.md` | READ-ONLY |

No source code files were created, modified, or deleted during this audit.

---

## Cross-References

- [AUDIT-eLIS-2026-002]#Architecture-Compliance — Architecture gap analysis (frontend FSD non-compliance)
- [AUDIT-eLIS-2026-010]#UX-CLR-007 → Related to design token governance gap
- [AUDIT-eLIS-2026-010]#UX-CMP-001 → Component library adoption gap
- Navigation Review → Tab navigation accessibility findings relate to [AUDIT-eLIS-2026-010]#UX-A11Y-001

---

*End of UX Gap Report*
