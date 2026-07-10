import { IsUUID, IsOptional, IsString, IsNumber, Min, MaxLength } from 'class-validator';

export class SubmitClaimDto {
  @IsUUID()
  orderInsuranceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  claimReference?: string;
}

export class ApproveClaimDto {
  @IsNumber()
  @Min(0)
  coveredAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  copayAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectClaimDto {
  @IsString()
  rejectionReason: string;
}
