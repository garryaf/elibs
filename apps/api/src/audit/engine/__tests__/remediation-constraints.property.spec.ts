// Feature: lis-business-process-audit, Property 6: Remediation Task Field Constraints
// **Validates: Requirements 15.3**

import * as fc from 'fast-check';
import { RemediationGenerator } from '../remediation-generator';
import type {
  ProcessClassification,
  GapStatus,
  StackLayer,
  LayerTrace,
  CriterionResult,
} from '../interfaces';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NON_IMPLEMENTED_STATUSES: GapStatus[] = [
  'PARTIAL',
  'MISSING',
  'BROKEN',
  'WRONG_BUSINESS_LOGIC',
  'MOCK_STATIC',
];

const STACK_LAYERS: StackLayer[] = [
  'UI',
  'API',
  'CONTROLLER',
  'SERVICE',
  'REPOSITORY',
  'DATABASE',
];
const LAYER_STATUSES: Array<'PRESENT' | 'PARTIAL' | 'ABSENT'> = [
  'PRESENT',
  'PARTIAL',
  'ABSENT',
];

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generate process names up to 200 chars (potentially exceeding title limit) */
const longProcessNameArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 200,
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789-_/'.split(
      '',
    ),
  ),
});

/** Generate gap descriptions up to 1000 chars (potentially exceeding 500-char limit) */
const longGapDescriptionArb: fc.Arbitrary<string> = fc.string({
  minLength: 0,
  maxLength: 1000,
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?-_()[]'.split(
      '',
    ),
  ),
});

/** Generate layer traces — many of them to stress field generation */
const layerTraceArb: fc.Arbitrary<LayerTrace> = fc.record({
  layer: fc.constantFrom(...STACK_LAYERS),
  status: fc.constantFrom(...LAYER_STATUSES),
  filePath: fc.option(
    fc.string({ minLength: 1, maxLength: 80 }).map((s) => `src/${s}.ts`),
    {
      nil: undefined,
    },
  ),
  evidence: fc.option(fc.string({ minLength: 0, maxLength: 200 }), {
    nil: undefined,
  }),
  issues: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
      minLength: 1,
      maxLength: 5,
    }),
    {
      nil: undefined,
    },
  ),
});

const criterionResultArb: fc.Arbitrary<CriterionResult> = fc.record({
  criterionId: fc.stringMatching(/^[0-9]{1,2}\.[0-9]{1,2}$/),
  description: fc.string({ minLength: 5, maxLength: 100 }),
  passed: fc.boolean(),
  evidence: fc
    .string({ minLength: 1, maxLength: 60 })
    .map((s) => `src/${s}:10`),
  gap: fc.option(fc.string({ minLength: 5, maxLength: 200 }), {
    nil: undefined,
  }),
});

/** Generate a ProcessClassification with potentially long names and descriptions */
const classificationArb: fc.Arbitrary<ProcessClassification> = fc.record({
  processName: longProcessNameArb,
  status: fc.constantFrom(...NON_IMPLEMENTED_STATUSES),
  layerTraces: fc.array(layerTraceArb, { minLength: 0, maxLength: 6 }),
  criterionResults: fc.array(criterionResultArb, {
    minLength: 0,
    maxLength: 8,
  }),
  evidence: fc.array(
    fc.string({ minLength: 1, maxLength: 80 }).map((s) => `src/${s}:1`),
    {
      minLength: 0,
      maxLength: 5,
    },
  ),
  gapDescription: fc.option(longGapDescriptionArb, { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RemediationGenerator - Property 6: Remediation Task Field Constraints', () => {
  const generator = new RemediationGenerator();

  it('title length is at most 120 characters for all generated tasks', () => {
    fc.assert(
      fc.property(
        fc.array(classificationArb, { minLength: 1, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);

          for (const task of tasks) {
            expect(task.title.length).toBeLessThanOrEqual(120);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('gapDescription length is at most 500 characters for all generated tasks', () => {
    fc.assert(
      fc.property(
        fc.array(classificationArb, { minLength: 1, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);

          for (const task of tasks) {
            expect(task.gapDescription.length).toBeLessThanOrEqual(500);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('suggestedApproach length is at most 300 characters for all generated tasks', () => {
    fc.assert(
      fc.property(
        fc.array(classificationArb, { minLength: 1, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);

          for (const task of tasks) {
            expect(task.suggestedApproach.length).toBeLessThanOrEqual(300);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all field constraints hold simultaneously for every task across all inputs', () => {
    fc.assert(
      fc.property(
        fc.array(classificationArb, { minLength: 1, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);

          for (const task of tasks) {
            expect(task.title.length).toBeLessThanOrEqual(120);
            expect(task.gapDescription.length).toBeLessThanOrEqual(500);
            expect(task.suggestedApproach.length).toBeLessThanOrEqual(300);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
