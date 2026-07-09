# Shared Component Placement Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-SCP |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This intermediate analysis identifies shared components (guards, interceptors, filters, pipes, decorators) that exist outside the canonical `apps/api/src/common/` directory — recording each as an "Architectural Violation" per Requirement 2.3. This document feeds into the Architecture Compliance Score calculation (Task 3.6).

---

## 1. Scan Scope

| Directory Scanned | Purpose |
|-------------------|---------|
| `apps/api/src/auth/` | Check for guards, decorators, or pipes |
| `apps/api/src/users/` | Check for guards, decorators, or pipes |
| `apps/api/src/health/` | Check for guards, decorators, or pipes |
| `apps/api/src/config/` | Check for guards, decorators, or pipes |
| `apps/api/src/laboratory/` (all sub-modules) | Check for guards, interceptors, filters, pipes, decorators |

### Shared Component Types Checked

| Component Type | NestJS Interface / Pattern | File Naming Convention |
|----------------|---------------------------|----------------------|
| Guard | `implements CanActivate` | `*.guard.ts` |
| Interceptor | `implements NestInterceptor` | `*.interceptor.ts` |
| Filter | `implements ExceptionFilter`, `@Catch()` | `*.filter.ts` |
| Pipe | `implements PipeTransform` | `*.pipe.ts` |
| Decorator | `createParamDecorator()`, `SetMetadata()`, `applyDecorators()` | `*.decorator.ts` |

---

## 2. Current Shared Components in `common/`

All existing shared components are correctly located under `apps/api/src/common/`:

| Type | File | Location (Correct) |
|------|------|-------------------|
| Guard | `jwt-auth.guard.ts` | `common/guards/jwt-auth.guard.ts` ✅ |
| Guard | `roles.guard.ts` | `common/guards/roles.guard.ts` ✅ |
| Interceptor | `logging.interceptor.ts` | `common/interceptors/logging.interceptor.ts` ✅ |
| Interceptor | `transform.interceptor.ts` | `common/interceptors/transform.interceptor.ts` ✅ |
| Filter | `all-exceptions.filter.ts` | `common/filters/all-exceptions.filter.ts` ✅ |
| Pipe | `validation.pipe.ts` | `common/pipes/validation.pipe.ts` ✅ |
| Decorator | `current-user.decorator.ts` | `common/decorators/current-user.decorator.ts` ✅ |
| Decorator | `roles.decorator.ts` | `common/decorators/roles.decorator.ts` ✅ |

**Total shared components in correct location: 8**

---

## 3. Shared Component Placement Violations

### 3.1 Violations Found

**No Architectural Violations found.**

After comprehensive scanning of all source directories outside `apps/api/src/common/`, no shared components (guards, interceptors, filters, pipes, or decorators) were found misplaced.

### 3.2 Scan Evidence

| Check | Method | Result |
|-------|--------|--------|
| `implements CanActivate` outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| `implements NestInterceptor` outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| `implements ExceptionFilter` outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| `implements PipeTransform` outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| `createParamDecorator` / `SetMetadata` / `applyDecorators` outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| `@Catch()` decorator usage outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| `@UseFilters` / `@UseInterceptors` / `@UsePipes` (custom) outside common/ | Regex search across `apps/api/src/**/*.ts` excluding `common/` | **0 matches** |
| Files matching `*.guard.ts` pattern outside common/ | File name search | **0 matches** |
| Files matching `*.interceptor.ts` pattern outside common/ | File name search | **0 matches** |
| Files matching `*.filter.ts` pattern outside common/ | File name search | **0 matches** |
| Files matching `*.pipe.ts` pattern outside common/ | File name search | **0 matches** |
| Files matching `*.decorator.ts` pattern outside common/ | File name search | **0 matches** |

---

## 4. Edge Cases Examined (Not Violations)

The following files were examined but do NOT qualify as shared component placement violations:

### 4.1 `laboratory/audit/audit-log.middleware.ts`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Prisma client middleware (not NestJS middleware/interceptor) |
| **Interface** | Does not implement `NestMiddleware`, `NestInterceptor`, or `CanActivate` |
| **Pattern** | Registers via `prisma.$use()` — a Prisma-specific ORM hook |
| **Scope** | Domain-specific audit logging for laboratory models only |
| **Verdict** | **NOT a shared component** — Prisma middleware is infrastructure glue specific to the audit sub-module |

### 4.2 `laboratory/lab-workflow/exceptions/invalid-state-transition.exception.ts`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Custom exception class (extends `BadRequestException`) |
| **Interface** | Does NOT implement `ExceptionFilter` |
| **Pattern** | Thrown exception, not a catch handler |
| **Scope** | Domain-specific to lab-workflow order state machine |
| **Verdict** | **NOT a shared component** — Custom exceptions are domain objects, not filters. The `@Catch()` handler is in `common/filters/all-exceptions.filter.ts` where it belongs. |

### 4.3 `auth/strategies/jwt.strategy.ts`

| Aspect | Assessment |
|--------|-----------|
| **Type** | Passport strategy (extends `PassportStrategy(Strategy)`) |
| **Interface** | Does NOT implement `CanActivate` |
| **Pattern** | Strategy pattern consumed by `JwtAuthGuard` (which IS in common/) |
| **Scope** | Auth-module-specific — strategy is registered within `auth.module.ts` only |
| **Verdict** | **NOT a shared component** — Passport strategies are module-specific providers. The guard that consumes it (`JwtAuthGuard`) is correctly in `common/guards/`. |

---

## 5. Compliance Summary for Task 3.6

| Metric | Value |
|--------|-------|
| Total shared components assessed | 8 |
| Components correctly placed in `common/` | 8 |
| Components incorrectly placed (violations) | 0 |
| **Compliance ratio** | **8 / 8 = 100%** |
| **Score contribution** (weight 20 of 100) | **(8/8) × 20 = 20.0 points** |

---

## 6. Architectural Violations Table

| # | Violation Type | Component | Current Location | Recommended Location | Severity |
|---|---------------|-----------|-----------------|---------------------|----------|
| — | — | — | — | — | — |

**No violations recorded.** The codebase fully complies with the shared component placement rule requiring guards, interceptors, filters, pipes, and decorators to reside under `apps/api/src/common/`.

---

## 7. Observations & Recommendations

While no violations exist today, the following architectural observations may be relevant for future growth:

1. **Prisma middleware pattern**: The `audit-log.middleware.ts` uses `prisma.$use()` which is a Prisma-specific pattern. If additional Prisma middlewares are needed in the future (e.g., soft-delete, multi-tenancy), consider creating a `common/prisma/middlewares/` directory to centralize them.

2. **Custom exceptions**: The `invalid-state-transition.exception.ts` is domain-specific today. If other modules need similar state-machine exceptions in the future, a `common/exceptions/` directory could be introduced for shared exception types.

3. **Passport strategies**: Currently only one strategy exists (`jwt.strategy.ts`). If additional auth strategies are added (OAuth2, SAML, API Key), they should remain in `auth/strategies/` as they are module-bound providers, not shared components.

---

## Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/src/` | READ-ONLY | Scanned for shared component patterns via regex, read specific files for verification |
| `docs/17-Audit/_inventory/` | WRITE | Produced this analysis document |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Shared Component Placement Analysis — Generated for Enterprise Admin Architecture Audit Task 3.2*
