/**
 * Core interfaces for the LIS Business Process Audit Engine.
 *
 * The audit engine performs read-only static analysis of the eLIS codebase,
 * tracing 16 business processes through the full technical stack and
 * producing a structured Gap Report with Remediation Tasks.
 */

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

/** Gap classification status with strict precedence:
 *  BROKEN > WRONG_BUSINESS_LOGIC > MOCK_STATIC > PARTIAL > MISSING > IMPLEMENTED */
export type GapStatus =
  | 'IMPLEMENTED'
  | 'PARTIAL'
  | 'MISSING'
  | 'BROKEN'
  | 'WRONG_BUSINESS_LOGIC'
  | 'MOCK_STATIC';

/** Architectural stack layers inspected during audit */
export type StackLayer =
  | 'UI'
  | 'API'
  | 'CONTROLLER'
  | 'SERVICE'
  | 'REPOSITORY'
  | 'DATABASE';

/** Severity levels for remediation tasks */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

// ---------------------------------------------------------------------------
// Layer Tracing
// ---------------------------------------------------------------------------

/** Result of tracing a single architectural layer */
export interface LayerTrace {
  layer: StackLayer;
  status: 'PRESENT' | 'PARTIAL' | 'ABSENT';
  filePath?: string;
  lineReferences?: number[];
  evidence?: string;
  issues?: string[];
}

// ---------------------------------------------------------------------------
// Criterion Evaluation
// ---------------------------------------------------------------------------

/** A single acceptance criterion check result */
export interface CriterionResult {
  /** Criterion identifier, e.g. "1.1" */
  criterionId: string;
  description: string;
  passed: boolean;
  /** File path + line reference as evidence */
  evidence: string;
  /** Description of the gap if not passed */
  gap?: string;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/** Classification output for a business process */
export interface ProcessClassification {
  processName: string;
  status: GapStatus;
  layerTraces: LayerTrace[];
  criterionResults: CriterionResult[];
  /** File paths with line references */
  evidence: string[];
  /** 1-3 sentence gap description if not IMPLEMENTED */
  gapDescription?: string;
}

// ---------------------------------------------------------------------------
// Remediation
// ---------------------------------------------------------------------------

/** Remediation task output */
export interface RemediationTask {
  /** Max 120 characters */
  title: string;
  priority: Severity;
  businessProcess: string;
  /** Max 500 characters */
  gapDescription: string;
  /** Max 300 characters */
  suggestedApproach: string;
  affectedLayers: StackLayer[];
}

// ---------------------------------------------------------------------------
// Gap Report
// ---------------------------------------------------------------------------

/** Non-fatal error encountered during audit execution */
export interface AuditError {
  timestamp: string;
  businessProcess: string;
  layer: StackLayer;
  description: string;
  /** Whether the audit continued after this error */
  continued: boolean;
}

/** Final gap report produced by the audit engine */
export interface GapReport {
  generatedAt: string;
  processClassifications: ProcessClassification[];
  remediationTasks: RemediationTask[];
  summary: {
    implemented: number;
    partial: number;
    missing: number;
    broken: number;
    wrongLogic: number;
    mockStatic: number;
  };
  /** Warning if AUDIT_STATUS.md was not found or unparseable */
  crossRefWarning?: string;
  /** Non-fatal errors encountered during audit */
  auditErrors?: AuditError[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Audit engine configuration */
export interface AuditConfig {
  /** Workspace root path */
  projectRoot: string;
  /** Relative path to API source, e.g. "apps/api/src" */
  apiSourcePath: string;
  /** Relative path to web source, e.g. "apps/web/src" */
  webSourcePath: string;
  /** Relative path to Prisma schema, e.g. "apps/api/prisma/schema.prisma" */
  prismaSchemaPath: string;
  /** Relative path to AUDIT_STATUS.md, e.g. "docs/AUDIT_STATUS.md" */
  auditStatusPath: string;
  /** Relative path to the functional spec document */
  functionalSpecPath: string;
  /** Output report location */
  outputPath: string;
  /** Cap for UI/UX audit page scanning (default: 50) */
  maxDashboardPages: number;
}

// ---------------------------------------------------------------------------
// Inspection Targets
// ---------------------------------------------------------------------------

/** Glob-based file pattern for inspection */
export interface FilePattern {
  /** Glob pattern, e.g. "apps/api/src/laboratory/patient/**\/*.ts" */
  glob: string;
  /** Description of what we're looking for */
  purpose: string;
}

/** A required artifact that must exist in the codebase */
export interface RequiredArtifact {
  description: string;
  /** Regex pattern to search for in matched files */
  searchPattern: string;
  layer: StackLayer;
}

/** Defines what to inspect for a given stack layer */
export interface InspectionTarget {
  layer: StackLayer;
  patterns: FilePattern[];
  requiredArtifacts: RequiredArtifact[];
}

// ---------------------------------------------------------------------------
// Business Process Definition
// ---------------------------------------------------------------------------

/** Definition of a business process to audit */
export interface BusinessProcessDefinition {
  id: number;
  name: string;
  /** Reference to functional spec section, e.g. "FR-03" */
  functionalSpecRef: string;
  /** Human-readable description of expected flow */
  targetFlow: string;
  /** What's expected at each stack layer */
  stackExpectations: Record<StackLayer, string[]>;
}

// ---------------------------------------------------------------------------
// AUDIT_STATUS Cross-Reference
// ---------------------------------------------------------------------------

/** Parsed entry from docs/AUDIT_STATUS.md */
export interface AuditStatusEntry {
  /** Entry identifier, e.g. "CRIT-001" */
  id: string;
  title: string;
  status: 'Implemented' | 'Partial' | 'Open' | 'Blocked' | 'FalsePositive';
  evidence: string;
  remainingGap: string | null;
}

// ---------------------------------------------------------------------------
// Process Auditor Plugin Interface
// ---------------------------------------------------------------------------

/** Plugin interface that each business process auditor must implement */
export interface ProcessAuditor {
  /** Name of the business process being audited */
  processName: string;
  /** Stack layers this auditor targets */
  targetLayers: StackLayer[];

  /** Define what files/patterns to inspect per layer */
  getInspectionTargets(): InspectionTarget[];

  /** Evaluate acceptance criteria against traced layers */
  evaluateCriteria(traces: LayerTrace[]): CriterionResult[];
}
