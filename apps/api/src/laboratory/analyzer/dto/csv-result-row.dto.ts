import { IsString, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO representing a single row in a CSV batch result import.
 * Each row maps an analyzer result to a specific order and test.
 */
export class CsvResultRowDto {
  @IsString()
  orderNumber: string;

  @IsString()
  testCode: string;

  @IsString()
  resultValue: string;

  @IsOptional()
  @IsDateString()
  analyzedAt?: string;

  @IsOptional()
  @IsString()
  analyzerCode?: string;
}
