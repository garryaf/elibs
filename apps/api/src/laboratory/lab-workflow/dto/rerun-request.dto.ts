import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RerunReason } from './reject-detail.dto';

export class RerunRequestDto {
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
