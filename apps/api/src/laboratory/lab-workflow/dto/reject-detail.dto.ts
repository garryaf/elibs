import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RerunReason {
  QC_FAILURE = 'QC_FAILURE',
  SPECIMEN_ISSUE = 'SPECIMEN_ISSUE',
  EQUIPMENT_ERROR = 'EQUIPMENT_ERROR',
  OPERATOR_ERROR = 'OPERATOR_ERROR',
  OTHER = 'OTHER',
}

export class RejectDetailDto {
  @IsEnum(RerunReason, {
    message:
      'reason must be one of: QC_FAILURE, SPECIMEN_ISSUE, EQUIPMENT_ERROR, OPERATOR_ERROR, OTHER',
  })
  reason: RerunReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
