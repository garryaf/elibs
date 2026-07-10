import { IsOptional, IsString, IsInt, IsEnum, Min, Max, MaxLength, IsUUID } from 'class-validator';
import { BpjsVerificationStatus } from '@prisma/client';

export class CreateBpjsOrderDetailDto {
  @IsOptional()
  @IsString()
  @MaxLength(19)
  sepNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  referringFacilityCode?: string;

  @IsOptional()
  @IsString()
  referringFacilityName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  classLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  diagnosisName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  procedureCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  guaranteeLetterNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBpjsOrderDetailDto {
  @IsOptional()
  @IsString()
  @MaxLength(19)
  sepNumber?: string;

  @IsOptional()
  @IsEnum(BpjsVerificationStatus)
  verificationStatus?: BpjsVerificationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  referringFacilityCode?: string;

  @IsOptional()
  @IsString()
  referringFacilityName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  classLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  diagnosisCode?: string;

  @IsOptional()
  @IsString()
  diagnosisName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  procedureCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  guaranteeLetterNo?: string;

  @IsOptional()
  @IsUUID()
  verifiedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyBpjsDto {
  @IsString()
  @MaxLength(19)
  sepNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  referringFacilityCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  classLevel?: number;
}
