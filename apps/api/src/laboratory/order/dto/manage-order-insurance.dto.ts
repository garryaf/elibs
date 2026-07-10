import { IsUUID, IsOptional, IsString, IsEnum, IsNumber, Min, MaxLength, IsDateString } from 'class-validator';
import { CoverageType, ClaimStatus } from '@prisma/client';

export class AddOrderInsuranceDto {
  @IsUUID()
  insuranceId: string;

  @IsEnum(CoverageType)
  coverageType: CoverageType = CoverageType.PRIMARY;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  claimReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coveredAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  copayAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderInsuranceDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  claimReference?: string;

  @IsOptional()
  @IsEnum(ClaimStatus)
  claimStatus?: ClaimStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coveredAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  copayAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  memberNumber?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
