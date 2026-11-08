# eLIS Architecture

eLIS is a monorepo containing a Next.js web application and a NestJS API.
The supported local stack uses Docker Compose with PostgreSQL and Redis.

```text
Browser
  │
  ▼
Next.js web (apps/web, :3000)
  │  /api and /socket.io proxy
  ▼
NestJS API (apps/api, :3001)
  ├── PostgreSQL (Prisma)
  ├── Redis (cache and BullMQ)
  ├── SMTP / WhatsApp integrations
  └── BPJS integrations, when configured
```

## Backend composition

`AppModule` loads platform services (configuration, cache, BullMQ, events,
logging, Prisma, crypto, RBAC, and WebSocket support) together with domain
modules: Users, Auth, Master Data, Laboratory, Health, Settings, Organization,
Approval, and Insurance.

`LaboratoryModule` groups the laboratory domains: audit, patient, visit, order,
payment, workflow, specimen, analyzer import, quality control, critical values,
dashboard, reports, notifications, regional data, and the public portal.

The detailed dependency rules are maintained in
[the backend module-boundary guide](../../apps/api/MODULE_BOUNDARIES.md).

## Request flow

1. The browser requests relative `/api/v1/*` endpoints.
2. In local non-Docker development, Next.js rewrites requests to the API.
   Docker and production deployments route them through the configured proxy.
3. NestJS validates input, authenticates requests where required, applies RBAC,
   and persists data through Prisma.
4. Background and delivery work uses Redis/BullMQ; structured logs include a
   trace identifier.

## Operational boundaries

- The web application must never contain server secrets.
- API configuration comes from environment variables and is validated at boot.
- PostgreSQL is authoritative for transactional data; Redis is used for cache
  and jobs.
- Production uses managed PostgreSQL and Redis with
  [`docker-compose.prod.yml`](../../docker-compose.prod.yml).

See [the deployment guide](../../deploy/README.md) for environment setup and
[the database design](../04-Database/Database-Design-eLIS-v1.0.md) for the
schema source of truth.
