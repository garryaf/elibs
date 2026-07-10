import { IsUUID, IsInt, IsOptional, IsString, IsBoolean, IsEnum, Min, Max, MaxLength, IsDateString } from 'class-validator';
import { InsuranceType } from '@prisma/client';

export class AddPatientInsuranceDto {
  @IsUUID()
  insuranceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyNumber?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  priority: number = 1;

  @IsOptional()
  @IsEnum(InsuranceType)
  type?: InsuranceType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  bpjsClassLevel?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePatientInsuranceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  policyNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsEnum(InsuranceType)
  type?: InsuranceType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  bpjsClassLevel?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
