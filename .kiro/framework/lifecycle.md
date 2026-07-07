# Prompt Lifecycle

## Phases

```
┌─────────────┐
│  1. INTAKE  │  User request arrives
└──────┬──────┘
       ▼
┌─────────────┐
│ 2. CLASSIFY │  Determine workflow type (bug/feature/refactor/etc.)
└──────┬──────┘
       ▼
┌─────────────┐
│ 3. SCOPE    │  Identify related requirements, designs, files
└──────┬──────┘
       ▼
┌─────────────┐
│ 4. LOAD     │  Load minimum context per Context Loading Strategy
└──────┬──────┘
       ▼
┌─────────────────┐
│ 5. DECOMPOSE    │  Break into independent tasks (TASK-XXXX)
└──────┬──────────┘
       ▼
┌─────────────────┐
│ 6. EXECUTE      │  Implement task by task (parallelizable if no deps)
└──────┬──────────┘
       ▼
┌─────────────────┐
│ 7. VALIDATE     │  Test against acceptance criteria
└──────┬──────────┘
       ▼
┌─────────────────┐
│ 8. DOCUMENT     │  Update relevant documentation
└──────┬──────────┘
       ▼
┌─────────────────┐
│ 9. CHECKPOINT   │  Build/test verification
└──────┬──────────┘
       ▼
┌─────────────────┐
│ 10. COMPLETE    │  Mark done, report results
└─────────────────┘
```

## Phase Details

### 1. INTAKE
- Receive user request
- Identify urgency and type

### 2. CLASSIFY
- Map to workflow type using `.kiro/prompts/` templates
- Determine if new requirement or existing task

### 3. SCOPE
- Identify FR/NFR IDs involved
- Identify DES IDs involved
- List affected modules and files
- Check dependency graph

### 4. LOAD
- Follow `.kiro/framework/context-loading.md`
- Load ONLY what's needed for current scope
- Never load entire repository

### 5. DECOMPOSE
- Create TASK-XXXX entries
- Define dependencies between tasks
- Identify parallelizable tasks
- Estimate token cost per task

### 6. EXECUTE
- Follow task template strictly
- Read only listed files
- Implement changes
- Run relevant tests

### 7. VALIDATE
- Check each acceptance criterion
- Run type checking (`tsc --noEmit`)
- Run unit tests
- Run property tests if applicable

### 8. DOCUMENT
- Update inline code comments
- Update API documentation
- Update changelog if needed
- Update requirement status

### 9. CHECKPOINT
- Full build verification
- Integration test if applicable
- Confirm no regressions

### 10. COMPLETE
- Mark task status as done
- Report summary to user
- Identify next available tasks

## Resume Protocol

If chat is interrupted mid-task:

1. Read AGENT.md
2. Read last task in progress
3. Check git status for uncommitted changes
4. Resume from last completed step
5. Do NOT restart from beginning
