# Prompt: Feature Implementation

## Purpose
Mengimplementasikan fitur baru berdasarkan requirement dan design.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read requirement (FR-XXXX)
3. Read design (DES-XXXX)
4. Read related API spec (`docs/08-API/`)
5. Read related database schema (`prisma/schema.prisma`)
6. Read existing module code (if extending)

## Execution Steps

1. **Understand Scope** — Read requirement & design thoroughly
2. **Identify Dependencies** — Check what must exist before this feature
3. **Decompose** — Break into TASK-XXXX entries
4. **Implement** — Follow task order respecting dependencies
5. **Test** — Write unit, property, and integration tests
6. **Validate** — Check all acceptance criteria
7. **Document** — Update API docs, README, changelog

## Decomposition Rules

A feature task should:
- Change at most 7 files
- Be completable in one session
- Have clear acceptance criteria
- Have explicit file lists (read + modify)

## Validation Checklist

- [ ] All acceptance criteria from FR-XXXX met
- [ ] TypeScript compiles (`tsc --noEmit`)
- [ ] Unit tests pass
- [ ] Property tests pass (if applicable)
- [ ] No lint errors
- [ ] API documentation updated
- [ ] No hardcoded values (use ConfigService)
- [ ] Error handling follows standard envelope
- [ ] Response format follows standard envelope

## Token Budget
- Target: 6000 tokens
- Max: 10000 tokens
