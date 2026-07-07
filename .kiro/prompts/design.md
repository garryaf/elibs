# Prompt: Design & Architecture

## Purpose
Membuat atau merevisi design document untuk fitur atau komponen arsitektur.

## Context Loading
1. Read `.kiro/AGENT.md`
2. Read requirement (FR-XXXX / NFR-XXXX)
3. Read existing architecture (`docs/03-Architecture/`)
4. Read existing database schema (`docs/04-Database/`)
5. Read existing API patterns (`docs/08-API/`)

## Execution Steps

1. **Understand Requirements** — What needs to be achieved
2. **Analyze Constraints** — Technology, performance, security
3. **Design Components** — Modules, interfaces, data flow
4. **Define API** — Endpoints, request/response shapes
5. **Define Data Model** — Tables, relations, migrations
6. **Error Handling** — Failure modes and recovery
7. **Testing Strategy** — How to verify correctness
8. **Document** — Write DES-XXXX

## Design Document Sections

```markdown
# DES-XXXX: [Title]

## Overview
Brief description and rationale.

## Architecture
Component diagram, module structure.

## Sequence Diagram
Request/response flow.

## API Specification
Endpoints, methods, payloads.

## Database Schema
New/modified tables and relations.

## Validation Rules
Input constraints and business rules.

## Error Handling
Error scenarios and responses.

## Security Considerations
Auth, authz, data protection.

## Performance Considerations
Caching, query optimization, scaling.

## Testing Strategy
Unit, integration, property tests.

## Dependencies
- Requires: [list]
- Provides: [list]
```

## Token Budget
- Target: 5000 tokens
- Max: 10000 tokens
