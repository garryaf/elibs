# Task Priority Framework

## Priority Levels

| Priority | Label | SLA | Description |
|:--------:|-------|-----|-------------|
| P0 | Critical | Immediate | Security vulnerability, production down |
| P1 | High | Same day | Blocking bug, broken build |
| P2 | Medium | 2-3 days | Feature task, planned refactor |
| P3 | Low | 1 week | Documentation, minor improvement |
| P4 | Nice-to-have | Backlog | Cosmetic, non-urgent optimization |

## Priority Assignment Rules

### P0 — Critical
- Security vulnerabilities (hardcoded secrets, SQL injection, XSS)
- Production application crash
- Data corruption risk
- Authentication/authorization bypass

### P1 — High
- Build failures blocking development
- Failing tests in CI/CD
- Blocking dependencies for other tasks
- Critical bug affecting core functionality

### P2 — Medium
- New feature implementation
- Planned refactoring
- Performance improvement with measurable impact
- API endpoint implementation

### P3 — Low
- Documentation updates
- Code style improvements
- Non-critical test additions
- Minor UI polishing

### P4 — Nice-to-have
- Developer experience improvements
- Optional optimizations
- Cosmetic code cleanup
- Experimental features

## Execution Order

Within the same wave, execute in priority order:
```
P0 tasks → P1 tasks → P2 tasks → P3 tasks → P4 tasks
```

If multiple tasks have the same priority, prefer:
1. Tasks that unblock other tasks (most `Blocks` references)
2. Tasks with fewer dependencies (easier to complete)
3. Tasks affecting shared modules (reduce merge conflicts)

## Escalation Rules

- If a P2 task is blocked for > 2 days → escalate to P1
- If a bug is reported by multiple users → escalate one level
- If a security scan finds new vulnerability → auto-assign P0
