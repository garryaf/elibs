import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class DepositPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  depositAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
