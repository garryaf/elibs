import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegionQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class KabupatenKotaQueryDto extends RegionQueryDto {
  @IsString()
  provinsiId: string;
}

export class KecamatanQueryDto extends RegionQueryDto {
  @IsString()
  kabupatenKotaId: string;
}

export class KelurahanDesaQueryDto extends RegionQueryDto {
  @IsString()
  kecamatanId: string;
}
