import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class InsuranceReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  insurerId?: string;
}
