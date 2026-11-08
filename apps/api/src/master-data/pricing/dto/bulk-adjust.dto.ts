import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsDateString,
} from 'class-validator';

export enum AdjustmentType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class BulkAdjustRequestDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  testIds?: string[];

  @IsEnum(AdjustmentType, {
    message: 'adjustmentType must be PERCENTAGE or FIXED',
  })
  adjustmentType: AdjustmentType;

  @IsNumber()
  adjustmentValue: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
