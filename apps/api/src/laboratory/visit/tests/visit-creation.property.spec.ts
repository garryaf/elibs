import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService } from '../../audit/audit.service';
import { CreateVisitDto } from '../dto/create-visit.dto';

// Use string literal for PaymentMethod to avoid Prisma client import issues in tests
const PaymentMethod = {
  CASH: 'CASH' as const,
  BPJS: 'BPJS' as const,
  INSURANCE: 'INSURANCE' as const,
  TRANSFER: 'TRANSFER' as const,
};

/**
 * **Validates: Requirements 1.1, 1.5, 3.1**
 */
describe('Feature: visit-management, Property 2: Visit Creation Produces REGISTERED Status', () => {
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
        create: jest.fn(),
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

  it('should always produce a visit with status REGISTERED and a valid visitNumber format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 2020, max: 2099 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 9999 }),
        async (patientId, userId, year, month, seq) => {
          const yearStr = year.toString();
          const monthStr = month.toString().padStart(2, '0');
          const visitNumber = VisitNumberGeneratorService.format(
            yearStr,
            monthStr,
            seq,
          );

          // Mock patient exists
          mockPrisma.patient.findFirst.mockResolvedValue({
            id: patientId,
            deletedAt: null,
          });

          // Mock visit number generation
          mockVisitNumberGenerator.generate.mockResolvedValue(visitNumber);

          // Mock visit creation - simulate what Prisma returns
          mockPrisma.visit.create.mockImplementation(async (args: any) => ({
            id: 'visit-id',
            visitNumber: args.data.visitNumber,
            status: 'REGISTERED',
            registrationDate: new Date(),
            patientId: args.data.patientId,
            paymentMethod: args.data.paymentMethod,
            doctorId: args.data.doctorId,
            clinicId: args.data.clinicId,
            insuranceId: args.data.insuranceId,
            bpjsNumber: args.data.bpjsNumber,
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

          const result = await visitService.create(dto, userId);

          // Status must be REGISTERED
          expect(result.status).toBe('REGISTERED');

          // visitNumber must match format VST-YYYYMM-XXXX
          const parsed = VisitNumberGeneratorService.parse(
            result.visitNumber,
          );
          expect(parsed).not.toBeNull();
          expect(parsed!.year).toMatch(/^\d{4}$/);
          expect(parsed!.month).toMatch(/^\d{2}$/);
          expect(parsed!.sequence).toBeGreaterThanOrEqual(1);
          expect(parsed!.sequence).toBeLessThanOrEqual(9999);

          // Verify no new patient was created (Requirement 1.5)
          expect(mockPrisma.patient.findFirst).toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 4.2, 4.5**
 */
describe('Feature: visit-management, Property 3: BPJS Number Validation', () => {
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
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);

    // Always mock patient as existing
    mockPrisma.patient.findFirst.mockResolvedValue({
      id: 'patient-id',
      deletedAt: null,
    });

    // Mock visit creation
    mockPrisma.visit.create.mockImplementation(async (args: any) => ({
      id: 'visit-id',
      visitNumber: 'VST-202507-0001',
      status: 'REGISTERED',
      registrationDate: new Date(),
      patientId: args.data.patientId,
      paymentMethod: args.data.paymentMethod,
      doctorId: null,
      clinicId: null,
      insuranceId: null,
      bpjsNumber: args.data.bpjsNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: { id: 'patient-id', name: 'Test Patient' },
      doctor: null,
      clinic: null,
      insurance: null,
    }));
  });

  it('should succeed iff bpjsNumber matches /^\\d{13}$/ when paymentMethod is BPJS', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 30 }),
        async (bpjsNumber) => {
          const dto: CreateVisitDto = {
            patientId: 'patient-id',
            paymentMethod: PaymentMethod.BPJS as any,
            bpjsNumber,
          };

          const isValid = /^\d{13}$/.test(bpjsNumber);

          try {
            const result = await visitService.create(dto, 'user-id');
            // If creation succeeded, the bpjsNumber must be valid
            expect(isValid).toBe(true);
            expect(result.status).toBe('REGISTERED');
          } catch (error) {
            // If creation failed with validation error, bpjsNumber must be invalid
            expect(error).toBeInstanceOf(BadRequestException);
            expect(isValid).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 4.4**
 */
describe('Feature: visit-management, Property 4: CASH Payment Ignores Insurance Fields', () => {
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
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);

    // Always mock patient as existing
    mockPrisma.patient.findFirst.mockResolvedValue({
      id: 'patient-id',
      deletedAt: null,
    });

    // Mock insurance as existing for FK validation (separate from payment validation)
    mockPrisma.insurance.findFirst.mockResolvedValue({
      id: 'insurance-id',
      isActive: true,
      deletedAt: null,
    });

    // Mock visit creation
    mockPrisma.visit.create.mockImplementation(async (args: any) => ({
      id: 'visit-id',
      visitNumber: 'VST-202507-0001',
      status: 'REGISTERED',
      registrationDate: new Date(),
      patientId: args.data.patientId,
      paymentMethod: args.data.paymentMethod,
      doctorId: null,
      clinicId: null,
      insuranceId: args.data.insuranceId,
      bpjsNumber: args.data.bpjsNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: { id: 'patient-id', name: 'Test Patient' },
      doctor: null,
      clinic: null,
      insurance: null,
    }));
  });

  it('should always succeed regardless of bpjsNumber or insuranceId values when paymentMethod is CASH', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
        fc.option(fc.uuid(), { nil: undefined }),
        async (bpjsNumber, insuranceId) => {
          // Mock insurance as existing if an insuranceId is provided (FK validation
          // is separate from payment-field validation; here we test that CASH payment
          // does not reject based on payment-field logic regardless of these values)
          if (insuranceId) {
            mockPrisma.insurance.findFirst.mockResolvedValue({
              id: insuranceId,
              isActive: true,
              deletedAt: null,
            });
          }

          const dto: CreateVisitDto = {
            patientId: 'patient-id',
            paymentMethod: PaymentMethod.CASH as any,
            bpjsNumber: bpjsNumber ?? undefined,
            insuranceId: insuranceId ?? undefined,
          };

          // CASH payment should always succeed — validatePaymentFields does not
          // enforce bpjsNumber or insuranceId requirements for CASH
          const result = await visitService.create(dto, 'user-id');
          expect(result.status).toBe('REGISTERED');
        },
      ),
      { numRuns: 100 },
    );
  });
});
