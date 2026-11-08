import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { RefundStatus } from '@prisma/client';

export class UpdateRefundStatusDto {
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
