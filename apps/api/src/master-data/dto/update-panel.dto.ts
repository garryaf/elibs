import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class UpdatePanelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, { message: 'A panel must contain at least 2 tests' })
  @IsUUID('4', { each: true })
  testIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
