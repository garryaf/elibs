# Enterprise Access Control Capabilities Evaluation

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-RBAC-EVAL |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document evaluates the current eLIS RBAC implementation against enterprise access control capabilities and produces a recommendation for the target access control architecture. It serves as an intermediate analysis artifact for the final `docs/17-Audit/rbac-review.md` output.

**Validates: Requirements 5.2, 5.3**

---

## 1. Enterprise Access Control Capability Assessment

### 1.1 Capability Gap Summary

| # | Capability | Status | Evidence | Impact |
|---|-----------|--------|----------|--------|
| 1 | Granular Permission Management | ❌ MISSING | RolesGuard performs flat `user.role === requiredRole` matching; no action-level or field-level control | Cannot grant partial access (e.g., "read tariffs but not edit") to specific roles |
| 2 | Role Hierarchy | ❌ MISSING | SUPER_ADMIN must be explicitly listed on every endpoint; no inheritance chain | Maintenance burden: every new endpoint must list all applicable roles manually |
| 3 | Role Composition | ❌ MISSING | User model has single `role: Role` field; no junction table for multi-role | Staff performing dual functions (KASIR + SAMPLING) need two accounts |
| 4 | Department-Based Access | ❌ MISSING | No Department, Location, or OrgUnit entity in schema; no data filtering by org unit | Any KASIR sees ALL patients/orders across all locations |
| 5 | Position-Based Access | ❌ MISSING | No Position entity or position-to-permission mapping | Cannot map organizational positions (Head Analyst, Junior Analyst) to differentiated access |
| 6 | Approval Workflows | ❌ MISSING | Single-step guard check only; no workflow state machine or approval chain entities | Lab workflow relies on role gates only — no audit trail of approval steps or rejection reasons |

**Result: 0 of 6 enterprise capabilities are implemented. All are missing.**

---

### 1.2 Detailed Capability Gap Analysis

#### Gap 1: Granular Permission Management

**Current State:**
- Authorization is binary: role matches → access granted, role doesn't match → 403
- The `@Roles(ADMIN, SUPER_ADMIN)` decorator is the finest unit of control
- No action-level permissions (create/read/update/delete per resource)
- No field-level permissions (e.g., hide salary fields from certain roles)

**Business Impact:**
- Cannot implement "view-only" access to master data for MANAGER/OWNER roles
- KASIR currently has the same write access level to orders whether creating or voiding — no differentiation
- Tariff read access is restricted to ADMIN/SUPER_ADMIN only, preventing KASIR from viewing pricing during order entry (operational friction)

**Enterprise Requirement:**
- Healthcare LIS systems typically require action-level control: `resource:action` patterns (e.g., `order:create`, `order:void`, `tariff:read`)

#### Gap 2: Role Hierarchy

**Current State:**
- Flat matching: `requiredRoles.some((role) => user?.role === role)`
- SUPER_ADMIN does NOT automatically inherit all lower-role permissions
- Every endpoint must explicitly list every applicable role

**Business Impact:**
- Developer error risk: if a new endpoint forgets to include SUPER_ADMIN, the highest-privilege user loses access
- 56 endpoints manually repeat role lists; maintenance scales linearly with endpoint count
- Current pattern already shows inconsistency: some endpoints list ADMIN only, missing SUPER_ADMIN where it should logically inherit

**Enterprise Requirement:**
- Standard RBAC implementations use hierarchy: SUPER_ADMIN > ADMIN > MANAGER > operational roles
- Reduces decorator noise and prevents "forgot to include role X" bugs

#### Gap 3: Role Composition

**Current State:**
- `User.role` is a single `Role` enum field (Prisma schema line 18)
- No `UserRole` junction table exists
- A user can only hold exactly one role at a time

**Business Impact:**
- Real-world scenario: A small lab may have a pathologist (DOKTER) who also manages the lab (MANAGER). Currently impossible without two accounts.
- KLINIK_PARTNER staff who also do sampling (SAMPLING) cannot be represented
- Workaround today: assign the "broader" role and accept over-permission

**Enterprise Requirement:**
- Multi-role assignment or role composition (union of permissions from multiple roles)
- Common in healthcare where staff wear multiple hats, especially in smaller facilities

#### Gap 4: Department-Based Access

**Current State:**
- No `Department`, `Branch`, `Location`, or `OrgUnit` entity in the Prisma schema
- No `userId → departmentId` relationship
- Data queries (patients, orders) return ALL records regardless of user's organizational unit
- No row-level security or data scope filtering

**Business Impact:**
- A multi-branch laboratory cannot restrict cashiers to see only their branch's orders
- A partner clinic (KLINIK_PARTNER) can see ALL orders from ALL partners — no tenant isolation
- Violates data minimization principle (ISO 27001 / healthcare compliance requirements)

**Enterprise Requirement:**
- Department/branch-based data scoping is essential for multi-site laboratory operations
- BPJS compliance may require per-facility reporting isolation

#### Gap 5: Position-Based Access

**Current State:**
- No `Position` entity or position-to-role/permission mapping
- Role enum represents functional access, not organizational position
- Cannot differentiate seniority levels within the same functional role

**Business Impact:**
- Cannot distinguish Senior Analyst (can verify their own results) from Junior Analyst (requires peer verification)
- Head of Laboratory vs Staff Pathologist have same DOKTER access
- No career progression reflected in system access

**Enterprise Requirement:**
- Position-based access maps organizational chart positions to permission sets
- Important for audit compliance: "who approved this?" requires knowing the approver's position authority

#### Gap 6: Approval Workflows

**Current State:**
- Lab workflow relies on sequential role gates: ANALIS enters → DOKTER approves
- No formal approval state machine, no rejection with reason, no escalation
- No approval audit trail beyond the basic AuditLog model
- No configurable approval chains (e.g., 2-approver for high-value tests)

**Business Impact:**
- Cannot enforce "4-eyes principle" for critical results
- No mechanism for approval delegation (when DOKTER is absent)
- Payment void/refund has no multi-level authorization
- Master data changes (new test prices) go live immediately without review

**Enterprise Requirement:**
- Healthcare regulations often require multi-step result approval (especially for critical/panic values)
- Financial operations (void, refund) typically require supervisor authorization

---

## 2. Option Analysis

### Option A: Enhanced Role-Based

**Description:** Retain the existing `Role` enum and `RolesGuard` but add a per-role permission configuration layer that maps each role to a set of action-level permissions.

**Implementation Approach:**
- Create a static permission registry: `Map<Role, Permission[]>`
- Each permission is a string like `master-data:read`, `order:create`, `tariff:update`
- Modify `RolesGuard` to check `user.role → permissions → requiredPermission`
- Add `@RequirePermission('order:create')` decorator alongside existing `@Roles`
- No database schema changes required (permissions are code-defined)

**Gaps Addressed:**
| Gap | Addressed? | Notes |
|-----|-----------|-------|
| Granular Permission Management | ✅ Partial | Action-level granularity through permission mapping |
| Role Hierarchy | ✅ Yes | Define hierarchy in code: SUPER_ADMIN inherits all ADMIN permissions |
| Role Composition | ❌ No | Still single role per user; cannot combine roles |
| Department-Based Access | ❌ No | No data scoping mechanism |
| Position-Based Access | ❌ No | No position entity |
| Approval Workflows | ❌ No | Out of scope for this option |

**Pros:**
- Minimal code change (guard modification + permission decorator)
- No database migration required
- Backward compatible — existing `@Roles` decorator continues to work
- Fast to implement (estimated 3-5 days)

**Cons:**
- Still limited to single role per user
- Cannot support multi-branch data isolation
- Permission changes require code deployment (not runtime-configurable)
- Does not scale beyond ~20 roles or ~200 permissions without becoming unwieldy

---

### Option B: Full RBAC

**Description:** Introduce separate `Permission`, `RolePermission`, and optionally `UserRole` entities in the database, enabling dynamic (runtime-configurable) permission assignment.

**Implementation Approach:**
- Add database entities: `Permission`, `RolePermission`, `UserRole` (junction for multi-role)
- Optionally add `Department`, `UserDepartment` entities
- New guard: `PermissionGuard` that queries permissions at runtime
- Admin UI for managing permissions and role-permission assignments
- Migration: seed existing role-endpoint mappings into the new Permission tables

**Gaps Addressed:**
| Gap | Addressed? | Notes |
|-----|-----------|-------|
| Granular Permission Management | ✅ Full | Database-driven, action-level permissions |
| Role Hierarchy | ✅ Full | Parent-child role relationships in schema |
| Role Composition | ✅ Full | UserRole junction table enables multi-role |
| Department-Based Access | ✅ Full | Department entity + data scoping middleware |
| Position-Based Access | ✅ Full | Position entity with permission set mapping |
| Approval Workflows | ⚠️ Partial | Enables but doesn't implement workflow engine |

**Pros:**
- Runtime-configurable permissions (no redeployment for access changes)
- Supports multi-role, department isolation, position-based access
- Industry-standard RBAC model (NIST RBAC)
- Scales to enterprise complexity
- Audit-friendly: permission assignments are database records with timestamps

**Cons:**
- Significant database migration (5+ new tables)
- Performance overhead: permission lookup requires DB queries per request (mitigated with caching)
- Higher implementation complexity (~15-25 days)
- Requires admin UI for permission management
- Over-engineered for current system size (11 roles, 83 endpoints) unless growth is expected

---

### Option C: ABAC Hybrid

**Description:** Combine role-based authentication with attribute-based access control (ABAC) policies that evaluate user attributes (department, position, shift), resource attributes (sensitivity, owner), and environmental attributes (time, location).

**Implementation Approach:**
- Keep Role enum for coarse-grained access
- Add policy engine (e.g., CASL or custom) that evaluates conditions:
  ```
  can(user).do('approve').on('labResult').when({
    user.position === 'HEAD_PATHOLOGIST',
    resource.criticality === 'PANIC',
    user.department === resource.originDepartment
  })
  ```
- Add attribute entities: Department, Position, and attribute metadata on resources
- Policy definitions stored as configuration (code or database)

**Gaps Addressed:**
| Gap | Addressed? | Notes |
|-----|-----------|-------|
| Granular Permission Management | ✅ Full | Attribute-based conditions on any action |
| Role Hierarchy | ✅ Full | Can model as policy rules |
| Role Composition | ✅ Full | Policies evaluate multiple attributes, not just role |
| Department-Based Access | ✅ Full | Department as user attribute in policy evaluation |
| Position-Based Access | ✅ Full | Position as user attribute in policy evaluation |
| Approval Workflows | ✅ Full | Can model approval as attribute-conditional actions |

**Pros:**
- Most flexible: any combination of attributes can control access
- Natural fit for "DOKTER can only approve results from their own department"
- Supports complex healthcare scenarios (time-based access, shift-based access)
- Future-proof for compliance requirements

**Cons:**
- Highest implementation complexity (~25-40 days)
- Policy management complexity: requires careful documentation and testing
- Performance: policy evaluation per request can be expensive
- Overkill for current system maturity — significant architectural leap
- Debugging access decisions is harder (multiple attribute conditions)
- Team must learn new authorization paradigm

---

## 3. Recommendation

### Selected Option: **B — Full RBAC**

### Justification

Option B (Full RBAC) is recommended based on the following rationale:

**1. Addresses the most critical gaps with proportional complexity:**
- Solves Gap 1 (Granular Permissions), Gap 2 (Role Hierarchy), and Gap 3 (Role Composition) — the three gaps that directly cause operational friction today
- Provides the foundation for Gap 4 (Department-Based Access) through the Department entity
- Enables position-based access (Gap 5) through a Position entity
- Option A leaves 4 of 6 gaps unaddressed; Option C is disproportionate to current system maturity

**2. Industry alignment for healthcare LIS:**
- NIST RBAC (SP 800-162) is the standard access control model for healthcare IT
- BPJS integration will likely require facility-level data isolation (addressed by Department entity)
- Regulatory audits (ISO 27001, Indonesian health data regulations) expect documented permission assignments — database-stored permissions provide this evidence trail

**3. Growth trajectory match:**
- Current system has 11 roles and 83 endpoints — relatively small but growing
- Multi-branch laboratory operations (a stated business goal per insurance readiness requirements) demand department-based scoping
- Runtime-configurable permissions mean each new branch/partner can be configured without code deployment

**4. Option A is insufficient because:**
- Single role per user remains a blocking limitation for multi-function staff
- Code-defined permissions require developer involvement for access changes
- Does not support the multi-branch data isolation requirement

**5. Option C is excessive because:**
- Current team maturity and system complexity do not justify ABAC overhead
- Policy engine adds significant debugging complexity
- Can migrate from B → C in future if attribute-based needs materialize (B is a stepping stone)

---

### Migration Path

#### Phase 1: Foundation (Weeks 1-2)

| Step | Action | Risk |
|------|--------|------|
| 1.1 | Create `Permission` table with `id`, `name` (e.g., `master-data:create`), `description`, `module` | Low — additive schema change |
| 1.2 | Create `RolePermission` junction table linking Role → Permission (many-to-many) | Low — additive |
| 1.3 | Seed existing role-endpoint mappings into `RolePermission` (replicate current behavior exactly) | Medium — must ensure no access regression |
| 1.4 | Create `PermissionGuard` that queries `RolePermission` for the user's role | Low — new guard, doesn't replace existing |
| 1.5 | Add `@RequirePermission()` decorator | Low — additive, opt-in |
| 1.6 | Deploy with **both** old `RolesGuard` and new `PermissionGuard` active (dual-write period) | Medium — both must agree for access |

**Phase 1 Rollback:** Drop new tables, remove new guard registration. Existing `@Roles` decorator continues working unchanged.

#### Phase 2: Multi-Role & Hierarchy (Weeks 3-4)

| Step | Action | Risk |
|------|--------|------|
| 2.1 | Create `UserRole` junction table (user_id, role_id) | Medium — migrates from `User.role` field |
| 2.2 | Add `parentRole` field to Role configuration for hierarchy | Low — configuration change |
| 2.3 | Migrate existing `User.role` data to `UserRole` entries | Medium — data migration, requires validation |
| 2.4 | Update `PermissionGuard` to resolve permissions from all user roles (union) | Medium — logic change in auth path |
| 2.5 | Deprecate but retain `User.role` field for backward compatibility during transition | Low |

**Phase 2 Rollback:** Revert `PermissionGuard` to single-role logic, `User.role` field still available.

#### Phase 3: Department & Position (Weeks 5-8)

| Step | Action | Risk |
|------|--------|------|
| 3.1 | Create `Department` entity (`id`, `name`, `code`, `parentDepartmentId`) | Low — additive |
| 3.2 | Create `UserDepartment` junction (user_id, department_id, is_primary) | Low — additive |
| 3.3 | Create `Position` entity (`id`, `name`, `level`, `department_id`) | Low — additive |
| 3.4 | Add data-scoping middleware that filters queries by user's department | High — affects all data queries |
| 3.5 | Create admin UI for department assignment and permission management | Medium — new feature |

**Phase 3 Rollback:** Remove data-scoping middleware, department/position entities remain but are unused.

---

### Impact Assessment

#### Affected Modules

| Module | Impact Level | Changes Required |
|--------|-------------|-----------------|
| `common/guards/` | High | New PermissionGuard, modification of guard pipeline |
| `common/decorators/` | Medium | New @RequirePermission decorator |
| `auth/` | Medium | JWT payload may include permissions; token refresh logic |
| `users/` | High | User CRUD must support multi-role assignment, department assignment |
| `laboratory/master-data/` | Medium | Endpoints migrated from @Roles to @RequirePermission |
| `laboratory/order/` | Medium | Data scoping by department in Phase 3 |
| `laboratory/patient/` | Medium | Data scoping by department in Phase 3 |
| `laboratory/lab-workflow/` | Medium | Data scoping by department in Phase 3 |
| `laboratory/dashboard/` | Low | Permission-based access to dashboard widgets |
| `laboratory/payment/` | Medium | Data scoping + potential approval workflow integration |
| Prisma Schema | High | 5+ new entities (Permission, RolePermission, UserRole, Department, Position, UserDepartment) |
| Frontend (apps/web) | Medium | Permission-aware UI (show/hide based on permissions, not just role) |

#### Estimated Effort

| Phase | Effort | Story Points |
|-------|--------|-------------|
| Phase 1: Foundation | 2 weeks (1 developer) | 13 SP |
| Phase 2: Multi-Role & Hierarchy | 2 weeks (1 developer) | 13 SP |
| Phase 3: Department & Position | 4 weeks (1-2 developers) | 21 SP |
| **Total** | **8 weeks** | **47 SP** |

#### Backward Compatibility

- **Phase 1**: 100% backward compatible. Existing `@Roles` decorator continues to function. New `@RequirePermission` is opt-in.
- **Phase 2**: `User.role` field is retained for existing code. New `UserRole` junction table provides the source of truth going forward.
- **Phase 3**: Data scoping changes read behavior — existing API contracts (request/response shapes) remain unchanged, but result sets may be filtered. This requires careful testing.

#### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Permission seed mismatch (Phase 1) | Medium | High | Automated test comparing old @Roles behavior vs new Permission behavior for all 83 endpoints |
| Performance regression from DB permission lookups | Low | Medium | Redis cache with 5-minute TTL for permission resolution; invalidate on assignment change |
| Multi-role permission conflicts | Low | Medium | Union semantics (user gets ALL permissions from ALL assigned roles); document conflict resolution |
| Department scoping breaks existing queries | Medium | High | Feature flag for data scoping; enable per-module incrementally |
| Frontend permission mismatch | Medium | Medium | Shared permission constants between backend and frontend; API endpoint to fetch current user's effective permissions |

---

## 4. Comparison with Identified Limitations

Cross-referencing with the 7 architectural limitations identified in `rbac-implementation-current.md` Section 5.2:

| # | Limitation | Resolved by Option B? | Phase |
|---|-----------|----------------------|-------|
| 1 | Single role per user | ✅ Yes — UserRole junction table | Phase 2 |
| 2 | No role hierarchy | ✅ Yes — parentRole relationship | Phase 2 |
| 3 | No permission granularity | ✅ Yes — Permission entity with action-level control | Phase 1 |
| 4 | No department/position context | ✅ Yes — Department + Position entities | Phase 3 |
| 5 | No data-level filtering | ✅ Yes — Department-based data scoping middleware | Phase 3 |
| 6 | MARKETING role unused | ⚠️ Partially — can assign specific permissions to MARKETING | Phase 1 |
| 7 | RolesGuard passes when no @Roles | ✅ Yes — PermissionGuard requires explicit permission; defaults to deny | Phase 1 |

---

## 5. Alternative Consideration: Phased Approach Starting with Option A

If immediate Full RBAC implementation is too costly, a pragmatic approach would be:

1. **Immediate (Sprint 1):** Implement Option A (Enhanced Role-Based) as a quick win — adds permission granularity and role hierarchy through code without database changes
2. **Short-term (Sprint 3-4):** Migrate to Option B foundation (Permission tables) — the code-defined permission map from Option A becomes the seed data for the database
3. **Medium-term (Sprint 6-8):** Add multi-role, department, and position capabilities

This hybrid approach allows immediate security improvement while planning for the full RBAC migration.

---

## 6. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/prisma/schema.prisma` | READ-ONLY | Verified User model and Role enum structure |
| `apps/api/src/common/guards/` | READ-ONLY | Referenced RolesGuard implementation logic |
| `docs/17-Audit/_inventory/rbac-implementation-current.md` | READ-ONLY | Used as primary input for this analysis |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Enterprise Access Control Capabilities Evaluation — Generated for Enterprise Admin Architecture Audit Task 7.2*
