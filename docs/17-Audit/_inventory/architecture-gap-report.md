# Architecture Gap Report

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-002-ARCHGAP |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

---

## Purpose

This report identifies deviations between the **actual implementation** and the **documented architecture** as specified in the Architecture Decision Records (`docs/15-ADR/`) and architecture documentation (`docs/06-Frontend/`, `docs/07-Backend/`, `docs/03-Architecture/`). Each gap represents a case where the running system diverges from an explicit architectural decision or documented pattern.

**Validates: Requirement 4.2**

**Scope:** Administration, Master Data, and Settings modules — cross-referenced against all 12 ADRs and architecture documents.

---

## Methodology

1. Each ADR consequence and documented architectural constraint was extracted as an "Expected State"
2. The actual codebase was examined (via intermediate analysis documents) to determine "Current State"
3. Gaps are classified by Category, Impact, and Remediation Effort using the scales defined in Requirement 4.2:
   - **Impact**: Critical (system unusable or data loss), High (feature blocked), Medium (degraded experience), Low (cosmetic or minor)
   - **Effort**: S ≤ 2 story points, M = 3–5 story points, L = 6–13 story points, XL ≥ 14 story points

---

## Architecture Gap Register

### Summary

| Total Gaps | Critical | High | Medium | Low |
|:----------:|:--------:|:----:|:------:|:---:|
| **18** | **1** | **5** | **8** | **4** |

---

### Gap Details

| Gap ID | Category | Description | Current State | Expected State | Impact | Effort | ADR/Doc Reference |
|--------|----------|-------------|---------------|----------------|--------|--------|-------------------|
| AGAP-001 | Frontend | Frontend architecture does not follow Feature-Sliced Design | Standard Next.js App Router with domain-organized components; 5/6 FSD layers absent | Feature-Sliced Design (FSD) modular variant with layers: app, pages, widgets, features, entities, shared | **Critical** | XL | ADR-0003, `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` |
| AGAP-002 | Frontend | `services/` directory (API clients + TanStack Query hooks) documented but not implemented | API calls are made directly from page components via `lib/api.ts`; no organized services layer | Dedicated `services/` directory with domain-organized API clients and TanStack Query hooks | **High** | M | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` Section 2 |
| AGAP-003 | Frontend | `schemas/` directory (Zod validation) documented but absent | No Zod validation schemas directory; form validation is inline or absent | Dedicated `schemas/` directory with Zod validation schemas per domain | **Medium** | M | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` Section 2 |
| AGAP-004 | Frontend | `hooks/` directory documented but not implemented | Hooks scattered in `lib/hooks.ts` (dead code) and `components/regions/useRegionData.ts` | Dedicated top-level `hooks/` directory with organized custom React hooks | **Medium** | S | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` Section 2 |
| AGAP-005 | Frontend | No server-state caching library installed (TanStack Query/SWR absent) | Every page re-fetches on mount; no caching, no stale-while-revalidate, no request deduplication | Server-state caching via TanStack Query as documented in `services/` architecture | **High** | M | ADR-0003 (consequence: "Calm Medical Experience" requires responsive UX), `docs/06-Frontend/` |
| AGAP-006 | Frontend | Route groups `(auth)` and `(dashboard)` not used | Standard `dashboard/` directory; root `page.tsx` handles auth | App Router route groups `(auth)` and `(dashboard)` per documented architecture | **Low** | S | `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md` Section 2 |
| AGAP-007 | Backend | Backend Architecture document describes 11 separate top-level modules; actual uses consolidated umbrella module | All domain modules consolidated under `laboratory/` umbrella (9 sub-modules). Only 5 top-level dirs: auth, common, config, health, laboratory, users | 11 top-level modules: patients/, clinics/, doctors/, master/, orders/, billing/, laboratory/, reports/, notifications/, audit/ | **High** | S | `docs/07-Backend/Backend-Architecture-eLIS-v1.0.md` Section 3 |
| AGAP-008 | Backend | Inter-module communication via direct service injection, not through defined interfaces | Sub-modules import services directly (e.g., OrderModule imports PaymentService, PatientService directly) | ADR-0001 states: "Modul tidak boleh mengakses database modul lain secara langsung; komunikasi antar modul harus melalui interface (service/API internal)" | **Medium** | L | ADR-0001 Consequence #3 |
| AGAP-009 | Backend | No linting rules enforcing module boundary imports | No ESLint plugin or custom rule prevents importing from one domain module into another | ADR-0001 states: "Kita perlu menerapkan linting/aturan yang ketat untuk mencegah import antar domain yang tidak sah" | **Medium** | M | ADR-0001 Consequence #4 |
| AGAP-010 | Infrastructure | Redis not deployed or configured in current Docker Compose | `docker-compose.yml` includes PostgreSQL and MinIO but Redis is either absent or not integrated with application services for caching/queue | Redis required for: master data caching, BullMQ job queues (email, WhatsApp, PDF), JWT blocklist, OTP storage | **High** | M | ADR-0005 Consequence #1-4 |
| AGAP-011 | Backend | No BullMQ queue implementation for notification delivery | Notification module (`notification.service.ts`, `email.service.ts`, `whatsapp.service.ts`) processes synchronously without queue | Queue-based async via BullMQ with separate email-queue and wa-queue workers; retry, rate-limiting, dead-letter queue | **High** | L | ADR-0008 Consequence #1-4 |
| AGAP-012 | Backend | No `/metrics` endpoint exposed for Prometheus scraping | Health controller returns basic health check; no Prometheus metrics endpoint or instrumentation | NestJS must expose `/metrics` endpoint per ADR-0011; structured JSON logging with Trace ID correlation required | **Medium** | M | ADR-0011 Consequence #1, #3 |
| AGAP-013 | Backend | No Rate Limiting middleware on Authentication endpoints | Auth controller (`auth.controller.ts`) has no throttle guard or rate-limit middleware configured | Rate limiting required on all endpoints, especially Authentication (Login/OTP), via Redis-backed limiter | **Medium** | S | ADR-0012 Consequence #2 |
| AGAP-014 | Backend | No AES-256 encryption at rest for PII fields | Patient NIK and sensitive personal data stored as plain text in PostgreSQL | PII fields (NIK) must be encrypted at rest using AES-256 per ADR-0012 | **Medium** | M | ADR-0012 Consequence #4 |
| AGAP-015 | Backend | Refresh Token strategy not implemented | Authentication uses single JWT Access Token only; no Refresh Token rotation or HttpOnly cookie storage visible | Access Token (short-lived, 15min) + Refresh Token (long-lived, 7 days, HttpOnly Cookie) per ADR-0007 | **Medium** | M | ADR-0007 Consequence #1 |
| AGAP-016 | Infrastructure | No API Gateway / reverse proxy layer configured | Frontend directly calls backend NestJS API; no Traefik/NGINX/Kong gateway for SSL termination, rate limiting, or routing | API Gateway (Traefik/NGINX/Kong) for centralized rate-limiting, SSL termination, DDoS protection | **Low** | L | ADR-0009 Consequence #1-2 |
| AGAP-017 | Database | Database Design document severely incomplete vs actual Prisma schema | ERD documents ~7 entities; Prisma schema implements 25+ models including Panel, Tariff, ReferenceValue, Insurance, Equipment, Reagent, Region entities | Complete ERD with all entities, relationships, data types, and constraints matching Prisma schema | **Low** | L | `docs/04-Database/Database-Design-eLIS-v1.0.md`, ADR-0004 |
| AGAP-018 | Backend | Dead code: unused hooks in `lib/hooks.ts` violates code hygiene standards | `lib/hooks.ts` exports `usePatients`, `useOrders`, `useTests` etc. — never imported by any page | Clean codebase with no dead code; unused abstractions should be removed or properly utilized | **Low** | S | General code quality per ADR-0012 (Security by Design — minimal attack surface) |

---

## Detailed Gap Analysis

### AGAP-001: Frontend Architecture — FSD Non-Compliance (Critical)

**ADR Reference:** ADR-0003 (Frontend), `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`

**Description:** The Frontend Architecture document prescribes a "Feature-Sliced Design modularitas" variant. The actual implementation uses a standard Next.js App Router pattern without any FSD layer hierarchy. This is the single largest architectural deviation in the system.

**Evidence:**
- FSD Layer Compliance Score: 18/100
- Documented Architecture Compliance Score: 48/100
- Missing: 5/6 FSD layers (pages, widgets, features, entities, shared as named layers)
- Present: Only `app/` layer (adapted as Next.js App Router)

**Root Cause:** Architecture documentation was written as forward-looking design (2026-06-30). Implementation adopted simpler Next.js conventions without retroactive documentation update.

**Remediation Options:**
1. (Preferred) Update documentation to reflect actual Next.js App Router pattern and establish the domain-organized component pattern as the project standard
2. (Alternative) Incrementally adopt FSD layers — starting with `services/` and `schemas/` directories

---

### AGAP-005: No Server-State Caching (High)

**ADR Reference:** ADR-0003 (Frontend)

**Description:** The documented frontend architecture specifies TanStack Query hooks in the `services/` directory for server-state management. No caching library is installed. Every page re-fetches all data on mount without caching, stale-while-revalidate, or request deduplication.

**Evidence:**
- No TanStack Query or SWR in `package.json`
- All pages use direct `apiClient` calls with local `useState`
- Only exception: `useRegionData` with manual 5-minute cache
- Navigation away and back triggers full re-fetch

**Impact:** Degraded user experience (perceived slowness), unnecessary API load, no optimistic updates for CRUD operations.

---

### AGAP-008: Module Boundary Violation — No Interface Segregation (Medium)

**ADR Reference:** ADR-0001, Consequence #3

**Description:** ADR-0001 explicitly states modules must communicate through interfaces (service/API internal), not direct cross-module database access. The current implementation allows sub-modules to directly inject services from sibling modules without defined interface contracts.

**Evidence:**
- OrderModule can import and inject PatientService directly
- PaymentModule imports OrderService
- No interface definitions (`*.interface.ts`) enforcing contracts between modules
- No event-based communication between bounded contexts

**Impact:** Increased coupling between modules makes future extraction to microservices (ADR-0001 Future Consideration) significantly harder. Changes to one module's internal service can break dependents.

---

### AGAP-010: Redis Not Integrated (High)

**ADR Reference:** ADR-0005 (Redis)

**Description:** ADR-0005 mandates Redis for four critical use cases: caching master data, BullMQ job queues, JWT blocklist for logout, and OTP storage with TTL. The current deployment lacks Redis integration with the application services.

**Evidence:**
- No `@nestjs/bullmq` or `bullmq` in API `package.json` dependencies
- No Redis client configuration module visible
- Notification module operates synchronously
- No JWT blocklist — logout cannot invalidate tokens server-side
- No OTP mechanism for password reset

**Impact:** Features blocked: proper logout (token invalidation), async notifications, password reset OTP, master data caching. The queue absence also means notification delivery is synchronous and fragile.

---

### AGAP-011: Synchronous Notification Delivery (High)

**ADR Reference:** ADR-0008 (Notification)

**Description:** ADR-0008 mandates queue-based asynchronous notification delivery using BullMQ. The current notification module (`email.service.ts`, `whatsapp.service.ts`, `pdf-generator.service.ts`) processes in the request-response cycle without a queue, risking timeouts and lost notifications.

**Evidence:**
- No BullMQ queue registration in notification module
- No worker/processor files for email or WhatsApp queues
- No dead-letter queue handling for failed deliveries
- No retry mechanism for external vendor failures

**Impact:** If email/WhatsApp vendor is slow or down, the API response to the doctor/technician will timeout or fail. Notifications can be lost permanently on server crash.

---

### AGAP-015: No Refresh Token Strategy (Medium)

**ADR Reference:** ADR-0007 (Authentication)

**Description:** ADR-0007 mandates a dual-token authentication strategy: short-lived Access Token (15 minutes) stored in frontend memory + long-lived Refresh Token (7 days) stored in HttpOnly Cookie. The current implementation uses a single JWT token without refresh mechanism.

**Evidence:**
- `auth.service.ts` generates a single JWT token on login
- No refresh token endpoint visible
- No HttpOnly cookie handling in auth controller
- Frontend stores token in localStorage (per AuthContext)

**Impact:** Users must re-login frequently (if token is short-lived) or token is long-lived (security risk if stolen). No secure refresh mechanism.

---

## Gap Distribution by Category

| Category | Count | Critical | High | Medium | Low |
|----------|:-----:|:--------:|:----:|:------:|:---:|
| Frontend | 6 | 1 | 2 | 2 | 1 |
| Backend | 9 | 0 | 2 | 6 | 1 |
| Infrastructure | 2 | 0 | 1 | 0 | 1 |
| Database | 1 | 0 | 0 | 0 | 1 |
| **Total** | **18** | **1** | **5** | **8** | **4** |

---

## Gap Distribution by Remediation Effort

| Effort | Count | Story Points Range | Gaps |
|--------|:-----:|:------------------:|------|
| S (≤ 2 SP) | 5 | 5–10 SP | AGAP-004, AGAP-006, AGAP-007, AGAP-013, AGAP-018 |
| M (3–5 SP) | 8 | 24–40 SP | AGAP-002, AGAP-003, AGAP-005, AGAP-009, AGAP-010, AGAP-012, AGAP-014, AGAP-015 |
| L (6–13 SP) | 4 | 24–52 SP | AGAP-008, AGAP-011, AGAP-016, AGAP-017 |
| XL (≥ 14 SP) | 1 | ≥ 14 SP | AGAP-001 |
| **Total** | **18** | **67–116 SP** | — |

**Note:** AGAP-002 and AGAP-005 share remediation effort (adopting TanStack Query addresses both). Effective effort is lower than sum.

---

## Prioritized Remediation Roadmap

### Phase 1 — Critical & High Impact (Immediate)

| Priority | Gap ID | Action | Effort | Rationale |
|:--------:|--------|--------|:------:|-----------|
| P1 | AGAP-010 | Integrate Redis with NestJS (BullMQ, caching, JWT blocklist) | M | Blocks 4 ADR-mandated features |
| P1 | AGAP-011 | Implement BullMQ queues for email/WhatsApp/PDF notification | L | Data loss risk — notifications lost on failure |
| P2 | AGAP-005 | Adopt TanStack Query for server-state caching | M | UX degradation across all pages |
| P2 | AGAP-002 | Create `services/` directory with domain API clients | M | Prerequisite for TanStack Query adoption |
| P2 | AGAP-007 | Update Backend Architecture documentation to match actual umbrella structure | S | Documentation accuracy — prevents developer confusion |

### Phase 2 — Medium Impact (Short-term)

| Priority | Gap ID | Action | Effort | Rationale |
|:--------:|--------|--------|:------:|-----------|
| P2 | AGAP-015 | Implement Refresh Token strategy (Access + Refresh + HttpOnly Cookie) | M | Security: token management per ADR-0007 |
| P2 | AGAP-009 | Add ESLint module boundary rules (e.g., `eslint-plugin-boundaries`) | M | Architecture enforcement per ADR-0001 |
| P3 | AGAP-008 | Define interface contracts between laboratory sub-modules | L | Coupling reduction for future microservice extraction |
| P3 | AGAP-013 | Add rate limiting to auth endpoints via `@nestjs/throttler` | S | Security: brute-force protection per ADR-0012 |
| P3 | AGAP-014 | Implement AES-256 field-level encryption for patient PII (NIK) | M | Compliance: UU PDP / data protection per ADR-0012 |
| P3 | AGAP-012 | Add Prometheus metrics endpoint and structured JSON logging | M | Observability per ADR-0011 |
| P3 | AGAP-003 | Create `schemas/` directory with Zod validation schemas | M | Input validation consistency per ADR-0012 |

### Phase 3 — Low Impact (Deferred)

| Priority | Gap ID | Action | Effort | Rationale |
|:--------:|--------|--------|:------:|-----------|
| P3 | AGAP-001 | Align frontend documentation with actual architecture OR incrementally adopt documented pattern | XL | Large scope — recommend documentation update as first step |
| P3 | AGAP-004 | Create dedicated `hooks/` directory and consolidate scattered hooks | S | Code organization improvement |
| P4 | AGAP-016 | Deploy API Gateway (Traefik/NGINX) for SSL/rate-limiting | L | Infrastructure hardening for production |
| P4 | AGAP-017 | Update Database Design document with all Prisma entities | L | Documentation maintenance |
| P4 | AGAP-006 | Adopt route groups or update documentation to remove requirement | S | Cosmetic — current routing works correctly |
| P4 | AGAP-018 | Remove dead code in `lib/hooks.ts` | S | Code hygiene |

---

## Estimated Total Remediation Effort

| Phase | Effort Range (SP) | Timeline Recommendation |
|-------|:-----------------:|------------------------|
| Phase 1 (Critical/High) | 20–35 SP | Sprint 1–2 |
| Phase 2 (Medium) | 28–50 SP | Sprint 3–5 |
| Phase 3 (Low/Deferred) | 30–50 SP | Sprint 6+ (or deferred) |
| **Total** | **78–135 SP** | — |

---

## Cross-References

| Reference ID | Source Document | Related Findings |
|-------------|----------------|------------------|
| [AUDIT-eLIS-2026-002]#Score | Architecture Gap Analysis (main) | Overall compliance score 84.3/100 |
| [AUDIT-eLIS-2026-001-FE]#FE-FSD-001 | Frontend Architecture Compliance | AGAP-001 source finding |
| [AUDIT-eLIS-2026-001-FE]#FE-DOC-001 | Frontend Architecture Compliance | AGAP-002 source finding |
| [AUDIT-eLIS-2026-001-FE]#FE-DOC-002 | Frontend Architecture Compliance | AGAP-003 source finding |
| [AUDIT-eLIS-2026-001-FE]#FE-DOC-003 | Frontend Architecture Compliance | AGAP-004 source finding |
| [AUDIT-eLIS-2026-001-SM]#SM-01 | State Management Analysis | AGAP-005 source finding |
| [AUDIT-eLIS-2026-001-CDI]#INC-007 | Cross-Document Inconsistencies | AGAP-007 source finding |
| [AUDIT-eLIS-2026-001-CDI]#INC-008 | Cross-Document Inconsistencies | AGAP-001, AGAP-002, AGAP-003, AGAP-004 source |
| [AUDIT-eLIS-2026-001-ARCH-BE] | Backend Architecture Analysis | Module completeness violations |
| [AUDIT-eLIS-2026-001-ROUTE] | Routing Structure Analysis | Dead route context for AGAP-005 |
| [AUDIT-eLIS-2026-001-SM]#SM-02 | State Management Analysis | AGAP-018 source finding |

---

## ADR Compliance Matrix

This matrix maps each ADR consequence to its compliance status:

| ADR | Consequence | Status | Gap ID |
|-----|-------------|--------|--------|
| ADR-0001 | #1 — Monorepo development | ✅ Compliant | — |
| ADR-0001 | #2 — Code organized per domain | ✅ Compliant | — |
| ADR-0001 | #3 — Inter-module via interface only | ❌ Non-compliant | AGAP-008 |
| ADR-0001 | #4 — Strict linting rules for boundary | ❌ Non-compliant | AGAP-009 |
| ADR-0002 | #1 — NestJS architecture (Controllers, Providers, Modules) | ✅ Compliant | — |
| ADR-0002 | #2 — TypeScript Strict Mode | ✅ Compliant | — |
| ADR-0002 | #3 — Each domain as separate Module | ✅ Compliant | — |
| ADR-0003 | #1 — Next.js React Framework | ✅ Compliant | — |
| ADR-0003 | #2 — Tailwind CSS with strict theme | ✅ Compliant | — |
| ADR-0003 | #3 — Shadcn UI for accessibility & UX | ✅ Compliant | — |
| ADR-0004 | #1 — Schema in `schema.prisma` | ✅ Compliant | — |
| ADR-0004 | #2 — Prisma Client for all DB interactions | ✅ Compliant | — |
| ADR-0004 | #3 — Interactive Transactions for ACID | ✅ Compliant | — |
| ADR-0005 | #1 — Redis for master data cache | ❌ Non-compliant | AGAP-010 |
| ADR-0005 | #2 — BullMQ for async jobs | ❌ Non-compliant | AGAP-010, AGAP-011 |
| ADR-0005 | #3 — Redis for JWT blocklist | ❌ Non-compliant | AGAP-010 |
| ADR-0005 | #4 — Redis for OTP with TTL | ❌ Non-compliant | AGAP-010 |
| ADR-0007 | #1 — Access Token + Refresh Token (HttpOnly Cookie) | ❌ Non-compliant | AGAP-015 |
| ADR-0007 | #2 — Every endpoint protected by Guard (JWT + Role) | ⚠️ Partial | — (see RBAC review) |
| ADR-0007 | #3 — Redis for JWT blocklist | ❌ Non-compliant | AGAP-010 |
| ADR-0008 | #1 — email-queue and wa-queue | ❌ Non-compliant | AGAP-011 |
| ADR-0008 | #2 — Approve publishes jobs to queue | ❌ Non-compliant | AGAP-011 |
| ADR-0008 | #3 — Separate worker processes | ❌ Non-compliant | AGAP-011 |
| ADR-0008 | #4 — Logging for failed deliveries | ⚠️ Partial | AGAP-011 |
| ADR-0009 | #1 — API Gateway pass-through | ❌ Non-compliant | AGAP-016 |
| ADR-0009 | #2 — Frontend unaware of backend architecture | ⚠️ Partial | AGAP-016 |
| ADR-0010 | #1 — Each service has Dockerfile | ✅ Compliant | — |
| ADR-0010 | #2 — docker-compose for deployment | ✅ Compliant | — |
| ADR-0010 | #3 — Secrets via environment variables | ✅ Compliant | — |
| ADR-0011 | #1 — `/metrics` endpoint exposed | ❌ Non-compliant | AGAP-012 |
| ADR-0011 | #2 — Structured JSON logging | ⚠️ Partial | AGAP-012 |
| ADR-0011 | #3 — Trace/Correlation ID per request | ❌ Non-compliant | AGAP-012 |
| ADR-0012 | #1 — OWASP Top 10 (input validation, XSS, CSRF, SQLi) | ✅ Compliant | — |
| ADR-0012 | #2 — Rate Limiting on Auth endpoints | ❌ Non-compliant | AGAP-013 |
| ADR-0012 | #3 — Audit Trail for mutations | ✅ Compliant | — |
| ADR-0012 | #4 — AES-256 encryption for PII | ❌ Non-compliant | AGAP-014 |

### ADR Compliance Summary

| Status | Count | Percentage |
|--------|:-----:|:----------:|
| ✅ Compliant | 17 | 50.0% |
| ⚠️ Partial | 4 | 11.8% |
| ❌ Non-compliant | 13 | 38.2% |
| **Total Consequences Assessed** | **34** | **100%** |

---

## Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/src/` | READ-ONLY | Referenced via intermediate analysis documents |
| `apps/web/src/` | READ-ONLY | Referenced via intermediate analysis documents |
| `docs/15-ADR/` | READ-ONLY | Read all 12 ADR documents for decision extraction |
| `docs/06-Frontend/` | READ-ONLY | Read Frontend Architecture document |
| `docs/07-Backend/` | READ-ONLY | Read Backend Architecture document |
| `docs/04-Database/` | READ-ONLY | Read Database Design document |
| `docs/17-Audit/_inventory/` | READ-ONLY | Read intermediate analysis files |
| `docs/17-Audit/_inventory/` | WRITE | Produced this report |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Architecture Gap Report*
*Document ID: AUDIT-eLIS-2026-002-ARCHGAP | Version 1.0 | Classification: Internal*
