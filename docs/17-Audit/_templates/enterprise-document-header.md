# Enterprise Document Header Template

Use this template as the standard header for all audit output documents.

---

## Template

```markdown
---
Document ID: AUDIT-eLIS-[YYYY]-[NNN]
Version: 1.0
Date: YYYY-MM-DD
Author: Enterprise Architect
Classification: Internal | Confidential | Restricted
Status: Draft | Review | Approved | Superseded
---
```

## Field Definitions

| Field | Format | Description |
|-------|--------|-------------|
| Document ID | `AUDIT-eLIS-[YYYY]-[NNN]` | Unique document identifier. YYYY = year, NNN = sequential 3-digit number (e.g., `AUDIT-eLIS-2026-001`) |
| Version | `major.minor` | Document version starting at 1.0. Increment minor for edits, major for overwrite/regeneration |
| Date | `YYYY-MM-DD` | ISO 8601 date of document creation or last update |
| Author | Free text | Role or name of the person/system performing the audit |
| Classification | Enum | One of: **Internal** (general team access), **Confidential** (restricted to architecture team), **Restricted** (limited to designated reviewers only) |
| Status | Enum | One of: **Draft** (in progress), **Review** (pending approval), **Approved** (finalized), **Superseded** (replaced by newer version) |

## Usage Instructions

1. Copy the header block (between `---` markers) to the top of each new audit document
2. Replace `[YYYY]` with the current year (e.g., 2026)
3. Replace `[NNN]` with the next sequential number for that year
4. Set Version to `1.0` for new documents
5. Set Date to the document creation date
6. Set Classification based on content sensitivity (default: `Internal`)
7. Set Status to `Draft` for new documents

## Document ID Registry

Assign sequential numbers within the audit:

| NNN | Document |
|-----|----------|
| 001 | enterprise-admin-audit-report.md |
| 002 | architecture-gap-analysis.md |
| 003 | navigation-review.md |
| 004 | rbac-review.md |
| 005 | insurance-readiness.md |

## Version Increment Rules

- If a target output file already exists, overwrite the content and increment the Version number
- Minor version increment (1.0 → 1.1): content edits, corrections
- Major version increment (1.0 → 2.0): full regeneration/overwrite from new audit run
