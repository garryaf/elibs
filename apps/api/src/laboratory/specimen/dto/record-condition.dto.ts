import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SampleCondition } from '@prisma/client';

export class RecordConditionDto {
  @IsEnum(SampleCondition)
  condition: SampleCondition;

  @ValidateIf((o) => o.condition !== SampleCondition.ACCEPTABLE)
  @IsString({
    message: 'rejectionReason is required when condition is not ACCEPTABLE',
  })
  @MaxLength(200)
  rejectionReason?: string;

  @IsOptional()
  @IsNumber()
  transportTemperature?: number;

  @IsOptional()
  @IsBoolean()
  temperatureCompliant?: boolean;
}
