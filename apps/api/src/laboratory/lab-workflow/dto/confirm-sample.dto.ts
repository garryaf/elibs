import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SampleCondition } from '@prisma/client';

export class ConfirmSampleDto {
  @IsEnum(SampleCondition)
  sampleCondition: SampleCondition;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
