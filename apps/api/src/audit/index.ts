/**
 * LIS Business Process Audit Engine
 *
 * A read-only code inspection engine that traces 16 laboratory business
 * processes through the full technical stack, classifies implementation gaps,
 * and produces a prioritized remediation report.
 */

export type {
  GapStatus,
  StackLayer,
  Severity,
  LayerTrace,
  CriterionResult,
  ProcessClassification,
  RemediationTask,
  AuditError,
  GapReport,
  AuditConfig,
  FilePattern,
  RequiredArtifact,
  InspectionTarget,
  BusinessProcessDefinition,
  AuditStatusEntry,
  ProcessAuditor,
} from './engine/interfaces';

export { AuditStatusCrossRef } from './engine/cross-reference';
export { GapClassifier } from './engine/gap-classifier';
export { StackTracer } from './engine/stack-tracer';
