// Feature: lis-business-process-audit, Property 2: Remediation Task Count Invariant
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

const ALL_STATUSES: GapStatus[] = ['IMPLEMENTED', ...NON_IMPLEMENTED_STATUSES];

const STACK_LAYERS: StackLayer[] = ['UI', 'API', 'CONTROLLER', 'SERVICE', 'REPOSITORY', 'DATABASE'];

const LAYER_STATUSES: Array<'PRESENT' | 'PARTIAL' | 'ABSENT'> = ['PRESENT', 'PARTIAL', 'ABSENT'];

const SAMPLE_PROCESS_NAMES = [
  'Patient Registration',
  'Doctor/Encounter',
  'Laboratory Order',
  'Service Catalog',
  'Pricing',
  'Payer/Insurance',
  'Billing/Payment',
  'Specimen Collection',
  'Lab Processing',
  'Tech Verification',
  'Doctor Validation',
  'Report Release',
  'Discount Workflow',
  'UI/UX Consistency',
  'Gap Report',
  'Audit Trail',
];

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const layerTraceArb: fc.Arbitrary<LayerTrace> = fc.record({
  layer: fc.constantFrom(...STACK_LAYERS),
  status: fc.constantFrom(...LAYER_STATUSES),
  filePath: fc.option(fc.string({ minLength: 1, maxLength: 30 }).map((s) => `src/${s}.ts`), { nil: undefined }),
  evidence: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  issues: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 40 }), { minLength: 1, maxLength: 3 }), { nil: undefined }),
});

const criterionResultArb: fc.Arbitrary<CriterionResult> = fc.record({
  criterionId: fc.stringMatching(/^[0-9]{1,2}\.[0-9]{1,2}$/),
  description: fc.string({ minLength: 5, maxLength: 80 }),
  passed: fc.boolean(),
  evidence: fc.string({ minLength: 1, maxLength: 40 }).map((s) => `src/${s}:10`),
  gap: fc.option(fc.string({ minLength: 5, maxLength: 80 }), { nil: undefined }),
});

const processClassificationArb: fc.Arbitrary<ProcessClassification> = fc.record({
  processName: fc.constantFrom(...SAMPLE_PROCESS_NAMES),
  status: fc.constantFrom(...ALL_STATUSES),
  layerTraces: fc.array(layerTraceArb, { minLength: 0, maxLength: 6 }),
  criterionResults: fc.array(criterionResultArb, { minLength: 0, maxLength: 5 }),
  evidence: fc.array(fc.string({ minLength: 1, maxLength: 50 }).map((s) => `src/${s}:1`), { minLength: 0, maxLength: 3 }),
  gapDescription: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RemediationGenerator - Property 2: Remediation Task Count Invariant', () => {
  const generator = new RemediationGenerator();

  it('number of tasks equals number of non-IMPLEMENTED classifications exactly', () => {
    fc.assert(
      fc.property(
        fc.array(processClassificationArb, { minLength: 0, maxLength: 20 }),
        (classifications) => {
          const tasks = generator.generate(classifications);
          const nonImplementedCount = classifications.filter(
            (c) => c.status !== 'IMPLEMENTED',
          ).length;

          expect(tasks.length).toBe(nonImplementedCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('produces zero tasks when all classifications are IMPLEMENTED', () => {
    const implementedClassificationArb: fc.Arbitrary<ProcessClassification> = fc.record({
      processName: fc.constantFrom(...SAMPLE_PROCESS_NAMES),
      status: fc.constant('IMPLEMENTED' as GapStatus),
      layerTraces: fc.array(layerTraceArb, { minLength: 1, maxLength: 6 }),
      criterionResults: fc.array(criterionResultArb, { minLength: 0, maxLength: 5 }),
      evidence: fc.array(fc.string({ minLength: 1, maxLength: 50 }).map((s) => `src/${s}:1`), { minLength: 0, maxLength: 3 }),
      gapDescription: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
    });

    fc.assert(
      fc.property(
        fc.array(implementedClassificationArb, { minLength: 0, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);
          expect(tasks.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('produces exactly N tasks when all N classifications are non-IMPLEMENTED', () => {
    const nonImplementedClassificationArb: fc.Arbitrary<ProcessClassification> = fc.record({
      processName: fc.constantFrom(...SAMPLE_PROCESS_NAMES),
      status: fc.constantFrom(...NON_IMPLEMENTED_STATUSES),
      layerTraces: fc.array(layerTraceArb, { minLength: 0, maxLength: 6 }),
      criterionResults: fc.array(criterionResultArb, { minLength: 0, maxLength: 5 }),
      evidence: fc.array(fc.string({ minLength: 1, maxLength: 50 }).map((s) => `src/${s}:1`), { minLength: 0, maxLength: 3 }),
      gapDescription: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
    });

    fc.assert(
      fc.property(
        fc.array(nonImplementedClassificationArb, { minLength: 1, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);
          expect(tasks.length).toBe(classifications.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('each task maps to a non-IMPLEMENTED classification by businessProcess name', () => {
    fc.assert(
      fc.property(
        fc.array(processClassificationArb, { minLength: 1, maxLength: 16 }),
        (classifications) => {
          const tasks = generator.generate(classifications);
          const nonImplemented = classifications.filter((c) => c.status !== 'IMPLEMENTED');

          // Every task businessProcess should correspond to a non-IMPLEMENTED classification
          for (const task of tasks) {
            const matchingClassification = nonImplemented.find(
              (c) => c.processName === task.businessProcess,
            );
            expect(matchingClassification).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
