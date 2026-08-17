import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateHandoffDto {
  @IsUUID('4')
  specimenId: string;

  @IsUUID('4')
  toUserId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
