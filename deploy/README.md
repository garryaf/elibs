# eLIS Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        eLIS Architecture                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────┐     ┌─────────┐     ┌─────────────┐                │
│  │   Web   │────▶│   API   │────▶│ PostgreSQL  │                │
│  │ Next.js │     │ NestJS  │     │  (Managed)  │                │
│  │ :3000   │     │ :3001   │     └─────────────┘                │
│  └─────────┘     │         │                                      │
│                   │         │────▶┌─────────────┐                │
│                   │         │     │    Redis     │                │
│                   └─────────┘     │  (Managed)  │                │
│                                   └─────────────┘                │
└──────────────────────────────────────────────────────────────────┘
```

## Environments

| Environment | DB | Redis | Compose File | Env File |
|-------------|-------|-------|--------------|----------|
| **Local Dev** | Docker container | Docker container | `docker-compose.yml` | `deploy/env/.env.local` |
| **Production** | Managed (RDS/Cloud SQL) | Managed (ElastiCache) | `docker-compose.prod.yml` | `deploy/env/.env.production` |

## Quick Start — Local Development

```bash
# Start everything
make dev-up

# Or manually:
docker compose up -d --build

# Seed admin user
make db-seed

# Access:
# Web: http://localhost:3000
# API: http://localhost:3001
# Health: http://localhost:3001/api/v1/health
```

## Production Deployment

```bash
# 1. Configure environment
cp deploy/env/.env.example deploy/env/.env.production
# Edit .env.production with real values (managed DB URL, Redis endpoint, etc.)

# 2. Deploy
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify
curl https://api.elis.example.com/api/v1/health
```

## Environment Variables

All configuration is externalized via environment variables (12-Factor App):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRATION` | ✅ | — | Token TTL (e.g., `15m`, `1d`) |
| `CORS_ORIGINS` | ✅ | — | Comma-separated allowed origins |
| `PORT` | ❌ | 3001 | API server port |
| `REDIS_HOST` | ❌ | localhost | Redis hostname |
| `REDIS_PORT` | ❌ | 6379 | Redis port |
| `RUN_MIGRATIONS` | ❌ | true | Run Prisma migrations on start |
| `NODE_ENV` | ❌ | development | Environment mode |

## Switching Environments

The application switches between environments **only by changing env vars**:

```bash
# Local → points to Docker containers
DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/elis_db
REDIS_HOST=redis

# Production → points to managed services
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/elis_db?sslmode=require
REDIS_HOST=elasticache-endpoint.cache.amazonaws.com
```

No code changes needed. No business logic modified.
