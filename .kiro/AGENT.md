# eLIS Enterprise Agent Configuration

## Project Identity

- **Name**: eLIS (Enterprise Laboratory Information System)
- **Type**: Monorepo (NestJS API + Next.js Web)
- **Repository Root**: `/Users/nabilartanabil/SourceCode/Elis`

## Architecture

- **Backend**: `apps/api/` — NestJS 11, Prisma, PostgreSQL
- **Frontend**: `apps/web/` — Next.js 15, React, Tailwind CSS, shadcn/ui
- **Language**: TypeScript (strict mode)
- **Testing**: Jest, fast-check (property-based testing)

## Context Loading Rules

1. **NEVER** read the entire repository
2. **ALWAYS** read this file first
3. Read only files listed in the task's `Files to Read` section
4. Follow the Context Loading Strategy in `.kiro/framework/context-loading.md`
5. Respect dependency boundaries — do not modify unrelated modules

## Documentation Structure

| Path | Content |
|------|---------|
| `docs/01-BRD/` | Business Requirements Document |
| `docs/02-SRS/` | Software Requirements Specification |
| `docs/03-Architecture/` | Architecture Decision Records & Diagrams |
| `docs/04-Database/` | Database Schema & ERD |
| `docs/05-UIUX/` | UI/UX Design Specs |
| `docs/06-Frontend/` | Frontend Implementation Guides |
| `docs/07-Backend/` | Backend Implementation Guides |
| `docs/08-API/` | API Specifications |
| `docs/09-Testing/` | Testing Strategy & Plans |
| `docs/10-Deployment/` | Deployment Procedures |
| `docs/11-Security/` | Security Policies & Guidelines |
| `docs/12-DevOps/` | DevOps Configuration |
| `docs/13-Release/` | Release Notes |
| `docs/14-Changelog/` | Change History |
| `docs/15-ADR/` | Architecture Decision Records |
| `docs/16-Implementation-Readiness/` | Implementation Readiness Checklists |
| `docs/17-Audit/` | Audit Reports |
| `docs/18-Functional-Spec/` | Functional Specifications |

## Coding Standards

- Use existing project patterns — do not introduce new libraries without justification
- Follow NestJS module structure for backend
- Follow Next.js App Router conventions for frontend
- All APIs under `/api/v1/` prefix
- Standard response envelope: `{ success, message, data }` or `{ success, errorCode, message, errors, traceId }`
- Bcrypt cost factor: 12
- Minimum JWT_SECRET length: 32 characters

## Framework Reference

- Prompt Framework: `.kiro/framework/prompt-framework.md`
- Context Loading: `.kiro/framework/context-loading.md`
- Token Strategy: `.kiro/framework/token-strategy.md`
- Naming Standard: `.kiro/framework/naming-standard.md`
- Templates: `.kiro/templates/`
- Reusable Prompts: `.kiro/prompts/`
