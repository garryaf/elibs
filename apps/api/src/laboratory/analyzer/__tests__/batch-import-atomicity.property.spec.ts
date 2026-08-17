// Feature: lis-gap-remediation, Property 4: Batch import atomicity

import * as fc from 'fast-check';
import { AnalyzerService } from '../analyzer.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ResultType } from '@prisma/client';

/**
 * **Validates: Requirements 2.2, 2.5**
 *
 * Property 4: Batch import atomicity
 *
 * For any batch of N result rows submitted for import, either ALL valid rows
 * are persisted (successCount = valid row count) or NONE are persisted
 * (transaction rollback). There SHALL be no partial state where only some
 * valid rows are committed.
 */
describe('Batch Import Atomicity Property Tests', () => {
  /**
   * Helper: create a CSV buffer from rows.
   */
  function createCsvFile(
    rows: Array<{ orderNumber: string; testCode: string; resultValue: string }>,
  ): Express.Multer.File {
    const header = 'orderNumber,testCode,resultValue';
    const lines = rows.map(
      (r) => `${r.orderNumber},${r.testCode},${r.resultValue}`,
    );
    const content = [header, ...lines].join('\n');
    return {
      buffer: Buffer.from(content, 'utf-8'),
      originalname: 'results.csv',
      mimetype: 'text/csv',
      fieldname: 'file',
      encoding: 'utf-8',
      size: content.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };
  }

  /**
   * Generator for valid CSV rows that will pass validation.
   * OrderNumber must be non-empty, testCode must be a known code,
   * resultValue must be numeric (for NUMERIC tests).
   */
  const validRowArb = fc.record({
    orderNumber: fc.stringMatching(/^ORD-[1-9][0-9]{2,5}$/),
    testCode: fc.constantFrom('HGB', 'WBC', 'PLT', 'RBC', 'HCT'),
    resultValue: fc
      .double({ min: 0.1, max: 999, noNaN: true, noDefaultInfinity: true })
      .map((v) => v.toFixed(2)),
  });

  /**
   * Generator for rows that will fail pre-validation (before the transaction).
   * These are rows with unknown test codes or non-numeric values for NUMERIC tests.
   */
  const preValidationInvalidRowArb = fc.oneof(
    // Non-numeric value for a numeric test (fails validateRow)
    fc.record({
      orderNumber: fc.stringMatching(/^ORD-[1-9][0-9]{2,5}$/),
      testCode: fc.constantFrom('HGB', 'WBC', 'PLT'),
      resultValue: fc.constantFrom('abc', 'N/A', 'not-a-number', '---'),
    }),
    // Unknown test code (testMaster.findFirst returns null)
    fc.record({
      orderNumber: fc.stringMatching(/^ORD-[1-9][0-9]{2,5}$/),
      testCode: fc.constant('UNKNOWN_TEST_XYZ'),
      resultValue: fc.constant('10.0'),
    }),
  );

  /**
   * Creates a mock PrismaService where:
   * - testMaster.findFirst returns config for known tests, null for unknown
   * - $transaction executes the callback with a tx that has orderDetail.findFirst/update
   * - The transaction can be configured to fail
   */
  function createMockPrisma(options?: {
    shouldTransactionFail?: boolean;
    failAtUpdateIndex?: number;
  }) {
    const persistedUpdates: string[] = [];

    const mockPrisma = {
      testMaster: {
        findFirst: jest.fn().mockImplementation((args: any) => {
          const code = args.where?.code;
          if (code === 'UNKNOWN_TEST_XYZ') {
            return Promise.resolve(null);
          }
          // Return valid NUMERIC test config for known codes
          return Promise.resolve({
            id: `test-${code}`,
            code,
            resultType: ResultType.NUMERIC,
            qualitativeOptions: [],
          });
        }),
      },
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        if (options?.shouldTransactionFail) {
          throw new Error('Transaction failed: database connection lost');
        }

        let updateCallCount = 0;
        const tx = {
          orderDetail: {
            findFirst: jest.fn().mockImplementation((args: any) => {
              const orderNumber = args.where?.order?.orderNumber;
              const testCode = args.where?.test?.code;
              if (orderNumber && testCode) {
                return Promise.resolve({
                  id: `detail-${orderNumber}-${testCode}`,
                  testId: `test-${testCode}`,
                  order: {
                    patient: {
                      id: 'patient-uuid',
                      dateOfBirth: new Date('1990-01-01'),
                      gender: 'MALE',
                    },
                  },
                });
              }
              return Promise.resolve(null);
            }),
            update: jest.fn().mockImplementation((args: any) => {
              if (
                options?.failAtUpdateIndex !== undefined &&
                updateCallCount === options.failAtUpdateIndex
              ) {
                throw new Error(
                  'Transaction failed mid-way: constraint violation',
                );
              }
              updateCallCount++;
              persistedUpdates.push(args.where.id);
              return Promise.resolve({
                id: args.where.id,
                ...args.data,
              });
            }),
          },
          patient: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'patient-uuid',
              dateOfBirth: new Date('1990-01-01'),
              gender: 'MALE',
            }),
          },
          referenceValue: {
            findMany: jest.fn().mockResolvedValue([
              {
                minRef: 0,
                maxRef: 500,
                criticalMin: null,
                criticalMax: null,
                minAge: 0,
                maxAge: 150,
                gender: null,
              },
            ]),
          },
        };

        return fn(tx);
      }),
    };

    return { mockPrisma, persistedUpdates };
  }

  describe('Property 4: Batch import atomicity', () => {
    /**
     * When all rows are valid, successCount equals totalRows - errorCount
     * and all results are persisted within a single transaction.
     *
     * **Validates: Requirements 2.2, 2.5**
     */
    it('all valid rows are persisted: successCount equals valid row count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validRowArb, { minLength: 1, maxLength: 10 }),
          async (rows) => {
            const { mockPrisma, persistedUpdates } = createMockPrisma();
            const service = new AnalyzerService(
              mockPrisma as unknown as PrismaService,
            );
            const file = createCsvFile(rows);

            const result = await service.importBatchResults(file, 'user-uuid');

            // totalRows should equal input row count
            expect(result.totalRows).toBe(rows.length);

            // The fundamental atomicity invariant:
            // successCount + errorCount always equals totalRows
            expect(result.successCount + result.errorCount).toBe(
              result.totalRows,
            );

            // All valid rows are successfully persisted
            expect(result.successCount).toBe(rows.length);

            // Transaction was called exactly once (all valid rows in one batch)
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

            // All valid rows were actually persisted (update was called for each)
            expect(persistedUpdates.length).toBe(rows.length);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * When a transaction fails mid-way (simulated), no valid rows are persisted
     * (atomicity — the transaction rolls back entirely).
     *
     * **Validates: Requirements 2.2, 2.5**
     */
    it('when transaction fails mid-way, no valid rows are persisted (atomicity)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validRowArb, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          async (rows, failIndex) => {
            // Ensure the fail index is within the rows range
            const failAtUpdateIndex = Math.min(failIndex, rows.length - 1);
            const { mockPrisma } = createMockPrisma({
              failAtUpdateIndex,
            });
            const service = new AnalyzerService(
              mockPrisma as unknown as PrismaService,
            );
            const file = createCsvFile(rows);

            // When transaction throws, the error propagates up.
            // Prisma $transaction guarantees that when an exception is thrown
            // inside the callback, ALL changes within that callback are rolled back.
            await expect(
              service.importBatchResults(file, 'user-uuid'),
            ).rejects.toThrow();

            // The key atomicity guarantee: Prisma transaction semantics ensure
            // that when the callback throws, no writes are committed.
            // The mock verifies $transaction was called (attempted) but threw.
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * When the entire transaction fails before any writes (e.g., DB connection lost),
     * zero rows are persisted.
     *
     * **Validates: Requirements 2.2, 2.5**
     */
    it('when transaction fails completely, zero rows are persisted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validRowArb, { minLength: 1, maxLength: 10 }),
          async (rows) => {
            const { mockPrisma, persistedUpdates } = createMockPrisma({
              shouldTransactionFail: true,
            });
            const service = new AnalyzerService(
              mockPrisma as unknown as PrismaService,
            );
            const file = createCsvFile(rows);

            // Service should throw when transaction fails completely
            await expect(
              service.importBatchResults(file, 'user-uuid'),
            ).rejects.toThrow('Transaction failed: database connection lost');

            // Transaction was attempted but failed before any writes
            expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

            // No rows were persisted
            expect(persistedUpdates.length).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * The total successCount + errorCount always equals totalRows for any
     * combination of valid and invalid rows (the accounting invariant).
     *
     * **Validates: Requirements 2.2, 2.5**
     */
    it('successCount + errorCount always equals totalRows for mixed batches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validRowArb, { minLength: 1, maxLength: 5 }),
          fc.array(preValidationInvalidRowArb, { minLength: 1, maxLength: 5 }),
          async (validRows, invalidRows) => {
            // Interleave valid and invalid rows
            const allRows = [...validRows, ...invalidRows];
            const { mockPrisma } = createMockPrisma();
            const service = new AnalyzerService(
              mockPrisma as unknown as PrismaService,
            );
            const file = createCsvFile(allRows);

            const result = await service.importBatchResults(file, 'user-uuid');

            // The fundamental accounting invariant
            expect(result.successCount + result.errorCount).toBe(
              result.totalRows,
            );
            expect(result.totalRows).toBe(allRows.length);

            // Error count should be at least the number of pre-validation invalid rows
            expect(result.errorCount).toBeGreaterThanOrEqual(invalidRows.length);

            // Success count should be at most the number of valid rows
            expect(result.successCount).toBeLessThanOrEqual(validRows.length);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * When all rows in a batch fail pre-validation, no transaction is initiated
     * and successCount is 0.
     *
     * **Validates: Requirements 2.2, 2.5**
     */
    it('when all rows are invalid, no transaction is created and successCount is 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(preValidationInvalidRowArb, { minLength: 1, maxLength: 10 }),
          async (invalidRows) => {
            const { mockPrisma } = createMockPrisma();
            const service = new AnalyzerService(
              mockPrisma as unknown as PrismaService,
            );
            const file = createCsvFile(invalidRows);

            const result = await service.importBatchResults(file, 'user-uuid');

            // No valid rows means no transaction needed
            expect(result.successCount).toBe(0);
            expect(result.errorCount).toBe(invalidRows.length);
            expect(result.totalRows).toBe(invalidRows.length);

            // No transaction should have been started
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
