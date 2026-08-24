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

export class CreatePanelDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0, { message: 'Harga panel tidak boleh negatif' })
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Diskon tidak boleh kurang dari 0%' })
  @Max(100, { message: 'Diskon tidak boleh lebih dari 100%' })
  discount?: number;

  @IsArray()
  @ArrayMinSize(2, { message: 'Panel harus memiliki minimal 2 pemeriksaan' })
  @IsUUID('4', { each: true })
  testIds: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
