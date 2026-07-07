import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResultEntryItem {
  @IsUUID()
  orderDetailId: string;

  @IsString()
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
