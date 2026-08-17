import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class UpdateVisitDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referringDoctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referralLetterNo?: string;

  @IsOptional()
  @IsString()
  encounterReason?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;
}
