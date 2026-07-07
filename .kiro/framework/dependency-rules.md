# Dependency Rules

## Dependency Types

### Task Dependencies
- **Blocks**: Task A must complete before Task B can start
- **Related**: Tasks share context but can run independently
- **Parallel**: Tasks have no dependency and can run concurrently

### Requirement Dependencies
- **Extends**: FR-0002 extends FR-0001 (additive)
- **Depends**: FR-0003 requires FR-0001 to be implemented first
- **Conflicts**: FR-0004 conflicts with FR-0002 (mutual exclusion)

### Module Dependencies
- **Imports**: Module A imports from Module B
- **Provides**: Module A provides services to Module B
- **Shared**: Both modules use Common infrastructure

## Dependency Graph Rules

1. **No circular dependencies** — If A → B, then B ↛ A
2. **Explicit declaration** — Every dependency must be listed in the task/requirement file
3. **Minimum coupling** — A task should depend on at most 3 other tasks
4. **Wave execution** — Tasks in the same wave have no inter-dependencies
5. **Checkpoint after wave** — Verify all tasks in a wave before starting next

## Dependency Declaration Format

```markdown
## Dependencies

### Depends On (must complete first)
- TASK-0001: Database schema must exist
- TASK-0003: Auth module must be refactored

### Blocks (will unblock after completion)
- TASK-0007: Integration tests need this endpoint
- TASK-0008: Frontend page needs this API

### Related (shares context, no hard dependency)
- TASK-0004: Similar pattern, can reference implementation
```

## Wave-Based Execution

```
Wave 0: [TASK-0001, TASK-0002]  ← No dependencies, run parallel
         ↓
Wave 1: [TASK-0003]             ← Depends on Wave 0
         ↓
Wave 2: [TASK-0004, TASK-0005]  ← Depends on Wave 1, parallel
         ↓
Wave 3: [TASK-0006]             ← Depends on Wave 2
```

## Module Dependency Map (eLIS)

```
AppModule
  ├── ConfigModule (global)
  ├── PrismaModule (common)
  ├── UsersModule
  │     └── depends: PrismaModule
  └── AuthModule
        ├── depends: UsersModule
        ├── depends: ConfigModule
        ├── depends: JwtModule
        └── depends: PassportModule
```

## Validation Rules

Before executing a task, verify:
1. All `Depends On` tasks are `[COMPLETED]`
2. No `Conflicts` requirements are in scope simultaneously
3. All imported modules exist and are functional
4. Database schema matches expected state
