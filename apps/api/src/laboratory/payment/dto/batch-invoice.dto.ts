import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { BatchInvoiceStatus } from '@prisma/client';

export class CreateBatchInvoiceDto {
  @IsUUID()
  insuranceId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBatchInvoiceStatusDto {
  @IsEnum(BatchInvoiceStatus)
  status: BatchInvoiceStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
