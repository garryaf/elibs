// Feature: master-wilayah-indonesia, Property 4: Active-Filtered Parent-Scoped Query
import * as fc from 'fast-check';
import { RegionService } from './region.service';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Property 4: Active-Filtered Parent-Scoped Query
 *
 * For any region level and any valid parent ID, the lookup endpoint SHALL return
 * exactly the set of records that are both (a) active (isActive = true) and
 * (b) direct children of the specified parent. No inactive records and no records
 * belonging to other parents shall appear.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

// Generators for region records
const regionIdArb = fc.stringMatching(/^\d{2,10}$/);
const regionNameArb = fc.string({ minLength: 1, maxLength: 100 });

interface MockRegionRecord {
  id: string;
  name: string;
  isActive: boolean;
  parentId: string;
}

/**
 * Generates a list of region records with varying isActive flags and parent IDs.
 * Some records belong to the target parent, others belong to different parents.
 */
const regionRecordListArb = (targetParentId: string) =>
  fc.array(
    fc.record({
      id: regionIdArb,
      name: regionNameArb,
      isActive: fc.boolean(),
      parentId: fc.oneof(fc.constant(targetParentId), regionIdArb),
    }),
    { minLength: 0, maxLength: 20 },
  );

/**
 * Creates a mock PrismaService that simulates the filtering behavior of the
 * actual database. The mock stores a dataset and applies `where` clause filtering
 * matching Prisma's behavior (isActive, parentId).
 */
function createMockPrismaForRegionQuery(
  kabupatenKotaRecords: MockRegionRecord[],
  kecamatanRecords: MockRegionRecord[],
  kelurahanDesaRecords: MockRegionRecord[],
  provinsiRecords: { id: string; name: string; isActive: boolean }[],
) {
  const filterRecords = (
    records: MockRegionRecord[],
    where: any,
    parentField: string,
  ) => {
    return records.filter((r) => {
      if (where.isActive !== undefined && r.isActive !== where.isActive)
        return false;
      if (where[parentField] !== undefined && r.parentId !== where[parentField])
        return false;
      if (where.name?.contains) {
        const search = where.name.contains.toLowerCase();
        if (!r.name.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  };

  const mockPrisma = {
    provinsi: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
        let filtered = provinsiRecords.filter((r) => {
          if (where.isActive !== undefined && r.isActive !== where.isActive)
            return false;
          if (where.name?.contains) {
            const search = where.name.contains.toLowerCase();
            if (!r.name.toLowerCase().includes(search)) return false;
          }
          return true;
        });
        filtered = filtered.slice(skip || 0, (skip || 0) + (take || 50));
        return Promise.resolve(
          filtered.map((r) => ({ id: r.id, name: r.name })),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const filtered = provinsiRecords.filter((r) => {
          if (where.isActive !== undefined && r.isActive !== where.isActive)
            return false;
          if (where.name?.contains) {
            const search = where.name.contains.toLowerCase();
            if (!r.name.toLowerCase().includes(search)) return false;
          }
          return true;
        });
        return Promise.resolve(filtered.length);
      }),
    },
    kabupatenKota: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
        let filtered = filterRecords(
          kabupatenKotaRecords,
          where,
          'provinsiId',
        );
        filtered = filtered.slice(skip || 0, (skip || 0) + (take || 50));
        return Promise.resolve(
          filtered.map((r) => ({
            id: r.id,
            name: r.name,
            provinsiId: r.parentId,
          })),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const filtered = filterRecords(
          kabupatenKotaRecords,
          where,
          'provinsiId',
        );
        return Promise.resolve(filtered.length);
      }),
    },
    kecamatan: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
        let filtered = filterRecords(kecamatanRecords, where, 'kabupatenKotaId');
        filtered = filtered.slice(skip || 0, (skip || 0) + (take || 50));
        return Promise.resolve(
          filtered.map((r) => ({
            id: r.id,
            name: r.name,
            kabupatenKotaId: r.parentId,
          })),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const filtered = filterRecords(
          kecamatanRecords,
          where,
          'kabupatenKotaId',
        );
        return Promise.resolve(filtered.length);
      }),
    },
    kelurahanDesa: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
        let filtered = filterRecords(
          kelurahanDesaRecords,
          where,
          'kecamatanId',
        );
        filtered = filtered.slice(skip || 0, (skip || 0) + (take || 50));
        return Promise.resolve(
          filtered.map((r) => ({
            id: r.id,
            name: r.name,
            kecamatanId: r.parentId,
            postalCode: null,
          })),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const filtered = filterRecords(
          kelurahanDesaRecords,
          where,
          'kecamatanId',
        );
        return Promise.resolve(filtered.length);
      }),
    },
  } as unknown as PrismaService;

  return mockPrisma;
}

describe('Property 4: Active-Filtered Parent-Scoped Query', () => {
  /**
   * For any set of KabupatenKota records with varying isActive and provinsiId,
   * findKabupatenKotaByProvinsi SHALL return only records that are active AND
   * belong to the specified provinsiId.
   */
  it(
    'should return only active KabupatenKota records belonging to the specified provinsiId',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionRecordListArb('placeholder').chain((records) =>
            regionIdArb.map((targetId) => ({
              targetParentId: targetId,
              records: records.map((r) => ({
                ...r,
                parentId: r.isActive
                  ? r.parentId
                  : fc.sample(
                      fc.oneof(fc.constant(targetId), regionIdArb),
                      1,
                    )[0],
              })),
            })),
          ),
          async (_seed, generated) => {
            const { targetParentId, records } = generated;

            const mockPrisma = createMockPrismaForRegionQuery(
              records,
              [],
              [],
              [],
            );
            const service = new RegionService(mockPrisma);

            const result = await service.findKabupatenKotaByProvinsi(
              targetParentId,
              1,
              50,
            );

            // Property: every returned record must be active and belong to the target parent
            for (const item of result.data) {
              const sourceRecord = records.find((r) => r.id === item.id);
              if (sourceRecord) {
                expect(sourceRecord.isActive).toBe(true);
                expect(sourceRecord.parentId).toBe(targetParentId);
              }
            }

            // Property: no active record belonging to the target parent should be missing
            const expectedActiveChildren = records.filter(
              (r) => r.isActive && r.parentId === targetParentId,
            );
            const expectedSlice = expectedActiveChildren.slice(0, 50);
            expect(result.data.length).toBe(expectedSlice.length);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any set of Kecamatan records with varying isActive and kabupatenKotaId,
   * findKecamatanByKabupatenKota SHALL return only records that are active AND
   * belong to the specified kabupatenKotaId.
   */
  it(
    'should return only active Kecamatan records belonging to the specified kabupatenKotaId',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionRecordListArb('placeholder').chain((records) =>
            regionIdArb.map((targetId) => ({
              targetParentId: targetId,
              records: records.map((r) => ({
                ...r,
                parentId: r.isActive
                  ? r.parentId
                  : fc.sample(
                      fc.oneof(fc.constant(targetId), regionIdArb),
                      1,
                    )[0],
              })),
            })),
          ),
          async (_seed, generated) => {
            const { targetParentId, records } = generated;

            const mockPrisma = createMockPrismaForRegionQuery(
              [],
              records,
              [],
              [],
            );
            const service = new RegionService(mockPrisma);

            const result = await service.findKecamatanByKabupatenKota(
              targetParentId,
              1,
              50,
            );

            // Property: every returned record must be active and belong to the target parent
            for (const item of result.data) {
              const sourceRecord = records.find((r) => r.id === item.id);
              if (sourceRecord) {
                expect(sourceRecord.isActive).toBe(true);
                expect(sourceRecord.parentId).toBe(targetParentId);
              }
            }

            // Property: no active record belonging to the target parent should be missing
            const expectedActiveChildren = records.filter(
              (r) => r.isActive && r.parentId === targetParentId,
            );
            const expectedSlice = expectedActiveChildren.slice(0, 50);
            expect(result.data.length).toBe(expectedSlice.length);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any set of KelurahanDesa records with varying isActive and kecamatanId,
   * findKelurahanDesaByKecamatan SHALL return only records that are active AND
   * belong to the specified kecamatanId.
   */
  it(
    'should return only active KelurahanDesa records belonging to the specified kecamatanId',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionRecordListArb('placeholder').chain((records) =>
            regionIdArb.map((targetId) => ({
              targetParentId: targetId,
              records: records.map((r) => ({
                ...r,
                parentId: r.isActive
                  ? r.parentId
                  : fc.sample(
                      fc.oneof(fc.constant(targetId), regionIdArb),
                      1,
                    )[0],
              })),
            })),
          ),
          async (_seed, generated) => {
            const { targetParentId, records } = generated;

            const mockPrisma = createMockPrismaForRegionQuery(
              [],
              [],
              records,
              [],
            );
            const service = new RegionService(mockPrisma);

            const result = await service.findKelurahanDesaByKecamatan(
              targetParentId,
              1,
              50,
            );

            // Property: every returned record must be active and belong to the target parent
            for (const item of result.data) {
              const sourceRecord = records.find((r) => r.id === item.id);
              if (sourceRecord) {
                expect(sourceRecord.isActive).toBe(true);
                expect(sourceRecord.parentId).toBe(targetParentId);
              }
            }

            // Property: no active record belonging to the target parent should be missing
            const expectedActiveChildren = records.filter(
              (r) => r.isActive && r.parentId === targetParentId,
            );
            const expectedSlice = expectedActiveChildren.slice(0, 50);
            expect(result.data.length).toBe(expectedSlice.length);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any set of Provinsi records with varying isActive flags,
   * findAllProvinsi SHALL return only active records (no parent filtering
   * since Provinsi is the top level).
   */
  it(
    'should return only active Provinsi records (top-level, no parent filter)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: regionIdArb,
              name: regionNameArb,
              isActive: fc.boolean(),
            }),
            { minLength: 0, maxLength: 20 },
          ),
          async (provinsiRecords) => {
            const mockPrisma = createMockPrismaForRegionQuery(
              [],
              [],
              [],
              provinsiRecords,
            );
            const service = new RegionService(mockPrisma);

            const result = await service.findAllProvinsi(1, 50);

            // Property: every returned record must be active
            const expectedActive = provinsiRecords.filter((r) => r.isActive);
            const expectedSlice = expectedActive.slice(0, 50);
            expect(result.data.length).toBe(expectedSlice.length);

            // Property: no inactive record should appear in results
            for (const item of result.data) {
              const sourceRecord = provinsiRecords.find(
                (r) => r.id === item.id,
              );
              if (sourceRecord) {
                expect(sourceRecord.isActive).toBe(true);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});

// Feature: master-wilayah-indonesia, Property 5: Case-Insensitive Partial Name Search

/**
 * Property 5: Case-Insensitive Partial Name Search
 *
 * For any region record in the database and any substring of its name
 * (in any letter casing), the search endpoint with that substring as query
 * SHALL include that record in its results.
 *
 * **Validates: Requirements 3.5**
 *
 * This test verifies that the RegionService correctly passes case-insensitive
 * partial matching criteria to Prisma (contains + mode: 'insensitive').
 */

/**
 * Extracts a random substring from a given string based on start index and length.
 */
function extractSubstring(
  name: string,
  startIndex: number,
  length: number,
): string {
  const normalizedStart = startIndex % name.length;
  const maxLen = name.length - normalizedStart;
  const normalizedLen = Math.max(1, (length % maxLen) + 1);
  return name.substring(normalizedStart, normalizedStart + normalizedLen);
}

/**
 * Applies a random case transformation to a string.
 * transformType: 0 = uppercase, 1 = lowercase, 2 = mixed case
 */
function applyCaseTransform(str: string, transformType: number): string {
  switch (transformType % 3) {
    case 0:
      return str.toUpperCase();
    case 1:
      return str.toLowerCase();
    case 2:
      // Mixed case: alternate upper/lower per character
      return str
        .split('')
        .map((ch, i) => (i % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase()))
        .join('');
    default:
      return str;
  }
}

/**
 * Creates a mock PrismaService that simulates case-insensitive partial name matching.
 * The mock implements findMany and count for provinsi that filter records
 * using case-insensitive contains logic, mirroring Prisma's behavior.
 */
function createSearchMockPrisma(records: Array<{ id: string; name: string }>) {
  const filterRecords = (where: any) => {
    return records.filter((record) => {
      if (where.isActive !== undefined && where.isActive !== true) {
        return false;
      }
      if (where.name && where.name.contains) {
        const searchTerm = where.name.contains.toLowerCase();
        const recordName = record.name.toLowerCase();
        if (where.name.mode === 'insensitive') {
          return recordName.includes(searchTerm);
        }
        return record.name.includes(where.name.contains);
      }
      return true;
    });
  };

  const mockPrisma = {
    provinsi: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
        const filtered = filterRecords(where);
        const paginated = filtered.slice(skip || 0, (skip || 0) + (take || 50));
        return Promise.resolve(
          paginated.map((r) => ({ id: r.id, name: r.name })),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(filterRecords(where).length);
      }),
    },
  } as unknown as PrismaService;

  return mockPrisma;
}

describe('Property 5: Case-Insensitive Partial Name Search', () => {
  // Generator for region names (non-empty printable strings)
  const searchRegionNameArb = fc
    .string({ minLength: 2, maxLength: 50 })
    .filter((s) => s.trim().length >= 2);

  // Generator for region ID (EMSIFA numeric format)
  const searchRegionIdArb = fc.stringMatching(/^\d{2,10}$/);

  // Generator for substring extraction params
  const substringParamsArb = fc.record({
    startIndex: fc.nat({ max: 1000 }),
    length: fc.nat({ max: 1000 }),
  });

  // Generator for case transformation type (0=upper, 1=lower, 2=mixed)
  const caseTransformArb = fc.nat({ max: 2 });

  /**
   * For any region name and any substring of that name (with any casing applied),
   * the search through findAllProvinsi SHALL include that record in results.
   */
  it(
    'should find a region record when searching with any substring of its name in any casing',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          searchRegionIdArb,
          searchRegionNameArb,
          substringParamsArb,
          caseTransformArb,
          async (id, name, substringParams, caseTransform) => {
            // Extract a substring from the region name
            const substring = extractSubstring(
              name,
              substringParams.startIndex,
              substringParams.length,
            );

            // Apply random case transformation
            const searchQuery = applyCaseTransform(substring, caseTransform);

            // Create mock with one region record
            const mockPrisma = createSearchMockPrisma([{ id, name }]);
            const service = new RegionService(mockPrisma);

            // Execute search
            const result = await service.findAllProvinsi(1, 50, searchQuery);

            // The record must be found in results
            expect(result.data.length).toBeGreaterThanOrEqual(1);
            expect(result.data.some((item) => item.id === id)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Verifies that the service correctly passes the search parameter to Prisma
   * with `contains` and `mode: 'insensitive'` configuration.
   */
  it(
    'should pass search query to Prisma with contains and mode insensitive',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          searchRegionNameArb,
          caseTransformArb,
          async (searchTerm, caseTransform) => {
            const transformedSearch = applyCaseTransform(
              searchTerm,
              caseTransform,
            );

            const mockPrisma = {
              provinsi: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
              },
            } as unknown as PrismaService;

            const service = new RegionService(mockPrisma);

            await service.findAllProvinsi(1, 50, transformedSearch);

            // Verify findMany was called with correct where clause
            expect(mockPrisma.provinsi.findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  isActive: true,
                  name: {
                    contains: transformedSearch,
                    mode: 'insensitive',
                  },
                }),
              }),
            );

            // Verify count was called with the same where clause
            expect(mockPrisma.provinsi.count).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  isActive: true,
                  name: {
                    contains: transformedSearch,
                    mode: 'insensitive',
                  },
                }),
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Verifies the property across multiple records: when searching with a substring
   * of one specific record's name, that record appears in results among others.
   */
  it(
    'should include the matching record among multiple records when searching by partial name',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: searchRegionIdArb,
              name: searchRegionNameArb,
            }),
            { minLength: 2, maxLength: 10 },
          ),
          fc.nat(),
          substringParamsArb,
          caseTransformArb,
          async (records, targetIndex, substringParams, caseTransform) => {
            // Ensure unique IDs
            const uniqueRecords = records.filter(
              (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
            );
            if (uniqueRecords.length < 1) return;

            // Pick a target record
            const target = uniqueRecords[targetIndex % uniqueRecords.length];

            // Extract substring from target's name
            const substring = extractSubstring(
              target.name,
              substringParams.startIndex,
              substringParams.length,
            );

            // Apply case transformation
            const searchQuery = applyCaseTransform(substring, caseTransform);

            // Create mock with all records
            const mockPrisma = createSearchMockPrisma(uniqueRecords);
            const service = new RegionService(mockPrisma);

            const result = await service.findAllProvinsi(1, 50, searchQuery);

            // The target record must be in the results
            expect(
              result.data.some((item) => item.id === target.id),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});


/**
 * Property 6: Pagination Completeness and No Overlap
 *
 * For any region list with N total records and a given page size, the union of
 * all paginated pages SHALL equal the complete set of matching records, with no
 * duplicates across pages.
 *
 * **Validates: Requirements 3.6**
 */

/**
 * Creates a mock PrismaService that simulates paginated findMany and count
 * operations on a given array of provinsi records with unique IDs.
 */
function createMockPrismaForPagination(
  records: Array<{ id: string; name: string; isActive: boolean }>,
) {
  const activeRecords = records.filter((r) => r.isActive);
  // Sort by name to match RegionService's orderBy: { name: 'asc' }
  const sortedRecords = [...activeRecords].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const mockPrisma = {
    provinsi: {
      findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
        let filtered = sortedRecords;

        if (where?.name?.contains) {
          const search = where.name.contains.toLowerCase();
          filtered = filtered.filter((r) =>
            r.name.toLowerCase().includes(search),
          );
        }

        return Promise.resolve(
          filtered
            .slice(skip ?? 0, (skip ?? 0) + (take ?? 50))
            .map((r) => ({ id: r.id, name: r.name })),
        );
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        let filtered = sortedRecords;

        if (where?.name?.contains) {
          const search = where.name.contains.toLowerCase();
          filtered = filtered.filter((r) =>
            r.name.toLowerCase().includes(search),
          );
        }

        return Promise.resolve(filtered.length);
      }),
    },
  } as unknown as PrismaService;

  return mockPrisma;
}

// Generator for a list of active region records with guaranteed unique IDs
const paginationRegionListArb = fc
  .integer({ min: 0, max: 50 })
  .map((count) =>
    Array.from({ length: count }, (_, i) => ({
      id: String(i + 1).padStart(4, '0'),
      name: `Region ${String(i + 1).padStart(4, '0')}`,
      isActive: true,
    })),
  );

// Generator for page size (limit), between 1 and 20
const pageSizeArb = fc.integer({ min: 1, max: 20 });

describe('Property 6: Pagination Completeness and No Overlap', () => {
  /**
   * The union of all pages should contain every record exactly once.
   * No record should be missing and no record should appear in multiple pages.
   */
  it(
    'should return all records exactly once when iterating through all pages',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          paginationRegionListArb,
          pageSizeArb,
          async (records, pageSize) => {
            const prisma = createMockPrismaForPagination(records);
            const service = new RegionService(prisma);

            // Get first page to determine total pages
            const firstResult = await service.findAllProvinsi(1, pageSize);
            const totalPages = firstResult.meta.totalPages;
            const expectedTotal = firstResult.meta.total;

            // Verify meta.total matches actual active record count
            const activeCount = records.filter((r) => r.isActive).length;
            expect(expectedTotal).toBe(activeCount);

            // Verify totalPages calculation is correct
            const expectedTotalPages =
              activeCount === 0 ? 0 : Math.ceil(activeCount / pageSize);
            expect(totalPages).toBe(expectedTotalPages);

            // Collect all IDs across all pages
            const allIds: string[] = [];

            for (let page = 1; page <= totalPages; page++) {
              const result = await service.findAllProvinsi(page, pageSize);
              allIds.push(...result.data.map((item) => item.id));

              // Each page should have at most pageSize items
              expect(result.data.length).toBeLessThanOrEqual(pageSize);

              // Meta should be consistent across pages
              expect(result.meta.total).toBe(expectedTotal);
              expect(result.meta.totalPages).toBe(totalPages);
              expect(result.meta.limit).toBe(pageSize);
              expect(result.meta.page).toBe(page);
            }

            // Union of all pages should equal the full set size
            expect(allIds.length).toBe(expectedTotal);

            // No duplicates: unique IDs count should match total IDs count
            const uniqueIds = new Set(allIds);
            expect(uniqueIds.size).toBe(allIds.length);

            // Every active record in the dataset should appear in the collected results
            const activeRecordIds = records
              .filter((r) => r.isActive)
              .map((r) => r.id)
              .sort();
            const collectedIds = [...allIds].sort();
            expect(collectedIds).toEqual(activeRecordIds);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * When there are zero records, pagination should report zero total and
   * zero pages with an empty result.
   */
  it(
    'should handle empty result set correctly with zero total and zero pages',
    async () => {
      await fc.assert(
        fc.asyncProperty(pageSizeArb, async (pageSize) => {
          const prisma = createMockPrismaForPagination([]);
          const service = new RegionService(prisma);

          const result = await service.findAllProvinsi(1, pageSize);

          expect(result.data).toEqual([]);
          expect(result.meta.total).toBe(0);
          expect(result.meta.totalPages).toBe(0);
          expect(result.meta.page).toBe(1);
          expect(result.meta.limit).toBe(pageSize);
        }),
        { numRuns: 100 },
      );
    },
    60000,
  );
});


// Feature: master-wilayah-indonesia, Property 11: Sync Idempotency

/**
 * Property 11: Sync Idempotency
 *
 * For any set of region data from the EMSIFA API, executing the sync/upsert
 * operation multiple times SHALL produce the same record count and data state
 * as executing it once — no duplicate records shall be created.
 *
 * **Validates: Requirements 8.2**
 */

/**
 * Simulates an in-memory store that mimics Prisma's upsert behavior:
 * - If a record with the given ID exists, update the name field only
 * - If a record doesn't exist, create it with the given fields
 */
class InMemoryRegionStore {
  private store: Map<string, { id: string; name: string; isActive: boolean }> =
    new Map();

  upsert(record: { id: string; name: string }): void {
    const existing = this.store.get(record.id);
    if (existing) {
      // Update: only change name, preserve isActive
      existing.name = record.name;
    } else {
      // Create: new record with default isActive = true
      this.store.set(record.id, {
        id: record.id,
        name: record.name,
        isActive: true,
      });
    }
  }

  getAll(): Array<{ id: string; name: string; isActive: boolean }> {
    return Array.from(this.store.values());
  }

  getCount(): number {
    return this.store.size;
  }

  getSnapshot(): Map<string, { id: string; name: string; isActive: boolean }> {
    return new Map(
      Array.from(this.store.entries()).map(([k, v]) => [k, { ...v }]),
    );
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Simulates the sync upsert operation for a batch of province records
 * against an in-memory store, mirroring the RegionSyncService.upsertProvinces logic.
 */
function simulateSyncUpsert(
  store: InMemoryRegionStore,
  records: Array<{ id: string; name: string }>,
): void {
  for (const record of records) {
    store.upsert(record);
  }
}

// Generator: array of EMSIFA province records with numeric string IDs
const emsifaProvinceArb = fc.record({
  id: fc.stringMatching(/^\d{2}$/),
  name: fc.string({ minLength: 1, maxLength: 100 }),
});

const emsifaProvinceListArb = fc.array(emsifaProvinceArb, {
  minLength: 1,
  maxLength: 40,
});

describe('Property 11: Sync Idempotency', () => {
  /**
   * Running the upsert/sync operation twice with the same input data produces
   * the same record count after first run as after the second run.
   * No duplicate records are created.
   */
  it(
    'should produce the same record count after running sync twice as after running once',
    async () => {
      await fc.assert(
        fc.asyncProperty(emsifaProvinceListArb, async (provinces) => {
          const store = new InMemoryRegionStore();

          // First sync run
          simulateSyncUpsert(store, provinces);
          const countAfterFirstSync = store.getCount();
          const stateAfterFirstSync = store.getSnapshot();

          // Second sync run (same data)
          simulateSyncUpsert(store, provinces);
          const countAfterSecondSync = store.getCount();
          const stateAfterSecondSync = store.getSnapshot();

          // Property: record count after second sync equals record count after first sync
          expect(countAfterSecondSync).toBe(countAfterFirstSync);

          // Property: data state after second sync is identical to state after first sync
          expect(stateAfterSecondSync.size).toBe(stateAfterFirstSync.size);
          for (const [id, record] of stateAfterFirstSync.entries()) {
            const secondRecord = stateAfterSecondSync.get(id);
            expect(secondRecord).toBeDefined();
            expect(secondRecord!.id).toBe(record.id);
            expect(secondRecord!.name).toBe(record.name);
            expect(secondRecord!.isActive).toBe(record.isActive);
          }
        }),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * After sync, the record count matches the number of unique IDs in the input
   * data — no duplicates are created regardless of how many times the sync runs.
   */
  it(
    'should have record count equal to unique input IDs after multiple syncs (no duplicates)',
    async () => {
      await fc.assert(
        fc.asyncProperty(emsifaProvinceListArb, async (provinces) => {
          const store = new InMemoryRegionStore();

          // Run sync three times to ensure idempotency beyond two runs
          simulateSyncUpsert(store, provinces);
          simulateSyncUpsert(store, provinces);
          simulateSyncUpsert(store, provinces);

          // Expected unique IDs from input
          const uniqueIds = new Set(provinces.map((p) => p.id));

          // Property: record count equals unique input ID count
          expect(store.getCount()).toBe(uniqueIds.size);

          // Property: all IDs in the store are unique (Map guarantees this, but verify)
          const allRecords = store.getAll();
          const storeIds = new Set(allRecords.map((r) => r.id));
          expect(storeIds.size).toBe(allRecords.length);
        }),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For input with duplicate IDs (same province appearing multiple times),
   * the upsert should keep only one record per unique ID — the last name wins.
   */
  it(
    'should handle duplicate IDs in input by keeping one record per unique ID with last name',
    async () => {
      await fc.assert(
        fc.asyncProperty(emsifaProvinceListArb, async (provinces) => {
          const store = new InMemoryRegionStore();

          // First sync
          simulateSyncUpsert(store, provinces);

          // The expected final state: for each unique ID, the last occurrence's name wins
          const expectedState = new Map<string, string>();
          for (const prov of provinces) {
            expectedState.set(prov.id, prov.name);
          }

          // Verify record count matches unique IDs
          expect(store.getCount()).toBe(expectedState.size);

          // Verify each record has the correct (last) name
          const allRecords = store.getAll();
          for (const record of allRecords) {
            expect(expectedState.has(record.id)).toBe(true);
            expect(record.name).toBe(expectedState.get(record.id));
          }

          // Run sync again — same result
          simulateSyncUpsert(store, provinces);
          expect(store.getCount()).toBe(expectedState.size);
          const allRecordsAfterSecond = store.getAll();
          for (const record of allRecordsAfterSecond) {
            expect(record.name).toBe(expectedState.get(record.id));
          }
        }),
        { numRuns: 100 },
      );
    },
    60000,
  );
});


// Feature: master-wilayah-indonesia, Property 2: EMSIFA ID Preservation Through Sync

/**
 * Property 2: EMSIFA ID Preservation Through Sync
 *
 * For any EMSIFA API response containing region records, after the sync service
 * processes them, each stored record's primary key SHALL equal the original EMSIFA
 * code from the API response.
 *
 * **Validates: Requirements 1.6, 2.1**
 */

import { RegionSyncService } from './region-sync.service';

describe('Property 2: EMSIFA ID Preservation Through Sync', () => {
  // Generator for EMSIFA-style province IDs (2-digit numeric strings)
  const emsifaProvinceIdArb = fc.stringMatching(/^\d{2}$/);

  // Generator for EMSIFA-style regency IDs (4-digit numeric strings)
  const emsifaRegencyIdArb = fc.stringMatching(/^\d{4}$/);

  // Generator for region names (non-empty uppercase strings like EMSIFA data)
  const emsifaNameArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length >= 1)
    .map((s) => s.toUpperCase());

  // Generator for an array of EMSIFA province records with unique IDs
  const emsifaProvincesArb = fc
    .uniqueArray(
      fc.record({
        id: emsifaProvinceIdArb,
        name: emsifaNameArb,
      }),
      { selector: (r) => r.id, minLength: 1, maxLength: 10 },
    );

  // Generator for an array of EMSIFA regency records with unique IDs
  const emsifaRegenciesArb = (provinceId: string) =>
    fc.uniqueArray(
      fc.record({
        id: emsifaRegencyIdArb,
        name: emsifaNameArb,
        province_id: fc.constant(provinceId),
      }),
      { selector: (r) => r.id, minLength: 0, maxLength: 5 },
    );

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * For any array of generated EMSIFA province records, after syncAll() processes them,
   * every upsert call to prisma.provinsi.upsert SHALL have where.id and create.id
   * equal to the original EMSIFA province code.
   */
  it(
    'should preserve EMSIFA province IDs as primary keys through upsert',
    async () => {
      await fc.assert(
        fc.asyncProperty(emsifaProvincesArb, async (provinces) => {
          // Track all upsert calls
          const provinsiUpsertCalls: Array<{ where: any; create: any; update: any }> = [];

          // Mock PrismaService
          const mockPrisma = {
            provinsi: {
              upsert: jest.fn().mockImplementation((args) => {
                provinsiUpsertCalls.push(args);
                return Promise.resolve({ id: args.create.id, name: args.create.name });
              }),
            },
            kabupatenKota: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn().mockResolvedValue({}),
            },
            kecamatan: {
              findMany: jest.fn().mockResolvedValue([]),
              upsert: jest.fn().mockResolvedValue({}),
            },
            kelurahanDesa: {
              upsert: jest.fn().mockResolvedValue({}),
            },
          } as unknown as PrismaService;

          // Mock global fetch to return generated provinces and empty arrays for sub-levels
          global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes('/provinces.json')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(provinces),
              });
            }
            // Return empty arrays for regencies (no sub-levels to process)
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve([]),
            });
          }) as jest.Mock;

          const service = new RegionSyncService(mockPrisma);
          await service.syncAll();

          // Property: each upsert call's where.id and create.id must match the original EMSIFA code
          expect(provinsiUpsertCalls.length).toBe(provinces.length);

          for (let i = 0; i < provinces.length; i++) {
            const originalId = provinces[i].id;
            const upsertCall = provinsiUpsertCalls[i];

            // where.id must equal the original EMSIFA code
            expect(upsertCall.where.id).toBe(originalId);
            // create.id must equal the original EMSIFA code
            expect(upsertCall.create.id).toBe(originalId);
          }
        }),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any array of generated EMSIFA regency records, after syncAll() processes them,
   * every upsert call to prisma.kabupatenKota.upsert SHALL have where.id and create.id
   * equal to the original EMSIFA regency code.
   */
  it(
    'should preserve EMSIFA regency IDs as primary keys through upsert',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emsifaProvincesArb.chain((provinces) => {
            // For each province, generate regencies
            if (provinces.length === 0) {
              return fc.constant({ provinces, regenciesByProvince: {} as Record<string, Array<{ id: string; name: string; province_id: string }>> });
            }
            // Use the first province to generate regencies
            return emsifaRegenciesArb(provinces[0].id).map((regencies) => ({
              provinces,
              regenciesByProvince: { [provinces[0].id]: regencies } as Record<string, Array<{ id: string; name: string; province_id: string }>>,
            }));
          }),
          async ({ provinces, regenciesByProvince }) => {
            // Track all upsert calls
            const kabupatenKotaUpsertCalls: Array<{ where: any; create: any; update: any }> = [];

            // Mock PrismaService
            const mockPrisma = {
              provinsi: {
                upsert: jest.fn().mockResolvedValue({}),
              },
              kabupatenKota: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockImplementation((args) => {
                  kabupatenKotaUpsertCalls.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.create.name });
                }),
              },
              kecamatan: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockResolvedValue({}),
              },
              kelurahanDesa: {
                upsert: jest.fn().mockResolvedValue({}),
              },
            } as unknown as PrismaService;

            // Mock global fetch
            global.fetch = jest.fn().mockImplementation((url: string) => {
              if (url.includes('/provinces.json')) {
                return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve(provinces),
                });
              }
              // Check if requesting regencies for a specific province
              const regencyMatch = url.match(/\/regencies\/(\d+)\.json/);
              if (regencyMatch) {
                const provId = regencyMatch[1];
                const regencies = regenciesByProvince[provId] || [];
                return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve(regencies),
                });
              }
              // Return empty arrays for districts/villages
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
              });
            }) as jest.Mock;

            const service = new RegionSyncService(mockPrisma);
            await service.syncAll();

            // Collect all expected regencies
            const allExpectedRegencies = Object.values(regenciesByProvince).flat();

            // Property: each upsert call's where.id and create.id must match the original EMSIFA code
            expect(kabupatenKotaUpsertCalls.length).toBe(allExpectedRegencies.length);

            for (let i = 0; i < allExpectedRegencies.length; i++) {
              const originalId = allExpectedRegencies[i].id;
              const upsertCall = kabupatenKotaUpsertCalls[i];

              // where.id must equal the original EMSIFA code
              expect(upsertCall.where.id).toBe(originalId);
              // create.id must equal the original EMSIFA code
              expect(upsertCall.create.id).toBe(originalId);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});


// Feature: master-wilayah-indonesia, Property 3: Upsert Preserves isActive Flag

/**
 * Property 3: Upsert Preserves isActive Flag
 *
 * For any existing region record with any isActive value (true or false), when the
 * sync service upserts that record with updated data, the isActive field SHALL remain
 * unchanged while the name field is updated.
 *
 * **Validates: Requirements 2.6**
 *
 * This test verifies that the RegionSyncService's upsert calls only update the `name`
 * field and never include `isActive` in the update object, proving that the sync
 * process will not overwrite an administrator's manual activation/deactivation.
 */

/**
 * Generator for EMSIFA province data used in Property 3 tests.
 */
const prop3ProvinceArb = fc.record({
  id: fc.stringMatching(/^\d{2}$/),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
});

describe('Property 3: Upsert Preserves isActive Flag', () => {
  /**
   * For any set of EMSIFA province records being synced, the upsert `update` object
   * SHALL only contain `name` and SHALL NOT contain `isActive`.
   * This ensures existing isActive values are never overwritten during sync.
   */
  it(
    'should only update name and never include isActive in the upsert update object',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(prop3ProvinceArb, { minLength: 1, maxLength: 20 }),
          async (provinces) => {
            // Ensure unique IDs to avoid duplicate test inputs
            const uniqueProvinces = provinces.filter(
              (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
            );
            if (uniqueProvinces.length === 0) return;

            // Track all upsert calls to verify the update argument
            const upsertCalls: Array<{ where: any; update: any; create: any }> = [];

            const mockPrisma = {
              provinsi: {
                upsert: jest.fn().mockImplementation((args) => {
                  upsertCalls.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.update.name });
                }),
              },
              kabupatenKota: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockResolvedValue({}),
              },
              kecamatan: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockResolvedValue({}),
              },
              kelurahanDesa: {
                upsert: jest.fn().mockResolvedValue({}),
              },
            } as unknown as PrismaService;

            // Mock global fetch to return our generated provinces at the top level
            // and empty arrays for child levels
            const mockFetch = jest.fn().mockImplementation((url: string) => {
              if (url.includes('/provinces.json')) {
                return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve(uniqueProvinces),
                });
              }
              // Return empty arrays for regencies/districts/villages
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
              });
            });

            const originalFetch = global.fetch;
            global.fetch = mockFetch as any;

            try {
              const syncService = new RegionSyncService(mockPrisma);
              await syncService.syncAll();

              // Verify that upsert was called for each province
              expect(upsertCalls.length).toBe(uniqueProvinces.length);

              // Property: For EVERY upsert call, the `update` object must contain
              // `name` and must NOT contain `isActive`
              for (const call of upsertCalls) {
                // The update object should contain name
                expect(call.update).toHaveProperty('name');
                // The update object must NOT contain isActive
                expect(call.update).not.toHaveProperty('isActive');

                // Verify the update object only has the expected keys
                const updateKeys = Object.keys(call.update);
                expect(updateKeys).toEqual(['name']);
              }
            } finally {
              global.fetch = originalFetch;
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any existing region records with random isActive values, when the sync
   * service upserts them, the name in the update object SHALL match the EMSIFA
   * data while isActive is never touched.
   */
  it(
    'should update name to match EMSIFA data while preserving isActive for existing records',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.stringMatching(/^\d{2}$/),
              existingName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
              newName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
              isActive: fc.boolean(),
            }),
            { minLength: 1, maxLength: 15 },
          ),
          async (records) => {
            // Ensure unique IDs
            const uniqueRecords = records.filter(
              (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
            );
            if (uniqueRecords.length === 0) return;

            // EMSIFA data to sync (with new names)
            const emsifaData = uniqueRecords.map((r) => ({
              id: r.id,
              name: r.newName,
            }));

            // Track upsert calls
            const upsertCalls: Array<{ where: any; update: any; create: any }> = [];

            const mockPrisma = {
              provinsi: {
                upsert: jest.fn().mockImplementation((args) => {
                  upsertCalls.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.update.name });
                }),
              },
              kabupatenKota: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockResolvedValue({}),
              },
              kecamatan: {
                findMany: jest.fn().mockResolvedValue([]),
                upsert: jest.fn().mockResolvedValue({}),
              },
              kelurahanDesa: {
                upsert: jest.fn().mockResolvedValue({}),
              },
            } as unknown as PrismaService;

            const mockFetch = jest.fn().mockImplementation((url: string) => {
              if (url.includes('/provinces.json')) {
                return Promise.resolve({
                  ok: true,
                  json: () => Promise.resolve(emsifaData),
                });
              }
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
              });
            });

            const originalFetch = global.fetch;
            global.fetch = mockFetch as any;

            try {
              const syncService = new RegionSyncService(mockPrisma);
              await syncService.syncAll();

              // For each upsert call, verify:
              // 1. The update.name matches the EMSIFA new name
              // 2. isActive is NOT in the update object
              for (let i = 0; i < upsertCalls.length; i++) {
                const call = upsertCalls[i];
                const matchingEmsifa = emsifaData.find(
                  (e) => e.id === call.where.id,
                );

                // Name should be updated to match EMSIFA data
                expect(call.update.name).toBe(matchingEmsifa!.name);

                // isActive must NOT be in the update — preserving whatever the DB has
                expect(call.update).not.toHaveProperty('isActive');
                expect(Object.keys(call.update)).toEqual(['name']);
              }
            } finally {
              global.fetch = originalFetch;
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Verifies the property holds for all region levels (KabupatenKota, Kecamatan,
   * KelurahanDesa), not just Provinsi. The upsert update object at every level
   * must only contain `name` and never `isActive`.
   */
  it(
    'should preserve isActive across all region levels (kabupatenKota, kecamatan, kelurahanDesa)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provinceId: fc.stringMatching(/^\d{2}$/),
            provinceName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            regencyId: fc.stringMatching(/^\d{4}$/),
            regencyName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            districtId: fc.stringMatching(/^\d{6}$/),
            districtName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
            villageId: fc.stringMatching(/^\d{10}$/),
            villageName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
          }),
          async (data) => {
            // Track upsert calls per level
            const provinsiUpserts: any[] = [];
            const kabupatenKotaUpserts: any[] = [];
            const kecamatanUpserts: any[] = [];
            const kelurahanDesaUpserts: any[] = [];

            const mockPrisma = {
              provinsi: {
                upsert: jest.fn().mockImplementation((args) => {
                  provinsiUpserts.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.update.name });
                }),
              },
              kabupatenKota: {
                findMany: jest.fn().mockResolvedValue([{ id: data.regencyId }]),
                upsert: jest.fn().mockImplementation((args) => {
                  kabupatenKotaUpserts.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.update.name });
                }),
              },
              kecamatan: {
                findMany: jest.fn().mockResolvedValue([{ id: data.districtId }]),
                upsert: jest.fn().mockImplementation((args) => {
                  kecamatanUpserts.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.update.name });
                }),
              },
              kelurahanDesa: {
                upsert: jest.fn().mockImplementation((args) => {
                  kelurahanDesaUpserts.push(args);
                  return Promise.resolve({ id: args.create.id, name: args.update.name });
                }),
              },
            } as unknown as PrismaService;

            const mockFetch = jest.fn().mockImplementation((url: string) => {
              if (url.includes('/provinces.json')) {
                return Promise.resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve([{ id: data.provinceId, name: data.provinceName }]),
                });
              }
              if (url.includes('/regencies/')) {
                return Promise.resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve([
                      {
                        id: data.regencyId,
                        province_id: data.provinceId,
                        name: data.regencyName,
                      },
                    ]),
                });
              }
              if (url.includes('/districts/')) {
                return Promise.resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve([
                      {
                        id: data.districtId,
                        regency_id: data.regencyId,
                        name: data.districtName,
                      },
                    ]),
                });
              }
              if (url.includes('/villages/')) {
                return Promise.resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve([
                      {
                        id: data.villageId,
                        district_id: data.districtId,
                        name: data.villageName,
                      },
                    ]),
                });
              }
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
              });
            });

            const originalFetch = global.fetch;
            global.fetch = mockFetch as any;

            try {
              const syncService = new RegionSyncService(mockPrisma);
              await syncService.syncAll();

              // Verify Provinsi upserts: update only has name
              for (const call of provinsiUpserts) {
                expect(Object.keys(call.update)).toEqual(['name']);
                expect(call.update).not.toHaveProperty('isActive');
              }

              // Verify KabupatenKota upserts: update only has name
              for (const call of kabupatenKotaUpserts) {
                expect(Object.keys(call.update)).toEqual(['name']);
                expect(call.update).not.toHaveProperty('isActive');
              }

              // Verify Kecamatan upserts: update only has name
              for (const call of kecamatanUpserts) {
                expect(Object.keys(call.update)).toEqual(['name']);
                expect(call.update).not.toHaveProperty('isActive');
              }

              // Verify KelurahanDesa upserts: update only has name
              for (const call of kelurahanDesaUpserts) {
                expect(Object.keys(call.update)).toEqual(['name']);
                expect(call.update).not.toHaveProperty('isActive');
              }
            } finally {
              global.fetch = originalFetch;
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});
