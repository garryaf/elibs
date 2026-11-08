import { IsEnum, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateReferenceValueDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  minAge?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  maxAge?: number;

  @IsOptional()
  @IsNumber()
  minRef?: number;

  @IsOptional()
  @IsNumber()
  maxRef?: number;

  @IsOptional()
  @IsNumber()
  criticalMin?: number;

  @IsOptional()
  @IsNumber()
  criticalMax?: number;
}
