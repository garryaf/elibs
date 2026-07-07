# Naming Standard

## Entity IDs

| Entity | Prefix | Format | Example |
|--------|--------|--------|---------|
| Functional Requirement | FR | FR-XXXX | FR-0001 |
| Non-Functional Requirement | NFR | NFR-XXXX | NFR-0001 |
| Design Document | DES | DES-XXXX | DES-0001 |
| Task | TASK | TASK-XXXX | TASK-0001 |
| Bug Report | BUG | BUG-XXXX | BUG-0001 |
| API Endpoint | API | API-XXXX | API-0001 |
| Database Migration | DB | DB-XXXX | DB-0001 |
| Architecture Decision | ADR | ADR-XXXX | ADR-0001 |
| Test Case | TC | TC-XXXX | TC-0001 |
| Security Finding | SEC | SEC-XXXX | SEC-0001 |

## Numbering Rules

- IDs are zero-padded to 4 digits: `0001`, `0042`, `0100`
- IDs are sequential and never reused
- Deleted items retain their ID (marked as `[DELETED]`)
- IDs are globally unique within their prefix

## File Naming

### Tasks
```
.kiro/tasks/TASK-0001.md
.kiro/tasks/TASK-0002.md
```

### Templates
```
.kiro/templates/requirement.md
.kiro/templates/design.md
.kiro/templates/task.md
```

### Prompts
```
.kiro/prompts/feature.md
.kiro/prompts/bug.md
```

## Cross-Reference Format

When referencing another entity:
```markdown
- Related Requirement: FR-0001, FR-0003
- Related Design: DES-0001
- Depends On: TASK-0001, TASK-0003
- Blocks: TASK-0005
- API: API-0012
- Database: DB-0003
```

## Status Labels

| Status | Meaning |
|--------|---------|
| `[NOT_STARTED]` | Task has not been picked up |
| `[IN_PROGRESS]` | Task is currently being worked on |
| `[COMPLETED]` | Task is done and validated |
| `[BLOCKED]` | Task cannot proceed (dependency not met) |
| `[CANCELLED]` | Task is no longer needed |
| `[DELETED]` | Entity removed but ID preserved |

## Module Naming

| Module | Directory | Prefix in Code |
|--------|-----------|---------------|
| Authentication | `src/auth/` | `Auth` |
| Users | `src/users/` | `Users` |
| Patients | `src/patients/` | `Patients` |
| Orders | `src/orders/` | `Orders` |
| Laboratory | `src/laboratory/` | `Lab` |
| Common | `src/common/` | (varies) |
