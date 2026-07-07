# Token Optimization Strategy

## Principles

1. **Decompose large tasks** — Break into subtasks of ≤ 8000 tokens context each
2. **Explicit file lists** — Never use wildcards (`src/**`) in context loading
3. **Reference by ID** — Use FR-XXXX, DES-XXXX instead of copying full text
4. **Incremental reading** — Read file sections, not entire files when possible
5. **Skip boilerplate** — Don't read package.json, config files unless task requires them

## Token Budget per Task Type

| Task Type | Target Budget | Max Budget |
|-----------|:------------:|:----------:|
| Bug fix | 4000 | 6000 |
| Small feature | 6000 | 10000 |
| Large feature | 8000 | 15000 |
| Refactor | 5000 | 8000 |
| Documentation | 3000 | 5000 |
| Testing | 5000 | 8000 |
| Review | 4000 | 6000 |

## Reduction Techniques

### 1. Selective File Reading
```
❌ Read entire auth.service.ts (200 lines, ~3000 tokens)
✅ Read auth.service.ts lines 15-45 (relevant method only, ~500 tokens)
```

### 2. Reference Instead of Inline
```
❌ "The requirement says: [paste 500-word requirement]"
✅ "Per FR-0012 acceptance criterion 3"
```

### 3. Template Reuse
```
❌ Write full implementation instructions each time
✅ Reference prompt template: "Follow .kiro/prompts/feature.md"
```

### 4. Skip Unchanged Context
```
❌ Re-read AGENT.md + all requirements on every task
✅ Read AGENT.md once, reference by ID thereafter
```

## Monitoring

Track approximate token usage per task:
- Context loaded: ~X tokens
- Response generated: ~Y tokens
- Total: X + Y

If total exceeds budget, decompose further.

## Emergency Protocol

If approaching context limit mid-task:
1. Commit current progress
2. Document remaining steps in task file
3. Start new session with fresh context
4. Load only remaining steps + relevant files
