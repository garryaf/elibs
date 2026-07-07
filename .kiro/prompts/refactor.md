# Prompt: Refactoring

## Purpose
Meningkatkan kualitas kode tanpa mengubah behavior (external API tetap sama).

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read module yang akan di-refactor
3. Read existing tests untuk module tersebut
4. Read design document terkait (jika ada)

## Execution Steps

1. **Ensure Tests Exist** — Jika tidak ada test, tulis test dulu
2. **Run Tests** — Baseline: semua test harus pass
3. **Identify Smell** — Code duplication, long methods, God class, etc.
4. **Plan Refactor** — Decide technique (extract, inline, rename, move)
5. **Apply Refactor** — Small incremental changes
6. **Run Tests After Each Step** — Ensure no regression
7. **Verify** — All tests still pass, no behavior change

## Refactoring Techniques

| Smell | Technique | Risk |
|-------|-----------|------|
| Long method | Extract Method | Low |
| Duplicate code | Extract to shared util | Low |
| God class | Split into focused classes | Medium |
| Feature envy | Move method to correct class | Medium |
| Dead code | Delete | Low |
| Hardcoded values | Extract to config | Low |
| Deep nesting | Guard clauses / early return | Low |
| Inconsistent naming | Rename | Low (with IDE support) |

## Rules

- **NEVER** change external behavior
- **NEVER** refactor without existing tests
- **ALWAYS** run tests after each change
- **KEEP** commits small and atomic
- **DO NOT** mix refactoring with feature work

## Validation

```bash
# Before refactor
npx jest --passWithNoTests  # all pass
npx tsc --noEmit            # no errors

# After refactor
npx jest --passWithNoTests  # all still pass
npx tsc --noEmit            # no errors
```

## Token Budget
- Target: 5000 tokens
- Max: 8000 tokens
