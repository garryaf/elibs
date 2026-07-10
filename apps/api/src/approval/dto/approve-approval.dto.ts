import { IsUUID, IsOptional, IsString } from 'class-validator';

export class ApproveApprovalDto {
  @IsUUID()
  approverId: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
