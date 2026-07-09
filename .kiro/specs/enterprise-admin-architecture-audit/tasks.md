# Implementation Plan: Enterprise Admin Architecture Audit

## Overview

This plan implements the documentation-only audit pipeline described in the design. Each task produces specific Markdown output files in `docs/` by reading (read-only) from `apps/` and existing documentation. No source code is modified. The pipeline follows a staged approach: scan → analyze → classify → synthesize → generate output.

## Tasks

- [ ] 1. Set up audit infrastructure and shared utilities
  - [-] 1.1 Create audit project structure and shared types
    - Create `docs/17-Audit/` directory if not exists
    - Create `docs/17-Audit/_templates/` with standard enterprise document header template (Document ID `AUDIT-eLIS-[YYYY]-[NNN]`, Version, Date, Author, Classification, Status)
    - Create shared classification utilities: severity classifier (Critical/High/Medium/Low), priority classifier (P1-P4 MoSCoW), effort classifier (S/M/L/XL based on story points), and finding structure
    - Define output file manifest: `enterprise-admin-audit-report.md`, `architecture-gap-analysis.md`, `navigation-review.md`, `rbac-review.md`, `insurance-readiness.md`
    - _Requirements: 8.4, 8.5, 8.7, 9.7_

  - [~] 1.2 Scan file system and build documentation inventory
    - Scan all documentation directories: `docs/01-BRD/`, `docs/02-SRS/`, `docs/03-Architecture/`, `docs/04-Database/`, `docs/06-Frontend/`, `docs/07-Backend/`, `docs/08-API/`, `docs/15-ADR/`, `docs/16-Implementation-Readiness/`, `docs/17-Audit/`, `docs/18-Functional-Spec/`
    - Scan `Functiona spec/` directory for functional specification documents
    - Record for each file: path, extension (`.md`, `.docx`, `.pdf`), last modified date, size
    - List directory structures for `apps/api/src/` and `apps/web/src/` (read-only)
    - Produce intermediate inventory data for use by downstream tasks
    - _Requirements: 1.1, 9.1, 9.2_

- [ ] 2. Documentation Consistency Review
  - [~] 2.1 Build Documentation Consistency Matrix
    - For each document in the inventory, classify its coverage area: Administration, Settings, Master Data, User Management, Role & Permission, or Navigation
    - Determine consistency status for each document: Consistent, Inconsistent, Outdated (last modified >90 days before most recent in same area), or Missing (referenced but not found)
    - Produce the Documentation Consistency Matrix table
    - _Requirements: 1.2_

  - [~] 2.2 Identify cross-document inconsistencies
    - Compare claims across documents covering the same area
    - For each inconsistency record: Source Document A path, Source Document B path, Conflicting Claim A, Conflicting Claim B, Severity (Critical/High/Medium/Low per classification rules), and Recommended Resolution
    - _Requirements: 1.3_

  - [~] 2.3 Verify feature coverage across document types
    - Extract feature list from Functional Specification (`FS-TS-ELIS-LAB-NCR0001`)
    - For each feature, check presence in: BRD, SRS, Database Design (`docs/04-Database/`), API Specification (`docs/08-API/`), Frontend Architecture (`docs/06-Frontend/`)
    - Report coverage gaps where a feature is missing from any document type
    - _Requirements: 1.4_

  - [~] 2.4 Identify documentation-implementation gaps
    - For each documented feature, check whether a corresponding module, service, controller, or route exists in `apps/api/src/` or `apps/web/src/`
    - Classify findings as "Documentation-Implementation Gap" with: feature name, expected source location, evidence of absence, recommendation
    - Produce summary: total documents scanned, inconsistencies per severity, gaps found, consistency percentage = (consistent / total) × 100
    - _Requirements: 1.5, 1.6_

- [ ] 3. Source Code Architecture Review
  - [~] 3.1 Analyze backend folder structure and classify architecture pattern
    - Analyze `apps/api/src/` top-level directory structure
    - Classify as: Feature-Based, Layer-Based, Hybrid, or Unstructured
    - For each feature module (laboratory, auth, users, health), check presence of: controller, service, module, DTOs directory, test files
    - Record "Module Completeness Violations" for missing artifacts with module name, missing artifact type, expected file path
    - _Requirements: 2.1, 2.2_

  - [~] 3.2 Identify shared component placement violations
    - Scan for guards, interceptors, filters, pipes, decorators outside `apps/api/src/common/`
    - Record each as "Architectural Violation" with current location and recommended location under `common/`
    - _Requirements: 2.3_

  - [~] 3.3 Analyze frontend architecture compliance
    - Analyze `apps/web/src/` folder structure against Feature-Sliced Design pattern documented in `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`
    - Check for required layer hierarchy: app, pages, widgets, features, entities, shared
    - Report missing layers or non-compliant organization
    - _Requirements: 2.4_

  - [~] 3.4 Analyze routing structure
    - Scan backend route definitions and frontend route configurations
    - Identify: duplicate routes, conflicting route groups (overlapping parameterized/static segments), dead routes (no corresponding page component or handler)
    - _Requirements: 2.5_

  - [~] 3.5 Analyze state management patterns
    - Scan `apps/web/src/` for state management usage
    - Identify: global state usage (across 3+ unrelated components), local state boundaries, server state caching strategy
    - Detect anti-patterns: prop drilling >3 levels, storing derived values in state, duplicating server data without caching layer, direct mutation outside state management functions
    - _Requirements: 2.6_

  - [~] 3.6 Calculate Architecture Compliance Score and produce summary
    - Calculate score (0-100): folder structure (25pts), module isolation (25pts), shared component placement (20pts), routing correctness (15pts), state management (15pts)
    - Each category = (items_compliant / total_items) × category_weight
    - If score < 60, classify as "Non-Compliant" and list top 5 violations by score impact
    - Produce architecture summary report with classification, score, violations per category, prioritized violation list with severity (Critical ≥5pts, Major 2-4pts, Minor ≤1pt)
    - Write output to `docs/17-Audit/architecture-gap-analysis.md`
    - _Requirements: 2.7, 2.8, 2.9_

- [~] 4. Checkpoint - Ensure documentation and architecture reviews are complete
  - Ensure all tasks in sections 1-3 pass validation, ask the user if questions arise.

- [ ] 5. Navigation Review
  - [~] 5.1 Document current sidebar structure
    - Extract current sidebar menu configuration from `apps/web/src/`
    - Produce table with: menu item name, route path, Lucide icon name, parent grouping, access role requirements, sub-feature count
    - _Requirements: 3.1_

  - [~] 5.2 Evaluate navigation against enterprise UX criteria
    - Check sub-feature count per menu item (flag >7 as exceeding capacity)
    - Assess conceptual cohesion of grouped items
    - Identify frequency-of-access disparity (high-frequency items grouped with low-frequency)
    - Produce recommendation selecting Option A (combined), B (separated), or C (hierarchical) with justification for rejected options
    - _Requirements: 3.2, 3.3_

  - [~] 5.3 Produce Enterprise Navigation Blueprint
    - Define proposed menu hierarchy (max 3 levels, max 7 items per level)
    - Assign Lucide icons to each navigation entry
    - Map role-based visibility for all 11 system roles
    - Map route paths for each entry
    - Assign each of the 14 sub-features (Test Categories, Lab Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Users, Wilayah, SMTP Settings) to exactly one domain: Clinical Operations, Administration, Master Data, System Configuration, or Reporting
    - _Requirements: 3.4, 3.5_

  - [~] 5.4 Verify backend-frontend navigation alignment
    - Check that every backend API module (auth, users, master-data, laboratory, orders, regions, settings) has a corresponding frontend navigation entry and page
    - List modules lacking a frontend navigation path as gaps
    - Write full navigation review to `docs/17-Audit/navigation-review.md`
    - _Requirements: 3.6_

- [ ] 6. Gap Analysis (Functional, Architecture, Navigation, UX)
  - [~] 6.1 Produce Functional Gap report
    - Compare features in BRD/SRS/FS against implementation in Administration, Master Data, Settings modules
    - For each gap: Feature ID, Feature Name, Expected Behavior, Current Status (Not Implemented/Partial/Complete), Evidence, Root Cause, Recommendation, Priority (P1-P4)
    - _Requirements: 4.1, 4.7_

  - [~] 6.2 Produce Architecture Gap report
    - Identify deviations from documented architecture in ADRs (`docs/15-ADR/`) and architecture docs
    - For each gap: Gap ID, Category (Backend/Frontend/Database/Infrastructure), Description, Current State, Expected State, Impact (Critical/High/Medium/Low), Remediation Effort (S/M/L/XL)
    - _Requirements: 4.2_

  - [~] 6.3 Produce Navigation Gap report
    - Identify: menu items linking to non-existent pages, features without menu items, sidebar labels differing from page titles, WCAG 2.1 AA accessibility concerns (2.4.1, 2.4.5, 4.1.2)
    - _Requirements: 4.3_

  - [~] 6.4 Produce UX Gap report
    - Identify within Administration/Master Data/Settings modules: design system violations, component inconsistencies, responsive layout gaps at 640px/768px/1024px/1280px, missing loading indicators, unhandled error states, WCAG 2.1 AA violations
    - _Requirements: 4.4_

  - [~] 6.5 Produce Gap Summary Dashboard and assign priorities
    - Assign MoSCoW priority to each gap (P1-P4 per rules)
    - Produce dashboard: total gaps per category, gaps per severity within each category, total remediation effort in story points
    - Write combined gap analysis to `docs/17-Audit/architecture-gap-analysis.md` (append navigation and UX sections)
    - _Requirements: 4.5, 4.6_

- [ ] 7. RBAC & User Management Review
  - [~] 7.1 Document current RBAC implementation
    - Document all Role enum values (11 roles)
    - List every CRUD endpoint across all modules with HTTP method, path, and assigned roles
    - Document guard implementation mechanism (@Roles decorator with RolesGuard)
    - _Requirements: 5.1_

  - [~] 7.2 Evaluate enterprise access control capabilities
    - Check which capabilities are missing: granular permission management, role hierarchy, role composition, department-based access, position-based access, approval workflows
    - Produce recommendation: Option A (Enhanced Role-Based), B (Full RBAC), or C (ABAC Hybrid)
    - Include justification, migration path, and impact assessment
    - _Requirements: 5.2, 5.3_

  - [~] 7.3 Generate Access Matrix and schema proposal
    - Produce Access Matrix mapping all 11 roles against every resource endpoint with CRUD + custom actions
    - Produce database schema proposal for Permission, RolePermission, Department, Position, UserDepartment entities
    - Define API endpoint specifications for permission CRUD and role-permission assignment
    - _Requirements: 5.4_

  - [~] 7.4 Evaluate Approval Matrix needs
    - Analyze workflows: lab result verification (ANALIS→DOKTER), financial authorization (KASIR→MANAGER), master data changes (ADMIN→SUPER_ADMIN), user account management (ADMIN→OWNER)
    - Determine for each whether single-role guard is sufficient or multi-step approval is required
    - _Requirements: 5.5_

  - [~] 7.5 Audit endpoint security and find unguarded endpoints
    - Scan all API endpoints for presence of @UseGuards(JwtAuthGuard, RolesGuard) and @Roles
    - Document any unguarded endpoint as Critical finding with: path, HTTP method, module, recommended minimum role
    - Write full RBAC review to `docs/17-Audit/rbac-review.md`
    - _Requirements: 5.6, 5.7_

- [ ] 8. Healthcare & Insurance Readiness Review
  - [~] 8.1 Verify database schema insurance support
    - Check Insurance model for type field distinguishing BPJS/Swasta/Corporate
    - Verify Patient-Insurance relationship (1-5 records per patient)
    - Verify Order-Insurance relationship (max 2 providers per order for primary/secondary)
    - Verify Tariff-Insurance relationship for differential pricing
    - _Requirements: 6.1_

  - [~] 8.2 Verify billing workflow and insurance-specific rules
    - Check support for: Cash payment, Insurance claim (with claim reference up to 50 chars), BPJS integration readiness (SEP number, verification status, referring facility, class level), Corporate Insurance (batch invoicing up to 500 orders)
    - Check lab workflow: pre-authorization flag, insurance tariff price override, claim number tracking, insurance-specific reporting
    - _Requirements: 6.2, 6.4_

  - [~] 8.3 Verify payment flow and produce missing capabilities
    - Check: split payment support, insurance rejection handling (72hr cash fallback), multiple insurance per patient (primary/secondary), insurance-specific receipt formats
    - Check PaymentMethod enum for Self Pay vs Insurance-covered Cash distinction
    - For each missing capability: produce Functional Requirement (EARS format), Gap Analysis entry, Implementation Recommendation with priority and effort
    - Write full insurance readiness review to `docs/17-Audit/insurance-readiness.md`
    - _Requirements: 6.3, 6.5, 6.6, 6.7_

- [~] 9. Checkpoint - Ensure all domain reviews are complete
  - Ensure all tasks in sections 5-8 pass validation, ask the user if questions arise.

- [ ] 10. Master Data & Settings Separation Analysis
  - [~] 10.1 Classify sub-features under Settings page
    - Classify each sub-feature into: Master Data, System Settings, User Administration, or Operational Configuration
    - Apply enterprise data governance rules: Master Data entities (Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Test Categories, Lab Tests, Panels) → "Master Data" domain
    - _Requirements: 10.1, 10.3_

  - [~] 10.2 Produce classification matrix and module boundary map
    - Produce matrix with: Feature Name, Current Location, Data Classification, Change Frequency, Owner Role, Proposed Location, Migration Impact (Low/Medium/High)
    - Evaluate backend module structure (`laboratory/master-data/`) against isolation criteria: single-responsibility, dependency direction, interface segregation
    - Produce module boundary map: each service assigned to one bounded context, cross-context violations identified, proposed interface contracts for decoupling
    - _Requirements: 10.2, 10.4, 10.5_

- [ ] 11. Recommended Architecture & ADRs
  - [~] 11.1 Produce Target State Architecture document
    - Document recommended: backend module organization (Feature-Based with Bounded Contexts), frontend architecture (Feature-Sliced Design), database organization (schema per domain), navigation structure
    - _Requirements: 7.1_

  - [~] 11.2 Produce Architecture Decision Records
    - Write ADR for each: Separation of Settings vs Master Data, Enterprise RBAC model selection, Navigation restructuring approach, Insurance integration architecture
    - Each ADR follows template: Context, Problem, Alternative, Pros, Cons, Selected, Consequence, Future Consideration
    - Write ADRs to `docs/15-ADR/` directory
    - _Requirements: 7.2_

  - [~] 11.3 Produce Migration Path and Implementation Readiness Checklist
    - Define phased plan: Phase 1 (Critical), Phase 2 (High), Phase 3 (Medium)
    - Include file-level refactoring instructions (as proposed changes, not modifications)
    - Include backward compatibility verification: affected endpoints, request/response contracts, verification methods
    - Define rollback strategy per phase with trigger conditions, procedures, time windows, verification steps
    - Produce Implementation Readiness Checklist: prerequisites, acceptance criteria, sign-off requirements per phase
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [ ] 12. Final Documentation Generation
  - [~] 12.1 Generate main audit report with executive summary
    - Produce `docs/17-Audit/enterprise-admin-audit-report.md` with standard enterprise headers
    - Include Executive Summary Brief (max 1500 words): total findings by severity, top 5 critical findings, recommended immediate actions, total remediation effort in story points
    - Include No-Code-Modification Attestation section confirming read-only access with list of directories accessed
    - _Requirements: 8.1, 8.4, 8.6, 9.5, 9.6_

  - [~] 12.2 Generate cross-references and append to checklist
    - Add cross-reference links between all generated documents using format `[Document ID]#[Finding ID]`
    - Append new findings to `docs/16-Implementation-Readiness/Checklist.md` without removing existing items, prefixed with audit Document ID
    - If output file already exists, overwrite with incremented Version number
    - _Requirements: 8.2, 8.3, 8.8_

  - [~] 12.3 Final validation of all output artifacts
    - Verify all 5 output files exist in `docs/17-Audit/`
    - Verify all documents have complete enterprise headers (Document ID, Version, Date, Author, Classification, Status)
    - Verify severity labels are consistently one of: Critical, High, Medium, Low
    - Verify no files were written to `apps/`, `deploy/`, or root config paths
    - Verify proposed code changes are documented as "Proposed Change" entries only (file path, current reference, proposed description, risk assessment)
    - _Requirements: 8.4, 8.5, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.7_

- [~] 13. Final checkpoint - Ensure all audit artifacts are complete and consistent
  - Ensure all output files are generated with correct structure, all cross-references resolve, and no source code modifications occurred. Ask the user if questions arise.

## Notes

- This is a **documentation-only audit** — no application source code is written or modified
- All tasks involve reading existing code/docs and producing Markdown reports in `docs/`
- The `apps/` directory is accessed in read-only mode exclusively
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of audit quality
- Severity labels follow a consistent 4-level scale: Critical, High, Medium, Low
- Priority uses MoSCoW: P1 (Must Have), P2 (Should Have), P3 (Could Have), P4 (Won't Have)
- Output documents use enterprise headers with format `AUDIT-eLIS-[YYYY]-[NNN]`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["2.4", "3.6"] },
    { "id": 5, "tasks": ["5.1", "7.1", "8.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "7.2", "8.2"] },
    { "id": 7, "tasks": ["5.4", "7.3", "7.4", "8.3"] },
    { "id": 8, "tasks": ["6.1", "6.2", "6.3", "6.4", "7.5"] },
    { "id": 9, "tasks": ["6.5", "10.1"] },
    { "id": 10, "tasks": ["10.2"] },
    { "id": 11, "tasks": ["11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3"] },
    { "id": 13, "tasks": ["12.1"] },
    { "id": 14, "tasks": ["12.2"] },
    { "id": 15, "tasks": ["12.3"] }
  ]
}
```
