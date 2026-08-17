import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeCriticalValueDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
