import { IsString, IsOptional, IsDateString } from 'class-validator';

/**
 * DTO for a single result entry from a laboratory analyzer.
 * Used when manually entering a single result via the API.
 */
export class SingleResultDto {
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
