import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class UpdateTariffDto {
  @IsOptional()
  @IsUUID()
  testId?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsOptional()
  @IsUUID()
  insuranceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
