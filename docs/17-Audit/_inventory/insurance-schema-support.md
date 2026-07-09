# Insurance Database Schema Support Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-INS-SCHEMA |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This intermediate analysis document verifies the database schema support for insurance-related entities as required by Requirement 6.1. It documents what EXISTS in the current schema and what is MISSING relative to enterprise healthcare insurance requirements. This document serves as input for tasks 8.2, 8.3 and the final `insurance-readiness.md` report.

**Validates: Requirements 6.1**

---

## 1. Insurance Model Assessment

### 1.1 Current Schema Definition

**Source:** `apps/api/prisma/schema.prisma` — Model `Insurance`

```prisma
model Insurance {
  id        String    @id @default(uuid()) @db.Uuid
  code      String    @unique
  name      String
  type      String?   // BPJS, Swasta, etc.
  phone     String?
  email     String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  orders   Order[]
  tariffs  Tariff[]
  patients Patient[]

  @@map("insurances")
}
```

### 1.2 Type Field Assessment

| Criterion | Status | Detail |
|-----------|--------|--------|
| Type field exists | ✅ EXISTS | `type String?` field present on Insurance model |
| Distinguishes BPJS/Swasta/Corporate | ⚠️ PARTIAL | Field is a nullable free-text `String?`, not a constrained enum |
| Enum or constrained values | ❌ MISSING | No `InsuranceType` enum exists; no DB-level constraint ensures only BPJS/Swasta/Corporate values |
| DTO validation for type values | ❌ MISSING | `CreateInsuranceDto.type` is `@IsOptional() @IsString()` — no `@IsIn(['BPJS', 'Swasta', 'Corporate'])` validation |

**Finding:** The `type` field exists but lacks enforcement. Any arbitrary string (or null) can be stored. Enterprise requirements specify exactly 3 values: BPJS, Swasta, Corporate.

---

## 2. Patient-Insurance Relationship

### 2.1 Current Schema Definition

```prisma
model Patient {
  // ...
  insuranceId  String?   @db.Uuid
  insurance    Insurance? @relation(fields: [insuranceId], references: [id])
  // ...
}
```

### 2.2 Relationship Assessment

| Criterion | Status | Detail |
|-----------|--------|--------|
| Patient links to Insurance | ✅ EXISTS | FK `insuranceId` references Insurance model |
| Relationship type | ⚠️ PARTIAL | One-to-Many (Patient has exactly 0 or 1 Insurance) — NOT Many-to-Many |
| Supports 1-5 insurance records per patient | ❌ MISSING | Current schema allows only a single `insuranceId` per patient |
| Junction table (PatientInsurance) | ❌ MISSING | No M2M junction table exists; no primary/secondary designation |
| Primary/secondary designation | ❌ MISSING | No field to distinguish primary vs secondary insurance on patient records |

**Finding:** The current design is a simple nullable FK (`Patient.insuranceId → Insurance.id`) allowing **at most 1** insurance per patient. The enterprise requirement demands a Many-to-Many relationship supporting 1–5 insurance records per patient with priority designation.

---

## 3. Order-Insurance Relationship

### 3.1 Current Schema Definition

```prisma
model Order {
  // ...
  insuranceId   String?   @db.Uuid
  insurance     Insurance? @relation(fields: [insuranceId], references: [id])
  // ...
}
```

### 3.2 Relationship Assessment

| Criterion | Status | Detail |
|-----------|--------|--------|
| Order links to Insurance | ✅ EXISTS | FK `insuranceId` references Insurance model |
| Single insurance per order | ✅ EXISTS | Single FK allows linking one insurance provider |
| Max 2 providers per order (primary/secondary) | ❌ MISSING | Current schema supports only 1 insurance per order |
| Primary/secondary coverage distinction | ❌ MISSING | No field or junction table to designate coverage priority |
| Claim reference number field | ❌ MISSING | No `claimReference` field on Order or a junction table |
| Coverage amount split tracking | ❌ MISSING | No fields to track how much each insurance covers vs patient pays |

**Finding:** Orders can reference **at most 1** insurance provider via `Order.insuranceId`. The enterprise requirement for primary/secondary coverage (max 2 providers) requires either a junction table (`OrderInsurance`) or dual FK columns with priority designation.

---

## 4. Tariff-Insurance Relationship

### 4.1 Current Schema Definition

```prisma
model Tariff {
  id          String   @id @default(uuid()) @db.Uuid
  testId      String   @db.Uuid
  clinicId    String?  @db.Uuid
  insuranceId String?  @db.Uuid
  price       Decimal  @db.Decimal(12, 2)
  discount    Decimal  @default(0) @db.Decimal(5, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  test      TestMaster @relation(fields: [testId], references: [id])
  clinic    Clinic?    @relation(fields: [clinicId], references: [id])
  insurance Insurance? @relation(fields: [insuranceId], references: [id])

  @@unique([testId, clinicId, insuranceId])
  @@map("tariffs")
}
```

### 4.2 Relationship Assessment

| Criterion | Status | Detail |
|-----------|--------|--------|
| Tariff links to Insurance | ✅ EXISTS | FK `insuranceId` references Insurance model |
| Differential pricing per test-insurance combination | ✅ EXISTS | Unique constraint on `[testId, clinicId, insuranceId]` enables per-insurance pricing |
| Price override logic | ✅ EXISTS | `TariffResolverService` implements priority-based resolution (SPECIFIC → CLINIC_ONLY → INSURANCE_ONLY → DEFAULT → FALLBACK) |
| Discount per insurance agreement | ✅ EXISTS | `discount` field (Decimal 5,2) allows percentage-based discount per tariff record |
| Combined clinic + insurance pricing | ✅ EXISTS | Unique constraint covers `testId + clinicId + insuranceId` combinations |

**Finding:** The Tariff-Insurance relationship is **fully implemented** for differential pricing. The `TariffResolverService` provides a well-structured priority-based price resolution that accounts for insurance-specific, clinic-specific, and combined tariffs.

---

## 5. Summary Matrix

| Relationship | Required by Req 6.1 | Current Status | Gap Severity |
|--------------|---------------------|----------------|--------------|
| Insurance.type field (enum constraint) | BPJS/Swasta/Corporate enum | Free-text `String?` — no constraint | **Medium** |
| Patient ↔ Insurance (1-5 per patient) | M2M junction with 1-5 limit | Single FK (0-1 per patient) | **High** |
| Order ↔ Insurance (max 2, primary/secondary) | M2M or dual FK with priority | Single FK (0-1 per order) | **High** |
| Tariff ↔ Insurance (differential pricing) | Per test-insurance pricing | ✅ Fully implemented | None |

---

## 6. Supporting Implementation Evidence

### 6.1 API Endpoints (Insurance CRUD)

| Method | Path | Guard | Roles |
|--------|------|-------|-------|
| GET | `/api/v1/master/insurances` | JwtAuthGuard | Any authenticated |
| POST | `/api/v1/master/insurances` | JwtAuthGuard + RolesGuard | ADMIN, SUPER_ADMIN |
| PUT | `/api/v1/master/insurances/:id` | JwtAuthGuard + RolesGuard | ADMIN, SUPER_ADMIN |
| DELETE | `/api/v1/master/insurances/:id` | JwtAuthGuard + RolesGuard | ADMIN, SUPER_ADMIN |

**Controller:** `reference-master.controller.ts` — `InsuranceController`
**Service:** `ReferenceMasterService` (generic CRUD pattern for reference masters)

### 6.2 Insurance in Order Flow

- `CreateOrderDto.insuranceId` — optional UUID linking order to one insurance
- `TariffResolverService.resolvePrice(testId, clinicId?, insuranceId?)` — resolves insurance-based pricing
- `OrderService.create()` — applies insurance tariff during order creation

### 6.3 Insurance in Patient Registration

- `CreatePatientDto.insuranceId` — optional UUID linking patient to one insurance
- `PatientService.create()` — stores single insurance FK on patient record

---

## 7. Recommended Schema Changes (Proposed — Not Applied)

### 7.1 Add InsuranceType Enum

```prisma
enum InsuranceType {
  BPJS
  SWASTA
  CORPORATE
}

model Insurance {
  // Change: type String? → type InsuranceType
  type InsuranceType
  // ... rest unchanged
}
```

### 7.2 Add PatientInsurance Junction Table

```prisma
model PatientInsurance {
  id          String   @id @default(uuid()) @db.Uuid
  patientId   String   @db.Uuid
  insuranceId String   @db.Uuid
  priority    Int      @default(1) // 1 = primary, 2 = secondary, etc.
  memberNumber String?
  validFrom   DateTime?
  validUntil  DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  patient   Patient   @relation(fields: [patientId], references: [id])
  insurance Insurance @relation(fields: [insuranceId], references: [id])

  @@unique([patientId, insuranceId])
  @@map("patient_insurances")
}
```

### 7.3 Add OrderInsurance Junction Table

```prisma
model OrderInsurance {
  id             String   @id @default(uuid()) @db.Uuid
  orderId        String   @db.Uuid
  insuranceId    String   @db.Uuid
  coverage       String   // PRIMARY, SECONDARY
  claimReference String?  @db.VarChar(50)
  coveredAmount  Decimal? @db.Decimal(12, 2)
  status         String   @default("PENDING") // PENDING, APPROVED, REJECTED
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  order     Order     @relation(fields: [orderId], references: [id])
  insurance Insurance @relation(fields: [insuranceId], references: [id])

  @@unique([orderId, insuranceId])
  @@map("order_insurances")
}
```

---

## 8. Risk Assessment

| Proposed Change | Risk Level | Affected Components | Migration Complexity |
|-----------------|-----------|---------------------|---------------------|
| InsuranceType enum | Low | Insurance model, CreateInsuranceDto, seed data | S (≤2 story points) |
| PatientInsurance junction table | Medium | Patient model, CreatePatientDto, PatientService, frontend patient forms | L (6-13 story points) |
| OrderInsurance junction table | High | Order model, CreateOrderDto, OrderService, TariffResolverService, PaymentService, frontend order flow | XL (≥14 story points) |

---

## 9. Conclusion

The current schema provides **basic** insurance support:
- ✅ Insurance master data entity with CRUD operations
- ✅ Tariff-Insurance differential pricing (fully functional)
- ⚠️ Type field exists but lacks enum constraint
- ❌ Patient-Insurance limited to single FK (not M2M with 1-5 limit)
- ❌ Order-Insurance limited to single FK (not primary/secondary)

The **Tariff-Insurance relationship is the strongest point** — it already supports insurance-specific pricing with a priority resolution algorithm. The **Patient and Order relationships are the critical gaps** requiring junction tables to meet enterprise healthcare requirements.
