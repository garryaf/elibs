import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';

export class UpdateTestDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  requiresDoctorApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
