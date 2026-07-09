import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService, SENSITIVE_FIELDS } from '../../audit/audit.service';
import { CreateVisitDto } from '../dto/create-visit.dto';
import { UpdateVisitDto } from '../dto/update-visit.dto';
import { CancelVisitDto } from '../dto/cancel-visit.dto';

const PaymentMethod = {
  CASH: 'CASH' as const,
  BPJS: 'BPJS' as const,
  INSURANCE: 'INSURANCE' as const,
};

// Generator for random IPv4 addresses
const ipAddressArb = fc
  .tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/**
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
 */
describe('Feature: visit-management, Property 12: Audit Log Completeness', () => {
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
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
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
  });

  describe('CREATE operation audit', () => {
    it('should log audit entry with action CREATE, entityName Visit, correct entityId, non-null userId, ipAddress, and no sensitive fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          ipAddressArb,
          async (patientId, userId, ipAddress) => {
            // Reset mock call history
            mockAuditService.log.mockClear();

            const visitId = 'generated-visit-id';

            // Mock patient exists
            mockPrisma.patient.findFirst.mockResolvedValue({
              id: patientId,
              deletedAt: null,
            });

            // Mock visit creation
            mockPrisma.visit.create.mockImplementation(async (args: any) => ({
              id: visitId,
              visitNumber: 'VST-202507-0001',
              status: 'REGISTERED',
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

            await visitService.create(dto, userId, ipAddress);

            // Verify auditService.log was called
            expect(mockAuditService.log).toHaveBeenCalledTimes(1);

            const [
              loggedUserId,
              loggedAction,
              loggedEntityName,
              loggedEntityId,
              loggedOldValues,
              loggedNewValues,
              loggedIpAddress,
            ] = mockAuditService.log.mock.calls[0];

            // Verify correct action
            expect(loggedAction).toBe('CREATE');

            // Verify entityName
            expect(loggedEntityName).toBe('Visit');

            // Verify entityId matches visit ID
            expect(loggedEntityId).toBe(visitId);

            // Verify non-null userId
            expect(loggedUserId).toBe(userId);
            expect(loggedUserId).not.toBeNull();

            // Verify oldValues is null for CREATE
            expect(loggedOldValues).toBeNull();

            // Verify ipAddress is passed through
            expect(loggedIpAddress).toBe(ipAddress);

            // Verify no sensitive fields in newValues
            if (loggedNewValues && typeof loggedNewValues === 'object') {
              for (const sensitiveField of SENSITIVE_FIELDS) {
                expect(loggedNewValues).not.toHaveProperty(sensitiveField);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('UPDATE operation audit', () => {
    it('should log audit entry with action UPDATE, entityName Visit, correct entityId, non-null userId, ipAddress, and no sensitive fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          ipAddressArb,
          async (visitId, patientId, userId, ipAddress) => {
            // Reset mock call history
            mockAuditService.log.mockClear();

            const existingVisit = {
              id: visitId,
              visitNumber: 'VST-202507-0001',
              status: 'REGISTERED',
              registrationDate: new Date(),
              patientId,
              paymentMethod: 'CASH',
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
            };

            // Mock visit exists
            mockPrisma.visit.findUnique.mockResolvedValue(existingVisit);

            // Mock doctor exists for reference validation
            mockPrisma.doctor.findFirst.mockResolvedValue({
              id: 'doctor-id',
              isActive: true,
              deletedAt: null,
            });

            // Mock visit update - change doctorId
            mockPrisma.visit.update.mockImplementation(async (args: any) => ({
              ...existingVisit,
              ...args.data,
              doctor: { id: 'doctor-id', name: 'Dr. Test' },
            }));

            const dto: UpdateVisitDto = {
              doctorId: 'doctor-id',
            };

            await visitService.update(visitId, dto, userId, ipAddress);

            // Verify auditService.log was called (it only logs if something changed)
            expect(mockAuditService.log).toHaveBeenCalledTimes(1);

            const [
              loggedUserId,
              loggedAction,
              loggedEntityName,
              loggedEntityId,
              loggedOldValues,
              loggedNewValues,
              loggedIpAddress,
            ] = mockAuditService.log.mock.calls[0];

            // Verify correct action
            expect(loggedAction).toBe('UPDATE');

            // Verify entityName
            expect(loggedEntityName).toBe('Visit');

            // Verify entityId matches visit ID
            expect(loggedEntityId).toBe(visitId);

            // Verify non-null userId
            expect(loggedUserId).toBe(userId);
            expect(loggedUserId).not.toBeNull();

            // Verify oldValues and newValues present for UPDATE
            expect(loggedOldValues).not.toBeNull();
            expect(loggedNewValues).not.toBeNull();

            // Verify ipAddress is passed through
            expect(loggedIpAddress).toBe(ipAddress);

            // Verify no sensitive fields in newValues
            if (loggedNewValues && typeof loggedNewValues === 'object') {
              for (const sensitiveField of SENSITIVE_FIELDS) {
                expect(loggedNewValues).not.toHaveProperty(sensitiveField);
              }
            }

            // Verify no sensitive fields in oldValues
            if (loggedOldValues && typeof loggedOldValues === 'object') {
              for (const sensitiveField of SENSITIVE_FIELDS) {
                expect(loggedOldValues).not.toHaveProperty(sensitiveField);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('CANCEL operation audit', () => {
    it('should log audit entry with action CANCEL, entityName Visit, correct entityId, non-null userId, ipAddress, and no sensitive fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 200 }),
          ipAddressArb,
          async (visitId, userId, reason, ipAddress) => {
            // Reset mock call history
            mockAuditService.log.mockClear();

            const existingVisit = {
              id: visitId,
              visitNumber: 'VST-202507-0001',
              status: 'REGISTERED',
              registrationDate: new Date(),
              patientId: 'patient-id',
              paymentMethod: 'CASH',
              doctorId: null,
              clinicId: null,
              insuranceId: null,
              bpjsNumber: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: { id: 'patient-id', name: 'Test Patient' },
              doctor: null,
              clinic: null,
              insurance: null,
            };

            // Mock visit exists
            mockPrisma.visit.findUnique.mockResolvedValue(existingVisit);

            // Mock no orders (allows cancellation)
            mockPrisma.order.findMany.mockResolvedValue([]);

            // Mock visit update (cancel)
            mockPrisma.visit.update.mockImplementation(async (args: any) => ({
              ...existingVisit,
              ...args.data,
              status: 'CANCELLED',
            }));

            const dto: CancelVisitDto = {
              reason,
            };

            await visitService.cancel(visitId, dto, userId, ipAddress);

            // Verify auditService.log was called
            expect(mockAuditService.log).toHaveBeenCalledTimes(1);

            const [
              loggedUserId,
              loggedAction,
              loggedEntityName,
              loggedEntityId,
              loggedOldValues,
              loggedNewValues,
              loggedIpAddress,
            ] = mockAuditService.log.mock.calls[0];

            // Verify correct action
            expect(loggedAction).toBe('CANCEL');

            // Verify entityName
            expect(loggedEntityName).toBe('Visit');

            // Verify entityId matches visit ID
            expect(loggedEntityId).toBe(visitId);

            // Verify non-null userId
            expect(loggedUserId).toBe(userId);
            expect(loggedUserId).not.toBeNull();

            // Verify newValues contains cancelReason and cancelledAt
            expect(loggedNewValues).toHaveProperty('cancelReason', reason);
            expect(loggedNewValues).toHaveProperty('cancelledAt');

            // Verify ipAddress is passed through
            expect(loggedIpAddress).toBe(ipAddress);

            // Verify no sensitive fields in newValues
            if (loggedNewValues && typeof loggedNewValues === 'object') {
              for (const sensitiveField of SENSITIVE_FIELDS) {
                expect(loggedNewValues).not.toHaveProperty(sensitiveField);
              }
            }

            // Verify no sensitive fields in oldValues
            if (loggedOldValues && typeof loggedOldValues === 'object') {
              for (const sensitiveField of SENSITIVE_FIELDS) {
                expect(loggedOldValues).not.toHaveProperty(sensitiveField);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
