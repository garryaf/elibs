/**
 * Unit Tests — VisitService Insurance Validation (Task 5.2)
 *
 * Tests the insurance validation logic in VisitService.create():
 * - CASH payment skips insurance validation
 * - INSURANCE payment with valid insuranceId succeeds
 * - INSURANCE payment with invalid insuranceId is rejected
 * - INSURANCE payment without insuranceId defaults to priority=1
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { VisitService } from '../laboratory/visit/visit.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../laboratory/visit/visit-number-generator.service';
import { AuditService } from '../laboratory/audit/audit.service';
import { InsuranceConsolidationService } from './insurance-consolidation.service';

describe('VisitService — Insurance Validation', () => {
  let visitService: VisitService;
  let prismaService: any;
  let consolidationService: any;
  let visitNumberGenerator: any;
  let auditService: any;

  const mockVisit = {
    id: 'visit-uuid-001',
    visitNumber: 'VST-202607-0001',
    patientId: 'patient-uuid-001',
    paymentMethod: PaymentMethod.INSURANCE,
    doctorId: null,
    clinicId: null,
    insuranceId: 'insurance-uuid-001',
    bpjsNumber: null,
    status: 'REGISTERED',
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
    deletedAt: null,
    patient: { id: 'patient-uuid-001', name: 'Test Patient' },
    doctor: null,
    clinic: null,
    insurance: { id: 'insurance-uuid-001', name: 'Test Insurance' },
  };

  beforeEach(async () => {
    prismaService = {
      patient: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      visit: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      doctor: {
        findUnique: jest.fn(),
      },
      clinic: {
        findUnique: jest.fn(),
      },
      insurance: {
        findUnique: jest.fn(),
      },
    };

    consolidationService = {
      validateVisitInsurance: jest.fn(),
      getDefaultInsurance: jest.fn(),
      getActiveInsurances: jest.fn(),
    };

    visitNumberGenerator = {
      generate: jest.fn().mockResolvedValue('VST-202607-0001'),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitService,
        { provide: PrismaService, useValue: prismaService },
        { provide: InsuranceConsolidationService, useValue: consolidationService },
        { provide: VisitNumberGeneratorService, useValue: visitNumberGenerator },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);

    // Common mock: patient exists (validatePatientExists uses findFirst)
    prismaService.patient.findFirst.mockResolvedValue({
      id: 'patient-uuid-001',
      name: 'Test Patient',
      deletedAt: null,
    });

    // Common mock: no active visit today
    prismaService.visit.findFirst.mockResolvedValue(null);
  });

  describe('CASH payment skips insurance validation', () => {
    /**
     * When paymentMethod is CASH, no calls to validateVisitInsurance or getDefaultInsurance
     * should be made — insurance validation is entirely bypassed.
     *
     * **Validates: Requirements 3.1**
     */
    it('should not call validateVisitInsurance or getDefaultInsurance for CASH payment', async () => {
      const cashVisit = { ...mockVisit, paymentMethod: PaymentMethod.CASH, insuranceId: null, insurance: null };
      prismaService.visit.create.mockResolvedValue(cashVisit);

      await visitService.create(
        {
          patientId: 'patient-uuid-001',
          paymentMethod: PaymentMethod.CASH,
        },
        'user-uuid-001',
      );

      expect(consolidationService.validateVisitInsurance).not.toHaveBeenCalled();
      expect(consolidationService.getDefaultInsurance).not.toHaveBeenCalled();
    });
  });

  describe('INSURANCE payment with valid insuranceId succeeds', () => {
    /**
     * When paymentMethod is INSURANCE and a valid insuranceId is provided,
     * validateVisitInsurance is called and resolves without error — visit is created.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('should call validateVisitInsurance and create the visit when insuranceId is valid', async () => {
      consolidationService.validateVisitInsurance.mockResolvedValue(undefined);
      prismaService.visit.create.mockResolvedValue(mockVisit);

      const result = await visitService.create(
        {
          patientId: 'patient-uuid-001',
          paymentMethod: PaymentMethod.INSURANCE,
          insuranceId: 'insurance-uuid-001',
        },
        'user-uuid-001',
      );

      expect(consolidationService.validateVisitInsurance).toHaveBeenCalledWith(
        'patient-uuid-001',
        'insurance-uuid-001',
      );
      expect(result).toBeDefined();
      expect(result.id).toBe('visit-uuid-001');
    });
  });

  describe('INSURANCE payment with invalid insuranceId is rejected', () => {
    /**
     * When paymentMethod is INSURANCE and the insuranceId is not in the patient's
     * active enrollments, validateVisitInsurance throws BadRequestException.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('should throw BadRequestException when insuranceId is not in patient enrollments', async () => {
      consolidationService.validateVisitInsurance.mockRejectedValue(
        new BadRequestException(
          'Insurance invalid-uuid is not an active enrollment for patient patient-uuid-001',
        ),
      );

      await expect(
        visitService.create(
          {
            patientId: 'patient-uuid-001',
            paymentMethod: PaymentMethod.INSURANCE,
            insuranceId: 'invalid-uuid',
          },
          'user-uuid-001',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(consolidationService.validateVisitInsurance).toHaveBeenCalledWith(
        'patient-uuid-001',
        'invalid-uuid',
      );
      // Visit should not be created
      expect(prismaService.visit.create).not.toHaveBeenCalled();
    });
  });

  describe('INSURANCE payment without insuranceId defaults to priority=1', () => {
    /**
     * When paymentMethod is INSURANCE and no insuranceId is provided,
     * the system calls getDefaultInsurance and uses the result.
     *
     * **Validates: Requirements 3.3**
     */
    it('should call getDefaultInsurance and use its result when no insuranceId is provided', async () => {
      const defaultInsurance = {
        id: 'patient-insurance-uuid-001',
        patientId: 'patient-uuid-001',
        insuranceId: 'insurance-uuid-002',
        priority: 1,
        isActive: true,
        validFrom: null,
        validUntil: null,
        insurance: { id: 'insurance-uuid-002', name: 'Default Insurance' },
      };

      consolidationService.getDefaultInsurance.mockResolvedValue(defaultInsurance);
      const visitWithDefault = {
        ...mockVisit,
        insuranceId: 'insurance-uuid-002',
        insurance: { id: 'insurance-uuid-002', name: 'Default Insurance' },
      };
      prismaService.visit.create.mockResolvedValue(visitWithDefault);

      const result = await visitService.create(
        {
          patientId: 'patient-uuid-001',
          paymentMethod: PaymentMethod.INSURANCE,
          // No insuranceId provided
        },
        'user-uuid-001',
      );

      expect(consolidationService.getDefaultInsurance).toHaveBeenCalledWith('patient-uuid-001');
      expect(result.insuranceId).toBe('insurance-uuid-002');
    });

    /**
     * When paymentMethod is INSURANCE, no insuranceId is provided,
     * and getDefaultInsurance returns null (patient has no active enrollment),
     * the system throws BadRequestException with ERR_NO_DEFAULT_INSURANCE.
     *
     * **Validates: Requirements 3.3**
     */
    it('should throw BadRequestException when no default insurance exists', async () => {
      consolidationService.getDefaultInsurance.mockResolvedValue(null);

      await expect(
        visitService.create(
          {
            patientId: 'patient-uuid-001',
            paymentMethod: PaymentMethod.INSURANCE,
            // No insuranceId provided
          },
          'user-uuid-001',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(consolidationService.getDefaultInsurance).toHaveBeenCalledWith('patient-uuid-001');
      // Visit should not be created
      expect(prismaService.visit.create).not.toHaveBeenCalled();
    });
  });
});
