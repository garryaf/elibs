import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService } from '../../audit/audit.service';
import { InsuranceConsolidationService } from '../../../insurance/insurance-consolidation.service';
import { CreateVisitDto } from '../dto/create-visit.dto';

const PaymentMethod = {
  CASH: 'CASH' as const,
  BPJS: 'BPJS' as const,
  INSURANCE: 'INSURANCE' as const,
  TRANSFER: 'TRANSFER' as const,
};

const VisitStatus = {
  REGISTERED: 'REGISTERED' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

/**
 * Bug Condition Exploration Test
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 *
 * This test encodes the EXPECTED (correct) behavior:
 * - When a patient already has a REGISTERED or IN_PROGRESS visit on the same day (WIB),
 *   VisitService.create() SHOULD throw ConflictException with errorCode 'ERR_DUPLICATE_ACTIVE_VISIT'
 *
 * On UNFIXED code, this test will FAIL because the current implementation has no
 * duplicate active visit check — it silently creates duplicate visits.
 *
 * The failure confirms the bug exists.
 */
describe('Feature: duplicate-active-visit-guard, Property 1: Bug Condition — Duplicate Active Visit Allowed on Same Day', () => {
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
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    mockVisitNumberGenerator = {
      generate: jest.fn().mockResolvedValue('VST-202507-0001'),
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
        { provide: InsuranceConsolidationService, useValue: { validateVisitInsurance: jest.fn().mockResolvedValue(undefined), getDefaultInsurance: jest.fn().mockResolvedValue(null), getActiveInsurances: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should throw ConflictException when patient already has a REGISTERED visit on the same day (WIB)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // patientId
        fc.uuid(), // userId
        async (patientId, userId) => {
          // Setup: Patient exists
          mockPrisma.patient.findFirst.mockResolvedValue({
            id: patientId,
            deletedAt: null,
          });

          // Setup: Patient already has a REGISTERED visit today
          // This simulates the bug condition: an active visit already exists
          mockPrisma.visit.findFirst.mockResolvedValue({
            id: 'existing-visit-id',
            visitNumber: 'VST-202507-0099',
            status: VisitStatus.REGISTERED,
            registrationDate: new Date(),
            patientId,
          });

          // Setup: If the code doesn't check for duplicates, it will call create
          mockPrisma.visit.create.mockImplementation(async (args: any) => ({
            id: 'new-visit-id',
            visitNumber: 'VST-202507-0001',
            status: VisitStatus.REGISTERED,
            registrationDate: new Date(),
            patientId: args.data.patientId,
            paymentMethod: args.data.paymentMethod,
            doctorId: null,
            clinicId: null,
            insuranceId: null,
            bpjsNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: { id: patientId, name: 'Test Patient' },
            doctor: null,
            clinic: null,
            insurance: null,
          }));

          const dto: CreateVisitDto = {
            patientId,
            paymentMethod: PaymentMethod.CASH as any,
          };

          // Expected behavior: Should throw ConflictException
          // Bug condition: Current code does NOT throw — it silently creates a duplicate
          try {
            await visitService.create(dto, userId);
            // If we reach here, the bug exists: no ConflictException was thrown
            throw new Error(
              'EXPECTED ConflictException but create() succeeded — duplicate active visit was silently created',
            );
          } catch (error: any) {
            if (error.message?.includes('EXPECTED ConflictException')) {
              throw error; // Re-throw our assertion error
            }
            // If ConflictException is thrown, the fix is in place
            expect(error).toBeInstanceOf(ConflictException);
            const response = error.getResponse();
            expect(response.errorCode).toBe('ERR_DUPLICATE_ACTIVE_VISIT');
            expect(response.message).toContain('active visit');
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('should throw ConflictException when patient already has an IN_PROGRESS visit on the same day (WIB)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // patientId
        fc.uuid(), // userId
        async (patientId, userId) => {
          // Setup: Patient exists
          mockPrisma.patient.findFirst.mockResolvedValue({
            id: patientId,
            deletedAt: null,
          });

          // Setup: Patient already has an IN_PROGRESS visit today
          mockPrisma.visit.findFirst.mockResolvedValue({
            id: 'existing-visit-id',
            visitNumber: 'VST-202507-0050',
            status: VisitStatus.IN_PROGRESS,
            registrationDate: new Date(),
            patientId,
          });

          // Setup: If the code doesn't check for duplicates, it will call create
          mockPrisma.visit.create.mockImplementation(async (args: any) => ({
            id: 'new-visit-id',
            visitNumber: 'VST-202507-0001',
            status: VisitStatus.REGISTERED,
            registrationDate: new Date(),
            patientId: args.data.patientId,
            paymentMethod: args.data.paymentMethod,
            doctorId: null,
            clinicId: null,
            insuranceId: null,
            bpjsNumber: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: { id: patientId, name: 'Test Patient' },
            doctor: null,
            clinic: null,
            insurance: null,
          }));

          const dto: CreateVisitDto = {
            patientId,
            paymentMethod: PaymentMethod.CASH as any,
          };

          // Expected behavior: Should throw ConflictException
          // Bug condition: Current code does NOT throw — it silently creates a duplicate
          try {
            await visitService.create(dto, userId);
            // If we reach here, the bug exists: no ConflictException was thrown
            throw new Error(
              'EXPECTED ConflictException but create() succeeded — duplicate active visit was silently created',
            );
          } catch (error: any) {
            if (error.message?.includes('EXPECTED ConflictException')) {
              throw error; // Re-throw our assertion error
            }
            // If ConflictException is thrown, the fix is in place
            expect(error).toBeInstanceOf(ConflictException);
            const response = error.getResponse();
            expect(response.errorCode).toBe('ERR_DUPLICATE_ACTIVE_VISIT');
            expect(response.message).toContain('active visit');
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
