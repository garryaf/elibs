// Feature: master-wilayah-indonesia, Property 8: Patient Region Storage Round-Trip
import * as fc from 'fast-check';
import { PatientService } from './patient.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegionValidationService } from '../region/region-validation.service';
import { MrnGeneratorService } from './mrn-generator.service';

/**
 * Property 8: Patient Region Storage Round-Trip
 *
 * For any patient created with a valid set of region IDs (provinsiId,
 * kabupatenKotaId, kecamatanId, kelurahanDesaId), retrieving that patient
 * SHALL return the same IDs and the corresponding region names that match
 * the stored region records.
 *
 * **Validates: Requirements 5.3, 5.4**
 */

// Generators
const provinsiIdArb = fc.stringMatching(/^\d{2}$/);
const kabupatenKotaIdArb = fc.stringMatching(/^\d{4}$/);
const kecamatanIdArb = fc.stringMatching(/^\d{6}$/);
const kelurahanDesaIdArb = fc.stringMatching(/^\d{10}$/);
const regionNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);
const nikArb = fc.stringMatching(/^\d{16}$/);
const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

interface RegionHierarchy {
  provinsiId: string;
  provinsiName: string;
  kabupatenKotaId: string;
  kabupatenKotaName: string;
  kecamatanId: string;
  kecamatanName: string;
  kelurahanDesaId: string;
  kelurahanDesaName: string;
}

const regionHierarchyArb = fc.record({
  provinsiId: provinsiIdArb,
  provinsiName: regionNameArb,
  kabupatenKotaId: kabupatenKotaIdArb,
  kabupatenKotaName: regionNameArb,
  kecamatanId: kecamatanIdArb,
  kecamatanName: regionNameArb,
  kelurahanDesaId: kelurahanDesaIdArb,
  kelurahanDesaName: regionNameArb,
});

const patientInputArb = fc.record({
  nik: nikArb,
  name: nameArb,
  dateOfBirth: fc.constant('1990-01-15'),
  gender: fc.constantFrom('MALE' as const, 'FEMALE' as const),
});

/**
 * Creates a mock PrismaService that simulates patient creation with region
 * includes and patient retrieval. The mock stores the created patient and
 * returns it with the resolved region references.
 */
function createMockPrisma(hierarchy: RegionHierarchy) {
  const regionInclude = {
    provinsiRef: { id: hierarchy.provinsiId, name: hierarchy.provinsiName },
    kabupatenKotaRef: { id: hierarchy.kabupatenKotaId, name: hierarchy.kabupatenKotaName },
    kecamatanRef: { id: hierarchy.kecamatanId, name: hierarchy.kecamatanName },
    kelurahanDesaRef: { id: hierarchy.kelurahanDesaId, name: hierarchy.kelurahanDesaName },
  };

  let storedPatient: any = null;

  const mockPrisma = {
    patient: {
      findFirst: jest.fn().mockImplementation(({ where, include }) => {
        // For NIK uniqueness check (no include) or findById
        if (!include) {
          return Promise.resolve(null);
        }
        // For findById with region includes
        if (storedPatient && where?.id === storedPatient.id) {
          return Promise.resolve(storedPatient);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data, include }) => {
        storedPatient = {
          id: 'generated-uuid',
          mrn: 'RM-202601-0001',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          ...regionInclude,
        };
        return Promise.resolve(storedPatient);
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;

  return mockPrisma;
}

/**
 * Creates a mock RegionValidationService that always validates successfully
 * (the hierarchy is assumed to be valid for this property test).
 */
function createMockRegionValidationService() {
  return {
    validateHierarchy: jest.fn().mockResolvedValue(true),
  } as unknown as RegionValidationService;
}

/**
 * Creates a mock MrnGeneratorService that returns a generated MRN.
 */
function createMockMrnGenerator() {
  return {
    generate: jest.fn().mockResolvedValue('RM-202601-0001'),
  } as unknown as MrnGeneratorService;
}

describe('Property 8: Patient Region Storage Round-Trip', () => {
  /**
   * For any patient created with valid region IDs, the response SHALL contain
   * the same region IDs that were submitted.
   */
  it(
    'should return the same region IDs that were stored during patient creation',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          patientInputArb,
          regionHierarchyArb,
          async (patientInput, hierarchy) => {
            const mockPrisma = createMockPrisma(hierarchy);
            const mockRegionValidation = createMockRegionValidationService();
            const mockMrnGenerator = createMockMrnGenerator();

            const service = new PatientService(
              mockPrisma,
              mockMrnGenerator,
              mockRegionValidation,
            );

            const result = await service.register({
              ...patientInput,
              provinsiId: hierarchy.provinsiId,
              kabupatenKotaId: hierarchy.kabupatenKotaId,
              kecamatanId: hierarchy.kecamatanId,
              kelurahanDesaId: hierarchy.kelurahanDesaId,
            });

            // Property: returned region IDs must match submitted region IDs
            expect(result.provinsiId).toBe(hierarchy.provinsiId);
            expect(result.kabupatenKotaId).toBe(hierarchy.kabupatenKotaId);
            expect(result.kecamatanId).toBe(hierarchy.kecamatanId);
            expect(result.kelurahanDesaId).toBe(hierarchy.kelurahanDesaId);
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any patient created with valid region IDs, the response SHALL include
   * region name objects (provinsi, kabupatenKota, kecamatan, kelurahanDesa)
   * that match the stored region records.
   */
  it(
    'should return region name objects matching the stored region records',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          patientInputArb,
          regionHierarchyArb,
          async (patientInput, hierarchy) => {
            const mockPrisma = createMockPrisma(hierarchy);
            const mockRegionValidation = createMockRegionValidationService();
            const mockMrnGenerator = createMockMrnGenerator();

            const service = new PatientService(
              mockPrisma,
              mockMrnGenerator,
              mockRegionValidation,
            );

            const result = await service.register({
              ...patientInput,
              provinsiId: hierarchy.provinsiId,
              kabupatenKotaId: hierarchy.kabupatenKotaId,
              kecamatanId: hierarchy.kecamatanId,
              kelurahanDesaId: hierarchy.kelurahanDesaId,
            });

            // Property: resolved region names must match the region records
            expect(result.provinsi).toEqual({
              id: hierarchy.provinsiId,
              name: hierarchy.provinsiName,
            });
            expect(result.kabupatenKota).toEqual({
              id: hierarchy.kabupatenKotaId,
              name: hierarchy.kabupatenKotaName,
            });
            expect(result.kecamatan).toEqual({
              id: hierarchy.kecamatanId,
              name: hierarchy.kecamatanName,
            });
            expect(result.kelurahanDesa).toEqual({
              id: hierarchy.kelurahanDesaId,
              name: hierarchy.kelurahanDesaName,
            });
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * For any patient created with valid region IDs, the transformRegionResponse
   * function SHALL rename provinsiRef → provinsi, kabupatenKotaRef → kabupatenKota,
   * kecamatanRef → kecamatan, kelurahanDesaRef → kelurahanDesa and not include
   * the original *Ref keys in the response.
   */
  it(
    'should transform region ref fields to clean names without Ref suffix',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          patientInputArb,
          regionHierarchyArb,
          async (patientInput, hierarchy) => {
            const mockPrisma = createMockPrisma(hierarchy);
            const mockRegionValidation = createMockRegionValidationService();
            const mockMrnGenerator = createMockMrnGenerator();

            const service = new PatientService(
              mockPrisma,
              mockMrnGenerator,
              mockRegionValidation,
            );

            const result = await service.register({
              ...patientInput,
              provinsiId: hierarchy.provinsiId,
              kabupatenKotaId: hierarchy.kabupatenKotaId,
              kecamatanId: hierarchy.kecamatanId,
              kelurahanDesaId: hierarchy.kelurahanDesaId,
            });

            // Property: response uses clean field names (without Ref suffix)
            expect(result).toHaveProperty('provinsi');
            expect(result).toHaveProperty('kabupatenKota');
            expect(result).toHaveProperty('kecamatan');
            expect(result).toHaveProperty('kelurahanDesa');

            // Property: response does NOT contain the raw *Ref fields
            expect(result).not.toHaveProperty('provinsiRef');
            expect(result).not.toHaveProperty('kabupatenKotaRef');
            expect(result).not.toHaveProperty('kecamatanRef');
            expect(result).not.toHaveProperty('kelurahanDesaRef');
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );

  /**
   * Validates that the RegionValidationService.validateHierarchy is called
   * when region IDs are provided, ensuring the round-trip involves validation.
   */
  it(
    'should invoke region hierarchy validation before storing region IDs',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          patientInputArb,
          regionHierarchyArb,
          async (patientInput, hierarchy) => {
            const mockPrisma = createMockPrisma(hierarchy);
            const mockRegionValidation = createMockRegionValidationService();
            const mockMrnGenerator = createMockMrnGenerator();

            const service = new PatientService(
              mockPrisma,
              mockMrnGenerator,
              mockRegionValidation,
            );

            await service.register({
              ...patientInput,
              provinsiId: hierarchy.provinsiId,
              kabupatenKotaId: hierarchy.kabupatenKotaId,
              kecamatanId: hierarchy.kecamatanId,
              kelurahanDesaId: hierarchy.kelurahanDesaId,
            });

            // Property: validateHierarchy must be called with the provided region IDs
            expect(mockRegionValidation.validateHierarchy).toHaveBeenCalledWith(
              hierarchy.provinsiId,
              hierarchy.kabupatenKotaId,
              hierarchy.kecamatanId,
              hierarchy.kelurahanDesaId,
            );
          },
        ),
        { numRuns: 100 },
      );
    },
    60000,
  );
});
