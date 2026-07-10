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

export class CreatePanelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  testIds: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
