import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateTestDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  sampleType?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  requiresDoctorApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresInsurancePreAuth?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
