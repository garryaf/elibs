import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ApproveOrderDto {
  @IsEnum(['APPROVE', 'REJECT'], {
    message: 'decision must be either APPROVE or REJECT',
  })
  decision: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  interpretation?: string;

  @ValidateIf((o) => o.decision === 'REJECT')
  @IsString({ message: 'rejectionReason is required when decision is REJECT' })
  rejectionReason?: string;
}
