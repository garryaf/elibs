import { IsUUID, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateTariffDto {
  @IsUUID()
  testId: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsOptional()
  @IsUUID()
  insuranceId?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;
}
