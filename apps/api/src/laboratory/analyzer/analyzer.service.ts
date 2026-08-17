import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Flag, ResultType, OrderDetailStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BatchImportResultDto } from './dto/batch-import-result.dto';
import { CsvResultRowDto } from './dto/csv-result-row.dto';
import { SingleResultDto } from './dto/single-result.dto';

/**
 * AnalyzerService handles batch result import from laboratory analyzers.
 *
 * Responsibilities:
 * - Parse CSV file uploads into structured rows
 * - Validate each row against test configuration (resultType, qualitativeOptions)
 * - Apply auto-flagging based on reference ranges (NORMAL, HIGH, LOW, CRITICAL)
 * - Persist valid results within a single database transaction
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7
 */
@Injectable()
export class AnalyzerService {
  private readonly logger = new Logger(AnalyzerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import batch results from a CSV file upload.
   *
   * Process:
   * 1. Parse CSV content into structured rows
   * 2. Validate each row against test configuration
   * 3. Apply auto-flagging for numeric results
   * 4. Persist all valid rows in a single database transaction
   *
   * Invalid rows are collected as errors but do not fail the batch.
   * Only valid rows are persisted. The entire set of valid rows is
   * wrapped in a Prisma transaction for atomicity.
   */
  async importBatchResults(
    file: Express.Multer.File,
    userId: string,
  ): Promise<BatchImportResultDto> {
    // Parse CSV content
    const rows = this.parseCsv(file.buffer.toString('utf-8'));

    if (rows.length === 0) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: 'CSV file is empty or contains no data rows',
      });
    }

    const result: BatchImportResultDto = {
      totalRows: rows.length,
      successCount: 0,
      errorCount: 0,
      errors: [],
    };

    // Pre-validate all rows and collect valid ones
    const validatedRows: Array<{
      row: CsvResultRowDto;
      rowNumber: number;
      testConfig: any;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      // Fetch test configuration for validation
      const testConfig = await this.prisma.testMaster.findFirst({
        where: { code: row.testCode, isActive: true },
      });

      const validationError = this.validateRow(row, testConfig);
      if (validationError) {
        result.errorCount++;
        result.errors.push({
          row: rowNumber,
          field: validationError.field,
          message: validationError.message,
        });
        continue;
      }

      validatedRows.push({ row, rowNumber, testConfig });
    }

    // If no valid rows, return early without a transaction
    if (validatedRows.length === 0) {
      return result;
    }

    // Persist all valid rows within a single transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const { row, rowNumber, testConfig } of validatedRows) {
        // Find the matching OrderDetail
        const orderDetail = await tx.orderDetail.findFirst({
          where: {
            order: { orderNumber: row.orderNumber },
            test: { code: row.testCode },
          },
          include: {
            order: {
              include: { patient: true },
            },
          },
        });

        if (!orderDetail) {
          result.errorCount++;
          result.errors.push({
            row: rowNumber,
            field: 'orderNumber/testCode',
            message: `No matching order detail found for order "${row.orderNumber}" and test "${row.testCode}"`,
          });
          continue;
        }

        // Apply auto-flagging based on reference ranges
        const flag = await this.applyAutoFlagging(
          row.resultValue,
          orderDetail.testId,
          orderDetail.order.patient.id,
          tx,
        );

        // Persist the result on the OrderDetail
        await tx.orderDetail.update({
          where: { id: orderDetail.id },
          data: {
            resultValue: row.resultValue,
            flag,
            resultEnteredAt: new Date(),
            resultEnteredBy: userId,
            status: OrderDetailStatus.RESULT_ENTERED,
          },
        });

        result.successCount++;
      }
    });

    // Adjust error count — some rows may have failed inside the transaction
    // (e.g., no matching order detail found)
    result.errorCount = result.totalRows - result.successCount;

    this.logger.log(
      `Batch import completed: ${result.successCount}/${result.totalRows} rows imported successfully`,
    );

    return result;
  }

  /**
   * Validate a single CSV result row against its test configuration.
   *
   * Validation rules:
   * - testCode must exist and have a valid test configuration
   * - NUMERIC: resultValue must be a parseable number
   * - QUALITATIVE: resultValue must be in the qualitativeOptions list
   * - TEXT: resultValue must be a non-empty string
   */
  validateRow(
    row: CsvResultRowDto,
    testConfig: any | null,
  ): { field: string; message: string } | null {
    // Check that testCode exists
    if (!testConfig) {
      return {
        field: 'testCode',
        message: `Test code "${row.testCode}" not found or is inactive`,
      };
    }

    // Validate based on resultType
    switch (testConfig.resultType) {
      case ResultType.NUMERIC: {
        const numericValue = parseFloat(row.resultValue);
        if (isNaN(numericValue)) {
          return {
            field: 'resultValue',
            message: `Result value "${row.resultValue}" is not a valid number for NUMERIC test "${row.testCode}"`,
          };
        }
        break;
      }

      case ResultType.QUALITATIVE: {
        const options: string[] = testConfig.qualitativeOptions ?? [];
        if (options.length > 0 && !options.includes(row.resultValue)) {
          return {
            field: 'resultValue',
            message: `Result "${row.resultValue}" is not a valid option for qualitative test "${row.testCode}". Allowed: ${options.join(', ')}`,
          };
        }
        break;
      }

      case ResultType.TEXT: {
        if (!row.resultValue || row.resultValue.trim().length === 0) {
          return {
            field: 'resultValue',
            message: `Result value cannot be empty for TEXT test "${row.testCode}"`,
          };
        }
        break;
      }
    }

    // Validate orderNumber is provided
    if (!row.orderNumber || row.orderNumber.trim().length === 0) {
      return {
        field: 'orderNumber',
        message: 'orderNumber is required',
      };
    }

    return null;
  }

  /**
   * Apply auto-flagging by comparing the result value against configured reference ranges.
   *
   * Resolution strategy:
   * 1. Query ReferenceValue records for the test
   * 2. Match by patient demographics (age, gender) if available
   * 3. Compare value against minRef/maxRef/criticalMin/criticalMax
   * 4. Return appropriate Flag (NORMAL, HIGH, LOW, CRITICAL)
   *
   * For non-numeric results, returns null (no flag assigned).
   */
  async applyAutoFlagging(
    resultValue: string,
    testId: string,
    patientId: string,
    tx?: any,
  ): Promise<Flag | null> {
    const db = tx || this.prisma;

    const numericValue = parseFloat(resultValue);

    // If result is not numeric, skip auto-flagging
    if (isNaN(numericValue)) {
      return null;
    }

    // Get patient demographics for reference range matching
    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { dateOfBirth: true, gender: true },
    });

    if (!patient) {
      return null;
    }

    const patientAge = this.calculateAge(patient.dateOfBirth);

    // Query reference values for this test matching patient age range
    const referenceValues = await db.referenceValue.findMany({
      where: {
        testId,
        minAge: { lte: patientAge },
        maxAge: { gte: patientAge },
      },
    });

    if (!referenceValues || referenceValues.length === 0) {
      return null;
    }

    // Prefer gender-specific match, then gender-neutral
    const genderSpecific = referenceValues.find(
      (r: any) => r.gender === patient.gender,
    );
    const ref = genderSpecific ?? referenceValues[0];

    if (!ref) {
      return null;
    }

    // Priority: CRITICAL checks first (life-threatening thresholds)
    if (ref.criticalMin !== null && numericValue < Number(ref.criticalMin)) {
      return Flag.CRITICAL;
    }

    if (ref.criticalMax !== null && numericValue > Number(ref.criticalMax)) {
      return Flag.CRITICAL;
    }

    // Then LOW/HIGH checks against normal range
    if (numericValue < Number(ref.minRef)) {
      return Flag.LOW;
    }

    if (numericValue > Number(ref.maxRef)) {
      return Flag.HIGH;
    }

    // Within normal range
    return Flag.NORMAL;
  }

  /**
   * Parse CSV content into structured rows.
   * Expects header row with columns: orderNumber, testCode, resultValue, analyzedAt (optional), analyzerCode (optional)
   * Supports both comma and semicolon delimiters.
   */
  private parseCsv(content: string): CsvResultRowDto[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return []; // Need at least header + 1 data row
    }

    // Detect delimiter (comma or semicolon)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    // Parse header to determine column mapping
    const headers = headerLine
      .split(delimiter)
      .map((h) => h.trim().toLowerCase());

    const orderNumberIdx = headers.findIndex(
      (h) => h === 'ordernumber' || h === 'order_number' || h === 'order',
    );
    const testCodeIdx = headers.findIndex(
      (h) => h === 'testcode' || h === 'test_code' || h === 'test',
    );
    const resultValueIdx = headers.findIndex(
      (h) => h === 'resultvalue' || h === 'result_value' || h === 'result' || h === 'value',
    );
    const analyzedAtIdx = headers.findIndex(
      (h) => h === 'analyzedat' || h === 'analyzed_at' || h === 'date',
    );
    const analyzerCodeIdx = headers.findIndex(
      (h) => h === 'analyzercode' || h === 'analyzer_code' || h === 'analyzer',
    );

    if (orderNumberIdx === -1 || testCodeIdx === -1 || resultValueIdx === -1) {
      return []; // Required headers not found
    }

    const rows: CsvResultRowDto[] = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(delimiter).map((c) => c.trim());

      const row: CsvResultRowDto = {
        orderNumber: columns[orderNumberIdx] ?? '',
        testCode: columns[testCodeIdx] ?? '',
        resultValue: columns[resultValueIdx] ?? '',
      };

      if (analyzedAtIdx !== -1 && columns[analyzedAtIdx]) {
        row.analyzedAt = columns[analyzedAtIdx];
      }

      if (analyzerCodeIdx !== -1 && columns[analyzerCodeIdx]) {
        row.analyzerCode = columns[analyzerCodeIdx];
      }

      rows.push(row);
    }

    return rows;
  }

  /**
   * Calculate patient age from date of birth.
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age--;
    }
    return age;
  }

  /**
   * Enter a single result from an analyzer.
   *
   * Validates the test configuration, applies auto-flagging, and persists the result.
   * This is the programmatic equivalent of a single-row CSV import.
   */
  async enterSingleResult(
    dto: SingleResultDto,
    userId: string,
  ): Promise<{ orderDetailId: string; flag: Flag | null }> {
    // Fetch test configuration
    const testConfig = await this.prisma.testMaster.findFirst({
      where: { code: dto.testCode, isActive: true },
    });

    const validationError = this.validateRow(dto, testConfig);
    if (validationError) {
      throw new BadRequestException({
        errorCode: 'ERR_VALIDATION',
        message: validationError.message,
        details: { field: validationError.field },
      });
    }

    // Find the matching OrderDetail
    const orderDetail = await this.prisma.orderDetail.findFirst({
      where: {
        order: { orderNumber: dto.orderNumber },
        test: { code: dto.testCode },
      },
      include: {
        order: {
          include: { patient: true },
        },
      },
    });

    if (!orderDetail) {
      throw new NotFoundException({
        errorCode: 'ERR_NOT_FOUND',
        message: `No matching order detail found for order "${dto.orderNumber}" and test "${dto.testCode}"`,
      });
    }

    // Apply auto-flagging
    const flag = await this.applyAutoFlagging(
      dto.resultValue,
      orderDetail.testId,
      orderDetail.order.patient.id,
    );

    // Persist the result
    await this.prisma.orderDetail.update({
      where: { id: orderDetail.id },
      data: {
        resultValue: dto.resultValue,
        flag,
        resultEnteredAt: new Date(),
        resultEnteredBy: userId,
        status: OrderDetailStatus.RESULT_ENTERED,
      },
    });

    this.logger.log(
      `Single result entered for order ${dto.orderNumber}, test ${dto.testCode}`,
    );

    return { orderDetailId: orderDetail.id, flag };
  }

  /**
   * Get import history by querying audit logs for BATCH_IMPORT actions.
   * Returns a list of previous imports with summary stats.
   */
  async getImportHistory(query?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          action: 'BATCH_IMPORT',
          entityName: 'OrderDetail',
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'BATCH_IMPORT',
          entityName: 'OrderDetail',
        },
      }),
    ]);

    return { data, total, page, limit };
  }
}
