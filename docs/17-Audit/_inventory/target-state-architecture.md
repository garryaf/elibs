# Target State Architecture

**Document ID:** AUDIT-eLIS-2026-TSA-001  
**Version:** 1.0  
**Date:** 2026-07-09  
**Author:** Enterprise Architect  
**Classification:** Internal  
**Status:** Draft  

---

## Executive Summary

This document defines the recommended target state architecture for the eLIS (Enterprise Laboratory Information System), synthesized from findings across the enterprise architecture audit:

- Architecture Compliance Score: **84.3/100** (AUDIT-eLIS-2026-002)
- Module Boundary Map: **59% module isolation** (AUDIT-eLIS-2025-CLS-002)
- RBAC Review: **Option B Full RBAC** recommended (AUDIT-eLIS-2026-004)
- Insurance Readiness: **25% — NOT READY** (AUDIT-eLIS-2026-005)
- Navigation: **Option C Hierarchical** with 7 Level-1 items (AUDIT-eLIS-2025-NAV-002)

The target state addresses all identified gaps while preserving the system's existing strengths (Feature-Based backend, 100% shared component compliance, functional lab workflow).

---

## Table of Contents

1. [Backend Architecture](#1-backend-architecture)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Database Organization](#3-database-organization)
4. [Navigation Structure](#4-navigation-structure)
5. [Cross-Cutting Concerns](#5-cross-cutting-concerns)
6. [Traceability](#6-traceability)

---

## 1. Backend Architecture

### 1.1 Recommended Pattern: Feature-Based with Bounded Contexts

The current backend already follows Feature-Based Architecture (100% backend folder compliance). The target state formalizes this into explicit **Bounded Contexts** — each top-level module owns its domain logic, data access, and API surface with well-defined interface contracts for cross-context communication.

### 1.2 Current State vs Target State

| Aspect | Current State | Target State |
|--------|--------------|--------------|
| Pattern | Feature-Based (informal) | Feature-Based with Bounded Contexts |
| Master Data location | Nested under `laboratory/master-data/` | Promoted to top-level `master-data/` |
| Region location | Separate `laboratory/region/` | Merged into `master-data/` context |
| Settings location | Inside `laboratory/notification/` | Extracted to top-level `settings/` |
| Cross-context access | Direct Prisma queries | Service interface contracts |
| Module isolation | 59% compliance | Target: 95%+ compliance |

### 1.3 Target Top-Level Module Structure

```
apps/api/src/
├── master-data/                          ← Bounded Context: Master Data
│   ├── master-data.module.ts
│   ├── controllers/
│   │   ├── test-category.controller.ts
│   │   ├── test.controller.ts
│   │   ├── panel.controller.ts
│   │   ├── tariff.controller.ts
│   │   ├── reference-master.controller.ts
│   │   └── region.controller.ts         ← Relocated from laboratory/region/
│   ├── services/
│   │   ├── master-data.service.ts
│   │   ├── reference-master.service.ts
│   │   ├── tariff-resolver.service.ts
│   │   ├── region.service.ts
│   │   ├── region-sync.service.ts
│   │   └── region-validation.service.ts
│   ├── interfaces/
│   │   ├── master-data-query.interface.ts   ← Read-only contract for consumers
│   │   └── region-lookup.interface.ts
│   ├── dto/
│   └── tests/
│
├── settings/                             ← Bounded Context: System Configuration
│   ├── settings.module.ts
│   ├── settings.controller.ts            ← Extracted from notification/
│   ├── settings.service.ts
│   ├── interfaces/
│   │   └── system-settings.interface.ts
│   ├── dto/
│   └── tests/
│
├── users/                                ← Bounded Context: User Administration
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/
│   └── tests/
│
├── rbac/                                 ← NEW: Bounded Context: Access Control
│   ├── rbac.module.ts
│   ├── controllers/
│   │   ├── permission.controller.ts
│   │   ├── role-permission.controller.ts
│   │   └── approval.controller.ts
│   ├── services/
│   │   ├── permission.service.ts
│   │   ├── role-permission.service.ts
│   │   ├── permission-guard.service.ts
│   │   └── approval.service.ts
│   ├── guards/
│   │   └── permission.guard.ts           ← Replaces flat role matching
│   ├── entities/
│   │   ├── permission.entity.ts
│   │   ├── role-permission.entity.ts
│   │   └── approval-request.entity.ts
│   ├── dto/
│   └── tests/
│
├── insurance/                            ← NEW: Bounded Context: Insurance & Claims
│   ├── insurance.module.ts
│   ├── controllers/
│   │   ├── claim.controller.ts
│   │   ├── batch-invoice.controller.ts
│   │   └── bpjs.controller.ts
│   ├── services/
│   │   ├── claim.service.ts
│   │   ├── claim-number-generator.service.ts
│   │   ├── batch-invoice.service.ts
│   │   ├── bpjs-verification.service.ts
│   │   └── coverage-coordinator.service.ts
│   ├── interfaces/
│   │   └── insurance-query.interface.ts
│   ├── dto/
│   └── tests/
│
├── laboratory/                           ← Bounded Context: Clinical Operations (reduced)
│   ├── laboratory.module.ts
│   ├── order/
│   ├── patient/
│   ├── payment/
│   ├── lab-workflow/
│   ├── notification/                     ← settings.controller.ts removed
│   ├── audit/
│   └── dashboard/
│
├── auth/                                 ← Bounded Context: Authentication
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   ├── dto/                              ← NEW: currently missing
│   └── tests/
│
├── common/                               ← Shared Infrastructure (unchanged)
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   ├── pipes/
│   ├── decorators/
│   └── prisma/
│
├── config/                               ← Configuration (unchanged)
└── health/                               ← Health Check (unchanged)
```

### 1.4 Bounded Context Communication Rules

| Rule | Description |
|------|-------------|
| **Interface-first access** | Cross-context data access MUST go through exported service interfaces, never direct Prisma queries |
| **Read-only contracts** | Consumer contexts receive read-only view types (e.g., `TestMasterView`, `TariffView`) |
| **Module import direction** | Dependencies flow inward: operational contexts → master data/settings; never the reverse |
| **Event-driven decoupling** | For async workflows (notifications, audit), use NestJS EventEmitter or message queue |
| **No circular imports** | If context A imports B, then B MUST NOT import A |

### 1.5 Key Interface Contracts

#### IMasterDataQueryService (consumed by: Order, LabWorkflow, Payment, Insurance)

```typescript
export interface IMasterDataQueryService {
  findTestById(testId: string): Promise<TestMasterView>;
  findTestsByIds(testIds: string[]): Promise<TestMasterView[]>;
  resolveTariff(testId: string, clinicId?: string, insuranceId?: string): Promise<TariffView | null>;
  findReferenceValues(testId: string): Promise<ReferenceValueView[]>;
  findInsuranceById(insuranceId: string): Promise<InsuranceView>;
  findActiveInsurances(): Promise<InsuranceView[]>;
}
```

#### ISystemSettingsService (consumed by: Notification)

```typescript
export interface ISystemSettingsService {
  getSmtpSettings(): Promise<SmtpSettingsView>;
  getSetting(key: string): Promise<string | null>;
  getSettingsByPrefix(prefix: string): Promise<Record<string, string>>;
}
```

#### IPermissionService (consumed by: all guarded controllers)

```typescript
export interface IPermissionService {
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<PermissionSet>;
  getRoleHierarchy(role: string): Promise<string[]>;
}
```

### 1.6 Backward Compatibility

All refactoring MUST preserve existing API contracts:

| API Route | Current Module | Target Module | Contract Change |
|-----------|---------------|---------------|:---------------:|
| `/api/v1/master/*` | `laboratory/master-data/` | `master-data/` | **None** |
| `/api/v1/regions/*` | `laboratory/region/` | `master-data/` | **None** |
| `/api/v1/settings/*` | `laboratory/notification/` | `settings/` | **None** |
| `/api/v1/users` | `users/` | `users/` | **None** |
| `/api/v1/lab-workflow/*` | `laboratory/lab-workflow/` | `laboratory/lab-workflow/` | **None** |

No HTTP endpoint path, request body, or response structure changes.

---

## 2. Frontend Architecture

### 2.1 Recommendation: Formalized Next.js App Router Pattern (NOT FSD)

The audit found that the documented Feature-Sliced Design (FSD) pattern has **18% compliance** — 5 of 6 FSD layers are entirely absent. The actual implementation uses a standard Next.js App Router pattern with domain-organized components. Rather than forcing an architectural migration to FSD (which would require XL effort for minimal functional benefit), the target state **formalizes the existing Next.js pattern** and adds the documented-but-missing layers that provide genuine value.

### 2.2 Decision Rationale

| Option | Effort | Benefit | Recommendation |
|--------|--------|---------|----------------|
| Adopt FSD fully | XL (≥14 SP) | Strict layer separation; overhead for team unfamiliar with FSD | ❌ Disproportionate |
| Formalize current pattern + add services/schemas/hooks | M (3-5 SP) | Resolves 3 Major violations; aligns docs with reality; adds TanStack Query | ✅ **Selected** |
| Do nothing | — | Documentation stays misaligned; no caching; scattered API calls | ❌ Leaves gaps open |

**Key insight:** The backend's Feature-Based pattern is excellent. The frontend should mirror this with domain-organized pages + a proper services layer, rather than imposing an unrelated architectural framework (FSD).

### 2.3 Target Frontend Structure

```
apps/web/src/
├── app/                                  ← Next.js App Router (existing)
│   ├── dashboard/
│   │   ├── page.tsx                      ← Dashboard
│   │   ├── patients/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── laboratory/
│   │   │   ├── page.tsx
│   │   │   ├── queue/page.tsx
│   │   │   ├── results/page.tsx
│   │   │   ├── approval/page.tsx
│   │   │   ├── clinical-data/
│   │   │   │   ├── test-categories/page.tsx
│   │   │   │   ├── tests/page.tsx
│   │   │   │   └── panels/page.tsx
│   │   │   └── stats/page.tsx
│   │   ├── master-data/                  ← NEW route group
│   │   │   ├── doctors/page.tsx
│   │   │   ├── clinics/page.tsx
│   │   │   ├── insurance/page.tsx
│   │   │   ├── equipment-reagents/
│   │   │   │   ├── equipment/page.tsx
│   │   │   │   └── reagents/page.tsx
│   │   │   ├── sample-types/page.tsx
│   │   │   ├── measurement-units/page.tsx
│   │   │   └── regions/page.tsx
│   │   ├── administration/               ← NEW route group
│   │   │   ├── users/page.tsx
│   │   │   ├── tariffs/page.tsx
│   │   │   ├── system/
│   │   │   │   └── smtp/page.tsx
│   │   │   └── audit-trail/page.tsx
│   │   └── reports/
│   │       └── overview/page.tsx
│   ├── login/page.tsx
│   └── layout.tsx
│
├── components/                           ← Existing: shared UI components
│   ├── ui/                               ← Shadcn/Radix primitives
│   ├── forms/                            ← Form field composites
│   ├── tables/                           ← Data table composites
│   └── layout/                           ← Layout components (sidebar, header)
│
├── services/                             ← NEW: API client layer + TanStack Query hooks
│   ├── api-client.ts                     ← Axios/fetch wrapper with auth interceptor
│   ├── patients/
│   │   ├── patient.api.ts                ← Raw API call functions
│   │   └── patient.queries.ts            ← TanStack Query hooks (usePatients, usePatient)
│   ├── orders/
│   │   ├── order.api.ts
│   │   └── order.queries.ts
│   ├── master-data/
│   │   ├── master-data.api.ts
│   │   └── master-data.queries.ts
│   ├── laboratory/
│   │   ├── lab-workflow.api.ts
│   │   └── lab-workflow.queries.ts
│   ├── auth/
│   │   ├── auth.api.ts
│   │   └── auth.queries.ts
│   └── settings/
│       ├── settings.api.ts
│       └── settings.queries.ts
│
├── schemas/                              ← NEW: Zod validation schemas
│   ├── patient.schema.ts
│   ├── order.schema.ts
│   ├── master-data.schema.ts
│   ├── user.schema.ts
│   └── settings.schema.ts
│
├── hooks/                                ← NEW: Custom React hooks
│   ├── useAuth.ts                        ← Auth context hook
│   ├── useRegionData.ts                  ← Relocated from components/regions/
│   ├── usePermission.ts                  ← Role-based UI filtering
│   ├── usePagination.ts
│   └── useDebounce.ts
│
├── lib/                                  ← Utilities (existing)
│   ├── utils.ts
│   └── constants.ts
│
├── types/                                ← TypeScript type definitions (existing)
│   └── index.ts
│
└── providers/                            ← NEW: React context providers
    ├── query-provider.tsx                ← TanStack QueryClientProvider
    ├── auth-provider.tsx                 ← Auth context (existing, relocated)
    └── theme-provider.tsx
```

### 2.4 TanStack Query Integration

TanStack Query is the recommended server-state management solution, addressing the **#1 state management gap** (no caching, all pages re-fetch on mount).

#### Configuration

```typescript
// providers/query-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      gcTime: 10 * 60 * 1000,           // 10 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### Service Pattern Example

```typescript
// services/patients/patient.api.ts
import { apiClient } from '../api-client';
import type { Patient, CreatePatientDto } from '@/types';

export const patientApi = {
  getAll: (params?: PaginationParams) =>
    apiClient.get<PaginatedResult<Patient>>('/patients', { params }),
  getById: (id: string) =>
    apiClient.get<Patient>(`/patients/${id}`),
  create: (dto: CreatePatientDto) =>
    apiClient.post<Patient>('/patients', dto),
  update: (id: string, dto: Partial<CreatePatientDto>) =>
    apiClient.put<Patient>(`/patients/${id}`, dto),
};

// services/patients/patient.queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from './patient.api';

export const patientKeys = {
  all: ['patients'] as const,
  list: (params?: PaginationParams) => [...patientKeys.all, 'list', params],
  detail: (id: string) => [...patientKeys.all, 'detail', id],
};

export function usePatients(params?: PaginationParams) {
  return useQuery({
    queryKey: patientKeys.list(params),
    queryFn: () => patientApi.getAll(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: patientKeys.all }),
  });
}
```

### 2.5 Frontend Architecture Documentation Update

The Frontend Architecture document (`docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`) SHALL be updated to reflect:

1. Replace FSD references with "Next.js App Router with Domain-Organized Components"
2. Document the `services/` layer as the canonical API access pattern
3. Document TanStack Query as the server-state management strategy
4. Document Zod as the validation schema library
5. Document the `hooks/` directory as the custom hook location

---

## 3. Database Organization

### 3.1 Recommended Pattern: Schema-Per-Domain with Shared Core

The current database uses a single PostgreSQL schema (`public`) with all tables co-located. The target state organizes tables into logical domain schemas while maintaining Prisma's single-schema constraint through clear naming conventions and documentation.

> **Note:** Prisma does not natively support multi-schema in a single `schema.prisma` file (multi-schema is preview). The target state uses **table name prefixing** and **logical grouping** as the organizational mechanism, with actual PostgreSQL schemas as a future evolution.

### 3.2 Logical Domain Organization

```
┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN: Core / Shared                                               │
│  Tables: users, audit_logs, system_settings, mrn_sequences           │
│  Purpose: Cross-cutting entities used by all bounded contexts         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN: Master Data                                                 │
│  Tables: test_categories, test_masters, reference_values, panels,    │
│          panel_tests, tariffs, doctors, clinics, insurances,         │
│          equipments, calibrations, reagents, sample_types,           │
│          measurement_units, provinsi, kabupaten_kota, kecamatan,     │
│          kelurahan_desa                                              │
│  Purpose: Reference data managed by ADMIN/SUPER_ADMIN, rarely changes│
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN: Clinical Operations                                         │
│  Tables: patients, orders, order_details, notification_logs          │
│  Purpose: Transactional entities for lab workflow                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN: RBAC (NEW)                                                  │
│  Tables: permissions, role_permissions, user_roles, departments,      │
│          positions, user_departments, approval_requests,              │
│          approval_steps                                              │
│  Purpose: Enterprise access control — dynamic permission management   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DOMAIN: Insurance & Claims (NEW)                                    │
│  Tables: patient_insurances, order_insurances, claims,               │
│          batch_invoices, batch_invoice_items, bpjs_order_details      │
│  Purpose: Multi-payer healthcare operations                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 RBAC Schema Additions (Option B Full RBAC)

Based on the RBAC review recommendation (AUDIT-eLIS-2026-004 §2.2):

```prisma
// === RBAC DOMAIN ===

model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  resource    String                          // e.g., "patients", "orders", "master-data"
  action      String                          // e.g., "create", "read", "update", "delete", "approve"
  description String?
  createdAt   DateTime @default(now())

  rolePermissions RolePermission[]

  @@unique([resource, action])
  @@map("permissions")
}

model RolePermission {
  id           String   @id @default(uuid()) @db.Uuid
  role         Role
  permissionId String   @db.Uuid
  grantedAt    DateTime @default(now())
  grantedBy    String   @db.Uuid

  permission Permission @relation(fields: [permissionId], references: [id])

  @@unique([role, permissionId])
  @@map("role_permissions")
}

model UserRole {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  role      Role
  isPrimary Boolean  @default(false)
  grantedAt DateTime @default(now())
  grantedBy String   @db.Uuid
  expiresAt DateTime?

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, role])
  @@map("user_roles")
}

model Department {
  id          String   @id @default(uuid()) @db.Uuid
  code        String   @unique
  name        String
  parentId    String?  @db.Uuid
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  parent          Department?      @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children        Department[]     @relation("DepartmentHierarchy")
  userDepartments UserDepartment[]

  @@map("departments")
}

model Position {
  id          String   @id @default(uuid()) @db.Uuid
  code        String   @unique
  name        String
  level       Int      @default(1)           // Seniority level for hierarchy
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userDepartments UserDepartment[]

  @@map("positions")
}

model UserDepartment {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  departmentId String   @db.Uuid
  positionId   String   @db.Uuid
  isPrimary    Boolean  @default(false)
  startDate    DateTime @default(now())
  endDate      DateTime?

  user       User       @relation(fields: [userId], references: [id])
  department Department @relation(fields: [departmentId], references: [id])
  position   Position   @relation(fields: [positionId], references: [id])

  @@unique([userId, departmentId])
  @@map("user_departments")
}

model ApprovalRequest {
  id            String   @id @default(uuid()) @db.Uuid
  requestType   String                        // "ROLE_ELEVATION", "TARIFF_CHANGE", "PAYMENT_VOID"
  requesterId   String   @db.Uuid
  entityType    String                        // "User", "Tariff", "Order"
  entityId      String   @db.Uuid
  payload       Json                          // Proposed change data
  status        ApprovalStatus @default(PENDING)
  resolvedAt    DateTime?
  resolvedBy    String?  @db.Uuid
  resolution    String?                       // "APPROVED", "REJECTED" + reason
  createdAt     DateTime @default(now())
  expiresAt     DateTime?

  steps ApprovalStep[]

  @@index([status])
  @@index([requesterId])
  @@map("approval_requests")
}

model ApprovalStep {
  id               String   @id @default(uuid()) @db.Uuid
  approvalId       String   @db.Uuid
  stepOrder        Int
  approverRole     Role
  approverId       String?  @db.Uuid
  status           ApprovalStatus @default(PENDING)
  decidedAt        DateTime?
  comment          String?

  approval ApprovalRequest @relation(fields: [approvalId], references: [id])

  @@index([approvalId])
  @@map("approval_steps")
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
```

### 3.4 Insurance M2M Tables & BatchInvoice

Based on the insurance readiness review (AUDIT-eLIS-2026-005):

```prisma
// === INSURANCE & CLAIMS DOMAIN ===

model PatientInsurance {
  id           String    @id @default(uuid()) @db.Uuid
  patientId    String    @db.Uuid
  insuranceId  String    @db.Uuid
  priority     Int       @default(1)          // 1=PRIMARY, 2=SECONDARY, etc.
  memberNumber String
  validFrom    DateTime  @db.Date
  validUntil   DateTime? @db.Date
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  patient   Patient   @relation(fields: [patientId], references: [id])
  insurance Insurance @relation(fields: [insuranceId], references: [id])

  @@unique([patientId, insuranceId])
  @@index([patientId])
  @@map("patient_insurances")
}

model OrderInsurance {
  id              String      @id @default(uuid()) @db.Uuid
  orderId         String      @db.Uuid
  insuranceId     String      @db.Uuid
  coverage        CoverageType
  claimReference  String?     @db.VarChar(50)
  coveredAmount   Decimal?    @db.Decimal(12, 2)
  patientAmount   Decimal?    @db.Decimal(12, 2)
  claimStatus     ClaimStatus @default(PENDING)
  submittedAt     DateTime?
  approvedAt      DateTime?
  rejectedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  order     Order     @relation(fields: [orderId], references: [id])
  insurance Insurance @relation(fields: [insuranceId], references: [id])

  @@unique([orderId, coverage])              // Max 1 primary + 1 secondary per order
  @@index([orderId])
  @@index([claimStatus])
  @@map("order_insurances")
}

model BpjsOrderDetail {
  id                     String   @id @default(uuid()) @db.Uuid
  orderId                String   @unique @db.Uuid
  sepNumber              String   @db.VarChar(19)
  bpjsVerificationStatus String                    // "VERIFIED", "PENDING", "REJECTED"
  referringFacilityCode  String?
  bpjsClassLevel         Int                       // 1, 2, or 3
  inaCbgCode             String?                   // INA-CBG tariff code
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  order Order @relation(fields: [orderId], references: [id])

  @@map("bpjs_order_details")
}

model BatchInvoice {
  id             String             @id @default(uuid()) @db.Uuid
  insuranceId    String             @db.Uuid
  invoiceNumber  String             @unique
  periodStart    DateTime           @db.Date
  periodEnd      DateTime           @db.Date
  totalAmount    Decimal            @db.Decimal(14, 2)
  orderCount     Int
  status         BatchInvoiceStatus @default(DRAFT)
  generatedAt    DateTime           @default(now())
  sentAt         DateTime?
  paidAt         DateTime?
  notes          String?
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  insurance Insurance          @relation(fields: [insuranceId], references: [id])
  items     BatchInvoiceItem[]

  @@index([insuranceId])
  @@index([status])
  @@map("batch_invoices")
}

model BatchInvoiceItem {
  id             String  @id @default(uuid()) @db.Uuid
  batchInvoiceId String  @db.Uuid
  orderId        String  @db.Uuid
  amount         Decimal @db.Decimal(12, 2)

  batchInvoice BatchInvoice @relation(fields: [batchInvoiceId], references: [id])
  order        Order        @relation(fields: [orderId], references: [id])

  @@unique([batchInvoiceId, orderId])
  @@map("batch_invoice_items")
}

model PaymentComponent {
  id            String        @id @default(uuid()) @db.Uuid
  orderId       String        @db.Uuid
  paymentMethod PaymentMethod
  amount        Decimal       @db.Decimal(12, 2)
  insuranceId   String?       @db.Uuid
  reference     String?                           // Claim ref, transfer ref, etc.
  createdAt     DateTime      @default(now())

  order Order @relation(fields: [orderId], references: [id])

  @@index([orderId])
  @@map("payment_components")
}

enum CoverageType {
  PRIMARY
  SECONDARY
}

enum ClaimStatus {
  PENDING
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  PAID
}

enum BatchInvoiceStatus {
  DRAFT
  GENERATED
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
}

// Extended PaymentMethod enum (replaces current)
enum PaymentMethod {
  CASH
  TRANSFER
  INSURANCE
  EDC
  INSURANCE_CASH_FALLBACK
  CORPORATE_DEFERRED
}

// Extended OrderStatus enum (additions only)
enum OrderStatus {
  PENDING_PAYMENT
  PAID
  SAMPLE_COLLECTED
  IN_ANALYSIS
  VERIFIED
  APPROVED
  NOTIFIED
  CANCELLED
  PAYMENT_OVERDUE           // NEW: 72hr fallback expired
  CLAIM_REJECTED            // NEW: Insurance claim denied
}
```

### 3.5 Insurance Type Constraint

The current `Insurance.type` field is a free-text nullable String. Target state adds an enum constraint:

```prisma
enum InsuranceType {
  BPJS
  SWASTA       // Private
  CORPORATE
}

model Insurance {
  // ... existing fields ...
  type InsuranceType?  // Changed from String? to enum
}
```

### 3.6 Migration Strategy

| Phase | Schema Changes | Risk | Backward Compatible |
|-------|---------------|:----:|:-------------------:|
| Phase 1 | RBAC tables (Permission, RolePermission, UserRole) | Low | ✅ Additive |
| Phase 1 | InsuranceType enum constraint | Low | ✅ Existing values preserved |
| Phase 2 | Insurance junction tables (PatientInsurance, OrderInsurance) | Medium | ✅ Existing FKs preserved during transition |
| Phase 2 | PaymentComponent table + extended PaymentMethod enum | Low | ✅ Additive; single payments still work |
| Phase 3 | BatchInvoice + BpjsOrderDetail | Low | ✅ New entities only |
| Phase 3 | Department, Position, UserDepartment | Low | ✅ Additive |
| Phase 3 | ApprovalRequest, ApprovalStep | Low | ✅ Additive |
| Future | Deprecate `Patient.insuranceId` single FK | Medium | Requires data migration |
| Future | Deprecate `Order.insuranceId` single FK | Medium | Requires data migration |
| Future | Deprecate `User.role` in favor of `UserRole` junction | High | Requires guard rewrite |

---

## 4. Navigation Structure

### 4.1 Recommended: Option C — Hierarchical Navigation

Per the Enterprise Navigation Blueprint (AUDIT-eLIS-2025-NAV-002), the target state adopts **hierarchical navigation with expandable sub-menus** and role-based visibility.

### 4.2 Top-Level Navigation (7 Items)

| # | Menu Item | Route | Lucide Icon | Domain |
|---|-----------|-------|-------------|--------|
| 1 | Dashboard | `/dashboard` | `LayoutDashboard` | — |
| 2 | Pasien | `/dashboard/patients` | `Users` | — |
| 3 | Order & Kasir | `/dashboard/orders` | `FileText` | — |
| 4 | Laboratorium | `/dashboard/laboratory` | `TestTube` | Clinical Operations |
| 5 | Master Data | `/dashboard/master-data` | `Database` | Master Data |
| 6 | Administrasi | `/dashboard/administration` | `Settings` | Administration |
| 7 | Laporan & Audit | `/dashboard/reports` | `BarChart3` | Reporting |

### 4.3 Full Hierarchy (Max 3 Levels, Max 7 Items Per Level)

```
Level 1                    Level 2                         Level 3
─────────────────────────────────────────────────────────────────────
Dashboard                  —                               —
Pasien                     —                               —
Order & Kasir              —                               —
Laboratorium               Antrian Sampel                  —
                           Input Hasil                     —
                           Validasi Dokter                 —
                           Data Klinis                     Kategori Tes
                                                           Tes Lab
                                                           Panel
                           Statistik Lab                   —
Master Data                Dokter                          —
                           Klinik                          —
                           Asuransi                        —
                           Alat & Reagen                   Alat
                                                           Reagen
                           Tipe Sampel                     —
                           Satuan Ukur                     —
                           Wilayah                         —
Administrasi               Pengguna                        —
                           Tarif                           —
                           Pengaturan Sistem               SMTP Settings
                           Audit Trail                     —
Laporan & Audit            Laporan                         —
```

### 4.4 Role-Based Visibility Summary

| Role | Visible Level-1 Items | Primary Use Cases |
|------|:---------------------:|-------------------|
| SUPER_ADMIN | 7 | Full system access |
| OWNER | 7 | Business oversight |
| MANAGER | 6 | Operational management |
| ADMIN | 7 | System administration |
| KASIR | 3 | Payment processing |
| SAMPLING | 3 | Sample collection |
| ANALIS | 3 | Lab analysis |
| DOKTER | 3 | Result validation |
| CS | 3 | Customer service |
| MARKETING | 2 | Patient outreach |
| KLINIK_PARTNER | 3 | External clinic ordering |

### 4.5 Domain Assignment (14 Sub-Features)

| Domain | Sub-Features | Count |
|--------|-------------|:-----:|
| Clinical Operations | Test Categories, Lab Tests, Panels | 3 |
| Administration | Tariffs, Users | 2 |
| Master Data | Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Wilayah | 8 |
| System Configuration | SMTP Settings | 1 |
| Reporting | *(covered by existing "Laporan" menu)* | 0 |

### 4.6 Key Architectural Changes for Navigation

1. **Sidebar component refactor** — Support multi-level expandable menus with role filtering
2. **Auth context in layout** — Expose current user's role to sidebar for visibility filtering
3. **Route restructuring** — Create page directories for `/dashboard/master-data/`, `/dashboard/administration/`, `/dashboard/laboratory/clinical-data/`
4. **Settings page decomposition** — Split single 14-tab page into route-based pages per domain group

---

## 5. Cross-Cutting Concerns

### 5.1 Security Architecture (Target State)

| Layer | Current | Target |
|-------|---------|--------|
| Authentication | JWT + Passport | JWT + Passport (unchanged) |
| Authorization | Flat role matching (RolesGuard) | PermissionGuard with database-driven permissions |
| Endpoint protection | 67.5% fully protected | 100% protected (all endpoints require role/permission) |
| Multi-role support | Single role per user | Multiple roles per user via UserRole junction |
| Data scoping | None | Department-based data isolation |
| Approval workflows | None (except lab) | Multi-step approval for financial, admin, and master data changes |

### 5.2 Observability

| Concern | Current | Target |
|---------|---------|--------|
| Logging | NestJS Logger + LoggingInterceptor | Structured JSON logs + correlation IDs |
| Audit trail | AuditLog entity (basic) | Enhanced AuditLog with permission context and approval chain references |
| Error tracking | AllExceptionsFilter | AllExceptionsFilter + error monitoring service integration |
| Performance | None | TanStack Query devtools (frontend); API response time logging (backend) |

### 5.3 Testing Strategy

| Layer | Current | Target |
|-------|---------|--------|
| Backend unit tests | Present (auth, filters, interceptors) | Expand to all services and controllers |
| Backend integration | Not present | API endpoint integration tests per bounded context |
| Frontend unit tests | Not present | Component tests for critical forms |
| Property-based tests | Present (auth, filter) | Expand to RBAC permission logic and tariff resolution |
| E2E tests | Not present | Playwright tests for critical workflows |

---

## 6. Traceability

### 6.1 Requirement Coverage

| Requirement | Section(s) Addressed |
|-------------|---------------------|
| 7.1 — Target State Architecture (backend, frontend, database, navigation) | §1, §2, §3, §4 |
| RBAC Review Option B recommendation | §3.3 (schema), §1.3 (rbac module), §5.1 |
| Insurance Readiness gaps | §3.4 (schema), §1.3 (insurance module) |
| Navigation Blueprint Option C | §4 (full hierarchy) |
| Architecture compliance improvements | §1 (bounded contexts), §2 (services layer) |

### 6.2 Source Document References

| Document | ID | Key Input |
|----------|-----|-----------|
| Architecture Gap Analysis | AUDIT-eLIS-2026-002 | Compliance score 84.3, frontend gaps, state management |
| Classification Matrix | AUDIT-eLIS-2025-CLS-002 | Module boundary map, proposed structure §4 |
| Navigation Blueprint | AUDIT-eLIS-2025-NAV-002 | Option C hierarchy, role visibility matrix |
| RBAC Review | AUDIT-eLIS-2026-004 | Option B schema, approval matrix |
| Insurance Readiness | AUDIT-eLIS-2026-005 | M2M tables, BatchInvoice, PaymentComponent |

### 6.3 Downstream Dependencies

This document serves as input for:
- **Task 11.2** — ADRs for each major architectural decision
- **Task 11.3** — Migration Path with phased implementation plan
- **Task 12.1** — Main audit report executive summary

---

## 7. Summary of Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Feature-Based with Bounded Contexts (backend) | Formalizes existing pattern; adds interface contracts for testability and decoupling |
| 2 | Formalized Next.js pattern, NOT FSD (frontend) | FSD has 18% compliance; forcing it is XL effort for minimal benefit. Current pattern works. |
| 3 | TanStack Query for server state (frontend) | Resolves #1 state management gap (no caching); industry standard for React |
| 4 | services/ + schemas/ + hooks/ layers (frontend) | Resolves 3 Major violations from architecture gap analysis |
| 5 | Option B Full RBAC (database/backend) | Addresses all 6 missing enterprise capabilities; NIST-aligned for healthcare |
| 6 | Insurance M2M junction tables (database) | Enables multi-payer; preserves backward compat during transition |
| 7 | BatchInvoice entity (database) | Enables corporate billing cycles (up to 500 orders per invoice) |
| 8 | Option C Hierarchical navigation | Resolves 14-item flat menu; stays within 3-level/7-item constraints |
| 9 | Role-based sidebar visibility | Reduces cognitive load per role; only shows relevant features |
| 10 | Extended PaymentMethod enum | Resolves Self-Pay vs Fallback distinction + backend/frontend alignment |

---

*End of Document*
