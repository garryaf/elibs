# Requirements Document

## Introduction

Enterprise Architecture Audit untuk modul Administration, Master Data & Settings pada sistem eLIS (Enterprise Laboratory Information System). Audit ini mencakup review arsitektur, navigasi, gap analysis, user management, dan kesiapan Healthcare & Insurance — tanpa memodifikasi source code yang sudah berjalan. Output berupa dokumentasi audit, gap analysis, dan rekomendasi arsitektur enterprise.

## Glossary

- **Audit_System**: Sistem yang melakukan analisis arsitektur, gap analysis, dan menghasilkan dokumentasi rekomendasi
- **Architecture_Reviewer**: Komponen yang melakukan review terhadap folder structure, feature modules, shared components, routing, dan state management
- **Navigation_Reviewer**: Komponen yang menganalisis sidebar navigation dan merekomendasikan struktur navigasi enterprise
- **Gap_Analyzer**: Komponen yang mengidentifikasi Functional Gap, Architecture Gap, Navigation Gap, dan UX Gap
- **RBAC_Reviewer**: Komponen yang menganalisis User Management, Role Management, Permission Management, dan Access Matrix
- **Insurance_Reviewer**: Komponen yang memverifikasi kesiapan sistem untuk BPJS, Private Insurance, Corporate Insurance, Cash, dan Self Pay
- **Documentation_Generator**: Komponen yang menghasilkan output dokumen audit dalam format standar enterprise
- **Feature_Based_Architecture**: Pola arsitektur dimana code diorganisasi berdasarkan fitur/domain bisnis, bukan berdasarkan layer teknis
- **RBAC**: Role-Based Access Control — model keamanan dimana akses ditentukan berdasarkan role pengguna
- **Access_Matrix**: Matriks yang mendefinisikan hak akses setiap role terhadap setiap resource/fitur
- **BPJS**: Badan Penyelenggara Jaminan Sosial — program asuransi kesehatan nasional Indonesia
- **Master_Data**: Data referensi yang digunakan sebagai acuan oleh modul lain (Test Categories, Doctors, Clinics, Insurance, Equipment, dll.)
- **Settings**: Konfigurasi sistem yang dapat diubah oleh administrator (System Settings, Notification Settings, dll.)
- **Sidebar**: Komponen navigasi utama di sisi kiri aplikasi dashboard

## Requirements

### Requirement 1: Documentation Review

**User Story:** As an Enterprise Architect, I want to review all existing documentation related to Administration, Settings, Master Data, User Management, Role & Permission, and Navigation, so that I can identify inconsistencies between documentation and implementation.

#### Acceptance Criteria

1. WHEN the audit is initiated, THE Audit_System SHALL scan all documentation files with extensions `.md`, `.docx`, and `.pdf` in `docs/01-BRD/`, `docs/02-SRS/`, `docs/03-Architecture/`, `docs/06-Frontend/`, `docs/07-Backend/`, `docs/08-API/`, `docs/15-ADR/`, `docs/16-Implementation-Readiness/`, `docs/17-Audit/`, and `docs/18-Functional-Spec/` directories
2. THE Audit_System SHALL produce a Documentation Consistency Matrix listing each document with: file path, coverage area (Administration, Settings, Master Data, User Management, Role & Permission, or Navigation), last modified date, and consistency status classified as one of: Consistent (no conflicts with other documents), Inconsistent (conflicting claims found with another document), Outdated (last modified more than 90 days before the most recent document covering the same area), or Missing (referenced in another document but file does not exist)
3. WHEN an inconsistency is found between two documents, THE Audit_System SHALL record the inconsistency with: Source Document A path, Source Document B path, Conflicting Claim A (quoted text), Conflicting Claim B (quoted text), Severity classified as Critical (contradicts a safety, security, or data integrity requirement), High (contradicts core functional behavior), Medium (contradicts non-functional or UI specification), or Low (terminology or formatting difference only), and Recommended Resolution
4. THE Audit_System SHALL verify that every feature referenced in the Functional Specification has a corresponding entry identified by matching feature name or feature identifier in each of the following: BRD, SRS, Database Design (`docs/04-Database/`), API Specification (`docs/08-API/`), and Frontend Architecture (`docs/06-Frontend/`) documents
5. IF a documented feature lacks a corresponding module, service, controller, or route definition in source code directories `apps/api/src/` or `apps/web/src/`, THEN THE Audit_System SHALL classify the finding as "Documentation-Implementation Gap" with: feature name, expected source location, evidence of absence, and recommendation for resolution
6. WHEN the audit scan is complete, THE Audit_System SHALL produce a summary report listing total documents scanned, total inconsistencies found per severity level, total documentation-implementation gaps found, and overall consistency percentage calculated as (consistent documents / total documents scanned) × 100

### Requirement 2: Source Code Architecture Review

**User Story:** As an Enterprise Architect, I want to verify whether the project follows Feature-Based Architecture patterns, so that I can identify architectural violations and recommend corrections.

#### Acceptance Criteria

1. THE Architecture_Reviewer SHALL analyze the backend folder structure under `apps/api/src/` and classify it as one of: Feature-Based (each top-level directory represents a business domain containing its own controller, service, and module), Layer-Based (top-level directories represent technical layers such as controllers/, services/, repositories/), Hybrid (mix of feature and layer directories at the same level), or Unstructured (no consistent organizational pattern detected)
2. WHEN a feature module (laboratory, auth, users, health) is missing one or more of the required artifacts (controller, service, module, DTOs directory, or test files), THE Architecture_Reviewer SHALL record each missing artifact as a "Module Completeness Violation" specifying the module name, the missing artifact type, and the expected file path
3. WHEN a shared component (guard, interceptor, filter, pipe, decorator) is found outside the `common/` directory, THE Architecture_Reviewer SHALL record it as an "Architectural Violation" with the current location and recommended location under `common/`
4. THE Architecture_Reviewer SHALL analyze the frontend folder structure under `apps/web/src/` and verify compliance with the Feature-Sliced Design pattern documented in `docs/06-Frontend/Frontend-Architecture-eLIS-v1.0.md`, checking for the presence of the required layer hierarchy (app, pages, widgets, features, entities, shared)
5. THE Architecture_Reviewer SHALL evaluate routing structure and identify: duplicate routes (two or more route definitions resolving to the same path), conflicting route groups (overlapping parameterized and static segments on the same path level), dead routes (route definitions with no corresponding page component or controller handler), and routes without corresponding page components
6. THE Architecture_Reviewer SHALL assess state management patterns and identify: global state usage (state accessible across 3 or more unrelated components), local state boundaries, server state caching strategy, and state management anti-patterns defined as: prop drilling through more than 3 component levels, storing derived/computed values in state, duplicating server data in global state without a caching layer, and mutating state directly outside designated state management functions
7. THE Architecture_Reviewer SHALL produce an Architecture Compliance Score (0-100) based on: folder structure compliance (25 points), module isolation (25 points), shared component placement (20 points), routing correctness (15 points), and state management (15 points), where each category score is calculated as: (items compliant / total items assessed) × category weight
8. IF the Architecture Compliance Score is below 60, THEN THE Architecture_Reviewer SHALL classify the overall result as "Non-Compliant" and list the top 5 violations ordered by category weight impact
9. WHEN the architecture review is complete, THE Architecture_Reviewer SHALL produce a summary report containing: the classification result, the total compliance score, the count of violations per category, and a prioritized list of all recorded violations with their severity (Critical for score impact ≥ 5 points, Major for score impact between 2 and 4 points, Minor for score impact of 1 point or less)

### Requirement 3: Navigation Review

**User Story:** As an Enterprise Architect, I want to review the current Sidebar navigation structure and determine whether Settings and Master Data should remain combined or be separated, so that the navigation follows enterprise UX best practices.

#### Acceptance Criteria

1. THE Navigation_Reviewer SHALL document the current sidebar menu structure as a table containing: menu item name, route path, Lucide icon name, parent grouping, access role requirements, and the count of sub-features within each menu item
2. THE Navigation_Reviewer SHALL evaluate the current single "Pengaturan" (Settings) menu item against the following measurable criteria: number of sub-features per menu item (flagging any menu containing more than 7 sub-features as exceeding single-menu capacity), conceptual cohesion (whether all sub-features share the same domain purpose), and frequency-of-access disparity (whether high-frequency items like Users are grouped with low-frequency items like Measurement Units)
3. THE Navigation_Reviewer SHALL produce a recommendation selecting one of three options: (A) Keep Settings and Master Data combined under one menu, (B) Separate Settings and Master Data into distinct top-level menus, or (C) Create a hierarchical navigation with expandable sub-menus — and SHALL include for each rejected option a specific reason why it was not chosen based on the evaluation criteria in criterion 2
4. WHEN recommending a navigation structure, THE Navigation_Reviewer SHALL include: proposed menu hierarchy (max 3 levels, max 7 items per level), icon assignments per Lucide icon library, role-based visibility rules mapped to the system roles (SUPER_ADMIN, OWNER, MANAGER, KASIR, ADMIN, SAMPLING, ANALIS, DOKTER, CS, MARKETING, KLINIK_PARTNER), and route path mapping for each navigation entry
5. THE Navigation_Reviewer SHALL produce an Enterprise Navigation Blueprint that assigns each of the current 14 sub-features (Test Categories, Lab Tests, Panels, Tariffs, Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Users, Wilayah, SMTP Settings) into one of these domains: Clinical Operations, Administration, Master Data, System Configuration, or Reporting — with each sub-feature assigned to exactly one domain
6. THE Navigation_Reviewer SHALL verify that every backend API module (auth, users, master-data, laboratory, orders, regions, settings) has a corresponding frontend navigation entry and page, and SHALL list any modules lacking a frontend navigation path as gaps

### Requirement 4: Gap Analysis

**User Story:** As an Enterprise Architect, I want a comprehensive gap analysis covering Functional, Architecture, Navigation, and UX dimensions, so that I can prioritize remediation efforts.

#### Acceptance Criteria

1. THE Gap_Analyzer SHALL produce a Functional Gap report listing features documented in BRD/SRS/FS that are not implemented or only partially implemented in the Administration, Master Data, and Settings modules, with columns: Feature ID, Feature Name, Expected Behavior, Current Status (Not Implemented — no code exists; Partial — code exists but at least one documented sub-feature is missing or non-functional; Complete — all documented behaviors pass verification), Evidence (file path or API endpoint where status was observed), Root Cause, Recommendation, and Priority (P1-P4 per MoSCoW: P1 Must Have, P2 Should Have, P3 Could Have, P4 Won't Have This Phase)
2. THE Gap_Analyzer SHALL produce an Architecture Gap report identifying deviations from documented architecture patterns in the Architecture Decision Records (docs/15-ADR) and Frontend/Backend architecture documents, with columns: Gap ID, Category (Backend, Frontend, Database, Infrastructure), Description, Current State, Expected State, Impact (Critical — system unusable or data loss; High — feature blocked; Medium — degraded experience; Low — cosmetic or minor), and Remediation Effort (S ≤ 2 story points, M = 3-5 story points, L = 6-13 story points, XL ≥ 14 story points)
3. THE Gap_Analyzer SHALL produce a Navigation Gap report for the Administration, Master Data, and Settings modules identifying: menu items defined in sidebar configuration that link to non-existent or error-producing pages, implemented features that have no corresponding menu item, sidebar labels that differ from the rendered page title by more than casing or whitespace, and navigation elements that fail WCAG 2.1 AA success criteria 2.4.1 (Bypass Blocks), 2.4.5 (Multiple Ways), or 4.1.2 (Name Role Value) as detected by automated accessibility scanning
4. THE Gap_Analyzer SHALL produce a UX Gap report for the Administration, Master Data, and Settings modules identifying: design system violations measured against the project's documented design tokens (color palette, typography scale, spacing scale), component inconsistencies where the same component type (button, form input, table) uses different visual properties across pages within the audited modules, pages lacking responsive layout at breakpoints 640px, 768px, 1024px, and 1280px, interactive operations that do not render a loading indicator within 200ms of initiation, server error responses (4xx or 5xx) that do not display a user-visible error message, and WCAG 2.1 AA violations detectable by automated tooling (axe-core or equivalent)
5. WHEN a gap is identified in any of the four reports, THE Gap_Analyzer SHALL assign a priority using MoSCoW: P1 (Must Have — blocks production use or causes data integrity failure), P2 (Should Have — degrades core workflow), P3 (Could Have — improves usability but has workaround), P4 (Won't Have This Phase — deferred with no current impact)
6. THE Gap_Analyzer SHALL produce a Gap Summary Dashboard containing: total gap count per report category (Functional, Architecture, Navigation, UX), gap count per severity level (Critical, High, Medium, Low) within each category, and estimated total remediation effort expressed as a sum of story points using the sizing scale defined in criterion 2 (S ≤ 2, M = 3-5, L = 6-13, XL ≥ 14)
7. THE Gap_Analyzer SHALL scope the analysis to the Administration, Master Data, and Settings modules only, using as input sources the BRD, SRS, Functional Specification (FS-TS-ELIS-LAB-NCR0001), Architecture Decision Records (docs/15-ADR), Frontend Architecture document (docs/06-Frontend), and the existing implementation in apps/api and apps/web

### Requirement 5: Enterprise User Management Review

**User Story:** As an Enterprise Architect, I want to review the current User Management implementation and determine whether the system requires a complete Enterprise RBAC model with Department, Position, and Approval Matrix, so that access control meets enterprise security standards.

#### Acceptance Criteria

1. THE RBAC_Reviewer SHALL document the current User Management implementation including: all Role enum values (SUPER_ADMIN, OWNER, MANAGER, KASIR, ADMIN, SAMPLING, ANALIS, DOKTER, CS, MARKETING, KLINIK_PARTNER), every CRUD endpoint across all modules with its HTTP method and path, the guard implementation mechanism (decorator-based @Roles with RolesGuard), and which roles are assigned to each protected route
2. THE RBAC_Reviewer SHALL evaluate the current Role-based system against the following enterprise access control capabilities and identify which are missing: granular permission management (action-level control beyond role matching), role hierarchy (inheritance between roles), role composition (combining multiple roles per user), department-based access (restricting data visibility by organizational unit), position-based access (mapping job positions to permission sets), and approval workflows (multi-step authorization chains)
3. THE RBAC_Reviewer SHALL produce a recommendation selecting one of: (A) Enhanced Role-Based model retaining the current Role enum with added per-role permission granularity, (B) Full RBAC with separate Permission and RolePermission entities enabling dynamic permission assignment, or (C) ABAC hybrid combining role-based and attribute-based policies — including for the selected option: a justification referencing at least 3 identified gaps from criterion 2, a migration path from the current implementation, and an impact assessment listing affected modules
4. WHEN an Enterprise RBAC model (option B or C) is recommended, THE RBAC_Reviewer SHALL produce: an Access Matrix mapping all 11 roles against every resource endpoint with CRUD and custom action permissions (one entry per role-resource-action combination), a database schema proposal for Permission, RolePermission, Department, Position, and UserDepartment entities showing relationships to the existing User model, and API endpoint specifications for permission CRUD and role-permission assignment operations
5. THE RBAC_Reviewer SHALL evaluate whether an Approval Matrix is needed by analyzing each of the following workflows against the current implementation: laboratory result verification (ANALIS enters result → DOKTER approves), financial transaction authorization (KASIR processes payment → MANAGER approves refunds or voids), master data changes (ADMIN proposes change → SUPER_ADMIN approves), and user account management (ADMIN creates/modifies user → OWNER approves role elevation) — producing for each workflow a determination of whether the current single-role guard is sufficient or a multi-step approval chain is required
6. THE RBAC_Reviewer SHALL verify that every existing API endpoint across all modules (auth, users, laboratory sub-modules including master-data, order, patient, payment, lab-workflow, notification, audit, dashboard, region, and health) has a role guard applied, and SHALL document any endpoint lacking a @UseGuards(JwtAuthGuard, RolesGuard) decorator or explicit @Roles assignment as a Critical security finding
7. IF any API endpoint is found without role guard protection, THEN THE RBAC_Reviewer SHALL classify the finding as Critical severity and SHALL include in the documentation: the endpoint path and HTTP method, the module containing the endpoint, and a recommended minimum role restriction based on the endpoint's data sensitivity (read-only public data, authenticated-user data, or admin-restricted data)

### Requirement 6: Healthcare & Insurance Readiness

**User Story:** As an Enterprise Architect, I want to verify that the system supports BPJS, Private Insurance, Corporate Insurance, Cash, and Self Pay payment flows, so that the laboratory can serve all patient payment types.

#### Acceptance Criteria

1. THE Insurance_Reviewer SHALL verify the database schema supports insurance-related entities: Insurance model with type field distinguishing BPJS, Swasta, and Corporate (as an enum or constrained string with exactly these 3 values), Patient-Insurance relationship (supporting at least 1 and at most 5 insurance records per patient), Order-Insurance relationship (linking a single order to at most 2 insurance providers for primary/secondary coverage), and Tariff-Insurance relationship for differential pricing per test-insurance combination
2. THE Insurance_Reviewer SHALL verify the billing workflow supports: Cash payment (direct pay at POS with no insurance reference required), Insurance claim (Insurance reference on Order with mandatory claim reference number of up to 50 characters), BPJS integration readiness (BPJS-specific fields including: SEP number field up to 19 characters, BPJS verification status, referring facility code, and BPJS class level 1/2/3), and Corporate Insurance (company billing with batch invoicing support for grouping up to 500 orders per invoice cycle)
3. IF the Insurance model lacks a `type` field distinguishing BPJS from Private from Corporate, THEN THE Insurance_Reviewer SHALL produce a database schema recommendation with migration strategy
4. THE Insurance_Reviewer SHALL verify the Laboratory Workflow handles insurance-specific rules: pre-authorization flag on TestMaster indicating which tests require insurance approval before processing, price override based on insurance tariff agreements using the Tariff-Insurance relationship, claim number generation and tracking with a unique claim reference per Order-Insurance combination, and insurance-specific reporting filterable by insurance type and date range
5. THE Insurance_Reviewer SHALL verify that Payment Flow supports: split payment allowing partial insurance coverage plus partial cash payment where the sum of all payment components equals the order total amount, insurance rejection handling where a denied claim triggers status change and the patient is prompted to pay remaining balance via cash or transfer within 72 hours, multiple insurance coverage per patient with primary and secondary designation, and insurance-specific receipt formats that include the insurance name, claim reference number, and covered versus patient-responsible amounts
6. IF missing capabilities are identified, THEN THE Insurance_Reviewer SHALL produce: a Functional Requirement document for each missing capability specifying acceptance criteria in EARS format, a Gap Analysis entry with evidence referencing the specific schema model or module deficiency, and an Implementation Recommendation with priority classified as Critical, High, Medium, or Low and effort estimation in person-days (ranging from 1 to 90)
7. IF the current PaymentMethod enum does not distinguish between Self Pay and Insurance-covered Cash scenarios, THEN THE Insurance_Reviewer SHALL recommend adding a payment type that differentiates patient-initiated cash payment from insurance-rejection fallback payment, preserving audit traceability of the original insurance claim attempt

### Requirement 7: Recommended Enterprise Architecture

**User Story:** As an Enterprise Architect, I want to produce a recommended architecture that addresses all identified gaps and violations, so that the development team has a clear target state to implement.

#### Acceptance Criteria

1. THE Audit_System SHALL produce a Target State Architecture document describing: recommended backend module organization (Feature-Based with Bounded Contexts), recommended frontend architecture (Feature-Sliced Design), recommended database organization (schema per domain), and recommended navigation structure
2. THE Audit_System SHALL produce an Architecture Decision Record (ADR) for each major recommendation: Separation of Settings vs Master Data, Enterprise RBAC model selection, Navigation restructuring approach, and Insurance integration architecture — each ADR following the project's existing ADR template structure (Context, Problem, Alternative, Pros, Cons, Selected, Consequence, Future Consideration)
3. THE Audit_System SHALL produce a Migration Path from current state to target state with: phased implementation plan (Phase 1: Critical, Phase 2: High, Phase 3: Medium), file-level refactoring instructions without modifying existing functionality, backward compatibility requirements, and rollback strategy for each phase including the trigger condition that initiates rollback (any existing automated test failure or any existing API endpoint returning a different response structure than before migration)
4. WHEN recommending module reorganization, THE Audit_System SHALL include a Backward Compatibility Verification section listing: every existing API endpoint affected, the expected request/response contract before and after reorganization, and a verification method (automated test reference or manual verification step) confirming that no existing endpoint, route, or functionality changes its observable behavior
5. THE Audit_System SHALL produce an Implementation Readiness Checklist for the target architecture with: prerequisites per phase, acceptance criteria per phase (defined as observable conditions that must be true for the phase to be considered complete), and sign-off requirements specifying the responsible role (Enterprise Architect, Tech Lead, or QA Lead) for each phase approval
6. IF a migration phase fails its acceptance criteria after implementation begins, THEN THE Audit_System SHALL document in the Migration Path: the rollback procedure to restore the pre-phase state, the maximum allowable time window for rollback execution (defined per phase), and the verification steps to confirm successful rollback

### Requirement 8: Documentation Output

**User Story:** As an Enterprise Architect, I want all audit findings to be documented in the project's standard documentation structure, so that the team can track and implement recommendations.

#### Acceptance Criteria

1. THE Documentation_Generator SHALL produce output files in the following locations: `docs/17-Audit/enterprise-admin-audit-report.md` (main audit report), `docs/17-Audit/architecture-gap-analysis.md` (architecture gaps), `docs/17-Audit/navigation-review.md` (navigation analysis), `docs/17-Audit/rbac-review.md` (user management analysis), `docs/17-Audit/insurance-readiness.md` (healthcare & insurance readiness)
2. IF a target output file already exists at the specified location, THEN THE Documentation_Generator SHALL overwrite the file content with the new audit results and increment the Version number in the document header
3. THE Documentation_Generator SHALL append new findings and recommendations from this audit to `docs/16-Implementation-Readiness/Checklist.md` without removing or modifying existing checklist items, and SHALL prefix each appended item with the audit Document ID for traceability
4. THE Documentation_Generator SHALL produce each document with standard enterprise headers containing: Document ID (format: `AUDIT-eLIS-[YYYY]-[NNN]`), Version (format: major.minor, starting at 1.0), Date (format: YYYY-MM-DD), Author (role performing the audit), Classification (one of: Internal, Confidential, Restricted), and Status (one of: Draft, Review, Approved, Superseded)
5. WHEN producing recommendations, THE Documentation_Generator SHALL use consistent severity labels: Critical (system cannot function), High (significant limitation), Medium (impacts efficiency), Low (cosmetic or nice-to-have)
6. THE Documentation_Generator SHALL produce a Summary Executive Brief of no more than 1500 words covering: total findings count by severity, top 5 critical findings, recommended immediate actions, and estimated total remediation effort expressed in story points
7. THE Documentation_Generator SHALL NOT produce any file that modifies source code under `apps/api/src/` or `apps/web/src/` directories — all output is documentation only
8. THE Documentation_Generator SHALL include cross-reference links between related findings across the generated documents, using the format `[Document ID]#[Finding ID]` so that each recommendation is traceable to its source gap analysis entry

### Requirement 9: Existing Functionality Protection

**User Story:** As a Development Team Lead, I want assurance that this audit process will not modify any existing running functionality, so that current operations remain stable.

#### Acceptance Criteria

1. THE Audit_System SHALL operate in read-only mode for all source code files under `apps/api/` and `apps/web/` directories, limiting file system operations to reading file contents and listing directory structures
2. THE Audit_System SHALL NOT create, modify, or delete any file with extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.prisma`, `.sql`, `.env`, or `.json` within the `apps/` directory
3. THE Audit_System SHALL NOT execute any database migration, seed command, build command, or deployment command against any environment (development, staging, or production)
4. THE Audit_System SHALL NOT modify any Docker configuration file (`Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`), environment variable file (`.env`, `.env.*`), or infrastructure file (`Makefile`, `deploy/` directory contents)
5. IF a recommendation requires source code modification, THEN THE Audit_System SHALL document it as a "Proposed Change" in the audit output with: file path, current code (reference only), proposed change description, and risk assessment indicating severity (high/medium/low) and affected components — without applying the change
6. THE Documentation_Generator SHALL include a "No-Code-Modification Attestation" section in the final audit report confirming that no source code was altered during the audit process, including a listing of all directories that were accessed and the access mode (read-only) used
7. THE Audit_System SHALL write all output artifacts exclusively to the `docs/` directory, and SHALL NOT write any files into the `apps/`, `deploy/`, or root configuration paths

### Requirement 10: Master Data & Settings Separation Analysis

**User Story:** As an Enterprise Architect, I want a detailed analysis of whether Master Data and Settings should remain combined under one menu or be separated into distinct modules, so that the system organization follows enterprise data governance principles.

#### Acceptance Criteria

1. THE Audit_System SHALL classify each sub-feature currently under "Pengaturan" (Settings) page into one of: Master Data (reference data referenced by 2 or more other modules and changed less than once per month), System Settings (key-value configuration parameters that alter system behavior without code changes), User Administration (user accounts, roles, permissions), or Operational Configuration (notification templates, workflow rules that change more than once per month)
2. THE Audit_System SHALL produce a classification matrix with columns: Feature Name, Current Location, Data Classification (one of the four categories from criterion 1), Change Frequency (daily/weekly/monthly/rarely), Owner Role, Proposed Location, and Migration Impact scored as Low (no schema change, UI-only relocation), Medium (requires new API endpoints or module restructuring), or High (requires data migration or breaking interface changes)
3. THE Audit_System SHALL apply these enterprise data governance rules during classification: Master Data entities (Doctors, Clinics, Insurance, Equipment, Reagents, Sample Types, Measurement Units, Test Categories, Lab Tests, Panels) belong under a dedicated "Master Data" domain; System Settings (key-value configuration, notification preferences) belong under "System Settings"; and User/Role management belongs under "Administration"
4. THE Audit_System SHALL evaluate the current backend module structure (`laboratory/master-data/`) against these isolation criteria: single-responsibility (each module serves exactly one bounded context), dependency direction (master data modules have no import dependencies on workflow or settings modules), and interface segregation (shared entities are accessed through dedicated service interfaces, not direct cross-module imports)
5. THE Audit_System SHALL produce a recommended module boundary map listing: each backend service assigned to exactly one bounded context ("Master Data", "Settings", or "User Administration"), any service that currently crosses bounded context boundaries identified as a violation, and for each cross-context dependency, a proposed interface contract (service name, consumed data entities, and access pattern) to decouple the modules
