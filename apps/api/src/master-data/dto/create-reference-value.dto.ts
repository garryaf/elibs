import {
  IsUUID,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateReferenceValueDto {
  @IsOptional()
  @IsUUID()
  testId?: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsIn(['YEARS', 'MONTHS', 'DAYS'])
  ageUnit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(55000) // Support up to ~150 years in days
  minAge?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(55000)
  maxAge?: number;

  @IsNumber()
  minRef: number;

  @IsNumber()
  maxRef: number;

  @IsOptional()
  @IsNumber()
  criticalMin?: number;

  @IsOptional()
  @IsNumber()
  criticalMax?: number;
}
