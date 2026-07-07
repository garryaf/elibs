// Feature: laboratory-management, Property 16: Audit Log Sensitive Field Exclusion
// Feature: laboratory-management, Property 17: Audit Log Creation on Tracked Entities

import * as fc from 'fast-check';
import {
  AuditService,
  stripSensitiveFields,
  SENSITIVE_FIELDS,
} from '../audit.service';

/**
 * **Validates: Requirements FR13.1, FR13.2**
 */
describe('Audit Log Property Tests', () => {
  /**
   * Property 16: Audit Log Sensitive Field Exclusion
   *
   * *For any* audit log record created from an entity mutation, the oldValues and
   * newValues JSON fields SHALL never contain the key "passwordHash" or any other
   * designated sensitive field.
   *
   * **Validates: Requirements FR13.2**
   */
  describe('Property 16: Audit Log Sensitive Field Exclusion', () => {
    it('should never include sensitive fields in the output', () => {
      // Arbitrary that generates objects with a mix of sensitive and non-sensitive fields
      const arbitraryObjectWithSensitiveFields = fc.dictionary(
        fc.oneof(
          // Non-sensitive keys
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
          // Sensitive keys
          fc.constantFrom(...SENSITIVE_FIELDS),
        ),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
        ),
      );

      fc.assert(
        fc.property(arbitraryObjectWithSensitiveFields, (data) => {
          const result = stripSensitiveFields(data);

          // Result should never be null for non-null input
          expect(result).not.toBeNull();

          // No sensitive field should remain in the result
          for (const sensitiveField of SENSITIVE_FIELDS) {
            expect(result).not.toHaveProperty(sensitiveField);
          }
        }),
        { numRuns: 200 },
      );
    });

    it('should preserve all non-sensitive fields unchanged', () => {
      // Generate objects that only have non-sensitive field names
      const nonSensitiveKey = fc
        .stringMatching(/^[a-z][a-zA-Z0-9]{1,15}$/)
        .filter((key) => !SENSITIVE_FIELDS.includes(key));

      const arbitraryNonSensitiveObject = fc.dictionary(
        nonSensitiveKey,
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
        ),
      );

      fc.assert(
        fc.property(arbitraryNonSensitiveObject, (data) => {
          const result = stripSensitiveFields(data);

          // All non-sensitive fields should be preserved exactly
          for (const [key, value] of Object.entries(data)) {
            expect(result![key]).toEqual(value);
          }

          // Output should have exactly the same keys as input (no fields removed)
          expect(Object.keys(result!).sort()).toEqual(
            Object.keys(data).sort(),
          );
        }),
        { numRuns: 200 },
      );
    });

    it('should return null for null or undefined input', () => {
      expect(stripSensitiveFields(null)).toBeNull();
      expect(stripSensitiveFields(undefined)).toBeNull();
    });
  });

  /**
   * Property 17: Audit Log Creation on Tracked Entities
   *
   * *For any* Create, Update, or Delete operation on Order, OrderDetail, or Patient
   * entities, exactly one audit_log record SHALL be created containing the correct
   * userId, action, entityName, entityId, and timestamp.
   *
   * **Validates: Requirements FR13.1**
   */
  describe('Property 17: Audit Log Creation on Tracked Entities', () => {
    let auditService: AuditService;
    let mockPrisma: {
      auditLog: { create: jest.Mock };
    };

    beforeEach(() => {
      mockPrisma = {
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        },
      };

      auditService = new AuditService(mockPrisma as any);
    });

    it('should create exactly one audit record per log() call with correct fields', () => {
      const actionArb = fc.constantFrom('CREATE', 'UPDATE', 'DELETE');
      const entityNameArb = fc.constantFrom(
        'Order',
        'OrderDetail',
        'Patient',
      );
      const uuidArb = fc.uuid();

      fc.assert(
        fc.asyncProperty(
          uuidArb,
          actionArb,
          entityNameArb,
          uuidArb,
          fc.dictionary(
            fc.stringMatching(/^[a-z][a-zA-Z0-9]{1,10}$/),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          ),
          fc.dictionary(
            fc.stringMatching(/^[a-z][a-zA-Z0-9]{1,10}$/),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          ),
          async (userId, action, entityName, entityId, oldValues, newValues) => {
            mockPrisma.auditLog.create.mockClear();

            await auditService.log(
              userId,
              action,
              entityName,
              entityId,
              oldValues,
              newValues,
            );

            // Exactly one audit record created
            expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);

            // Verify the stored record contains correct fields
            const createCall = mockPrisma.auditLog.create.mock.calls[0][0];
            expect(createCall.data.userId).toBe(userId);
            expect(createCall.data.action).toBe(action);
            expect(createCall.data.entityName).toBe(entityName);
            expect(createCall.data.entityId).toBe(entityId);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should strip sensitive fields from oldValues and newValues before storing', () => {
      const uuidArb = fc.uuid();
      const sensitiveFieldArb = fc.constantFrom(...SENSITIVE_FIELDS);
      const nonSensitiveKey = fc
        .stringMatching(/^[a-z][a-zA-Z0-9]{1,10}$/)
        .filter((k) => !SENSITIVE_FIELDS.includes(k));

      // Generate objects that always contain at least one sensitive field
      const objectWithSensitiveFields = fc
        .tuple(
          sensitiveFieldArb,
          fc.string(),
          fc.dictionary(
            nonSensitiveKey,
            fc.oneof(fc.string(), fc.integer()),
          ),
        )
        .map(([sensitiveKey, sensitiveValue, rest]) => ({
          ...rest,
          [sensitiveKey]: sensitiveValue,
        }));

      fc.assert(
        fc.asyncProperty(
          uuidArb,
          objectWithSensitiveFields,
          objectWithSensitiveFields,
          async (entityId, oldValues, newValues) => {
            mockPrisma.auditLog.create.mockClear();

            await auditService.log(
              'user-123',
              'UPDATE',
              'Patient',
              entityId,
              oldValues,
              newValues,
            );

            const createCall = mockPrisma.auditLog.create.mock.calls[0][0];

            // oldValues and newValues stored should NOT contain sensitive fields
            const storedOldValues = createCall.data.oldValues;
            const storedNewValues = createCall.data.newValues;

            if (
              storedOldValues &&
              typeof storedOldValues === 'object' &&
              storedOldValues !== null
            ) {
              for (const field of SENSITIVE_FIELDS) {
                expect(storedOldValues).not.toHaveProperty(field);
              }
            }

            if (
              storedNewValues &&
              typeof storedNewValues === 'object' &&
              storedNewValues !== null
            ) {
              for (const field of SENSITIVE_FIELDS) {
                expect(storedNewValues).not.toHaveProperty(field);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
