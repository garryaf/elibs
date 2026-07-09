import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateVisitDto {
  @IsUUID()
  patientId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsOptional()
  @IsUUID()
  insuranceId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{13}$/, { message: 'BPJS number must be exactly 13 digits' })
  bpjsNumber?: string;
}
