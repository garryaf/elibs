---
Document ID: AUDIT-eLIS-2026-005
Version: 1.0
Date: 2026-07-09
Author: Enterprise Architect
Classification: Internal
Status: Draft
---

# Healthcare & Insurance Readiness Review

## Executive Summary

This document assesses the eLIS system's readiness to support enterprise healthcare payment flows including BPJS, Private Insurance, Corporate Insurance, Cash, and Self Pay. The review covers database schema support, billing workflows, payment flow capabilities, and laboratory workflow integration with insurance-specific rules.

**Overall Readiness: 25% — NOT READY for enterprise healthcare operations.**

| Domain | Readiness | Critical Gaps |
|--------|-----------|---------------|
| Insurance Schema | 40% | Type enum constraint missing, M2M relationships absent |
| Billing Workflow | 20% | No claim reference, BPJS entirely absent, no batch invoicing |
| Payment Flow | 10% | No split payment, no rejection handling, no multi-insurance |
| Lab Workflow Integration | 35% | No pre-auth flag, no claim tracking, no insurance reporting |
| Receipt & Reporting | 5% | No insurance-specific receipts, no payer analytics |

**Total Gaps Identified:** 15
**Estimated Total Remediation Effort:** 98–128 person-days

---

## Table of Contents

1. [Insurance Schema Assessment](#1-insurance-schema-assessment)
2. [Billing Workflow Assessment](#2-billing-workflow-assessment)
3. [Payment Flow Assessment](#3-payment-flow-assessment)
4. [Laboratory Workflow Insurance Rules](#4-laboratory-workflow-insurance-rules)
5. [PaymentMethod Enum Analysis](#5-paymentmethod-enum-analysis)
6. [Gap Analysis Summary](#6-gap-analysis-summary)
7. [Functional Requirements (EARS Format)](#7-functional-requirements-ears-format)
8. [Implementation Recommendations](#8-implementation-recommendations)
9. [Evidence & Methodology](#9-evidence--methodology)
10. [No-Code-Modification Attestation](#10-no-code-modification-attestation)

---

## 1. Insurance Schema Assessment

**Source:** `apps/api/prisma/schema.prisma`

### 1.1 Insurance Model — Type Field

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `type` field exists | ✅ EXISTS | `type String?` on Insurance model |
| Constrained to BPJS/Swasta/Corporate | ❌ MISSING | Free-text nullable String — no enum or validation |
| DTO validation for type values | ❌ MISSING | `@IsOptional() @IsString()` only — no `@IsIn()` |

**Gap Severity:** Medium — data integrity risk from unconstrained type values.

### 1.2 Patient-Insurance Relationship

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Patient links to Insurance | ✅ EXISTS | `Patient.insuranceId` FK to Insurance |
| Supports multiple insurance (1-5) | ❌ MISSING | Single nullable FK allows 0 or 1 only |
| Primary/secondary designation | ❌ MISSING | No priority field or junction table |
| M2M junction table | ❌ MISSING | No `PatientInsurance` entity |

**Gap Severity:** High — blocks multi-payer patient registration.

### 1.3 Order-Insurance Relationship

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Order links to Insurance | ✅ EXISTS | `Order.insuranceId` FK to Insurance |
| Max 2 providers (primary/secondary) | ❌ MISSING | Single FK supports only 1 provider |
| Claim reference number (≤50 chars) | ❌ MISSING | No `claimReference` field on Order |
| Coverage amount tracking | ❌ MISSING | No `coveredAmount` or `patientAmount` |

**Gap Severity:** High — blocks primary/secondary coverage workflows.

### 1.4 Tariff-Insurance Relationship

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Differential pricing per test-insurance | ✅ EXISTS | `Tariff` with `[testId, clinicId, insuranceId]` unique constraint |
| Priority-based resolution | ✅ EXISTS | `TariffResolverService` with 5-level cascade |
| Insurance discount | ✅ EXISTS | `Tariff.discount` (Decimal 5,2) |

**Gap Severity:** None — fully implemented.

---

## 2. Billing Workflow Assessment

### 2.1 Cash Payment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Direct pay at POS | ✅ EXISTS | `POST /api/v1/orders/:id/pay` with `PaymentMethod.CASH` |
| No insurance reference required | ✅ EXISTS | `insuranceId` optional on Order |
| Payment amount tracking | ✅ EXISTS | `Order.amountPaid` stored |

**Status:** Functional — no gaps.

### 2.2 Insurance Claim Processing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Insurance reference on Order | ✅ EXISTS | `Order.insuranceId` FK |
| Claim reference number (≤50 chars) | ❌ MISSING | No field; searched entire codebase |
| Claim status tracking | ❌ MISSING | No `ClaimStatus` enum or lifecycle |
| Insurance coverage amount vs copay | ❌ MISSING | Single `amountPaid` — no split tracking |

**Gap Severity:** High — insurance claims cannot be tracked or reconciled.

### 2.3 BPJS Integration Readiness

| Criterion | Status | Evidence |
|-----------|--------|----------|
| SEP number field (≤19 chars) | ❌ MISSING | No `sepNumber` in schema or DTOs |
| BPJS verification status | ❌ MISSING | No verification field |
| Referring facility code | ❌ MISSING | No facility code field |
| BPJS class level (1/2/3) | ❌ MISSING | No class level field |
| BPJS API integration | ❌ MISSING | No external integration module |

**Gap Severity:** Critical — BPJS is Indonesia's national health insurance; entirely absent.

### 2.4 Corporate Batch Invoicing

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Batch invoice generation | ❌ MISSING | No batch invoice entity or endpoint |
| Grouping ≤500 orders per cycle | ❌ MISSING | No cycle management |
| Invoice lifecycle (draft/sent/paid) | ❌ MISSING | No batch status tracking |
| Deferred payment/AR tracking | ❌ MISSING | Payment is immediate per-order |

**Gap Severity:** High — corporate clients cannot be billed in batch.

---

## 3. Payment Flow Assessment

### 3.1 Split Payment Support

**Requirement (6.5):** Partial insurance coverage + partial cash payment where sum of all payment components equals the order total.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Multiple payment components per order | ❌ MISSING | Single `paymentMethod` + `amountPaid` on Order |
| Payment composition model | ❌ MISSING | No `PaymentComponent` or `PaymentLine` entity |
| Sum validation (components = total) | ❌ MISSING | No split amount validation logic |
| Partial insurance + partial cash | ❌ MISSING | One payment method per order only |
| Payment allocation tracking | ❌ MISSING | Cannot track "X from insurance, Y from cash" |

**Current Implementation:**
```typescript
// ProcessPaymentDto — single payment method, single amount
@IsEnum(PaymentMethod)
paymentMethod: PaymentMethod;  // Only ONE method per order

@IsNumber()
@Min(0)
amountPaid: number;  // Single amount — no composition
```

**Gap Severity:** High — prevents mixed insurance/cash payments common in healthcare.

### 3.2 Insurance Rejection Handling (72-Hour Cash Fallback)

**Requirement (6.5):** When a claim is denied, trigger status change and prompt patient to pay remaining balance via cash or transfer within 72 hours.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Claim status tracking (approved/denied) | ❌ MISSING | No claim status on Order |
| Rejection event trigger | ❌ MISSING | No event system for claim denial |
| Status change on denial | ❌ MISSING | No `CLAIM_REJECTED` or equivalent OrderStatus |
| 72-hour payment window enforcement | ❌ MISSING | No time-bound payment logic |
| Patient notification on rejection | ❌ MISSING | No rejection notification template |
| Fallback payment recording | ❌ MISSING | No traceability of original claim attempt |
| Cash fallback audit trail | ❌ MISSING | No link between rejected claim and cash payment |

**Current Implementation:**
- `OrderStatus` enum: `PENDING_PAYMENT | PAID | SAMPLE_COLLECTED | IN_ANALYSIS | VERIFIED | APPROVED | NOTIFIED | CANCELLED`
- No claim-related statuses exist
- No time-based enforcement or scheduler for overdue payments

**Gap Severity:** Critical — insurance rejections cannot be handled; patients have no fallback path.

### 3.3 Multiple Insurance per Patient (Primary/Secondary)

**Requirement (6.5):** Support multiple insurance coverage per patient with primary and secondary designation.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Multiple insurance per patient | ❌ MISSING | `Patient.insuranceId` single FK (0-1 only) |
| Primary/secondary designation | ❌ MISSING | No priority or coverage type field |
| Coverage coordination (COB) | ❌ MISSING | No coordination of benefits logic |
| Primary exhaustion → secondary trigger | ❌ MISSING | No cascading coverage workflow |
| Patient insurance history | ❌ MISSING | No audit trail of insurance assignments |

**Gap Severity:** High — many patients have dual coverage (e.g., BPJS + corporate supplement).

### 3.4 Insurance-Specific Receipt Formats

**Requirement (6.5):** Receipts must include insurance name, claim reference number, and covered vs patient-responsible amounts.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Receipt generation endpoint | ⚠️ PARTIAL | `GET /api/v1/orders/:id/invoice` returns order data |
| Insurance name on receipt | ❌ MISSING | Invoice does not include insurance relation |
| Claim reference on receipt | ❌ MISSING | No claim reference field exists |
| Covered amount (insurance portion) | ❌ MISSING | No split between covered and patient amounts |
| Patient-responsible amount | ❌ MISSING | Only `totalAmount` and `amountPaid` exist |
| Distinct receipt templates by payer type | ❌ MISSING | Single `getInvoice()` returns raw order data |
| PDF/printable receipt generation | ❌ MISSING | No receipt formatting service |

**Current Implementation:**
```typescript
// PaymentService.getInvoice() — returns raw order, no insurance formatting
async getInvoice(orderId: string) {
  return this.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      patient: true,
      orderDetails: { include: { test: true } },
      // NOTE: insurance relation NOT included
    },
  });
}
```

**Gap Severity:** High — insurance receipts are a regulatory requirement for reimbursement.

---

## 4. Laboratory Workflow Insurance Rules

### 4.1 Pre-Authorization Flag

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `requiresInsurancePreAuth` on TestMaster | ❌ MISSING | Only `requiresDoctorApproval` exists |
| Pre-auth check in order creation | ❌ MISSING | No blocking logic |
| Pre-auth status tracking | ❌ MISSING | No field for pre-auth result |

**Gap Severity:** High — high-cost tests processed without insurance approval risk claim rejection.

### 4.2 Insurance Tariff Price Override

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Insurance-specific pricing | ✅ EXISTS | `TariffResolverService` with 5-level cascade |
| Tariff effective date range | ❌ MISSING | No `effectiveFrom`/`effectiveTo` |
| INA-CBG code mapping (BPJS) | ❌ MISSING | No BPJS tariff code system |

**Status:** Core functionality implemented. Temporal and BPJS-specific extensions missing.

### 4.3 Claim Number Generation & Tracking

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Auto-generated claim reference | ❌ MISSING | Only `orderNumber` generator exists |
| Claim lifecycle (submitted→approved→paid) | ❌ MISSING | No claim entity |
| Per-insurance claim sequence | ❌ MISSING | No per-provider numbering |
| Claim audit trail | ❌ MISSING | No claim history in AuditLog |

**Gap Severity:** High — cannot reconcile payments with insurance providers.

### 4.4 Insurance-Specific Reporting

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Filter by insurance type | ❌ MISSING | `OrderQueryDto` has no insurance filter |
| Revenue by payer breakdown | ❌ MISSING | Dashboard aggregates total only |
| Outstanding claims aging | ❌ MISSING | No claim data to report |
| BPJS-specific reports | ❌ MISSING | No BPJS data |
| Corporate billing summary | ❌ MISSING | No batch invoice data |

**Gap Severity:** Medium — operational visibility and regulatory compliance affected.

---

## 5. PaymentMethod Enum Analysis

### 5.1 Current State

```prisma
enum PaymentMethod {
  CASH       // Patient-initiated cash payment
  TRANSFER   // Bank transfer
  INSURANCE  // Insurance-covered payment
}
```

**Frontend type (misaligned):**
```typescript
export type PaymentMethod = "CASH" | "TRANSFER" | "EDC";
// Note: Frontend uses "EDC" instead of "INSURANCE" — inconsistency detected
```

### 5.2 Self-Pay vs Insurance-Covered Cash Distinction

**Requirement (6.7):** The system SHALL differentiate between patient-initiated cash payment and insurance-rejection fallback payment, preserving audit traceability of the original insurance claim attempt.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Self-Pay (patient chose cash) | ⚠️ PARTIAL | `CASH` covers this but is ambiguous |
| Insurance-Rejection Fallback Cash | ❌ MISSING | No distinct value; no claim link |
| Audit trail of original claim attempt | ❌ MISSING | No mechanism to trace "was insurance, now cash" |
| Payment reason/context field | ❌ MISSING | Only `notes` (optional free text) |
| Backend-Frontend enum alignment | ❌ MISSING | Backend: `INSURANCE`, Frontend: `EDC` |

**Gap Severity:** Medium — audit traceability and financial reconciliation impacted.

### 5.3 Recommended PaymentMethod Enum Extension

```prisma
enum PaymentMethod {
  CASH                    // Patient-initiated cash at POS
  TRANSFER                // Bank transfer
  INSURANCE               // Insurance-covered (claim submitted)
  INSURANCE_CASH_FALLBACK // Cash payment after insurance rejection (traceable)
  EDC                     // Electronic Data Capture (card payment)
  CORPORATE_DEFERRED      // Corporate batch billing (deferred)
}
```

This preserves backward compatibility (existing values unchanged) while adding:
- `INSURANCE_CASH_FALLBACK`: Distinguishes patient-initiated cash from insurance-rejection fallback, linking to the original rejected claim for audit purposes
- `EDC`: Aligns with frontend usage (currently frontend uses "EDC" but backend only has CASH/TRANSFER/INSURANCE)
- `CORPORATE_DEFERRED`: Supports deferred corporate billing cycles

---

## 6. Gap Analysis Summary

### 6.1 Payment Flow Gap Matrix

| Gap ID | Capability | Required By | Current State | Severity | Priority |
|--------|-----------|-------------|---------------|----------|----------|
| INS-PAY-001 | Split Payment (insurance + cash composition) | Req 6.5 | Not Implemented — single payment method per order | High | P1 |
| INS-PAY-002 | Insurance Rejection → 72hr Cash Fallback | Req 6.5 | Not Implemented — no claim status or time enforcement | Critical | P1 |
| INS-PAY-003 | Multiple Insurance per Patient (primary/secondary) | Req 6.5 | Not Implemented — single FK only | High | P1 |
| INS-PAY-004 | Insurance-Specific Receipt Formats | Req 6.5 | Not Implemented — raw order data only, no formatting | High | P2 |
| INS-PAY-005 | Self-Pay vs Insurance-Cash Fallback Distinction | Req 6.7 | Not Implemented — ambiguous CASH enum value | Medium | P2 |
| INS-PAY-006 | Backend-Frontend PaymentMethod Alignment | Req 6.7 | Inconsistent — INSURANCE vs EDC mismatch | Medium | P2 |

### 6.2 Schema Gap Matrix (from Task 8.1)

| Gap ID | Capability | Current State | Severity | Priority |
|--------|-----------|---------------|----------|----------|
| INS-SCH-001 | InsuranceType enum constraint | Free-text String? | Medium | P2 |
| INS-SCH-002 | Patient-Insurance M2M (1-5 per patient) | Single FK (0-1) | High | P1 |
| INS-SCH-003 | Order-Insurance M2M (primary/secondary) | Single FK (0-1) | High | P1 |

### 6.3 Billing Workflow Gap Matrix (from Task 8.2)

| Gap ID | Capability | Current State | Severity | Priority |
|--------|-----------|---------------|----------|----------|
| INS-BIL-001 | Insurance Claim Reference (≤50 chars) | Not Implemented | High | P1 |
| INS-BIL-002 | BPJS Fields (SEP, verification, facility, class) | Entirely Absent | Critical | P1 |
| INS-BIL-003 | Corporate Batch Invoicing (≤500 orders/cycle) | Entirely Absent | High | P2 |
| INS-BIL-004 | Pre-Authorization Flag on TestMaster | Not Implemented | High | P2 |
| INS-BIL-005 | Claim Number Generation & Tracking | Entirely Absent | High | P1 |
| INS-BIL-006 | Insurance-Specific Reporting | Not Implemented | Medium | P3 |

### 6.4 Consolidated Severity Summary

| Severity | Count | Examples |
|----------|-------|---------|
| Critical | 2 | BPJS fields absent, Insurance rejection handling absent |
| High | 9 | Split payment, multi-insurance, claim reference, receipts, batch invoicing |
| Medium | 4 | InsuranceType enum, Self-Pay distinction, enum alignment, reporting |
| Low | 0 | — |
| **Total** | **15** | |

---

## 7. Functional Requirements (EARS Format)

### FR-INS-001: Split Payment Composition

**Gap Reference:** INS-PAY-001

> WHEN a patient's order involves partial insurance coverage, THE system SHALL accept multiple payment components per order where each component specifies a payment method, an amount, and an optional insurance reference, AND the system SHALL validate that the sum of all payment component amounts equals the order total amount before transitioning the order to PAID status.

**Acceptance Criteria:**
1. The system accepts an array of payment components in the payment request
2. Each component contains: `paymentMethod`, `amount`, and optional `insuranceId`
3. The system rejects payment if `sum(component.amount) ≠ order.totalAmount`
4. The system records each component as a separate `PaymentComponent` record linked to the order
5. The order transitions to PAID only when all components are recorded and validated

### FR-INS-002: Insurance Rejection with 72-Hour Cash Fallback

**Gap Reference:** INS-PAY-002

> WHEN an insurance claim associated with an order is denied, THE system SHALL change the order's claim status to REJECTED, record the rejection reason and timestamp, notify the patient via the configured notification channel, AND enforce a 72-hour payment window within which the patient must complete payment via CASH or TRANSFER. IF the 72-hour window expires without payment, THEN the system SHALL transition the order status to PAYMENT_OVERDUE and alert the KASIR role.

**Acceptance Criteria:**
1. Claim denial triggers status change from `PENDING` to `REJECTED` on the order-insurance record
2. The system records rejection reason (free text, up to 500 chars) and rejection timestamp
3. A notification is dispatched to the patient within 5 minutes of rejection
4. A 72-hour countdown begins from the rejection timestamp
5. If cash/transfer payment is received within 72 hours, order proceeds with `PaymentMethod.INSURANCE_CASH_FALLBACK`
6. If 72 hours elapse without payment, order status changes to `PAYMENT_OVERDUE`
7. The original claim attempt is preserved in audit trail, linked to the fallback payment

### FR-INS-003: Multiple Insurance per Patient (Primary/Secondary)

**Gap Reference:** INS-PAY-003

> THE system SHALL support associating between 1 and 5 insurance records per patient, where each association includes a priority designation (PRIMARY, SECONDARY, TERTIARY, etc.) and a member number. WHEN creating an order for a patient with multiple insurance records, THE system SHALL allow the operator to select up to 2 insurance providers for that order with primary/secondary designation.

**Acceptance Criteria:**
1. A `PatientInsurance` junction entity exists with: patientId, insuranceId, priority (1-5), memberNumber, validFrom, validUntil, isActive
2. A patient can have at most 5 active insurance associations
3. An `OrderInsurance` junction entity exists with: orderId, insuranceId, coverage (PRIMARY/SECONDARY), claimReference, coveredAmount, status
4. An order can have at most 2 insurance associations
5. Primary insurance is billed first; secondary is billed for remaining balance
6. The system prevents duplicate insurance assignments (same insurer twice on same patient/order)

### FR-INS-004: Insurance-Specific Receipt Formats

**Gap Reference:** INS-PAY-004

> WHEN generating a receipt for an order that involves insurance payment, THE system SHALL produce a receipt that includes: the insurance provider name, the claim reference number, the total order amount, the insurance-covered amount, the patient-responsible amount, and the payment method used for the patient portion. IF the order has no insurance involvement, THEN THE system SHALL produce a standard cash/transfer receipt without insurance fields.

**Acceptance Criteria:**
1. Receipt generation endpoint returns formatted receipt data (not raw order)
2. Insurance receipt includes: insurer name, claim reference, covered amount, patient amount
3. Cash receipt includes: patient name, order details, total amount, payment method
4. Receipt data supports PDF generation (structured template data)
5. The system selects receipt format based on whether `order.insuranceId` is present
6. Receipt includes all order detail line items with per-item pricing

### FR-INS-005: Self-Pay vs Insurance-Rejection Fallback Distinction

**Gap Reference:** INS-PAY-005

> THE system SHALL distinguish between a patient who voluntarily pays cash (Self Pay) and a patient who pays cash as a result of insurance claim rejection (Insurance Cash Fallback). WHEN recording a fallback payment, THE system SHALL preserve a reference to the original rejected insurance claim, enabling audit traceability from the fallback payment back to the original claim attempt.

**Acceptance Criteria:**
1. `PaymentMethod` enum includes `INSURANCE_CASH_FALLBACK` as a distinct value
2. When `INSURANCE_CASH_FALLBACK` is used, a reference to the original rejected claim is required
3. Reports can filter payments by: true self-pay (CASH with no prior claim), fallback cash (INSURANCE_CASH_FALLBACK with linked claim)
4. Financial reconciliation reports distinguish voluntary cash from forced-fallback cash
5. The original claim attempt data is never deleted, only status-changed to REJECTED

### FR-INS-006: Backend-Frontend PaymentMethod Alignment

**Gap Reference:** INS-PAY-006

> THE system SHALL maintain a single source of truth for payment method values, ensuring the backend enum and frontend type definition reference identical values. WHEN the PaymentMethod enum is extended, THE system SHALL update both backend (Prisma enum) and frontend (TypeScript type) definitions in the same release.

**Acceptance Criteria:**
1. Backend `PaymentMethod` enum and frontend `PaymentMethod` type contain identical values
2. A shared constant or generated type ensures compile-time alignment
3. The current mismatch (backend `INSURANCE` vs frontend `EDC`) is resolved
4. Frontend type includes: CASH, TRANSFER, INSURANCE, EDC, INSURANCE_CASH_FALLBACK, CORPORATE_DEFERRED

---

## 8. Implementation Recommendations

### 8.1 Priority Classification

| Priority | Definition | Payment Flow Gaps |
|----------|-----------|-------------------|
| P1 (Must Have) | Blocks production use or core workflow | INS-PAY-001, INS-PAY-002, INS-PAY-003 |
| P2 (Should Have) | Degrades core experience | INS-PAY-004, INS-PAY-005, INS-PAY-006 |
| P3 (Could Have) | Improves usability | INS-BIL-006 (reporting) |
| P4 (Won't Have) | Deferred | — |

### 8.2 Implementation Recommendations by Gap

#### REC-001: Split Payment Composition Model

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-PAY-001 |
| **Priority** | Critical |
| **Effort** | 12-15 person-days |
| **Affected Components** | Order model, PaymentService, ProcessPaymentDto, PaymentController, frontend payment form |

**Recommendation:**
1. Create `PaymentComponent` entity: `{ id, orderId, paymentMethod, amount, insuranceId?, reference?, createdAt }`
2. Modify `processPayment()` to accept an array of components instead of single method/amount
3. Add sum validation: `SUM(components.amount) === order.totalAmount`
4. Retain backward compatibility: single-component payments still work as before
5. Update frontend payment form to support "Add Payment Method" for split scenarios

**Migration Strategy:** Additive — new `PaymentComponent` table, existing `Order.paymentMethod` and `Order.amountPaid` preserved for backward compatibility during transition.

---

#### REC-002: Insurance Rejection & 72-Hour Fallback Workflow

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-PAY-002 |
| **Priority** | Critical |
| **Effort** | 15-20 person-days |
| **Affected Components** | OrderInsurance entity (new), OrderStatus enum, NotificationService, scheduled task runner, PaymentService |

**Recommendation:**
1. Add `ClaimStatus` enum: `PENDING | SUBMITTED | APPROVED | REJECTED | PAID`
2. Add `OrderInsurance` junction with `claimStatus`, `rejectionReason`, `rejectedAt` fields
3. Implement rejection handler: on REJECTED → notify patient → start 72hr timer
4. Add `PAYMENT_OVERDUE` to OrderStatus enum for expired fallback windows
5. Implement scheduled job (cron) to check overdue orders every hour
6. Add `INSURANCE_CASH_FALLBACK` to PaymentMethod enum with claim reference link

**Migration Strategy:** Requires new entities (`OrderInsurance`, `ClaimStatus`), new OrderStatus value, and a background scheduler. Deploy in phases: schema first, then rejection handler, then timer enforcement.

---

#### REC-003: Multiple Insurance per Patient (M2M)

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-PAY-003, INS-SCH-002, INS-SCH-003 |
| **Priority** | Critical |
| **Effort** | 18-22 person-days |
| **Affected Components** | Patient model, Order model, new PatientInsurance & OrderInsurance entities, PatientService, OrderService, CreatePatientDto, CreateOrderDto, frontend patient form, frontend order form |

**Recommendation:**
1. Create `PatientInsurance` junction: `{ patientId, insuranceId, priority, memberNumber, validFrom, validUntil, isActive }`
2. Create `OrderInsurance` junction: `{ orderId, insuranceId, coverage, claimReference, coveredAmount, status }`
3. Retain `Patient.insuranceId` as deprecated (backward compat) with data migration to junction
4. Retain `Order.insuranceId` as deprecated with data migration
5. Add constraint: max 5 active insurances per patient, max 2 per order
6. Update frontend forms to support add/remove insurance with priority assignment
7. Update tariff resolution to consider primary insurance first

**Migration Strategy:** Create junction tables → migrate existing FK data → deprecate single FK columns → remove in future release.

---

#### REC-004: Insurance-Specific Receipt Formats

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-PAY-004 |
| **Priority** | High |
| **Effort** | 8-10 person-days |
| **Affected Components** | PaymentService.getInvoice(), new ReceiptService, receipt templates, frontend receipt display |

**Recommendation:**
1. Create `ReceiptService` with template-based receipt generation
2. Define receipt templates: `CashReceipt`, `InsuranceReceipt`, `CorporateReceipt`
3. Insurance receipt includes: insurer name, claim ref, covered amount, patient copay, test breakdown
4. Include `insurance` relation in `getInvoice()` query (currently missing from includes)
5. Support PDF generation via template engine (e.g., Handlebars → PDF)
6. Expose `GET /api/v1/orders/:id/receipt?format=json|pdf` endpoint

**Migration Strategy:** Additive — new service and endpoint alongside existing `getInvoice()`.

---

#### REC-005: PaymentMethod Enum Extension (Self-Pay Distinction)

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-PAY-005, INS-PAY-006 |
| **Priority** | High |
| **Effort** | 3-5 person-days |
| **Affected Components** | PaymentMethod enum (Prisma), frontend PaymentMethod type, ProcessPaymentDto, payment form |

**Recommendation:**
1. Add to Prisma enum: `INSURANCE_CASH_FALLBACK`, `EDC`, `CORPORATE_DEFERRED`
2. Align frontend type with backend enum (resolve INSURANCE vs EDC mismatch)
3. Add `originalClaimId` optional field to ProcessPaymentDto for fallback payments
4. Update payment reports to distinguish true self-pay from fallback payments
5. Consider shared TypeScript type generation from Prisma schema (prisma-generator-typescript)

**Migration Strategy:** Prisma enum extension is additive (no data loss). Frontend type update is a non-breaking change. Existing CASH/TRANSFER/INSURANCE values preserved.

---

#### REC-006: Insurance Claim Reference & Tracking

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-BIL-001, INS-BIL-005 |
| **Priority** | Critical |
| **Effort** | 10-12 person-days |
| **Affected Components** | Order model (or OrderInsurance junction), claim number generator, ClaimStatus enum, OrderService, PaymentService |

**Recommendation:**
1. Add `claimReference` (VARCHAR 50) to `OrderInsurance` junction table
2. Implement claim number generator: format `CLM-{INSURER_CODE}-{YYYYMMDD}-{XXXX}`
3. Add `ClaimStatus` enum: `PENDING | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | PAID`
4. Track claim lifecycle transitions in AuditLog
5. Add claim reference to payment receipt and invoice outputs
6. Implement `GET /api/v1/claims` endpoint for claim management dashboard

**Migration Strategy:** Dependent on REC-003 (OrderInsurance junction table). Deploy together.

---

#### REC-007: BPJS Integration Fields

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-BIL-002 |
| **Priority** | Critical |
| **Effort** | 15-20 person-days |
| **Affected Components** | Order model, new BPJS module, CreateOrderDto, OrderService, external BPJS API integration |

**Recommendation:**
1. Add BPJS fields to Order (or dedicated `BpjsOrderDetail`): `sepNumber` (VARCHAR 19), `bpjsVerificationStatus`, `referringFacilityCode`, `bpjsClassLevel` (1/2/3)
2. Create `BpjsModule` with: eligibility check service, SEP validation, verification workflow
3. Implement BPJS API client for external VClaim/PCare integration
4. Add BPJS-specific order creation flow: verify eligibility → get SEP → create order
5. Map INA-CBG codes to TestMaster for BPJS tariff resolution

**Migration Strategy:** New module, new fields — additive schema change. BPJS API integration requires external system credentials and testing environment.

---

#### REC-008: Corporate Batch Invoicing

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-BIL-003 |
| **Priority** | High |
| **Effort** | 14-18 person-days |
| **Affected Components** | New BatchInvoice entity, new BatchInvoiceModule, billing cycle scheduler, Order model (FK to batch), corporate invoice report |

**Recommendation:**
1. Create `BatchInvoice` entity: `{ id, insuranceId, invoiceNumber, periodStart, periodEnd, totalAmount, orderCount, status, generatedAt }`
2. Create `BatchInvoiceStatus` enum: `DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED`
3. Add `batchInvoiceId` FK to Order (nullable) for corporate-billed orders
4. Implement billing cycle scheduler: configurable per insurer (weekly/monthly/custom)
5. Implement batch invoice generation: group orders by insurer + period, cap at 500 per invoice
6. Add `GET /api/v1/batch-invoices` CRUD endpoints for finance team
7. Add `CORPORATE_DEFERRED` to PaymentMethod enum

**Migration Strategy:** New entities and module — fully additive. Requires configuration UI for billing cycles per corporate insurer.

---

#### REC-009: Pre-Authorization Flag

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-BIL-004 |
| **Priority** | High |
| **Effort** | 5-7 person-days |
| **Affected Components** | TestMaster model, CreateTestDto, OrderService (pre-auth check), LabWorkflowService (gate logic) |

**Recommendation:**
1. Add `requiresInsurancePreAuth Boolean @default(false)` to TestMaster
2. In `OrderService.create()`: if any selected test requires pre-auth AND order has insurance → check pre-auth status
3. Add `preAuthStatus` field on OrderInsurance: `NOT_REQUIRED | PENDING | APPROVED | DENIED`
4. Block lab workflow progression (sample collection) until pre-auth is approved for flagged tests
5. Allow ADMIN override for urgent cases with audit trail

**Migration Strategy:** Additive field on TestMaster (default false = no behavior change for existing tests). Gate logic added to existing workflow.

---

#### REC-010: Insurance-Specific Reporting

| Field | Value |
|-------|-------|
| **Gap Reference** | INS-BIL-006 |
| **Priority** | Medium |
| **Effort** | 5-7 person-days |
| **Affected Components** | OrderQueryDto, OrderService.findAll(), DashboardService, new InsuranceReportService |

**Recommendation:**
1. Add `insuranceId` and `insuranceType` filters to `OrderQueryDto`
2. Add insurance breakdown to dashboard: revenue by payer, claim status distribution
3. Create `GET /api/v1/reports/insurance` endpoint with: date range, insurer filter, grouping
4. Include metrics: total billed, total approved, total rejected, outstanding, average TAT by insurer
5. Support CSV/Excel export for finance reconciliation

**Migration Strategy:** Additive — new filters and endpoints. Dependent on claim tracking (REC-006) for claim-based metrics.

---

### 8.3 Effort Summary

| Recommendation | Priority | Effort (person-days) | Dependencies |
|---------------|----------|---------------------|--------------|
| REC-001: Split Payment | Critical | 12-15 | None |
| REC-002: Insurance Rejection Handling | Critical | 15-20 | REC-003, REC-005 |
| REC-003: Multiple Insurance M2M | Critical | 18-22 | None |
| REC-004: Receipt Formats | High | 8-10 | REC-003, REC-006 |
| REC-005: PaymentMethod Enum | High | 3-5 | None |
| REC-006: Claim Reference & Tracking | Critical | 10-12 | REC-003 |
| REC-007: BPJS Integration | Critical | 15-20 | REC-003, REC-006 |
| REC-008: Corporate Batch Invoicing | High | 14-18 | REC-005 |
| REC-009: Pre-Authorization Flag | High | 5-7 | None |
| REC-010: Insurance Reporting | Medium | 5-7 | REC-006 |
| **TOTAL** | | **105-136** | |

### 8.4 Recommended Implementation Phases

**Phase 1 — Foundation (Weeks 1-4):** Critical priority
- REC-003: Multiple Insurance M2M (junction tables) — enables all other features
- REC-005: PaymentMethod Enum Extension — prerequisite for fallback tracking
- REC-006: Claim Reference & Tracking — core insurance workflow

**Phase 2 — Core Workflows (Weeks 5-8):** Critical + High priority
- REC-001: Split Payment Composition
- REC-002: Insurance Rejection & 72hr Fallback
- REC-009: Pre-Authorization Flag

**Phase 3 — Enterprise Features (Weeks 9-14):** High priority
- REC-007: BPJS Integration
- REC-008: Corporate Batch Invoicing
- REC-004: Insurance Receipt Formats

**Phase 4 — Analytics & Optimization (Weeks 15-16):** Medium priority
- REC-010: Insurance-Specific Reporting

---

## 9. Evidence & Methodology

### 9.1 Files Examined (Read-Only Access)

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | PaymentMethod enum, Order model, Patient model, Insurance model, TestMaster model |
| `apps/api/src/laboratory/payment/payment.service.ts` | Payment processing logic — `processPayment()`, `getInvoice()` |
| `apps/api/src/laboratory/payment/payment.controller.ts` | Payment endpoints and guards |
| `apps/api/src/laboratory/payment/dto/process-payment.dto.ts` | Payment DTO validation rules |
| `apps/api/src/laboratory/order/tariff-resolver.service.ts` | Insurance tariff resolution algorithm |
| `apps/api/src/laboratory/dashboard/dashboard.service.ts` | Revenue aggregation (no insurance breakdown) |
| `apps/web/src/types/order.ts` | Frontend PaymentMethod type definition |
| `apps/web/src/lib/api.ts` | Frontend payment API call |

### 9.2 Codebase Searches Performed

| Search Pattern | Purpose | Result |
|----------------|---------|--------|
| `split.*pay\|partial.*pay` | Split payment support | No matches |
| `insurance.*reject\|claim.*reject` | Insurance rejection handling | No matches |
| `SELF_PAY\|SelfPay\|self.pay` | Self-pay distinction | No matches |
| `receipt\|invoice.*format` | Receipt formatting | No matches |
| `covered.*amount\|copay` | Coverage split tracking | No matches |
| `72.*hour\|fallback.*cash` | Time-based fallback | No matches |
| `PaymentMethod\|paymentMethod` | Payment enum usage | Found — single method per order confirmed |
| `insurance.*receipt\|receipt.*insurance` | Insurance receipt logic | No matches |

### 9.3 Intermediate Analysis Documents Used

| Document | Content |
|----------|---------|
| `docs/17-Audit/_inventory/insurance-schema-support.md` | Task 8.1 output — schema relationship analysis |
| `docs/17-Audit/_inventory/billing-workflow-insurance-rules.md` | Task 8.2 output — billing workflow verification |

---

## 10. No-Code-Modification Attestation

This document was produced through **read-only analysis** of the eLIS codebase. No source code files under `apps/api/` or `apps/web/` were created, modified, or deleted during the production of this report.

All proposed changes documented in Sections 5.3 and 8 are **recommendations only** — documented as "Proposed Changes" for implementation planning purposes. They have NOT been applied to the codebase.

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/prisma/` | READ | Schema inspection |
| `apps/api/src/laboratory/payment/` | READ | Service, controller, DTO analysis |
| `apps/api/src/laboratory/order/` | READ | Tariff resolver, order service analysis |
| `apps/api/src/laboratory/dashboard/` | READ | Dashboard service analysis |
| `apps/web/src/types/` | READ | TypeScript type inspection |
| `apps/web/src/lib/` | READ | API client inspection |
| `docs/17-Audit/_inventory/` | READ | Prior analysis document review |

---

## Cross-References

*Cross-reference format: `[Document ID]#[Finding ID]`*

### Internal Findings Cross-Referenced to Other Audit Documents

| Finding ID | This Document | Related Document | Link |
|-----------|---------------|-----------------|------|
| INS-BIL-002 | §2 Billing Workflow | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#INS-BIL-002 |
| INS-PAY-002 | §3 Payment Flow | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#INS-PAY-002 |
| INS-PAY-003 | §3 Payment Flow | Main Audit Report — Top 5 Critical | [AUDIT-eLIS-2026-001]#INS-PAY-003 |
| INS-PAY-001 | §3 Payment Flow | Architecture Gap Analysis — Dashboard | [AUDIT-eLIS-2026-002]#INS-PAY-001 |
| INS-SCH-001 | §1 Insurance Schema | Architecture Gap Analysis — Functional Gaps | [AUDIT-eLIS-2026-002]#FG-MD-001 |
| INS-PAY-006 | §5 PaymentMethod Enum | RBAC Review — Frontend Alignment | [AUDIT-eLIS-2026-004]#Frontend-Backend-Alignment |

### Cross-References to Related Audit Documents

| Finding | Related Document | Document ID | Link |
|---------|-----------------|-------------|------|
| INS-PAY-001 (Split Payment) | Architecture Gap Analysis | AUDIT-eLIS-2026-002 | [AUDIT-eLIS-2026-002]#INS-PAY-001 |
| INS-PAY-002 (Rejection Handling) | Architecture Gap Analysis | AUDIT-eLIS-2026-002 | [AUDIT-eLIS-2026-002]#INS-PAY-002 |
| INS-PAY-003 (Multi-Insurance) | Architecture Gap Analysis | AUDIT-eLIS-2026-002 | [AUDIT-eLIS-2026-002]#INS-PAY-003 |
| INS-SCH-002 (Patient M2M) | Main Audit Report | AUDIT-eLIS-2026-001 | [AUDIT-eLIS-2026-001]#INS-SCH-002 |
| INS-SCH-003 (Order M2M) | Main Audit Report | AUDIT-eLIS-2026-001 | [AUDIT-eLIS-2026-001]#INS-SCH-003 |
| INS-BIL-002 (BPJS Fields) | Main Audit Report | AUDIT-eLIS-2026-001 | [AUDIT-eLIS-2026-001]#INS-BIL-002 |
| RBAC-SEC-004 (Unguarded Payments) | RBAC Review | AUDIT-eLIS-2026-004 | [AUDIT-eLIS-2026-004]#RBAC-SEC-004 |

### Audit Document Index

| Document ID | Title | Location |
|-------------|-------|----------|
| AUDIT-eLIS-2026-001 | Enterprise Admin Audit Report | `docs/17-Audit/enterprise-admin-audit-report.md` |
| AUDIT-eLIS-2026-002 | Architecture Gap Analysis | `docs/17-Audit/architecture-gap-analysis.md` |
| AUDIT-eLIS-2026-003 | Navigation Review | `docs/17-Audit/navigation-review.md` |
| AUDIT-eLIS-2026-004 | RBAC & User Management Review | `docs/17-Audit/rbac-review.md` |
| AUDIT-eLIS-2026-005 | Insurance & Healthcare Readiness (this document) | `docs/17-Audit/insurance-readiness.md` |

---

*End of Document — AUDIT-eLIS-2026-005 v1.0*
