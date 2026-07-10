import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
