import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';

export class CreatePanelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  testIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
