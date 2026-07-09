# Audit Classification Guide

Standard classification utilities for the Enterprise Admin Architecture Audit. All audit findings and recommendations MUST use these consistent labels.

---

## 1. Severity Classifier

Severity indicates the impact of a finding on the system.

| Severity | Definition | Usage Criteria |
|----------|-----------|----------------|
| **Critical** | System cannot function | Data loss, security breach, system crash, blocks all users |
| **High** | Significant limitation | Core feature blocked, major workflow broken, significant data integrity risk |
| **Medium** | Impacts efficiency | Degraded user experience, workaround exists but is costly, non-functional requirement violated |
| **Low** | Cosmetic or nice-to-have | Minor UI inconsistency, terminology difference, formatting issue |

### Severity Assignment Rules

- Architecture violations with compliance score impact ≥ 5 points → **Critical**
- Architecture violations with score impact 2–4 points → **High** (Major)
- Architecture violations with score impact ≤ 1 point → **Medium** (Minor)
- Unguarded API endpoints → **Critical**
- Missing module artifacts → **High**
- Misplaced shared components → **Medium**
- Document inconsistency contradicting safety/security/data integrity → **Critical**
- Document inconsistency contradicting core functional behavior → **High**
- Document inconsistency contradicting non-functional specification → **Medium**
- Terminology or formatting differences → **Low**

---

## 2. Priority Classifier (MoSCoW)

Priority indicates when a finding should be addressed.

| Priority | Label | Definition | Assignment Criteria |
|----------|-------|-----------|---------------------|
| **P1** | Must Have | Required for production release | Blocks production use OR causes data integrity failure |
| **P2** | Should Have | Important but not blocking | Degrades core workflow without complete blocking |
| **P3** | Could Have | Desirable improvement | Improves usability but has acceptable workaround |
| **P4** | Won't Have This Phase | Deferred | No current impact, can be addressed in future phase |

### Priority Assignment Rules

- Critical severity findings → P1 or P2 (based on production blocking)
- High severity findings → P1 or P2
- Medium severity findings → P2 or P3
- Low severity findings → P3 or P4
- Security findings (unguarded endpoints) → Always P1
- Insurance/BPJS integration gaps → P1 (regulatory requirement)
- Navigation restructuring → P2 or P3

---

## 3. Effort Classifier

Effort estimates the implementation work required to remediate a finding.

| Size | Label | Story Points | Typical Scope |
|------|-------|-------------|---------------|
| **S** | Small | ≤ 2 | Single file change, configuration update, simple refactor |
| **M** | Medium | 3–5 | Multi-file change within one module, new DTO/endpoint |
| **L** | Large | 6–13 | Cross-module refactor, new service/module, schema migration |
| **XL** | Extra Large | ≥ 14 | Major architectural change, new subsystem, multi-phase migration |

### Effort Estimation Guidelines

- Adding a guard decorator to endpoint → **S** (1 point)
- Creating a new DTO directory with validators → **S** (2 points)
- Reorganizing shared components → **M** (3 points)
- Implementing new CRUD module → **M** (5 points)
- Adding RBAC permission tables and API → **L** (8 points)
- Navigation restructuring with routing changes → **L** (8 points)
- Full RBAC migration (schema + API + UI) → **XL** (21 points)
- Insurance integration with BPJS → **XL** (34 points)

---

## 4. Finding Structure

Every audit finding MUST follow this structure:

| Field | Required | Description |
|-------|----------|-------------|
| Finding ID | Yes | Unique identifier within the document (e.g., `ARCH-001`, `NAV-003`) |
| Category | Yes | One of: Functional, Architecture, Navigation, UX, Security, Insurance |
| Title | Yes | Brief description (≤ 80 characters) |
| Description | Yes | Detailed explanation of the finding |
| Severity | Yes | Critical / High / Medium / Low |
| Priority | Yes | P1 / P2 / P3 / P4 |
| Evidence | Yes | File path, code reference, or observation proving the finding |
| Recommendation | Yes | Specific action to resolve the finding |
| Effort | Yes | S / M / L / XL |
| Status | Yes | Open / Resolved / Deferred |

### Finding ID Prefixes

| Prefix | Category |
|--------|----------|
| `DOC-` | Documentation consistency |
| `ARCH-` | Architecture compliance |
| `NAV-` | Navigation structure |
| `UX-` | User experience |
| `SEC-` | Security / RBAC |
| `INS-` | Insurance / Healthcare |
| `FUNC-` | Functional gap |

### Cross-Reference Format

When linking findings across documents, use the format:

```
[AUDIT-eLIS-2026-001]#[ARCH-003]
```

This means: Document `AUDIT-eLIS-2026-001`, Finding `ARCH-003`.

---

## 5. Architecture Classification

| Pattern | Definition |
|---------|-----------|
| **Feature-Based** | Each top-level directory represents a business domain containing its own controller, service, and module |
| **Layer-Based** | Top-level directories represent technical layers (controllers/, services/, repositories/) |
| **Hybrid** | Mix of feature and layer directories at the same level |
| **Unstructured** | No consistent organizational pattern detected |

---

## 6. Document Consistency Status

| Status | Definition |
|--------|-----------|
| **Consistent** | No conflicts with other documents covering the same area |
| **Inconsistent** | Conflicting claims found with another document |
| **Outdated** | Last modified more than 90 days before the most recent document covering the same area |
| **Missing** | Referenced in another document but file does not exist |
