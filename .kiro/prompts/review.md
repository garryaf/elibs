# Prompt: Code Review

## Purpose
Review kode untuk quality, security, dan compliance terhadap standards.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read changed files (diff only)
3. Read related requirement (if referenced in PR)
4. Read related design (if architecture change)

## Execution Steps

1. **Understand Change** — What is being modified and why
2. **Check Correctness** — Does it do what it claims?
3. **Check Standards** — Follows project coding standards?
4. **Check Security** — No vulnerabilities introduced?
5. **Check Performance** — No regressions?
6. **Check Tests** — Adequate coverage?
7. **Provide Feedback** — Actionable, specific comments

## Review Checklist

### Code Quality
- [ ] Follows existing patterns in the module
- [ ] No unnecessary complexity
- [ ] Clear naming and intent
- [ ] Proper error handling
- [ ] No dead code added

### Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Auth/authz correctly applied
- [ ] No SQL injection risk
- [ ] No XSS risk (frontend)

### Testing
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] Existing tests not broken

### Documentation
- [ ] Complex logic has comments
- [ ] API changes documented
- [ ] Breaking changes noted

## Output Format

```markdown
## Review Summary
- **Verdict**: Approve / Request Changes / Comment
- **Risk Level**: Low / Medium / High

## Comments
1. [file:line] — Comment text
2. [file:line] — Comment text

## Suggestions (non-blocking)
- ...
```

## Token Budget
- Target: 4000 tokens
- Max: 6000 tokens
