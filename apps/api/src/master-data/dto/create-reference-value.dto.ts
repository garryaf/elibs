import {
  IsUUID,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateReferenceValueDto {
  @IsUUID()
  testId: string;

  @IsEnum(Gender)
  gender: Gender;

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
