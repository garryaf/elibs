# Backlog — Documentation and Source Alignment

Audit date: 2026-11-03

This backlog was derived from the checked-in documentation and the current source
tree. It intentionally does not cover uncommitted implementation changes.

## P0 — Restore the canonical documentation entry points

**Problem.** The root README links to Architecture, API Specification, Database
Design, and Deployment Audit files under `docs/`, but that directory is absent.
At least the deployment-audit target is therefore a broken local link. The API
and web READMEs are still their upstream NestJS and Next.js templates, so they
do not document eLIS setup, local workflows, or service-specific commands.

**Scope.**

- Restore or replace the missing canonical documents.
- Replace `apps/api/README.md` and `apps/web/README.md` with eLIS-specific
  instructions.
- Verify all local Markdown links in CI.

**Acceptance criteria.**

- Every local link in root and app READMEs resolves in a clean clone.
- API and web READMEs explain prerequisites, environment variables, development,
  test, build, and production commands.
- The API reference points to the actual `/api/v1/*` endpoint surface (or its
  generated OpenAPI/Swagger location).

## P0 — Reconcile setup, seed, credentials, and port documentation

**Problem.** Documentation says the database is exposed at `localhost:5433`,
while the Makefile reports `localhost:5432`. The documented canonical seed is
the Prisma seed chain, but `make db-seed` contains a separate legacy inline
seed with a different account (`admin@elis.com` / `admin123`) than the README
and `TEST-CREDENTIALS.md` (`admin@elis.local` / `Admin@1234`).

**Scope.**

- Choose one supported local database port and document it consistently.
- Make `make db-seed` delegate to the supported Prisma seed workflow, or clearly
  document a deliberately separate minimal seed.
- Publish one authoritative credentials source and reference it everywhere.

**Acceptance criteria.**

- `make setup`, `make dev-up`, and `make db-seed` work from a clean clone.
- The credentials produced by the supported seed match the documented ones.
- README, deployment guide, Compose configuration, and Makefile agree on ports
  and commands.

## P1 — Regenerate the frontend route map

**Problem.** `apps/web/ROUTING.md` says it is auto-generated but it is stale.
It lists the removed/nonexistent `/dashboard/laboratory/dashboard-stats` route
and omits active routes, including billing, discount approvals, analyzer, QC,
critical values, specimens, verification, price lists, visit/patient details,
the report route, and the public portal.

**Scope.**

- Generate the map from `apps/web/src/app/`, or maintain it alongside route
  changes.
- Include dynamic routes and mark public versus authenticated routes.
- Add a verification step so the document cannot drift.

**Acceptance criteria.**

- Every `page.tsx` route is represented exactly once.
- No route in the document lacks a corresponding route file.
- Sidebar and laboratory navigation targets are documented.

## P1 — Update backend module-boundary documentation

**Problem.** `apps/api/MODULE_BOUNDARIES.md` predates current imports in
`AppModule` and the laboratory module structure. It omits, among others,
Settings, Organization, Approval, Insurance, WebSocket, Analyzer, Critical
Value, QC, Specimen, Payment, Portal, and Dashboard modules.

**Scope.**

- Update the module graph from the actual Nest module imports/exports.
- Recheck the declared interface tokens and allowed cross-module dependencies.
- Add a lightweight architecture check or documented review procedure.

**Acceptance criteria.**

- The graph reflects `AppModule` and `LaboratoryModule` accurately.
- Every documented interface/token has a concrete provider and consumer
  example, where applicable.
- New cross-module dependencies have an explicit documented rule.

## P2 — Remove legacy-source references from developer documentation

**Problem.** Several docs still describe an earlier project skeleton or older
feature set. This makes the repository hard to onboard and masks the current
feature surface (claims, refunds, batches, quality control, analyzer imports,
critical values, notification/portal delivery, and approval workflows).

**Scope.**

- Create a concise feature/module index at repository root.
- Update `deploy/README.md` and testing documentation to point to current
  commands and end-to-end workflows.
- Document operational dependencies such as PostgreSQL, Redis, SMTP, WhatsApp,
  and regional-data synchronization.

**Acceptance criteria.**

- A new developer can identify the owning module, route, and API area for each
  major workflow.
- Setup, deployment, and testing pages contain no references to the Nest/Next
  starter templates.
