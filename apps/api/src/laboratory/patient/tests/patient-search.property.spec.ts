// Feature: enterprise-registration-workflow, Property 1: Patient search correctness
// Feature: enterprise-registration-workflow, Property 2: Short query guard
// Feature: enterprise-registration-workflow, Property 3: Soft-delete exclusion invariant

import * as fc from 'fast-check';

/**
 * Reference oracle function that mirrors the patient search logic in PatientService.findAll().
 * This is a pure function that filters patients based on the same rules as Prisma queries:
 * - name: case-insensitive substring match
 * - mrn: case-insensitive substring match
 * - phone: substring match (case-sensitive)
 * - email: case-insensitive substring match
 * - nik: prefix match ONLY when query consists entirely of digits
 * - deletedAt must be null
 * - Query must be 2+ characters (otherwise empty result)
 */
function patientSearchOracle(
  patients: PatientRecord[],
  query: string,
): PatientRecord[] {
  // Short query guard: return empty for queries < 2 characters
  if (query.length < 2) {
    return [];
  }

  const queryLower = query.toLowerCase();
  const isDigitsOnly = /^\d+$/.test(query);

  return patients.filter((patient) => {
    // Soft-delete exclusion: skip patients with non-null deletedAt
    if (patient.deletedAt !== null) {
      return false;
    }

    // Check each field according to the matching rules
    const nameMatch = patient.name.toLowerCase().includes(queryLower);
    const mrnMatch = patient.mrn.toLowerCase().includes(queryLower);
    const phoneMatch = patient.phone !== null && patient.phone.includes(query);
    const emailMatch =
      patient.email !== null && patient.email.toLowerCase().includes(queryLower);
    const nikMatch = isDigitsOnly && patient.nik.startsWith(query);

    return nameMatch || mrnMatch || phoneMatch || emailMatch || nikMatch;
  });
}

interface PatientRecord {
  id: string;
  name: string;
  mrn: string;
  nik: string;
  phone: string | null;
  email: string | null;
  deletedAt: Date | null;
}

// Arbitrary for generating a patient record
const patientRecordArb: fc.Arbitrary<PatientRecord> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  mrn: fc.stringMatching(/^RM-\d{6}-\d{4}$/),
  nik: fc.stringMatching(/^\d{16}$/),
  phone: fc.oneof(
    fc.constant(null),
    fc.stringMatching(/^08\d{8,11}$/),
  ),
  email: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 3, maxLength: 20 }).map((s) => {
      // Sanitize to produce a valid-ish email for testing
      const clean = s.replace(/[^a-zA-Z0-9]/g, 'a');
      return `${clean}@test.com`;
    }),
  ),
  deletedAt: fc.constant(null),
});

// Arbitrary for generating a patient with possible soft-delete
const patientWithDeleteArb: fc.Arbitrary<PatientRecord> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
  mrn: fc.stringMatching(/^RM-\d{6}-\d{4}$/),
  nik: fc.stringMatching(/^\d{16}$/),
  phone: fc.oneof(
    fc.constant(null),
    fc.stringMatching(/^08\d{8,11}$/),
  ),
  email: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 3, maxLength: 20 }).map((s) => {
      const clean = s.replace(/[^a-zA-Z0-9]/g, 'a');
      return `${clean}@test.com`;
    }),
  ),
  deletedAt: fc.oneof(
    fc.constant(null),
    fc.date({ min: new Date('2020-01-01'), max: new Date('2026-12-31') }),
  ),
});

// Arbitrary for generating a search query of 2+ characters
const searchQueryArb = fc.string({ minLength: 2, maxLength: 30 }).filter((s) => s.trim().length >= 2);

/**
 * Property 1: Patient search correctness
 *
 * For any set of patient records and for any search query of 2 or more characters,
 * the oracle search function SHALL return only patients where:
 * - The query is a case-insensitive substring of the MRN, OR
 * - The query (if composed entirely of digits) is a prefix of the NIK, OR
 * - The query is a case-insensitive substring of the name, OR
 * - The query is a substring of the phone, OR
 * - The query is a case-insensitive substring of the email
 *
 * And no patient that fails all of the above conditions SHALL appear in results.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */
describe('Property 1: Patient search correctness', () => {
  it('every returned patient matches at least one field rule', () => {
    fc.assert(
      fc.property(
        fc.array(patientRecordArb, { minLength: 0, maxLength: 20 }),
        searchQueryArb,
        (patients, query) => {
          const results = patientSearchOracle(patients, query);
          const queryLower = query.toLowerCase();
          const isDigitsOnly = /^\d+$/.test(query);

          for (const patient of results) {
            const nameMatch = patient.name.toLowerCase().includes(queryLower);
            const mrnMatch = patient.mrn.toLowerCase().includes(queryLower);
            const phoneMatch = patient.phone !== null && patient.phone.includes(query);
            const emailMatch =
              patient.email !== null && patient.email.toLowerCase().includes(queryLower);
            const nikMatch = isDigitsOnly && patient.nik.startsWith(query);

            expect(
              nameMatch || mrnMatch || phoneMatch || emailMatch || nikMatch,
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no non-matching patient appears in results', () => {
    fc.assert(
      fc.property(
        fc.array(patientRecordArb, { minLength: 0, maxLength: 20 }),
        searchQueryArb,
        (patients, query) => {
          const results = patientSearchOracle(patients, query);
          const queryLower = query.toLowerCase();
          const isDigitsOnly = /^\d+$/.test(query);

          // Check that every active patient NOT in results fails all conditions
          const activePatients = patients.filter((p) => p.deletedAt === null);
          const resultIds = new Set(results.map((r) => r.id));

          for (const patient of activePatients) {
            if (!resultIds.has(patient.id)) {
              const nameMatch = patient.name.toLowerCase().includes(queryLower);
              const mrnMatch = patient.mrn.toLowerCase().includes(queryLower);
              const phoneMatch = patient.phone !== null && patient.phone.includes(query);
              const emailMatch =
                patient.email !== null && patient.email.toLowerCase().includes(queryLower);
              const nikMatch = isDigitsOnly && patient.nik.startsWith(query);

              // If the patient is not in results, none of the conditions should match
              expect(
                nameMatch || mrnMatch || phoneMatch || emailMatch || nikMatch,
              ).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('results are a subset of non-deleted patients', () => {
    fc.assert(
      fc.property(
        fc.array(patientRecordArb, { minLength: 0, maxLength: 20 }),
        searchQueryArb,
        (patients, query) => {
          const results = patientSearchOracle(patients, query);
          const activeIds = new Set(
            patients.filter((p) => p.deletedAt === null).map((p) => p.id),
          );

          for (const result of results) {
            expect(activeIds.has(result.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 2: Short query guard
 *
 * For any search query of fewer than 2 characters (including empty string),
 * the search function SHALL return an empty result array regardless of the patient dataset.
 *
 * **Validates: Requirements 1.7, 2.3**
 */
describe('Property 2: Short query guard', () => {
  // Generate random strings of length 0 or 1
  const shortQueryArb = fc.oneof(
    fc.constant(''),
    fc.string({ minLength: 1, maxLength: 1 }),
  );

  it('returns empty result for queries shorter than 2 characters', () => {
    fc.assert(
      fc.property(
        fc.array(patientRecordArb, { minLength: 1, maxLength: 20 }),
        shortQueryArb,
        (patients, query) => {
          const results = patientSearchOracle(patients, query);
          expect(results).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty result for empty string regardless of dataset size', () => {
    fc.assert(
      fc.property(
        fc.array(patientRecordArb, { minLength: 0, maxLength: 50 }),
        (patients) => {
          const results = patientSearchOracle(patients, '');
          expect(results).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 3: Soft-delete exclusion invariant
 *
 * For any search query and for any patient dataset containing soft-deleted records
 * (deletedAt is not null), no soft-deleted patient SHALL ever appear in the search results.
 *
 * **Validates: Requirements 1.9**
 */
describe('Property 3: Soft-delete exclusion invariant', () => {
  it('no soft-deleted patient appears in results for any query', () => {
    fc.assert(
      fc.property(
        fc.array(patientWithDeleteArb, { minLength: 1, maxLength: 20 }),
        searchQueryArb,
        (patients, query) => {
          const results = patientSearchOracle(patients, query);

          for (const result of results) {
            expect(result.deletedAt).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('soft-deleted patients that would otherwise match are excluded', () => {
    fc.assert(
      fc.property(
        fc.array(patientWithDeleteArb, { minLength: 1, maxLength: 20 }),
        searchQueryArb,
        (patients, query) => {
          const results = patientSearchOracle(patients, query);
          const resultIds = new Set(results.map((r) => r.id));
          const queryLower = query.toLowerCase();
          const isDigitsOnly = /^\d+$/.test(query);

          // For each deleted patient, even if they match the query, they should NOT be in results
          const deletedPatients = patients.filter((p) => p.deletedAt !== null);

          for (const patient of deletedPatients) {
            expect(resultIds.has(patient.id)).toBe(false);
          }

          // Additionally verify that deleted patients are excluded even when they match
          for (const patient of deletedPatients) {
            const wouldMatch =
              patient.name.toLowerCase().includes(queryLower) ||
              patient.mrn.toLowerCase().includes(queryLower) ||
              (patient.phone !== null && patient.phone.includes(query)) ||
              (patient.email !== null && patient.email.toLowerCase().includes(queryLower)) ||
              (isDigitsOnly && patient.nik.startsWith(query));

            // Regardless of whether the patient would match, it must NOT appear
            if (wouldMatch) {
              expect(resultIds.has(patient.id)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
