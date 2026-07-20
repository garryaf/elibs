// Feature: insurance-source-consolidation, Properties 1, 2

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { PatientService } from '../laboratory/patient/patient.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { MrnGeneratorService } from '../laboratory/patient/mrn-generator.service';
import { RegionValidationService } from '../laboratory/region/region-validation.service';
import { AuditService } from '../laboratory/audit/audit.service';
import { InsuranceConsolidationService } from './insurance-consolidation.service';
import { CreatePatientDto } from '../laboratory/patient/dto/create-patient.dto';
import { UpdatePatientDto } from '../laboratory/patient/dto/update-patient.dto';

/**
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * Property 1: Patient registration creates junction record, not legacy FK
 * Property 2: Patient update modifies junction, not legacy FK
 */
describe('PatientService Insurance Property Tests', () => {
  let service: PatientService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      patient: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      patientInsurance: {
        create: jest.fn().mockResolvedValue({ id: 'pi-id' }),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: 'pi-id' }),
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
  });

  // --- Arbitraries ---

  const uuidArb = fc.uuid().map((v) => v.toString());

  const validNikArb = fc.stringMatching(/^\d{16}$/);

  const dateOfBirthArb = fc
    .tuple(
      fc.integer({ min: 1950, max: 2024 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    )
    .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  const genderArb = fc.constantFrom('MALE' as const, 'FEMALE' as const);

  const memberNumberArb = fc.option(
    fc.string({ minLength: 5, maxLength: 20 }).filter((s) => s.trim().length > 0),
    { nil: undefined },
  );

  // --- Property 1: Patient registration creates junction record, not legacy FK ---

  describe('Property 1: Patient registration creates junction record, not legacy FK', () => {
    /**
     * For any patient registration DTO with insuranceId, after registration:
     * - A PatientInsurance junction record is created with priority=1
     * - The patient.create data does NOT include insuranceId
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('register() creates PatientInsurance junction with priority=1 and does not set Patient.insuranceId', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNikArb,
          uuidArb,
          memberNumberArb,
          genderArb,
          dateOfBirthArb,
          async (nik, insuranceId, memberNumber, gender, dateOfBirth) => {
            // Reset mocks
            jest.clearAllMocks();

            const patientId = 'new-patient-id';

            // Mock patient.create to capture the data argument
            (prismaService.patient.create as jest.Mock).mockResolvedValue({
              id: patientId,
              mrn: 'RM-202507-0001',
              nik,
              name: 'Test Patient',
              dateOfBirth: new Date(dateOfBirth),
              gender,
              insuranceId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            });

            // Mock patientInsurance.create
            (prismaService.patientInsurance.create as jest.Mock).mockResolvedValue({
              id: 'junction-id',
              patientId,
              insuranceId,
              priority: 1,
              isActive: true,
              memberNumber: memberNumber ?? null,
            });

            // Build DTO with insuranceId
            const dto = new CreatePatientDto();
            dto.nik = nik;
            dto.name = 'Test Patient';
            dto.dateOfBirth = dateOfBirth;
            dto.gender = gender;
            dto.insuranceId = insuranceId;
            if (memberNumber !== undefined) {
              dto.memberNumber = memberNumber;
            }

            await service.register(dto);

            // ASSERTION 1: patient.create data should NOT include insuranceId
            const createCall = (prismaService.patient.create as jest.Mock).mock.calls[0][0];
            const createData = createCall.data;
            expect(createData).not.toHaveProperty('insuranceId');

            // ASSERTION 2: PatientInsurance junction should be created
            expect(prismaService.patientInsurance.create).toHaveBeenCalledTimes(1);

            // ASSERTION 3: Junction record has correct values
            const junctionCall = (prismaService.patientInsurance.create as jest.Mock).mock.calls[0][0];
            const junctionData = junctionCall.data;
            expect(junctionData.patientId).toBe(patientId);
            expect(junctionData.insuranceId).toBe(insuranceId);
            expect(junctionData.priority).toBe(1);
            expect(junctionData.isActive).toBe(true);
            expect(junctionData.memberNumber).toBe(memberNumber ?? null);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any patient registration DTO WITHOUT insuranceId:
     * - No PatientInsurance junction record is created
     * - patient.create data does NOT include insuranceId
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('register() without insuranceId does not create junction record and does not set Patient.insuranceId', async () => {
      await fc.assert(
        fc.asyncProperty(
          validNikArb,
          genderArb,
          dateOfBirthArb,
          async (nik, gender, dateOfBirth) => {
            jest.clearAllMocks();

            (prismaService.patient.create as jest.Mock).mockResolvedValue({
              id: 'new-patient-id',
              mrn: 'RM-202507-0001',
              nik,
              name: 'Test Patient',
              dateOfBirth: new Date(dateOfBirth),
              gender,
              insuranceId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            });

            // Build DTO without insuranceId
            const dto = new CreatePatientDto();
            dto.nik = nik;
            dto.name = 'Test Patient';
            dto.dateOfBirth = dateOfBirth;
            dto.gender = gender;
            // No insuranceId

            await service.register(dto);

            // ASSERTION 1: patient.create data should NOT include insuranceId
            const createCall = (prismaService.patient.create as jest.Mock).mock.calls[0][0];
            const createData = createCall.data;
            expect(createData).not.toHaveProperty('insuranceId');

            // ASSERTION 2: PatientInsurance junction should NOT be created
            expect(prismaService.patientInsurance.create).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 2: Patient update modifies junction, not legacy FK ---

  describe('Property 2: Patient update modifies junction, not legacy FK', () => {
    /**
     * For any patient update that includes insuranceId:
     * - The patient.update data does NOT include insuranceId
     * - The PatientInsurance junction is upserted (created or updated)
     *
     * **Validates: Requirements 1.3**
     */
    it('update() with insuranceId modifies junction and does not set Patient.insuranceId', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          uuidArb,
          memberNumberArb,
          fc.boolean(),
          async (patientId, newInsuranceId, memberNumber, hasExistingJunction) => {
            jest.clearAllMocks();

            // Mock patient exists
            (prismaService.patient.findFirst as jest.Mock).mockResolvedValue({
              id: patientId,
              nik: '1234567890123456',
              name: 'Existing Patient',
              deletedAt: null,
            });

            // Mock patient.update to capture the data argument
            (prismaService.patient.update as jest.Mock).mockResolvedValue({
              id: patientId,
              mrn: 'RM-202507-0001',
              nik: '1234567890123456',
              name: 'Updated Patient',
              insuranceId: null, // legacy field remains null
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            });

            // Mock existing junction state
            if (hasExistingJunction) {
              (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue({
                id: 'existing-junction-id',
                patientId,
                insuranceId: 'old-insurance-id',
                priority: 1,
                isActive: true,
              });
              (prismaService.patientInsurance.update as jest.Mock).mockResolvedValue({
                id: 'existing-junction-id',
                patientId,
                insuranceId: newInsuranceId,
                priority: 1,
                isActive: true,
              });
            } else {
              (prismaService.patientInsurance.findFirst as jest.Mock).mockResolvedValue(null);
              (prismaService.patientInsurance.create as jest.Mock).mockResolvedValue({
                id: 'new-junction-id',
                patientId,
                insuranceId: newInsuranceId,
                priority: 1,
                isActive: true,
              });
            }

            // Build update DTO with insuranceId
            const dto = new UpdatePatientDto();
            dto.name = 'Updated Patient';
            dto.insuranceId = newInsuranceId;
            if (memberNumber !== undefined) {
              dto.memberNumber = memberNumber;
            }

            await service.update(patientId, dto);

            // ASSERTION 1: patient.update data should NOT include insuranceId
            const updateCall = (prismaService.patient.update as jest.Mock).mock.calls[0][0];
            const updateData = updateCall.data;
            expect(updateData).not.toHaveProperty('insuranceId');

            // ASSERTION 2: Junction is modified (either create or update)
            if (hasExistingJunction) {
              expect(prismaService.patientInsurance.update).toHaveBeenCalledTimes(1);
              const junctionUpdateCall = (prismaService.patientInsurance.update as jest.Mock).mock.calls[0][0];
              expect(junctionUpdateCall.data.insuranceId).toBe(newInsuranceId);
            } else {
              expect(prismaService.patientInsurance.create).toHaveBeenCalledTimes(1);
              const junctionCreateCall = (prismaService.patientInsurance.create as jest.Mock).mock.calls[0][0];
              expect(junctionCreateCall.data.insuranceId).toBe(newInsuranceId);
              expect(junctionCreateCall.data.priority).toBe(1);
              expect(junctionCreateCall.data.isActive).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any patient update WITHOUT insuranceId:
     * - The patient.update data does NOT include insuranceId
     * - No junction modification occurs
     *
     * **Validates: Requirements 1.3**
     */
    it('update() without insuranceId does not touch junction and does not set Patient.insuranceId', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArb,
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          async (patientId, newName) => {
            jest.clearAllMocks();

            // Mock patient exists
            (prismaService.patient.findFirst as jest.Mock).mockResolvedValue({
              id: patientId,
              nik: '1234567890123456',
              name: 'Existing Patient',
              deletedAt: null,
            });

            // Mock patient.update
            (prismaService.patient.update as jest.Mock).mockResolvedValue({
              id: patientId,
              mrn: 'RM-202507-0001',
              nik: '1234567890123456',
              name: newName,
              insuranceId: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
              provinsiRef: null,
              kabupatenKotaRef: null,
              kecamatanRef: null,
              kelurahanDesaRef: null,
            });

            // Build update DTO WITHOUT insuranceId
            const dto = new UpdatePatientDto();
            dto.name = newName;
            // No insuranceId

            await service.update(patientId, dto);

            // ASSERTION 1: patient.update data should NOT include insuranceId
            const updateCall = (prismaService.patient.update as jest.Mock).mock.calls[0][0];
            const updateData = updateCall.data;
            expect(updateData).not.toHaveProperty('insuranceId');

            // ASSERTION 2: Junction should not be touched
            expect(prismaService.patientInsurance.findFirst).not.toHaveBeenCalled();
            expect(prismaService.patientInsurance.create).not.toHaveBeenCalled();
            expect(prismaService.patientInsurance.update).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
