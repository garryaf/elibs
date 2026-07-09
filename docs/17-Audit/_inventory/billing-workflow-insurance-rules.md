# Billing Workflow & Insurance-Specific Rules Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-INS-BILLING |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This intermediate analysis document verifies the billing workflow support for Cash payment, Insurance claim processing, BPJS integration readiness, Corporate Insurance batch invoicing, and insurance-specific lab workflow rules — as required by Requirements 6.2 and 6.4. It documents what EXISTS in the current implementation and what is MISSING relative to enterprise healthcare billing requirements.

This document serves as input for task 8.3 (payment flow verification) and the final `insurance-readiness.md` report.

**Validates: Requirements 6.2, 6.4**

---

## 1. Payment Method Enum Assessment

### 1.1 Current Schema Definition

**Source:** `apps/api/prisma/schema.prisma`

```prisma
enum PaymentMethod {
  CASH
  TRANSFER
  INSURANCE
}
```

### 1.2 Payment Method Assessment

| Criterion | Status | Detail |
|-----------|--------|--------|
| Cash payment method exists | ✅ EXISTS | `CASH` enum value defined |
| Bank transfer method exists | ✅ EXISTS | `TRANSFER` enum value defined |
| Insurance method exists | ✅ EXISTS | `INSURANCE` enum value defined |
| BPJS-specific method | ❌ MISSING | No `BPJS` or `BPJS_INSURANCE` distinct value; lumped under generic `INSURANCE` |
| Corporate billing method | ❌ MISSING | No `CORPORATE_BILLING` or deferred-payment method |
| Self-pay distinction | ❌ MISSING | No differentiation between patient-initiated cash and insurance-rejection fallback cash |

**Finding:** The `PaymentMethod` enum is basic. It supports the three broad categories (Cash, Transfer, Insurance) but lacks granularity for BPJS-specific flows, corporate deferred billing, or audit-traceable fallback-to-cash scenarios after insurance rejection.

---

## 2. Billing Workflow Analysis

### 2.1 Cash Payment Support

**Source:** `apps/api/src/laboratory/payment/payment.service.ts`, `dto/process-payment.dto.ts`

```typescript
// ProcessPaymentDto
@IsEnum(PaymentMethod)
paymentMethod: PaymentMethod;  // Accepts CASH

@IsNumber()
@Min(0)
amountPaid: number;

@IsOptional()
@IsString()
notes?: string;
```

| Criterion | Status | Detail |
|-----------|--------|--------|
| Cash payment at POS | ✅ EXISTS | `PaymentMethod.CASH` accepted via `processPayment()` endpoint |
| No insurance reference required for cash | ✅ EXISTS | `insuranceId` on Order is optional; payment proceeds regardless |
| Cash amount tracking | ✅ EXISTS | `amountPaid` field stored on Order |
| Change calculation | ❌ MISSING | No logic to compute change when `amountPaid > totalAmount` |
| Receipt generation | ⚠️ PARTIAL | `getInvoice()` returns order data but has no cash-specific receipt formatting |
| POS terminal integration | ❌ MISSING | No POS device API, EDC integration, or card reader support |

**Finding:** Cash payment is functionally supported — KASIR and ADMIN roles can call `POST /api/v1/orders/:id/pay` with `paymentMethod: "CASH"`. The workflow is straightforward: validate order status is `PENDING_PAYMENT`, record payment, transition to `PAID`. No insurance reference is required. However, there is no change calculation or POS integration.

---

### 2.2 Insurance Claim Support

**Source:** `apps/api/src/laboratory/order/dto/create-order.dto.ts`, `order.service.ts`, `payment.service.ts`

| Criterion | Status | Detail |
|-----------|--------|--------|
| Insurance reference on Order | ✅ EXISTS | `Order.insuranceId` FK links to Insurance model |
| Claim reference number field (up to 50 chars) | ❌ MISSING | No `claimReference` field on Order, OrderDetail, or any related model |
| Claim reference validation (max 50 chars) | ❌ MISSING | No `@MaxLength(50)` validation for claim reference |
| Insurance payment tracking | ⚠️ PARTIAL | `PaymentMethod.INSURANCE` records that insurance was the payment method, but no claim-specific metadata stored |
| Claim status tracking (pending/approved/rejected) | ❌ MISSING | No claim status field or workflow |
| Insurance coverage amount vs patient copay | ❌ MISSING | No split between covered amount and patient responsibility |

**Finding:** Orders can be linked to an Insurance provider via `Order.insuranceId`, and payment can be recorded as `PaymentMethod.INSURANCE`. However, there is **no claim reference number field** anywhere in the schema or DTOs. The enterprise requirement for a mandatory claim reference (up to 50 characters) linked to each insurance order is not supported.

---

### 2.3 BPJS Integration Readiness

**Source:** Full codebase search — no results found for BPJS-specific fields, SEP, or verification status.

| Criterion | Status | Detail |
|-----------|--------|--------|
| SEP number field (≤19 chars) | ❌ MISSING | No `sepNumber` field exists anywhere in schema or DTOs |
| BPJS verification status | ❌ MISSING | No `bpjsVerificationStatus` or equivalent field |
| Referring facility code | ❌ MISSING | No `referringFacilityCode` field |
| BPJS class level (1/2/3) | ❌ MISSING | No `bpjsClassLevel` or `classLevel` field |
| BPJS API integration endpoint | ❌ MISSING | No external BPJS service integration module |
| BPJS eligibility check | ❌ MISSING | No pre-order verification against BPJS API |
| SEP validation service | ❌ MISSING | No SEP number format validation (max 19 chars numeric) |
| BPJS tariff mapping | ⚠️ PARTIAL | Generic `Insurance` record can represent BPJS; tariff-insurance pricing works but no INA-CBG code mapping |

**Finding:** BPJS integration is **entirely absent**. There are no BPJS-specific fields, no SEP number tracking, no verification workflow, no referring facility code storage, and no class level designation. The system can store an Insurance record named "BPJS" with associated tariffs (via the Tariff-Insurance relationship), but none of the BPJS-specific operational fields required for real integration with the BPJS Kesehatan API exist.

---

### 2.4 Corporate Insurance — Batch Invoicing

**Source:** Full codebase search — no results found for batch invoicing, corporate billing cycles, or grouped invoice generation.

| Criterion | Status | Detail |
|-----------|--------|--------|
| Corporate insurance type identification | ⚠️ PARTIAL | `Insurance.type` can be set to "Corporate" as free text |
| Batch invoicing support | ❌ MISSING | No batch invoice generation endpoint or service |
| Grouping up to 500 orders per invoice cycle | ❌ MISSING | No invoice grouping, cycle management, or batch limit logic |
| Invoice cycle configuration (weekly/monthly/custom) | ❌ MISSING | No billing cycle configuration entity |
| Company billing address tracking | ❌ MISSING | Insurance model has no `billingAddress`, `companyName`, or corporate contact fields |
| Deferred payment tracking | ❌ MISSING | Payment is immediate (order-by-order); no AR/accounts receivable tracking |
| Batch invoice status (draft/sent/paid/overdue) | ❌ MISSING | No batch invoice entity or lifecycle management |
| Corporate agreement terms | ❌ MISSING | No contract terms, credit limit, or payment terms (net-30, net-60) storage |

**Finding:** Corporate Insurance batch invoicing is **entirely absent**. The current payment model is strictly transactional — each order is individually paid at the time of service. There is no mechanism to defer payment, group orders into batch invoices, manage billing cycles, or generate consolidated corporate invoices for up to 500 orders per cycle.

---

## 3. Laboratory Workflow — Insurance-Specific Rules

### 3.1 Pre-Authorization Flag

**Source:** `apps/api/prisma/schema.prisma` — `TestMaster` model, `lab-workflow.service.ts`

```prisma
model TestMaster {
  // ...
  requiresDoctorApproval Boolean @default(true)
  // NO: requiresInsuranceApproval or requiresPreAuthorization field
  // ...
}
```

| Criterion | Status | Detail |
|-----------|--------|--------|
| `requiresDoctorApproval` flag on TestMaster | ✅ EXISTS | Used for lab workflow auto-approval logic |
| `requiresPreAuthorization` flag for insurance | ❌ MISSING | No pre-authorization flag indicating which tests need insurance approval before processing |
| Pre-authorization check in order creation | ❌ MISSING | Order creation does not check if selected tests require insurance pre-auth |
| Pre-authorization status tracking | ❌ MISSING | No field to store whether pre-auth was obtained, pending, or denied |
| Pre-auth blocking workflow | ❌ MISSING | Lab workflow does not gate sample collection on insurance pre-authorization |

**Finding:** The `TestMaster` model has a `requiresDoctorApproval` flag that gates the approval workflow. However, there is **no equivalent `requiresPreAuthorization` flag** for insurance. The enterprise requirement specifies that certain tests should require insurance approval before the lab can process them — this capability does not exist.

---

### 3.2 Insurance Tariff Price Override

**Source:** `apps/api/src/laboratory/order/tariff-resolver.service.ts`

```typescript
/**
 * Priority-based tariff lookup:
 * 1. SPECIFIC: clinic + insurance match
 * 2. CLINIC_ONLY: clinic match, no insurance
 * 3. INSURANCE_ONLY: insurance match, no clinic
 * 4. DEFAULT: no clinic, no insurance
 * 5. FALLBACK: TestMaster.price with 0 discount
 */
```

| Criterion | Status | Detail |
|-----------|--------|--------|
| Insurance-specific pricing | ✅ EXISTS | `TariffResolverService` resolves INSURANCE_ONLY and SPECIFIC tariffs |
| Priority-based resolution | ✅ EXISTS | 5-level cascade: SPECIFIC → CLINIC_ONLY → INSURANCE_ONLY → DEFAULT → FALLBACK |
| Per-test-insurance price agreement | ✅ EXISTS | `Tariff` model with unique `[testId, clinicId, insuranceId]` constraint |
| Insurance discount percentage | ✅ EXISTS | `Tariff.discount` field (Decimal 5,2) |
| Tariff effective date range | ❌ MISSING | No `effectiveFrom`/`effectiveTo` fields — tariff is always current |
| Tariff approval workflow | ❌ MISSING | No approval process for tariff changes; direct CRUD by ADMIN |
| Insurance package/bundle pricing | ❌ MISSING | Tariffs are per-test only; Panel pricing does not integrate with insurance tariffs |
| INA-CBG/INA-DRG code mapping (for BPJS) | ❌ MISSING | No BPJS tariff code mapping system |

**Finding:** The insurance tariff price override is the **strongest implementation** in the insurance domain. The `TariffResolverService` correctly implements a cascading resolution algorithm that selects the most specific tariff for a given test-clinic-insurance combination. Discounts are properly calculated. The gaps are temporal (no effective date ranges) and BPJS-specific (no INA-CBG codes).

---

### 3.3 Claim Number Generation & Tracking

**Source:** Full codebase search — no claim number generation or tracking logic found.

| Criterion | Status | Detail |
|-----------|--------|--------|
| Claim number auto-generation | ❌ MISSING | No claim number generator (only `orderNumber` generator exists: `LAB-YYYYMMDD-XXXX`) |
| Claim number format (unique per Order-Insurance) | ❌ MISSING | No claim number field on Order or junction table |
| Claim number tracking per insurance provider | ❌ MISSING | No per-insurance claim sequence management |
| Claim status lifecycle | ❌ MISSING | No claim entity with status progression (submitted → under review → approved → paid → rejected) |
| Claim submission to insurance | ❌ MISSING | No insurance API integration for claim submission |
| Claim audit trail | ❌ MISSING | No claim history tracking via AuditLog or dedicated ClaimHistory entity |

**Finding:** Claim number generation and tracking is **entirely absent**. The system generates order numbers (`LAB-YYYYMMDD-XXXX`) but has no concept of insurance claim numbers. For enterprise healthcare, each order-insurance combination should generate a unique claim reference that tracks the lifecycle of the insurance reimbursement process.

---

### 3.4 Insurance-Specific Reporting

**Source:** `apps/api/src/laboratory/dashboard/dashboard.service.ts`, `order/order.service.ts`

| Criterion | Status | Detail |
|-----------|--------|--------|
| Report filtering by insurance type | ❌ MISSING | No `insuranceId` or `insuranceType` filter on `findAll()` or dashboard |
| Report filtering by date range | ✅ EXISTS | `OrderQueryDto` supports `startDate` and `endDate` |
| Revenue by insurance provider | ❌ MISSING | Dashboard `getExecutiveSummary()` aggregates total revenue without insurance breakdown |
| Claim submission report | ❌ MISSING | No claim tracking = no claim report |
| Outstanding claims/AR aging report | ❌ MISSING | No accounts receivable or aging report |
| Insurance utilization report | ❌ MISSING | No report showing test volume or cost by insurance provider |
| BPJS-specific reporting (SEP count, class distribution) | ❌ MISSING | No BPJS data = no BPJS reporting |
| Corporate billing summary | ❌ MISSING | No batch invoice or corporate billing data to report on |

**Finding:** Insurance-specific reporting is **entirely absent**. The dashboard provides general operational metrics (orders today, revenue, TAT, queue counts) and the order list supports date/status filtering. However, there is no way to filter or aggregate data by insurance provider or type. This means the system cannot produce insurance utilization reports, revenue-by-payer analysis, or outstanding claims aging reports.

---

## 4. Summary Matrix

### 4.1 Billing Workflow Capabilities

| Capability | Required by Req 6.2 | Current Status | Gap Severity |
|-----------|---------------------|----------------|--------------|
| Cash payment (direct pay, no insurance ref) | Direct pay at POS | ✅ Functional | None |
| Insurance claim with claim reference (≤50 chars) | Mandatory claim ref per insurance order | ❌ Missing — no claim reference field | **High** |
| BPJS SEP number (≤19 chars) | SEP field on order | ❌ Missing — no BPJS fields at all | **Critical** |
| BPJS verification status | Verification check before order | ❌ Missing | **Critical** |
| BPJS referring facility code | Facility code storage | ❌ Missing | **Critical** |
| BPJS class level (1/2/3) | Class level tracking | ❌ Missing | **Critical** |
| Corporate batch invoicing (≤500 orders) | Grouped invoice generation | ❌ Missing — no batch mechanism | **High** |

### 4.2 Lab Workflow Insurance Rules

| Capability | Required by Req 6.4 | Current Status | Gap Severity |
|-----------|---------------------|----------------|--------------|
| Pre-authorization flag on TestMaster | Boolean flag for insurance pre-auth | ❌ Missing — only `requiresDoctorApproval` exists | **High** |
| Insurance tariff price override | Cascade resolution algorithm | ✅ Fully implemented | None |
| Claim number generation/tracking | Auto-generated unique claim ref | ❌ Missing — no claim entity | **High** |
| Insurance-specific reporting | Filter/aggregate by insurance type + date | ❌ Missing — no insurance filters | **Medium** |

---

## 5. Evidence Summary

### 5.1 Files Examined (Read-Only)

| File | Purpose | Access |
|------|---------|--------|
| `apps/api/prisma/schema.prisma` | PaymentMethod enum, Order model, TestMaster model | READ |
| `apps/api/src/laboratory/payment/payment.service.ts` | Payment processing logic | READ |
| `apps/api/src/laboratory/payment/payment.controller.ts` | Payment endpoints (POST pay, GET barcode, GET invoice) | READ |
| `apps/api/src/laboratory/payment/dto/process-payment.dto.ts` | Payment DTO validation | READ |
| `apps/api/src/laboratory/order/order.service.ts` | Order creation with insurance assignment | READ |
| `apps/api/src/laboratory/order/dto/create-order.dto.ts` | Order DTO (optional insuranceId) | READ |
| `apps/api/src/laboratory/order/dto/order-query.dto.ts` | Order filtering (no insurance filter) | READ |
| `apps/api/src/laboratory/order/tariff-resolver.service.ts` | Insurance tariff resolution algorithm | READ |
| `apps/api/src/laboratory/lab-workflow/lab-workflow.service.ts` | Lab workflow (no insurance pre-auth) | READ |
| `apps/api/src/laboratory/dashboard/dashboard.service.ts` | Dashboard (no insurance reporting) | READ |

### 5.2 Codebase Searches Performed

| Search Pattern | Result |
|----------------|--------|
| `bpjs\|BPJS\|SEP\|claim\|claimRef\|claimReference` | No relevant matches |
| `batch\|invoice\|corporate\|batch.*invoice\|preAuth` | No batch invoicing logic found |
| `requiresInsurance\|preAuthorization` | Not found — only `requiresDoctorApproval` exists |
| `split.*pay\|partial.*pay\|insurance.*reject` | No matches |
| `insurance.*report\|insuranceType\|filter.*insurance` | No matches |

---

## 6. Proposed Changes (Documentation Only — Not Applied)

### 6.1 Add Claim Reference Field to Order

```prisma
model Order {
  // ... existing fields
  claimReference    String?  @db.VarChar(50)  // Insurance claim reference, max 50 chars
  claimStatus       ClaimStatus? // PENDING, SUBMITTED, APPROVED, REJECTED, PAID
  // ...
}

enum ClaimStatus {
  PENDING
  SUBMITTED
  APPROVED
  REJECTED
  PAID
}
```

**Risk:** Medium | **Affected:** Order model, CreateOrderDto, OrderService, PaymentService | **Effort:** M (3-5 story points)

### 6.2 Add BPJS-Specific Fields

```prisma
model Order {
  // ... existing fields
  sepNumber             String?  @db.VarChar(19)  // BPJS SEP number
  bpjsVerificationStatus String? // VERIFIED, UNVERIFIED, FAILED
  referringFacilityCode  String? // Faskes perujuk code
  bpjsClassLevel         Int?    // 1, 2, or 3
  // ...
}
```

**Risk:** Medium | **Affected:** Order model, CreateOrderDto, OrderService, BPJS integration module (new) | **Effort:** L (6-13 story points)

### 6.3 Add Pre-Authorization Flag

```prisma
model TestMaster {
  // ... existing fields
  requiresInsurancePreAuth Boolean @default(false) // NEW: insurance pre-authorization requirement
  // ...
}
```

**Risk:** Low | **Affected:** TestMaster model, CreateTestDto, LabWorkflowService, OrderService | **Effort:** M (3-5 story points)

### 6.4 Add Corporate Batch Invoice Model

```prisma
model BatchInvoice {
  id            String   @id @default(uuid()) @db.Uuid
  insuranceId   String   @db.Uuid
  invoiceNumber String   @unique
  periodStart   DateTime
  periodEnd     DateTime
  totalAmount   Decimal  @db.Decimal(14, 2)
  orderCount    Int
  status        BatchInvoiceStatus @default(DRAFT)
  generatedAt   DateTime @default(now())
  sentAt        DateTime?
  paidAt        DateTime?
  
  insurance     Insurance @relation(fields: [insuranceId], references: [id])
  orders        Order[]   // Add batchInvoiceId FK to Order model
  
  @@map("batch_invoices")
}

enum BatchInvoiceStatus {
  DRAFT
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
}
```

**Risk:** High | **Affected:** Order model, Insurance model, new BatchInvoice service/controller/module, billing cycle scheduler | **Effort:** XL (≥14 story points)

### 6.5 Add Insurance Reporting Filters

```typescript
// Proposed additions to OrderQueryDto
@IsOptional()
@IsUUID()
insuranceId?: string;

@IsOptional()
@IsIn(['BPJS', 'SWASTA', 'CORPORATE'])
insuranceType?: string;
```

**Risk:** Low | **Affected:** OrderQueryDto, OrderService.findAll(), DashboardService | **Effort:** S (≤2 story points)

---

## 7. Risk Assessment

| Proposed Change | Risk Level | Affected Components | Migration Complexity |
|-----------------|-----------|---------------------|---------------------|
| Claim reference field | Medium | Order, DTOs, PaymentService | M (3-5 SP) |
| BPJS fields (SEP, verification, facility, class) | Medium | Order, DTOs, new BPJS module | L (6-13 SP) |
| Pre-authorization flag | Low | TestMaster, CreateTestDto, LabWorkflow | M (3-5 SP) |
| Corporate batch invoice model | High | New module, Order FK, scheduler, billing cycle | XL (≥14 SP) |
| Insurance reporting filters | Low | OrderQueryDto, OrderService, Dashboard | S (≤2 SP) |
| **Total Estimated Effort** | | | **32-42 story points** |

---

## 8. Conclusion

### What Works

1. **Cash Payment** — Fully functional. KASIR/ADMIN can process cash payments against orders without insurance involvement.
2. **Insurance Tariff Price Override** — Fully implemented via `TariffResolverService` with a 5-level cascade resolution algorithm supporting per-test-clinic-insurance pricing.

### Critical Gaps

1. **BPJS Integration** — No BPJS-specific fields exist (SEP number, verification status, referring facility, class level). This blocks BPJS operational readiness entirely.
2. **Claim Reference Tracking** — No claim number generation or tracking. Insurance orders have no mechanism to reference specific insurance claims.
3. **Corporate Batch Invoicing** — No batch invoice model, no billing cycle management, no grouped invoice generation (≤500 orders requirement).
4. **Pre-Authorization Flag** — No insurance pre-auth flag on TestMaster; only doctor approval flag exists.
5. **Insurance Reporting** — No ability to filter or aggregate by insurance type/provider for reporting purposes.

### Architecture Observation

The payment flow follows a **simple transactional model** where each order is individually paid at the point of service. This design works for cash and basic insurance but does not support:
- Deferred corporate billing (requires AR/accounts receivable)
- BPJS submission workflows (requires external API integration)
- Split payment scenarios (requires payment composition)
- Claim lifecycle management (requires dedicated claim entity)

Moving to enterprise healthcare billing would require significant architectural additions — specifically a dedicated **Billing Module** with claim management, batch invoicing, and payment composition capabilities sitting alongside the existing simple payment flow.
