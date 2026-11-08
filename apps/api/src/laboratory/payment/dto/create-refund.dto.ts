import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateRefundDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;
}
