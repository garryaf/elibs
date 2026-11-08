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

/**
 * Region IDs use EMSIFA (Indonesian administrative code) format:
 * - Provinsi: 2 digits (e.g., "11", "32")
 * - Kabupaten/Kota: 4 digits (e.g., "1101", "3201")
 * - Kecamatan: 6-7 digits (e.g., "110101", "1107061")
 * - Kelurahan/Desa: 10-13 digits (e.g., "1101012001")
 *
 * These are NOT UUIDs — they are numeric string identifiers from BPS/EMSIFA data.
 */
const REGION_CODE_REGEX = /^\d{2,13}$/;

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
  @MaxLength(20)
  @Matches(/^(\d{8,15})?$/, { message: 'Phone must be 8-15 digits' })
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

  // Region FK fields (EMSIFA numeric codes, NOT UUIDs)
  @IsOptional()
  @IsString()
  @Matches(REGION_CODE_REGEX, {
    message: 'provinsiId must be a valid EMSIFA region code (2-13 digits)',
  })
  provinsiId?: string;

  @IsOptional()
  @IsString()
  @Matches(REGION_CODE_REGEX, {
    message: 'kabupatenKotaId must be a valid EMSIFA region code (2-13 digits)',
  })
  kabupatenKotaId?: string;

  @IsOptional()
  @IsString()
  @Matches(REGION_CODE_REGEX, {
    message: 'kecamatanId must be a valid EMSIFA region code (2-13 digits)',
  })
  kecamatanId?: string;

  @IsOptional()
  @IsString()
  @Matches(REGION_CODE_REGEX, {
    message: 'kelurahanDesaId must be a valid EMSIFA region code (2-13 digits)',
  })
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
