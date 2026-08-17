/**
 * GapClassifier — Determines the classification status of a business process
 * based on layer traces and criterion evaluation results.
 *
 * Applies strict precedence ordering:
 *   BROKEN > WRONG_BUSINESS_LOGIC > MOCK_STATIC > PARTIAL > MISSING > IMPLEMENTED
 *
 * First matching classification wins — this guarantees deterministic output
 * for any given set of traces and criteria.
 */

import type {
  LayerTrace,
  CriterionResult,
  ProcessClassification,
  GapStatus,
} from './interfaces';

// ---------------------------------------------------------------------------
// Keyword patterns for detection (case-insensitive)
// ---------------------------------------------------------------------------

const BROKEN_KEYWORDS = [
  'runtime error',
  'exception',
  'broken',
  'crash',
];

const WRONG_LOGIC_KEYWORDS = [
  'contradicts',
  'wrong logic',
  'incorrect business',
  'violates spec',
];

const MOCK_STATIC_KEYWORDS = [
  'hardcoded',
  'placeholder',
  'mock',
  'static data',
  'dummy',
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function collectEvidence(traces: LayerTrace[]): string[] {
  const evidence: string[] = [];
  for (const trace of traces) {
    if (trace.filePath) {
      const lineRef =
        trace.lineReferences && trace.lineReferences.length > 0
          ? `:${trace.lineReferences[0]}`
          : '';
      evidence.push(`${trace.filePath}${lineRef}`);
    }
  }
  return evidence;
}

function buildGapDescription(
  status: GapStatus,
  traces: LayerTrace[],
  criteria: CriterionResult[],
): string | undefined {
  if (status === 'IMPLEMENTED') {
    return undefined;
  }

  switch (status) {
    case 'BROKEN': {
      const brokenGaps = criteria
        .filter((c) => c.gap && containsAny(c.gap, BROKEN_KEYWORDS))
        .map((c) => c.gap);
      const brokenIssues = traces
        .flatMap((t) => t.issues ?? [])
        .filter((issue) => containsAny(issue, BROKEN_KEYWORDS));
      const details = [...brokenGaps, ...brokenIssues].slice(0, 3);
      return `Runtime errors detected: ${details.join('; ') || 'implementation has broken components'}.`;
    }
    case 'WRONG_BUSINESS_LOGIC': {
      const logicGaps = criteria
        .filter((c) => c.gap && containsAny(c.gap, WRONG_LOGIC_KEYWORDS))
        .map((c) => c.gap);
      return `Business logic contradicts functional spec: ${logicGaps.slice(0, 3).join('; ') || 'logic deviates from specification'}.`;
    }
    case 'MOCK_STATIC': {
      const mockGaps = criteria
        .filter((c) => c.gap && containsAny(c.gap, MOCK_STATIC_KEYWORDS))
        .map((c) => c.gap);
      const mockEvidence = traces
        .filter((t) => t.evidence && containsAny(t.evidence, MOCK_STATIC_KEYWORDS))
        .map((t) => t.evidence);
      const details = [...mockGaps, ...mockEvidence].slice(0, 3);
      return `Hardcoded or placeholder data detected: ${details.join('; ') || 'implementation uses mock/static values'}.`;
    }
    case 'PARTIAL': {
      const failedCount = criteria.filter((c) => !c.passed).length;
      const totalCount = criteria.length;
      const absentLayers = traces
        .filter((t) => t.status !== 'PRESENT')
        .map((t) => t.layer);
      const parts: string[] = [];
      if (failedCount > 0 && failedCount < totalCount) {
        parts.push(`${failedCount}/${totalCount} criteria failed`);
      }
      if (absentLayers.length > 0) {
        parts.push(`layers not fully present: ${absentLayers.join(', ')}`);
      }
      return `Partial implementation: ${parts.join('; ') || 'some components incomplete'}.`;
    }
    case 'MISSING': {
      return 'No implementation artifacts found for this business process.';
    }
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// GapClassifier
// ---------------------------------------------------------------------------

export class GapClassifier {
  /**
   * Classify a business process based on layer traces and criterion results.
   *
   * Applies strict precedence:
   *   BROKEN > WRONG_BUSINESS_LOGIC > MOCK_STATIC > PARTIAL > MISSING > IMPLEMENTED
   */
  classify(
    processName: string,
    traces: LayerTrace[],
    criteria: CriterionResult[],
  ): ProcessClassification {
    const status = this.determineStatus(traces, criteria);
    const evidence = collectEvidence(traces);
    const gapDescription = buildGapDescription(status, traces, criteria);

    return {
      processName,
      status,
      layerTraces: traces,
      criterionResults: criteria,
      evidence,
      gapDescription,
    };
  }

  /**
   * Determine the GapStatus by applying precedence rules in order.
   * First match wins.
   */
  private determineStatus(
    traces: LayerTrace[],
    criteria: CriterionResult[],
  ): GapStatus {
    // 1. BROKEN: runtime errors detected
    if (this.isBroken(traces, criteria)) {
      return 'BROKEN';
    }

    // 2. WRONG_BUSINESS_LOGIC: logic contradicts functional spec
    if (this.isWrongBusinessLogic(criteria)) {
      return 'WRONG_BUSINESS_LOGIC';
    }

    // 3. MOCK_STATIC: hardcoded/placeholder data
    if (this.isMockStatic(traces, criteria)) {
      return 'MOCK_STATIC';
    }

    // 4. PARTIAL: mixed results
    if (this.isPartial(traces, criteria)) {
      return 'PARTIAL';
    }

    // 5. MISSING: no implementation artifacts
    if (this.isMissing(traces, criteria)) {
      return 'MISSING';
    }

    // 6. IMPLEMENTED: all criteria pass and all layers present
    return 'IMPLEMENTED';
  }

  /**
   * BROKEN: Any criterion has gap containing runtime error keywords,
   * OR any LayerTrace has issues containing error indicators.
   */
  private isBroken(traces: LayerTrace[], criteria: CriterionResult[]): boolean {
    const hasBrokenCriterion = criteria.some(
      (c) => c.gap && containsAny(c.gap, BROKEN_KEYWORDS),
    );

    const hasBrokenTrace = traces.some(
      (t) =>
        t.issues != null &&
        t.issues.some((issue) => containsAny(issue, BROKEN_KEYWORDS)),
    );

    return hasBrokenCriterion || hasBrokenTrace;
  }

  /**
   * WRONG_BUSINESS_LOGIC: Any criterion has gap containing logic contradiction keywords.
   */
  private isWrongBusinessLogic(criteria: CriterionResult[]): boolean {
    return criteria.some(
      (c) => c.gap && containsAny(c.gap, WRONG_LOGIC_KEYWORDS),
    );
  }

  /**
   * MOCK_STATIC: Any criterion has gap containing mock/placeholder keywords,
   * OR any LayerTrace evidence mentions these terms.
   */
  private isMockStatic(
    traces: LayerTrace[],
    criteria: CriterionResult[],
  ): boolean {
    const hasMockCriterion = criteria.some(
      (c) => c.gap && containsAny(c.gap, MOCK_STATIC_KEYWORDS),
    );

    const hasMockEvidence = traces.some(
      (t) => t.evidence && containsAny(t.evidence, MOCK_STATIC_KEYWORDS),
    );

    return hasMockCriterion || hasMockEvidence;
  }

  /**
   * PARTIAL: Some criteria pass AND some fail (mixed results),
   * OR some layers are PRESENT and others are not,
   * OR any layer has PARTIAL status (not fully PRESENT, not fully ABSENT).
   */
  private isPartial(traces: LayerTrace[], criteria: CriterionResult[]): boolean {
    // Check criteria: mixed pass/fail
    if (criteria.length > 0) {
      const passedCount = criteria.filter((c) => c.passed).length;
      const failedCount = criteria.length - passedCount;
      if (passedCount > 0 && failedCount > 0) {
        return true;
      }
    }

    // Check traces: mixed PRESENT vs non-PRESENT
    if (traces.length > 0) {
      const presentCount = traces.filter((t) => t.status === 'PRESENT').length;
      const nonPresentCount = traces.length - presentCount;
      if (presentCount > 0 && nonPresentCount > 0) {
        return true;
      }

      // Any trace with PARTIAL status indicates partial implementation
      if (traces.some((t) => t.status === 'PARTIAL')) {
        return true;
      }
    }

    return false;
  }

  /**
   * MISSING: ALL layers are ABSENT, OR ALL criteria fail,
   * OR no evidence of implementation (empty traces and criteria).
   */
  private isMissing(traces: LayerTrace[], criteria: CriterionResult[]): boolean {
    // No evidence at all
    if (traces.length === 0 && criteria.length === 0) {
      return true;
    }

    // All layers ABSENT
    if (traces.length > 0 && traces.every((t) => t.status === 'ABSENT')) {
      return true;
    }

    // All criteria fail
    if (criteria.length > 0 && criteria.every((c) => !c.passed)) {
      return true;
    }

    return false;
  }
}
