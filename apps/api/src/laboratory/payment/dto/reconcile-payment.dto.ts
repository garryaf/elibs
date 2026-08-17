import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReconciliationStatus {
  MATCHED = 'MATCHED',
  UNMATCHED = 'UNMATCHED',
  PENDING = 'PENDING',
}

export class ReconcileItemDto {
  @IsUUID()
  paymentComponentId: string;

  @IsEnum(ReconciliationStatus)
  reconciliationStatus: ReconciliationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reconciliationRef?: string;
}

export class ReconcilePaymentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReconcileItemDto)
  items: ReconcileItemDto[];
}
