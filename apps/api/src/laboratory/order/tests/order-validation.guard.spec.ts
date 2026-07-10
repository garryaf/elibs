import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VisitStatus } from '@prisma/client';
import { OrderValidationGuard } from '../order-validation.guard';

describe('OrderValidationGuard', () => {
  let guard: OrderValidationGuard;
  let mockPrisma: any;

  const validVisitId = '550e8400-e29b-41d4-a716-446655440000';
  const validPatientId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    mockPrisma = {
      visit: {
        findUnique: jest.fn(),
      },
    };
    guard = new OrderValidationGuard(mockPrisma);
  });

  describe('Step 1: visitId presence and UUID format', () => {
    it('should throw ERR_VALIDATION when visitId is empty string', async () => {
      await expect(guard.validate('', validPatientId)).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_VALIDATION',
          message: expect.stringContaining('visitId is required'),
        }),
      });
      expect(mockPrisma.visit.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ERR_VALIDATION when visitId is not a valid UUID', async () => {
      await expect(
        guard.validate('not-a-uuid', validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_VALIDATION',
          message: 'visitId must be a valid UUID',
        }),
      });
      expect(mockPrisma.visit.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ERR_VALIDATION for UUIDs that are not v4 format', async () => {
      // UUID v1 format (version digit is 1, not 4)
      await expect(
        guard.validate('550e8400-e29b-11d4-a716-446655440000', validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_VALIDATION',
          message: 'visitId must be a valid UUID',
        }),
      });
    });
  });

  describe('Step 2: Visit existence', () => {
    it('should throw ERR_NOT_FOUND when visit does not exist', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue(null);

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_NOT_FOUND',
          message: 'Visit not found',
        }),
      });
    });
  });

  describe('Step 3: Visit status check', () => {
    it('should throw ERR_INVALID_STATE when visit is in COMPLETED status', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue({
        id: validVisitId,
        status: VisitStatus.COMPLETED,
        patientId: validPatientId,
      });

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_INVALID_STATE',
          message: 'Cannot add order to visit in COMPLETED status',
        }),
      });
    });

    it('should throw ERR_INVALID_STATE when visit is in CANCELLED status', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue({
        id: validVisitId,
        status: VisitStatus.CANCELLED,
        patientId: validPatientId,
      });

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_INVALID_STATE',
          message: 'Cannot add order to visit in CANCELLED status',
        }),
      });
    });
  });

  describe('Step 4: Patient mismatch', () => {
    it('should throw ERR_VALIDATION when patientId does not match visit patientId', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue({
        id: validVisitId,
        status: VisitStatus.REGISTERED,
        patientId: 'different-patient-id',
      });

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_VALIDATION',
          message:
            'Patient mismatch: order patientId does not match visit patientId',
        }),
      });
    });
  });

  describe('Happy path', () => {
    it('should pass validation for REGISTERED visit with matching patient', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue({
        id: validVisitId,
        status: VisitStatus.REGISTERED,
        patientId: validPatientId,
      });

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).resolves.toBeUndefined();
    });

    it('should pass validation for IN_PROGRESS visit with matching patient', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue({
        id: validVisitId,
        status: VisitStatus.IN_PROGRESS,
        patientId: validPatientId,
      });

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).resolves.toBeUndefined();
    });
  });

  describe('Validation ordering (Requirement 9.6)', () => {
    it('should check format before existence (returns ERR_VALIDATION for invalid UUID even if visit exists)', async () => {
      // If format check runs first, prisma should never be called
      await expect(
        guard.validate('invalid-uuid', validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_VALIDATION',
        }),
      });
      expect(mockPrisma.visit.findUnique).not.toHaveBeenCalled();
    });

    it('should check existence before status (returns ERR_NOT_FOUND for non-existent visit)', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue(null);

      await expect(
        guard.validate(validVisitId, validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_NOT_FOUND',
        }),
      });
    });

    it('should check status before patient match (returns ERR_INVALID_STATE even if patient mismatches too)', async () => {
      mockPrisma.visit.findUnique.mockResolvedValue({
        id: validVisitId,
        status: VisitStatus.COMPLETED,
        patientId: 'different-patient-id', // both status and patient fail
      });

      // Status check should come first
      await expect(
        guard.validate(validVisitId, validPatientId),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          errorCode: 'ERR_INVALID_STATE',
        }),
      });
    });
  });
});
