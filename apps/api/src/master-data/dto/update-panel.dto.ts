import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
  Max,
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
  @Min(0, { message: 'Harga panel tidak boleh negatif' })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Diskon tidak boleh kurang dari 0%' })
  @Max(100, { message: 'Diskon tidak boleh lebih dari 100%' })
  discount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, { message: 'Panel harus memiliki minimal 2 pemeriksaan' })
  @IsUUID('4', { each: true })
  testIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
