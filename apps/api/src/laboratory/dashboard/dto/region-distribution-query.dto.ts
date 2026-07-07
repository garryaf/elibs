import { IsOptional, IsString } from 'class-validator';

export class RegionDistributionQueryDto {
  @IsOptional()
  @IsString()
  provinsiId?: string;

  @IsOptional()
  @IsString()
  kabupatenKotaId?: string;

  @IsOptional()
  @IsString()
  kecamatanId?: string;
}
