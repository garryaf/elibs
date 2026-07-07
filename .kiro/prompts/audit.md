# Prompt: Audit

## Purpose
Melakukan audit terhadap kode, arsitektur, atau compliance.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read audit scope (which module/feature)
3. Read relevant architecture docs (`docs/03-Architecture/`)
4. Read relevant security docs (`docs/11-Security/`)
5. Read source code of target module

## Execution Steps

1. **Identify Scope** — Module/file/feature yang akan diaudit
2. **Check Standards** — Validasi terhadap coding standards di AGENT.md
3. **Check Security** — Hardcoded secrets, injection vulnerabilities, auth bypass
4. **Check Architecture** — Apakah sesuai dengan design document
5. **Check Performance** — N+1 queries, memory leaks, blocking calls
6. **Check Testing** — Coverage gaps, missing edge cases
7. **Generate Report** — List findings dengan severity level

## Output Format

```markdown
# Audit Report: [Module Name]

## Summary
- Total Findings: X
- Critical: X | High: X | Medium: X | Low: X

## Findings

### [SEC-XXXX] Finding Title
- **Severity**: Critical/High/Medium/Low
- **File**: `path/to/file.ts`
- **Line**: XX-XX
- **Description**: ...
- **Recommendation**: ...
- **Related Requirement**: FR-XXXX
```

## Token Budget
- Target: 5000 tokens
- Max: 8000 tokens
