import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { VisitService } from '../visit.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { VisitNumberGeneratorService } from '../visit-number-generator.service';
import { AuditService } from '../../audit/audit.service';
import { VisitQueryDto } from '../dto/visit-query.dto';

// Use string literals for enums to avoid Prisma client import issues in tests
const VisitStatus = {
  REGISTERED: 'REGISTERED' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

const PaymentMethod = {
  CASH: 'CASH' as const,
  BPJS: 'BPJS' as const,
  INSURANCE: 'INSURANCE' as const,
};

type VisitRecord = {
  id: string;
  visitNumber: string;
  status: string;
  registrationDate: Date;
  patientId: string;
  doctorId: string | null;
  clinicId: string | null;
  paymentMethod: string;
  insuranceId: string | null;
  bpjsNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; name: string; mrn: string };
  doctor: { id: string; name: string } | null;
  clinic: { id: string; name: string } | null;
  insurance: { id: string; name: string } | null;
};

/**
 * Helper: generate a random visit record for testing
 */
function visitRecordArb(overrides?: Partial<{
  status: string;
  doctorId: string | null;
  clinicId: string | null;
  registrationDate: Date;
  patientName: string;
  patientMrn: string;
  visitNumber: string;
}>): fc.Arbitrary<VisitRecord> {
  return fc.record({
    id: fc.uuid(),
    visitNumber: overrides?.visitNumber
      ? fc.constant(overrides.visitNumber)
      : fc.integer({ min: 1, max: 9999 }).map(
          (seq) => `VST-202507-${seq.toString().padStart(4, '0')}`,
        ),
    status: overrides?.status
      ? fc.constant(overrides.status)
      : fc.constantFrom(
          VisitStatus.REGISTERED,
          VisitStatus.IN_PROGRESS,
          VisitStatus.COMPLETED,
          VisitStatus.CANCELLED,
        ),
    registrationDate: overrides?.registrationDate
      ? fc.constant(overrides.registrationDate)
      : fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
    patientId: fc.uuid(),
    doctorId: overrides?.doctorId !== undefined
      ? fc.constant(overrides.doctorId)
      : fc.option(fc.uuid(), { nil: null }),
    clinicId: overrides?.clinicId !== undefined
      ? fc.constant(overrides.clinicId)
      : fc.option(fc.uuid(), { nil: null }),
    paymentMethod: fc.constantFrom(PaymentMethod.CASH, PaymentMethod.BPJS, PaymentMethod.INSURANCE),
    insuranceId: fc.option(fc.uuid(), { nil: null }),
    bpjsNumber: fc.option(
      fc.stringMatching(/^\d{13}$/),
      { nil: null },
    ),
    createdAt: fc.constant(new Date()),
    updatedAt: fc.constant(new Date()),
    patient: fc.record({
      id: fc.uuid(),
      name: overrides?.patientName
        ? fc.constant(overrides.patientName)
        : fc.string({ minLength: 2, maxLength: 30 }),
      mrn: overrides?.patientMrn
        ? fc.constant(overrides.patientMrn)
        : fc.stringMatching(/^\d{6,10}$/),
    }),
    doctor: fc.option(
      fc.record({ id: fc.uuid(), name: fc.string({ minLength: 2, maxLength: 20 }) }),
      { nil: null },
    ),
    clinic: fc.option(
      fc.record({ id: fc.uuid(), name: fc.string({ minLength: 2, maxLength: 20 }) }),
      { nil: null },
    ),
    insurance: fc.option(
      fc.record({ id: fc.uuid(), name: fc.string({ minLength: 2, maxLength: 20 }) }),
      { nil: null },
    ),
  });
}

/**
 * **Validates: Requirements 5.3, 5.4, 5.5, 5.6**
 */
describe('Feature: visit-management, Property 10: Query Filter Correctness', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      clinic: { findFirst: jest.fn() },
      insurance: { findFirst: jest.fn() },
      visit: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: { findMany: jest.fn() },
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
        { provide: VisitNumberGeneratorService, useValue: mockVisitNumberGenerator },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should return only visits satisfying all applied filter predicates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a dataset of visits
        fc.array(visitRecordArb(), { minLength: 1, maxLength: 20 }),
        // Generate random filter combination
        fc.record({
          status: fc.option(
            fc.constantFrom(
              VisitStatus.REGISTERED,
              VisitStatus.IN_PROGRESS,
              VisitStatus.COMPLETED,
              VisitStatus.CANCELLED,
            ),
            { nil: undefined },
          ),
          doctorId: fc.option(fc.uuid(), { nil: undefined }),
          clinicId: fc.option(fc.uuid(), { nil: undefined }),
          startDate: fc.option(
            fc.integer({ min: 0, max: 729 }).map((dayOffset) => {
              const d = new Date('2024-01-01T00:00:00.000Z');
              d.setUTCDate(d.getUTCDate() + dayOffset);
              return d.toISOString().split('T')[0];
            }),
            { nil: undefined },
          ),
          endDate: fc.option(
            fc.integer({ min: 0, max: 729 }).map((dayOffset) => {
              const d = new Date('2025-01-01T00:00:00.000Z');
              d.setUTCDate(d.getUTCDate() + dayOffset);
              return d.toISOString().split('T')[0];
            }),
            { nil: undefined },
          ),
        }),
        async (dataset, filters) => {
          // Reset mocks between iterations
          mockPrisma.visit.findMany.mockReset();
          mockPrisma.visit.count.mockReset();

          // Apply filters in-memory to determine expected results
          let expected = [...dataset];

          if (filters.status) {
            expected = expected.filter((v) => v.status === filters.status);
          }
          if (filters.doctorId) {
            expected = expected.filter((v) => v.doctorId === filters.doctorId);
          }
          if (filters.clinicId) {
            expected = expected.filter((v) => v.clinicId === filters.clinicId);
          }
          if (filters.startDate) {
            const start = new Date(filters.startDate + 'T00:00:00.000+07:00');
            expected = expected.filter((v) => v.registrationDate >= start);
          }
          if (filters.endDate) {
            const end = new Date(filters.endDate + 'T23:59:59.999+07:00');
            expected = expected.filter((v) => v.registrationDate <= end);
          }

          // Mock Prisma to return the filtered dataset (simulating what Prisma would do)
          mockPrisma.visit.findMany.mockResolvedValue(expected.slice(0, 20));
          mockPrisma.visit.count.mockResolvedValue(expected.length);

          const query: VisitQueryDto = {
            page: 1,
            limit: 20,
            status: filters.status as any,
            doctorId: filters.doctorId,
            clinicId: filters.clinicId,
            startDate: filters.startDate,
            endDate: filters.endDate,
          };

          const result = await visitService.findAll(query);

          // Verify: all returned visits satisfy every applied predicate
          for (const visit of result.data) {
            if (filters.status) {
              expect(visit.status).toBe(filters.status);
            }
            if (filters.doctorId) {
              expect(visit.doctorId).toBe(filters.doctorId);
            }
            if (filters.clinicId) {
              expect(visit.clinicId).toBe(filters.clinicId);
            }
            if (filters.startDate) {
              const startDate = new Date(filters.startDate);
              expect(new Date(visit.registrationDate).getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            }
            if (filters.endDate) {
              const endDate = new Date(filters.endDate + 'T23:59:59.999Z');
              expect(new Date(visit.registrationDate).getTime()).toBeLessThanOrEqual(endDate.getTime());
            }
          }

          // Verify the Prisma where clause was constructed correctly
          const calls = mockPrisma.visit.findMany.mock.calls;
          const findManyCall = calls[calls.length - 1][0];
          const where = findManyCall.where;

          if (filters.status) {
            expect(where.status).toBe(filters.status);
          }
          if (filters.doctorId) {
            expect(where.doctorId).toBe(filters.doctorId);
          }
          if (filters.clinicId) {
            expect(where.clinicId).toBe(filters.clinicId);
          }
          if (filters.startDate) {
            expect(where.registrationDate.gte).toEqual(new Date(filters.startDate + 'T00:00:00.000+07:00'));
          }
          if (filters.endDate) {
            expect(where.registrationDate.lte).toEqual(new Date(filters.endDate + 'T23:59:59.999+07:00'));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 5.1**
 */
describe('Feature: visit-management, Property 11: Pagination Invariants', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      clinic: { findFirst: jest.fn() },
      insurance: { findFirst: jest.fn() },
      visit: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: { findMany: jest.fn() },
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
        { provide: VisitNumberGeneratorService, useValue: mockVisitNumberGenerator },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should satisfy: data.length <= limit, meta.total == N, meta.totalPages == ceil(N/limit)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Total number of visits in the dataset
        fc.integer({ min: 0, max: 200 }),
        // Page number
        fc.integer({ min: 1, max: 20 }),
        // Limit (1 to 100)
        fc.integer({ min: 1, max: 100 }),
        async (totalVisits, page, limit) => {
          // Reset mocks between iterations
          mockPrisma.visit.findMany.mockReset();
          mockPrisma.visit.count.mockReset();

          // Calculate how many items would be on this page
          const skip = (page - 1) * limit;
          const remainingAfterSkip = Math.max(0, totalVisits - skip);
          const expectedPageSize = Math.min(limit, remainingAfterSkip);

          // Generate mock data for the current page
          const pageData: VisitRecord[] = [];
          for (let i = 0; i < expectedPageSize; i++) {
            pageData.push({
              id: `visit-${i}`,
              visitNumber: `VST-202507-${(i + 1).toString().padStart(4, '0')}`,
              status: VisitStatus.REGISTERED,
              registrationDate: new Date(),
              patientId: `patient-${i}`,
              doctorId: null,
              clinicId: null,
              paymentMethod: PaymentMethod.CASH,
              insuranceId: null,
              bpjsNumber: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: { id: `patient-${i}`, name: `Patient ${i}`, mrn: `MRN${i}` },
              doctor: null,
              clinic: null,
              insurance: null,
            });
          }

          // Mock Prisma
          mockPrisma.visit.findMany.mockResolvedValue(pageData);
          mockPrisma.visit.count.mockResolvedValue(totalVisits);

          const query: VisitQueryDto = { page, limit };
          const result = await visitService.findAll(query);

          // Property assertions
          // 1. data.length <= limit
          expect(result.data.length).toBeLessThanOrEqual(limit);

          // 2. meta.total == N (total count in database)
          expect(result.meta.total).toBe(totalVisits);

          // 3. meta.totalPages == ceil(N / limit)
          const expectedTotalPages = Math.ceil(totalVisits / limit) || 0;
          expect(result.meta.totalPages).toBe(expectedTotalPages);

          // 4. meta.page == requested page
          expect(result.meta.page).toBe(page);

          // 5. meta.limit == effective limit (capped at 100)
          expect(result.meta.limit).toBe(Math.min(limit, 100));

          // 6. data.length == min(limit, max(0, total - skip))
          expect(result.data.length).toBe(expectedPageSize);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * **Validates: Requirements 5.2**
 */
describe('Feature: visit-management, Property 13: Search Results Relevance', () => {
  let visitService: VisitService;
  let mockPrisma: any;
  let mockVisitNumberGenerator: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockPrisma = {
      patient: { findFirst: jest.fn() },
      doctor: { findFirst: jest.fn() },
      clinic: { findFirst: jest.fn() },
      insurance: { findFirst: jest.fn() },
      visit: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: { findMany: jest.fn() },
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
        { provide: VisitNumberGeneratorService, useValue: mockVisitNumberGenerator },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    visitService = module.get<VisitService>(VisitService);
  });

  it('should construct correct OR search clause for patient name, MRN, or visitNumber', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a non-empty search term (alphanumeric to avoid regex issues)
        fc.stringMatching(/^[a-jA-J0-9]{1,10}$/),
        async (searchTerm) => {
          // Reset mocks between iterations
          mockPrisma.visit.findMany.mockReset();
          mockPrisma.visit.count.mockReset();

          // Create mock results that contain the search term
          const matchingVisits: VisitRecord[] = [
            {
              id: 'visit-1',
              visitNumber: `VST-202507-0001`,
              status: VisitStatus.REGISTERED,
              registrationDate: new Date(),
              patientId: 'patient-1',
              doctorId: null,
              clinicId: null,
              paymentMethod: PaymentMethod.CASH,
              insuranceId: null,
              bpjsNumber: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: { id: 'patient-1', name: `Patient ${searchTerm} Name`, mrn: 'MRN001' },
              doctor: null,
              clinic: null,
              insurance: null,
            },
            {
              id: 'visit-2',
              visitNumber: `VST-202507-0002`,
              status: VisitStatus.IN_PROGRESS,
              registrationDate: new Date(),
              patientId: 'patient-2',
              doctorId: null,
              clinicId: null,
              paymentMethod: PaymentMethod.CASH,
              insuranceId: null,
              bpjsNumber: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: { id: 'patient-2', name: 'Another Patient', mrn: `MRN${searchTerm}` },
              doctor: null,
              clinic: null,
              insurance: null,
            },
          ];

          mockPrisma.visit.findMany.mockResolvedValue(matchingVisits);
          mockPrisma.visit.count.mockResolvedValue(matchingVisits.length);

          const query: VisitQueryDto = { search: searchTerm };
          const result = await visitService.findAll(query);

          // Verify the search OR clause was constructed correctly
          const calls = mockPrisma.visit.findMany.mock.calls;
          const findManyCall = calls[calls.length - 1][0];
          const where = findManyCall.where;

          // The where clause must have an OR with three conditions
          expect(where.OR).toBeDefined();
          expect(where.OR).toHaveLength(3);

          // Check OR conditions structure
          expect(where.OR[0]).toEqual({
            patient: { name: { contains: searchTerm, mode: 'insensitive' } },
          });
          expect(where.OR[1]).toEqual({
            patient: { mrn: { contains: searchTerm, mode: 'insensitive' } },
          });
          expect(where.OR[2]).toEqual({
            visitNumber: { contains: searchTerm, mode: 'insensitive' },
          });

          // Verify all returned results contain the search term in at least one field
          // (This verifies the mock returns are relevant - in real DB, Prisma would handle this)
          for (const visit of result.data) {
            const nameMatch = (visit as any).patient.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
            const mrnMatch = (visit as any).patient.mrn
              .toLowerCase()
              .includes(searchTerm.toLowerCase());
            const visitNumberMatch = visit.visitNumber
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

            expect(nameMatch || mrnMatch || visitNumberMatch).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
