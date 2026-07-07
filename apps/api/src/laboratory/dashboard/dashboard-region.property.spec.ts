// Feature: master-wilayah-indonesia, Property 10: Dashboard Counting Invariant
import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Property 10: Dashboard Counting Invariant
 *
 * For any set of non-deleted patients with region FK assignments, the dashboard
 * endpoint grouped by any region level SHALL produce counts that sum to the total
 * number of non-deleted patients matching the filter, and each individual count
 * SHALL equal the actual number of non-deleted patients assigned to that specific region.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 */

// --- Generators ---

const provinsiIdArb = fc.stringMatching(/^\d{2}$/);
const kabupatenKotaIdArb = fc.stringMatching(/^\d{4}$/);
const kecamatanIdArb = fc.stringMatching(/^\d{6}$/);
const kelurahanDesaIdArb = fc.stringMatching(/^\d{10}$/);
const regionNameArb = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0);

interface PatientRecord {
  id: string;
  provinsiId: string | null;
  kabupatenKotaId: string | null;
  kecamatanId: string | null;
  kelurahanDesaId: string | null;
  deletedAt: Date | null;
}

// Generate a patient record with random region FK assignments
const patientRecordArb = (
  provinsiIds: string[],
  kabupatenKotaIds: string[],
  kecamatanIds: string[],
  kelurahanDesaIds: string[],
) =>
  fc.record({
    id: fc.uuid(),
    provinsiId: fc.oneof(
      fc.constantFrom(...provinsiIds),
      fc.constant(null as string | null),
    ),
    kabupatenKotaId: fc.oneof(
      fc.constantFrom(...kabupatenKotaIds),
      fc.constant(null as string | null),
    ),
    kecamatanId: fc.oneof(
      fc.constantFrom(...kecamatanIds),
      fc.constant(null as string | null),
    ),
    kelurahanDesaId: fc.oneof(
      fc.constantFrom(...kelurahanDesaIds),
      fc.constant(null as string | null),
    ),
    deletedAt: fc.oneof(
      fc.constant(null as Date | null),
      fc.date().map((d) => d as Date | null),
    ),
  });

// Generate a set of region IDs for use in patient generation
const regionPoolArb = fc.record({
  provinsiIds: fc.uniqueArray(provinsiIdArb, { minLength: 1, maxLength: 5 }),
  kabupatenKotaIds: fc.uniqueArray(kabupatenKotaIdArb, {
    minLength: 1,
    maxLength: 8,
  }),
  kecamatanIds: fc.uniqueArray(kecamatanIdArb, {
    minLength: 1,
    maxLength: 8,
  }),
  kelurahanDesaIds: fc.uniqueArray(kelurahanDesaIdArb, {
    minLength: 1,
    maxLength: 8,
  }),
});

/**
 * Helper: compute expected groupBy result from a list of patients.
 * Filters: deletedAt === null AND the grouping field is not null.
 * If parentFilter is provided, also filters by that parent field value.
 */
function computeExpectedGroups(
  patients: PatientRecord[],
  groupByField: keyof PatientRecord,
  parentFilterField?: keyof PatientRecord,
  parentFilterValue?: string,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const p of patients) {
    // Only non-deleted patients
    if (p.deletedAt !== null) continue;
    // Apply parent filter if specified
    if (
      parentFilterField &&
      parentFilterValue &&
      p[parentFilterField] !== parentFilterValue
    )
      continue;
    // groupBy field must not be null
    const regionId = p[groupByField] as string | null;
    if (regionId === null) continue;

    counts.set(regionId, (counts.get(regionId) || 0) + 1);
  }

  return counts;
}

/**
 * Creates a mock PrismaService that simulates groupBy and findMany behavior
 * based on the generated patient dataset.
 */
function createMockPrisma(
  patients: PatientRecord[],
  regionNames: Map<string, string>,
) {
  const mockPatientGroupBy = jest
    .fn()
    .mockImplementation(({ by, where }) => {
      const groupField = by[0] as keyof PatientRecord;

      const filtered = patients.filter((p) => {
        // deletedAt must be null
        if (p.deletedAt !== null) return false;

        // Apply where conditions
        for (const [key, condition] of Object.entries(where)) {
          if (key === 'deletedAt') continue; // Already checked

          const value = p[key as keyof PatientRecord];
          if (
            typeof condition === 'object' &&
            condition !== null &&
            'not' in condition
          ) {
            if (value === condition.not) return false;
          } else if (typeof condition === 'string') {
            if (value !== condition) return false;
          }
        }

        return true;
      });

      // Group by the specified field
      const groups = new Map<string, number>();
      for (const p of filtered) {
        const regionId = p[groupField] as string | null;
        if (regionId !== null) {
          groups.set(regionId, (groups.get(regionId) || 0) + 1);
        }
      }

      return Promise.resolve(
        Array.from(groups.entries()).map(([id, count]) => ({
          [groupField]: id,
          _count: { id: count },
        })),
      );
    });

  const createFindMany = () =>
    jest.fn().mockImplementation(({ where }) => {
      const ids: string[] = where?.id?.in || [];
      return Promise.resolve(
        ids.map((id) => ({ id, name: regionNames.get(id) || `Region ${id}` })),
      );
    });

  return {
    patient: {
      groupBy: mockPatientGroupBy,
    },
    provinsi: { findMany: createFindMany() },
    kabupatenKota: { findMany: createFindMany() },
    kecamatan: { findMany: createFindMany() },
    kelurahanDesa: { findMany: createFindMany() },
  } as unknown as PrismaService;
}

describe('Property 10: Dashboard Counting Invariant', () => {
  /**
   * No filter: group by provinsi.
   * Sum of all group counts SHALL equal total non-deleted patients with provinsiId not null.
   * Each group count SHALL equal actual count of patients in that provinsi.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  it(
    'sum of grouped counts equals total matching patients (no filter - by provinsi)',
    async () => {
      await fc.assert(
        fc.asyncProperty(regionPoolArb, async (regionPool) => {
          // Generate patients using the region pool
          const patientsArb = fc.array(
            patientRecordArb(
              regionPool.provinsiIds,
              regionPool.kabupatenKotaIds,
              regionPool.kecamatanIds,
              regionPool.kelurahanDesaIds,
            ),
            { minLength: 1, maxLength: 50 },
          );

          await fc.assert(
            fc.asyncProperty(patientsArb, async (patients) => {
              // Build region names map
              const regionNames = new Map<string, string>();
              regionPool.provinsiIds.forEach((id) =>
                regionNames.set(id, `Provinsi ${id}`),
              );

              const mockPrisma = createMockPrisma(patients, regionNames);
              const service = new DashboardService(mockPrisma);

              const result = await service.getRegionDistribution({});

              // Compute expected groups
              const expectedGroups = computeExpectedGroups(
                patients,
                'provinsiId',
              );

              // Property 1: Sum of counts equals total matching patients
              const totalFromResult = result.reduce(
                (sum, item) => sum + item.count,
                0,
              );
              const expectedTotal = Array.from(expectedGroups.values()).reduce(
                (sum, count) => sum + count,
                0,
              );
              expect(totalFromResult).toBe(expectedTotal);

              // Property 2: Each individual count matches actual count
              for (const item of result) {
                expect(item.count).toBe(expectedGroups.get(item.id) || 0);
              }

              // Property 3: No extra regions in result
              expect(result.length).toBe(expectedGroups.size);
            }),
            { numRuns: 10 },
          );
        }),
        { numRuns: 10 },
      );
    },
    60000,
  );

  /**
   * With provinsiId filter: group by kabupatenKota.
   * Sum of grouped counts equals total non-deleted patients matching the filter.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  it(
    'sum of grouped counts equals total matching patients (provinsiId filter - by kabupatenKota)',
    async () => {
      await fc.assert(
        fc.asyncProperty(regionPoolArb, async (regionPool) => {
          const filterProvinsiId = regionPool.provinsiIds[0];

          const patientsArb = fc.array(
            patientRecordArb(
              regionPool.provinsiIds,
              regionPool.kabupatenKotaIds,
              regionPool.kecamatanIds,
              regionPool.kelurahanDesaIds,
            ),
            { minLength: 1, maxLength: 50 },
          );

          await fc.assert(
            fc.asyncProperty(patientsArb, async (patients) => {
              const regionNames = new Map<string, string>();
              regionPool.kabupatenKotaIds.forEach((id) =>
                regionNames.set(id, `KabupatenKota ${id}`),
              );

              const mockPrisma = createMockPrisma(patients, regionNames);
              const service = new DashboardService(mockPrisma);

              const result = await service.getRegionDistribution({
                provinsiId: filterProvinsiId,
              });

              // Compute expected groups: patients with matching provinsiId + kabupatenKotaId not null
              const expectedGroups = computeExpectedGroups(
                patients,
                'kabupatenKotaId',
                'provinsiId',
                filterProvinsiId,
              );

              // Property 1: Sum of counts equals total matching patients
              const totalFromResult = result.reduce(
                (sum, item) => sum + item.count,
                0,
              );
              const expectedTotal = Array.from(expectedGroups.values()).reduce(
                (sum, count) => sum + count,
                0,
              );
              expect(totalFromResult).toBe(expectedTotal);

              // Property 2: Each individual count matches actual count
              for (const item of result) {
                expect(item.count).toBe(expectedGroups.get(item.id) || 0);
              }

              expect(result.length).toBe(expectedGroups.size);
            }),
            { numRuns: 10 },
          );
        }),
        { numRuns: 10 },
      );
    },
    60000,
  );

  /**
   * With kabupatenKotaId filter: group by kecamatan.
   * Sum of grouped counts equals total non-deleted patients matching the filter.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  it(
    'sum of grouped counts equals total matching patients (kabupatenKotaId filter - by kecamatan)',
    async () => {
      await fc.assert(
        fc.asyncProperty(regionPoolArb, async (regionPool) => {
          const filterKabupatenKotaId = regionPool.kabupatenKotaIds[0];

          const patientsArb = fc.array(
            patientRecordArb(
              regionPool.provinsiIds,
              regionPool.kabupatenKotaIds,
              regionPool.kecamatanIds,
              regionPool.kelurahanDesaIds,
            ),
            { minLength: 1, maxLength: 50 },
          );

          await fc.assert(
            fc.asyncProperty(patientsArb, async (patients) => {
              const regionNames = new Map<string, string>();
              regionPool.kecamatanIds.forEach((id) =>
                regionNames.set(id, `Kecamatan ${id}`),
              );

              const mockPrisma = createMockPrisma(patients, regionNames);
              const service = new DashboardService(mockPrisma);

              const result = await service.getRegionDistribution({
                kabupatenKotaId: filterKabupatenKotaId,
              });

              // Compute expected groups: patients with matching kabupatenKotaId + kecamatanId not null
              const expectedGroups = computeExpectedGroups(
                patients,
                'kecamatanId',
                'kabupatenKotaId',
                filterKabupatenKotaId,
              );

              // Property 1: Sum of counts equals total matching patients
              const totalFromResult = result.reduce(
                (sum, item) => sum + item.count,
                0,
              );
              const expectedTotal = Array.from(expectedGroups.values()).reduce(
                (sum, count) => sum + count,
                0,
              );
              expect(totalFromResult).toBe(expectedTotal);

              // Property 2: Each individual count matches actual count
              for (const item of result) {
                expect(item.count).toBe(expectedGroups.get(item.id) || 0);
              }

              expect(result.length).toBe(expectedGroups.size);
            }),
            { numRuns: 10 },
          );
        }),
        { numRuns: 10 },
      );
    },
    60000,
  );

  /**
   * With kecamatanId filter: group by kelurahanDesa.
   * Sum of grouped counts equals total non-deleted patients matching the filter.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  it(
    'sum of grouped counts equals total matching patients (kecamatanId filter - by kelurahanDesa)',
    async () => {
      await fc.assert(
        fc.asyncProperty(regionPoolArb, async (regionPool) => {
          const filterKecamatanId = regionPool.kecamatanIds[0];

          const patientsArb = fc.array(
            patientRecordArb(
              regionPool.provinsiIds,
              regionPool.kabupatenKotaIds,
              regionPool.kecamatanIds,
              regionPool.kelurahanDesaIds,
            ),
            { minLength: 1, maxLength: 50 },
          );

          await fc.assert(
            fc.asyncProperty(patientsArb, async (patients) => {
              const regionNames = new Map<string, string>();
              regionPool.kelurahanDesaIds.forEach((id) =>
                regionNames.set(id, `KelurahanDesa ${id}`),
              );

              const mockPrisma = createMockPrisma(patients, regionNames);
              const service = new DashboardService(mockPrisma);

              const result = await service.getRegionDistribution({
                kecamatanId: filterKecamatanId,
              });

              // Compute expected groups: patients with matching kecamatanId + kelurahanDesaId not null
              const expectedGroups = computeExpectedGroups(
                patients,
                'kelurahanDesaId',
                'kecamatanId',
                filterKecamatanId,
              );

              // Property 1: Sum of counts equals total matching patients
              const totalFromResult = result.reduce(
                (sum, item) => sum + item.count,
                0,
              );
              const expectedTotal = Array.from(expectedGroups.values()).reduce(
                (sum, count) => sum + count,
                0,
              );
              expect(totalFromResult).toBe(expectedTotal);

              // Property 2: Each individual count matches actual count
              for (const item of result) {
                expect(item.count).toBe(expectedGroups.get(item.id) || 0);
              }

              expect(result.length).toBe(expectedGroups.size);
            }),
            { numRuns: 10 },
          );
        }),
        { numRuns: 10 },
      );
    },
    60000,
  );
});
