# eLIS API

NestJS REST API for the Enterprise Laboratory Information System (eLIS).
It owns authentication, RBAC, master data, patient and visit management,
laboratory workflow, payments, reporting, notifications, and public result
portal services.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ and Redis 7+ when running outside Docker
- Dependencies installed from the repository root with `npm ci`

For the supported full-stack local environment, use the root-level Docker
workflow described in [the repository README](../../README.md).

## Configuration

Copy [`.env.example`](.env.example) to `.env` when running the API directly.
The required settings are:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL Prisma connection string |
| `JWT_SECRET` | JWT signing secret; use at least 32 characters |
| `JWT_EXPIRATION` | Access-token lifetime, such as `15m` or `1d` |
| `PORT` | API port; defaults to `3001` in the provided configuration |
| `CORS_ORIGINS` | Comma-separated browser origins |
| `REDIS_HOST`, `REDIS_PORT` | Redis/BullMQ connection |

Optional integrations include `ENCRYPTION_KEY` for PII encryption and BPJS
credentials. Never commit a real `.env` file or production secrets.

## Development

From `apps/api`:

```bash
npm run start:dev
```

The API is available at `http://localhost:3001`. Its health check is
`GET /api/v1/health`.

Database migrations and seed data can be managed with:

```bash
npx prisma migrate deploy
npm run seed
```

The seed process is idempotent. See [test credentials](../../TEST-CREDENTIALS.md)
for the local accounts it provisions.

## API documentation

Swagger is generated from the controllers and is the canonical endpoint
reference while the API is running:

- `http://localhost:3001/api/docs`
- Protected endpoints use an `Authorization: Bearer <access-token>` header.

The API paths already include the `/api/v1` prefix in their controllers. Do not
add a Nest global prefix. A route-area overview is in
[the API specification](../../docs/08-API/API-Docs-eLIS-v1.0.md).

## Quality checks

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

`lint` currently applies ESLint fixes; inspect the worktree after running it.

## Production

Build the API with `npm run build`, then start it with `npm run start:prod`.
For containerized production, use the repository's
[`docker-compose.prod.yml`](../../docker-compose.prod.yml) and the deployment
guide at [../../deploy/README.md](../../deploy/README.md). Set production
secrets through `deploy/env/.env.production`; PostgreSQL and Redis are expected
to be externally managed in that compose profile.
