import { IsEnum, IsUUID, IsInt, IsObject, IsOptional, Min } from 'class-validator';
import { ApprovalType } from '@prisma/client';

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  requestType: ApprovalType;

  @IsUUID()
  requesterId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxLevel?: number;

  @IsObject()
  payload: Record<string, unknown>;
}
