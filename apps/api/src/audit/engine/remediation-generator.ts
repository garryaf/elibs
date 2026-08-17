/**
 * RemediationGenerator — produces one RemediationTask per non-IMPLEMENTED
 * ProcessClassification, with severity assigned by business impact.
 *
 * Severity mapping:
 *   CRITICAL: Specimen Collection, Lab Processing, Tech Verification,
 *             Doctor Validation, Report Release
 *   HIGH:     Pricing, Billing/Payment, Payer/Insurance
 *   MEDIUM:   Gap Report, Audit Trail, UI/UX Consistency
 *   LOW:      all others (Patient Registration, Visit, Order,
 *             Service Catalog, Discount Workflow)
 */

import {
  ProcessClassification,
  RemediationTask,
  Severity,
  StackLayer,
} from './interfaces';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TITLE_LENGTH = 120;
const MAX_GAP_DESCRIPTION_LENGTH = 500;
const MAX_SUGGESTED_APPROACH_LENGTH = 300;

/** Substring patterns for CRITICAL severity (case-insensitive) */
const CRITICAL_PATTERNS = [
  'specimen collection',
  'lab processing',
  'tech verification',
  'doctor validation',
  'report release',
];

/** Substring patterns for HIGH severity (case-insensitive) */
const HIGH_PATTERNS = [
  'pricing',
  'billing',
  'payment',
  'payer',
  'insurance',
];

/** Substring patterns for MEDIUM severity (case-insensitive) */
const MEDIUM_PATTERNS = [
  'gap report',
  'audit trail',
  'ui/ux',
  'ui ux',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Truncate a string to maxLen characters, appending "..." if truncated.
 */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) {
    return value;
  }
  return value.slice(0, maxLen - 3) + '...';
}

/**
 * Determine severity by matching the process name against known patterns.
 */
function assignSeverity(processName: string): Severity {
  const lower = processName.toLowerCase();

  if (CRITICAL_PATTERNS.some((p) => lower.includes(p))) {
    return 'CRITICAL';
  }
  if (HIGH_PATTERNS.some((p) => lower.includes(p))) {
    return 'HIGH';
  }
  if (MEDIUM_PATTERNS.some((p) => lower.includes(p))) {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Derive affected layers from layer traces where status is not PRESENT.
 */
function deriveAffectedLayers(classification: ProcessClassification): StackLayer[] {
  return classification.layerTraces
    .filter((t) => t.status !== 'PRESENT')
    .map((t) => t.layer);
}

/**
 * Generate a default gap description based on classification status.
 */
function buildGapDescription(classification: ProcessClassification): string {
  if (classification.gapDescription) {
    return truncate(classification.gapDescription, MAX_GAP_DESCRIPTION_LENGTH);
  }

  const statusDescriptions: Record<string, string> = {
    MISSING: `The ${classification.processName} process has no implementation artifacts found in the codebase.`,
    PARTIAL: `The ${classification.processName} process is partially implemented — some acceptance criteria pass but not all.`,
    BROKEN: `The ${classification.processName} process has runtime errors or broken implementation.`,
    WRONG_BUSINESS_LOGIC: `The ${classification.processName} process has logic that contradicts the functional specification.`,
    MOCK_STATIC: `The ${classification.processName} process uses hardcoded or placeholder data instead of real implementation.`,
  };

  const description =
    statusDescriptions[classification.status] ||
    `The ${classification.processName} process requires remediation (status: ${classification.status}).`;

  return truncate(description, MAX_GAP_DESCRIPTION_LENGTH);
}

/**
 * Generate a suggested approach based on affected layers.
 */
function buildSuggestedApproach(classification: ProcessClassification): string {
  const affectedLayers = deriveAffectedLayers(classification);

  if (affectedLayers.length === 0) {
    return truncate(
      `Review and fix existing implementation for ${classification.processName} to resolve ${classification.status} status.`,
      MAX_SUGGESTED_APPROACH_LENGTH,
    );
  }

  const layerList = affectedLayers.join(', ');
  return truncate(
    `Implement missing ${layerList} layers for ${classification.processName}.`,
    MAX_SUGGESTED_APPROACH_LENGTH,
  );
}

// ---------------------------------------------------------------------------
// RemediationGenerator
// ---------------------------------------------------------------------------

export class RemediationGenerator {
  /**
   * Generate remediation tasks from process classifications.
   * Produces exactly one RemediationTask per non-IMPLEMENTED classification.
   */
  generate(classifications: ProcessClassification[]): RemediationTask[] {
    return classifications
      .filter((c) => c.status !== 'IMPLEMENTED')
      .map((classification) => this.buildTask(classification));
  }

  private buildTask(classification: ProcessClassification): RemediationTask {
    const rawTitle = `[${classification.status}] ${classification.processName}`;

    return {
      title: truncate(rawTitle, MAX_TITLE_LENGTH),
      priority: assignSeverity(classification.processName),
      businessProcess: classification.processName,
      gapDescription: buildGapDescription(classification),
      suggestedApproach: buildSuggestedApproach(classification),
      affectedLayers: deriveAffectedLayers(classification),
    };
  }
}
