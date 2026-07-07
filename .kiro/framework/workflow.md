# Workflow Guide

## Workflow Selection

| User Request | Workflow | Prompt Template |
|---|---|---|
| "Fix bug X" | Bug Fix | `.kiro/prompts/bug.md` |
| "Add feature Y" | Feature | `.kiro/prompts/feature.md` |
| "Refactor module Z" | Refactor | `.kiro/prompts/refactor.md` |
| "Review code" | Review | `.kiro/prompts/review.md` |
| "Audit security" | Security | `.kiro/prompts/security.md` |
| "Write tests for X" | Testing | `.kiro/prompts/testing.md` |
| "Update docs" | Documentation | `.kiro/prompts/documentation.md` |
| "Improve performance" | Performance | `.kiro/prompts/performance.md` |
| "Implement UI page" | UI/UX | `.kiro/prompts/uiux.md` |
| "Design architecture" | Design | `.kiro/prompts/design.md` |

## Standard Workflow Steps

### 1. Bug Fix Workflow
```
1. Read bug report (BUG-XXXX)
2. Identify affected files
3. Write failing test (proves bug exists)
4. Implement fix
5. Verify test passes
6. Check for regressions
7. Update changelog
```

### 2. Feature Workflow
```
1. Read requirement (FR-XXXX)
2. Read design (DES-XXXX)
3. Create task breakdown (TASK-XXXX)
4. Implement task by task
5. Write tests per task
6. Integration test
7. Update documentation
```

### 3. Refactor Workflow
```
1. Identify refactor scope
2. Ensure tests exist for current behavior
3. Apply refactoring
4. Verify all tests still pass
5. Update documentation
```

### 4. Testing Workflow
```
1. Identify coverage gaps
2. Read related requirement/design
3. Write unit tests
4. Write property tests (if applicable)
5. Write integration tests (if applicable)
6. Verify all pass
```

### 5. Security Workflow
```
1. Read security findings (SEC-XXXX)
2. Identify vulnerable code
3. Apply security fix
4. Write security test
5. Verify fix
6. Update security documentation
```

## Parallel Execution Rules

Tasks can run in parallel when:
- No shared file modifications
- No data dependency
- Different modules
- No import/export relationship

Tasks must run sequentially when:
- One creates files the other reads
- One modifies shared state
- Database migration order matters
- Module dependency exists

## Checkpoint Protocol

After each wave of tasks:
1. `npx tsc --noEmit` — Type check
2. `npx jest --passWithNoTests` — Unit tests
3. `git status` — Check for untracked files
4. Verify acceptance criteria
5. Report to user
