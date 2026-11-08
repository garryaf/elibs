/**
 * Westgard Multi-Rule QC Engine
 *
 * A pure function implementing the 6 standard Westgard rules for
 * laboratory quality control evaluation. No external dependencies.
 *
 * Rules:
 * - 1-2s (Warning): One measurement exceeds mean ± 2SD
 * - 1-3s (Reject): One measurement exceeds mean ± 3SD
 * - 2-2s (Reject): Two consecutive measurements exceed mean + 2SD or mean - 2SD (same side)
 * - R-4s (Reject): Consecutive measurements where one exceeds +2SD and another exceeds -2SD (range > 4SD)
 * - 4-1s (Reject): Four consecutive measurements exceed mean + 1SD or mean - 1SD (same side)
 * - 10x  (Reject): Ten consecutive measurements on the same side of the mean
 *
 * @see ISO 15189 quality control requirements
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface QCResultData {
  /** The numeric result value from the QC measurement */
  value: number;
}

export interface WestgardViolation {
  rule: '1-2s' | '1-3s' | '2-2s' | 'R-4s' | '4-1s' | '10x';
  description: string;
  /** The result values involved in the violation */
  dataPoints: number[];
}

export interface WestgardResult {
  /** True if no rejection rules are violated (1-2s warning alone does not fail) */
  passed: boolean;
  /** All detected violations including warnings */
  violations: WestgardViolation[];
}

// ---------------------------------------------------------------------------
// Rule Implementations
// ---------------------------------------------------------------------------

/**
 * 1-2s Rule (Warning): One control measurement exceeds mean ± 2SD.
 * This is a WARNING rule — it does not cause rejection on its own.
 */
function check12s(
  values: number[],
  mean: number,
  sd: number,
): WestgardViolation | null {
  const upperLimit = mean + 2 * sd;
  const lowerLimit = mean - 2 * sd;

  for (const value of values) {
    if (value > upperLimit || value < lowerLimit) {
      return {
        rule: '1-2s',
        description: 'One control measurement exceeds mean ± 2SD (warning)',
        dataPoints: [value],
      };
    }
  }
  return null;
}

/**
 * 1-3s Rule (Reject): One control measurement exceeds mean ± 3SD.
 */
function check13s(
  values: number[],
  mean: number,
  sd: number,
): WestgardViolation | null {
  const upperLimit = mean + 3 * sd;
  const lowerLimit = mean - 3 * sd;

  for (const value of values) {
    if (value > upperLimit || value < lowerLimit) {
      return {
        rule: '1-3s',
        description: 'One control measurement exceeds mean ± 3SD',
        dataPoints: [value],
      };
    }
  }
  return null;
}

/**
 * 2-2s Rule (Reject): Two consecutive measurements exceed mean + 2SD
 * or mean - 2SD on the same side.
 */
function check22s(
  values: number[],
  mean: number,
  sd: number,
): WestgardViolation | null {
  if (values.length < 2) return null;

  const upperLimit = mean + 2 * sd;
  const lowerLimit = mean - 2 * sd;

  for (let i = 0; i < values.length - 1; i++) {
    const current = values[i];
    const next = values[i + 1];

    // Both exceed upper limit
    if (current > upperLimit && next > upperLimit) {
      return {
        rule: '2-2s',
        description: 'Two consecutive measurements exceed mean + 2SD',
        dataPoints: [current, next],
      };
    }

    // Both exceed lower limit (below)
    if (current < lowerLimit && next < lowerLimit) {
      return {
        rule: '2-2s',
        description: 'Two consecutive measurements exceed mean - 2SD',
        dataPoints: [current, next],
      };
    }
  }
  return null;
}

/**
 * R-4s Rule (Reject): One measurement exceeds +2SD and another exceeds -2SD
 * in consecutive measurements (range between them > 4SD).
 */
function checkR4s(
  values: number[],
  mean: number,
  sd: number,
): WestgardViolation | null {
  if (values.length < 2) return null;

  const upperLimit = mean + 2 * sd;
  const lowerLimit = mean - 2 * sd;

  for (let i = 0; i < values.length - 1; i++) {
    const current = values[i];
    const next = values[i + 1];

    // One exceeds +2SD and the other exceeds -2SD (in either order)
    if (
      (current > upperLimit && next < lowerLimit) ||
      (current < lowerLimit && next > upperLimit)
    ) {
      return {
        rule: 'R-4s',
        description:
          'Consecutive measurements span more than 4SD (one exceeds +2SD, another exceeds -2SD)',
        dataPoints: [current, next],
      };
    }
  }
  return null;
}

/**
 * 4-1s Rule (Reject): Four consecutive measurements exceed mean + 1SD
 * or mean - 1SD on the same side.
 */
function check41s(
  values: number[],
  mean: number,
  sd: number,
): WestgardViolation | null {
  if (values.length < 4) return null;

  const upperLimit = mean + sd;
  const lowerLimit = mean - sd;

  for (let i = 0; i <= values.length - 4; i++) {
    const window = values.slice(i, i + 4);

    // All four exceed mean + 1SD
    if (window.every((v) => v > upperLimit)) {
      return {
        rule: '4-1s',
        description: 'Four consecutive measurements exceed mean + 1SD',
        dataPoints: window,
      };
    }

    // All four below mean - 1SD
    if (window.every((v) => v < lowerLimit)) {
      return {
        rule: '4-1s',
        description: 'Four consecutive measurements exceed mean - 1SD',
        dataPoints: window,
      };
    }
  }
  return null;
}

/**
 * 10x Rule (Reject): Ten consecutive measurements are on the same side of the mean.
 */
function check10x(values: number[], mean: number): WestgardViolation | null {
  if (values.length < 10) return null;

  for (let i = 0; i <= values.length - 10; i++) {
    const window = values.slice(i, i + 10);

    // All ten above the mean
    if (window.every((v) => v > mean)) {
      return {
        rule: '10x',
        description: 'Ten consecutive measurements are above the mean',
        dataPoints: window,
      };
    }

    // All ten below the mean
    if (window.every((v) => v < mean)) {
      return {
        rule: '10x',
        description: 'Ten consecutive measurements are below the mean',
        dataPoints: window,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluates Westgard multi-rules against a set of QC results.
 *
 * The function checks all 6 rules and returns a combined result.
 * The `passed` field is `false` only when a rejection rule is violated.
 * The 1-2s rule is a warning only and does not cause failure by itself.
 *
 * @param results - Array of QC result data points (most recent last)
 * @param mean - The established mean value for the QC material
 * @param sd - The established standard deviation for the QC material
 * @returns WestgardResult with pass/fail status and any violations found
 */
export function evaluateWestgardRules(
  results: QCResultData[],
  mean: number,
  sd: number,
): WestgardResult {
  const violations: WestgardViolation[] = [];

  // Guard: need at least one result to evaluate
  if (results.length === 0 || sd <= 0) {
    return { passed: true, violations: [] };
  }

  const values = results.map((r) => r.value);

  // Check each rule
  const violation12s = check12s(values, mean, sd);
  const violation13s = check13s(values, mean, sd);
  const violation22s = check22s(values, mean, sd);
  const violationR4s = checkR4s(values, mean, sd);
  const violation41s = check41s(values, mean, sd);
  const violation10x = check10x(values, mean);

  if (violation12s) violations.push(violation12s);
  if (violation13s) violations.push(violation13s);
  if (violation22s) violations.push(violation22s);
  if (violationR4s) violations.push(violationR4s);
  if (violation41s) violations.push(violation41s);
  if (violation10x) violations.push(violation10x);

  // 1-2s is a warning only — does not cause rejection
  const rejectionRules: WestgardViolation['rule'][] = [
    '1-3s',
    '2-2s',
    'R-4s',
    '4-1s',
    '10x',
  ];
  const hasRejection = violations.some((v) => rejectionRules.includes(v.rule));

  return {
    passed: !hasRejection,
    violations,
  };
}
