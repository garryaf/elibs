# Approval Matrix Evaluation

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-APPROVAL |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document evaluates four critical business workflows to determine whether the current single-role guard mechanism is sufficient or whether multi-step approval chains are required. The analysis examines each workflow's current implementation, identifies risks, and provides recommendations.

**Validates: Requirement 5.5**

---

## 1. Summary of Findings

| # | Workflow | Current Mechanism | Multi-Step Approval Required? | Risk Level |
|---|----------|-------------------|-------------------------------|------------|
| 1 | Lab Result Verification (ANALIS→DOKTER) | Two-step state machine with role-separated endpoints | **No** — already implemented | Low |
| 2 | Financial Authorization (KASIR→MANAGER) | Single-role guard; no manager approval step | **Yes** — for refunds, voids, and high-value cancellations | High |
| 3 | Master Data Changes (ADMIN→SUPER_ADMIN) | Single-role guard; ADMIN or SUPER_ADMIN can modify immediately | **Recommended** — for critical data (Tariffs, Tests) | Medium |
| 4 | User Account Management (ADMIN→OWNER) | Single-role guard; ADMIN creates users, SUPER_ADMIN deletes | **Recommended** — for role elevation to ADMIN+ | Medium |

---

## 2. Workflow Analysis

### 2.1 Laboratory Result Verification (ANALIS → DOKTER)

#### Current Implementation

The lab workflow already implements a **proper two-step approval chain** enforced by both role guards and a state machine:

```
Step 1: ANALIS enters results
  → PUT /api/v1/lab/:orderId/results
  → @Roles(ANALIS, ADMIN)
  → Status: SAMPLE_COLLECTED → IN_ANALYSIS

Step 2: ANALIS verifies results
  → POST /api/v1/lab/:orderId/verify
  → @Roles(ANALIS, ADMIN)
  → Status: IN_ANALYSIS → VERIFIED

Step 3: DOKTER approves results
  → POST /api/v1/lab/:orderId/approve
  → @Roles(DOKTER, SUPER_ADMIN)
  → Status: VERIFIED → APPROVED
```

#### State Machine Enforcement

The `OrderStateMachineService` enforces valid transitions:

| From Status | Allowed Transitions |
|------------|-------------------|
| IN_ANALYSIS | VERIFIED only |
| VERIFIED | APPROVED or IN_ANALYSIS (rejection) |
| APPROVED | NOTIFIED only |

The state machine ensures:
- A DOKTER **cannot** approve without prior verification by ANALIS
- An ANALIS **cannot** approve — the `/approve` endpoint requires DOKTER or SUPER_ADMIN
- Rejection loops back to IN_ANALYSIS, requiring ANALIS re-verification

#### Auto-Approval Logic

The system includes an `autoApproveIfEligible()` method that bypasses doctor approval when **all tests** in the order have `requiresDoctorApproval = false`. This is a clinically valid optimization for routine tests.

#### Determination

| Criterion | Assessment |
|-----------|-----------|
| Is single-role guard sufficient? | N/A — already uses multi-step |
| Multi-step approval required? | **Already implemented** |
| Current risk if maintained? | **Low** — workflow is properly separated |

#### Observations

- **Strength**: Role separation + state machine = defense-in-depth
- **Strength**: `verifiedBy` and `approvedBy` fields provide audit trail
- **Strength**: Auto-approval is conditional and traceable
- **Gap**: ADMIN can both verify AND approve (present in both role lists). An ADMIN could technically self-approve. This violates the separation-of-duties principle for lab workflows, but may be acceptable as an override for urgent cases.
- **Recommendation**: Consider adding a business rule that `verifiedBy !== approvedBy` to prevent same-user verification+approval, even for ADMIN users.

---

### 2.2 Financial Transaction Authorization (KASIR → MANAGER)

#### Current Implementation

```
Payment Processing:
  → POST /api/v1/orders/:id/pay
  → @Roles(KASIR, ADMIN)
  → Effect: Immediate payment recorded; no approval required

Order Cancellation:
  → POST /api/v1/orders/:id/cancel
  → @Roles(KASIR, ADMIN, SUPER_ADMIN)
  → Effect: Immediate cancellation; no approval required
```

There is **no manager approval step** in the current financial workflow. A KASIR can:
1. Process any payment (regardless of amount) without authorization
2. Cancel any order without authorization
3. No maximum transaction limit enforcement

#### MANAGER Role Current Usage

The MANAGER role currently has access to **dashboard endpoints only** (5 endpoints). It has **zero** access to financial transaction endpoints (payment, order creation, order cancellation).

#### Determination

| Criterion | Assessment |
|-----------|-----------|
| Is single-role guard sufficient? | **No** — insufficient for enterprise financial controls |
| Multi-step approval required? | **Yes** — for refunds, voids, cancellations above threshold |
| Current risk if maintained? | **High** — financial fraud risk, no separation of duties |

#### Risk Analysis

| Risk | Severity | Description |
|------|----------|-------------|
| Unauthorized refund | Critical | KASIR could cancel paid orders, effectively issuing a refund without oversight |
| High-value payment error | High | No limit check; a typo in amount has no second approval |
| Missing audit trail for cancellations | High | While `cancelledBy` is recorded, there's no pre-authorization step |
| MANAGER role is decorative | Medium | MANAGER has no financial authority despite the role name implying operational management |

#### Recommended Approval Chain

```
Tier 1 (Immediate — no approval needed):
  - Process payment ≤ threshold amount (e.g., ≤ Rp 5.000.000)
  - Cancel PENDING_PAYMENT orders (no financial impact)

Tier 2 (Requires MANAGER approval):
  - Process payment > threshold amount
  - Cancel PAID orders (triggers refund)
  - Process manual price overrides

Tier 3 (Requires OWNER/SUPER_ADMIN approval):
  - Bulk cancellations (> 5 orders in 24h)
  - Payment method corrections on completed orders
  - Void completed transactions
```

---

### 2.3 Master Data Changes (ADMIN → SUPER_ADMIN)

#### Current Implementation

```
All Master Data CUD Operations:
  → POST/PUT/DELETE /api/v1/master/*
  → @Roles(ADMIN, SUPER_ADMIN)
  → Effect: Immediate change; no approval required
```

All master data endpoints (40 CUD endpoints covering Test Categories, Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units) follow the same pattern:
- ADMIN **or** SUPER_ADMIN can create, update, or delete
- Changes take **immediate effect** with no review step
- No versioning, no pending state, no rollback mechanism

#### Impact Classification of Master Data Entities

| Entity | Change Impact | Referenced By | Risk of Immediate Change |
|--------|--------------|---------------|-------------------------|
| **Tariffs** | Financial — affects billing | Orders, Invoices, Insurance claims | **High** — incorrect tariff = incorrect billing |
| **Lab Tests** | Clinical — affects result interpretation | Orders, Reference Values, Panels | **High** — changing reference ranges affects clinical decisions |
| **Panels** | Clinical — affects test grouping | Orders | Medium — panels are convenience groupings |
| **Test Categories** | Organizational — affects navigation | Tests | Low — no clinical/financial impact |
| **Doctors** | Operational — affects result routing | Orders, Approval Queue | Medium — incorrect doctor data delays approvals |
| **Clinics** | Operational — affects partner relations | Orders | Low — reference data |
| **Insurance** | Financial — affects claim processing | Orders, Tariffs, Claims | **High** — incorrect insurance data = claim rejections |
| **Equipment** | Operational — affects lab scheduling | None currently | Low — informational only |
| **Reagents** | Operational — affects stock tracking | None currently | Low — informational only |
| **Sample Types** | Clinical — affects collection protocols | Tests | Low — primarily informational |
| **Measurement Units** | Clinical — affects result display | Tests, Results | Medium — wrong unit = misinterpreted results |

#### Determination

| Criterion | Assessment |
|-----------|-----------|
| Is single-role guard sufficient? | **Partially** — acceptable for low-impact entities |
| Multi-step approval required? | **Recommended** — for high-impact entities (Tariffs, Lab Tests, Insurance) |
| Current risk if maintained? | **Medium** — data integrity risk for financial and clinical entities |

#### Risk Analysis

| Risk | Severity | Description |
|------|----------|-------------|
| Incorrect tariff pricing | High | ADMIN changes tariff → immediately affects all new orders → billing errors |
| Reference range modification | High | ADMIN modifies lab test normal ranges → affects result flagging → clinical risk |
| Accidental deletion | Medium | Soft-delete is implemented, but no recovery workflow exists for ADMIN |
| No change history | Medium | No versioning means previous values are lost on update |
| Insurance data corruption | High | Incorrect insurance type/code → BPJS claim rejections |

#### Recommended Approval Chain

```
Tier 1 (Immediate — ADMIN can change without approval):
  - Equipment, Reagents, Sample Types, Test Categories
  - Clinics (informational updates only)
  - Doctors (informational updates only)

Tier 2 (Requires SUPER_ADMIN approval):
  - Tariff creation or price modification
  - Lab Test reference range modification
  - Insurance entity creation/modification
  - Measurement Unit changes
  - Panel composition changes

Tier 3 (No approval needed, but with audit notification):
  - All soft-deletes (notify SUPER_ADMIN asynchronously)
```

---

### 2.4 User Account Management (ADMIN → OWNER)

#### Current Implementation

```
User Creation:
  → POST /api/v1/users
  → @Roles(ADMIN, SUPER_ADMIN)
  → Effect: Immediate user creation with any role

User Update:
  → PUT /api/v1/users/:id
  → @Roles(ADMIN, SUPER_ADMIN)
  → Effect: Immediate update including role change

User Deletion:
  → DELETE /api/v1/users/:id
  → @Roles(SUPER_ADMIN)
  → Effect: Immediate soft-delete
```

Key observations:
- An **ADMIN can create users with ANY role**, including SUPER_ADMIN (no elevation check in code)
- An **ADMIN can change any user's role** to any value, including elevating to SUPER_ADMIN
- **OWNER role** has zero involvement in user management (only sees dashboards)
- Deletion is restricted to SUPER_ADMIN only — this is the only protective measure

#### Determination

| Criterion | Assessment |
|-----------|-----------|
| Is single-role guard sufficient? | **No** — privilege escalation vulnerability exists |
| Multi-step approval required? | **Yes** — for role elevations to ADMIN or above |
| Current risk if maintained? | **Medium-High** — ADMIN can create/elevate users to SUPER_ADMIN without oversight |

#### Risk Analysis

| Risk | Severity | Description |
|------|----------|-------------|
| Privilege escalation | Critical | ADMIN creates user with SUPER_ADMIN role → full system access without OWNER knowledge |
| Role inflation | High | ADMIN elevates their own second account → bypasses delete restriction |
| No OWNER visibility | Medium | Business owner has no oversight over who has admin access |
| No role change audit notification | Medium | Role changes happen silently — no notification to affected user or OWNER |

#### Recommended Approval Chain

```
Tier 1 (Immediate — ADMIN can create without approval):
  - Create users with roles: KASIR, SAMPLING, ANALIS, CS, MARKETING, KLINIK_PARTNER
  - Update non-role fields (name, email, password reset)
  - Deactivate (soft-delete) non-admin users

Tier 2 (Requires SUPER_ADMIN approval):
  - Create users with roles: DOKTER, MANAGER, ADMIN
  - Elevate existing user's role to DOKTER, MANAGER, or ADMIN
  - Reactivate deleted users

Tier 3 (Requires OWNER approval):
  - Create users with roles: SUPER_ADMIN, OWNER
  - Elevate existing user's role to SUPER_ADMIN or OWNER
  - Delete ADMIN or SUPER_ADMIN users
```

---

## 3. Cross-Workflow Summary

### 3.1 Current State vs. Enterprise Requirements

| Capability | Lab Workflow | Financial | Master Data | User Management |
|-----------|-------------|-----------|-------------|-----------------|
| Multi-step approval | ✅ Implemented | ❌ Missing | ❌ Missing | ❌ Missing |
| State machine enforcement | ✅ OrderStateMachine | ❌ None | ❌ None | ❌ None |
| Separation of duties | ⚠️ ADMIN bypass | ❌ None | ❌ None | ❌ None |
| Threshold-based routing | ✅ requiresDoctorApproval | ❌ None | ❌ None | ❌ None |
| Audit trail (who approved) | ✅ approvedBy field | ⚠️ cancelledBy only | ❌ No change log | ❌ No approval record |
| Rejection/revision loop | ✅ VERIFIED→IN_ANALYSIS | ❌ None | ❌ None | ❌ None |

### 3.2 Priority Assessment

| Workflow | Approval Chain Priority | Justification |
|----------|------------------------|---------------|
| Financial Authorization | **P1 — Must Have** | Direct financial fraud risk; no compensating controls |
| User Account Management | **P1 — Must Have** | Privilege escalation enables bypass of all other controls |
| Master Data (High-Impact) | **P2 — Should Have** | Clinical and financial data integrity risk |
| Lab Result Verification | **P4 — Won't Have** | Already implemented; only minor enhancement needed |

---

## 4. Recommended Architecture for Approval Matrix

### 4.1 Proposed Schema (Documentation Only — No Code Modification)

```prisma
// Proposed schema addition for approval workflows
model ApprovalRequest {
  id              String           @id @default(uuid()) @db.Uuid
  workflowType    ApprovalWorkflow
  entityType      String           // "Order", "User", "MasterData"
  entityId        String           @db.Uuid
  requestedAction String           // "cancel", "create", "elevate_role"
  requestedBy     String           @db.Uuid
  requestedAt     DateTime         @default(now())
  currentTier     Int              @default(1)
  status          ApprovalStatus   @default(PENDING)
  metadata        Json?            // Action-specific data (amount, role, etc.)
  
  approvalSteps   ApprovalStep[]
  requester       User             @relation("approval_requester", fields: [requestedBy], references: [id])
}

model ApprovalStep {
  id              String         @id @default(uuid()) @db.Uuid
  requestId       String         @db.Uuid
  stepOrder       Int
  requiredRole    Role
  decidedBy       String?        @db.Uuid
  decision        ApprovalDecision?
  decidedAt       DateTime?
  reason          String?
  
  request         ApprovalRequest @relation(fields: [requestId], references: [id])
  decider         User?           @relation("approval_decider", fields: [decidedBy], references: [id])
}

enum ApprovalWorkflow {
  FINANCIAL_CANCELLATION
  FINANCIAL_HIGH_VALUE
  MASTER_DATA_CRITICAL
  USER_ROLE_ELEVATION
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}

enum ApprovalDecision {
  APPROVE
  REJECT
}
```

### 4.2 Integration Pattern

The approval matrix should follow the same pattern as the existing lab workflow:
1. **Guard layer** — validates the user can *initiate* the request
2. **Business logic** — determines if approval is required based on tier rules
3. **State machine** — enforces valid transitions (PENDING → APPROVED/REJECTED)
4. **Notification** — alerts the approver when a request is pending
5. **Execution** — applies the action only after approval is granted

### 4.3 Implementation Effort Estimate

| Component | Effort | Story Points |
|-----------|--------|-------------|
| ApprovalRequest/ApprovalStep entities + migration | M | 5 |
| Approval service (create, decide, expire) | M | 5 |
| Financial threshold configuration | S | 2 |
| User role elevation guard | S | 3 |
| Master data critical entity detection | S | 2 |
| Notification integration (approval pending alerts) | M | 5 |
| API endpoints for approval management | M | 5 |
| Frontend approval queue UI | L | 8 |
| **Total** | | **35 SP** |

---

## 5. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/src/laboratory/lab-workflow/` | READ-ONLY | Read controller, service, and state machine to analyze lab approval flow |
| `apps/api/src/laboratory/order/` | READ-ONLY | Read OrderController for cancellation guard analysis |
| `apps/api/src/laboratory/payment/` | READ-ONLY | Read PaymentController for payment processing guards |
| `apps/api/src/users/` | READ-ONLY | Read UsersController for user management guards |
| `apps/api/src/laboratory/master-data/` | READ-ONLY | Read MasterDataController for master data guard patterns |
| `apps/api/prisma/schema.prisma` | READ-ONLY | Read OrderStatus enum and model fields for state analysis |
| `docs/17-Audit/_inventory/rbac-implementation-current.md` | READ-ONLY | Referenced endpoint-to-role mapping |
| `docs/17-Audit/_inventory/` | READ + WRITE | Wrote this documentation |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Approval Matrix Evaluation — Generated for Enterprise Admin Architecture Audit Task 7.4*
