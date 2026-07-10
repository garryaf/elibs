# eLIS Backend — Module Boundaries

## Purpose

This document formalizes the module dependency rules for the eLIS backend.
Interface contracts are defined in `src/common/interfaces/` and serve as the
canonical reference for what each module exposes to other modules.

## Module Dependency Rules

1. Each module exposes its public API through NestJS module exports
2. Interfaces in `src/common/interfaces/` define the contract
3. Modules should depend on interfaces, not implementations (where practical)
4. Circular dependencies are prohibited

## Module Dependency Graph

```
AppModule
├── PrismaModule (global)
├── CryptoModule (global)
├── CacheModule (global)
├── RbacModule
├── UsersModule
├── AuthModule → UsersModule
└── LaboratoryModule
    ├── PatientModule
    ├── OrderModule → VisitModule, AuditModule
    ├── PaymentModule
    ├── LabWorkflowModule
    ├── DashboardModule
    ├── NotificationModule
    ├── MasterDataModule
    ├── RegionModule
    ├── VisitModule
    ├── AuditModule
    └── ReportsModule
```

## Interface Contracts

| Interface File | Module | Defines |
|----------------|--------|---------|
| `src/master-data/interfaces/master-data-query.interface.ts` | MasterData | `IMasterDataQueryService`, `TestMasterView`, `TariffView`, `ReferenceValueView`, `InsuranceView` |
| `src/settings/interfaces/settings-query.interface.ts` | Settings | `ISettingsQueryService` |
| `src/laboratory/notification/interfaces/notification.interface.ts` | Notification | `INotificationService`, `NotificationPayload` |
| `src/approval/interfaces/approval.interface.ts` | Approval | `IApprovalService` |
| `src/common/interfaces/patient.interface.ts` | Patient | `IPatientService`, `PatientInfo` |
| `src/common/interfaces/order.interface.ts` | Order | `IOrderService`, `OrderInfo` |
| `src/common/interfaces/visit.interface.ts` | Visit | `IVisitService`, `VisitInfo` |
| `src/common/interfaces/payment.interface.ts` | Payment | `IPaymentService`, `PaymentComponentInfo` |
| `src/common/interfaces/notification.interface.ts` | Notification (legacy) | `INotificationService` |
| `src/common/interfaces/claim.interface.ts` | Claim | `IClaimService`, `ClaimInfo` |

### Injection Tokens

Each interface has a corresponding injection token constant:

| Token | Module | Maps To |
|-------|--------|---------|
| `MASTER_DATA_QUERY_SERVICE` | MasterDataModule | `MasterDataService` |
| `SETTINGS_QUERY_SERVICE` | SettingsModule | `SettingsService` |
| `NOTIFICATION_SERVICE` | NotificationModule | `NotificationService` |
| `APPROVAL_SERVICE` | ApprovalModule | `ApprovalService` |

## Allowed Cross-Module Dependencies

| From Module | May Import From |
|------------|-----------------|
| OrderModule | VisitModule, AuditModule |
| LabWorkflowModule | (uses PrismaService directly) |
| NotificationModule | (uses PrismaService + BullMQ) |
| PaymentModule | (uses PrismaService directly) |
| DashboardModule | (uses PrismaService directly) |
| ReportsModule | (uses PrismaService directly) |

## Prohibited Dependencies

- No module may import from `AuthModule` (auth is handled at controller level via guards)
- `PatientModule` must not import `OrderModule`
- `MasterDataModule` must not import any domain module

## How to Use

When a module needs functionality from another module:

1. Check if the target module has a defined interface in its `interfaces/` directory
2. Import the interface type and injection token
3. Import the actual NestJS module in the consuming module's `imports` array
4. Inject the service via constructor injection using the token

```typescript
// Example: OrderModule using MasterData via interface contract
import { Inject, Injectable } from '@nestjs/common';
import {
  IMasterDataQueryService,
  MASTER_DATA_QUERY_SERVICE,
} from '../../master-data/interfaces';

@Injectable()
export class OrderService {
  constructor(
    @Inject(MASTER_DATA_QUERY_SERVICE)
    private readonly masterData: IMasterDataQueryService,
  ) {}

  async resolveOrderPricing(testId: string, clinicId?: string) {
    const tariff = await this.masterData.resolveTariff(testId, clinicId);
    return tariff?.price ?? 0;
  }
}
```

> **Note:** Interface contracts are co-located with their owning module (e.g.,
> `src/master-data/interfaces/`). Each module registers its concrete service
> under the interface token via `useExisting`. Consuming modules import the
> owning NestJS module and inject via the token.
