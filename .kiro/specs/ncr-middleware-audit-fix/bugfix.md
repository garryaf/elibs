# Bugfix Requirements Document

## Introduction

This bugfix addresses two Non-Conformance Reports (NCRs) in the eLIS system:

1. **NCR-01-09 (P4 - SUPERSEDED by NCR-01-05)**: The Next.js middleware still accepts the legacy `elis_authenticated` boolean cookie as a valid authentication signal. Although NCR-01-05 introduced JWT expiry validation via the `elis_token` cookie, the fallback to the simple boolean flag remains, allowing authentication bypass by manually setting `elis_authenticated=true` in browser devtools.

2. **NCR-02-05 (P2 - OPEN)**: The `UsersService` performs user CRUD operations (create, update, soft-delete) without calling `AuditService.log()`, leaving no audit trail for user management actions. All mutations must generate audit log entries with the required fields: userId, action, entityName, entityId, oldValues, newValues, and ipAddress.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user manually sets the `elis_authenticated=true` cookie in browser devtools without a valid `elis_token` cookie THEN the system grants access to protected `/dashboard/*` routes without any token validation

1.2 WHEN the `elis_token` cookie is absent or deleted but `elis_authenticated=true` is present THEN the system treats the request as authenticated and allows navigation to protected routes

1.3 WHEN a new user is created via `UsersService.create()` THEN the system does not generate an audit log entry for the CREATE action

1.4 WHEN an existing user is updated via `UsersService.update()` THEN the system does not generate an audit log entry capturing the old and new values

1.5 WHEN a user is soft-deleted via `UsersService.softDelete()` THEN the system does not generate an audit log entry for the DELETE action

### Expected Behavior (Correct)

2.1 WHEN a user manually sets the `elis_authenticated=true` cookie without a valid `elis_token` cookie THEN the system SHALL reject access to protected `/dashboard/*` routes and redirect to the login page

2.2 WHEN the `elis_token` cookie is absent or contains an expired/malformed JWT THEN the system SHALL treat the request as unauthenticated regardless of the `elis_authenticated` cookie value

2.3 WHEN a new user is created via `UsersService.create()` THEN the system SHALL generate an audit log entry with action "CREATE", entityName "User", entityId set to the new user's ID, oldValues as null, newValues containing the created user data (excluding sensitive fields), and the requesting user's ID and IP address

2.4 WHEN an existing user is updated via `UsersService.update()` THEN the system SHALL generate an audit log entry with action "UPDATE", entityName "User", entityId set to the updated user's ID, oldValues containing the previous state, newValues containing the updated state (both excluding sensitive fields), and the requesting user's ID and IP address

2.5 WHEN a user is soft-deleted via `UsersService.softDelete()` THEN the system SHALL generate an audit log entry with action "DELETE", entityName "User", entityId set to the deleted user's ID, oldValues containing the user state before deletion, newValues as null, and the requesting user's ID and IP address

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a valid `elis_token` cookie with a non-expired JWT is present THEN the system SHALL CONTINUE TO grant access to protected `/dashboard/*` routes

3.2 WHEN an unauthenticated user visits the login page (`/`) THEN the system SHALL CONTINUE TO allow access without redirect

3.3 WHEN an authenticated user visits the login page (`/`) THEN the system SHALL CONTINUE TO redirect to `/dashboard`

3.4 WHEN `UsersService.findAll()` or `UsersService.findById()` is called (read operations) THEN the system SHALL CONTINUE TO return user data without generating audit log entries

3.5 WHEN a CRUD operation fails due to validation (e.g., duplicate email, role escalation, self-delete) THEN the system SHALL CONTINUE TO throw the appropriate exception without generating an audit log entry

3.6 WHEN audit logs are recorded THEN the system SHALL CONTINUE TO strip sensitive fields (passwordHash, password, token, secret, accessToken, refreshToken) from oldValues and newValues via `stripSensitiveFields()`
