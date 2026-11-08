import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Flag } from '@prisma/client';

export class CreateQualitativeRefDto {
  @IsString()
  optionValue: string;

  @IsEnum(Flag, {
    message: 'Flag harus salah satu dari: NORMAL, LOW, HIGH, CRITICAL',
  })
  flag: Flag;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateQualitativeRefDto {
  @IsOptional()
  @IsString()
  optionValue?: string;

  @IsOptional()
  @IsEnum(Flag, {
    message: 'Flag harus salah satu dari: NORMAL, LOW, HIGH, CRITICAL',
  })
  flag?: Flag;

  @IsOptional()
  @IsString()
  description?: string;
}
