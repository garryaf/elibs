# Frontend Architecture Compliance Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-FE |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |
| **Task Reference** | 3.3 — Analyze frontend architecture compliance |
| **Requirement** | 2.4 |

---

## 1. Summary

The frontend implementation at `apps/web/src/` does **NOT** follow the Feature-Sliced Design (FSD) pattern documented in `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`. The current implementation uses a standard **Next.js App Router** pattern. However, the documented architecture itself does not prescribe strict FSD layers either — it describes a "Feature-Sliced Design modularitas" variant adapted for Next.js.

**Compliance Verdict: Partial — Non-Compliant with FSD, Partially Compliant with Documented Architecture**

---

## 2. Documented Architecture (Frontend-Architecture-eLIS-v1.0.md)

The document `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` (Section 2, "Directory Structure") prescribes the following structure, described as "Feature-Sliced Design modularitas":

| Documented Directory | Purpose | FSD Layer Equivalent |
|---------------------|---------|---------------------|
| `app/` | Next.js App Router (Pages, Layouts, API Routes) | app + pages |
| `components/ui/` | Base components from Shadcn (Button, Input, Table) | shared/ui |
| `components/shared/` | Shared components (Sidebar, Header, Layout wrappers) | shared/layout |
| `components/modules/` | Feature-specific components (OrderForm, PatientList) | features |
| `lib/` | Utilities (Axios instance, Tailwind `cn` utility) | shared/lib |
| `hooks/` | Custom React Hooks | shared/hooks |
| `services/` | API clients and TanStack Query hooks | shared/api |
| `types/` | TypeScript Interfaces & Types | shared/types |
| `schemas/` | Zod Validation Schemas | shared/schemas |

---

## 3. Actual Implementation Structure

The current `apps/web/src/` structure contains only 4 top-level directories + 1 file:

```
apps/web/src/
├── middleware.ts
├── app/              ✅ Present (documented)
├── components/       ⚠️ Partially compliant (documented)
├── lib/              ✅ Present (documented)
└── types/            ✅ Present (documented)
```

---

## 4. FSD Layer Compliance Check

The classic Feature-Sliced Design architecture mandates the following layer hierarchy (top to bottom, strict dependency direction):

| # | FSD Layer | Purpose | Status | Evidence |
|---|-----------|---------|--------|----------|
| 1 | `app/` | Application initialization, providers, routing | ⚠️ **Adapted** | Exists as `app/` but serves as Next.js App Router (pages + layouts combined), not a pure FSD app layer |
| 2 | `pages/` | Full-page compositions, route entry points | ❌ **Missing** | Pages are colocated inside `app/` directory via Next.js convention (`app/dashboard/*/page.tsx`) — no separate `pages/` layer |
| 3 | `widgets/` | Large self-contained UI blocks (Sidebar, Header) | ❌ **Missing** | Widget-like components exist in `components/layout/` (sidebar.tsx, header.tsx) but no `widgets/` layer |
| 4 | `features/` | User interaction scenarios with business logic | ❌ **Missing** | Feature-specific components exist in `components/laboratory/`, `components/orders/`, `components/patients/`, `components/regions/` but no `features/` layer with FSD segments |
| 5 | `entities/` | Business entities (models, API slices) | ❌ **Missing** | Types exist in `types/` (order.ts, patient.ts) but no entity layer with model + API + UI segments per entity |
| 6 | `shared/` | Reusable utilities, UI kit, API client | ❌ **Missing as named layer** | Functionality is split across `lib/`, `types/`, `components/ui/` — no unified `shared/` layer |

**FSD Layer Score: 1/6 layers present (adapted) = ~17% FSD compliance**

---

## 5. Documented vs Actual: Detailed Comparison

### 5.1 Directories Present in Both Documentation and Implementation

| Directory | Documented | Actual | Compliance |
|-----------|-----------|--------|------------|
| `app/` | ✅ | ✅ | **Compliant** — App Router with route groups |
| `components/ui/` | ✅ | ✅ | **Compliant** — button.tsx, card.tsx, input.tsx (Shadcn components) |
| `components/shared/` | ✅ | ⚠️ | **Renamed** — Exists as `components/layout/` (sidebar.tsx, header.tsx) instead of `components/shared/` |
| `components/modules/` | ✅ | ⚠️ | **Reorganized** — Feature components are organized by domain (`components/laboratory/`, `components/orders/`, `components/patients/`, `components/regions/`) instead of a single `components/modules/` directory |
| `lib/` | ✅ | ✅ | **Compliant** — Contains api.ts, auth-context.tsx, hooks.ts, utils.ts |
| `types/` | ✅ | ✅ | **Compliant** — Contains order.ts, patient.ts |

### 5.2 Directories Documented but Missing in Implementation

| Documented Directory | Purpose | Status | Impact |
|---------------------|---------|--------|--------|
| `hooks/` | Custom React Hooks | ❌ **Missing** | Hooks are inlined in `lib/hooks.ts` and `components/regions/useRegionData.ts` — no dedicated top-level directory |
| `services/` | API clients and TanStack Query hooks | ❌ **Missing** | API client is in `lib/api.ts`; no dedicated services layer with query hooks |
| `schemas/` | Zod Validation Schemas | ❌ **Missing** | No Zod schemas directory found; validation schemas not separated from components |

### 5.3 Directories in Implementation but Not Documented

None — all actual directories are subsets of documented directories.

---

## 6. Structural Deviations

### 6.1 Component Organization Deviation

**Documented Pattern:**
```
components/
├── ui/           → Base Shadcn components
├── shared/       → Layout wrappers (Sidebar, Header)
└── modules/      → Feature-specific (OrderForm, PatientList)
```

**Actual Pattern:**
```
components/
├── ui/           → Base Shadcn components (3 files)
├── layout/       → Sidebar, Header (renamed from "shared")
├── laboratory/   → Lab-specific components
├── orders/       → Order-specific components
├── patients/     → Patient-specific components
└── regions/      → Region-specific components (+ tests)
```

**Analysis:** The implementation uses a **domain-based flat organization** for feature components instead of the documented single `modules/` directory. This is arguably a better approach for scalability but deviates from the documented architecture.

### 6.2 Route Group Deviation

**Documented Pattern:**
```
app/
├── (auth)/       → Route group for login/register
├── (dashboard)/  → Route group for main application
└── globals.css
```

**Actual Pattern:**
```
app/
├── dashboard/    → Standard directory (NOT a route group)
├── globals.css
├── layout.tsx
└── page.tsx      → Root page (likely login/redirect)
```

**Analysis:** The implementation does NOT use Next.js route groups `(auth)` and `(dashboard)` as documented. Instead, it uses a standard `dashboard/` directory. The `(auth)` route group is entirely absent — authentication appears to be handled at the root `page.tsx` level.

---

## 7. Missing Architectural Capabilities

| Capability | FSD Expectation | Documented Expectation | Actual State | Gap Severity |
|-----------|----------------|----------------------|--------------|--------------|
| Feature isolation with segments (ui/model/api/lib) | Required | Not explicitly required | Not implemented | Medium |
| Public API per feature (index.ts barrel exports) | Required | Not explicitly required | Partially present (laboratory/index.ts only) | Low |
| Strict layer dependency (features→entities→shared) | Required | Not explicitly required | No enforcement | Medium |
| Dedicated hooks layer | Not required by FSD | Required by docs | Missing — hooks mixed in `lib/` | Medium |
| Dedicated services/API layer | Implied by entities | Required by docs | Missing — API in `lib/api.ts` | High |
| Zod schemas separation | Not FSD-specific | Required by docs | Missing entirely | Medium |
| TanStack Query hooks organization | Not FSD-specific | Required (in `services/`) | Not visible in current structure | High |

---

## 8. Compliance Scoring

### 8.1 Against Feature-Sliced Design (FSD)

| FSD Criteria | Max Points | Score | Notes |
|-------------|-----------|-------|-------|
| Layer hierarchy present (6 layers) | 30 | 5 | Only `app/` adapted; other 5 layers missing |
| Feature isolation (segments) | 20 | 5 | Components organized by domain but no FSD segment structure |
| Strict dependency direction | 20 | 0 | No enforcement mechanism |
| Public API contracts (barrel files) | 15 | 3 | Only `components/laboratory/index.ts` exists |
| Naming conventions | 15 | 5 | Partially follows conventions |
| **FSD Total** | **100** | **18** | **Non-Compliant** |

### 8.2 Against Documented Architecture (Frontend-Architecture-eLIS-v1.0.md)

| Documented Criteria | Max Points | Score | Notes |
|--------------------|-----------|-------|-------|
| `app/` directory with route groups | 15 | 8 | `app/` exists but route groups not used |
| `components/` with ui/shared/modules split | 20 | 12 | ui/ present, shared→layout renamed, modules→domain-split |
| `lib/` utilities | 15 | 15 | Fully compliant |
| `hooks/` directory | 10 | 3 | Hooks exist but not in dedicated directory |
| `services/` directory | 15 | 0 | Completely missing |
| `types/` directory | 10 | 10 | Fully compliant |
| `schemas/` directory | 15 | 0 | Completely missing |
| **Documented Arch Total** | **100** | **48** | **Non-Compliant (below 60 threshold)** |

---

## 9. Key Findings

| # | Finding ID | Severity | Description |
|---|-----------|----------|-------------|
| 1 | FE-FSD-001 | **High** | Frontend does NOT follow Feature-Sliced Design — 5 of 6 FSD layers are completely absent |
| 2 | FE-DOC-001 | **High** | `services/` directory (API clients + TanStack Query hooks) documented but not implemented |
| 3 | FE-DOC-002 | **Medium** | `schemas/` directory (Zod validation) documented but not implemented |
| 4 | FE-DOC-003 | **Medium** | `hooks/` directory documented but not implemented — hooks scattered in lib/ and components/ |
| 5 | FE-DOC-004 | **Medium** | Route groups `(auth)` and `(dashboard)` documented but not used — standard directories instead |
| 6 | FE-DOC-005 | **Low** | `components/shared/` documented but implemented as `components/layout/` |
| 7 | FE-DOC-006 | **Low** | `components/modules/` documented but implemented as domain-split directories |
| 8 | FE-FSD-002 | **Medium** | No feature isolation — components lack FSD segment structure (ui/model/api/lib per feature) |

---

## 10. Conclusion

### Architecture Pattern Classification

The frontend uses a **Next.js App Router with Domain-Organized Components** pattern — NOT Feature-Sliced Design.

### Documentation-Implementation Discrepancy

The documented architecture in `Frontend-Architecture-eLIS-v1.0.md` describes a "Feature-Sliced Design modularitas" variant, but the implementation deviates from it in the following ways:

1. **Missing layers**: 3 documented directories (`hooks/`, `services/`, `schemas/`) are not implemented
2. **Renamed directories**: `components/shared/` → `components/layout/`; `components/modules/` → domain-based split
3. **Route group convention not followed**: Documented `(auth)` and `(dashboard)` groups not used
4. **No FSD enforcement**: No layer hierarchy, no strict dependency direction, no public API contracts

### Impact Assessment

| Dimension | Impact Level | Explanation |
|-----------|-------------|-------------|
| Developer experience | Medium | Missing `services/` layer makes API logic location unclear |
| Scalability | High | Without feature isolation, adding modules will increase coupling |
| Maintainability | Medium | Domain-based component organization is reasonable but lacks formal boundaries |
| Onboarding | Medium | Documented architecture doesn't match reality, causing confusion |

---

## 11. Recommendations

1. **Align documentation with implementation** OR **refactor implementation to match documentation** — the current state where neither FSD nor the documented variant is followed creates confusion
2. **Priority 1**: Create `services/` directory with TanStack Query hooks organized by domain
3. **Priority 2**: Create `schemas/` directory with Zod validation schemas
4. **Priority 3**: Evaluate whether full FSD adoption is warranted, or update documentation to reflect the simpler Next.js App Router pattern actually in use
5. **Priority 4**: Adopt route groups `(auth)` and `(dashboard)` as documented, or update documentation to remove this requirement

---

*End of Frontend Architecture Compliance Analysis — Task 3.3*
*This document serves as intermediate input for Task 3.6 (Architecture Compliance Score calculation)*
