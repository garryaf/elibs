import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResultEntryItem {
  @IsUUID()
  orderDetailId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  resultValue: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class EnterResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultEntryItem)
  results: ResultEntryItem[];
}
