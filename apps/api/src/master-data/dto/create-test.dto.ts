import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  IsInt,
  IsIn,
  IsArray,
  Min,
  Max,
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
  @IsIn(['NUMERIC', 'TEXT', 'QUALITATIVE'])
  resultType?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualitativeOptions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  deltaAlertThreshold?: number;

  @IsOptional()
  @IsBoolean()
  requiresDoctorApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresInsurancePreAuth?: boolean;

  @IsOptional()
  @IsBoolean()
  fastingRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  fastingHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  tatMinutes?: number;

  @IsOptional()
  @IsIn(['CITO', 'ROUTINE', 'STAT'])
  tatCategory?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
