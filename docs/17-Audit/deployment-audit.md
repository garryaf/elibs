# Deployment Readiness Audit

Last reviewed: 2026-11-03

This document is a deployment checklist, not evidence that a particular
environment is currently compliant.

## Required before production deployment

- [ ] `deploy/env/.env.production` exists locally and is not committed.
- [ ] `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, and Redis settings use
  production values.
- [ ] `JWT_SECRET` and any PII encryption key are strong, unique secrets.
- [ ] Managed PostgreSQL and Redis are reachable from the API environment.
- [ ] `npx prisma migrate deploy` has completed successfully.
- [ ] The idempotent seed process has been reviewed for the target environment.
- [ ] TLS, domain routing, and reverse-proxy rules are configured.
- [ ] Health endpoint `GET /api/v1/health` returns a healthy database status.
- [ ] A tested database backup and restore process exists.

## Release verification

1. Build the API and web applications.
2. Run the documented API and web test suites.
3. Deploy with `docker-compose.prod.yml` or the supported VPS workflow.
4. Verify API health, Swagger availability, login, an authenticated workflow,
   and public report delivery as applicable.
5. Review structured logs and background worker connectivity.

## References

- [Deployment guide](../../deploy/README.md)
- [Environment template](../../deploy/env/.env.example)
- [API README](../../apps/api/README.md)
- [Web README](../../apps/web/README.md)
