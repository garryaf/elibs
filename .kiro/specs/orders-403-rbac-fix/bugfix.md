# Bugfix Requirements Document

## Introduction

The `POST /api/v1/orders` endpoint returns 403 Forbidden for users whose roles are not explicitly listed in the `@Roles()` decorator. The `OrderController.create()` method uses `RolesGuard` with a hardcoded allowlist of `[KASIR, ADMIN, KLINIK_PARTNER]`, which performs a simple enum match. This blocks SUPER_ADMIN (who should bypass all permission checks) and other roles that may legitimately need order creation access. The system already has a database-backed `PermissionGuard` with SUPER_ADMIN bypass logic, but it is not used on order endpoints.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user with role SUPER_ADMIN sends POST to `/api/v1/orders` THEN the system returns 403 Forbidden because SUPER_ADMIN is not in the hardcoded roles list

1.2 WHEN a user with any role other than KASIR, ADMIN, or KLINIK_PARTNER sends POST to `/api/v1/orders` THEN the system returns 403 Forbidden regardless of whether they have database-level permission to create orders

1.3 WHEN `RolesGuard` evaluates access for the create order endpoint THEN the system performs only a simple enum match against `[KASIR, ADMIN, KLINIK_PARTNER]` without checking the database-backed permission system or honoring SUPER_ADMIN bypass

### Expected Behavior (Correct)

2.1 WHEN a user with role SUPER_ADMIN sends POST to `/api/v1/orders` THEN the system SHALL allow the request to proceed (SUPER_ADMIN bypasses all permission checks)

2.2 WHEN a user with any role sends POST to `/api/v1/orders` AND that role has the `orders:create` permission granted in the database THEN the system SHALL allow the request to proceed

2.3 WHEN a user with a role that does NOT have `orders:create` permission in the database (and is not SUPER_ADMIN) sends POST to `/api/v1/orders` THEN the system SHALL return 403 Forbidden

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user with role KASIR sends POST to `/api/v1/orders` THEN the system SHALL CONTINUE TO allow order creation (assuming the permission is seeded for KASIR)

3.2 WHEN a user with role ADMIN sends POST to `/api/v1/orders` THEN the system SHALL CONTINUE TO allow order creation (assuming the permission is seeded for ADMIN)

3.3 WHEN a user with role KLINIK_PARTNER sends POST to `/api/v1/orders` THEN the system SHALL CONTINUE TO allow order creation (assuming the permission is seeded for KLINIK_PARTNER)

3.4 WHEN an unauthenticated request is sent to POST `/api/v1/orders` THEN the system SHALL CONTINUE TO return 401 Unauthorized (JwtAuthGuard behavior unchanged)

3.5 WHEN a user accesses other endpoints that use `PermissionGuard` THEN the system SHALL CONTINUE TO enforce permissions as before
