import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VisitStatus } from '@prisma/client';

export class TransitionVisitDto {
  @IsEnum(VisitStatus)
  targetStatus: VisitStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
