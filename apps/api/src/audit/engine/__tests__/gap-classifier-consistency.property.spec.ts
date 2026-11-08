// Feature: lis-business-process-audit, Property 7: Layer Trace Consistency

import * as fc from 'fast-check';
import { GapClassifier } from '../gap-classifier';
import type { LayerTrace, CriterionResult, StackLayer } from '../interfaces';

/**
 * **Validates: Requirements 15.1**
 *
 * Property 7: Layer Trace Consistency
 *
 * For any classification with status IMPLEMENTED, all LayerTraces have status PRESENT
 * and all CriterionResults have passed=true, and gapDescription is undefined.
 *
 * This is a conditional property: it only checks the invariant when IMPLEMENTED is returned.
 */
describe('GapClassifier — Property 7: Layer Trace Consistency', () => {
  const classifier = new GapClassifier();

  const STACK_LAYERS: StackLayer[] = [
    'UI',
    'API',
    'CONTROLLER',
    'SERVICE',
    'REPOSITORY',
    'DATABASE',
  ];

  // ---------------------------------------------------------------------------
  // Arbitraries
  // ---------------------------------------------------------------------------

  /**
   * Generate a LayerTrace that is always PRESENT with clean evidence/issues.
   * Used to generate inputs that can reach IMPLEMENTED status.
   */
  const arbPresentLayerTrace: fc.Arbitrary<LayerTrace> = fc.record({
    layer: fc.constantFrom(...STACK_LAYERS),
    status: fc.constant('PRESENT' as const),
    filePath: fc.oneof(
      fc.constant(undefined),
      fc.string({ minLength: 1, maxLength: 50 }),
    ),
    lineReferences: fc.oneof(
      fc.constant(undefined),
      fc.array(fc.nat({ max: 1000 }), { minLength: 0, maxLength: 3 }),
    ),
    evidence: fc.oneof(
      fc.constant(undefined),
      fc.constant('implementation found'),
      fc.constant('code verified'),
    ),
    issues: fc.oneof(fc.constant(undefined), fc.constant([] as string[])),
  });

  /**
   * Generate an arbitrary LayerTrace with any status (PRESENT/PARTIAL/ABSENT)
   * and potentially triggering keywords in issues/evidence.
   */
  const arbMixedLayerTrace: fc.Arbitrary<LayerTrace> = fc.record({
    layer: fc.constantFrom(...STACK_LAYERS),
    status: fc.constantFrom(
      'PRESENT' as const,
      'PARTIAL' as const,
      'ABSENT' as const,
    ),
    filePath: fc.oneof(
      fc.constant(undefined),
      fc.string({ minLength: 1, maxLength: 50 }),
    ),
    lineReferences: fc.oneof(
      fc.constant(undefined),
      fc.array(fc.nat({ max: 1000 }), { minLength: 0, maxLength: 3 }),
    ),
    evidence: fc.oneof(
      fc.constant(undefined),
      fc.constant('implementation found'),
      fc.constant('hardcoded value detected'),
      fc.constant('mock data used'),
      fc.string({ minLength: 1, maxLength: 50 }),
    ),
    issues: fc.oneof(
      fc.constant(undefined),
      fc.constant([] as string[]),
      fc.constant(['runtime error in handler']),
      fc.constant(['minor style issue']),
    ),
  });

  /**
   * Generate a CriterionResult that always passes with no triggering keywords.
   */
  const arbPassedCriterion: fc.Arbitrary<CriterionResult> = fc.record({
    criterionId: fc
      .tuple(fc.nat({ max: 15 }), fc.nat({ max: 9 }))
      .map(([a, b]) => `${a + 1}.${b + 1}`),
    description: fc.string({ minLength: 1, maxLength: 80 }),
    passed: fc.constant(true),
    evidence: fc.string({ minLength: 1, maxLength: 80 }),
    gap: fc.constant(undefined),
  });

  /**
   * Generate an arbitrary CriterionResult with mixed pass/fail and potential gap keywords.
   */
  const arbMixedCriterion: fc.Arbitrary<CriterionResult> = fc.record({
    criterionId: fc
      .tuple(fc.nat({ max: 15 }), fc.nat({ max: 9 }))
      .map(([a, b]) => `${a + 1}.${b + 1}`),
    description: fc.string({ minLength: 1, maxLength: 80 }),
    passed: fc.boolean(),
    evidence: fc.string({ minLength: 1, maxLength: 80 }),
    gap: fc.oneof(
      fc.constant(undefined),
      fc.constant('minor gap noted'),
      fc.constant('runtime error in module'),
      fc.constant('contradicts business spec'),
      fc.constant('hardcoded placeholder value'),
    ),
  });

  /**
   * Generate inputs that can sometimes produce all-PRESENT traces and all-passed criteria
   * (so IMPLEMENTED is reachable), but also generate mixed inputs to verify the classifier
   * doesn't falsely produce IMPLEMENTED.
   */
  const arbTraces = fc.oneof(
    // Clean inputs that should reach IMPLEMENTED
    fc.array(arbPresentLayerTrace, { minLength: 1, maxLength: 6 }),
    // Mixed inputs that may or may not reach IMPLEMENTED
    fc.array(arbMixedLayerTrace, { minLength: 0, maxLength: 6 }),
  );

  const arbCriteria = fc.oneof(
    // Clean criteria that should reach IMPLEMENTED
    fc.array(arbPassedCriterion, { minLength: 1, maxLength: 8 }),
    // Mixed criteria that may or may not reach IMPLEMENTED
    fc.array(arbMixedCriterion, { minLength: 0, maxLength: 8 }),
  );

  // ---------------------------------------------------------------------------
  // Property Test
  // ---------------------------------------------------------------------------

  it('IMPLEMENTED implies all layerTraces are PRESENT, all criteria passed, and gapDescription is undefined', () => {
    fc.assert(
      fc.property(arbTraces, arbCriteria, (traces, criteria) => {
        const result = classifier.classify('TestProcess', traces, criteria);

        // Conditional property: only check invariant when IMPLEMENTED
        if (result.status === 'IMPLEMENTED') {
          // All layer traces must have status PRESENT
          for (const trace of result.layerTraces) {
            expect(trace.status).toBe('PRESENT');
          }

          // All criterion results must have passed === true
          for (const criterion of result.criterionResults) {
            expect(criterion.passed).toBe(true);
          }

          // gapDescription must be undefined for IMPLEMENTED
          expect(result.gapDescription).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
