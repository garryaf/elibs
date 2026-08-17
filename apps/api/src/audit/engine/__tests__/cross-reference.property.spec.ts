// Feature: lis-business-process-audit, Property 3: Cross-Reference Deduplication Exclusion

import * as fc from 'fast-check';
import { AuditStatusCrossRef } from '../cross-reference';
import {
  AuditStatusEntry,
  GapStatus,
  ProcessClassification,
} from '../interfaces';

/**
 * **Validates: Requirements 15.4**
 *
 * Property 3: Cross-Reference Deduplication Exclusion
 *
 * For any finding that matches an AUDIT_STATUS.md entry with status "Implemented"
 * by process name and gap description, that finding SHALL be excluded from the
 * final output.
 */
describe('Cross-Reference Deduplication Exclusion Property Tests', () => {
  let crossRef: AuditStatusCrossRef;

  const NON_IMPLEMENTED_STATUSES: GapStatus[] = [
    'PARTIAL',
    'MISSING',
    'BROKEN',
    'WRONG_BUSINESS_LOGIC',
    'MOCK_STATIC',
  ];

  beforeEach(() => {
    crossRef = new AuditStatusCrossRef();
  });

  // Arbitrary for a process name (alphanumeric with spaces, 3-30 chars)
  const processNameArb = fc
    .stringMatching(/^[A-Za-z][A-Za-z ]{2,28}[A-Za-z]$/)
    .filter((s) => s.trim().length >= 3);

  // Arbitrary for a non-IMPLEMENTED gap status
  const nonImplementedStatusArb = fc.constantFrom(...NON_IMPLEMENTED_STATUSES);

  // Arbitrary for any gap status
  const gapStatusArb = fc.constantFrom<GapStatus>(
    'IMPLEMENTED',
    'PARTIAL',
    'MISSING',
    'BROKEN',
    'WRONG_BUSINESS_LOGIC',
    'MOCK_STATIC',
  );

  // Helper to build a minimal ProcessClassification
  function makeClassification(
    processName: string,
    status: GapStatus,
    gapDescription?: string,
  ): ProcessClassification {
    return {
      processName,
      status,
      layerTraces: [],
      criterionResults: [],
      evidence: [],
      gapDescription,
    };
  }

  // Helper to build an AuditStatusEntry
  function makeEntry(
    id: string,
    title: string,
    status: AuditStatusEntry['status'],
    remainingGap: string | null = null,
  ): AuditStatusEntry {
    return {
      id,
      title,
      status,
      evidence: 'some evidence',
      remainingGap,
    };
  }

  describe('Property 3: Deduplication Exclusion', () => {
    /**
     * For any classification with a non-IMPLEMENTED status that has a matching
     * "Implemented" entry (entry.title contains classification.processName
     * case-insensitive), that classification is NOT in the output.
     *
     * **Validates: Requirements 15.4**
     */
    it('excludes non-IMPLEMENTED classifications that match an Implemented entry by processName', async () => {
      await fc.assert(
        fc.property(
          processNameArb,
          nonImplementedStatusArb,
          (processName, status) => {
            // Create a classification with the process name and non-IMPLEMENTED status
            const classification = makeClassification(processName, status);

            // Create an Implemented entry whose title contains the processName
            const entry = makeEntry(
              'CRIT-001',
              `Fix ${processName} registration flow`,
              'Implemented',
            );

            const result = crossRef.deduplicate([classification], [entry]);

            // The classification should be excluded
            expect(result).not.toContainEqual(
              expect.objectContaining({ processName }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * IMPLEMENTED classifications are never excluded by cross-ref deduplication,
     * even if a matching Implemented entry exists.
     *
     * **Validates: Requirements 15.4**
     */
    it('never excludes IMPLEMENTED classifications regardless of matching entries', async () => {
      await fc.assert(
        fc.property(processNameArb, (processName) => {
          // Create an IMPLEMENTED classification
          const classification = makeClassification(
            processName,
            'IMPLEMENTED',
          );

          // Create a matching Implemented entry
          const entry = makeEntry(
            'CRIT-002',
            `Resolved ${processName} issue`,
            'Implemented',
          );

          const result = crossRef.deduplicate([classification], [entry]);

          // IMPLEMENTED classifications always pass through
          expect(result).toContainEqual(
            expect.objectContaining({
              processName,
              status: 'IMPLEMENTED',
            }),
          );
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Classifications without a matching Implemented entry remain in the output.
     * A "non-matching" entry is one whose title does NOT contain the processName.
     *
     * **Validates: Requirements 15.4**
     */
    it('retains classifications that have no matching Implemented entry', async () => {
      await fc.assert(
        fc.property(
          processNameArb,
          nonImplementedStatusArb,
          (processName, status) => {
            const classification = makeClassification(processName, status);

            // Create an Implemented entry with an unrelated title
            const entry = makeEntry(
              'CRIT-003',
              'Completely Unrelated Title XYZ',
              'Implemented',
            );

            const result = crossRef.deduplicate([classification], [entry]);

            // The classification should remain since title doesn't contain processName
            expect(result).toContainEqual(
              expect.objectContaining({ processName, status }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Combined scenario: Given a mix of classifications (some matching Implemented
     * entries, some not, and some IMPLEMENTED), the output correctly excludes only
     * the non-IMPLEMENTED ones that match.
     *
     * **Validates: Requirements 15.4**
     */
    it('correctly handles mixed classifications with various match conditions', async () => {
      await fc.assert(
        fc.property(
          processNameArb,
          processNameArb,
          nonImplementedStatusArb,
          gapStatusArb,
          (matchingName, nonMatchingName, nonImplStatus, anyStatus) => {
            // Skip if names happen to be substrings of each other
            fc.pre(
              !nonMatchingName
                .toLowerCase()
                .includes(matchingName.toLowerCase()) &&
                !matchingName
                  .toLowerCase()
                  .includes(nonMatchingName.toLowerCase()),
            );

            // Classification that matches an Implemented entry
            const matchingClassification = makeClassification(
              matchingName,
              nonImplStatus,
            );

            // Classification with no matching entry
            const nonMatchingClassification = makeClassification(
              nonMatchingName,
              anyStatus,
            );

            // Implemented entry that matches the first classification only
            const entry = makeEntry(
              'CRIT-004',
              `Audit ${matchingName} process completed`,
              'Implemented',
            );

            const result = crossRef.deduplicate(
              [matchingClassification, nonMatchingClassification],
              [entry],
            );

            // matchingClassification should be excluded (it's non-IMPLEMENTED and matches)
            const matchingInResult = result.find(
              (c) => c.processName === matchingName,
            );
            expect(matchingInResult).toBeUndefined();

            // nonMatchingClassification should remain (no match in entries)
            const nonMatchingInResult = result.find(
              (c) => c.processName === nonMatchingName,
            );
            expect(nonMatchingInResult).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Entries with status other than "Implemented" do NOT cause exclusion.
     *
     * **Validates: Requirements 15.4**
     */
    it('does not exclude classifications when matching entry has non-Implemented status', async () => {
      const nonImplementedEntryStatuses: AuditStatusEntry['status'][] = [
        'Partial',
        'Open',
        'Blocked',
        'FalsePositive',
      ];

      await fc.assert(
        fc.property(
          processNameArb,
          nonImplementedStatusArb,
          fc.constantFrom(...nonImplementedEntryStatuses),
          (processName, classStatus, entryStatus) => {
            const classification = makeClassification(processName, classStatus);

            // Entry that matches by name but has non-Implemented status
            const entry = makeEntry(
              'CRIT-005',
              `Fix ${processName} workflow`,
              entryStatus,
            );

            const result = crossRef.deduplicate([classification], [entry]);

            // Should NOT be excluded since the entry is not "Implemented"
            expect(result).toContainEqual(
              expect.objectContaining({ processName, status: classStatus }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
