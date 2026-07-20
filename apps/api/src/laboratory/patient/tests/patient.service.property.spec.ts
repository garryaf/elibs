// Feature: patient-mrn-identifier, Property 3: NIK validation

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PatientService } from '../patient.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MrnGeneratorService } from '../mrn-generator.service';
import { RegionValidationService } from '../../region/region-validation.service';
import { AuditService } from '../../audit/audit.service';
import { InsuranceConsolidationService } from '../../../insurance/insurance-consolidation.service';
import { CreatePatientDto } from '../dto/create-patient.dto';

/**
 * **Validates: Requirements 3.4**
 */
describe('PatientService Property Tests', () => {
  let service: PatientService;
  let prismaService: PrismaService;
  let mrnGeneratorService: MrnGeneratorService;

  beforeEach(async () => {
    const mockPrismaService = {
      patient: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'test-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })),
      },
    };

    const mockMrnGeneratorService = {
      generate: jest.fn().mockResolvedValue('RM-202507-0001'),
    };

    const mockRegionValidationService = {
      validateHierarchy: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MrnGeneratorService, useValue: mockMrnGeneratorService },
        { provide: RegionValidationService, useValue: mockRegionValidationService },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: InsuranceConsolidationService, useValue: { resolvePatientInsuranceId: jest.fn().mockResolvedValue(null), getActiveInsurances: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    prismaService = module.get<PrismaService>(PrismaService);
    mrnGeneratorService = module.get<MrnGeneratorService>(MrnGeneratorService);
  });

  /**
   * Property 3: NIK Validation
   *
   * *For any* string input, the NIK validation SHALL accept the input if and only if
   * it consists of exactly 16 characters and every character is a numeric digit (0-9).
   *
   * **Validates: Requirements 3.4**
   */
  describe('Property 3: NIK Validation', () => {
    const createDto = (nik: string): CreatePatientDto => {
      const dto = new CreatePatientDto();
      dto.nik = nik;
      dto.name = 'Test Patient';
      dto.dateOfBirth = '1990-01-01';
      dto.gender = 'MALE' as any;
      return dto;
    };

    it('should accept any string of exactly 16 numeric digits', async () => {
      // Generate valid NIKs: exactly 16 digits using stringMatching
      const validNikArb = fc.stringMatching(/^\d{16}$/);

      await fc.assert(
        fc.asyncProperty(validNikArb, async (nik) => {
          const dto = createDto(nik);

          // Should NOT throw BadRequestException for valid NIK format
          // It should proceed past NIK validation (may throw other errors but not NIK format error)
          try {
            await service.register(dto);
            // If it succeeds, NIK validation passed
          } catch (error) {
            // If an error is thrown, it should NOT be the NIK format error
            if (error instanceof BadRequestException) {
              const response = error.getResponse() as any;
              expect(response.message).not.toBe('NIK must be exactly 16 digits');
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should reject any string that is not exactly 16 numeric digits', async () => {
      // Generate invalid NIKs: arbitrary strings that are NOT exactly 16 digits
      const invalidNikArb = fc.string().filter((s) => !/^\d{16}$/.test(s));

      await fc.assert(
        fc.asyncProperty(invalidNikArb, async (nik) => {
          const dto = createDto(nik);

          // Should throw BadRequestException with NIK format error message
          await expect(service.register(dto)).rejects.toThrow(BadRequestException);

          try {
            await service.register(dto);
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as any;
            expect(response.message).toBe('NIK must be exactly 16 digits');
            expect(response.errorCode).toBe('ERR_VALIDATION');
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should reject digit strings with length != 16', async () => {
      // Generate digit-only strings with wrong length (not 16)
      const wrongLengthDigitsArb = fc.oneof(
        fc.stringMatching(/^\d{0,15}$/),
        fc.stringMatching(/^\d{17,30}$/),
      );

      await fc.assert(
        fc.asyncProperty(wrongLengthDigitsArb, async (nik) => {
          const dto = createDto(nik);

          await expect(service.register(dto)).rejects.toThrow(BadRequestException);

          try {
            await service.register(dto);
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as any;
            expect(response.message).toBe('NIK must be exactly 16 digits');
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: NIK Deduplication
   *
   * *For any* valid NIK and any patient database state, if a non-deleted patient with
   * that NIK already exists, then a registration attempt with the same NIK SHALL be
   * rejected with error code `ERR_VALIDATION`; if no non-deleted patient with that NIK
   * exists, the registration SHALL proceed.
   *
   * **Validates: Requirements 3.2, 3.3**
   */
  describe('Property 4: NIK Deduplication', () => {
    const validNikArb = fc.stringMatching(/^\d{16}$/);

    const createDto = (nik: string): CreatePatientDto => {
      const dto = new CreatePatientDto();
      dto.nik = nik;
      dto.name = 'Test Patient';
      dto.dateOfBirth = '1990-01-01';
      dto.gender = 'MALE' as any;
      return dto;
    };

    it('should reject registration when a non-deleted patient with the same NIK already exists', async () => {
      await fc.assert(
        fc.asyncProperty(validNikArb, async (nik) => {
          // Mock findFirst to return an existing patient (duplicate found)
          (prismaService.patient.findFirst as jest.Mock).mockResolvedValue({
            id: 'existing-patient-id',
            nik,
            name: 'Existing Patient',
            deletedAt: null,
          });

          const dto = createDto(nik);

          await expect(service.register(dto)).rejects.toThrow(BadRequestException);

          try {
            await service.register(dto);
          } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            const response = (error as BadRequestException).getResponse() as any;
            expect(response.errorCode).toBe('ERR_VALIDATION');
            expect(response.message).toBe('NIK already registered');
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should proceed to MRN generation when no non-deleted patient with the same NIK exists', async () => {
      await fc.assert(
        fc.asyncProperty(validNikArb, async (nik) => {
          // Mock findFirst to return null (no duplicate)
          (prismaService.patient.findFirst as jest.Mock).mockResolvedValue(null);

          // Mock create to return a patient object
          (prismaService.patient.create as jest.Mock).mockResolvedValue({
            id: 'new-patient-id',
            mrn: 'RM-202507-0001',
            nik,
            name: 'Test Patient',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'MALE',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          });

          const dto = createDto(nik);

          // Should not throw - registration proceeds
          const result = await service.register(dto);

          // Verify MRN generator was called (flow proceeded past deduplication)
          expect(mrnGeneratorService.generate).toHaveBeenCalled();
          // Verify the result contains the generated MRN
          expect(result.mrn).toBe('RM-202507-0001');
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly branch based on database state for any valid NIK', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNikArb,
          fc.boolean(),
          async (nik, existsInDb) => {
            if (existsInDb) {
              // Simulate existing patient found
              (prismaService.patient.findFirst as jest.Mock).mockResolvedValue({
                id: 'existing-id',
                nik,
                name: 'Existing',
                deletedAt: null,
              });
            } else {
              // Simulate no existing patient
              (prismaService.patient.findFirst as jest.Mock).mockResolvedValue(null);
              (prismaService.patient.create as jest.Mock).mockResolvedValue({
                id: 'new-id',
                mrn: 'RM-202507-0001',
                nik,
                name: 'Test Patient',
                dateOfBirth: new Date('1990-01-01'),
                gender: 'MALE',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
              });
            }

            const dto = createDto(nik);

            if (existsInDb) {
              // Should reject with ERR_VALIDATION
              await expect(service.register(dto)).rejects.toThrow(BadRequestException);
              try {
                await service.register(dto);
              } catch (error) {
                const response = (error as BadRequestException).getResponse() as any;
                expect(response.errorCode).toBe('ERR_VALIDATION');
                expect(response.message).toBe('NIK already registered');
              }
            } else {
              // Should proceed to MRN generation and succeed
              const result = await service.register(dto);
              expect(result.mrn).toBe('RM-202507-0001');
              expect(mrnGeneratorService.generate).toHaveBeenCalled();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Search Correctness
   *
   * *For any* patient in the database and any search query string, if the query is a
   * case-insensitive substring of name, MRN, or email, or a substring of phone,
   * or (if digits-only) a prefix of the NIK, then that patient SHALL appear in the search results.
   *
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
   */
  describe('Property 5: Search Correctness', () => {
    // Arbitrary for generating a patient record
    const patientRecordArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
      mrn: fc.stringMatching(/^RM-\d{6}-\d{4}$/),
      nik: fc.stringMatching(/^\d{16}$/),
      dateOfBirth: fc.constant(new Date('1990-01-01')),
      gender: fc.constantFrom('MALE', 'FEMALE'),
      phone: fc.stringMatching(/^08\d{8,11}$/),
      address: fc.constant(null),
      email: fc.string({ minLength: 5, maxLength: 30 }).map((s) => `${s}@example.com`),
      province: fc.constant(null),
      city: fc.constant(null),
      district: fc.constant(null),
      village: fc.constant(null),
      postalCode: fc.constant(null),
      provinsiId: fc.constant(null),
      kabupatenKotaId: fc.constant(null),
      kecamatanId: fc.constant(null),
      kelurahanDesaId: fc.constant(null),
      bloodType: fc.constant(null),
      emergencyContact: fc.constant(null),
      emergencyPhone: fc.constant(null),
      insuranceId: fc.constant(null),
      consentDigitalNotification: fc.constant(false),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
      deletedAt: fc.constant(null),
    });

    it('should construct correct where clause with enhanced search fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          patientRecordArb,
          fc.constantFrom('name', 'mrn', 'phone', 'email') as fc.Arbitrary<'name' | 'mrn' | 'phone' | 'email'>,
          async (patient, field) => {
            const fieldValue = patient[field] as string;
            if (!fieldValue || fieldValue.length === 0) return;

            // Pick a substring of the field value as search query
            const startIdx = Math.floor(Math.random() * fieldValue.length);
            const endIdx = startIdx + 1 + Math.floor(Math.random() * (fieldValue.length - startIdx));
            const searchQuery = fieldValue.slice(startIdx, endIdx);

            // Skip empty queries
            if (searchQuery.length === 0) return;

            // The patient record with region refs
            const patientWithRefs = {
              ...patient,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            };

            // Mock findMany to return the patient
            (prismaService.patient as any).findMany = jest.fn().mockResolvedValue([patientWithRefs]);
            (prismaService.patient as any).count = jest.fn().mockResolvedValue(1);

            await service.findAll({ search: searchQuery });

            // Verify the service constructs the correct where clause
            const expectedConditions: any[] = [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { mrn: { contains: searchQuery, mode: 'insensitive' } },
              { phone: { contains: searchQuery } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
            ];

            // NIK condition only added for digit-only queries
            if (/^\d+$/.test(searchQuery)) {
              expectedConditions.push({ nik: { startsWith: searchQuery } });
            }

            expect((prismaService.patient as any).findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  deletedAt: null,
                  OR: expectedConditions,
                }),
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should include NIK prefix condition only when search query is all digits', async () => {
      await fc.assert(
        fc.asyncProperty(
          patientRecordArb,
          async (patient) => {
            // Use a prefix of the NIK as search query (digits only)
            const prefixLen = 1 + Math.floor(Math.random() * patient.nik.length);
            const searchQuery = patient.nik.slice(0, prefixLen);

            const patientWithRefs = {
              ...patient,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            };

            (prismaService.patient as any).findMany = jest.fn().mockResolvedValue([patientWithRefs]);
            (prismaService.patient as any).count = jest.fn().mockResolvedValue(1);

            await service.findAll({ search: searchQuery });

            // Since NIK is all digits, query is all digits, NIK condition should be present
            const expectedConditions = [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { mrn: { contains: searchQuery, mode: 'insensitive' } },
              { phone: { contains: searchQuery } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { nik: { startsWith: searchQuery } },
            ];

            expect((prismaService.patient as any).findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  deletedAt: null,
                  OR: expectedConditions,
                }),
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should NOT include NIK condition when search query contains non-digit characters', async () => {
      // Generate a search query that contains at least one non-digit character
      const nonDigitQueryArb = fc.string({ minLength: 1, maxLength: 20 })
        .filter((s) => s.length > 0 && !/^\d+$/.test(s));

      await fc.assert(
        fc.asyncProperty(
          nonDigitQueryArb,
          async (searchQuery) => {
            (prismaService.patient as any).findMany = jest.fn().mockResolvedValue([]);
            (prismaService.patient as any).count = jest.fn().mockResolvedValue(0);

            await service.findAll({ search: searchQuery });

            // NIK condition should NOT be present for non-digit queries
            const expectedConditions = [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { mrn: { contains: searchQuery, mode: 'insensitive' } },
              { phone: { contains: searchQuery } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
            ];

            expect((prismaService.patient as any).findMany).toHaveBeenCalledWith(
              expect.objectContaining({
                where: expect.objectContaining({
                  deletedAt: null,
                  OR: expectedConditions,
                }),
              }),
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Registration Response Completeness
   *
   * *For any* valid CreatePatientDto, upon successful registration the response SHALL contain
   * all input fields with their submitted values, plus a server-generated MRN field matching
   * the `RM-YYYYMM-XXXX` format that was not present in the input.
   *
   * **Validates: Requirements 6.2, 6.3**
   */
  describe('Property 6: Registration Response Completeness', () => {
    const MRN_PATTERN = /^RM-\d{6}-\d{4}$/;

    // Arbitrary for valid 16-digit NIK
    const validNikArb = fc.stringMatching(/^\d{16}$/);

    // Arbitrary for patient name (non-empty string)
    const nameArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

    // Arbitrary for date of birth in ISO date format (YYYY-MM-DD)
    const dateOfBirthArb = fc
      .tuple(
        fc.integer({ min: 1950, max: 2024 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
      )
      .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    // Arbitrary for gender enum
    const genderArb = fc.constantFrom('MALE' as const, 'FEMALE' as const);

    // Arbitrary for a valid MRN string that the generator would return
    const mrnArb = fc
      .tuple(
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 9999 }),
      )
      .map(([year, month, seq]) => {
        const mm = String(month).padStart(2, '0');
        const xxxx = String(seq).padStart(4, '0');
        return `RM-${year}${mm}-${xxxx}`;
      });

    it('should return response with all input fields plus server-generated MRN', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNikArb,
          nameArb,
          dateOfBirthArb,
          genderArb,
          mrnArb,
          async (nik, name, dateOfBirth, gender, generatedMrn) => {
            // Build a valid CreatePatientDto
            const dto = new CreatePatientDto();
            dto.nik = nik;
            dto.name = name;
            dto.dateOfBirth = dateOfBirth;
            dto.gender = gender;

            // Assert that the input DTO does NOT have an mrn field
            expect((dto as any).mrn).toBeUndefined();
            expect(Object.prototype.hasOwnProperty.call(dto, 'mrn')).toBe(false);

            // Mock MRN generator to return the arbitrary MRN
            (mrnGeneratorService.generate as jest.Mock).mockResolvedValue(generatedMrn);

            // Mock PrismaService findFirst to return null (no duplicate)
            (prismaService.patient.findFirst as jest.Mock).mockResolvedValue(null);

            // Mock PrismaService patient.create to return data with MRN added
            (prismaService.patient.create as jest.Mock).mockResolvedValue({
              id: 'generated-id',
              mrn: generatedMrn,
              nik: dto.nik,
              name: dto.name,
              dateOfBirth: new Date(dto.dateOfBirth),
              gender: dto.gender,
              phone: null,
              address: null,
              email: null,
              province: null,
              city: null,
              district: null,
              village: null,
              postalCode: null,
              provinsiId: null,
              kabupatenKotaId: null,
              kecamatanId: null,
              kelurahanDesaId: null,
              bloodType: null,
              emergencyContact: null,
              emergencyPhone: null,
              insuranceId: null,
              consentDigitalNotification: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            });

            const result = await service.register(dto);

            // Assert response contains server-generated MRN matching the pattern
            expect(result.mrn).toBe(generatedMrn);
            expect(result.mrn).toMatch(MRN_PATTERN);

            // Assert response contains all submitted input field values
            expect(result.nik).toBe(dto.nik);
            expect(result.name).toBe(dto.name);
            expect(result.gender).toBe(dto.gender);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should ensure input DTO never contains mrn field', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNikArb,
          nameArb,
          dateOfBirthArb,
          genderArb,
          async (nik, name, dateOfBirth, gender) => {
            const dto = new CreatePatientDto();
            dto.nik = nik;
            dto.name = name;
            dto.dateOfBirth = dateOfBirth;
            dto.gender = gender;

            // The CreatePatientDto should never have an mrn property
            expect(Object.prototype.hasOwnProperty.call(dto, 'mrn')).toBe(false);
            expect('mrn' in dto).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
