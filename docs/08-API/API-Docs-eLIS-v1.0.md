# eLIS API Specification

The running Swagger UI is the canonical API contract:

- Local: `http://localhost:3001/api/docs`
- Base path: `/api/v1`
- Authentication: Bearer JWT unless an endpoint is explicitly public

Controllers define their paths directly, so the API bootstrap does not add a
global prefix. Generated Swagger metadata is authoritative for request and
response schemas.

## Route areas

| Area | Base route |
| --- | --- |
| Authentication | `/api/v1/auth` |
| Users and RBAC | `/api/v1/users`, `/api/v1/rbac` |
| Patients and visits | `/api/v1/patients`, `/api/v1/visits` |
| Orders and laboratory workflow | `/api/v1/orders`, `/api/v1/lab` |
| Specimens and analyzer imports | `/api/v1/specimens`, `/api/v1/analyzer` |
| Payments and invoices | `/api/v1/orders/:id`, `/api/v1/payments`, `/api/v1/batch-invoices` |
| Master data and pricing | `/api/v1/master`, `/api/v1/master/price-lists` |
| Reporting and notifications | `/api/v1/reports`, `/api/v1/notifications` |
| Settings and organization | `/api/v1/settings`, `/api/v1` |
| Quality and critical values | `/api/v1/qc`, `/api/v1/critical-values` |
| Approvals and insurance | `/api/v1/approvals`, `/api/v1/approvals/discount` |
| Public result portal | `/api/v1/portal` |
| Operations | `/api/v1/health` |

This list is a navigation aid, not a substitute for Swagger. Some route areas
contain nested resources and permission-specific operations.

## Authentication flow

1. `POST /api/v1/auth/login` returns an access token and refresh token.
2. Send the access token as `Authorization: Bearer <token>`.
3. Use `POST /api/v1/auth/refresh` to obtain a replacement token.
4. Use `POST /api/v1/auth/logout` to invalidate the active session.

## Response handling

The API applies a global response transform. Consumers should rely on the
schemas displayed in Swagger rather than duplicating response wrappers. Errors
are produced by the global exception filter with an HTTP status code and a
machine-readable message.

For setup and test commands, see [the API README](../../apps/api/README.md).
