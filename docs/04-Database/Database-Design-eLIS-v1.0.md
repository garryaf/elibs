# eLIS Database Design

PostgreSQL is the transactional data store for eLIS. The canonical schema is
[`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma), and
Prisma migrations in `apps/api/prisma/migrations/` are the deployment history.

## Core domains

| Domain | Examples |
| --- | --- |
| Identity and authorization | users, permissions, role permissions, audit logs |
| Patient care | patients, visits, patient insurance |
| Laboratory workflow | orders, order details, specimens, results, verification, approval |
| Commercial | tariffs, payments, refunds, deposits, claims, invoices |
| Reference data | tests, panels, categories, units, reagents, equipment, regions |
| Operations | application settings, notification records, quality-control data |

The schema uses UUID primary keys, Prisma relations, and application-level
soft-delete fields where the domain requires retention.

## Database workflows

From `apps/api`:

```bash
npx prisma generate
npx prisma migrate deploy
npm run seed
npx prisma studio
```

Use `prisma migrate deploy` for existing migrations in deployed environments.
Do not edit historical migrations; see
[the migration guidance](../../apps/api/prisma/migrations/README.md).

## Local connection

The default Docker Compose mapping exposes PostgreSQL at
`localhost:5433`, while the API container itself connects to `postgres:5432`.
Use the connection strings in [the API environment example](../../apps/api/.env.example)
when running the API outside Docker.

## Data protection

- Patient PII encryption is configured with `ENCRYPTION_KEY` (or the JWT-secret
  fallback documented in the API environment example).
- Production database credentials belong in the untracked deployment environment
  file or an external secrets manager.
- Back up and restore procedures must be operated against the managed production
  PostgreSQL service, not application containers.
