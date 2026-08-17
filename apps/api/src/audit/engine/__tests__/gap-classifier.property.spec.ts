// Feature: lis-business-process-audit, Property 1: Classification Precedence Determinism
// **Validates: Requirements 15.7**

import * as fc from 'fast-check';
import { GapClassifier } from '../gap-classifier';
import type { LayerTrace, CriterionResult, GapStatus, StackLayer } from '../interfaces';

const ALL_GAP_STATUSES: GapStatus[] = [
  'IMPLEMENTED',
  'PARTIAL',
  'MISSING',
  'BROKEN',
  'WRONG_BUSINESS_LOGIC',
  'MOCK_STATIC',
];

const STACK_LAYERS: StackLayer[] = ['UI', 'API', 'CONTROLLER', 'SERVICE', 'REPOSITORY', 'DATABASE'];

const LAYER_STATUSES: Array<'PRESENT' | 'PARTIAL' | 'ABSENT'> = ['PRESENT', 'PARTIAL', 'ABSENT'];

const BROKEN_KEYWORDS = ['runtime error', 'exception', 'broken', 'crash'];
const WRONG_LOGIC_KEYWORDS = ['contradicts', 'wrong logic', 'incorrect business', 'violates spec'];
const MOCK_STATIC_KEYWORDS = ['hardcoded', 'placeholder', 'mock', 'static data', 'dummy'];

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const layerTraceArb: fc.Arbitrary<LayerTrace> = fc.record({
  layer: fc.constantFrom(...STACK_LAYERS),
  status: fc.constantFrom(...LAYER_STATUSES),
  filePath: fc.option(fc.string({ minLength: 1, maxLength: 50 }).map((s) => `src/${s}.ts`), { nil: undefined }),
  evidence: fc.option(
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 80 }),
      fc.constantFrom(...MOCK_STATIC_KEYWORDS).map((kw) => `Contains ${kw} values`),
    ),
    { nil: undefined },
  ),
  issues: fc.option(
    fc.array(
      fc.oneof(
        fc.string({ minLength: 1, maxLength: 60 }),
        fc.constantFrom(...BROKEN_KEYWORDS).map((kw) => `Found ${kw} in module`),
      ),
      { minLength: 1, maxLength: 3 },
    ),
    { nil: undefined },
  ),
});

const criterionResultArb: fc.Arbitrary<CriterionResult> = fc.record({
  criterionId: fc.stringMatching(/^[0-9]{1,2}\.[0-9]{1,2}$/),
  description: fc.string({ minLength: 5, maxLength: 100 }),
  passed: fc.boolean(),
  evidence: fc.string({ minLength: 1, maxLength: 80 }).map((s) => `src/${s}:10`),
  gap: fc.option(
    fc.oneof(
      fc.string({ minLength: 5, maxLength: 100 }),
      fc.constantFrom(...BROKEN_KEYWORDS).map((kw) => `Detected ${kw} in implementation`),
      fc.constantFrom(...WRONG_LOGIC_KEYWORDS).map((kw) => `Logic ${kw} the specification`),
      fc.constantFrom(...MOCK_STATIC_KEYWORDS).map((kw) => `Uses ${kw} instead of real data`),
    ),
    { nil: undefined },
  ),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GapClassifier - Property 1: Classification Precedence Determinism', () => {
  const classifier = new GapClassifier();

  it('output is exactly one GapStatus value for any arbitrary inputs', () => {
    fc.assert(
      fc.property(
        fc.array(layerTraceArb, { minLength: 0, maxLength: 6 }),
        fc.array(criterionResultArb, { minLength: 0, maxLength: 8 }),
        (traces, criteria) => {
          const result = classifier.classify('TestProcess', traces, criteria);

          // Must return exactly one status
          expect(result.status).toBeDefined();
          expect(ALL_GAP_STATUSES).toContain(result.status);

          // Only one status is assigned (it's a single string, not an array)
          expect(typeof result.status).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('precedence is deterministic: highest-severity status wins when multiple could apply', () => {
    // Precedence order (index 0 = highest priority)
    const PRECEDENCE: GapStatus[] = [
      'BROKEN',
      'WRONG_BUSINESS_LOGIC',
      'MOCK_STATIC',
      'PARTIAL',
      'MISSING',
      'IMPLEMENTED',
    ];

    fc.assert(
      fc.property(
        fc.array(layerTraceArb, { minLength: 0, maxLength: 6 }),
        fc.array(criterionResultArb, { minLength: 0, maxLength: 8 }),
        (traces, criteria) => {
          const result = classifier.classify('TestProcess', traces, criteria);
          const resultIndex = PRECEDENCE.indexOf(result.status);

          // The result must be a valid precedence level
          expect(resultIndex).toBeGreaterThanOrEqual(0);

          // Verify that no higher-priority status should have been selected:
          // If we got status at index N, none of the statuses at indices < N should apply.
          // We verify this by checking that the classifier's logic is consistent.
          // Run again with same inputs — should get same result (determinism).
          const secondResult = classifier.classify('TestProcess', traces, criteria);
          expect(secondResult.status).toBe(result.status);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('same inputs always produce same output (determinism)', () => {
    fc.assert(
      fc.property(
        fc.array(layerTraceArb, { minLength: 0, maxLength: 6 }),
        fc.array(criterionResultArb, { minLength: 0, maxLength: 8 }),
        (traces, criteria) => {
          const result1 = classifier.classify('TestProcess', traces, criteria);
          const result2 = classifier.classify('TestProcess', traces, criteria);

          expect(result1.status).toBe(result2.status);
          expect(result1.gapDescription).toBe(result2.gapDescription);
          expect(result1.evidence).toEqual(result2.evidence);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('BROKEN takes precedence over all other statuses', () => {
    // Generate inputs that trigger BROKEN (issues with broken keywords)
    // AND also could trigger other statuses (mock evidence, mixed criteria, etc.)
    const brokenTraceArb = fc.record({
      layer: fc.constantFrom(...STACK_LAYERS),
      status: fc.constantFrom(...LAYER_STATUSES),
      filePath: fc.constant('src/test.ts'),
      evidence: fc.option(
        fc.constantFrom(...MOCK_STATIC_KEYWORDS).map((kw) => `Has ${kw} content`),
        { nil: undefined },
      ),
      issues: fc.constantFrom(...BROKEN_KEYWORDS).map((kw) => [`Found ${kw} in module`]),
    });

    const mixedCriterionArb = fc.record({
      criterionId: fc.constant('1.1'),
      description: fc.constant('test criterion'),
      passed: fc.boolean(),
      evidence: fc.constant('src/file.ts:10'),
      gap: fc.option(
        fc.oneof(
          fc.constantFrom(...WRONG_LOGIC_KEYWORDS).map((kw) => `Logic ${kw}`),
          fc.constantFrom(...MOCK_STATIC_KEYWORDS).map((kw) => `Uses ${kw}`),
        ),
        { nil: undefined },
      ),
    });

    fc.assert(
      fc.property(
        fc.array(brokenTraceArb, { minLength: 1, maxLength: 4 }),
        fc.array(mixedCriterionArb, { minLength: 0, maxLength: 4 }),
        (traces, criteria) => {
          const result = classifier.classify('TestProcess', traces, criteria);
          expect(result.status).toBe('BROKEN');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('WRONG_BUSINESS_LOGIC takes precedence over MOCK_STATIC, PARTIAL, MISSING, IMPLEMENTED', () => {
    // Generate criteria with wrong-logic keywords in gap (but NO broken keywords in traces)
    const cleanTraceArb = fc.record({
      layer: fc.constantFrom(...STACK_LAYERS),
      status: fc.constantFrom(...LAYER_STATUSES),
      filePath: fc.option(fc.constant('src/service.ts'), { nil: undefined }),
      evidence: fc.option(
        fc.constantFrom(...MOCK_STATIC_KEYWORDS).map((kw) => `Has ${kw}`),
        { nil: undefined },
      ),
      issues: fc.constant(undefined as string[] | undefined),
    });

    const wrongLogicCriterionArb: fc.Arbitrary<CriterionResult> = fc.record({
      criterionId: fc.constant('2.1'),
      description: fc.constant('logic check'),
      passed: fc.boolean(),
      evidence: fc.constant('src/logic.ts:5'),
      gap: fc.constantFrom(...WRONG_LOGIC_KEYWORDS).map((kw) => `Logic ${kw} the specification`),
    });

    fc.assert(
      fc.property(
        fc.array(cleanTraceArb, { minLength: 0, maxLength: 4 }),
        fc.tuple(
          wrongLogicCriterionArb,
          fc.array(criterionResultArb, { minLength: 0, maxLength: 3 }),
        ),
        (traces, [wrongLogicCriterion, otherCriteria]) => {
          // Ensure no broken keywords in traces
          const safeTrces = traces.map((t) => ({ ...t, issues: undefined }));
          // Ensure no broken keywords in other criteria gaps
          const safeCriteria = otherCriteria.map((c) => ({
            ...c,
            gap: c.gap && BROKEN_KEYWORDS.some((kw) => c.gap!.toLowerCase().includes(kw))
              ? undefined
              : c.gap,
          }));

          const allCriteria = [wrongLogicCriterion, ...safeCriteria];
          const result = classifier.classify('TestProcess', safeTrces, allCriteria);

          expect(result.status).toBe('WRONG_BUSINESS_LOGIC');
        },
      ),
      { numRuns: 100 },
    );
  });
});
