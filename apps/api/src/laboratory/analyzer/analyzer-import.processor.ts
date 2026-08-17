import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { AnalyzerService } from './analyzer.service';
import { AuditService } from '../audit/audit.service';
import { BatchImportResultDto } from './dto/batch-import-result.dto';

/**
 * Job data for the analyzer-batch-import queue.
 * Used for processing large CSV files asynchronously.
 */
export interface AnalyzerBatchImportJobData {
  /** Path to the temporary CSV file on disk */
  filePath: string;
  /** ID of the user who initiated the import */
  userId: string;
  /** Original filename as uploaded by the user */
  originalFilename: string;
}

export interface AnalyzerBatchImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; field: string; message: string }[];
  processedAt: string;
  originalFilename: string;
}

/**
 * BullMQ Processor for async batch import of analyzer results from large CSV files.
 *
 * This processor handles CSV files that are too large for synchronous import.
 * The controller saves large files to a temporary location and enqueues a job
 * with the file path. This processor reads the file, delegates parsing and
 * persistence to AnalyzerService.importBatchResults(), logs the result, and
 * cleans up the temporary file.
 *
 * Concurrency: 2 (limits concurrent file processing to avoid memory pressure)
 * Requirements: 2.1, 2.2
 */
@Processor('analyzer-batch-import', { concurrency: 2 })
export class AnalyzerImportProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyzerImportProcessor.name);

  constructor(
    private readonly analyzerService: AnalyzerService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(
    job: Job<AnalyzerBatchImportJobData>,
  ): Promise<AnalyzerBatchImportResult> {
    const { filePath, userId, originalFilename } = job.data;

    this.logger.log(
      `Processing async batch import job (id: ${job.id}) — file: ${originalFilename}`,
    );

    // Validate the file exists
    if (!fs.existsSync(filePath)) {
      this.logger.error(`File not found at path: ${filePath}`);
      throw new Error(
        `Import file not found: ${filePath}. The temporary file may have been cleaned up.`,
      );
    }

    let importResult: BatchImportResultDto;

    try {
      // Read the file from disk into a buffer
      const fileBuffer = fs.readFileSync(filePath);

      // Construct a Multer-compatible file object for AnalyzerService
      const multerFile: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: originalFilename,
        fieldname: 'file',
        encoding: 'utf-8',
        mimetype: 'text/csv',
        size: fileBuffer.length,
        destination: path.dirname(filePath),
        filename: path.basename(filePath),
        path: filePath,
        stream: null as any,
      };

      // Delegate to the existing AnalyzerService for parsing, validation, and persistence
      importResult = await this.analyzerService.importBatchResults(
        multerFile,
        userId,
      );

      this.logger.log(
        `Async batch import completed: ${importResult.successCount}/${importResult.totalRows} rows imported from "${originalFilename}"`,
      );

      // Log the async import action to audit trail
      await this.auditService.log(
        userId,
        'ASYNC_BATCH_IMPORT',
        'OrderDetail',
        userId, // Use userId as entityId for batch-level tracking
        null,
        {
          jobId: job.id,
          fileName: originalFilename,
          totalRows: importResult.totalRows,
          successCount: importResult.successCount,
          errorCount: importResult.errorCount,
        },
      );
    } catch (error) {
      this.logger.error(
        `Async batch import failed for "${originalFilename}": ${error instanceof Error ? error.message : String(error)}`,
      );

      // Log the failure to audit trail
      await this.auditService.log(
        userId,
        'ASYNC_BATCH_IMPORT_FAILED',
        'OrderDetail',
        userId,
        null,
        {
          jobId: job.id,
          fileName: originalFilename,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      throw error;
    } finally {
      // Clean up the temporary file regardless of success or failure
      this.cleanupFile(filePath);
    }

    return {
      totalRows: importResult.totalRows,
      successCount: importResult.successCount,
      errorCount: importResult.errorCount,
      errors: importResult.errors,
      processedAt: new Date().toISOString(),
      originalFilename,
    };
  }

  /**
   * Safely remove the temporary file after processing.
   */
  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      // Non-fatal — log and continue
      this.logger.warn(
        `Failed to clean up temporary file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
