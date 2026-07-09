# eLIS — Enterprise Laboratory Information System

## Quick Start

### Prerequisites

- Docker & Docker Compose v2+
- Make (included on most Linux/macOS systems)
- Git

### First-Time Setup

```bash
git clone <repo-url> && cd elis

# Create environment files from template (required before first run)
make setup

# Start all services (PostgreSQL, Redis, API, Web)
make dev-up
```

After startup:
- **Web:** http://localhost:3000
- **API:** http://localhost:3001
- **Database:** localhost:5433

### Default Credentials

- Email: `admin@elis.com`
- Password: `admin123`

(Seeded automatically on first run via migrations)

---

## Development Commands

| Command | Description |
|---------|-------------|
| `make setup` | Create env files from template (first-time only) |
| `make dev-up` | Start all services locally (Docker) |
| `make dev-down` | Stop all local services |
| `make dev-logs` | View logs from all services |
| `make dev-logs-api` | View API logs only |
| `make test` | Run all backend tests |
| `make test-pbt` | Run property-based tests only |
| `make db-studio` | Open Prisma Studio (DB GUI) |
| `make clean` | Remove all containers, volumes, and build artifacts |
| `make help` | Show all available commands |

---

## Production Deployment

### On a Fresh VPS

```bash
git clone <repo-url> && cd elis

# Create environment files
make setup

# Edit production environment with real credentials
nano deploy/env/.env.production
# → Replace ALL 'CHANGE_ME' values with actual secrets
# → Set DATABASE_URL to your managed PostgreSQL endpoint
# → Set REDIS_HOST to your managed Redis endpoint
# → Set JWT_SECRET to a strong random string (≥32 chars)
# → Set CORS_ORIGINS to your production domain

# Deploy
make prod-up
```

### Environment Files

| File | Purpose | In Git? |
|------|---------|---------|
| `deploy/env/.env.example` | Template with all required variables | ✅ Yes |
| `deploy/env/.env.local` | Local development values | ❌ No (gitignored) |
| `deploy/env/.env.production` | Production secrets | ❌ No (gitignored) |

> Environment files contain secrets and are intentionally excluded from git.
> Run `make setup` after cloning to create them from the template.

### Architecture

```
docker-compose.yml          → Local dev (includes PostgreSQL + Redis)
docker-compose.prod.yml     → Production (API + Web only; expects external DB/Redis)
```

---

## Project Structure

```
elis/
├── apps/
│   ├── api/              # NestJS backend (REST API)
│   └── web/              # Next.js frontend
├── deploy/
│   └── env/              # Environment file templates
├── docs/                 # Documentation & audit reports
├── docker-compose.yml    # Local development
├── docker-compose.prod.yml # Production deployment
└── Makefile              # Development & deployment commands
```

---

## Documentation

- [Architecture](docs/03-Architecture/Architecture-eLIS-v1.0.md)
- [API Specification](docs/08-API/API-Docs-eLIS-v1.0.md)
- [Database Design](docs/04-Database/Database-Design-eLIS-v1.0.md)
- [Deployment Audit](docs/17-Audit/deployment-audit.md)
