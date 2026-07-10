import { IsUUID, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RejectApprovalDto {
  @IsUUID()
  approverId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
