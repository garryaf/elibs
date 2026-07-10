import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsUUID()
  departmentId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
