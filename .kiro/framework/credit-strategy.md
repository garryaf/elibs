# Credit Optimization Strategy

## Principles

1. **Batch related changes** — Group related modifications into one task execution
2. **Avoid retry loops** — Validate approach before implementing
3. **Checkpoint often** — Commit working state to avoid re-work
4. **Reuse prompts** — Use pre-built prompt templates instead of writing from scratch
5. **Parallel execution** — Run independent tasks concurrently (saves wall-clock credits)

## Credit-Saving Patterns

### 1. Pre-validate Before Execute
```
❌ Implement → fail → fix → fail → fix (3 credit units)
✅ Read existing code → plan → implement → pass (1 credit unit)
```

### 2. Use Spec-Driven Development
```
❌ Freestyle implementation with multiple corrections
✅ Write spec first → implement from spec → validate against spec
```

### 3. Batch Small Changes
```
❌ Task 1: rename variable → Task 2: add import → Task 3: update type
✅ Single task: refactor auth module (rename + import + type)
```

### 4. Avoid Context Overflow
```
❌ Load 50 files → context overflow → restart session → reload
✅ Load 5 relevant files → complete → move to next batch
```

## Task Sizing Guidelines

| Size | Lines Changed | Files Affected | Ideal Credit Cost |
|------|:------------:|:--------------:|:-----------------:|
| XS | 1-10 | 1 | 0.5 |
| S | 10-50 | 1-3 | 1 |
| M | 50-200 | 3-7 | 2-3 |
| L | 200-500 | 7-15 | 4-6 |
| XL | 500+ | 15+ | Split into M tasks |

## Anti-Patterns (Credit Waste)

| Pattern | Credit Cost | Fix |
|---------|:-----------:|-----|
| Read entire repo then ask what to do | 3-5 | Read AGENT.md, ask user to specify task |
| Implement without reading existing code | 2-4 | Always read related source first |
| Fix compile errors one by one | 3-6 | Run `tsc --noEmit` once, fix all errors |
| Retry same approach multiple times | 4-8 | Step back, try different approach after 2 fails |
| Regenerate large files for small edits | 2-3 | Use targeted string replacement |

## Session Management

### Short Session (1-3 tasks)
- Load AGENT.md once
- Execute tasks sequentially
- Commit after each task

### Long Session (4+ tasks)
- Load AGENT.md once
- Group tasks by module (minimize context switching)
- Commit after each module group
- If context gets large, start fresh session for next module

### Resume Session
- Read AGENT.md
- Read git log --oneline -5 (recent commits)
- Read task status (.kiro/tasks/)
- Continue from next incomplete task
