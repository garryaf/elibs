// Feature: lis-business-process-audit, Property 8: Cross-Reference Graceful Degradation
import * as fc from 'fast-check';
import * as path from 'path';
import * as os from 'os';
import { AuditStatusCrossRef } from '../cross-reference';
import { GapStatus, ProcessClassification } from '../interfaces';

/**
 * Property 8: Cross-Reference Graceful Degradation
 *
 * When AUDIT_STATUS.md is missing or unparseable, all findings pass through
 * unfiltered and crossRefWarning is non-null.
 *
 * **Validates: Requirements 15.6**
 */

const GAP_STATUSES: GapStatus[] = [
  'IMPLEMENTED',
  'PARTIAL',
  'MISSING',
  'BROKEN',
  'WRONG_BUSINESS_LOGIC',
  'MOCK_STATIC',
];

/**
 * Arbitrary generator for ProcessClassification
 */
function arbProcessClassification(): fc.Arbitrary<ProcessClassification> {
  return fc.record({
    processName: fc.string({ minLength: 1, maxLength: 50 }),
    status: fc.constantFrom(...GAP_STATUSES),
    layerTraces: fc.array(
      fc.record({
        layer: fc.constantFrom(
          'UI' as const,
          'API' as const,
          'CONTROLLER' as const,
          'SERVICE' as const,
          'REPOSITORY' as const,
          'DATABASE' as const,
        ),
        status: fc.constantFrom(
          'PRESENT' as const,
          'PARTIAL' as const,
          'ABSENT' as const,
        ),
        filePath: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        evidence: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 6 },
    ),
    criterionResults: fc.array(
      fc.record({
        criterionId: fc.string({ minLength: 1, maxLength: 10 }),
        description: fc.string({ minLength: 1, maxLength: 100 }),
        passed: fc.boolean(),
        evidence: fc.string({ minLength: 0, maxLength: 200 }),
        gap: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 10 },
    ),
    evidence: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
      minLength: 0,
      maxLength: 5,
    }),
    gapDescription: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  });
}

describe('Property 8: Cross-Reference Graceful Degradation', () => {
  let crossRef: AuditStatusCrossRef;

  beforeEach(() => {
    crossRef = new AuditStatusCrossRef();
  });

  it(
    'missing file produces warning: loadAuditStatus with non-existent path returns empty entries and non-null warning',
    () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (randomFileName: string) => {
            const nonExistentPath = path.join(
              os.tmpdir(),
              `non-existent-audit-status-${randomFileName.replace(/[/\\:*?"<>|]/g, '_')}.md`,
            );

            const result = crossRef.loadAuditStatus(nonExistentPath);

            // Entries must be empty
            expect(result.entries).toEqual([]);

            // Warning must be non-null and non-empty
            expect(result.warning).toBeDefined();
            expect(typeof result.warning).toBe('string');
            expect(result.warning!.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    'empty entries means no deduplication: deduplicate with empty entries returns all input classifications unchanged',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbProcessClassification(), { minLength: 0, maxLength: 20 }),
          (classifications: ProcessClassification[]) => {
            const result = crossRef.deduplicate(classifications, []);

            // All classifications must pass through
            expect(result).toHaveLength(classifications.length);

            // Same elements in same order
            for (let i = 0; i < classifications.length; i++) {
              expect(result[i]).toBe(classifications[i]);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    'all findings pass through when no entries: with empty entries from failed load, all classifications are returned',
    () => {
      fc.assert(
        fc.property(
          fc.array(arbProcessClassification(), { minLength: 1, maxLength: 20 }),
          (classifications: ProcessClassification[]) => {
            // Simulate a failed load scenario — entries are empty
            const loadResult = crossRef.loadAuditStatus(
              path.join(os.tmpdir(), 'definitely-does-not-exist-12345.md'),
            );

            // Confirm load failed gracefully
            expect(loadResult.entries).toEqual([]);
            expect(loadResult.warning).toBeDefined();

            // Pass empty entries to deduplicate — all findings should pass through
            const result = crossRef.deduplicate(
              classifications,
              loadResult.entries,
            );

            // All classifications pass through unfiltered
            expect(result).toHaveLength(classifications.length);
            expect(result).toEqual(classifications);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
