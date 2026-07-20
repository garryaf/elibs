import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsDateString,
  IsUUID,
  Matches,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Gender } from '@prisma/client';

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
class IsNotFutureDate implements ValidatorConstraintInterface {
  validate(value: string) {
    const date = new Date(value);
    return date <= new Date();
  }

  defaultMessage() {
    return 'Tanggal lahir tidak boleh di masa depan';
  }
}

export class CreatePatientDto {
  @IsString()
  @Matches(/^\d{16}$/, { message: 'NIK must be exactly 16 digits' })
  nik: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsDateString()
  @Validate(IsNotFutureDate)
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  // Phase G: Geographic fields
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  village?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  // Region FK fields
  @IsOptional()
  @IsString()
  provinsiId?: string;

  @IsOptional()
  @IsString()
  kabupatenKotaId?: string;

  @IsOptional()
  @IsString()
  kecamatanId?: string;

  @IsOptional()
  @IsString()
  kelurahanDesaId?: string;

  // Clinical fields
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsUUID()
  insuranceId?: string;

  @IsOptional()
  @IsString()
  memberNumber?: string;

  @IsOptional()
  @IsBoolean()
  consentDigitalNotification?: boolean;
}
