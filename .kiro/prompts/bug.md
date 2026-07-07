# Prompt: Bug Fix

## Purpose
Memperbaiki bug yang dilaporkan dengan pendekatan test-driven.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read bug report (BUG-XXXX)
3. Read related requirement (FR-XXXX)
4. Read affected source files (ONLY those listed in bug report)
5. Read existing tests for affected module

## Execution Steps

1. **Reproduce** — Understand the bug condition
2. **Write Failing Test** — Test that proves the bug exists
3. **Identify Root Cause** — Trace the issue in code
4. **Implement Fix** — Minimal change to resolve the issue
5. **Verify** — Run failing test, confirm it passes
6. **Regression Check** — Run all related tests
7. **Document** — Update bug report with resolution

## Bug Report Template

```markdown
# BUG-XXXX: [Title]

## Status: [OPEN | IN_PROGRESS | RESOLVED | CLOSED]

## Description
What happens vs. what should happen.

## Steps to Reproduce
1. ...
2. ...
3. ...

## Expected Behavior
...

## Actual Behavior
...

## Affected Files
- `path/to/file.ts`

## Related
- Requirement: FR-XXXX
- Design: DES-XXXX

## Root Cause
(filled after investigation)

## Fix Applied
(filled after resolution)
```

## Rules
- Fix ONLY the reported bug
- Do NOT refactor surrounding code
- Do NOT add unrelated features
- Minimal change principle

## Token Budget
- Target: 4000 tokens
- Max: 6000 tokens
