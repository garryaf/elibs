# Enterprise Prompt Framework

## Overview

Framework ini mengoptimalkan penggunaan token, source context, dan credit Kiro melalui workflow yang modular, reusable, dan scalable.

## Core Principles

1. **Minimum Context** — Hanya baca file yang dibutuhkan untuk task saat ini
2. **Reusable Prompts** — Setiap prompt dapat digunakan ulang untuk task serupa
3. **No Duplicate Loading** — Jangan baca file yang sama dua kali dalam satu session
4. **Task Isolation** — Setiap task berjalan independen tanpa side effects ke modul lain
5. **Dependency Graph** — Setiap task, requirement, dan design memiliki dependency yang jelas
6. **Documentation First** — Update dokumentasi setelah setiap task selesai
7. **Validate Always** — Validasi implementasi terhadap Requirement, Design, API, dan Database

## Workflow Types

| Type | Prompt | Use Case |
|------|--------|----------|
| Audit | `.kiro/prompts/audit.md` | Code review, compliance check |
| Bug Fix | `.kiro/prompts/bug.md` | Fix existing defects |
| Feature | `.kiro/prompts/feature.md` | New functionality |
| Design | `.kiro/prompts/design.md` | Architecture & design decisions |
| Review | `.kiro/prompts/review.md` | Pull request review |
| Refactor | `.kiro/prompts/refactor.md` | Code improvement |
| Testing | `.kiro/prompts/testing.md` | Write/update tests |
| Documentation | `.kiro/prompts/documentation.md` | Update docs |
| Security | `.kiro/prompts/security.md` | Security audit & hardening |
| Performance | `.kiro/prompts/performance.md` | Performance optimization |
| UI/UX | `.kiro/prompts/uiux.md` | Frontend implementation |

## ID Convention

| Entity | Format | Example |
|--------|--------|---------|
| Functional Requirement | `FR-XXXX` | FR-0001 |
| Non-Functional Requirement | `NFR-XXXX` | NFR-0001 |
| Design | `DES-XXXX` | DES-0001 |
| Task | `TASK-XXXX` | TASK-0001 |
| Bug | `BUG-XXXX` | BUG-0001 |
| API Endpoint | `API-XXXX` | API-0001 |
| Database Migration | `DB-XXXX` | DB-0001 |

## Task Execution Protocol

```
1. Read AGENT.md
2. Read Task Definition (TASK-XXXX)
3. Read Related Requirement (FR-XXXX)
4. Read Related Design (DES-XXXX)
5. Read Related API Spec (if applicable)
6. Read Related Database Schema (if applicable)
7. Read ONLY listed source files
8. Implement
9. Validate against acceptance criteria
10. Update documentation
11. Mark task as completed
```

## Anti-Patterns

- ❌ Reading entire `src/` directory
- ❌ Loading all requirements when only one is needed
- ❌ Modifying files not listed in task scope
- ❌ Skipping validation step
- ❌ Not updating documentation after changes
- ❌ Creating tasks without dependency mapping
