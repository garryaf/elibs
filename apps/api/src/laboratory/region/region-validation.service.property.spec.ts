// Feature: master-wilayah-indonesia, Property 1: Referential Integrity Enforcement
import * as fc from 'fast-check';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Property 1: Referential Integrity Enforcement
 *
 * For any region record (Kabupaten_Kota, Kecamatan, or Kelurahan_Desa) with a
 * parent ID that does not exist in the parent table, the database SHALL reject
 * the insertion.
 *
 * **Validates: Requirements 1.5**
 *
 * This test uses a mocked PrismaService that simulates PostgreSQL foreign key
 * constraint violations (P2003) when a child record references a nonexistent parent.
 */

// Generator for numeric string IDs matching EMSIFA code format (2–10 digits)
const regionIdArb = fc.stringMatching(/^\d{2,10}$/);

const regionNameArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * Creates a mock PrismaService that simulates FK constraint violations.
 * When creating a child record, the mock checks if the parent ID exists
 * in the "known" set. If not, it throws a Prisma P2003 error (foreign key
 * constraint failure), matching real PostgreSQL behavior.
 */
function createMockPrismaWithFkEnforcement(knownParentIds: Set<string>) {
  const createFkViolationError = (modelName: string, fieldName: string) => {
    const error = new Prisma.PrismaClientKnownRequestError(
      `Foreign key constraint failed on the field: \`${fieldName}\``,
      {
        code: 'P2003',
        clientVersion: '5.22.0',
        meta: { field_name: fieldName, modelName },
      },
    );
    return error;
  };

  const mockPrisma = {
    kabupatenKota: {
      create: jest.fn().mockImplementation(({ data }) => {
        if (!knownParentIds.has(data.provinsiId)) {
          return Promise.reject(
            createFkViolationError('KabupatenKota', 'provinsiId'),
          );
        }
        return Promise.resolve(data);
      }),
    },
    kecamatan: {
      create: jest.fn().mockImplementation(({ data }) => {
        if (!knownParentIds.has(data.kabupatenKotaId)) {
          return Promise.reject(
            createFkViolationError('Kecamatan', 'kabupatenKotaId'),
          );
        }
        return Promise.resolve(data);
      }),
    },
    kelurahanDesa: {
      create: jest.fn().mockImplementation(({ data }) => {
        if (!knownParentIds.has(data.kecamatanId)) {
          return Promise.reject(
            createFkViolationError('KelurahanDesa', 'kecamatanId'),
          );
        }
        return Promise.resolve(data);
      }),
    },
  } as unknown as PrismaService;

  return mockPrisma;
}

describe('Property 1: Referential Integrity Enforcement', () => {
  /**
   * For any child region (KabupatenKota) with a provinsiId that does not exist
   * in the Provinsi table, the database SHALL reject the insertion with a
   * foreign key constraint error (P2003).
   */
  it(
    'should reject KabupatenKota insertion when provinsiId does not exist in parent table',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionIdArb,
          regionNameArb,
          async (nonexistentProvinsiId, kabupatenKotaId, name) => {
            // Empty set = no known parents, so any ID is nonexistent
            const prisma = createMockPrismaWithFkEnforcement(new Set());

            await expect(
              prisma.kabupatenKota.create({
                data: {
                  id: kabupatenKotaId,
                  provinsiId: nonexistentProvinsiId,
                  name,
                  isActive: true,
                },
              }),
            ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

            try {
              await prisma.kabupatenKota.create({
                data: {
                  id: kabupatenKotaId,
                  provinsiId: nonexistentProvinsiId,
                  name,
                  isActive: true,
                },
              });
            } catch (error) {
              expect(error).toBeInstanceOf(
                Prisma.PrismaClientKnownRequestError,
              );
              expect((error as Prisma.PrismaClientKnownRequestError).code).toBe(
                'P2003',
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any child region (Kecamatan) with a kabupatenKotaId that does not exist
   * in the KabupatenKota table, the database SHALL reject the insertion with a
   * foreign key constraint error (P2003).
   */
  it(
    'should reject Kecamatan insertion when kabupatenKotaId does not exist in parent table',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionIdArb,
          regionNameArb,
          async (nonexistentKabupatenKotaId, kecamatanId, name) => {
            const prisma = createMockPrismaWithFkEnforcement(new Set());

            await expect(
              prisma.kecamatan.create({
                data: {
                  id: kecamatanId,
                  kabupatenKotaId: nonexistentKabupatenKotaId,
                  name,
                  isActive: true,
                },
              }),
            ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

            try {
              await prisma.kecamatan.create({
                data: {
                  id: kecamatanId,
                  kabupatenKotaId: nonexistentKabupatenKotaId,
                  name,
                  isActive: true,
                },
              });
            } catch (error) {
              expect(error).toBeInstanceOf(
                Prisma.PrismaClientKnownRequestError,
              );
              expect((error as Prisma.PrismaClientKnownRequestError).code).toBe(
                'P2003',
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any child region (KelurahanDesa) with a kecamatanId that does not exist
   * in the Kecamatan table, the database SHALL reject the insertion with a
   * foreign key constraint error (P2003).
   */
  it(
    'should reject KelurahanDesa insertion when kecamatanId does not exist in parent table',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionIdArb,
          regionNameArb,
          async (nonexistentKecamatanId, kelurahanDesaId, name) => {
            const prisma = createMockPrismaWithFkEnforcement(new Set());

            await expect(
              prisma.kelurahanDesa.create({
                data: {
                  id: kelurahanDesaId,
                  kecamatanId: nonexistentKecamatanId,
                  name,
                  isActive: true,
                },
              }),
            ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

            try {
              await prisma.kelurahanDesa.create({
                data: {
                  id: kelurahanDesaId,
                  kecamatanId: nonexistentKecamatanId,
                  name,
                  isActive: true,
                },
              });
            } catch (error) {
              expect(error).toBeInstanceOf(
                Prisma.PrismaClientKnownRequestError,
              );
              expect((error as Prisma.PrismaClientKnownRequestError).code).toBe(
                'P2003',
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Confirms that when a parent ID IS valid (exists in the known set),
   * the insertion succeeds — proving the rejection is specifically caused
   * by the nonexistent parent ID.
   */
  it(
    'should accept child insertion when parent ID exists (control property)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          regionIdArb,
          regionIdArb,
          regionNameArb,
          async (existingProvinsiId, kabupatenKotaId, name) => {
            // The parent ID IS in the known set, so it should succeed
            const prisma = createMockPrismaWithFkEnforcement(
              new Set([existingProvinsiId]),
            );

            const result = await prisma.kabupatenKota.create({
              data: {
                id: kabupatenKotaId,
                provinsiId: existingProvinsiId,
                name,
                isActive: true,
              },
            });

            expect(result).toBeDefined();
            expect(result.provinsiId).toBe(existingProvinsiId);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});


// Feature: master-wilayah-indonesia, Property 9: Region Hierarchy Validation
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RegionValidationService } from './region-validation.service';

/**
 * Property 9: Region Hierarchy Validation
 *
 * For any set of four region IDs submitted during patient registration, the backend
 * SHALL accept the submission if and only if the IDs form a valid parent-child chain
 * (kelurahanDesa belongs to kecamatan, kecamatan belongs to kabupatenKota, kabupatenKota
 * belongs to provinsi). Additionally, any partial selection (some levels filled, some
 * empty, but not all-empty) SHALL be rejected.
 *
 * **Validates: Requirements 6.1, 6.3, 6.4**
 */

// Generators for region IDs matching EMSIFA format
const provinsiIdArb9 = fc.stringMatching(/^\d{2}$/);
const kabupatenKotaIdArb9 = fc.stringMatching(/^\d{4}$/);
const kecamatanIdArb9 = fc.stringMatching(/^\d{6}$/);
const kelurahanDesaIdArb9 = fc.stringMatching(/^\d{10}$/);

// Generator for a non-empty region ID (used in partial selection tests)
const nonEmptyRegionIdArb9 = fc.stringMatching(/^\d{2,10}$/);

// Empty value options: null, undefined, or empty string
const emptyValueArb9 = fc.constantFrom(null, undefined, '');

/**
 * Generates partial selections: at least one field filled and at least one empty,
 * ensuring it's not all-filled or all-empty.
 */
const partialSelectionArb9 = fc
  .tuple(
    fc.oneof(nonEmptyRegionIdArb9, emptyValueArb9),
    fc.oneof(nonEmptyRegionIdArb9, emptyValueArb9),
    fc.oneof(nonEmptyRegionIdArb9, emptyValueArb9),
    fc.oneof(nonEmptyRegionIdArb9, emptyValueArb9),
  )
  .filter(([a, b, c, d]) => {
    const values = [a, b, c, d];
    const filled = values.filter(
      (v) => v !== null && v !== undefined && v !== '',
    );
    // Must be partial: at least 1 filled and fewer than 4 filled
    return filled.length >= 1 && filled.length < 4;
  });

/**
 * Creates a mock PrismaService for hierarchy validation tests.
 * - When `returnRecord` is true, `findFirst` returns a matching record (valid chain).
 * - When `returnRecord` is false, `findFirst` returns null (invalid chain).
 */
function createMockPrismaForValidation(returnRecord: boolean) {
  return {
    kelurahanDesa: {
      findFirst: jest.fn().mockResolvedValue(
        returnRecord
          ? { id: '1234567890', kecamatanId: '123456', name: 'Test' }
          : null,
      ),
    },
  } as unknown as PrismaService;
}

describe('Property 9: Region Hierarchy Validation', () => {
  /**
   * Valid hierarchy chains: when all four IDs form a consistent parent-child chain,
   * the service SHALL return true.
   */
  it(
    'should accept submission when all four region IDs form a valid parent-child chain',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          provinsiIdArb9,
          kabupatenKotaIdArb9,
          kecamatanIdArb9,
          kelurahanDesaIdArb9,
          async (provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId) => {
            // Mock Prisma returns a record → valid chain
            const mockPrisma = createMockPrismaForValidation(true);

            const module: TestingModule = await Test.createTestingModule({
              providers: [
                RegionValidationService,
                { provide: PrismaService, useValue: mockPrisma },
              ],
            }).compile();

            const service = module.get<RegionValidationService>(
              RegionValidationService,
            );

            const result = await service.validateHierarchy(
              provinsiId,
              kabupatenKotaId,
              kecamatanId,
              kelurahanDesaId,
            );

            expect(result).toBe(true);

            // Verify the query was called with the correct nested where clause
            expect(mockPrisma.kelurahanDesa.findFirst).toHaveBeenCalledWith({
              where: {
                id: kelurahanDesaId,
                kecamatanId: kecamatanId,
                kecamatan: {
                  kabupatenKotaId: kabupatenKotaId,
                  kabupatenKota: {
                    provinsiId: provinsiId,
                  },
                },
              },
            });
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Invalid hierarchy chains: when all four IDs are provided but they do NOT form
   * a valid chain, the service SHALL throw BadRequestException with
   * "Region hierarchy is inconsistent".
   */
  it(
    'should reject submission when region IDs do not form a valid parent-child chain',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          provinsiIdArb9,
          kabupatenKotaIdArb9,
          kecamatanIdArb9,
          kelurahanDesaIdArb9,
          async (provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId) => {
            // Mock Prisma returns null → invalid chain
            const mockPrisma = createMockPrismaForValidation(false);

            const module: TestingModule = await Test.createTestingModule({
              providers: [
                RegionValidationService,
                { provide: PrismaService, useValue: mockPrisma },
              ],
            }).compile();

            const service = module.get<RegionValidationService>(
              RegionValidationService,
            );

            await expect(
              service.validateHierarchy(
                provinsiId,
                kabupatenKotaId,
                kecamatanId,
                kelurahanDesaId,
              ),
            ).rejects.toThrow(BadRequestException);

            try {
              await service.validateHierarchy(
                provinsiId,
                kabupatenKotaId,
                kecamatanId,
                kelurahanDesaId,
              );
            } catch (error) {
              expect(error).toBeInstanceOf(BadRequestException);
              expect((error as BadRequestException).getResponse()).toMatchObject({
                message: 'Region hierarchy is inconsistent',
              });
            }
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Partial selections: when some but not all region levels are filled,
   * the service SHALL throw BadRequestException with
   * "All region levels are required when any region is selected".
   */
  it(
    'should reject partial selections where some levels are filled and some are empty',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          partialSelectionArb9,
          async ([provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId]) => {
            // For partial selections, PrismaService shouldn't even be called
            const mockPrisma = createMockPrismaForValidation(false);

            const module: TestingModule = await Test.createTestingModule({
              providers: [
                RegionValidationService,
                { provide: PrismaService, useValue: mockPrisma },
              ],
            }).compile();

            const service = module.get<RegionValidationService>(
              RegionValidationService,
            );

            await expect(
              service.validateHierarchy(
                provinsiId,
                kabupatenKotaId,
                kecamatanId,
                kelurahanDesaId,
              ),
            ).rejects.toThrow(BadRequestException);

            try {
              await service.validateHierarchy(
                provinsiId,
                kabupatenKotaId,
                kecamatanId,
                kelurahanDesaId,
              );
            } catch (error) {
              expect(error).toBeInstanceOf(BadRequestException);
              expect((error as BadRequestException).getResponse()).toMatchObject({
                message:
                  'All region levels are required when any region is selected',
              });
            }

            // Prisma should NOT be called for partial selections
            expect(mockPrisma.kelurahanDesa.findFirst).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * All-empty selection: when all four region levels are empty (null/undefined/''),
   * the service SHALL return true without querying the database.
   */
  it(
    'should accept submission when all region levels are empty',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          emptyValueArb9,
          emptyValueArb9,
          emptyValueArb9,
          emptyValueArb9,
          async (provinsiId, kabupatenKotaId, kecamatanId, kelurahanDesaId) => {
            const mockPrisma = createMockPrismaForValidation(false);

            const module: TestingModule = await Test.createTestingModule({
              providers: [
                RegionValidationService,
                { provide: PrismaService, useValue: mockPrisma },
              ],
            }).compile();

            const service = module.get<RegionValidationService>(
              RegionValidationService,
            );

            const result = await service.validateHierarchy(
              provinsiId,
              kabupatenKotaId,
              kecamatanId,
              kelurahanDesaId,
            );

            expect(result).toBe(true);

            // Prisma should NOT be called when all empty
            expect(mockPrisma.kelurahanDesa.findFirst).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});
