# Prompt: Security

## Purpose
Melakukan security audit atau menerapkan security hardening.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read `docs/11-Security/` policies
3. Read `docs/17-Audit/` findings (if remediation)
4. Read target source files

## Execution Steps

1. **Identify Scope** — Which module/feature to secure
2. **Check OWASP Top 10** — Common vulnerability patterns
3. **Check Auth/Authz** — Proper guards, decorators, JWT handling
4. **Check Input Validation** — DTOs, pipes, sanitization
5. **Check Secrets** — No hardcoded values, proper env handling
6. **Check Headers** — Helmet, CORS, CSP
7. **Implement Fix** — Apply security hardening
8. **Write Security Test** — Verify fix holds
9. **Document** — Update security docs

## Security Checklist

### Authentication
- [ ] JWT secret from environment (not hardcoded)
- [ ] Token expiration configured
- [ ] Refresh token rotation (if applicable)
- [ ] Failed login rate limiting

### Authorization
- [ ] Role-based access control (RBAC)
- [ ] Guard on every protected endpoint
- [ ] Principle of least privilege

### Input Validation
- [ ] All inputs validated via DTO + class-validator
- [ ] Whitelist approach (strip unknown properties)
- [ ] SQL injection prevention (Prisma parameterized)
- [ ] XSS prevention (no dangerouslySetInnerHTML)

### Data Protection
- [ ] Passwords hashed with bcrypt (cost 12)
- [ ] Sensitive data not in logs
- [ ] Stack traces not in responses
- [ ] PII handling compliant

### HTTP Security
- [ ] Helmet middleware applied
- [ ] CORS restricted to known origins
- [ ] HTTPS enforced in production
- [ ] Security headers present

## Severity Classification

| Level | Examples |
|-------|---------|
| Critical | RCE, SQL injection, auth bypass, hardcoded secrets |
| High | XSS, CSRF, broken access control |
| Medium | Missing rate limiting, verbose errors |
| Low | Missing security headers, outdated deps |

## Token Budget
- Target: 5000 tokens
- Max: 8000 tokens
