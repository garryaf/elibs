import { Type } from 'class-transformer';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class QCResultItemDto {
  @IsNumber()
  resultValue: number;

  @IsNumber()
  expectedMean: number;

  @IsNumber()
  expectedSD: number;
}

export class RecordQCRunDto {
  @IsUUID('4')
  qcSampleId: string;

  @IsUUID('4')
  testId: string;

  @IsOptional()
  @IsUUID('4')
  equipmentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QCResultItemDto)
  results: QCResultItemDto[];
}
