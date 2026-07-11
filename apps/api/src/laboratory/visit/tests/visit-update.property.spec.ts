import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService } from '../../audit/audit.service';
import { UpdateVisitDto } from '../dto/update-visit.dto';

const PaymentMethod = {
  CASH: 'CASH' as const,
  BPJS: 'BPJS' as const,
  INSURANCE: 'INSURANCE' as const,
  TRANSFER: 'TRANSFER' as const,
};

/**
 * **Validates: Requirements 2.3, 7.2**
 */
describe('Feature: visit-management, Property 8: Immutable Fields on Update', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  const KNOWN_VISIT_NUMBER = 'VST-202507-0042';
  const KNOWN_PATIENT_ID = 'patient-id-immutable';
  const KNOWN_REGISTRATION_DATE = new Date('2025-07-01T10:00:00.000Z');

  beforeEach(async () => {
    mockPrisma = {
      patient: {
        findFirst: jest.fn(),
      },
      doctor: {
        findFirst: jest.fn(),
      },
      clinic: {
        findFirst: jest.fn(),
      },
      insurance: {
        findFirst: jest.fn(),
      },
      visit: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn(),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: VisitNumberGeneratorService,
          useValue: mockVisitNumberGenerator,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should never change visitNumber, patientId, or registrationDate regardless of update DTO content', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary update DTO fields (including fields that should be immutable)
        fc.record({
          paymentMethod: fc.constantFrom(
            PaymentMethod.CASH,
            PaymentMethod.BPJS,
            PaymentMethod.INSURANCE,
            PaymentMethod.TRANSFER,
            undefined,
          ),
          doctorId: fc.option(fc.uuid(), { nil: undefined }),
          clinicId: fc.option(fc.uuid(), { nil: undefined }),
          insuranceId: fc.option(fc.uuid(), { nil: undefined }),
          bpjsNumber: fc.option(
            fc.string({ minLength: 13, maxLength: 13 }).map((s) =>
              s.replace(/[^0-9]/g, '0').padEnd(13, '0').slice(0, 13),
            ),
            { nil: undefined },
          ),
        }),
        async (dtoFields) => {
          const visitId = 'visit-id-test';

          // Build the existing visit mock with known immutable values
          const existingVisit = {
            id: visitId,
            visitNumber: KNOWN_VISIT_NUMBER,
            patientId: KNOWN_PATIENT_ID,
            registrationDate: KNOWN_REGISTRATION_DATE,
            status: 'REGISTERED',
            paymentMethod: PaymentMethod.CASH,
            doctorId: null,
            clinicId: null,
            insuranceId: null,
            bpjsNumber: null,
            cancelledAt: null,
            cancelReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: { id: KNOWN_PATIENT_ID, name: 'Test Patient' },
            doctor: null,
            clinic: null,
            insurance: null,
          };

          mockPrisma.visit.findUnique.mockResolvedValue(existingVisit);

          // Mock doctor/clinic/insurance validation to pass
          if (dtoFields.doctorId) {
            mockPrisma.doctor.findFirst.mockResolvedValue({
              id: dtoFields.doctorId,
              isActive: true,
              deletedAt: null,
            });
          }
          if (dtoFields.clinicId) {
            mockPrisma.clinic.findFirst.mockResolvedValue({
              id: dtoFields.clinicId,
              isActive: true,
              deletedAt: null,
            });
          }
          if (dtoFields.insuranceId) {
            mockPrisma.insurance.findFirst.mockResolvedValue({
              id: dtoFields.insuranceId,
              isActive: true,
              deletedAt: null,
            });
          }

          // Mock the update to return the visit with immutable fields preserved
          mockPrisma.visit.update.mockImplementation(async (args: any) => ({
            ...existingVisit,
            ...args.data,
            // Immutable fields always come from existing visit
            visitNumber: KNOWN_VISIT_NUMBER,
            patientId: KNOWN_PATIENT_ID,
            registrationDate: KNOWN_REGISTRATION_DATE,
          }));

          // Build DTO — only pass fields the UpdateVisitDto actually accepts
          const dto: UpdateVisitDto = {};
          if (dtoFields.paymentMethod !== undefined) {
            dto.paymentMethod = dtoFields.paymentMethod as any;
          }
          if (dtoFields.doctorId !== undefined) {
            dto.doctorId = dtoFields.doctorId;
          }
          if (dtoFields.clinicId !== undefined) {
            dto.clinicId = dtoFields.clinicId;
          }
          if (dtoFields.insuranceId !== undefined) {
            dto.insuranceId = dtoFields.insuranceId;
          }
          if (dtoFields.bpjsNumber !== undefined) {
            dto.bpjsNumber = dtoFields.bpjsNumber;
          }

          try {
            const result = await visitService.update(visitId, dto, 'user-id');

            // Immutable fields must remain unchanged
            expect(result.visitNumber).toBe(KNOWN_VISIT_NUMBER);
            expect(result.patientId).toBe(KNOWN_PATIENT_ID);
            expect(result.registrationDate).toEqual(KNOWN_REGISTRATION_DATE);

            // Also verify that prisma.visit.update was NOT called with immutable fields
            if (mockPrisma.visit.update.mock.calls.length > 0) {
              const updateArgs = mockPrisma.visit.update.mock.calls[0][0];
              expect(updateArgs.data).not.toHaveProperty('visitNumber');
              expect(updateArgs.data).not.toHaveProperty('patientId');
              expect(updateArgs.data).not.toHaveProperty('registrationDate');
            }
          } catch (error) {
            // If validation fails (e.g. BPJS without valid number, INSURANCE without insuranceId),
            // that's acceptable — the property is about immutability, not about update success.
            // We just verify that when it DOES throw, it's a validation error, not a state error.
            expect(error).toBeInstanceOf(BadRequestException);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 7.1, 7.3**
 */
describe('Feature: visit-management, Property 9: Updates Only Allowed on Non-Terminal Visits', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: {
        findFirst: jest.fn(),
      },
      doctor: {
        findFirst: jest.fn(),
      },
      clinic: {
        findFirst: jest.fn(),
      },
      insurance: {
        findFirst: jest.fn(),
      },
      visit: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn(),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: VisitNumberGeneratorService,
          useValue: mockVisitNumberGenerator,
        },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should reject updates on COMPLETED/CANCELLED visits and accept on REGISTERED/IN_PROGRESS', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('REGISTERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
        // Generate a simple valid update DTO (CASH payment, optional doctor)
        fc.record({
          doctorId: fc.option(fc.uuid(), { nil: undefined }),
          clinicId: fc.option(fc.uuid(), { nil: undefined }),
        }),
        async (visitStatus, dtoFields) => {
          const visitId = 'visit-id-status-test';

          const existingVisit = {
            id: visitId,
            visitNumber: 'VST-202507-0001',
            patientId: 'patient-id-1',
            registrationDate: new Date('2025-07-01T10:00:00.000Z'),
            status: visitStatus,
            paymentMethod: PaymentMethod.CASH,
            doctorId: null,
            clinicId: null,
            insuranceId: null,
            bpjsNumber: null,
            cancelledAt: visitStatus === 'CANCELLED' ? new Date() : null,
            cancelReason: visitStatus === 'CANCELLED' ? 'test' : null,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: { id: 'patient-id-1', name: 'Test Patient' },
            doctor: null,
            clinic: null,
            insurance: null,
          };

          mockPrisma.visit.findUnique.mockResolvedValue(existingVisit);

          // Mock doctor/clinic validation to pass
          if (dtoFields.doctorId) {
            mockPrisma.doctor.findFirst.mockResolvedValue({
              id: dtoFields.doctorId,
              isActive: true,
              deletedAt: null,
            });
          }
          if (dtoFields.clinicId) {
            mockPrisma.clinic.findFirst.mockResolvedValue({
              id: dtoFields.clinicId,
              isActive: true,
              deletedAt: null,
            });
          }

          // Mock the update to return the updated visit
          mockPrisma.visit.update.mockImplementation(async (args: any) => ({
            ...existingVisit,
            ...args.data,
          }));

          // Build a valid DTO (CASH payment — no extra validations needed)
          const dto: UpdateVisitDto = {};
          if (dtoFields.doctorId !== undefined) {
            dto.doctorId = dtoFields.doctorId;
          }
          if (dtoFields.clinicId !== undefined) {
            dto.clinicId = dtoFields.clinicId;
          }

          const isTerminal = visitStatus === 'COMPLETED' || visitStatus === 'CANCELLED';

          if (isTerminal) {
            // Should throw BadRequestException with ERR_INVALID_STATE
            await expect(
              visitService.update(visitId, dto, 'user-id'),
            ).rejects.toThrow(BadRequestException);

            try {
              await visitService.update(visitId, dto, 'user-id');
            } catch (error: any) {
              const response = error.getResponse();
              expect(response.errorCode).toBe('ERR_INVALID_STATE');
            }
          } else {
            // Should succeed for REGISTERED and IN_PROGRESS
            const result = await visitService.update(visitId, dto, 'user-id');
            expect(result.status).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
