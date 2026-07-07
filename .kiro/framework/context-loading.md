# Context Loading Strategy

## Loading Order

```
Step 1: Read .kiro/AGENT.md
           ↓
Step 2: Read Task Definition (.kiro/tasks/TASK-XXXX.md)
           ↓
Step 3: Read Related Requirement (docs/02-SRS/ or docs/18-Functional-Spec/)
           ↓
Step 4: Read Related Design (docs/03-Architecture/ or .kiro/specs/)
           ↓
Step 5: Read Related API Spec (docs/08-API/)
           ↓
Step 6: Read Related Database Schema (docs/04-Database/ or prisma/schema.prisma)
           ↓
Step 7: Read ONLY Source Files Listed in Task
           ↓
Step 8: Implement
           ↓
Step 9: Update Documentation
```

## Rules

### Must Read
- `AGENT.md` — Always (provides project context)
- Task definition — Always (provides scope)
- Related requirement — Always (provides acceptance criteria)

### Conditional Read
- Design doc — Only if task involves architecture changes
- API spec — Only if task involves API endpoints
- Database schema — Only if task involves data model changes
- Test files — Only if task involves test modifications

### Never Read
- Unrelated modules
- `node_modules/`
- Build artifacts (`dist/`, `.next/`)
- Other tasks' source files (unless listed as dependency)

## Context Budget

| Priority | Content | Max Token Budget |
|----------|---------|-----------------|
| P0 | AGENT.md | ~500 tokens |
| P1 | Task definition | ~300 tokens |
| P2 | Requirement | ~500 tokens |
| P3 | Design | ~800 tokens |
| P4 | API/DB spec | ~400 tokens |
| P5 | Source files | ~2000 tokens per file |

**Target**: Keep total context under 8000 tokens per task execution.

## File Reference Pattern

When a task references files, use explicit paths:

```markdown
## Files to Read
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/auth/auth.service.ts`
- `docs/08-API/auth-endpoints.md`

## Files to Ignore
- `apps/api/src/users/*` (not related)
- `apps/web/*` (frontend, not in scope)
```

## Dependency-Aware Loading

If Task B depends on Task A:
1. Read Task B definition
2. Check if Task A is completed
3. If completed: read Task A's output files (not its implementation files)
4. If not completed: block Task B execution

## Caching Strategy

Within a single session:
- Cache AGENT.md content (read once)
- Cache requirement content (read once per requirement ID)
- Cache database schema (read once per session)
- Re-read source files before each modification (they may have changed)
