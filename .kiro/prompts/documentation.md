# Prompt: Documentation

## Purpose
Membuat atau memperbarui dokumentasi teknis dan pengguna.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read source code yang didokumentasikan
3. Read existing documentation file (jika update)
4. Read related requirement/design

## Execution Steps

1. **Identify Doc Type** — API doc, README, architecture, inline comments
2. **Read Source** — Understand current implementation
3. **Write/Update** — Clear, accurate, up-to-date
4. **Validate** — Ensure documentation matches actual code
5. **Cross-reference** — Link to related docs

## Documentation Types

| Type | Location | Format |
|------|----------|--------|
| API Documentation | `docs/08-API/` | Markdown |
| Architecture | `docs/03-Architecture/` | Markdown + diagrams |
| Database | `docs/04-Database/` | Markdown + ERD |
| README | Root or module level | Markdown |
| Inline Comments | Source files | JSDoc/TSDoc |
| Changelog | `docs/14-Changelog/` | Markdown |
| ADR | `docs/15-ADR/` | Markdown |

## Writing Standards

- Use Bahasa Indonesia for business docs (BRD, SRS)
- Use English for technical docs (API, Architecture, Code comments)
- Keep sentences concise
- Use code blocks for examples
- Include request/response examples for API docs
- Use Mermaid for diagrams where possible

## API Documentation Format

```markdown
# API-XXXX: [Endpoint Name]

## Endpoint
`POST /api/v1/resource`

## Description
Brief description.

## Headers
| Header | Required | Description |
|--------|:--------:|-------------|
| Authorization | Yes | Bearer token |

## Request Body
\`\`\`json
{
  "field": "value"
}
\`\`\`

## Response (Success)
\`\`\`json
{
  "success": true,
  "message": "Success",
  "data": {}
}
\`\`\`

## Response (Error)
\`\`\`json
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "...",
  "errors": [],
  "traceId": "..."
}
\`\`\`
```

## Token Budget
- Target: 3000 tokens
- Max: 5000 tokens
