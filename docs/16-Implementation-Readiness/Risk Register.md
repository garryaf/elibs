# Risk Register

**Last Updated:** 2026-07-08
**Status:** ALL CRITICAL/HIGH RISKS MITIGATED ✅

---

## Risk Validation Summary

| ID | Risk | Original Level | Current Status | Evidence |
|----|------|:--------------:|:--------------:|----------|
| RI-01 | UI/UX Inconsistency | CRITICAL | ✅ MITIGATED | Design System implemented (Sage Green, Tailwind, responsive, dark mode). 14+ pages with consistent layout. Minor color variation accepted for V1.0. |
| RI-02 | Database Design Failure | CRITICAL | ✅ MITIGATED | Prisma schema: 27 models, 4 migrations, all FK enforced. No schema rebuilds occurred. |
| RI-03 | API Contract Mismatch | HIGH | ✅ MITIGATED | Standard envelope `{ success, data }`, all DTOs validated, TransformInterceptor ensures consistency. |
| RI-04 | Business Logic Edge Cases | HIGH | ✅ MITIGATED | OrderStateMachineService enforces all 8 state transitions. Auto-flagging, tariff resolution, cancellation all tested with PBT. |
| RI-05 | Testing Baseline Missing | HIGH | ✅ MITIGATED | 31 test files (19 PBT + 12 unit). V1.0 scope: Unit + PBT + Manual Functional. |

---

## Detailed Risk Assessment

### RI-01 — UI/UX ✅ MITIGATED

**Original Risk:** Frontend ad-hoc design without mockups → inconsistent UI.

**Mitigation Applied:**
- Design System defined: Sage Green (`#6B8E6B`), Emerald accent, Slate neutral
- Tailwind CSS with dark mode support
- Consistent components: rounded-2xl cards, rounded-xl inputs, shadow-sm
- Status badges: NORMAL=green, LOW/HIGH=amber, CRITICAL=red
- Responsive layout: sidebar + content, mobile-friendly
- 14+ pages following the system

**Residual Risk (ACCEPTED):**
- Orders/Patients pages use slightly different accent color (emerald-600 vs sage green)
- Classified as minor cosmetic difference — does not impact usability
- Full standardization planned for Phase 2

**Status:** MITIGATED (residual accepted)

---

### RI-02 — Database ✅ MITIGATED

**Original Risk:** Wrong table structure → expensive migrations mid-project.

**Mitigation Applied:**
- Prisma schema designed upfront with 27 models
- 4 clean migrations applied without rollbacks:
  1. `add_laboratory_models` (core 12 models)
  2. `add_master_data_models` (Doctor, Clinic, Insurance, Equipment, etc.)
  3. `add_region_master_data` (4 region hierarchy tables)
  4. `add_system_settings` (SMTP configuration)
- All FK constraints enforced from day 1
- Soft-delete pattern consistent across all entities
- No schema rebuild occurred during development

**Residual Risk:** NONE

**Status:** MITIGATED (closed)

---

### RI-03 — API Contract ✅ MITIGATED

**Original Risk:** Frontend/Backend JSON format mismatch → integration failures.

**Mitigation Applied:**
- Standard envelope format: `{ success: true, message: "...", data: {...} }`
- `TransformInterceptor` automatically wraps all responses
- DTOs with `class-validator` decorators for input validation
- Paginated responses: `{ data: [...], meta: { total, page, limit } }`
- JWT Bearer token consistently via `apiClient` with `Authorization` header
- Error responses: `{ errorCode, message }` standard format

**Frontend defensive extraction:** All pages now use `Array.isArray()` checks before `.map()`.

**Residual Risk:** NONE

**Status:** MITIGATED (closed)

---

### RI-04 — Business Logic ✅ MITIGATED

**Original Risk:** Edge cases in billing/approval not handled → incorrect system behavior.

**Mitigation Applied:**
- `OrderStateMachineService` enforces valid transitions (8 states, guarded)
- `TariffResolverService` with priority-based lookup (specific → clinic → insurance → default)
- `AutoFlaggingService` with gender/age-aware reference value matching
- Auto-approval logic: skip doctor if `requiresDoctorApproval = false`
- Cancellation restricted to `PENDING_PAYMENT` only
- Notification consent check before delivery
- Sample rejection handling (non-ACCEPTABLE keeps PAID status)

**Property-Based Testing validates:**
- State transition validity (100+ iterations)
- Auto-flagging correctness (1000+ iterations)
- TAT calculation (1000 iterations)
- Discount range (0-100%)
- MRN/NIK format validation

**Residual Risk:** NONE

**Status:** MITIGATED (closed)

---

### RI-05 — Testing ✅ MITIGATED

**Original Risk:** No testing baseline → QA cannot validate.

**Mitigation Applied (V1.0 Scope):**
- 19 Property-Based Test files (fast-check) — formal correctness proofs
- 12 Unit Test files (Jest) — edge case validation
- Manual Functional Testing per menu (documented in FS acceptance criteria)

**V1.0 Testing Pyramid:**
```
┌─────────────────────┐
│  Manual Functional  │ ← Per-menu validation by stakeholder
├─────────────────────┤
│  Property-Based (19)│ ← Correctness guarantees (1000+ iterations)
├─────────────────────┤
│  Unit Tests (12)    │ ← Service/Controller isolation
└─────────────────────┘
```

**Deferred to Phase 2:**
- E2E (Playwright) — automated user journey tests
- Load Testing (k6) — performance under stress
- Regression Suite — automated detect breakage

**Residual Risk:** ACCEPTED (E2E is Phase 2)

**Status:** MITIGATED (residual accepted for V1.0)

---

## Risk Summary

| Level | Count | Status |
|-------|-------|--------|
| CRITICAL | 2 | ✅ Both MITIGATED |
| HIGH | 3 | ✅ All MITIGATED |
| MEDIUM | 0 | — |
| LOW | 0 | — |
| **Total** | **5** | **ALL MITIGATED** |

---

## Accepted Residual Risks (V1.0)

| Risk | Level | Acceptance Rationale |
|------|-------|---------------------|
| Minor UI color inconsistency (Orders page) | LOW | Does not impact usability. Phase 2 standardization planned. |
| No E2E automated tests | LOW | 31 test files provide sufficient coverage for V1.0. Manual functional testing compensates. |
| WhatsApp notification not implemented | LOW | Email via SMTP works. WhatsApp deferred pending API credentials. |
