// Feature: lis-business-process-audit, Property 4: Severity Assignment by Business Impact
// **Validates: Requirements 15.5**

import * as fc from 'fast-check';
import { RemediationGenerator } from '../remediation-generator';
import type {
  ProcessClassification,
  GapStatus,
  StackLayer,
  Severity,
  LayerTrace,
  CriterionResult,
} from '../interfaces';

// ---------------------------------------------------------------------------
// Constants — The 16 defined business processes grouped by expected severity
// ---------------------------------------------------------------------------

const CRITICAL_PROCESSES = [
  'Specimen Collection',
  'Lab Processing',
  'Tech Verification',
  'Doctor Validation',
  'Report Release',
];

const HIGH_PROCESSES = [
  'Pricing',
  'Billing/Payment',
  'Payer/Insurance',
];

const MEDIUM_PROCESSES = [
  'Gap Report',
  'Audit Trail',
  'UI/UX Consistency',
];

const LOW_PROCESSES = [
  'Patient Registration',
  'Visit',
  'Order',
  'Service Catalog',
  'Discount Workflow',
];

const ALL_PROCESSES = [
  ...CRITICAL_PROCESSES,
  ...HIGH_PROCESSES,
  ...MEDIUM_PROCESSES,
  ...LOW_PROCESSES,
];

const NON_IMPLEMENTED_STATUSES: GapStatus[] = [
  'PARTIAL',
  'MISSING',
  'BROKEN',
  'WRONG_BUSINESS_LOGIC',
  'MOCK_STATIC',
];

const STACK_LAYERS: StackLayer[] = ['UI', 'API', 'CONTROLLER', 'SERVICE', 'REPOSITORY', 'DATABASE'];

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const layerTraceArb: fc.Arbitrary<LayerTrace> = fc.record({
  layer: fc.constantFrom(...STACK_LAYERS),
  status: fc.constantFrom('PRESENT' as const, 'PARTIAL' as const, 'ABSENT' as const),
  filePath: fc.option(fc.constant('src/module.ts'), { nil: undefined }),
  evidence: fc.option(fc.constant('Some evidence'), { nil: undefined }),
  issues: fc.option(fc.array(fc.constant('issue'), { minLength: 1, maxLength: 2 }), { nil: undefined }),
});

const criterionResultArb: fc.Arbitrary<CriterionResult> = fc.record({
  criterionId: fc.constant('1.1'),
  description: fc.constant('Test criterion'),
  passed: fc.boolean(),
  evidence: fc.constant('src/file.ts:10'),
  gap: fc.option(fc.constant('Gap found'), { nil: undefined }),
});

/**
 * Build a non-IMPLEMENTED ProcessClassification for a given process name.
 */
function classificationArb(processName: string): fc.Arbitrary<ProcessClassification> {
  return fc.record({
    processName: fc.constant(processName),
    status: fc.constantFrom(...NON_IMPLEMENTED_STATUSES),
    layerTraces: fc.array(layerTraceArb, { minLength: 1, maxLength: 6 }),
    criterionResults: fc.array(criterionResultArb, { minLength: 0, maxLength: 4 }),
    evidence: fc.array(fc.constant('src/file.ts:10'), { minLength: 0, maxLength: 3 }),
    gapDescription: fc.option(
      fc.string({ minLength: 10, maxLength: 100 }),
      { nil: undefined },
    ),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RemediationGenerator - Property 4: Severity Assignment by Business Impact', () => {
  const generator = new RemediationGenerator();

  it('core lab workflow processes are assigned CRITICAL severity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CRITICAL_PROCESSES).chain((name) => classificationArb(name)),
        (classification) => {
          const tasks = generator.generate([classification]);

          expect(tasks).toHaveLength(1);
          expect(tasks[0].priority).toBe('CRITICAL');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pricing/billing/payment processes are assigned HIGH severity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HIGH_PROCESSES).chain((name) => classificationArb(name)),
        (classification) => {
          const tasks = generator.generate([classification]);

          expect(tasks).toHaveLength(1);
          expect(tasks[0].priority).toBe('HIGH');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('reporting/analytics processes are assigned MEDIUM severity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MEDIUM_PROCESSES).chain((name) => classificationArb(name)),
        (classification) => {
          const tasks = generator.generate([classification]);

          expect(tasks).toHaveLength(1);
          expect(tasks[0].priority).toBe('MEDIUM');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all other processes are assigned LOW severity', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LOW_PROCESSES).chain((name) => classificationArb(name)),
        (classification) => {
          const tasks = generator.generate([classification]);

          expect(tasks).toHaveLength(1);
          expect(tasks[0].priority).toBe('LOW');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('severity assignment is consistent across all 16 business processes', () => {
    const expectedSeverity: Record<string, Severity> = {};
    CRITICAL_PROCESSES.forEach((p) => (expectedSeverity[p] = 'CRITICAL'));
    HIGH_PROCESSES.forEach((p) => (expectedSeverity[p] = 'HIGH'));
    MEDIUM_PROCESSES.forEach((p) => (expectedSeverity[p] = 'MEDIUM'));
    LOW_PROCESSES.forEach((p) => (expectedSeverity[p] = 'LOW'));

    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_PROCESSES).chain((name) =>
          classificationArb(name).map((c) => ({ classification: c, expectedPriority: expectedSeverity[name] })),
        ),
        ({ classification, expectedPriority }) => {
          const tasks = generator.generate([classification]);

          expect(tasks).toHaveLength(1);
          expect(tasks[0].priority).toBe(expectedPriority);
          expect(tasks[0].businessProcess).toBe(classification.processName);
        },
      ),
      { numRuns: 100 },
    );
  });
});
