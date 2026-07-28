# Prisma Migrations

## Known Historical Migration Issues

### Duplicate Enum Creation (HIGH-002)
During the early development phases, some migrations may contain statements attempting to create enums that already exist (e.g. `CREATE TYPE`). This is a known historical issue.

**Impact:** None (False Positive).
**Reason:** The migrations have idempotent guards (`IF NOT EXISTS` or similar) or are historical and have already been applied to the database. These will not cause errors during runtime or future database deployments.
**Action:** Do not attempt to modify historical migration files to fix this, as altering past migrations will break the migration history and checksums.

