// Feature: laboratory-workflow-refactor, Properties 2, 3, 4, 5, 12

import * as fc from 'fast-check';
import { VisitStatus } from '@prisma/client';
import { OrderValidationGuard } from '../order-validation.guard';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Arbitrary that generates valid UUID v4 strings.
 * Uses fc.uuid() and filters to only v4 format.
 */
const validUuidV4Arb = fc.uuid().filter((u) => UUID_V4_REGEX.test(u));

/**
 * Arbitrary that generates non-UUID strings (strings that do NOT match UUID v4 format).
 */
const nonUuidStringArb = fc
  .oneof(
    fc.constant('not-a-uuid'),
    fc.constant('12345'),
    fc.constant('hello-world-test-value-abcdef'),
    fc.constant('550e8400-e29b-11d4-a716-446655440000'), // UUID v1 (not v4)
    fc.string({ minLength: 1, maxLength: 50 }),
  )
  .filter((s) => !UUID_V4_REGEX.test(s) && s.length > 0);

describe('OrderValidationGuard Property Tests', () => {
  let guard: OrderValidationGuard;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      visit: { findUnique: jest.fn() },
    };
    guard = new OrderValidationGuard(mockPrisma);
  });

  /**
   * Property 2: Invalid or Missing visitId Always Rejected
   *
   * *For any* order creation request where the visitId is null, undefined, an empty
   * string, or a string that is not a valid UUID v4 format, the OrderValidationGuard
   * SHALL reject the request with ERR_VALIDATION error and SHALL NOT call prisma.visit.findUnique.
   *
   * **Validates: Requirements 1.2, 4.1, 4.2, 9.2**
   */
  describe('Property 2: Invalid or Missing visitId Always Rejected', () => {
    it('should reject any null, undefined, empty, or non-UUID visitId with ERR_VALIDATION', async () => {
      const invalidVisitIdArb = fc.oneof(
        fc.constant(null as any),
        fc.constant(undefined as any),
        fc.constant(''),
        nonUuidStringArb,
      );

      await fc.assert(
        fc.asyncProperty(invalidVisitIdArb, validUuidV4Arb, async (invalidVisitId, patientId) => {
          await expect(
            guard.validate(invalidVisitId as any, patientId),
          ).rejects.toMatchObject({
            response: expect.objectContaining({
              errorCode: 'ERR_VALIDATION',
            }),
          });

          // No DB call should have been made
          expect(mockPrisma.visit.findUnique).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 3: Non-Existent Visit Always Rejected
   *
   * *For any* order creation request where the visitId is a valid UUID that does not
   * match any Visit record in the database, the OrderValidationGuard SHALL reject the
   * request with ERR_NOT_FOUND error.
   *
   * **Validates: Requirements 1.3, 4.3, 9.3**
   */
  describe('Property 3: Non-Existent Visit Always Rejected', () => {
    it('should reject any valid UUID visitId that does not exist with ERR_NOT_FOUND', async () => {
      await fc.assert(
        fc.asyncProperty(validUuidV4Arb, validUuidV4Arb, async (visitId, patientId) => {
          // Mock: visit does not exist
          mockPrisma.visit.findUnique.mockResolvedValue(null);

          await expect(
            guard.validate(visitId, patientId),
          ).rejects.toMatchObject({
            response: expect.objectContaining({
              errorCode: 'ERR_NOT_FOUND',
              message: 'Visit not found',
            }),
          });

          // DB call should have been made (format passed)
          expect(mockPrisma.visit.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: visitId } }),
          );

          // Reset mock for next iteration
          mockPrisma.visit.findUnique.mockReset();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Terminal Visit Status Rejects Order Creation
   *
   * *For any* Visit in CANCELLED or COMPLETED status, any order creation request
   * referencing that Visit SHALL be rejected with ERR_INVALID_STATE error.
   *
   * **Validates: Requirements 1.4, 9.4**
   */
  describe('Property 4: Terminal Visit Status Rejects Order Creation', () => {
    it('should reject any visit in CANCELLED or COMPLETED status with ERR_INVALID_STATE', async () => {
      const terminalStatusArb = fc.constantFrom(
        VisitStatus.CANCELLED,
        VisitStatus.COMPLETED,
      );

      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb,
          validUuidV4Arb,
          terminalStatusArb,
          async (visitId, patientId, terminalStatus) => {
            // Mock: visit exists but in terminal status
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              status: terminalStatus,
              patientId,
            });

            await expect(
              guard.validate(visitId, patientId),
            ).rejects.toMatchObject({
              response: expect.objectContaining({
                errorCode: 'ERR_INVALID_STATE',
                message: `Cannot add order to visit in ${terminalStatus} status`,
              }),
            });

            // Reset mock for next iteration
            mockPrisma.visit.findUnique.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Patient Mismatch Between Order and Visit Rejected
   *
   * *For any* order creation request where the patientId differs from the referenced
   * Visit's patientId, the OrderValidationGuard SHALL reject the request with
   * ERR_VALIDATION error indicating patient mismatch.
   *
   * **Validates: Requirements 5.1, 5.2, 9.5**
   */
  describe('Property 5: Patient Mismatch Between Order and Visit Rejected', () => {
    it('should reject when order patientId does not match visit patientId with ERR_VALIDATION', async () => {
      const acceptableStatusArb = fc.constantFrom(
        VisitStatus.REGISTERED,
        VisitStatus.IN_PROGRESS,
      );

      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb,
          validUuidV4Arb,
          validUuidV4Arb,
          acceptableStatusArb,
          async (visitId, orderPatientId, visitPatientId, status) => {
            // Ensure the two patient IDs are different
            fc.pre(orderPatientId !== visitPatientId);

            // Mock: visit exists in acceptable status but different patient
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              status,
              patientId: visitPatientId,
            });

            await expect(
              guard.validate(visitId, orderPatientId),
            ).rejects.toMatchObject({
              response: expect.objectContaining({
                errorCode: 'ERR_VALIDATION',
                message: expect.stringContaining('Patient mismatch'),
              }),
            });

            // Reset mock for next iteration
            mockPrisma.visit.findUnique.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 12: Validation Guard Ordering
   *
   * *For any* order creation request that has multiple validation failures, the error
   * returned SHALL correspond to the first failing check in the defined sequence:
   * (a) visitId presence/format, (b) Visit existence, (c) Visit status, (d) patient match.
   *
   * **Validates: Requirements 9.6**
   */
  describe('Property 12: Validation Guard Ordering', () => {
    it('format errors take priority over existence errors', async () => {
      await fc.assert(
        fc.asyncProperty(nonUuidStringArb, validUuidV4Arb, async (invalidVisitId, patientId) => {
          // Even if visit lookup would fail, format error comes first
          mockPrisma.visit.findUnique.mockResolvedValue(null);

          await expect(
            guard.validate(invalidVisitId as any, patientId),
          ).rejects.toMatchObject({
            response: expect.objectContaining({
              errorCode: 'ERR_VALIDATION',
            }),
          });

          // Format check should prevent DB call
          expect(mockPrisma.visit.findUnique).not.toHaveBeenCalled();

          mockPrisma.visit.findUnique.mockReset();
        }),
        { numRuns: 100 },
      );
    });

    it('existence errors take priority over status errors', async () => {
      await fc.assert(
        fc.asyncProperty(validUuidV4Arb, validUuidV4Arb, async (visitId, patientId) => {
          // Visit doesn't exist — even though status would also fail
          mockPrisma.visit.findUnique.mockResolvedValue(null);

          await expect(
            guard.validate(visitId, patientId),
          ).rejects.toMatchObject({
            response: expect.objectContaining({
              errorCode: 'ERR_NOT_FOUND',
            }),
          });

          mockPrisma.visit.findUnique.mockReset();
        }),
        { numRuns: 100 },
      );
    });

    it('status errors take priority over patient mismatch errors', async () => {
      const terminalStatusArb = fc.constantFrom(
        VisitStatus.CANCELLED,
        VisitStatus.COMPLETED,
      );

      await fc.assert(
        fc.asyncProperty(
          validUuidV4Arb,
          validUuidV4Arb,
          validUuidV4Arb,
          terminalStatusArb,
          async (visitId, orderPatientId, visitPatientId, terminalStatus) => {
            // Ensure patient mismatch exists too
            fc.pre(orderPatientId !== visitPatientId);

            // Visit exists in terminal status AND patient mismatches
            mockPrisma.visit.findUnique.mockResolvedValue({
              id: visitId,
              status: terminalStatus,
              patientId: visitPatientId,
            });

            // Status error should come first (before patient mismatch)
            await expect(
              guard.validate(visitId, orderPatientId),
            ).rejects.toMatchObject({
              response: expect.objectContaining({
                errorCode: 'ERR_INVALID_STATE',
              }),
            });

            mockPrisma.visit.findUnique.mockReset();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
