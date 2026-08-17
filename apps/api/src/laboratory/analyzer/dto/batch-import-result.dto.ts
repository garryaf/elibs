/**
 * Response DTO for a batch result import operation.
 * Provides summary statistics and per-row error details.
 */
export class BatchImportResultDto {
  /** Total number of rows in the imported file */
  totalRows: number;

  /** Number of rows successfully imported */
  successCount: number;

  /** Number of rows that failed validation */
  errorCount: number;

  /** Detailed error information per failed row */
  errors: BatchImportError[];
}

export class BatchImportError {
  /** 1-based row number in the CSV file */
  row: number;

  /** The field that caused the validation failure */
  field: string;

  /** Human-readable description of the error */
  message: string;
}
