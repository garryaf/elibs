import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * Region IDs use EMSIFA (Indonesian administrative code) format:
 * - Provinsi: 2 digits (e.g., "11", "32")
 * - Kabupaten/Kota: 4 digits (e.g., "1101", "3201")
 * - Kecamatan: 6-7 digits (e.g., "110101", "1107061")
 * - Kelurahan/Desa: 10-13 digits (e.g., "1101012001")
 */
const REGION_CODE_REGEX = /^\d{2,13}$/;

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

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
