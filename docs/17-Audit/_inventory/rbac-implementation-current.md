# Current RBAC Implementation Documentation

| Field | Value |
|-------|-------|
| **Document ID** | AUDIT-eLIS-2026-001-RBAC |
| **Version** | 1.0 |
| **Date** | 2026-07-09 |
| **Author** | Enterprise Architect |
| **Classification** | Internal |
| **Status** | Draft |

## Purpose

This document provides a complete inventory of the current Role-Based Access Control (RBAC) implementation in the eLIS backend API. It serves as input for tasks 7.2–7.5 (enterprise RBAC evaluation, access matrix generation, approval workflow assessment, and unguarded endpoint detection).

**Validates: Requirement 5.1**

---

## 1. Role Enum Definition

**Source**: `apps/api/prisma/schema.prisma`

The system defines **11 roles** in the Prisma `Role` enum:

| # | Role Value | Description (inferred from usage) |
|---|-----------|----------------------------------|
| 1 | `SUPER_ADMIN` | Full system access; can delete users, approve lab results, manage all settings |
| 2 | `OWNER` | Business owner; access to dashboard analytics and executive summaries |
| 3 | `MANAGER` | Operational management; access to dashboards and reporting |
| 4 | `KASIR` | Cashier; handles payments, order creation, patient registration |
| 5 | `ADMIN` | Administrative; manages users, master data, settings, lab workflow oversight |
| 6 | `SAMPLING` | Sample collection staff; confirms sample receipt, views lab queue |
| 7 | `ANALIS` | Lab analyst; enters results, verifies results, views delta checks |
| 8 | `DOKTER` | Doctor/pathologist; approves lab results, views approval queue and delta checks |
| 9 | `CS` | Customer service; registers patients, views dashboard summary |
| 10 | `MARKETING` | Marketing staff; no endpoints currently assigned |
| 11 | `KLINIK_PARTNER` | Partner clinic; creates orders, registers patients |

### Role Storage Model

- Each `User` has exactly **one** `role` field (single role per user, no multi-role assignment)
- Role is stored as a PostgreSQL enum type mapped from Prisma
- No separate Permission, RolePermission, or Department entities exist

---

## 2. Guard Implementation Mechanism

### 2.1 Architecture Overview

The RBAC system uses a **two-layer guard approach** implemented via NestJS decorators and guards:

```
Request → JwtAuthGuard (authentication) → RolesGuard (authorization) → Handler
```

### 2.2 JwtAuthGuard

**Source**: `apps/api/src/common/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- Extends Passport's `AuthGuard('jwt')`
- Validates JWT token from the `Authorization: Bearer <token>` header
- Populates `request.user` with the decoded JWT payload (includes `id`, `email`, `role`)
- If token is invalid or missing, returns 401 Unauthorized

### 2.3 RolesGuard

**Source**: `apps/api/src/common/guards/roles.guard.ts`

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // No @Roles decorator → allow all authenticated users
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}
```

**Key behaviors**:
- Uses `Reflector.getAllAndOverride()` to check handler-level first, then class-level `@Roles` metadata
- If **no `@Roles` decorator** is present → grants access to any authenticated user
- Performs **flat role matching** — `user.role === requiredRole` (no hierarchy, no inheritance)
- Returns `false` (403 Forbidden) if user's role is not in the required roles list

### 2.4 @Roles Decorator

**Source**: `apps/api/src/common/decorators/roles.decorator.ts`

```typescript
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- Custom decorator using NestJS `SetMetadata`
- Accepts one or more `Role` enum values
- Can be applied at **method level** (per-endpoint) or **class level** (all endpoints in controller)
- Method-level `@Roles` overrides class-level `@Roles` (due to `getAllAndOverride` behavior)

### 2.5 @CurrentUser Decorator

**Source**: `apps/api/src/common/decorators/current-user.decorator.ts`

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- Parameter decorator that extracts the authenticated user from `request.user`
- Used in handlers that need the current user's ID or role for business logic (e.g., audit trails, ownership checks)

### 2.6 Guard Application Patterns

Three patterns are observed across controllers:

| Pattern | Example | Effect |
|---------|---------|--------|
| **Class-level guards + class-level roles** | `TariffController`, `AuditController`, `SettingsController`, `DashboardController` | All endpoints in the controller share the same guards and roles |
| **Class-level guards + method-level roles** | `UsersController` | Guards applied once, but each method specifies its own roles |
| **Method-level guards + method-level roles** | `MasterDataController`, `OrderController`, `PatientController`, `LabWorkflowController` | Each method individually declares guards and roles |
| **No guards at all** | `AuthController`, `HealthController`, `RegionController` (GET endpoints) | Public or unauthenticated access |

---

## 3. Complete Endpoint-to-Role Mapping

### 3.1 Auth Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 1 | POST | `/api/v1/auth/login` | None | None | Public endpoint — authentication entry point |

### 3.2 Users Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 2 | POST | `/api/v1/users` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create user |
| 3 | GET | `/api/v1/users` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | List users |
| 4 | GET | `/api/v1/users/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Get user by ID |
| 5 | PUT | `/api/v1/users/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update user |
| 6 | DELETE | `/api/v1/users/:id` | JwtAuthGuard, RolesGuard | SUPER_ADMIN | Delete user (soft) |

### 3.3 Health Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 7 | GET | `/api/v1/health` | None | None | Public health-check endpoint |

### 3.4 Master Data — Test Categories, Tests, Panels

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 8 | GET | `/api/v1/master/test-categories` | JwtAuthGuard | None (any authenticated) | List categories |
| 9 | POST | `/api/v1/master/test-categories` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create category |
| 10 | PUT | `/api/v1/master/test-categories/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update category |
| 11 | DELETE | `/api/v1/master/test-categories/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete category |
| 12 | GET | `/api/v1/master/tests` | JwtAuthGuard | None (any authenticated) | List tests |
| 13 | POST | `/api/v1/master/tests` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create test |
| 14 | PUT | `/api/v1/master/tests/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update test |
| 15 | DELETE | `/api/v1/master/tests/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete test |
| 16 | GET | `/api/v1/master/panels` | JwtAuthGuard | None (any authenticated) | List panels |
| 17 | POST | `/api/v1/master/panels` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create panel |
| 18 | PUT | `/api/v1/master/panels/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update panel |
| 19 | DELETE | `/api/v1/master/panels/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete panel |

### 3.5 Master Data — Reference Entities (Doctors, Clinics, Insurances, Equipment, Reagents, Sample Types, Units)

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 20 | GET | `/api/v1/master/doctors` | JwtAuthGuard | None (any authenticated) | List doctors |
| 21 | POST | `/api/v1/master/doctors` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create doctor |
| 22 | PUT | `/api/v1/master/doctors/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update doctor |
| 23 | DELETE | `/api/v1/master/doctors/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete doctor |
| 24 | GET | `/api/v1/master/clinics` | JwtAuthGuard | None (any authenticated) | List clinics |
| 25 | POST | `/api/v1/master/clinics` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create clinic |
| 26 | PUT | `/api/v1/master/clinics/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update clinic |
| 27 | DELETE | `/api/v1/master/clinics/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete clinic |
| 28 | GET | `/api/v1/master/insurances` | JwtAuthGuard | None (any authenticated) | List insurances |
| 29 | POST | `/api/v1/master/insurances` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create insurance |
| 30 | PUT | `/api/v1/master/insurances/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update insurance |
| 31 | DELETE | `/api/v1/master/insurances/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete insurance |
| 32 | GET | `/api/v1/master/equipments` | JwtAuthGuard | None (any authenticated) | List equipment |
| 33 | POST | `/api/v1/master/equipments` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create equipment |
| 34 | PUT | `/api/v1/master/equipments/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update equipment |
| 35 | DELETE | `/api/v1/master/equipments/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete equipment |
| 36 | GET | `/api/v1/master/reagents` | JwtAuthGuard | None (any authenticated) | List reagents |
| 37 | POST | `/api/v1/master/reagents` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create reagent |
| 38 | PUT | `/api/v1/master/reagents/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update reagent |
| 39 | DELETE | `/api/v1/master/reagents/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete reagent |
| 40 | GET | `/api/v1/master/sample-types` | JwtAuthGuard | None (any authenticated) | List sample types |
| 41 | POST | `/api/v1/master/sample-types` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create sample type |
| 42 | PUT | `/api/v1/master/sample-types/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update sample type |
| 43 | DELETE | `/api/v1/master/sample-types/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete sample type |
| 44 | GET | `/api/v1/master/units` | JwtAuthGuard | None (any authenticated) | List measurement units |
| 45 | POST | `/api/v1/master/units` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create unit |
| 46 | PUT | `/api/v1/master/units/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update unit |
| 47 | DELETE | `/api/v1/master/units/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete unit |

### 3.6 Master Data — Tariffs

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 48 | GET | `/api/v1/master/tariffs` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | List tariffs (class-level) |
| 49 | POST | `/api/v1/master/tariffs` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Create tariff |
| 50 | PUT | `/api/v1/master/tariffs/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update tariff |
| 51 | DELETE | `/api/v1/master/tariffs/:id` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Delete tariff |

### 3.7 Orders Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 52 | POST | `/api/v1/orders` | JwtAuthGuard, RolesGuard | KASIR, ADMIN, KLINIK_PARTNER | Create order |
| 53 | GET | `/api/v1/orders` | JwtAuthGuard | None (any authenticated) | List orders |
| 54 | GET | `/api/v1/orders/:id` | JwtAuthGuard | None (any authenticated) | Get order by ID |
| 55 | POST | `/api/v1/orders/:id/cancel` | JwtAuthGuard, RolesGuard | KASIR, ADMIN, SUPER_ADMIN | Cancel order |

### 3.8 Payment Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 56 | POST | `/api/v1/orders/:id/pay` | JwtAuthGuard, RolesGuard | KASIR, ADMIN | Process payment |
| 57 | GET | `/api/v1/orders/:id/barcode` | JwtAuthGuard | None (any authenticated) | Get barcode |
| 58 | GET | `/api/v1/orders/:id/invoice` | JwtAuthGuard | None (any authenticated) | Get invoice |

### 3.9 Patient Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 59 | POST | `/api/v1/patients` | JwtAuthGuard, RolesGuard | KASIR, CS, ADMIN, KLINIK_PARTNER | Register patient |
| 60 | GET | `/api/v1/patients` | JwtAuthGuard | None (any authenticated) | List patients |
| 61 | GET | `/api/v1/patients/:id` | JwtAuthGuard | None (any authenticated) | Get patient by ID |
| 62 | PUT | `/api/v1/patients/:id` | JwtAuthGuard, RolesGuard | KASIR, CS, ADMIN | Update patient |

### 3.10 Region Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 63 | GET | `/api/v1/regions/provinsi` | None | None | **PUBLIC** — no guards applied |
| 64 | GET | `/api/v1/regions/kabupaten-kota` | None | None | **PUBLIC** — no guards applied |
| 65 | GET | `/api/v1/regions/kecamatan` | None | None | **PUBLIC** — no guards applied |
| 66 | GET | `/api/v1/regions/kelurahan-desa` | None | None | **PUBLIC** — no guards applied |
| 67 | POST | `/api/v1/regions/sync` | JwtAuthGuard, RolesGuard | ADMIN | Sync regions from external source |

### 3.11 Lab Workflow Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 68 | POST | `/api/v1/lab/:orderId/sample` | JwtAuthGuard, RolesGuard | SAMPLING, ADMIN | Confirm sample collection |
| 69 | GET | `/api/v1/lab/queue` | JwtAuthGuard, RolesGuard | SAMPLING, ANALIS, DOKTER, ADMIN, SUPER_ADMIN | View lab queue |
| 70 | GET | `/api/v1/lab/approval-queue` | JwtAuthGuard, RolesGuard | DOKTER, SUPER_ADMIN, ADMIN | View approval queue |
| 71 | PUT | `/api/v1/lab/:orderId/results` | JwtAuthGuard, RolesGuard | ANALIS, ADMIN | Enter test results |
| 72 | GET | `/api/v1/lab/:orderId/delta-check` | JwtAuthGuard, RolesGuard | ANALIS, DOKTER, ADMIN | View delta check |
| 73 | POST | `/api/v1/lab/:orderId/verify` | JwtAuthGuard, RolesGuard | ANALIS, ADMIN | Verify results |
| 74 | POST | `/api/v1/lab/:orderId/approve` | JwtAuthGuard, RolesGuard | DOKTER, SUPER_ADMIN | Approve results (final) |

### 3.12 Dashboard Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 75 | GET | `/api/v1/dashboard/executive-summary` | JwtAuthGuard, RolesGuard | OWNER, MANAGER, ADMIN, SUPER_ADMIN, KASIR, CS | Executive summary |
| 76 | GET | `/api/v1/dashboard/recent-orders` | JwtAuthGuard, RolesGuard | OWNER, MANAGER, ADMIN, SUPER_ADMIN, KASIR, CS | Recent orders |
| 77 | GET | `/api/v1/dashboard/lab-summary` | JwtAuthGuard, RolesGuard | OWNER, MANAGER, ADMIN, SUPER_ADMIN | Lab summary |
| 78 | GET | `/api/v1/dashboard/lab-volume` | JwtAuthGuard, RolesGuard | OWNER, MANAGER, ADMIN, SUPER_ADMIN | Lab volume trends |
| 79 | GET | `/api/v1/dashboard/region-distribution` | JwtAuthGuard, RolesGuard | OWNER, MANAGER, ADMIN, SUPER_ADMIN | Region distribution |

### 3.13 Audit Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 80 | GET | `/api/v1/audit-logs` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | View audit logs (class-level) |

### 3.14 Settings Module

| # | Method | Path | Guards | Roles | Notes |
|---|--------|------|--------|-------|-------|
| 81 | GET | `/api/v1/settings/smtp` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Get SMTP settings (class-level) |
| 82 | PUT | `/api/v1/settings/smtp` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Update SMTP settings |
| 83 | POST | `/api/v1/settings/smtp/test` | JwtAuthGuard, RolesGuard | ADMIN, SUPER_ADMIN | Send test email |

---

## 4. Role Usage Summary

### 4.1 Role-to-Endpoint Count Matrix

| Role | Endpoints Accessible | Percentage of Total (83) |
|------|---------------------|--------------------------|
| SUPER_ADMIN | 69 | 83.1% |
| ADMIN | 68 | 81.9% |
| OWNER | 5 | 6.0% |
| MANAGER | 5 | 6.0% |
| KASIR | 9 | 10.8% |
| SAMPLING | 2 | 2.4% |
| ANALIS | 5 | 6.0% |
| DOKTER | 4 | 4.8% |
| CS | 4 | 4.8% |
| MARKETING | 0 | 0.0% |
| KLINIK_PARTNER | 2 | 2.4% |

> **Note**: Endpoints with "None (any authenticated)" roles are accessible by ALL roles when authenticated. Adding those (13 endpoints with JwtAuthGuard only + 4 public region endpoints), the effective numbers are higher:

| Role | With Role Gate | + Any-Authenticated | + Public | Effective Total |
|------|---------------|--------------------:|----------|-----------------|
| SUPER_ADMIN | 56 | +13 | +6 | 75 |
| ADMIN | 55 | +13 | +6 | 74 |
| OWNER | 5 | +13 | +6 | 24 |
| MANAGER | 5 | +13 | +6 | 24 |
| KASIR | 9 | +13 | +6 | 28 |
| SAMPLING | 2 | +13 | +6 | 21 |
| ANALIS | 5 | +13 | +6 | 24 |
| DOKTER | 4 | +13 | +6 | 23 |
| CS | 4 | +13 | +6 | 23 |
| MARKETING | 0 | +13 | +6 | 19 |
| KLINIK_PARTNER | 2 | +13 | +6 | 21 |

### 4.2 Endpoint Protection Classification

| Classification | Count | Percentage | Description |
|---------------|-------|------------|-------------|
| Fully protected (JwtAuthGuard + RolesGuard + @Roles) | 56 | 67.5% | Both authenticated and role-restricted |
| Authenticated only (JwtAuthGuard, no @Roles) | 13 | 15.7% | Any logged-in user can access |
| Public (no guards at all) | 6 | 7.2% | No authentication required |
| Intentionally public | 6 | 7.2% | Auth/login, health check, region GETs |

**Breakdown of public endpoints:**
1. `POST /api/v1/auth/login` — Authentication entry (intentionally public)
2. `GET /api/v1/health` — Infrastructure health check (intentionally public)
3. `GET /api/v1/regions/provinsi` — Region reference data (public)
4. `GET /api/v1/regions/kabupaten-kota` — Region reference data (public)
5. `GET /api/v1/regions/kecamatan` — Region reference data (public)
6. `GET /api/v1/regions/kelurahan-desa` — Region reference data (public)

---

## 5. Security Observations

### 5.1 Findings for Downstream Task 7.5

| Finding ID | Severity | Endpoint | Issue |
|-----------|----------|----------|-------|
| RBAC-SEC-001 | Medium | `GET /api/v1/regions/provinsi` | Public without JwtAuthGuard — exposes region data to unauthenticated users |
| RBAC-SEC-002 | Medium | `GET /api/v1/regions/kabupaten-kota` | Same as above |
| RBAC-SEC-003 | Medium | `GET /api/v1/regions/kecamatan` | Same as above |
| RBAC-SEC-004 | Medium | `GET /api/v1/regions/kelurahan-desa` | Same as above |
| RBAC-SEC-005 | Low | 13 endpoints with JwtAuthGuard only | No role restriction — any authenticated user (including MARKETING which has no business function yet) can access patient, order, and master data read endpoints |

> **Note**: Region endpoints being public may be intentional (used in patient registration forms without requiring login first). This should be confirmed during task 7.5.

### 5.2 Architectural Limitations

| # | Limitation | Impact |
|---|-----------|--------|
| 1 | **Single role per user** — no role composition | User can only have one role; a staff member who is both KASIR and SAMPLING must have two accounts or one broader role |
| 2 | **No role hierarchy** — flat matching only | SUPER_ADMIN does not automatically inherit all permissions; must be explicitly listed on every endpoint |
| 3 | **No permission granularity** — role is the finest grain | Cannot grant "read tariffs but not edit" to a specific role; the entire endpoint is either allowed or denied |
| 4 | **No department/position context** — role is global | Cannot restrict a DOKTER to only their own clinic's approval queue |
| 5 | **No data-level filtering** — authorization is endpoint-level only | Any KASIR can see all patients/orders, not just those from their location |
| 6 | **MARKETING role is unused** — no endpoints are restricted to this role | Dead role that exists in the enum but has no functional purpose |
| 7 | **RolesGuard passes when no @Roles** — silent open access | If a developer forgets to add @Roles to a guarded endpoint, all authenticated users gain access |

---

## 6. Controller Source File Reference

| Controller | Source File | Guard Pattern |
|-----------|-------------|---------------|
| AuthController | `apps/api/src/auth/auth.controller.ts` | No guards |
| UsersController | `apps/api/src/users/users.controller.ts` | Class-level guards, method-level roles |
| HealthController | `apps/api/src/health/health.controller.ts` | No guards |
| MasterDataController | `apps/api/src/laboratory/master-data/master-data.controller.ts` | Method-level guards and roles |
| DoctorController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| ClinicController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| InsuranceController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| EquipmentController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| ReagentController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| SampleTypeController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| MeasurementUnitController | `apps/api/src/laboratory/master-data/reference-master.controller.ts` | Method-level guards and roles |
| TariffController | `apps/api/src/laboratory/master-data/tariff.controller.ts` | Class-level guards and roles |
| OrderController | `apps/api/src/laboratory/order/order.controller.ts` | Method-level guards and roles |
| PatientController | `apps/api/src/laboratory/patient/patient.controller.ts` | Method-level guards and roles |
| PaymentController | `apps/api/src/laboratory/payment/payment.controller.ts` | Method-level guards and roles |
| RegionController | `apps/api/src/laboratory/region/region.controller.ts` | Mixed (most public, sync protected) |
| LabWorkflowController | `apps/api/src/laboratory/lab-workflow/lab-workflow.controller.ts` | Method-level guards and roles |
| DashboardController | `apps/api/src/laboratory/dashboard/dashboard.controller.ts` | Class-level guards, method-level roles |
| AuditController | `apps/api/src/laboratory/audit/audit.controller.ts` | Class-level guards and roles |
| SettingsController | `apps/api/src/laboratory/notification/settings.controller.ts` | Class-level guards and roles |

---

## 7. Access Mode Attestation

| Directory | Access Mode | Operations Performed |
|-----------|-------------|---------------------|
| `apps/api/prisma/schema.prisma` | READ-ONLY | Read Role enum definition |
| `apps/api/src/common/guards/` | READ-ONLY | Read JwtAuthGuard and RolesGuard implementations |
| `apps/api/src/common/decorators/` | READ-ONLY | Read @Roles and @CurrentUser decorators |
| `apps/api/src/auth/` | READ-ONLY | Read AuthController for guard analysis |
| `apps/api/src/users/` | READ-ONLY | Read UsersController for guard analysis |
| `apps/api/src/health/` | READ-ONLY | Read HealthController for guard analysis |
| `apps/api/src/laboratory/master-data/` | READ-ONLY | Read MasterData, ReferenceMaster, Tariff controllers |
| `apps/api/src/laboratory/order/` | READ-ONLY | Read OrderController for guard analysis |
| `apps/api/src/laboratory/patient/` | READ-ONLY | Read PatientController for guard analysis |
| `apps/api/src/laboratory/payment/` | READ-ONLY | Read PaymentController for guard analysis |
| `apps/api/src/laboratory/region/` | READ-ONLY | Read RegionController for guard analysis |
| `apps/api/src/laboratory/lab-workflow/` | READ-ONLY | Read LabWorkflowController for guard analysis |
| `apps/api/src/laboratory/dashboard/` | READ-ONLY | Read DashboardController for guard analysis |
| `apps/api/src/laboratory/audit/` | READ-ONLY | Read AuditController for guard analysis |
| `apps/api/src/laboratory/notification/` | READ-ONLY | Read SettingsController for guard analysis |
| `docs/17-Audit/_inventory/` | READ + WRITE | Wrote this documentation |

**No source code files were created, modified, or deleted during this analysis.**

---

*End of Current RBAC Implementation Documentation — Generated for Enterprise Admin Architecture Audit Task 7.1*
